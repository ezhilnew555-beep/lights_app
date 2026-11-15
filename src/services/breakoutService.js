// Breakout signals: reads the daily breakout_history snapshot and applies the
// coin unlock rule (≥ 10,000 coins, recorded once per trading day).

import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../config/FirebaseConfig";
import { getProfile, updateProfile } from "./firestoreService";

export const BREAKOUT_UNLOCK_COST = 10000;

const pctOf = (s) => parseFloat(String(s?.pct ?? "0").replace("%", "")) || 0;

/** Latest trading-date timestamp available (data lands after 5 PM IST). */
const latestSessionTimestamp = async () => {
  const now = new Date();
  const cutoff = new Date(now);
  if (now.getUTCHours() < 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() < 30)) {
    cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  }
  const maxTs = Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), cutoff.getUTCDate());

  const snap = await getDocs(
    query(collection(db, "breakout_history"), where("Date", "<=", maxTs), orderBy("Date", "desc"), limit(1))
  );
  if (!snap.empty) return snap.docs[0].data().Date;
  const fallback = await getDocs(query(collection(db, "breakout_history"), orderBy("Date", "desc"), limit(1)));
  return fallback.empty ? null : fallback.docs[0].data().Date;
};

/**
 * @returns {Promise<{ stocks: object[], sessionDate: Date|null, locked: boolean, coins: number }>}
 */
export const getBreakoutSignals = async (uid) => {
  const profile = await getProfile(uid);
  const coins = Number(profile?.coins || 0);

  const ts = await latestSessionTimestamp();
  if (!ts) return { stocks: [], sessionDate: null, locked: false, coins };

  const unlockedToday = profile?.lastBreakoutUnlock === ts.toString();
  if (coins < BREAKOUT_UNLOCK_COST && !unlockedToday) {
    return { stocks: [], sessionDate: new Date(ts), locked: true, coins };
  }
  if (!unlockedToday) {
    await updateProfile(uid, { lastBreakoutUnlock: ts.toString() });
  }

  const snap = await getDocs(query(collection(db, "breakout_history"), where("Date", "==", ts)));
  const stocks = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => pctOf(b) - pctOf(a));
  return { stocks, sessionDate: new Date(ts), locked: false, coins };
};
