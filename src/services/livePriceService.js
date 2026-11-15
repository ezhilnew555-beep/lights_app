/**
 * livePriceService.js
 * One place to value stock and mutual-fund holdings at live market prices,
 * shared by the stock portfolio, Wealth, F.I.R.E. and Goals screens so they
 * always agree and move together when prices change.
 *
 * Holdings store bare NSE/BSE tickers ("INFY"). Quotes are always requested
 * with the exchange suffix ("INFY.NS"): a bare ticker can resolve to a US
 * listing (INFY is also Infosys' NYSE ADR, priced in USD).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMultipleQuotes } from "./yahooFinanceService";
import { fetchMutualFundDetails } from "./mutualFundApiService";

const QUOTE_TTL_MS = 60 * 1000; // stock prices: refresh at most once a minute
const NAV_TTL_MS = 30 * 60 * 1000; // NAVs change once a day

const quoteCache = new Map(); // "INFY.NS" -> { at, quote }
const navCache = new Map(); // schemeCode -> { at, nav }

// Last known prices are kept on the phone, so holdings are still valued at
// the latest price (not at cost) when the app opens offline.
const PRICE_STORE_KEY = "live_prices_v1";
let pricesRestored = null;
const restorePrices = () =>
  (pricesRestored =
    pricesRestored ||
    AsyncStorage.getItem(PRICE_STORE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        Object.entries(saved?.quotes || {}).forEach(([k, v]) => !quoteCache.has(k) && quoteCache.set(k, v));
        Object.entries(saved?.navs || {}).forEach(([k, v]) => !navCache.has(k) && navCache.set(k, v));
      })
      .catch(() => {}));
const savePrices = () =>
  AsyncStorage.setItem(
    PRICE_STORE_KEY,
    JSON.stringify({ quotes: Object.fromEntries(quoteCache), navs: Object.fromEntries(navCache) })
  ).catch(() => {});

// ── Classification ──────────────────────────────────────────────────

export const isStock = (inv) => /^stocks?$/i.test(String(inv?.investmentType || "").trim());
export const isMutualFund = (inv) => {
  const t = String(inv?.investmentType || "").trim().toLowerCase();
  return t === "mutual fund" || t === "sip/mf" || t === "mf";
};

export const cleanSymbol = (s) => String(s || "").trim().toUpperCase().replace(/\.(NS|BO)$/, "");

/** Yahoo symbol for a holding or watchlist item: "INFY.NS" / "INFY.BO". */
export const quoteSymbol = (item) => {
  const raw = String(item?.symbol || item?.stockSymbol || "").trim().toUpperCase();
  if (!raw) return null;
  if (/\.(NS|BO)$/.test(raw)) return raw;
  return `${raw}.${String(item?.exchange || "").toUpperCase() === "BSE" ? "BO" : "NS"}`;
};

// ── Fetching ────────────────────────────────────────────────────────

/**
 * Live quotes keyed by clean ticker: { INFY: { price, previousClose, dayChange, dayChangePercent } }.
 * @param {string[]} symbols Yahoo symbols with exchange suffix
 */
export const getLiveQuotes = async (symbols, { force = false } = {}) => {
  const unique = [...new Set(symbols.filter(Boolean))];
  const now = Date.now();
  const stale = unique.filter((s) => force || !(now - (quoteCache.get(s)?.at || 0) < QUOTE_TTL_MS));

  if (stale.length) {
    const quotes = await getMultipleQuotes(stale);
    quotes.forEach((q) => {
      if (q?.symbol && Number.isFinite(q.regularMarketPrice)) {
        quoteCache.set(String(q.symbol).toUpperCase(), { at: now, quote: q });
      }
    });
  }

  const out = {};
  unique.forEach((s) => {
    const q = quoteCache.get(s)?.quote;
    if (!q) return;
    out[cleanSymbol(s)] = {
      price: q.regularMarketPrice,
      previousClose: q.previousClose,
      dayChange: q.dayChange || 0,
      dayChangePercent: q.dayChangePercent || 0,
    };
  });
  return out;
};

/** Latest NAVs keyed by scheme code. */
export const getLiveNavs = async (schemeCodes, { force = false } = {}) => {
  const unique = [...new Set(schemeCodes.filter(Boolean).map(String))];
  const now = Date.now();
  await Promise.all(
    unique
      .filter((c) => force || !(now - (navCache.get(c)?.at || 0) < NAV_TTL_MS))
      .map(async (code) => {
        try {
          const details = await fetchMutualFundDetails(code);
          if (Number.isFinite(details?.nav)) navCache.set(code, { at: now, nav: details.nav });
        } catch (e) {}
      })
  );
  const out = {};
  unique.forEach((c) => {
    if (navCache.has(c)) out[c] = navCache.get(c).nav;
  });
  return out;
};

/** Fetch everything needed to value these investments. */
export const getLivePrices = async (investments, options = {}) => {
  const list = investments || [];
  await restorePrices();
  const stockSyms = list.filter(isStock).map(quoteSymbol).filter(Boolean);
  const codes = list.filter(isMutualFund).map((i) => i.schemeCode).filter(Boolean).map(String);
  const [quotes, navs] = await Promise.all([
    getLiveQuotes(stockSyms, options).catch(() => ({})),
    getLiveNavs(codes, options).catch(() => ({})),
  ]);
  savePrices();
  // "Prices updated …" reflects the oldest price shown, not this call
  const times = [
    ...stockSyms.map((s) => quoteCache.get(s)?.at),
    ...codes.map((c) => navCache.get(c)?.at),
  ].filter(Boolean);
  return { quotes, navs, at: times.length ? new Date(Math.min(...times)) : new Date() };
};

// ── Valuation ───────────────────────────────────────────────────────

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Value one investment. Stocks and funds use live prices when available and
 * fall back to cost; they are never floored at cost, so losses show.
 * @returns {{ invested:number, current:number, dayChange:number, live:boolean }}
 */
export const valueInvestment = (inv, live = {}) => {
  const invested = num(inv.amount);

  if (isStock(inv)) {
    const qty = num(inv.quantity || inv.stockQuantity);
    const q = live.quotes?.[cleanSymbol(inv.symbol || inv.stockSymbol)];
    if (q && qty) {
      return {
        invested,
        current: qty * q.price,
        dayChange: qty * q.dayChange,
        live: true,
      };
    }
    return { invested, current: num(inv.currentAmount) || invested, dayChange: 0, live: false };
  }

  if (isMutualFund(inv)) {
    const nav = live.navs?.[String(inv.schemeCode)];
    const units = lotUnits(inv);
    if (nav && units) return { invested, current: units * nav, dayChange: 0, live: true };
    const stored = num(inv.currentNAV) && units ? units * num(inv.currentNAV) : num(inv.currentAmount);
    return { invested, current: stored || invested, dayChange: 0, live: false };
  }

  if (isRecurring(inv)) return valueRecurring(inv);

  return { invested, current: num(inv.currentAmount) || invested, dayChange: 0, live: false };
};

export const isRecurring = (inv) => String(inv?.investmentType || "").trim().toLowerCase() === "recurring deposit";

/**
 * RD: `amount` is the full planned total, so value what has been deposited so
 * far (one deposit a month since the start) with quarterly compounding.
 */
const valueRecurring = (inv) => {
  const deposit = num(inv.monthlyDeposit);
  const months = num(inv.duration);
  if (!deposit || !months || !inv.startDate) {
    const invested = num(inv.currentAmount) || num(inv.amount);
    return { invested, current: invested, dayChange: 0, live: false };
  }
  const start = new Date(inv.startDate);
  const now = new Date();
  const elapsed = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
  const done = Math.min(elapsed, months);
  const invested = deposit * done;
  const q = num(inv.interestRate) / 400;
  const current = q ? Math.max(invested, deposit * 3 * ((Math.pow(1 + q, done / 3) - 1) / q)) : invested;
  return { invested, current, dayChange: 0, live: false };
};

/** Sum of valueInvestment over a list. */
export const valuePortfolio = (investments, live) =>
  (investments || []).reduce(
    (acc, inv) => {
      const v = valueInvestment(inv, live);
      acc.invested += v.invested;
      acc.current += v.current;
      acc.dayChange += v.dayChange;
      return acc;
    },
    { invested: 0, current: 0, dayChange: 0 }
  );

/**
 * Aggregate stock lots into one row per ticker.
 * @returns {{symbol,name,exchange,quantity,invested,avgPrice,price,current,pnl,pnlPct,dayChange,dayChangePercent,lots}[]}
 */
export const aggregateHoldings = (investments, live = {}) => {
  const bySymbol = new Map();
  (investments || []).filter(isStock).forEach((inv) => {
    const symbol = cleanSymbol(inv.symbol || inv.stockSymbol);
    if (!symbol) return;
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, {
        symbol,
        name: String(inv.name || symbol).replace(new RegExp(`^${symbol}\\s*-\\s*`, "i"), ""),
        exchange: inv.exchange || "NSE",
        quantity: 0,
        invested: 0,
        lots: [],
      });
    }
    const h = bySymbol.get(symbol);
    const qty = num(inv.quantity || inv.stockQuantity);
    h.quantity += qty;
    h.invested += qty * num(inv.purchasePrice || inv.stockPrice) || num(inv.amount);
    h.lots.push(inv);
  });

  return [...bySymbol.values()]
    .filter((h) => h.quantity > 0)
    .map((h) => {
      const q = live.quotes?.[h.symbol];
      const price = q?.price ?? null;
      const current = price !== null ? h.quantity * price : h.invested;
      const pnl = current - h.invested;
      return {
        ...h,
        avgPrice: h.quantity ? h.invested / h.quantity : 0,
        price,
        current,
        pnl,
        pnlPct: h.invested ? (pnl / h.invested) * 100 : 0,
        dayChange: q ? h.quantity * q.dayChange : 0,
        dayChangePercent: q?.dayChangePercent ?? 0,
      };
    })
    .sort((a, b) => b.current - a.current);
};

// ── Mutual fund holdings ────────────────────────────────────────────

/** Group key for a fund lot: the AMFI scheme code, else the scheme name. */
export const fundKey = (inv) => String(inv?.schemeCode || inv?.schemeName || inv?.name || "").trim();

/** Units held in one MF lot (older records stored only amount + NAV). */
export const lotUnits = (inv) => num(inv.units) || (num(inv.nav) ? num(inv.amount) / num(inv.nav) : 0);

/** Purchase NAV of one MF lot. */
export const lotNav = (inv) => {
  const u = lotUnits(inv);
  return u ? num(inv.amount) / u : num(inv.nav) || num(inv.averageNAV);
};

/** Lot date in ms (startDate / investmentDate ISO strings, or a Firestore Timestamp). */
export const lotTime = (inv) => {
  const d = inv?.startDate || inv?.investmentDate || inv?.createdAt;
  return d?.toMillis ? d.toMillis() : new Date(d || 0).getTime() || 0;
};

/**
 * Aggregate mutual-fund lots (each SIP instalment or lumpsum is one lot) into
 * one row per scheme, valued at the live NAV.
 * @returns {{key,schemeCode,name,fundHouse,category,units,invested,avgNav,nav,navLive,current,pnl,pnlPct,goals,sip,lots}[]}
 */
export const aggregateFunds = (investments, live = {}) => {
  const byKey = new Map();
  (investments || []).filter(isMutualFund).forEach((inv) => {
    const key = fundKey(inv);
    if (!key) return;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        schemeCode: inv.schemeCode ? String(inv.schemeCode) : null,
        name: inv.schemeName || inv.name || key,
        fundHouse: inv.fundHouse || null,
        category: inv.schemeCategory || inv.schemeType || null,
        units: 0,
        invested: 0,
        storedNav: 0,
        goals: [],
        sip: false,
        lots: [],
      });
    }
    const f = byKey.get(key);
    f.units += lotUnits(inv);
    f.invested += num(inv.amount);
    f.storedNav = f.storedNav || num(inv.currentNAV);
    if (inv.goalName && !f.goals.includes(inv.goalName)) f.goals.push(inv.goalName);
    if (String(inv.calculationType || "").toUpperCase() === "SIP") f.sip = true;
    f.lots.push(inv);
  });

  return [...byKey.values()]
    .filter((f) => f.units > 0)
    .map((f) => {
      const liveNav = f.schemeCode ? live.navs?.[f.schemeCode] : null;
      const nav = liveNav || f.storedNav || null;
      const current = nav ? f.units * nav : f.invested;
      const pnl = current - f.invested;
      return {
        ...f,
        lots: f.lots.sort((a, b) => lotTime(b) - lotTime(a)),
        avgNav: f.units ? f.invested / f.units : 0,
        nav,
        navLive: !!liveNav,
        current,
        pnl,
        pnlPct: f.invested ? (pnl / f.invested) * 100 : 0,
      };
    })
    .sort((a, b) => b.current - a.current);
};

/** True during NSE trading hours (Mon–Fri, 09:15–15:30 IST). */
export const isMarketOpen = (date = new Date()) => {
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  const day = ist.getUTCDay();
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
};
