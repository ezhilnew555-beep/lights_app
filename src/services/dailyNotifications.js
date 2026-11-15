/**
 * dailyNotifications.js
 * The two daily notifications, scheduled on the device at exact IST times:
 *   06:00 IST  a motivation quote — random, never repeated until all 800 are used
 *   21:00 IST  a daily check — says whether the user logged anything today
 *
 * These used to be pushed from a GitHub Actions cron, which GitHub runs late
 * (often 10–60 min) or skips under load. Local notifications fire from the
 * phone's alarm manager instead, so they arrive on time even offline.
 *
 * A rolling window of DAYS_AHEAD days is scheduled and re-synced on sign-in,
 * whenever the app comes to the foreground, and when the user logs an entry.
 */
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  collection,
  getCountFromServer,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../config/FirebaseConfig";
import { quotes } from "../data/motivationQuotes";
import { readLocal } from "./offlineStore";

const CHANNEL_ID = "daily";
const STATE_KEY = "dailyNotifications.v1";
const KINDS = ["dailyMotivation", "dailyCheck"];
// iOS keeps at most 64 pending notifications; two a day for 21 days leaves room.
const DAYS_AHEAD = 21;
const IST_OFFSET_MS = 330 * 60 * 1000;
const MORNING = { hour: 6, minute: 0 };
const EVENING = { hour: 21, minute: 0 };
const RESYNC_AFTER_MS = 12 * 60 * 60 * 1000;

// ── IST calendar helpers ────────────────────────────────────────────

/** "2026-09-26" — the calendar date in India for an instant. */
export const istDateKey = (date = new Date()) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** The instant at which it is hour:minute IST on dateKey (device timezone agnostic). */
const istInstant = (dateKey, { hour, minute }) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - IST_OFFSET_MS);
};

const addDays = (dateKey, days) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// ── Non-repeating quote deck ────────────────────────────────────────

const shuffledDeck = (avoidFirst) => {
  const deck = quotes.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  // Don't start a new cycle with the quote that ended the last one.
  if (deck.length > 1 && deck[deck.length - 1] === avoidFirst) {
    [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
  }
  return deck;
};

const loadState = async () => {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.deck) && parsed.assigned) return parsed;
  } catch (e) {}
  return { deck: [], assigned: {}, lastQuote: null };
};

const saveState = (state) => AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => {});

/** Quote index for a day; each day keeps its quote across re-syncs. */
const quoteFor = (state, dateKey) => {
  if (Number.isInteger(state.assigned[dateKey])) return state.assigned[dateKey];
  if (state.deck.length === 0) state.deck = shuffledDeck(state.lastQuote);
  const index = state.deck.pop();
  state.assigned[dateKey] = index;
  state.lastQuote = index;
  return index;
};

// ── Today's entries ─────────────────────────────────────────────────

/** Income, expense and investment entries the user created today (IST). */
const countEntriesToday = async (uid) => {
  const since = Timestamp.fromDate(istInstant(istDateKey(), { hour: 0, minute: 0 }));
  const counts = await Promise.all(
    ["transactions", "investments"].map(async (name) => {
      // The phone copy includes entries made offline that haven't synced yet
      const local = await readLocal(uid, name).catch(() => null);
      if (local) return local.filter((d) => d.createdAt?.toMillis && d.createdAt.toMillis() >= since.toMillis()).length;
      const snap = await getCountFromServer(query(collection(db, "users", uid, name), where("createdAt", ">=", since)));
      return snap.data().count;
    })
  );
  return counts.reduce((sum, n) => sum + n, 0);
};

const eveningContent = (entriesToday) =>
  entriesToday > 0
    ? {
        title: "Today is logged ✅",
        body: `You recorded ${entriesToday} ${entriesToday === 1 ? "entry" : "entries"} today. Nice work keeping your money on track!`,
      }
    : {
        title: "You haven't logged anything today",
        body: "Take a minute to add today's income and expenses before the day ends.",
      };

// ── Scheduling ──────────────────────────────────────────────────────

const ensureChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Daily motivation & check-in",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
};

const cancelOurs = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => KINDS.includes(n.content?.data?.kind))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
};

const schedule = (content, date) =>
  Notifications.scheduleNotificationAsync({
    content: { sound: true, ...content },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
  });

let syncing = Promise.resolve();

/**
 * (Re)schedule the next DAYS_AHEAD days of 6 AM and 9 PM notifications.
 * @param {{ entriesToday?: number }} [options] pass a known count to skip the Firestore lookup
 */
export const syncDailyNotifications = (options = {}) => {
  // Serialise syncs so two callers never interleave cancel/schedule.
  syncing = syncing.then(() => doSync(options)).catch((error) => {
    console.warn("Daily notifications sync failed:", error?.message || error);
  });
  return syncing;
};

const doSync = async ({ entriesToday } = {}) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await ensureChannel();

  let todayCount = entriesToday;
  if (!Number.isFinite(todayCount)) {
    try {
      todayCount = await countEntriesToday(uid);
    } catch (e) {
      todayCount = 0; // offline: fall back to the reminder wording
    }
  }

  const state = await loadState();
  const today = istDateKey();
  const now = Date.now();

  // Foregrounding the app re-syncs; skip when nothing changed recently.
  const syncKey = `${uid}:${today}:${todayCount > 0 ? todayCount : 0}`;
  if (state.syncKey === syncKey && now - (state.syncedAt || 0) < RESYNC_AFTER_MS) return;

  // Forget quotes for days that have passed; the deck already excludes them.
  Object.keys(state.assigned).forEach((k) => {
    if (k < today) delete state.assigned[k];
  });

  await cancelOurs();

  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const dateKey = addDays(today, i);

    const morning = istInstant(dateKey, MORNING);
    if (morning.getTime() > now) {
      const quote = quotes[quoteFor(state, dateKey)];
      await schedule(
        { title: "Good morning ☀️", body: quote, data: { kind: "dailyMotivation", date: dateKey } },
        morning
      );
    }

    const evening = istInstant(dateKey, EVENING);
    if (evening.getTime() > now) {
      await schedule(
        { ...eveningContent(i === 0 ? todayCount : 0), data: { kind: "dailyCheck", date: dateKey } },
        evening
      );
    }
  }

  state.syncKey = syncKey;
  state.syncedAt = now;
  await saveState(state);
};

/** Call after the user saves an income, expense or investment. */
export const notifyEntryLogged = () => syncDailyNotifications();

/** Remove the daily notifications (on sign-out). */
export const cancelDailyNotifications = () => {
  syncing = syncing
    .then(async () => {
      await cancelOurs();
      const state = await loadState();
      await saveState({ ...state, syncKey: null, syncedAt: 0 });
    })
    .catch(() => {});
  return syncing;
};
