/**
 * secureFunctions.js
 * Calls to Cloud Functions for anything that touches coins or other users'
 * data. The app is not allowed to write these directly (see firestore.rules).
 */
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../config/FirebaseConfig";
import { isOnline, onConnectivityChange } from "../ux/connectivity";

const call = async (name, payload = {}) => {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
};

/** Calendar date in India (UTC+5:30), matching the server's istDate(). */
const istDate = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Errors that mean the backend cannot serve the call right now (function not
// deployed, offline, cold-start timeout). Retrying on every focus only spams
// the log, so these are reported once and retried on the next app launch.
const UNREACHABLE = new Set([
  "functions/not-found",
  "functions/unavailable",
  "functions/deadline-exceeded",
  "functions/internal",
]);

let checkIn = { key: null, promise: null };
let unreachable = false;

// An app opened offline must still get today's check-in once it reconnects
onConnectivityChange((online) => {
  if (online) unreachable = false;
});

/**
 * Daily +5 coins and the inactivity penalty. Safe to call on every app open:
 * repeat calls for the same user and IST day share one server request, and
 * only the first caller sees the award (so the reward popup shows once).
 * Resolves to null when the check-in service cannot be reached.
 */
export const dailyCheckIn = () => {
  if (unreachable || !isOnline()) return Promise.resolve(null);
  const key = `${auth.currentUser?.uid || ""}:${istDate()}`;

  if (checkIn.key === key && checkIn.promise) {
    return checkIn.promise.then((r) => (r ? { ...r, awarded: 0, penalty: 0, missedDays: 0 } : r));
  }

  const promise = call("dailyCheckIn").catch((error) => {
    if (UNREACHABLE.has(error?.code)) {
      unreachable = true;
      console.warn(
        `Daily check-in unavailable (${error.code}). Deploy Cloud Functions: firebase deploy --only functions`
      );
      return null;
    }
    // Let the next focus retry other failures (e.g. auth not ready yet).
    if (checkIn.promise === promise) checkIn = { key: null, promise: null };
    throw error;
  });
  checkIn = { key, promise };
  return promise;
};

/** Deducts coins and files a reward claim atomically on the server. */
export const requestPremiumReward = (rewardKey) => call("requestPremiumReward", { rewardKey });

/** Resolves a username to its sign-in email without exposing the users collection. */
export const lookupLoginEmail = async (userName) => {
  const { email } = await call("lookupLoginEmail", { userName });
  return email;
};
