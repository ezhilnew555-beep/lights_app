/**
 * indianStocksData.js
 * ─────────────────────────────────────────────────────────────────────
 * Complete Indian Stock Universe: 6,700+ NSE & BSE Listed Companies.
 * Merges curated blue-chips with all 6,703 official exchange symbols.
 * ─────────────────────────────────────────────────────────────────────
 */

import { ALL_EXCHANGE_STOCKS } from "./allIndianStocks.js";

export const CURATED_INDIAN_STOCKS = [
  // ── 1. NIFTY 50 & SENSEX BLUE-CHIPS ───────────────────────────────
  {
    symbol: "RELIANCE.NS",
    bseSymbol: "RELIANCE.BO",
    name: "Reliance Industries Ltd",
    sector: "Energy & Petrochemicals",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 2980.50,
  },
  {
    symbol: "TCS.NS",
    bseSymbol: "TCS.BO",
    name: "Tata Consultancy Services Ltd",
    sector: "Information Technology",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 4220.00,
  },
  {
    symbol: "HDFCBANK.NS",
    bseSymbol: "HDFCBANK.BO",
    name: "HDFC Bank Ltd",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1650.00,
  },
  {
    symbol: "INFY.NS",
    bseSymbol: "INFY.BO",
    name: "Infosys Ltd",
    sector: "Information Technology",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1845.00,
  },
  {
    symbol: "ICICIBANK.NS",
    bseSymbol: "ICICIBANK.BO",
    name: "ICICI Bank Ltd",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1210.00,
  },
  {
    symbol: "BHARTIARTL.NS",
    bseSymbol: "BHARTIARTL.BO",
    name: "Bharti Airtel Ltd",
    sector: "Telecommunications",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1540.00,
  },
  {
    symbol: "SBIN.NS",
    bseSymbol: "SBIN.BO",
    name: "State Bank of India",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 830.00,
  },
  {
    symbol: "LICI.NS",
    bseSymbol: "LICI.BO",
    name: "Life Insurance Corporation of India",
    sector: "Insurance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: false,
    basePrice: 980.00,
  },
  {
    symbol: "ITC.NS",
    bseSymbol: "ITC.BO",
    name: "ITC Ltd",
    sector: "FMCG & Consumer",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 495.00,
  },
  {
    symbol: "HINDUNILVR.NS",
    bseSymbol: "HINDUNILVR.BO",
    name: "Hindustan Unilever Ltd",
    sector: "FMCG & Consumer",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 2680.00,
  },
  {
    symbol: "LT.NS",
    bseSymbol: "LT.BO",
    name: "Larsen & Toubro Ltd",
    sector: "Infrastructure & Engineering",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 3680.00,
  },
  {
    symbol: "BAJFINANCE.NS",
    bseSymbol: "BAJFINANCE.BO",
    name: "Bajaj Finance Ltd",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 7240.00,
  },
  {
    symbol: "HCLTECH.NS",
    bseSymbol: "HCLTECH.BO",
    name: "HCL Technologies Ltd",
    sector: "Information Technology",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1720.00,
  },
  {
    symbol: "MARUTI.NS",
    bseSymbol: "MARUTI.BO",
    name: "Maruti Suzuki India Ltd",
    sector: "Automotive",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 12450.00,
  },
  {
    symbol: "SUNPHARMA.NS",
    bseSymbol: "SUNPHARMA.BO",
    name: "Sun Pharmaceutical Industries Ltd",
    sector: "Pharmaceuticals & Healthcare",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1780.00,
  },
  {
    symbol: "TATAMOTORS.NS",
    bseSymbol: "TATAMOTORS.BO",
    name: "Tata Motors Ltd",
    sector: "Automotive",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 990.00,
  },
  {
    symbol: "KOTAKBANK.NS",
    bseSymbol: "KOTAKBANK.BO",
    name: "Kotak Mahindra Bank Ltd",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1820.00,
  },
  {
    symbol: "AXISBANK.NS",
    bseSymbol: "AXISBANK.BO",
    name: "Axis Bank Ltd",
    sector: "Banking & Finance",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 1190.00,
  },
  {
    symbol: "NTPC.NS",
    bseSymbol: "NTPC.BO",
    name: "NTPC Ltd",
    sector: "Energy & Utilities",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 395.00,
  },
  {
    symbol: "ONGC.NS",
    bseSymbol: "ONGC.BO",
    name: "Oil & Natural Gas Corporation Ltd",
    sector: "Energy & Petrochemicals",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 310.00,
  },
  {
    symbol: "TITAN.NS",
    bseSymbol: "TITAN.BO",
    name: "Titan Company Ltd",
    sector: "FMCG & Consumer",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 3420.00,
  },
  {
    symbol: "ADANIENT.NS",
    bseSymbol: "ADANIENT.BO",
    name: "Adani Enterprises Ltd",
    sector: "Conglomerate & Mining",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: false,
    basePrice: 2980.00,
  },
  {
    symbol: "TATASTEEL.NS",
    bseSymbol: "TATASTEEL.BO",
    name: "Tata Steel Ltd",
    sector: "Metals & Mining",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 155.00,
  },
  {
    symbol: "COALINDIA.NS",
    bseSymbol: "COALINDIA.BO",
    name: "Coal India Ltd",
    sector: "Metals & Mining",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: false,
    basePrice: 510.00,
  },
  {
    symbol: "WIPRO.NS",
    bseSymbol: "WIPRO.BO",
    name: "Wipro Ltd",
    sector: "Information Technology",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: true,
    isSensex: true,
    basePrice: 540.00,
  },
  {
    symbol: "ZOMATO.NS",
    bseSymbol: "ZOMATO.BO",
    name: "Zomato Ltd",
    sector: "Consumer Tech & Delivery",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 245.00,
  },
  {
    symbol: "SUZLON.NS",
    bseSymbol: "SUZLON.BO",
    name: "Suzlon Energy Ltd",
    sector: "Renewable Energy",
    exchange: "NSE",
    category: "Mid Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 78.00,
  },
  {
    symbol: "IRFC.NS",
    bseSymbol: "IRFC.BO",
    name: "Indian Railway Finance Corporation",
    sector: "Railways & PSU",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 172.00,
  },
  {
    symbol: "HAL.NS",
    bseSymbol: "HAL.BO",
    name: "Hindustan Aeronautics Ltd",
    sector: "Defense & Aerospace",
    exchange: "NSE",
    category: "Large Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 4780.00,
  },
  {
    symbol: "BSE.NS",
    bseSymbol: "BSE.BO",
    name: "BSE Ltd (Exchange)",
    sector: "Financial Markets",
    exchange: "NSE",
    category: "Mid Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 3820.00,
  },
  {
    symbol: "CDSL.NS",
    bseSymbol: "CDSL.BO",
    name: "Central Depository Services Ltd",
    sector: "Financial Markets",
    exchange: "NSE",
    category: "Mid Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 1460.00,
  },
  // Dairy & FMCG Stocks
  {
    symbol: "PARAGMILK.NS",
    bseSymbol: "PARAGMILK.BO",
    name: "Parag Milk Foods Ltd (Gowardhan/Pride of Cows)",
    sector: "Dairy & FMCG",
    exchange: "NSE",
    category: "Small Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 225.00,
  },
  {
    symbol: "DODLA.NS",
    bseSymbol: "DODLA.BO",
    name: "Dodla Dairy Ltd",
    sector: "Dairy & FMCG",
    exchange: "NSE",
    category: "Small Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 1040.00,
  },
  {
    symbol: "HATSUN.NS",
    bseSymbol: "HATSUN.BO",
    name: "Hatsun Agro Product Ltd (Arokya/Arun)",
    sector: "Dairy & FMCG",
    exchange: "NSE",
    category: "Mid Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 1120.00,
  },
  {
    symbol: "HERITGFOOD.NS",
    bseSymbol: "HERITGFOOD.BO",
    name: "Heritage Foods Ltd",
    sector: "Dairy & FMCG",
    exchange: "NSE",
    category: "Small Cap",
    isNifty50: false,
    isSensex: false,
    basePrice: 530.00,
  },
];

// Build the exhaustive Indian stock universe combining all curated bluechips & all exchange stocks
const masterMap = new Map();

// 1. First insert all curated stocks (Zomato, Paytm, Nykaa, Nifty 50, Sensex, etc.)
CURATED_INDIAN_STOCKS.forEach((stock) => {
  const clean = stock.symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
  const nseKey = `${clean}.NSE`;
  masterMap.set(nseKey, {
    symbol: stock.symbol,
    bseSymbol: stock.bseSymbol || `${clean}.BO`,
    name: stock.name,
    sector: stock.sector,
    exchange: stock.exchange || "NSE",
    category: stock.category || "Large Cap",
    isNifty50: !!stock.isNifty50,
    isSensex: !!stock.isSensex,
    basePrice: stock.basePrice || 100.0,
  });

  if (stock.bseSymbol) {
    const bseKey = `${clean}.BSE`;
    masterMap.set(bseKey, {
      symbol: stock.bseSymbol,
      bseSymbol: stock.bseSymbol,
      name: stock.name,
      sector: stock.sector,
      exchange: "BSE",
      category: stock.category || "Large Cap",
      isNifty50: !!stock.isNifty50,
      isSensex: !!stock.isSensex,
      basePrice: stock.basePrice || 100.0,
    });
  }
});

// 2. Add all 6,700+ exchange stocks from CSV (avoiding duplicates)
ALL_EXCHANGE_STOCKS.forEach((item) => {
  const cleanSym = item.s.toUpperCase();
  const key = `${cleanSym}.${item.e}`;
  if (!masterMap.has(key)) {
    masterMap.set(key, {
      symbol: item.t,
      bseSymbol: item.e === "BSE" ? item.t : `${cleanSym}.BO`,
      name: item.n || cleanSym,
      sector: item.sec || "Equity",
      exchange: item.e,
      category: item.e === "NSE" ? "NSE Listed" : "BSE Listed",
      isNifty50: false,
      isSensex: false,
      basePrice: 100.0,
    });
  }
});

export const INDIAN_STOCKS_MASTER = Array.from(masterMap.values());

/**
 * Filter Master Indian Stock Universe (Over 6,700+ Companies)
 */
export function filterIndianStocks({
  search = "",
  exchange = "ALL", // "ALL", "NSE", "BSE", "NIFTY50", "LARGE_CAP", "MID_CAP"
  sector = "ALL",
  page = 1,
  limit = 30,
}) {
  const query = search.trim().toLowerCase();

  let results = INDIAN_STOCKS_MASTER.filter((stock) => {
    // Exchange / Category filter
    if (exchange === "NSE" && stock.exchange !== "NSE") return false;
    if (exchange === "BSE" && stock.exchange !== "BSE") return false;
    if (exchange === "NIFTY50" && !stock.isNifty50) return false;
    if (exchange === "LARGE_CAP" && stock.category !== "Large Cap") return false;
    if (exchange === "MID_CAP" && stock.category !== "Mid Cap") return false;

    // Sector filter
    if (sector !== "ALL" && !stock.sector.toLowerCase().includes(sector.toLowerCase())) {
      return false;
    }

    // Text search (symbol, clean symbol, name, sector)
    if (query) {
      const cleanSym = stock.symbol.replace(/\.(NS|BO)$/i, "").toLowerCase();
      const matchClean = cleanSym.includes(query);
      const matchSymbol = stock.symbol.toLowerCase().includes(query);
      const matchName = stock.name.toLowerCase().includes(query);
      const matchSector = stock.sector.toLowerCase().includes(query);
      
      // Alias search for common Indian brand queries (e.g. milky mist, dairy, amul, tata, hdfc, reliance)
      const isDairySearch = query.includes("milk") || query.includes("dairy") || query.includes("mist");
      const matchDairy = isDairySearch && (cleanSym.includes("milk") || cleanSym.includes("dairy") || stock.sector.toLowerCase().includes("dairy") || stock.name.toLowerCase().includes("milk") || stock.name.toLowerCase().includes("dairy"));

      return matchClean || matchSymbol || matchName || matchSector || matchDairy;
    }

    return true;
  });

  const total = results.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedData = results.slice(startIndex, startIndex + limit);

  return {
    stocks: paginatedData,
    total,
    totalPages,
    currentPage: page,
    hasNext: page < totalPages,
  };
}

export default {
  INDIAN_STOCKS_MASTER,
  filterIndianStocks,
};
