// Pulse motion primitives — how content arrives, how waiting looks, and how
// figures settle. Tokens and Reduce Motion live in ../../ux/motion.js.
//
//   <FadeIn delay>          content rises 10px and fades in once, on mount
//   <Stagger>               FadeIn for each child, cascading (capped)
//   staggerDelay(i)         delay for list row i, or null past the first screenful
//   <CountUp value format>  a figure that counts to its value, then follows it
//   <ClockLoader label>     the LigthsON clock — hands sweep while we wait
//   <ScreenSkeleton>        whole-screen placeholder shaped like a Pulse screen
//   <SkeletonCard rows>     a card of placeholder rows for one section
//   useSlideOnChange(k, d)  slides content in from direction d when k changes
//   usePop(trigger)         a small scale bump when trigger changes
//   useShake()              [style, shake] — sideways shake for a rejected input

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Mono } from "./type";
import { Skeleton, SkeletonRows } from "./feedback";
import { P, themedStyles } from "../../theme/theme";
import { DURATION, EASE, STAGGER, entrancesQuiet, reduceMotion } from "../../ux/motion";

// ── Entrances ───────────────────────────────────────────────────────

/**
 * Fades its children in (and lifts them `offset` px) the first time it
 * mounts. Screens stay mounted between visits, so this plays once per
 * screen, not on every return. `style` is applied to the wrapper — pass
 * layout styles (flex: 1) here when the child relied on them.
 */
export const FadeIn = ({ delay = 0, offset = 10, duration = DURATION.base + 60, disabled, style, children, ...rest }) => {
  const skip = useRef(disabled || entrancesQuiet()).current;
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;

  useEffect(() => {
    if (skip) return undefined;
    const r = reduceMotion();
    const a = Animated.timing(v, {
      toValue: 1,
      duration: r ? DURATION.quick : duration,
      delay: r ? 0 : delay,
      easing: EASE.out,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, []);

  const move = !skip && offset && !reduceMotion();
  return (
    <Animated.View
      style={[
        style,
        { opacity: v },
        move && { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }] },
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Wraps each child in FadeIn so a group arrives as a cascade. The cascade
 * is capped (STAGGER.max) so long lists never keep the user waiting.
 * Don't put components that can render null inside — their empty wrapper
 * would still take up a `gap` slot.
 */
export const Stagger = ({ children, step = STAGGER.step, max = STAGGER.max, delay = 0, offset }) => {
  let i = 0;
  return React.Children.map(children, (c) =>
    c === null || c === undefined || c === false ? c : (
      <FadeIn delay={delay + Math.min(i++, max) * step} offset={offset}>
        {c}
      </FadeIn>
    ),
  );
};

/**
 * Entrance delay for row `index` of a list: rows in the first screenful
 * cascade in; rows that mount later (scrolling) just appear.
 * <FadeIn delay={staggerDelay(i)} disabled={staggerDelay(i) === null}>
 */
export const staggerDelay = (index, base = 0) =>
  index < STAGGER.max + 2 ? base + Math.min(index, STAGGER.max) * (STAGGER.step - 10) : null;

/** FadeIn for a list row — cascades the first screenful, plain afterwards. */
export const RowIn = ({ index = 0, delay = 0, children, style }) => {
  const d = staggerDelay(index, delay);
  return (
    <FadeIn delay={d || 0} disabled={d === null} offset={6} style={style}>
      {children}
    </FadeIn>
  );
};

// ── Figures ─────────────────────────────────────────────────────────

// Last value shown per CountUp `id`, so a remount (theme switch, returning
// to a screen) continues from where the number was instead of from zero.
const lastShown = new Map();

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

/**
 * A number that counts to `value` when it first arrives and glides to new
 * values afterwards (live prices, a saved transaction). Renders with
 * `component` (default Mono) and passes the rest of the props through.
 * Screen readers get the final value only.
 */
export const CountUp = ({ value, format = (v) => String(Math.round(v)), id, duration, component: C = Mono, ...rest }) => {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const start = id && lastShown.has(id) ? lastShown.get(id) : reduceMotion() ? target : 0;
  const [shown, setShown] = useState(start);
  const cur = useRef(start);
  const first = useRef(!(id && lastShown.has(id)));

  useEffect(() => {
    const from = cur.current;
    const isFirst = first.current;
    first.current = false;
    if (reduceMotion() || from === target) {
      cur.current = target;
      setShown(target);
      if (id) lastShown.set(id, target);
      return undefined;
    }
    const d = duration ?? (isFirst ? DURATION.focal : DURATION.layout + 120);
    let raf;
    let t0;
    const step = (t) => {
      if (t0 === undefined) t0 = t;
      const p = Math.min(1, (t - t0) / d);
      cur.current = from + (target - from) * easeOutQuart(p);
      setShown(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
      else if (id) lastShown.set(id, target);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (id) lastShown.set(id, cur.current);
    };
  }, [target]);

  return (
    <C accessibilityLabel={format(target)} {...rest}>
      {format(shown)}
    </C>
  );
};

// ── Waiting ─────────────────────────────────────────────────────────

/**
 * The brand clock as a loader: the "O" of LigthsON with its hands sweeping.
 * Use for waits with no layout to sketch (generating a report, loading
 * the fund list, reading an invoice). Pass `fill` to centre it in the
 * available space. Content with a known shape should use skeletons.
 */
export const ClockLoader = ({ size = 44, label, sub, fill, style }) => {
  const minute = useRef(new Animated.Value(0)).current;
  const hour = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.parallel([
      Animated.loop(Animated.timing(minute, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(hour, { toValue: 1, duration: 1400 * 12, easing: Easing.linear, useNativeDriver: true })),
    ]);
    loop.start();
    return () => loop.stop();
  }, []);

  const stroke = Math.max(3, size * 0.1);
  const r = size / 2 - stroke / 2;
  const hand = (len, w) => ({
    position: "absolute",
    left: size / 2 - w / 2,
    top: size / 2 - len,
    width: w,
    height: len + w / 2,
    borderRadius: w / 2,
    backgroundColor: P.ink,
  });
  const spin = (v, fromDeg) => ({
    transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${fromDeg}deg`, `${fromDeg + 360}deg`] }) }],
  });

  return (
    <View
      style={[fill ? m.fill : m.inline, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label || "Loading"}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.ink} strokeWidth={stroke} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, spin(hour, 0)]}>
          <View style={hand(size * 0.26, stroke * 0.9)} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, spin(minute, 60)]}>
          <View style={hand(size * 0.34, stroke * 0.9)} />
        </Animated.View>
        <View
          style={{
            position: "absolute",
            left: size / 2 - stroke * 0.8,
            top: size / 2 - stroke * 0.8,
            width: stroke * 1.6,
            height: stroke * 1.6,
            borderRadius: stroke,
            backgroundColor: P.accTx,
          }}
        />
      </View>
      {label ? <Text style={m.label}>{label}</Text> : null}
      {sub ? <Text style={m.sub}>{sub}</Text> : null}
    </View>
  );
};

/** A Pulse card of placeholder rows — one section still loading. */
export const SkeletonCard = ({ rows = 3, style }) => (
  <View style={[m.card, { paddingHorizontal: 14, paddingVertical: 2 }, style]}>
    <SkeletonRows count={rows} />
  </View>
);

/**
 * Whole-screen placeholder: a hero figure card and a list card, the shape
 * most Pulse screens take. `header` adds a title block for screens that
 * render their own header; `safe` pads below the status bar when the
 * skeleton replaces the whole screen.
 */
export const ScreenSkeleton = ({ rows = 4, header = false, safe = false, style }) => {
  const insets = useSafeAreaInsets();
  return (
  <View
    style={[m.screen, safe && { paddingTop: insets.top + 14 }, style]}
    accessibilityLabel="Loading"
    accessible
  >
    {header ? (
      <View style={{ gap: 8, paddingBottom: 4 }}>
        <Skeleton width={90} height={10} />
        <Skeleton width="55%" height={26} radius={8} />
      </View>
    ) : null}
    <View style={[m.card, { padding: 18, gap: 12 }]}>
      <Skeleton width="34%" height={10} />
      <Skeleton width="62%" height={36} radius={10} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Skeleton width="30%" height={14} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="30%" height={14} />
      </View>
    </View>
    <SkeletonCard rows={rows} />
  </View>
  );
};

// ── Reactions ───────────────────────────────────────────────────────

/**
 * Slides content in from the side when `key` changes — months on the Home
 * calendar, days in the Day view. `direction` is +1 when moving forward in
 * time (content enters from the right) and -1 when going back.
 */
export const useSlideOnChange = (key, direction = 1) => {
  const x = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(1)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const r = reduceMotion();
    x.setValue(r ? 0 : 28 * (direction >= 0 ? 1 : -1));
    o.setValue(r ? 0.4 : 0.15);
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: DURATION.base, easing: EASE.out, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: DURATION.base, easing: EASE.out, useNativeDriver: true }),
    ]).start();
  }, [key]);

  return { opacity: o, transform: [{ translateX: x }] };
};

/**
 * Scale bump (1 → 1.18 → 1) whenever `trigger` changes. Changes away from
 * null/undefined (the value arriving for the first time) don't pop — pass
 * null until the real value has loaded.
 */
export const usePop = (trigger, amount = 1.18) => {
  const s = useRef(new Animated.Value(1)).current;
  const prev = useRef(trigger);
  useEffect(() => {
    const was = prev.current;
    prev.current = trigger;
    if (was === null || was === undefined || was === trigger) return;
    if (reduceMotion()) return;
    s.setValue(1);
    Animated.sequence([
      Animated.timing(s, { toValue: amount, duration: DURATION.tap, easing: EASE.out, useNativeDriver: true }),
      Animated.spring(s, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [trigger]);
  return { transform: [{ scale: s }] };
};

/** const [shakeStyle, shake] = useShake(); call shake() when input is rejected. */
export const useShake = () => {
  const x = useRef(new Animated.Value(0)).current;
  const shake = () => {
    if (reduceMotion()) return;
    x.setValue(0);
    Animated.sequence(
      [-8, 8, -6, 6, -3, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: true })),
    ).start();
  };
  return [{ transform: [{ translateX: x }] }, shake];
};

const m = themedStyles(() =>
  StyleSheet.create({
    fill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    inline: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 28 },
    label: { fontSize: 14, fontWeight: "600", color: P.ink, textAlign: "center" },
    sub: { fontSize: 12, color: P.mute, textAlign: "center", marginTop: -6 },
    card: { backgroundColor: P.surf, borderWidth: 1, borderColor: P.line, borderRadius: 14 },
    screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 14, backgroundColor: P.bg },
  }),
);
