// Motion tokens and the Reduce Motion switch shared by every animation.
//
// Timing follows consequence: feedback is near-instant, state changes are
// short, overlays take a little longer, and only a figure settling on first
// load gets a deliberate beat. Exits are faster than entrances.
//
// When the OS asks for reduced motion, movement is dropped (no slides, no
// count-ups, no springs) and only short crossfades remain.

import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing, LayoutAnimation, Platform, UIManager } from "react-native";

export const DURATION = {
  tap: 120, // press feedback, icon pops
  quick: 180, // exits, small state changes
  base: 240, // entrances, crossfades, segment slides
  layout: 300, // rows appearing/disappearing, sheets
  focal: 700, // a figure counting up on first load
};

export const EASE = {
  // Confident arrival: fast start, long soft landing
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  // Leaving: accelerates away
  in: Easing.bezier(0.7, 0, 0.84, 0),
};

// Spring for things that follow a gesture or settle into place (sheets,
// segment pill). Critically damped enough that nothing wobbles.
export const SPRING = { stiffness: 260, damping: 28, mass: 1 };

// Stagger between sibling entrances, and the cap on the whole cascade.
export const STAGGER = { step: 45, max: 6 };

// ── Reduce Motion ───────────────────────────────────────────────────

let reduced = false;
const subs = new Set();
const set = (v) => {
  if (v === reduced) return;
  reduced = !!v;
  subs.forEach((fn) => fn(reduced));
};

AccessibilityInfo.isReduceMotionEnabled?.()
  .then(set)
  .catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", set);

/** Synchronous read for animation code that runs outside React. */
export const reduceMotion = () => reduced;

/** Re-renders when the user toggles Reduce Motion in system settings. */
export const useReducedMotion = () => {
  const [v, setV] = useState(reduced);
  useEffect(() => {
    setV(reduced);
    subs.add(setV);
    return () => subs.delete(setV);
  }, []);
  return v;
};

// ── Quiet window ────────────────────────────────────────────────────

// Switching theme remounts every screen. Entrances during that remount
// would replay the whole app's arrival, so they are skipped briefly.
let quietUntil = 0;
export const quietEntrances = (ms = 800) => {
  quietUntil = Date.now() + ms;
};
export const entrancesQuiet = () => Date.now() < quietUntil;

// ── Layout changes ──────────────────────────────────────────────────

// Old-architecture Android needs this flag for LayoutAnimation; Fabric
// supports it natively and warns if the flag is set.
if (Platform.OS === "android" && !global.nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const LAYOUT = {
  duration: DURATION.layout,
  create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity, duration: DURATION.base },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeIn, property: LayoutAnimation.Properties.opacity, duration: DURATION.quick },
};

/**
 * Call right before a state update that adds, removes or resizes rows
 * (deleting a transaction, undoing, dismissing a tip). Siblings glide
 * into their new places instead of jumping.
 */
export const animateLayout = () => {
  if (reduced || Platform.OS === "web") return;
  LayoutAnimation.configureNext(LAYOUT);
};
