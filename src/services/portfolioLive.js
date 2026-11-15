/**
 * portfolioLive.js
 * One shared, live view of the user's investments. Every screen that shows
 * money tied to the market — Home, Wealth, F.I.R.E., Goals, the stock
 * portfolio — subscribes to this single feed, so one price tick updates all
 * of them at the same moment and they always show the same numbers.
 *
 *   - prices refresh every minute while NSE is open, every 15 min otherwise
 *     (fund NAVs change once a day), and whenever a subscribed screen gains focus
 *   - the investment list reloads when something is added, sold or deleted
 *   - polling stops when no screen is listening or the app is in the background
 */
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import { auth } from "../config/FirebaseConfig";
import { getInvestments, updateInvestment } from "./firestoreService";
import { getLivePrices, valueInvestment, isMarketOpen, isStock, isMutualFund, isRecurring, lotUnits } from "./livePriceService";

const OPEN_MS = 60 * 1000;
const CLOSED_MS = 15 * 60 * 1000;
const RELOAD_LIST_AFTER_MS = 20 * 1000; // focus-triggered list reloads are throttled

let state = { uid: null, investments: [], live: { quotes: {}, navs: {}, at: null }, loaded: false, updatedAt: null };
const subscribers = new Set();
let timer = null;
let inflight = null;
let queued = null; // a refresh asked for while one was running (e.g. mid multi-lot sell)
let listLoadedAt = 0;
let appSub = null;
let eventIds = [];

const emit = () => subscribers.forEach((fn) => fn(state));

// Fund lots whose stored NAV we've already brought up to date (id -> nav)
const navWritten = new Map();

/**
 * Keep each fund lot's stored NAV and value in step with the live NAV, so
 * anything that reads the saved record (reports, offline start, the next
 * cold launch) shows the same value as the live screens. NAVs change once a
 * day, so this writes at most once per lot per day.
 */
const persistNavs = (uid, investments, live) => {
  investments.filter(isMutualFund).forEach((inv) => {
    const nav = live.navs?.[String(inv.schemeCode)];
    const units = lotUnits(inv);
    if (!inv.id || !nav || !(units > 0)) return;
    if (Math.abs((Number(inv.currentNAV) || 0) - nav) < 1e-4 || navWritten.get(inv.id) === nav) return;
    navWritten.set(inv.id, nav);
    updateInvestment(
      uid,
      inv.id,
      { currentNAV: nav, currentAmount: Math.round(units * nav * 100) / 100, navUpdatedAt: new Date().toISOString() },
      { notify: false }
    ).catch(() => navWritten.delete(inv.id));
  });
};

/**
 * Refresh prices (and the investment list when asked or stale).
 * @param {{ reload?: boolean, force?: boolean }} opts
 */
export const refreshPortfolio = async ({ reload = false, force = false } = {}) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return state;
  if (inflight) {
    queued = { reload: reload || !!queued?.reload, force: force || !!queued?.force };
    return inflight;
  }

  inflight = (async () => {
    try {
      let investments = state.investments;
      const userChanged = uid !== state.uid;
      if (reload || userChanged || !state.loaded || Date.now() - listLoadedAt > RELOAD_LIST_AFTER_MS * 30) {
        investments = await getInvestments(uid);
        listLoadedAt = Date.now();
      }
      const live = await getLivePrices(investments, { force });
      state = { uid, investments, live, loaded: true, updatedAt: new Date() };
      emit();
      persistNavs(uid, investments, live);
    } catch (e) {
      console.warn("Live portfolio refresh failed:", e?.message || e);
    } finally {
      inflight = null;
      if (queued) {
        const next = queued;
        queued = null;
        refreshPortfolio(next);
      }
    }
    return state;
  })();
  return inflight;
};

const schedule = () => {
  clearTimeout(timer);
  if (!subscribers.size) return;
  timer = setTimeout(async () => {
    if (AppState.currentState === "active") await refreshPortfolio({ force: true });
    schedule();
  }, isMarketOpen() ? OPEN_MS : CLOSED_MS);
};

const start = () => {
  refreshPortfolio().finally(schedule);
  appSub = AppState.addEventListener("change", (s) => {
    if (s === "active") refreshPortfolio({ force: true }).finally(schedule);
    else clearTimeout(timer);
  });
  // Buying, selling, adding or deleting anywhere reloads the list for everyone
  eventIds = ["portfolioChanged", "investmentAdded", "goalUpdated"].map((name) =>
    EventRegister.addEventListener(name, () => refreshPortfolio({ reload: true }))
  );
};

const stop = () => {
  clearTimeout(timer);
  timer = null;
  appSub?.remove();
  appSub = null;
  eventIds.forEach((id) => EventRegister.removeEventListener(id));
  eventIds = [];
};

/**
 * Subscribe a screen to the live portfolio. Re-prices on focus.
 * @returns {{ investments, live, loaded, updatedAt }}
 */
export const usePortfolioLive = () => {
  const [snap, setSnap] = useState(state);

  useEffect(() => {
    subscribers.add(setSnap);
    if (subscribers.size === 1) start();
    else setSnap(state);
    return () => {
      subscribers.delete(setSnap);
      if (!subscribers.size) stop();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPortfolio({ reload: Date.now() - listLoadedAt > RELOAD_LIST_AFTER_MS });
    }, [])
  );

  return snap;
};

// ── Goal helpers ────────────────────────────────────────────────────

export const FIRE_GOAL_ID = "firenumber";

export const isFireLinked = (inv) =>
  inv.goalId === FIRE_GOAL_ID || inv.goalName === "F.I.R.E Number" || inv.goalName === "FIRE Number";

/** Asset class keys shared by Wealth, F.I.R.E. and Goals. */
export const assetClassOf = (inv) => {
  if (isMutualFund(inv)) return "SIP/MF";
  if (isStock(inv)) return "Stock";
  if (isRecurring(inv)) return "RD";
  const t = String(inv.investmentType || "").toLowerCase();
  if (t.includes("fixed")) return "FD";
  if (t.includes("saving")) return "Savings";
  return "Other";
};

/**
 * Value a set of investments at live prices.
 * @returns {{ current, invested, dayChange, count, byClass: {[key]: number}, items: {inv, value}[] }}
 */
export const summarize = (investments, live) => {
  const out = { current: 0, invested: 0, dayChange: 0, count: 0, byClass: {}, items: [] };
  (investments || []).forEach((inv) => {
    const v = valueInvestment(inv, live);
    out.current += v.current;
    out.invested += v.invested;
    out.dayChange += v.dayChange;
    out.count += 1;
    const k = assetClassOf(inv);
    out.byClass[k] = (out.byClass[k] || 0) + v.current;
    out.items.push({ inv, value: v });
  });
  return out;
};

/**
 * Is this investment mapped to the goal? Matches the goal id, or — for older
 * records saved with only a goal name — the goal's name / custom name.
 */
export const isLinkedToGoal = (inv, goal) => {
  if (goal === FIRE_GOAL_ID || goal?.id === FIRE_GOAL_ID) return isFireLinked(inv);
  const id = typeof goal === "string" ? goal : goal?.id;
  if (id && inv.goalId === id) return true;
  if (typeof goal !== "object" || !inv.goalName || (inv.goalId && inv.goalId !== id && inv.goalId !== FIRE_GOAL_ID)) return false;
  if (isFireLinked(inv)) return false;
  const names = [goal.customName, goal.name, goal.description].filter(Boolean).map((n) => String(n).trim().toLowerCase());
  return names.includes(String(inv.goalName).trim().toLowerCase());
};

/** Live value of what is mapped to one goal (a goal object, its id, or FIRE_GOAL_ID). */
export const goalHoldings = (investments, live, goal) =>
  summarize((investments || []).filter((inv) => isLinkedToGoal(inv, goal)), live);
