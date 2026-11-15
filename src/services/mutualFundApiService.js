const YF_BASE2 = "https://query2.finance.yahoo.com";
const AMFI_NAV_URLS = [
  "https://portal.amfiindia.com/spages/NAVAll.txt",
  "https://www.amfiindia.com/spages/NAVAll.txt",
];
const MFAPI_BASE_URLS = ["https://api.mfapi.in", "https://www.mfapi.in"];
import * as FileSystem from "expo-file-system/legacy";

const NETWORK_TIMEOUT_MS = 20000;
// NAVs are published once a day (late evening IST), so the catalogue is
// served from the on-device copy and refreshed in the background when stale.
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_FULL_CATALOG_SIZE = 500;
// A scheme whose last NAV is older than this is closed or merged.
const ACTIVE_NAV_MAX_AGE_DAYS = 45;
const CATALOG_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}mf_catalog_v3.json` : null;

const DEFAULT_POPULAR_KEYWORDS = [
  "HDFC mutual fund",
  "SBI mutual fund",
  "ICICI mutual fund",
  "Nippon mutual fund",
  "Axis mutual fund",
  "Kotak mutual fund",
  "UTI mutual fund",
  "Mirae mutual fund",
  "DSP mutual fund",
  "Aditya Birla mutual fund",
];

const FALLBACK_MUTUAL_FUNDS = [
  { schemeCode: "HDFC", schemeName: "HDFC Mutual Fund" },
  { schemeCode: "SBI", schemeName: "SBI Mutual Fund" },
  { schemeCode: "ICICI", schemeName: "ICICI Prudential Mutual Fund" },
  { schemeCode: "NIPPON", schemeName: "Nippon India Mutual Fund" },
  { schemeCode: "AXIS", schemeName: "Axis Mutual Fund" },
  { schemeCode: "KOTAK", schemeName: "Kotak Mutual Fund" },
  { schemeCode: "UTI", schemeName: "UTI Mutual Fund" },
  { schemeCode: "MIRAE", schemeName: "Mirae Asset Mutual Fund" },
  { schemeCode: "DSP", schemeName: "DSP Mutual Fund" },
  { schemeCode: "ABSL", schemeName: "Aditya Birla Sun Life Mutual Fund" },
].map((fund) => ({
  ...fund,
  fundHouse: null,
  schemeType: "Mutual Fund",
  schemeCategory: null,
  isinGrowth: null,
  isinDivReinvestment: null,
  nav: null,
  lastUpdated: null,
}));

let catalogCache = null;
let catalogCacheAt = 0;

const normalizeText = (value) => String(value || "").trim();

const fetchWithTimeout = async (url, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

const dedupeAndSortFunds = (funds = []) => {
  const unique = new Map();
  funds.forEach((fund) => {
    const key = normalizeText(fund?.schemeCode).toLowerCase();
    if (!key || unique.has(key)) return;
    unique.set(key, fund);
  });
  return Array.from(unique.values()).sort((a, b) =>
    normalizeText(a.schemeName).localeCompare(normalizeText(b.schemeName))
  );
};

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** "25-Sep-2026" / "25-09-2026" / "2026-09-25" -> "2026-09-25" (null if unparseable). */
export const normalizeNavDate = (value) => {
  const v = normalizeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})-([A-Za-z]{3}|\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const month = /\d/.test(m[2]) ? Number(m[2]) : MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const isActiveNav = (isoDate) => {
  if (!isoDate) return false;
  const age = (Date.now() - new Date(`${isoDate}T00:00:00Z`).getTime()) / 86400000;
  return age <= ACTIVE_NAV_MAX_AGE_DAYS;
};

/**
 * AMFI NAVAll.txt. Rows are either
 *   code;isin;isin2;name;nav;date                   (older layout)
 *   code;isin;isin2;name;plan;option;nav;date       (current layout)
 * separated by header lines naming the category and the fund house.
 */
const parseAMFINavData = (rawText) => {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText.split(/\r?\n/);
  const schemes = [];
  let category = null;
  let fundHouse = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.includes(";")) {
      const cat = line.match(/^(?:Open|Close|Interval)[^(]*\((.*)\)$/i);
      if (cat) category = cat[1].trim();
      else fundHouse = line;
      continue;
    }
    if (line.startsWith("Scheme Code")) continue;

    const parts = line.split(";").map((x) => x.trim());
    if (parts.length < 6) continue;

    const schemeCode = parts[0];
    const nameParts = parts.length >= 8 ? parts.slice(3, parts.length - 2) : [parts[3]];
    const schemeName = nameParts.filter((x) => x && x !== "-").join(" - ");
    const nav = parseFloat(parts[parts.length - 2]);
    const navDate = normalizeNavDate(parts[parts.length - 1]);

    if (!/^[0-9]+$/.test(schemeCode) || !schemeName) continue;

    schemes.push({
      schemeCode,
      schemeName,
      fundHouse,
      schemeType: "Mutual Fund",
      schemeCategory: category,
      isinGrowth: parts[1] && parts[1] !== "-" ? parts[1] : null,
      isinDivReinvestment: parts[2] && parts[2] !== "-" ? parts[2] : null,
      nav: Number.isFinite(nav) ? nav : null,
      lastUpdated: navDate,
    });
  }

  return schemes;
};

const normalizeSchemeType = (value) => normalizeText(value) || "Mutual Fund";

const mapMfapiLatestFund = (item = {}) => {
  const schemeCode = normalizeText(item.schemeCode || item.scheme_code || item.code);
  const schemeName = normalizeText(item.schemeName || item.scheme_name || item.name);
  if (!schemeCode || !schemeName) return null;
  return {
    schemeCode,
    schemeName,
    fundHouse: normalizeText(item.fundHouse || item.fund_house) || null,
    schemeType: normalizeSchemeType(item.schemeType || item.scheme_type),
    schemeCategory: normalizeText(item.schemeCategory || item.scheme_category) || null,
    isinGrowth: normalizeText(item.isinGrowth || item.isin_growth) || null,
    isinDivReinvestment: normalizeText(item.isinDivReinvestment || item.isin_div_reinvestment) || null,
    nav: Number.isFinite(parseFloat(item.nav)) ? parseFloat(item.nav) : null,
    lastUpdated: normalizeNavDate(item.date || item.lastUpdated || item.navDate),
  };
};

const fetchMfapiLatestCatalog = async () => {
  for (const base of MFAPI_BASE_URLS) {
    try {
      const response = await fetchWithTimeout(`${base}/mf/latest`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!response.ok) continue;

      const payload = await response.json();
      // /mf/latest also lists ~28k closed schemes; keep the ones still priced.
      const funds = Array.isArray(payload)
        ? payload.map(mapMfapiLatestFund).filter((f) => f && isActiveNav(f.lastUpdated))
        : [];
      if (funds.length > 0) return dedupeAndSortFunds(funds);
    } catch (error) {
      // Try next base URL.
    }
  }

  return [];
};

const fetchMfapiCatalog = async () => {
  for (const base of MFAPI_BASE_URLS) {
    try {
      const response = await fetchWithTimeout(`${base}/mf`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const funds = Array.isArray(payload) ? payload.map(mapMfapiLatestFund).filter(Boolean) : [];
      if (funds.length > 0) return dedupeAndSortFunds(funds);
    } catch (error) {
      // Try next base URL
    }
  }
  return [];
};

const fetchAmfiCatalog = async () => {
  for (const url of AMFI_NAV_URLS) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/plain, */*" },
      });
      if (!response.ok) continue;
      const text = await response.text();
      const funds = parseAMFINavData(text).filter((f) => isActiveNav(f.lastUpdated));
      if (funds.length > 0) return dedupeAndSortFunds(funds);
    } catch (error) {
      // Try next AMFI endpoint.
    }
  }
  return [];
};

const searchMfapiMutualFunds = async (query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  for (const base of MFAPI_BASE_URLS) {
    try {
      const response = await fetchWithTimeout(`${base}/mf/search?q=${encodeURIComponent(normalizedQuery)}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!response.ok) continue;

      const payload = await response.json();
      const results = Array.isArray(payload)
        ? payload
            .map((item) => ({
              schemeCode: normalizeText(item.schemeCode || item.scheme_code || item.code),
              schemeName: normalizeText(item.schemeName || item.scheme_name || item.name),
              fundHouse: null,
              schemeType: "Mutual Fund",
              schemeCategory: null,
              isinGrowth: null,
              isinDivReinvestment: null,
              nav: null,
              lastUpdated: null,
            }))
            .filter((item) => item.schemeCode && item.schemeName)
        : [];

      if (results.length > 0) return dedupeAndSortFunds(results);
    } catch (error) {
      // Try next provider.
    }
  }

  return [];
};

export const searchMutualFunds = async (query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return fetchAllMutualFunds();
  }

  const remoteResults = await searchMfapiMutualFunds(normalizedQuery);
  if (remoteResults.length > 0) return remoteResults;

  const catalog = await fetchAllMutualFunds();
  const queryLower = normalizedQuery.toLowerCase();
  if (!queryLower) return catalog.slice(0, 200);

  return catalog.filter((fund) => {
    const haystack = `${fund.schemeName} ${fund.schemeCode}`.toLowerCase();
    return haystack.includes(queryLower);
  });
};

// ── On-device catalogue cache ───────────────────────────────────────
// Compact rows keep the ~9k active schemes around 1 MB in a file. (The old
// AsyncStorage cache held the 11 MB list, over Android's 2 MB row limit, so
// it never saved and every visit re-downloaded everything.)

const COMPACT_FIELDS = ["schemeCode", "schemeName", "fundHouse", "schemeCategory", "nav", "lastUpdated"];

const toCompact = (funds) => funds.map((f) => COMPACT_FIELDS.map((k) => f[k] ?? null));
const fromCompact = (rows) =>
  rows.map((r) => {
    const f = { schemeType: "Mutual Fund", isinGrowth: null, isinDivReinvestment: null };
    COMPACT_FIELDS.forEach((k, i) => (f[k] = r[i]));
    return f;
  });

/** The catalogue saved on this device: { funds, savedAt } or null. */
export const loadCachedCatalog = async () => {
  if (catalogCache) return { funds: catalogCache, savedAt: catalogCacheAt };
  if (!CATALOG_FILE) return null;
  try {
    const info = await FileSystem.getInfoAsync(CATALOG_FILE);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(CATALOG_FILE));
    if (!Array.isArray(parsed?.rows) || parsed.rows.length < MIN_FULL_CATALOG_SIZE) return null;
    catalogCache = fromCompact(parsed.rows);
    catalogCacheAt = parsed.savedAt || 0;
    return { funds: catalogCache, savedAt: catalogCacheAt };
  } catch (e) {
    return null;
  }
};

const saveCatalog = async (funds) => {
  catalogCache = funds;
  catalogCacheAt = Date.now();
  if (!CATALOG_FILE) return;
  try {
    await FileSystem.writeAsStringAsync(
      CATALOG_FILE,
      JSON.stringify({ savedAt: catalogCacheAt, rows: toCompact(funds) })
    );
  } catch (e) {
    console.warn("Could not save MF catalogue:", e?.message || e);
  }
};

export const isCatalogStale = (savedAt) => !savedAt || Date.now() - savedAt > CATALOG_TTL_MS;

let inflight = null;

/**
 * All active mutual fund schemes with their latest NAV.
 * Sources, fastest first: memory -> device file (if fresh) -> AMFI NAVAll.txt
 * (~1.5 MB, active schemes only) -> mfapi.in.
 */
export const fetchAllMutualFunds = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = await loadCachedCatalog();
    if (cached && !isCatalogStale(cached.savedAt)) return cached.funds;
  }
  // Screens opening together share one download.
  if (inflight) return inflight;

  inflight = (async () => {
    for (const source of [fetchAmfiCatalog, fetchMfapiLatestCatalog, fetchMfapiCatalog]) {
      const funds = await source();
      if (funds.length >= MIN_FULL_CATALOG_SIZE) {
        await saveCatalog(funds);
        return funds;
      }
    }
    // Offline: an old copy beats the ten-row fallback.
    const cached = await loadCachedCatalog();
    return cached?.funds?.length ? cached.funds : FALLBACK_MUTUAL_FUNDS;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
};

const resolveSymbol = async (identifier) => {
  const raw = normalizeText(identifier);
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return raw;

  const results = await searchMutualFunds(raw);
  if (results.length > 0) return results[0].schemeCode;

  const catalog = await fetchAllMutualFunds();
  const exact = catalog.find((fund) => fund.schemeName.toLowerCase() === raw.toLowerCase());
  return exact?.schemeCode || raw;
};

export const fetchMutualFundDetails = async (identifier) => {
  const raw = normalizeText(identifier);
  if (!raw) return null;

  const symbol = await resolveSymbol(raw);
  for (const base of MFAPI_BASE_URLS) {
    try {
      const response = await fetchWithTimeout(`${base}/mf/${encodeURIComponent(symbol)}/latest`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!response.ok) continue;

      const payload = await response.json();
      const meta = payload?.meta || {};
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const latest = rows[0] || null;
      const nav = parseFloat(latest?.nav);
      const history = rows
        .map((row) => ({
          date: row?.date || null,
          nav: parseFloat(row?.nav),
        }))
        .filter((row) => row.date && Number.isFinite(row.nav))
        .reverse();

      return {
        schemeCode: normalizeText(meta?.scheme_code || symbol),
        schemeName: normalizeText(meta?.scheme_name || raw || symbol),
        fundHouse: normalizeText(meta?.fund_house) || null,
        schemeType: normalizeText(meta?.scheme_type) || "Mutual Fund",
        schemeCategory: normalizeText(meta?.scheme_category) || null,
        isinGrowth: normalizeText(meta?.isin_growth) || null,
        isinDivReinvestment: normalizeText(meta?.isin_div_reinvestment) || null,
        nav: Number.isFinite(nav) ? nav : null,
        lastUpdated: latest?.date || null,
        history,
      };
    } catch (error) {
      // Try next base URL
    }
  }

  return null;
};

export const mergeFundWithLatestDetails = async (fund) => {
  try {
    const details = await fetchMutualFundDetails(fund?.schemeCode || fund?.symbol || fund?.schemeName);
    if (!details) {
      return fund;
    }
    return {
      ...fund,
      schemeCode: details.schemeCode || fund?.schemeCode,
      schemeName: details.schemeName || fund?.schemeName,
      fundHouse: details.fundHouse || fund?.fundHouse || null,
      schemeType: details.schemeType || fund?.schemeType || null,
      schemeCategory: details.schemeCategory || fund?.schemeCategory || null,
      isinGrowth: details.isinGrowth || fund?.isinGrowth || null,
      isinDivReinvestment: details.isinDivReinvestment || fund?.isinDivReinvestment || null,
      nav: details.nav,
      lastUpdated: details.lastUpdated,
      history: details.history || [],
    };
  } catch (error) {
    console.warn("Could not merge mutual fund details:", error?.message || error);
    return fund;
  }
};

const historyCache = new Map(); // schemeCode -> { at, rows }
const HISTORY_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Full NAV history for a scheme, oldest first: [{ t: unix seconds, nav }].
 * mfapi dates are "DD-MM-YYYY".
 */
export const fetchMutualFundHistory = async (schemeCode) => {
  const code = normalizeText(schemeCode);
  if (!/^\d+$/.test(code)) return [];
  const hit = historyCache.get(code);
  if (hit && Date.now() - hit.at < HISTORY_TTL_MS) return hit.rows;

  for (const base of MFAPI_BASE_URLS) {
    try {
      const response = await fetchWithTimeout(`${base}/mf/${code}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const rows = (Array.isArray(payload?.data) ? payload.data : [])
        .map((row) => {
          const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(row?.date || ""));
          const nav = parseFloat(row?.nav);
          if (!m || !Number.isFinite(nav)) return null;
          return { t: Date.UTC(+m[3], +m[2] - 1, +m[1]) / 1000, nav };
        })
        .filter(Boolean)
        .sort((a, b) => a.t - b.t);
      historyCache.set(code, { at: Date.now(), rows });
      return rows;
    } catch (error) {
      // Try next base URL
    }
  }
  return [];
};
