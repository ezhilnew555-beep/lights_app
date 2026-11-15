// Celebrations — a short, one-time moment for real milestones (F.I.R.E.
// progress, a goal reached, a logging streak). Rendered by
// <CelebrationHost /> at the app root.
//
//   celebrate({ icon: "trophy", title: "Goal reached", message: "Home · ₹25L" })
//   celebrateOnce("goal.abc123", { ... })   — never shows the same key twice
//
// Keep these rare: routine saves get a toast, not a celebration.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccessibilityInfo } from "react-native";
import haptics from "./haptics";

const PREFIX = "ux.celebrated.";
let current = null;
const queue = [];
const subs = new Set();
let seq = 0;

const emit = () => subs.forEach((fn) => fn(current));

export const subscribeCelebration = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const currentCelebration = () => current;

const showNext = () => {
  current = queue.shift() || null;
  emit();
  if (current) {
    haptics.success();
    AccessibilityInfo.announceForAccessibility?.([current.title, current.message].filter(Boolean).join(". "));
  }
};

/** Show a celebration now (or after the one on screen). */
export const celebrate = ({ icon = "trophy", title, message, tone = "acc" }) => {
  queue.push({ id: ++seq, icon, title, message, tone });
  if (!current) showNext();
};

export const dismissCelebration = () => {
  if (current) showNext();
};

/** Records `key` as celebrated without showing anything. */
export const markCelebrated = (key) => AsyncStorage.setItem(PREFIX + key, "1").catch(() => {});

/** Celebrates once per `key`, ever (on this device). Resolves true if shown. */
export const celebrateOnce = async (key, payload) => {
  try {
    if (await AsyncStorage.getItem(PREFIX + key)) return false;
    await AsyncStorage.setItem(PREFIX + key, "1");
  } catch (e) {
    return false;
  }
  celebrate(payload);
  return true;
};
