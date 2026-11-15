// Horizontal swipe to move through time — the same gesture on the Home
// calendar (months) and the Day view (days). Vertical scrolling is left
// alone: the swipe only claims clearly sideways drags.

import { useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import haptics from "./haptics";

const CLAIM = 18; // px of sideways travel before the swipe takes over
const TRIGGER = 56; // px (or a quick flick) to count as a swipe

/**
 * const swipe = useSwipe({ onNext, onPrev });
 * <View {...swipe.panHandlers}>…</View>
 * Swiping left calls onNext (later in time), right calls onPrev.
 */
export const useSwipe = ({ onNext, onPrev }) => {
  const latest = useRef({ onNext, onPrev });
  latest.current = { onNext, onPrev };

  return useMemo(() => {
    const sideways = (_, g) => Math.abs(g.dx) > CLAIM && Math.abs(g.dx) > Math.abs(g.dy) * 1.6;
    return PanResponder.create({
      // Capture too, so a drag that starts on a day cell still swipes
      onMoveShouldSetPanResponderCapture: sideways,
      onMoveShouldSetPanResponder: sideways,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        const fast = Math.abs(g.vx) > 0.5;
        if (g.dx <= -TRIGGER || (fast && g.dx < 0)) {
          haptics.select();
          latest.current.onNext?.();
        } else if (g.dx >= TRIGGER || (fast && g.dx > 0)) {
          haptics.select();
          latest.current.onPrev?.();
        }
      },
    });
  }, []);
};

export default useSwipe;
