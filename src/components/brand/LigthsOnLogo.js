// LigthsON brand mark — "ON": the O is a clock (time in the market), the N
// ends in a rising arrow (growth). Artwork from assets/ligthson-app-icon.svg.
//
//   <LigthsOnGlyph width={120} />          lime artwork only
//   <LigthsOnMark size={36} />             rounded dark app tile with the artwork
//   <AnimatedLigthsOnLogo width={188} />   launch animation (see AppLoader)

import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Path, G, Rect } from "react-native-svg";

export const BRAND = {
  lime: "#C6F432",
  ink: "#0A0C0B",
};

// Artwork coordinate system (from the source SVG)
// Includes the ring stroke (r 43 + 8) so nothing is clipped: x −1…211, y −31…101
const VB = { x: -1, y: -31, w: 212, h: 132 };
const CLOCK = { cx: 50, cy: 50, r: 43 };
const N_PATH = "M114 100V0H131L180 73V-2H165L188 -31L211 -2H196V100H179L130 27V100Z";
const HOUR_HAND = "M50 50V22";
const MINUTE_HAND = "M50 50L64.7 41.5";

const Artwork = ({ color }) => (
  <>
    <Circle cx={CLOCK.cx} cy={CLOCK.cy} r={CLOCK.r} fill="none" stroke={color} strokeWidth={16} />
    <G stroke={color} strokeWidth={9} strokeLinecap="round" fill="none">
      <Path d={HOUR_HAND} />
      <Path d={MINUTE_HAND} />
    </G>
    <Circle cx={CLOCK.cx} cy={CLOCK.cy} r={7} fill={color} />
    <Path fill={color} d={N_PATH} />
  </>
);

/** The lime "ON" artwork on its own (transparent background). */
export const LigthsOnGlyph = ({ width = 120, color = BRAND.lime, style }) => (
  <Svg
    width={width}
    height={(width * VB.h) / VB.w}
    viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
    style={style}
    accessibilityRole="image"
    accessibilityLabel="LigthsON"
  >
    <Artwork color={color} />
  </Svg>
);

/** Rounded dark app tile — the app icon as used inside the app. */
export const LigthsOnMark = ({ size = 36, style }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" style={style} accessibilityRole="image" accessibilityLabel="LigthsON">
    <Rect width={1024} height={1024} rx={228} fill={BRAND.ink} />
    <G transform="translate(512 512) scale(3.3) translate(-104 -36)">
      <Artwork color={BRAND.lime} />
    </G>
  </Svg>
);

// ── Launch animation ─────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_LEN = 2 * Math.PI * CLOCK.r;

/**
 * Plays once: ring draws → hands sweep into place → the N rises with its arrow.
 * Then idles (minute hand ticks, soft glow) until unmounted.
 * `onIntroEnd` fires when the intro has finished.
 */
export const AnimatedLigthsOnLogo = ({ width = 188, onIntroEnd }) => {
  const s = width / VB.w;
  const height = VB.h * s;

  const ring = useRef(new Animated.Value(0)).current; // 0 → 1 draw
  const sweep = useRef(new Animated.Value(0)).current; // hands spin-in
  const dot = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current; // N reveal
  const tick = useRef(new Animated.Value(0)).current; // idle minute hand
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.timing(ring, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(sweep, { toValue: 1, duration: 750, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(dot, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(rise, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);

    let idle;
    intro.start(({ finished }) => {
      if (!finished) return;
      onIntroEnd && onIntroEnd();
      idle = Animated.parallel([
        Animated.loop(
          Animated.timing(tick, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        ),
      ]);
      idle.start();
    });
    return () => {
      intro.stop();
      idle && idle.stop();
    };
  }, []);

  // Layers share the artwork box; the hands layer is a square centred on the clock
  const clockBox = 100 * s; // viewBox 0..100 around the clock
  const clockLeft = (0 - VB.x) * s;
  const clockTop = (0 - VB.y) * s;

  const handsRotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ["-270deg", "0deg"] });
  const minuteRotate = tick.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel="LigthsON is loading">
      {/* Soft lime glow behind the clock while waiting */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: clockLeft + clockBox * 0.08,
          top: clockTop + clockBox * 0.08,
          width: clockBox * 0.84,
          height: clockBox * 0.84,
          borderRadius: clockBox,
          backgroundColor: BRAND.lime,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }],
        }}
      />

      {/* Ring draws itself */}
      <Svg width={width} height={height} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} style={{ position: "absolute" }}>
        <AnimatedCircle
          cx={CLOCK.cx}
          cy={CLOCK.cy}
          r={CLOCK.r}
          fill="none"
          stroke={BRAND.lime}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={`${RING_LEN} ${RING_LEN}`}
          strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [RING_LEN, 0] })}
          transform={`rotate(-90 ${CLOCK.cx} ${CLOCK.cy})`}
        />
      </Svg>

      {/* Hour hand sweeps into place */}
      <Animated.View
        style={{
          position: "absolute",
          left: clockLeft,
          top: clockTop,
          width: clockBox,
          height: clockBox,
          opacity: sweep,
          transform: [{ rotate: handsRotate }],
        }}
      >
        <Svg width={clockBox} height={clockBox} viewBox="0 0 100 100">
          <Path d={HOUR_HAND} stroke={BRAND.lime} strokeWidth={9} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Minute hand: sweeps in with the hour hand, then keeps ticking */}
      <Animated.View
        style={{
          position: "absolute",
          left: clockLeft,
          top: clockTop,
          width: clockBox,
          height: clockBox,
          opacity: sweep,
          transform: [{ rotate: handsRotate }, { rotate: minuteRotate }],
        }}
      >
        <Svg width={clockBox} height={clockBox} viewBox="0 0 100 100">
          <Path d={MINUTE_HAND} stroke={BRAND.lime} strokeWidth={9} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Centre dot pops */}
      <Animated.View
        style={{
          position: "absolute",
          left: clockLeft,
          top: clockTop,
          width: clockBox,
          height: clockBox,
          transform: [{ scale: dot }],
        }}
      >
        <Svg width={clockBox} height={clockBox} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={7} fill={BRAND.lime} />
        </Svg>
      </Animated.View>

      {/* The N rises with its arrow */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [height * 0.35, 0] }) }],
        }}
      >
        <Svg width={width} height={height} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
          <Path fill={BRAND.lime} d={N_PATH} />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default LigthsOnMark;
