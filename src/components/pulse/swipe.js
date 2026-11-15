// Swipe actions for transaction rows — the fast path for regulars. Tapping
// a row still opens the full ActionSheet, so nothing is swipe-only.
//
//   <SwipeRow onDelete onEdit onRepeat> <TxRow … /> </SwipeRow>
//   swipe left  → Delete (undoable)
//   swipe right → Edit · Again (log it again today)

import React, { useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Text } from "./Text";
import Icon from "./Icon";
import { P, themedStyles } from "../../theme/theme";
import haptics from "../../ux/haptics";

const ACTION_W = 76;

const Action = ({ icon, label, bg, fg, onPress, progress, from }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[sw.action, { backgroundColor: bg }]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Animated.View
      style={{
        alignItems: "center",
        gap: 3,
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1], extrapolate: "clamp" }) }],
        opacity: progress.interpolate({ inputRange: [0, from, 1], outputRange: [0, 0, 1], extrapolate: "clamp" }),
      }}
    >
      <Icon name={icon} size={18} color={fg} strokeWidth={2} />
      <Text style={[sw.label, { color: fg }]}>{label}</Text>
    </Animated.View>
  </TouchableOpacity>
);

export const SwipeRow = ({ children, onDelete, onEdit, onRepeat, enabled = true }) => {
  const ref = useRef(null);
  if (!enabled || (!onDelete && !onEdit && !onRepeat)) return children;

  // Close first so the row is back in place when the sheet / undo toast appears
  const run = (fn) => () => {
    ref.current?.close();
    haptics.tap();
    setTimeout(() => fn?.(), 120);
  };

  const left = onEdit || onRepeat
    ? (progress) => (
        <View style={sw.actions}>
          {onEdit ? <Action icon="edit" label="Edit" bg={P.ink} fg={P.bg} onPress={run(onEdit)} progress={progress} from={0.2} /> : null}
          {onRepeat ? (
            <Action icon="repeat" label="Again" bg={P.acc} fg={P.accInk} onPress={run(onRepeat)} progress={progress} from={0.5} />
          ) : null}
        </View>
      )
    : undefined;

  const right = onDelete
    ? (progress) => (
        <View style={sw.actions}>
          <Action icon="trash" label="Delete" bg={P.neg} fg="#FFFFFF" onPress={run(onDelete)} progress={progress} from={0.2} />
        </View>
      )
    : undefined;

  return (
    <Swipeable
      ref={ref}
      friction={1.6}
      leftThreshold={ACTION_W * 0.6}
      rightThreshold={ACTION_W * 0.6}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={left}
      renderRightActions={right}
      onSwipeableWillOpen={() => haptics.select()}
      childrenContainerStyle={{ backgroundColor: P.surf }}
    >
      {children}
    </Swipeable>
  );
};

const sw = themedStyles(() =>
  StyleSheet.create({
    actions: { flexDirection: "row" },
    action: { width: ACTION_W, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 11, fontWeight: "600" },
  }),
);
