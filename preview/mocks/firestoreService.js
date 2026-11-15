// Preview stand-in for src/services/firestoreService.js (in-memory demo data).
import * as demo from "./demoData";

const state = {
  profile: { ...demo.profile },
  transactions: [...demo.transactions],
  investments: [...demo.investments],
  goals: [...demo.goals],
  stocks: [],
  watchlist: [
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", targetPrice: 3900, plannedQty: 10, addedPrice: 4120 },
    { symbol: "ITC", name: "ITC Ltd", exchange: "NSE", note: "Dividend pick" },
  ],
};
let seq = 1000;
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 60));

export const getProfile = async () => wait({ ...state.profile });
export const updateProfile = async (uid, data) => {
  Object.assign(state.profile, data);
  return wait();
};
export const getCoinHistory = async () => wait([...demo.coinHistory]);

export const getTransactions = async () =>
  wait([...state.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)));
export const addTransaction = async (uid, data) => {
  const id = `t${++seq}`;
  state.transactions.push({ id, ...data, amount: parseFloat(data.amount), createdAt: { toDate: () => new Date(), seconds: Date.now() / 1000 } });
  return wait(id);
};
export const deleteTransaction = async (uid, id) => {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  return wait();
};
export const updateTransaction = async (uid, id, data) => {
  state.transactions = state.transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
  return wait();
};

export const getInvestments = async (uid, type = null) =>
  wait(state.investments.filter((i) => !type || i.investmentType === type));
export const addInvestment = async (uid, data) => {
  const id = `i${++seq}`;
  state.investments.push({ id, ...data });
  return wait(id);
};
export const updateInvestment = async (uid, id, data) => {
  state.investments = state.investments.map((i) => (i.id === id ? { ...i, ...data } : i));
  return wait();
};
export const deleteInvestment = async (uid, id) => {
  state.investments = state.investments.filter((i) => i.id !== id);
  return wait();
};

export const getGoals = async () => wait([...state.goals]);
export const addGoal = async (uid, data) => {
  const id = `g${++seq}`;
  state.goals.unshift({ id, ...data });
  return wait(id);
};
export const updateGoal = async (uid, id, data) => {
  state.goals = state.goals.map((g) => (g.id === id ? { ...g, ...data } : g));
  return wait();
};
export const deleteGoal = async (uid, id) => {
  state.goals = state.goals.filter((g) => g.id !== id);
  return wait();
};

export const getStockPortfolio = async () => wait([...state.stocks]);
export const addStock = async (uid, data) => {
  const id = `s${++seq}`;
  state.stocks.push({ id, ...data });
  return wait(id);
};
export const deleteStock = async (uid, id) => {
  state.stocks = state.stocks.filter((s) => s.id !== id);
  return wait();
};
export const updateStock = async (uid, id, data) => {
  state.stocks = state.stocks.map((s) => (s.id === id ? { ...s, ...data } : s));
  return wait();
};

export const getWatchlist = async () => wait(state.watchlist.map((w) => ({ id: w.symbol, ...w })));
export const saveWatchlistItem = async (uid, item) => {
  const symbol = String(item.symbol).toUpperCase();
  state.watchlist = [...state.watchlist.filter((w) => w.symbol !== symbol), { ...item, symbol }];
  return wait(symbol);
};
export const removeWatchlistItem = async (uid, symbol) => {
  state.watchlist = state.watchlist.filter((w) => w.symbol !== String(symbol).toUpperCase());
  return wait();
};

export const getCachedMutualFunds = async () => wait([]);
