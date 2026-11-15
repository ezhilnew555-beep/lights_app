/**
 * appLock.js
 * App lock that reuses the phone's own screen lock: fingerprint / face, or the
 * device PIN, pattern or password as a fallback. The app never sees or stores
 * the credential — the OS checks it and just tells us pass/fail.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let LocalAuthModule = null;
const getLocalAuth = () => {
  if (LocalAuthModule !== null) return LocalAuthModule;
  if (Platform.OS === "web") {
    LocalAuthModule = false;
    return false;
  }
  try {
    LocalAuthModule = require("expo-local-authentication");
    return LocalAuthModule;
  } catch (err) {
    console.warn("expo-local-authentication native module not available in this build:", err?.message || err);
    LocalAuthModule = false;
    return false;
  }
};

const ENABLED_KEY = "appLockEnabled";

// Re-lock only after the app has been in the background this long, so quick
// trips to the share sheet or a file picker don't ask again.
export const LOCK_AFTER_MS = 30 * 1000;

export const isAppLockEnabled = async () => {
  if (Platform.OS === "web") return false;
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) return false;
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === "true";
  } catch {
    return false;
  }
};

export const setAppLockEnabled = (enabled) => AsyncStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");

/** True when the phone has a screen lock (PIN/pattern/password or biometrics) set up. */
export const hasDeviceLock = async () => {
  if (Platform.OS === "web") return false;
  const LocalAuth = getLocalAuth();
  if (!LocalAuth || typeof LocalAuth.getEnrolledLevelAsync !== "function") return false;
  try {
    const level = await LocalAuth.getEnrolledLevelAsync();
    return level !== (LocalAuth.SecurityLevel?.NONE ?? 0);
  } catch {
    return false;
  }
};

/** Shows the system unlock prompt. Resolves true when the user passes. */
export const authenticate = async (promptMessage = "Unlock LigthsON") => {
  if (Platform.OS === "web") return true;
  const LocalAuth = getLocalAuth();
  if (!LocalAuth || typeof LocalAuth.authenticateAsync !== "function") {
    return true;
  }
  try {
    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // allow the phone's PIN / pattern / password
    });
    return !!result?.success;
  } catch (err) {
    console.warn("Authentication error:", err);
    return false;
  }
};

