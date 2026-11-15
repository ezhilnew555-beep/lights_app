/**
 * yahooFinanceService.js
 * Replaces the `yahoo-finance2` Node.js backend package.
 * Makes direct HTTP calls to Yahoo Finance public API endpoints.
 * Works natively on mobile (no CORS restrictions on React Native).
 */

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_BASE2 = "https://query2.finance.yahoo.com";
const YF_HEADERS = { "User-Agent": "Mozilla/5.0" };

const normalizeSymbol = (symbol) =>
          typeof symbol === "string" ? symbol.trim().toUpperCase() : "";

const hasExchangeSuffix = (symbol) => /\.[A-Z]{1,5}$/.test(symbol);

const buildSymbolCandidates = (symbol) => {
          const normalized = normalizeSymbol(symbol);
          if (!normalized) return [];
          if (hasExchangeSuffix(normalized)) return [normalized];

          // Keep original first for global symbols (e.g. AAPL), then try Indian exchanges.
          return [normalized, `${normalized}.NS`, `${normalized}.BO`];
};

const fetchQuoteForSymbol = async (symbol) => {
          try {
                    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
                    const res = await fetch(url, { headers: YF_HEADERS });
                    if (!res.ok) return null;

                    const json = await res.json();
                    const meta = json?.chart?.result?.[0]?.meta;
                    if (!meta) return null;

                    const previousClose = meta.previousClose || meta.chartPreviousClose;
                    const regularMarketPrice = meta.regularMarketPrice ?? previousClose ?? 0;
                    const dayChange = previousClose ? regularMarketPrice - previousClose : 0;
                    const dayChangePercent = previousClose ? (dayChange / previousClose) * 100 : 0;

                    return {
                              symbol: meta.symbol,
                              regularMarketPrice,
                              previousClose,
                              currency: meta.currency || "INR",
                              exchangeName: meta.exchangeName || (symbol.endsWith(".BO") ? "BSE" : "NSE"),
                              shortName: meta.shortName || symbol,
                              dayChange,
                              dayChangePercent,
                              fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                              fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                              regularMarketVolume: meta.regularMarketVolume,
                              marketCap: meta.marketCap,
                    };
          } catch (_) {
                    return null;
          }
};

const fetchHistoryForSymbol = async (symbol, range, interval) => {
          try {
                    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
                    const res = await fetch(url, { headers: YF_HEADERS });
                    if (!res.ok) return null;

                    const json = await res.json();
                    const result = json?.chart?.result?.[0];
                    if (!result) return null;

                    const timestamps = result.timestamp || [];
                    const prices = result.indicators?.quote?.[0]?.close || [];

                    return { timestamps, prices };
          } catch (_) {
                    return null;
          }
};

/**
 * Get real-time quote for a single stock symbol.
 * @param {string} symbol — e.g. "TCS.NS", "RELIANCE.NS", "AAPL"
 * @returns {object} quote data or null
 */
export const getStockQuote = async (symbol) => {
          try {
                    const candidates = buildSymbolCandidates(symbol);
                    if (candidates.length === 0) return null;

                    for (const candidate of candidates) {
                              try {
                                        const quote = await fetchQuoteForSymbol(candidate);
                                        if (quote) return quote;
                              } catch (_) {}
                    }
                    return null;
          } catch (_) {
                    return null;
          }
};

/**
 * Get quotes for multiple symbols at once.
 * @param {string[]} symbols
 * @returns {object[]} array of quote objects
 */
export const getMultipleQuotes = async (symbols) => {
          const results = await Promise.allSettled(
                    symbols.map((s) => getStockQuote(s))
          );
          return results
                    .filter((r) => r.status === "fulfilled" && r.value !== null)
                    .map((r) => r.value);
};

import { INDIAN_STOCKS_MASTER, filterIndianStocks } from "../data/indianStocksData";

/**
 * Search for stocks by company name or symbol.
 * Searches both the curated Indian stock master database and live Yahoo Finance API.
 * @param {string} searchQuery — e.g. "Tata", "HDFC", "Zomato", "Suzlon"
 * @returns {object[]} list of matching stocks
 */
export const searchStocks = async (searchQuery) => {
          const query = (searchQuery || "").trim();
          if (!query) return [];

          try {
                    // 1. First search all 6,700+ Indian stock master universe
                    const localMatch = filterIndianStocks({ search: query, limit: 60 }).stocks.map((s) => ({
                              symbol: s.symbol,
                              bseSymbol: s.bseSymbol,
                              shortName: s.name,
                              longName: s.name,
                              exchange: s.exchange,
                              sector: s.sector,
                              category: s.category,
                              basePrice: s.basePrice,
                              isLocal: true,
                    }));

                    // 2. Query live Yahoo Finance search API
                    let apiMatches = [];
                    try {
                              const url = `${YF_BASE2}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=true`;
                              const res = await fetch(url, { headers: YF_HEADERS });
                              if (res.ok) {
                                        const json = await res.json();
                                        const quotes = json?.quotes || [];
                                        apiMatches = quotes
                                                  .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
                                                  .map((q) => ({
                                                            symbol: q.symbol,
                                                            shortName: q.shortname || q.longname || q.symbol,
                                                            longName: q.longname || q.shortname || q.symbol,
                                                            exchange: q.exchange || (q.symbol?.endsWith(".BO") ? "BSE" : "NSE"),
                                                            exchDisp: q.exchDisp,
                                                            sector: q.sector || "Stock",
                                                  }));
                              }
                    } catch (e) {
                              console.warn("[YahooFinance] Live search fallback to local master:", e.message);
                    }

                    // 3. Merge and deduplicate by symbol (preferring Indian .NS / .BO stocks)
                    const seen = new Set();
                    const combined = [];

                    // Local high-confidence Indian matches first
                    for (const item of localMatch) {
                              if (!seen.has(item.symbol)) {
                                        seen.add(item.symbol);
                                        combined.push(item);
                              }
                    }

                    // Then API matches that end in .NS or .BO
                    for (const item of apiMatches) {
                              if (item.symbol?.endsWith(".NS") || item.symbol?.endsWith(".BO")) {
                                        if (!seen.has(item.symbol)) {
                                                  seen.add(item.symbol);
                                                  combined.push(item);
                                        }
                              }
                    }

                    // Finally other global matches
                    for (const item of apiMatches) {
                              if (!seen.has(item.symbol)) {
                                        seen.add(item.symbol);
                                        combined.push(item);
                              }
                    }

                    return combined;
          } catch (err) {
                    console.error("[YahooFinance] searchStocks error:", err.message);
                    return filterIndianStocks({ search: query, limit: 15 }).stocks.map((s) => ({
                              symbol: s.symbol,
                              shortName: s.name,
                              longName: s.name,
                              exchange: s.exchange,
                              sector: s.sector,
                    }));
          }
};

/**
 * Get historical price data for a stock (for charts).
 * @param {string} symbol
 * @param {string} range — "1d","5d","1mo","3mo","6mo","1y","5y"
 * @param {string} interval — "1m","5m","15m","1h","1d","1wk","1mo"
 * @returns {{ timestamps: number[], prices: number[] }}
 */
export const getStockHistory = async (symbol, range = "1mo", interval = "1d") => {
          try {
                    const candidates = buildSymbolCandidates(symbol);
                    if (candidates.length === 0) return { timestamps: [], prices: [] };

                    let lastError = null;
                    for (const candidate of candidates) {
                              try {
                                        const history = await fetchHistoryForSymbol(candidate, range, interval);
                                        if (history) return history;
                              } catch (err) {
                                        lastError = err;
                              }
                    }

                    if (lastError) throw lastError;
                    return { timestamps: [], prices: [] };
          } catch (err) {
                    console.error(`[YahooFinance] getStockHistory error for ${symbol}:`, err.message);
                    return { timestamps: [], prices: [] };
          }
};

/**
 * Get a list of popular Indian NSE/BSE stocks.
 */
export const getPopularIndianStocks = () => {
          return INDIAN_STOCKS_MASTER.map((s) => ({
                    symbol: s.symbol,
                    bseSymbol: s.bseSymbol,
                    shortName: s.name,
                    exchange: s.exchange,
                    sector: s.sector,
                    category: s.category,
                    basePrice: s.basePrice,
          }));
};
