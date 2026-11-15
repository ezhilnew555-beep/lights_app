// Toasts — the app's non-blocking feedback channel.
//
// Replaces "Success" / "Error" Alert dialogs: the message appears above the
// dock, the user keeps working, and it leaves on its own. One toast at a
// time; a new one replaces the current (which counts as it timing out, so a
// pending undo commits).
//
//   toast.success("Expense saved")
//   toast.error("Couldn't save", { title: "Network" })
//   toast.show({ kind: "coin", message: "+5 coins", action: { label: "View", onPress } })
//   withUndo({ message: "Deleted", apply, revert, commit })   — see undo below
//
// Rendering lives in <ToastHost /> (components/pulse/ToastHost.js).

import { AccessibilityInfo } from "react-native";
import haptics from "./haptics";
import { animateLayout } from "./motion";
import { reportNetworkError } from "./connectivity";

let current = null;
let seq = 0;
let timer = null;
const subs = new Set();

const emit = () => subs.forEach((fn) => fn(current));

export const subscribeToast = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const currentToast = () => current;

const DEFAULT_MS = { success: 2600, info: 2800, coin: 3200, warning: 3600, error: 4500 };

const close = (reason) => {
  const c = current;
  if (!c) return;
  current = null;
  clearTimeout(timer);
  emit();
  try {
    c.onClose?.(reason);
  } catch (e) {
    console.warn("toast onClose failed", e);
  }
};

/**
 * Show a toast.
 * @param {object} o
 * @param {"success"|"error"|"warning"|"info"|"coin"} [o.kind="info"]
 * @param {string} [o.title]       bold first line (optional)
 * @param {string} o.message
 * @param {{label: string, onPress: () => void}} [o.action]
 * @param {number} [o.duration]    ms; 0 keeps it until dismissed
 * @param {(reason: "timeout"|"action"|"dismiss"|"replaced"|"background") => void} [o.onClose]
 * @param {boolean} [o.haptic=true]
 * @returns {number} id
 */
export const show = (o) => {
  if (current) close("replaced");
  const kind = o.kind || "info";
  const message = String(o.message || "");
  const base = o.action ? 5000 : DEFAULT_MS[kind] || 2800;
  const duration = o.duration ?? base + Math.max(0, message.length - 60) * 35;
  current = { ...o, id: ++seq, kind, message };

  if (o.haptic !== false) {
    if (kind === "success" || kind === "coin") haptics.success();
    else if (kind === "warning") haptics.warning();
    else if (kind === "error") haptics.error();
  }
  AccessibilityInfo.announceForAccessibility?.([o.title, message].filter(Boolean).join(". "));

  emit();
  if (duration > 0) {
    const id = current.id;
    timer = setTimeout(() => current?.id === id && close("timeout"), duration);
  }
  return current.id;
};

/** Close the toast with `id` (or whichever is showing). */
export const dismiss = (id, reason = "dismiss") => {
  if (current && (id == null || current.id === id)) close(reason);
};

/** Called by the host when its action button is pressed. */
export const runAction = () => {
  const c = current;
  if (!c?.action) return;
  current = null;
  clearTimeout(timer);
  emit();
  haptics.tap();
  try {
    c.action.onPress?.();
  } finally {
    c.onClose?.("action");
  }
};

const kindOf =
  (kind) =>
  (message, opts = {}) =>
    show({ ...opts, kind, message });

export const toast = {
  show,
  dismiss,
  success: kindOf("success"),
  error: kindOf("error"),
  warning: kindOf("warning"),
  info: kindOf("info"),
  coin: kindOf("coin"),
};

/**
 * Undoable destructive action. The change is applied to the UI at once and
 * only committed to the server once the undo window closes, so "Undo" never
 * has to re-create records (and never re-awards coins).
 *
 *   withUndo({
 *     message: "Groceries deleted",
 *     apply:  () => setRows(r => r.filter(x => x.id !== id)),   // optimistic
 *     revert: () => setRows(before),                              // undo / failure
 *     commit: () => deleteTransaction(uid, id),                   // server write
 *   })
 */
export const withUndo = ({ message, title, apply, revert, commit, failMessage, duration = 5000 }) => {
  // The row leaves (and comes back on undo) with its neighbours gliding
  // into place rather than jumping
  const undo = () => {
    animateLayout();
    revert?.();
  };
  animateLayout();
  apply?.();
  haptics.select();
  return show({
    kind: "info",
    title,
    message,
    duration,
    haptic: false,
    action: { label: "Undo", onPress: undo },
    onClose: async (reason) => {
      if (reason === "action") return;
      try {
        await commit?.();
      } catch (e) {
        console.warn("withUndo commit failed", e);
        undo();
        toast.error(failMessage || friendlyError(e, "Couldn't finish that. It has been restored."));
      }
    },
  });
};

/**
 * Human copy for an error. Network and permission failures get specific
 * wording; anything else uses `fallback` (never a raw stack or Firebase code).
 */
export const friendlyError = (err, fallback = "Something went wrong. Please try again.") => {
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  if (/network|unavailable|offline|timeout|failed to fetch|deadline-exceeded/i.test(code + " " + msg)) {
    reportNetworkError();
    return "You seem to be offline. Check your connection and try again.";
  }
  if (/permission-denied|unauthenticated/i.test(code)) {
    return "Your session has expired. Please sign in again.";
  }
  if (/resource-exhausted|too-many-requests/i.test(code)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return fallback;
};

export default toast;
