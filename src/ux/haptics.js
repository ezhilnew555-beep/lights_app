// Haptic feedback — one vocabulary for the whole app.
//
//   tap()      light tick: tab switches, chips, segmented controls, steppers
//   select()   a choice was made: picking an option, changing month / day
//   success()  something was saved
//   warning()  input needs attention (validation)
//   error()    an action failed
//
// Uses React Native's Vibration so no native rebuild is needed. iOS ignores
// vibration durations (every call is a ~400 ms buzz), so on iOS only error()
// fires. Swap this file for expo-haptics later and every caller upgrades at
// once.
//
// Users can turn haptics off in Me → Settings; the choice is persisted.

import { Platform, Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ux.haptics";
const ANDROID = Platform.OS === "android";
const NATIVE = Platform.OS !== "web";

let enabled = true;
const listeners = new Set();

/** Load the saved preference. Called once at app start. */
export const loadHapticsPreference = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "off") enabled = false;
  } catch (e) {}
  return enabled;
};

export const hapticsEnabled = () => enabled;

export const setHapticsEnabled = (next) => {
  enabled = !!next;
  AsyncStorage.setItem(STORAGE_KEY, enabled ? "on" : "off").catch(() => {});
  listeners.forEach((fn) => fn(enabled));
  if (enabled) success();
};

export const subscribeHaptics = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const buzz = (pattern) => {
  if (!enabled || !NATIVE) return;
  try {
    Vibration.vibrate(pattern);
  } catch (e) {}
};

export const tap = () => ANDROID && buzz(8);
export const select = () => ANDROID && buzz(14);
export const success = () => ANDROID && buzz([0, 18, 70, 28]);
export const warning = () => ANDROID && buzz([0, 30, 60, 30]);
export const error = () => buzz(ANDROID ? [0, 40, 50, 40, 50, 40] : 400);

const haptics = { tap, select, success, warning, error };
export default haptics;
