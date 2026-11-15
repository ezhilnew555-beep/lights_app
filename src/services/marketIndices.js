// Live index quotes (NIFTY 50 / SENSEX / BANK NIFTY) from Yahoo Finance.
//
// One shared poller serves every ticker on screen:
//  • all indices are fetched in parallel on each tick,
//  • every 5 s while the NSE session is open (Mon–Fri 09:15–15:30 IST, incl.
//    the 09:00 pre-open), every 60 s otherwise,
//  • an immediate refresh whenever the app returns to the foreground,
//  • polling stops when no ticker is mounted.

import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { getStockQuote } from "./yahooFinanceService";

export const INDICES = [
  { symbol: "^NSEI", label: "NIFTY", name: "Nifty 50" },
  { symbol: "^BSESN", label: "SENSEX", name: "Sensex" },
  { symbol: "^NSEBANK", label: "BANKNIFTY", name: "Bank Nifty" },
];

const LIVE_MS = 5 * 1000;
const IDLE_MS = 60 * 1000;
const YF_HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

/** True during the NSE session (IST), including the 09:00 pre-open. */
export const isMarketOpen = (now = new Date()) => {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 && mins <= 15 * 60 + 30;
};

// Latest price straight from the chart endpoint (1-minute bars keep
// regularMarketPrice fresh); cache-busted so no intermediary serves stale data.
const fetchIndex = async (ix) => {
  for (const host of YF_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(ix.symbol)}?interval=1m&range=1d&_=${Date.now()}`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" } });
      if (!res.ok) continue;
      const meta = (await res.json())?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      const prev = meta?.chartPreviousClose ?? meta?.previousClose;
      if (typeof price !== "number") continue;
      return {
        ...ix,
        price,
        change: prev ? price - prev : 0,
        changePct: prev ? ((price - prev) / prev) * 100 : 0,
        updatedAt: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch (_) {}
  }
  // Fallback: the shared quote service (also used by the design preview)
  const q = await getStockQuote(ix.symbol).catch(() => null);
  if (!q || !q.regularMarketPrice) return null;
  return { ...ix, price: q.regularMarketPrice, change: q.dayChange || 0, changePct: q.dayChangePercent || 0, updatedAt: Date.now() };
};

// ── Shared poller ────────────────────────────────────────────────────
let state = { indices: [], live: isMarketOpen(), updatedAt: null };
const subscribers = new Set();
let timer = null;
let inFlight = false;
let appStateSub = null;

const emit = () => subscribers.forEach((fn) => fn(state));

export const refreshIndices = async () => {
  if (inFlight) return state;
  inFlight = true;
  try {
    const results = await Promise.all(INDICES.map(fetchIndex));
    const next = results.filter(Boolean);
    // Keep the last good value for any index that failed this tick
    const merged = INDICES.map(
      (ix) => next.find((n) => n.symbol === ix.symbol) || state.indices.find((o) => o.symbol === ix.symbol)
    ).filter(Boolean);
    state = { indices: merged, live: isMarketOpen(), updatedAt: next.length ? Date.now() : state.updatedAt };
    emit();
  } finally {
    inFlight = false;
  }
  return state;
};

const schedule = () => {
  clearTimeout(timer);
  if (subscribers.size === 0) return;
  timer = setTimeout(async () => {
    await refreshIndices();
    schedule();
  }, isMarketOpen() ? LIVE_MS : IDLE_MS);
};

const start = () => {
  refreshIndices().finally(schedule);
  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", (s) => {
      if (s === "active" && subscribers.size) refreshIndices().finally(schedule);
      else if (s !== "active") clearTimeout(timer);
    });
  }
};

const stop = () => {
  clearTimeout(timer);
  timer = null;
  appStateSub?.remove();
  appStateSub = null;
};

/** Live index quotes; [] until the first response arrives. */
export const useMarketIndices = () => {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    subscribers.add(setSnap);
    if (subscribers.size === 1) start();
    else setSnap(state);
    return () => {
      subscribers.delete(setSnap);
      if (subscribers.size === 0) stop();
    };
  }, []);
  return snap;
};

// Back-compat for one-off reads
export const fetchIndices = async () => (await refreshIndices()).indices;
