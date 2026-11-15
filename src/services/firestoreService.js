/**
 * firestoreService.js
 * Central data layer for LigthsON — all Firestore reads/writes.
 * Replaces every backend REST API call for transactions, investments, goals, profile, stocks.
 *
 * Works offline: the user's data goes through services/offlineStore, which
 * keeps a copy on the phone and queues writes until the network is back.
 * Writes resolve as soon as they are saved on the phone.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/FirebaseConfig";
import { notifyEntryLogged } from "./dailyNotifications";
import { EventRegister } from "react-native-event-listeners";
import { readCollection, readProfile, write, newId, SERVER_TIME } from "./offlineStore";

// Live views (services/portfolioLive) reload when any investment changes
const portfolioChanged = () => EventRegister.emit("portfolioChanged");

// Newest first by a field (Timestamps, ISO dates or "YYYY-MM-DD" strings);
// records without the field go last.
const sortValue = (v) => (v?.toMillis ? v.toMillis() : v instanceof Date ? v.getTime() : v);
const newestFirst = (field) => (a, b) => {
    const x = sortValue(a[field]);
    const y = sortValue(b[field]);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    return x < y ? 1 : x > y ? -1 : 0;
};

// ══════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════

/** Fetch user profile from Firestore */
export const getProfile = async (uid) => readProfile(uid);

/**
 * Update the profile fields the user may edit.
 * Coins and lastSeenDate are server-managed (see functions/index.js).
 */
export const updateProfile = async (uid, data) => {
    const allowed = ["firstName", "lastName", "phoneNumber", "country", "age", "retirementAge", "pushToken", "lastBreakoutUnlock"];
    const update = {};
    allowed.forEach((f) => { if (data[f] !== undefined) update[f] = data[f]; });
    await write(uid, "update", "", uid, update);
};

// ══════════════════════════════════════════════
// COINS
// ══════════════════════════════════════════════

// Coins are awarded only by Cloud Functions: Firestore triggers reward new
// income, expense and investment records, and dailyCheckIn handles app opens.

/** Fetch coin history for a user (most recent first) */
export const getCoinHistory = async (uid) =>
    (await readCollection(uid, "coinHistory")).sort(newestFirst("timestamp"));

// ══════════════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════════════

/** Fetch ALL transactions for a user */
export const getTransactions = async (uid) =>
    (await readCollection(uid, "transactions")).sort(newestFirst("date"));

/**
 * Add a new transaction
 * @param {string} uid
 * @param {{ name, amount, type, subType, method, date }} data
 */
export const addTransaction = async (uid, data) => {
    const id = newId(uid, "transactions");
    await write(uid, "set", "transactions", id, {
        ...data,
        amount: parseFloat(data.amount),
        createdAt: SERVER_TIME,
    });
    notifyEntryLogged(); // tonight's 9 PM check reflects the new entry
    return id;
};

/** Delete a transaction by its document ID */
export const deleteTransaction = async (uid, txnId) => {
    await write(uid, "delete", "transactions", txnId);
    notifyEntryLogged();
};

/** Update a transaction */
export const updateTransaction = async (uid, txnId, data) => {
    await write(uid, "update", "transactions", txnId, {
        ...data,
        updatedAt: SERVER_TIME,
    });
};

// ══════════════════════════════════════════════
// INVESTMENTS (FD, RD, MF, Stocks, Savings)
// ══════════════════════════════════════════════

/** Get all investments for user (optionally filter by type) */
export const getInvestments = async (uid, investmentType = null) => {
    const all = await readCollection(uid, "investments");
    return investmentType ? all.filter((i) => i.investmentType === investmentType) : all;
};

/**
 * Add a new investment
 * Handles FD, RD, Mutual Fund, Stock, Savings types
 */
export const addInvestment = async (uid, data) => {
    const id = newId(uid, "investments");
    await write(uid, "set", "investments", id, {
        ...data,
        amount: parseFloat(data.amount),
        currentAmount: parseFloat(data.currentAmount || data.amount),
        createdAt: SERVER_TIME,
    });
    notifyEntryLogged();
    portfolioChanged();
    return id;
};

/**
 * Update an investment. `notify: false` skips the portfolio reload — for
 * background price write-backs that don't change what the user holds.
 */
export const updateInvestment = async (uid, id, data, { notify = true } = {}) => {
    await write(uid, "update", "investments", id, data);
    if (notify) portfolioChanged();
};

/** Delete an investment */
export const deleteInvestment = async (uid, id) => {
    await write(uid, "delete", "investments", id);
    portfolioChanged();
};

// ══════════════════════════════════════════════
// GOALS
// ══════════════════════════════════════════════

/** Get all goals for user */
export const getGoals = async (uid) =>
    (await readCollection(uid, "goals")).sort(newestFirst("createdAt"));

/** Add a new goal */
export const addGoal = async (uid, data) => {
    const id = newId(uid, "goals");
    await write(uid, "set", "goals", id, {
        ...data,
        createdAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
    });
    return id;
};

/** Update a goal */
export const updateGoal = async (uid, id, data) => {
    await write(uid, "update", "goals", id, {
        ...data,
        updatedAt: SERVER_TIME,
    });
};

/** Delete a goal */
export const deleteGoal = async (uid, id) => {
    await write(uid, "delete", "goals", id);
};

// ══════════════════════════════════════════════
// STOCK PORTFOLIO
// ══════════════════════════════════════════════

/** Get user's stock portfolio */
export const getStockPortfolio = async (uid) => readCollection(uid, "stockPortfolio");

/** Add stock to portfolio */
export const addStock = async (uid, data) => {
    const id = newId(uid, "stockPortfolio");
    await write(uid, "set", "stockPortfolio", id, {
        ...data,
        dateAdded: SERVER_TIME,
    });
    return id;
};

/** Delete stock from portfolio */
export const deleteStock = async (uid, id) => {
    await write(uid, "delete", "stockPortfolio", id);
};

/** Update stock (e.g. after sell) */
export const updateStock = async (uid, id, data) => {
    await write(uid, "update", "stockPortfolio", id, data);
};

// ══════════════════════════════════════════════
// STOCK WATCHLIST (stocks the user plans to buy)
// ══════════════════════════════════════════════

/** Watchlist items, one per ticker: { symbol, name, exchange, targetPrice?, plannedQty?, note?, addedPrice? } */
export const getWatchlist = async (uid) => readCollection(uid, "watchlist");

const watchId = (symbol) => String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9&_-]/g, "_");

/** Add or update a ticker on the watchlist (keyed by symbol, so no duplicates). */
export const saveWatchlistItem = async (uid, item) => {
    const id = watchId(item.symbol);
    const clean = {};
    ["symbol", "name", "exchange", "note"].forEach((f) => {
        if (typeof item[f] === "string") clean[f] = item[f].slice(0, 120);
    });
    ["targetPrice", "plannedQty", "addedPrice"].forEach((f) => {
        const n = parseFloat(item[f]);
        clean[f] = Number.isFinite(n) && n > 0 ? n : null;
    });
    clean.symbol = id;
    clean.updatedAt = SERVER_TIME;
    await write(uid, "set", "watchlist", id, clean, { merge: true });
    return id;
};

export const removeWatchlistItem = async (uid, symbol) => {
    await write(uid, "delete", "watchlist", watchId(symbol));
};

// ══════════════════════════════════════════════
// MUTUAL FUND NAV (Global Collection)
// ══════════════════════════════════════════════

// The mutualFunds cache is filled by server jobs; clients can only read it.

/** Get all cached mutual funds */
export const getCachedMutualFunds = async () => {
    const snap = await getDocs(collection(db, "mutualFunds"));
    return snap.docs.map((d) => d.data());
};
