// Pulse feedback primitives — how the app responds to a touch and fills
// the wait while data loads.
//
//   <Press>           drop-in for TouchableOpacity that also scales on press
//   <Skeleton>        placeholder block that pulses while content loads
//   <SkeletonRows>    placeholder transaction rows
//   <Tip>             one-time contextual tip; disappears once learned
//   <ActionSheet>     Pulse list of actions (Edit · Delete …) for a row

import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "./Text";
import Icon from "./Icon";
import { Sheet } from "./forms";
import { P, themedStyles } from "../../theme/theme";
import haptics from "../../ux/haptics";
import { DURATION, EASE, animateLayout, reduceMotion } from "../../ux/motion";

// ── Press ───────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Touchable that eases down to `scaleTo` while held and springs back on
 * release. `haptic` names a ../../ux/haptics cue fired on press ("tap",
 * "select"); leave it off for plain navigation.
 */
export const Press = forwardRef(function Press(
  { style, scaleTo = 0.97, activeOpacity = 1, haptic, onPress, onPressIn, onPressOut, disabled, children, ...rest },
  ref,
) {
  const scale = useRef(new Animated.Value(1)).current;
  const flat = StyleSheet.flatten(style) || {};
  const baseOpacity = flat.opacity ?? 1;
  const [held, setHeld] = useState(false);

  const to = (v, bounce) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: bounce ? 28 : 60,
      bounciness: bounce ? 6 : 0,
    }).start();

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(e) => {
        setHeld(true);
        to(scaleTo, false);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setHeld(false);
        to(1, true);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]?.();
        onPress?.(e);
      }}
      style={[
        style,
        {
          opacity: held ? baseOpacity * activeOpacity : baseOpacity,
          transform: [...(flat.transform || []), { scale }],
        },
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

// ── Skeleton ────────────────────────────────────────────────────────

// One shared pulse keeps every placeholder on screen breathing in sync.
const pulse = new Animated.Value(0);
let pulseUsers = 0;
let pulseLoop = null;
const startPulse = () => {
  if (pulseUsers++ > 0) return;
  pulseLoop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]),
  );
  pulseLoop.start();
};
const stopPulse = () => {
  if (--pulseUsers > 0) return;
  pulseLoop?.stop();
  pulseLoop = null;
};

export const Skeleton = ({ width = "100%", height = 14, radius = 6, style }) => {
  useEffect(() => {
    startPulse();
    return stopPulse;
  }, []);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: P.skeleton },
        { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        style,
      ]}
    />
  );
};

/** Placeholder shaped like TxRow — initial tile, two lines, amount. */
export const SkeletonRows = ({ count = 3 }) => (
  <View accessibilityLabel="Loading" accessible>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={[fx.skRow, i === count - 1 && { borderBottomWidth: 0 }]}>
        <Skeleton width={38} height={38} radius={10} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width={`${62 - i * 9}%`} height={13} />
          <Skeleton width={`${38 + i * 6}%`} height={10} />
        </View>
        <Skeleton width={64} height={14} />
      </View>
    ))}
  </View>
);

// ── Tip (progressive, one-time hints) ──────────────────────────────

const TIP_PREFIX = "ux.tip.";
const MAX_VIEWS = 4; // a tip retires itself after this many screen visits
const learned = new Set();
const tipSubs = new Set();

/** Mark a tip as learned — call it when the user performs the gesture it teaches. */
export const markLearned = (id) => {
  if (learned.has(id)) return;
  learned.add(id);
  AsyncStorage.setItem(TIP_PREFIX + id, "done").catch(() => {});
  tipSubs.forEach((fn) => fn(id));
};

/**
 * Contextual tip shown until the user dismisses it, performs the action
 * (markLearned), or has seen it MAX_VIEWS times. New users get guidance;
 * regulars never see it again.
 */
export const Tip = ({ id, icon = "info", children, style }) => {
  const [visible, setVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  // Arrives gently once storage says it's due; on dismissal the content
  // below glides up into its place instead of jumping.
  useEffect(() => {
    if (!visible) return;
    Animated.timing(fade, {
      toValue: 1,
      duration: DURATION.base,
      delay: reduceMotion() ? 0 : DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  const hide = () => {
    animateLayout();
    setVisible(false);
  };

  useEffect(() => {
    let alive = true;
    if (learned.has(id)) return undefined;
    AsyncStorage.getItem(TIP_PREFIX + id)
      .then((v) => {
        if (!alive) return;
        if (v === "done") return learned.add(id);
        const views = (parseInt(v, 10) || 0) + 1;
        if (views > MAX_VIEWS) return markLearned(id);
        AsyncStorage.setItem(TIP_PREFIX + id, String(views)).catch(() => {});
        animateLayout();
        setVisible(true);
      })
      .catch(() => {});
    const unsub = (() => {
      const fn = (done) => done === id && hide();
      tipSubs.add(fn);
      return () => tipSubs.delete(fn);
    })();
    return () => {
      alive = false;
      unsub();
    };
  }, [id]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[
        fx.tip,
        style,
        {
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
      accessibilityRole="text"
    >
      <Icon name={icon} size={16} color={P.accTx} />
      <Text style={fx.tipText}>{children}</Text>
      <TouchableOpacity
        onPress={() => {
          haptics.tap();
          markLearned(id);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Got it, hide this tip"
      >
        <Icon name="close" size={14} color={P.mute} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── ActionSheet ─────────────────────────────────────────────────────

/**
 * actions: [{ label, icon, onPress, destructive, sub }]
 * Closes, then runs the action once the sheet has left, so follow-up
 * sheets and toasts open on a clear screen (iOS can't present a modal
 * over one that is still dismissing).
 */
export const ActionSheet = ({ visible, onClose, overline, title, actions = [] }) => {
  const pending = useRef(null);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onHidden={() => {
        const run = pending.current;
        pending.current = null;
        run?.();
      }}
      overline={overline}
      title={title}
    >
      <View style={fx.actions}>
        {actions.filter(Boolean).map((a, i, all) => (
          <Press
            key={a.label}
            scaleTo={0.985}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              pending.current = a.onPress || null;
              onClose?.();
            }}
            style={[fx.action, i === all.length - 1 && { borderBottomWidth: 0 }]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={[fx.actionIcon, a.destructive && { backgroundColor: P.negSoft }]}>
              <Icon name={a.icon || "chevron"} size={18} color={a.destructive ? P.neg : P.ink} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[fx.actionText, a.destructive && { color: P.neg }]}>{a.label}</Text>
              {a.sub ? <Text style={fx.actionSub}>{a.sub}</Text> : null}
            </View>
          </Press>
        ))}
      </View>
    </Sheet>
  );
};

const fx = themedStyles(() =>
  StyleSheet.create({
    skRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    tip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: P.accSoft,
      borderWidth: 1,
      borderColor: P.line,
    },
    tipText: { flex: 1, fontSize: 13, lineHeight: 18, color: P.ink },
    actions: { backgroundColor: P.surf, borderRadius: 14, borderWidth: 1, borderColor: P.line, paddingHorizontal: 14 },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: P.surf2,
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: { fontSize: 15, fontWeight: "600", color: P.ink },
    actionSub: { fontSize: 12, color: P.mute },
  }),
);
