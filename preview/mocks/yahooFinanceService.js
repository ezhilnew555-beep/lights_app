// Preview stand-in for src/services/yahooFinanceService.js (design market snapshot).
import { INDIAN_STOCKS_MASTER, filterIndianStocks } from "../../src/data/indianStocksData";
import { quotes } from "./demoData";

const clean = (s) => String(s || "").toUpperCase().replace(/\.(NS|BO)$/, "");

export const getStockQuote = async (symbol) => {
  const key = clean(symbol);
  const q = quotes[key];
  if (!q) {
    const m = INDIAN_STOCKS_MASTER.find((s) => s.symbol === key);
    if (!m) return null;
    return {
      symbol: `${key}.NS`, regularMarketPrice: m.basePrice || 1000, previousClose: m.basePrice || 1000,
      currency: "INR", exchangeName: "NSE", shortName: m.name, dayChange: 0, dayChangePercent: 0,
    };
  }
  const prev = q.price / (1 + q.change / 100);
  return {
    symbol: key.startsWith("^") ? key : `${key}.NS`,
    regularMarketPrice: q.price,
    previousClose: prev,
    currency: "INR",
    exchangeName: "NSE",
    shortName: q.name,
    dayChange: q.price - prev,
    dayChangePercent: q.change,
    fiftyTwoWeekHigh: q.price * 1.18,
    fiftyTwoWeekLow: q.price * 0.78,
    regularMarketVolume: 4820000,
  };
};

export const getMultipleQuotes = async (symbols) =>
  (await Promise.all(symbols.map(getStockQuote))).filter(Boolean);

export const searchStocks = async (q) => {
  const r = filterIndianStocks({ search: q || "", limit: 20 });
  return (r.results || r.data || r || []).map ? (r.results || r.data || r) : [];
};

export const getStockHistory = async (symbol) => {
  const q = quotes[clean(symbol)];
  const base = q ? q.price : 1000;
  const shape = q && q.spark ? q.spark : [0.42, 0.45, 0.4, 0.38, 0.44, 0.47, 0.43, 0.5, 0.52, 0.55, 0.58, 0.6, 0.64, 0.7, 0.75, 0.8, 0.84];
  const now = Date.now();
  const prices = shape.map((v) => +(base * (0.9 + v * 0.12)).toFixed(2));
  const timestamps = shape.map((_, i) => Math.floor((now - (shape.length - i) * 86400000) / 1000));
  return { timestamps, prices };
};

export const getPopularIndianStocks = () =>
  INDIAN_STOCKS_MASTER.map((s) => ({
    symbol: s.symbol, bseSymbol: s.bseSymbol, shortName: s.name, exchange: s.exchange,
    sector: s.sector, category: s.category, basePrice: s.basePrice,
  }));
