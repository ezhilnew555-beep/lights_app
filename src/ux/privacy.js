// Privacy mode — hides every rupee amount (₹ ••••) for using the app in
// public. The money formatters in utils/format.js read it, so every screen
// is covered without per-screen work; the navigation tree remounts when it
// changes (like the theme) so figures already on screen update too.
// Stored on the device only.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import haptics from "./haptics";
import { quietEntrances } from "./motion";

const KEY = "ux.privacy";
let hidden = false;
const subs = new Set();

export const MASK = "••••";

export const amountsHidden = () => hidden;

export const loadPrivacyPreference = async () => {
  try {
    hidden = (await AsyncStorage.getItem(KEY)) === "on";
  } catch (e) {}
  return hidden;
};

export const setAmountsHidden = (v) => {
  const next = !!v;
  if (next === hidden) return;
  hidden = next;
  haptics.select();
  quietEntrances();
  AsyncStorage.setItem(KEY, next ? "on" : "off").catch(() => {});
  subs.forEach((fn) => fn(hidden));
};

export const toggleAmountsHidden = () => setAmountsHidden(!hidden);

/** Re-renders when privacy mode is switched. */
export const usePrivacy = () => {
  const [v, setV] = useState(hidden);
  useEffect(() => {
    setV(hidden);
    subs.add(setV);
    return () => subs.delete(setV);
  }, []);
  return v;
};
