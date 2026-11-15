// Demo account used only by the design preview (PULSE_PREVIEW=1).
// Mirrors the sample data in Design/pulse/Pulse.dc.html, dated relative to today.

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const at = (n, h, m) => {
  const d = dayOffset(n);
  d.setHours(h, m, 0, 0);
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000) };
};

export const DEMO_UID = "demo-user";

export const profile = {
  firstName: "Arjun",
  lastName: "Mehta",
  userName: "arjun",
  email: "arjun@example.com",
  phoneNumber: "+919876543210",
  country: "India",
  age: 29,
  retirementAge: 45,
  coins: 12480,
  createdAt: { toDate: () => new Date(2025, 2, 4), seconds: 1741046400 },
};

let txId = 0;
const tx = (offset, name, amount, type, subType, method, h = 12, m = 0, extra = {}) => ({
  id: `t${++txId}`,
  name,
  amount,
  type,
  subType,
  method,
  date: iso(dayOffset(offset)),
  createdAt: at(offset, h, m),
  ...extra,
});

export const transactions = [
  // today (matches the design's "Today" list)
  tx(0, "Groceries", 1240, "Expense", "Essential", "UPI", 9, 40, { description: "BigBasket" }),
  tx(0, "Fuel — Vehicles", 2000, "Expense", "Essential", "Credit Card", 11, 5, { description: "Indian Oil" }),
  tx(0, "Netflix", 649, "Expense", "Discretionary", "UPI", 12, 0),
  tx(0, "SIP — Parag Parikh Flexi Cap", 5000, "Investment", "SIP", "Investment", 14, 15),
  tx(0, "Freelancing", 12000, "Income", "Active", "Bank Transfer", 18, 30, { description: "UI audit invoice" }),
  // earlier this month
  tx(-1, "Electricity bill", 1200, "Expense", "Mandatory", "UPI", 10, 0),
  tx(-2, "Dining out", 1850, "Expense", "Discretionary", "Credit Card", 20, 15),
  tx(-3, "Salary", 100000, "Income", "Active", "Bank Transfer", 9, 0),
  tx(-3, "Home Loan EMI", 13670, "Expense", "Mandatory", "Bank Transfer", 9, 30),
  tx(-5, "Pharmacy", 640, "Expense", "Essential", "UPI", 18, 0),
  tx(-6, "Groceries", 2310, "Expense", "Essential", "UPI", 17, 20),
  tx(-8, "Mutual fund lumpsum", 20000, "Investment", "Mutual Fund", "Investment", 11, 0),
  tx(-9, "Movie tickets", 900, "Expense", "Discretionary", "UPI", 21, 0),
  tx(-10, "Health insurance", 1200, "Expense", "Mandatory", "Credit Card", 10, 0),
  tx(-12, "Internet", 999, "Expense", "Essential", "UPI", 8, 0),
  tx(-14, "Rent", 25000, "Expense", "Mandatory", "Bank Transfer", 9, 0),
  tx(-15, "Interest credit", 3200, "Income", "Passive", "Bank Transfer", 6, 0),
  tx(-16, "Shopping", 3251, "Expense", "Discretionary", "Credit Card", 16, 0),
  tx(-18, "Fuel — Vehicles", 1800, "Expense", "Essential", "Credit Card", 8, 30),
  // due soon (future recurring entries)
  tx(2, "Home Loan EMI", 28400, "Expense", "Mandatory", "HDFC · Auto-debit", 9, 0),
  tx(5, "SIP · Axis Bluechip", 5000, "Expense", "Mandatory", "Auto-debit", 9, 0),
];

export const investments = [
  { id: "i1", investmentType: "Mutual Fund", name: "Parag Parikh Flexi Cap", schemeName: "Parag Parikh Flexi Cap Fund - Direct Growth", schemeCode: "122639", amount: 660000, currentAmount: 782400, units: 9300.8, currentNAV: 84.12, nav: 70.96, calculationType: "SIP", sipDate: 5, interestRate: 12, goalId: "firenumber", goalName: "F.I.R.E Number", startDate: iso(dayOffset(-900)) },
  { id: "i2", investmentType: "Mutual Fund", name: "Axis Bluechip", schemeName: "Axis Bluechip Fund - Direct Growth", schemeCode: "120465", amount: 446200, currentAmount: 496200, units: 7943.1, currentNAV: 62.47, nav: 56.17, calculationType: "SIP", sipDate: 28, interestRate: 12, goalId: "firenumber", goalName: "F.I.R.E Number", startDate: iso(dayOffset(-800)) },
  { id: "i3", investmentType: "Mutual Fund", name: "Mirae Asset ELSS Tax Saver", schemeName: "Mirae Asset ELSS Tax Saver Fund - Direct Growth", schemeCode: "135781", amount: 295700, currentAmount: 341800, units: 6989.8, currentNAV: 48.9, nav: 42.3, calculationType: "SIP", interestRate: 12, goalName: "Dream Home", startDate: iso(dayOffset(-700)) },
  { id: "i4", investmentType: "Mutual Fund", name: "HDFC Index Nifty 50", schemeName: "HDFC Index Fund - NIFTY 50 Plan - Direct", schemeCode: "119063", amount: 200000, currentAmount: 219600, units: 950.4, currentNAV: 231.05, nav: 210.4, calculationType: "Lumpsum", interestRate: 11, goalName: "F.I.R.E Number", goalId: "firenumber", startDate: iso(dayOffset(-8)) },
  { id: "i5", investmentType: "stock", name: "RELIANCE - Reliance Industries", symbol: "RELIANCE", quantity: 40, purchasePrice: 2610, amount: 104400, currentAmount: 117944, exchange: "NSE", goalId: "firenumber", goalName: "F.I.R.E Number", startDate: iso(dayOffset(-300)) },
  { id: "i6", investmentType: "stock", name: "INFY - Infosys", symbol: "INFY", quantity: 300, purchasePrice: 1720, amount: 516000, currentAmount: 561870, exchange: "NSE", goalName: "Wealth Creation", startDate: iso(dayOffset(-400)) },
  { id: "i7", investmentType: "stock", name: "HDFCBANK - HDFC Bank", symbol: "HDFCBANK", quantity: 180, purchasePrice: 1610, amount: 289800, currentAmount: 303156, exchange: "NSE", goalName: "Wealth Creation", startDate: iso(dayOffset(-250)) },
  { id: "i8", investmentType: "Fixed Deposit", name: "FD - SBI", amount: 800000, currentAmount: 800000, interestRate: 7.1, maturityDate: iso(dayOffset(500)), startDate: iso(dayOffset(-200)), goalName: "F.I.R.E Number", goalId: "firenumber" },
  { id: "i9", investmentType: "Savings", name: "Savings - HDFC", amount: 400000, currentAmount: 400000, interestRate: 3.5, startDate: iso(dayOffset(-600)) },
  { id: "i10", investmentType: "Recurring Deposit", name: "RD - ICICI", amount: 240000, currentAmount: 240000, interestRate: 6.8, monthlyDeposit: 10000, startDate: iso(dayOffset(-720)), maturityDate: iso(dayOffset(365)) },
];

export const goals = [
  { id: "g1", name: "Dream Home", customName: "Dream Home", presentCost: 7500000, years: 8, inflation: 6, currentSavings: 1200000, investmentType: "SIP/MF", createdAt: at(-90, 9, 0) },
  { id: "g2", name: "Child Education", customName: "Child Education", presentCost: 2500000, years: 12, inflation: 6, currentSavings: 300000, investmentType: "SIP/MF", createdAt: at(-60, 9, 0) },
  { id: "g3", name: "Marriage", customName: "Marriage", presentCost: 1500000, years: 4, inflation: 6, currentSavings: 600000, investmentType: "SIP/MF", createdAt: at(-30, 9, 0) },
];

export const coinHistory = [
  { id: "c1", action: "daily_open", points: 5, timestamp: at(0, 8, 2) },
  { id: "c2", action: "add_expense", description: "Groceries", points: 10, timestamp: at(0, 9, 41) },
  { id: "c3", action: "add_income", description: "Freelancing", points: 10, timestamp: at(0, 18, 31) },
  { id: "c4", action: "add_expense", description: "Fuel — Vehicles", points: 5, timestamp: at(-1, 11, 6) },
  { id: "c5", action: "add_investment", description: "Fixed Deposit", points: 20, timestamp: at(-3, 10, 0) },
];

// Market snapshot from the design
export const quotes = {
  INFY: { name: "Infosys", price: 1872.9, change: 2.1, spark: [0.2, 0.3, 0.25, 0.4, 0.5, 0.45, 0.6, 0.7, 0.8, 0.95] },
  RELIANCE: { name: "Reliance Industries", price: 2948.6, change: 1.24, spark: [0.3, 0.35, 0.3, 0.45, 0.4, 0.55, 0.6, 0.58, 0.7, 0.8] },
  HDFCBANK: { name: "HDFC Bank", price: 1684.2, change: 0.88, spark: [0.4, 0.38, 0.45, 0.5, 0.48, 0.55, 0.52, 0.6, 0.62, 0.66] },
  TCS: { name: "Tata Consultancy", price: 4112.35, change: -0.62, spark: [0.7, 0.72, 0.65, 0.6, 0.62, 0.55, 0.5, 0.52, 0.45, 0.42] },
  TATAMOTORS: { name: "Tata Motors", price: 1021.45, change: -1.35, spark: [0.8, 0.75, 0.7, 0.72, 0.6, 0.55, 0.5, 0.4, 0.35, 0.3] },
  "^NSEI": { name: "Nifty 50", price: 24812.4, change: 0.42 },
  "^BSESN": { name: "Sensex", price: 81236.1, change: 0.38 },
  "^NSEBANK": { name: "Bank Nifty", price: 52140.35, change: 0.21 },
};
