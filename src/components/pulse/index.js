// Pulse UI primitives — React Native versions of the building blocks in
// Design/pulse/Pulse.dc.html. Values (sizes, radii, spacing, type) mirror the
// design's inline styles; colours come from the active theme tokens (P).

import React, { useEffect, useRef, useState } from "react";
import { Animated, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Circle, Path, Polyline, Polygon } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { Text, TextInput } from "./Text";
import Icon from "./Icon";
import { P, FONTS, themedStyles } from "../../theme/theme";
import { useTheme } from "../../theme/ThemeProvider";
import haptics from "../../ux/haptics";
import { Press } from "./feedback";
import { Overline, Mono } from "./type";
import { FadeIn } from "./motion";
import { DURATION, EASE, SPRING, entrancesQuiet, reduceMotion } from "../../ux/motion";

export { Text, TextInput, Icon };
export { Overline, Mono };

// ── Type helpers ────────────────────────────────────────────────────

/** Section header row — "Today" … "VIEW ALL" */
export const SectionHeader = ({ title, action, onAction, style }) => (
  <View style={[s.sectionHeader, style]}>
    <Text style={s.sectionTitle}>{title}</Text>
    {action ? (
      <TouchableOpacity
        onPress={onAction}
        disabled={!onAction}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Overline color={P.accTx} style={{ letterSpacing: 0.44 }}>
          {action}
        </Overline>
      </TouchableOpacity>
    ) : null}
  </View>
);

// ── Surfaces ────────────────────────────────────────────────────────

export const Card = ({ children, style, padded = true, onPress, ...rest }) => {
  if (onPress) {
    return (
      <Press scaleTo={0.985} onPress={onPress} style={[s.card, padded && { padding: 14 }, style]} {...rest}>
        {children}
      </Press>
    );
  }
  return (
    <View style={[s.card, padded && { padding: 14 }, style]} {...rest}>
      {children}
    </View>
  );
};

/** Small tinted tag — "+36% SAVED", "BREAKOUT" */
export const Badge = ({ children, color, bg, style }) => (
  <View style={[s.badge, { backgroundColor: bg || P.posSoft }, style]}>
    <Text mono style={[s.badgeText, { color: color || P.pos }]}>
      {children}
    </Text>
  </View>
);

// ── Buttons ─────────────────────────────────────────────────────────

/**
 * variant: "primary" (lime) | "ghost" (outlined) | "dark" (ink fill) | "danger"
 */
export const Button = ({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  textStyle,
  height = 52,
  accessibilityLabel,
}) => {
  const v = {
    primary: { bg: P.acc, fg: P.accInk, border: P.acc },
    ghost: { bg: "transparent", fg: P.ink, border: P.line },
    dark: { bg: P.ink, fg: P.bg, border: P.ink },
    danger: { bg: P.negSoft, fg: P.neg, border: P.negSoft },
  }[variant];
  return (
    <Press
      scaleTo={0.97}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        s.button,
        { height, backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
          <Text style={[s.buttonText, { color: v.fg }, textStyle]}>{title}</Text>
        </>
      )}
    </Press>
  );
};

// What an icon-only button says to a screen reader when the screen didn't
// pass a label — never the raw icon name ("chevron").
const ICON_LABELS = {
  back: "Back",
  chevron: "Next",
  close: "Close",
  plus: "Add",
  edit: "Edit",
  trash: "Delete",
  share: "Share",
  info: "More information",
  search: "Search",
  refresh: "Refresh",
  settings: "Settings",
  download: "Download",
  bell: "Notifications",
  mic: "Record voice",
  eye: "Show amounts",
  eyeOff: "Hide amounts",
};

/** 44×44 square icon button with surface + hairline */
export const IconButton = ({ icon, onPress, color, size = 20, style, accessibilityLabel, haptic, children }) => (
  <Press
    onPress={onPress}
    scaleTo={0.9}
    haptic={haptic}
    hitSlop={4}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || ICON_LABELS[icon] || icon}
    style={[s.iconButton, style]}
  >
    {children || <Icon name={icon} size={size} color={color || P.ink} />}
  </Press>
);

export const ThemeToggle = ({ style }) => {
  const { dark, toggleTheme } = useTheme();
  return (
    <IconButton
      icon={dark ? "sun" : "moon"}
      haptic="select"
      onPress={toggleTheme}
      style={style}
      accessibilityLabel={dark ? "Switch to light theme" : "Switch to dark theme"}
    />
  );
};

/** Pill chip — selected = lime */
export const Chip = ({ label, selected, onPress, icon, style }) => (
  <Press
    onPress={onPress}
    scaleTo={0.94}
    haptic="select"
    // 38px chip, 46px touch target
    hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: !!selected }}
    style={[s.chip, { backgroundColor: selected ? P.acc : P.surf2 }, style]}
  >
    {icon ? <Icon name={icon} size={14} strokeWidth={2.4} color={P.accTx} /> : null}
    <Text style={[s.chipText, { color: selected ? P.accInk : P.ink2 }]}>{label}</Text>
  </Press>
);

export const ChipRow = ({ options, value, onChange, style }) => (
  <View style={[s.chipRow, style]}>
    {options.map((o) => {
      const key = typeof o === "string" ? o : o.value;
      const label = typeof o === "string" ? o : o.label;
      return <Chip key={key} label={label} selected={value === key} onPress={() => onChange && onChange(key)} />;
    })}
  </View>
);

/**
 * Segmented control — selected = ink fill. The ink pill slides between
 * options and each label lights up as the pill passes under it.
 */
export const Segmented = ({ options, value, onChange, style, height = 38, fontSize = 13 }) => {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const keyOf = (o) => (typeof o === "string" ? o : o.value);
  const idx = options.findIndex((o) => keyOf(o) === value);
  const n = options.length;
  const gap = 4;
  const segW = width ? (width - 8 - gap * (n - 1)) / n : 0;
  const pill = segW > 0 && idx >= 0;

  useEffect(() => {
    if (!pill) return;
    const to = idx * (segW + gap);
    if (!placed.current || reduceMotion()) {
      placed.current = true;
      x.setValue(to);
      return;
    }
    Animated.spring(x, { toValue: to, ...SPRING, useNativeDriver: true }).start();
  }, [idx, segW]);

  return (
    <View style={[s.segmented, style]} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {pill ? (
        <Animated.View
          pointerEvents="none"
          style={[s.segmentPill, { width: segW, height, transform: [{ translateX: x }] }]}
        />
      ) : null}
      {options.map((o, i) => {
        const key = keyOf(o);
        const label = typeof o === "string" ? o : o.label;
        const on = key === value;
        const pos = i * (segW + gap);
        const lit = pill
          ? x.interpolate({
              inputRange: [pos - segW - gap, pos, pos + segW + gap],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            })
          : null;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => {
              if (!on) haptics.select();
              onChange && onChange(key);
            }}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segment, { height, backgroundColor: !pill && on ? P.ink : "transparent" }]}
          >
            <Animated.View style={lit && { opacity: Animated.subtract(1, lit) }}>
              <Text style={[s.segmentText, { fontSize, color: !pill && on ? P.bg : P.ink2 }]} numberOfLines={1}>
                {label}
              </Text>
            </Animated.View>
            {pill ? (
              // Light copy of the label, visible only where the pill sits
              <Animated.View pointerEvents="none" style={[s.segmentLit, { opacity: lit }]}>
                <Text style={[s.segmentText, { fontSize, color: P.bg }]} numberOfLines={1}>
                  {label}
                </Text>
              </Animated.View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Rows & fields ───────────────────────────────────────────────────

/** Full-width rows press with a gentler scale than buttons and dim a touch. */
const RowPress = (props) => <Press scaleTo={0.985} activeOpacity={0.8} accessibilityRole="button" {...props} />;

/** Key/value row with chevron — "Expense item … Groceries ›" */
export const FieldRow = ({ label, value, onPress, last, chevron = true, valueColor, children }) => {
  const Comp = onPress ? RowPress : View;
  return (
    <Comp onPress={onPress} style={[s.fieldRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children || (
        <View style={s.fieldValueWrap}>
          <Text mono style={[s.fieldValue, valueColor && { color: valueColor }]} numberOfLines={1}>
            {value}
          </Text>
          {chevron && onPress ? <Icon name="chevron" size={16} color={P.mute} /> : null}
        </View>
      )}
    </Comp>
  );
};

/** List row — label/sub on the left, value on the right */
export const ListRow = ({ title, subtitle, right, rightSub, rightColor, left, onPress, last, chevron }) => {
  const Comp = onPress ? RowPress : View;
  return (
    <Comp onPress={onPress} style={[s.listRow, last && { borderBottomWidth: 0 }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[s.listTitle, !subtitle && { fontWeight: "400" }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.listSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right !== undefined && right !== null ? (
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {typeof right === "string" || typeof right === "number" ? (
            <Text mono style={[s.listValue, rightColor && { color: rightColor }]}>
              {right}
            </Text>
          ) : (
            right
          )}
          {rightSub ? <Text style={s.listRightSub}>{rightSub}</Text> : null}
        </View>
      ) : null}
      {chevron ? <Icon name="chevron" size={18} color={P.mute} /> : null}
    </Comp>
  );
};

/** Labelled input — mono overline label + surf2 field */
export const Field = ({ label, style, inputStyle, ...inputProps }) => (
  <View style={[{ gap: 6 }, style]}>
    {label ? <Overline>{label}</Overline> : null}
    <TextInput placeholderTextColor={P.mute} style={[s.input, inputStyle]} {...inputProps} />
  </View>
);

/** Initial tile for transactions — tinted square with a mono letter */
export const InitialTile = ({ letter, color, bg, size = 38 }) => (
  <View style={[s.initialTile, { width: size, height: size, backgroundColor: bg || P.surf2 }]}>
    <Text mono style={{ fontSize: 14, fontWeight: "700", color: color || P.ink }}>
      {letter}
    </Text>
  </View>
);

/** Transaction row as drawn on Home / Day */
export const TxRow = ({ name, sub, amount, kind = "exp", time, onPress, last, detailed }) => {
  const k = {
    exp: [P.neg, P.negSoft, "Expense"],
    inc: [P.pos, P.posSoft, "Income"],
    inv: [P.inv, P.invSoft, "Invest"],
  }[kind] || [P.ink, P.surf2, ""];
  const Comp = onPress ? RowPress : View;
  return (
    <Comp onPress={onPress} style={[s.listRow, last && { borderBottomWidth: 0 }]}>
      <InitialTile letter={(name || "?").trim().charAt(0).toUpperCase()} color={k[0]} bg={k[1]} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: detailed ? 15 : 14, fontWeight: "600", color: P.ink }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontSize: detailed ? 13 : 12, color: detailed ? P.ink2 : P.mute }} numberOfLines={1}>
          {detailed ? sub : [k[2], time].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text mono style={{ fontSize: detailed ? 15 : 14, fontWeight: "600", color: k[0] }}>
          {amount}
        </Text>
        {detailed && time ? <Text style={{ fontSize: 12, color: P.mute }}>{time}</Text> : null}
      </View>
    </Comp>
  );
};

/** Label + figure stat — used in 3-up grids */
export const Stat = ({ label, value, color, size = 15, style, children }) => (
  <View style={[{ gap: 4, flex: 1, minWidth: 0 }, style]}>
    <Overline numberOfLines={1}>{label}</Overline>
    <Mono size={size} color={color} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Mono>
    {children}
  </View>
);

export const StatCard = ({ label, value, color, style }) => (
  <Card style={[{ flex: 1, padding: 12 }, style]}>
    <View style={{ gap: 6 }}>
      <Overline numberOfLines={1}>{label}</Overline>
      <Mono size={15} color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Mono>
    </View>
  </Card>
);

// ── Data viz ────────────────────────────────────────────────────────

/** Bar that fills to `value` (0–1) on first show and glides when it changes. */
export const ProgressBar = ({ value = 0, color, height = 6, track, style }) => {
  const pct = Math.max(0, Math.min(1, value || 0));
  const fill = useAnimatedValue(pct, DURATION.focal);
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track || P.surf2, overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          height,
          borderRadius: height / 2,
          backgroundColor: color || P.ink,
        }}
      />
    </View>
  );
};

/**
 * Animated.Value that eases from 0 to `target` on mount and to each new
 * target afterwards. JS-driven: it feeds widths and SVG props.
 */
const useAnimatedValue = (target, duration) => {
  const v = useRef(new Animated.Value(reduceMotion() || entrancesQuiet() ? target : 0)).current;
  useEffect(() => {
    if (reduceMotion()) {
      v.setValue(target);
      return undefined;
    }
    const a = Animated.timing(v, { toValue: target, duration, easing: EASE.out, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [target]);
  return v;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress ring — the arc sweeps round to its value. */
export const Ring = ({ size = 64, stroke = 7, value = 0, color, track, children }) => {
  const r = (size - stroke) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));
  const p = useAnimatedValue(pct, DURATION.focal + 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || P.surf2} strokeWidth={stroke} />
        {pct > 0 ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color || P.acc}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={p.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>{children}</View>
    </View>
  );
};

/**
 * 0 → 1 once `ready` turns true. Drives SVG geometry by re-rendering, so
 * it runs once per mount (first data), never on live updates.
 */
const useSweep = (ready) => {
  const instant = useRef(reduceMotion() || entrancesQuiet()).current;
  const [p, setP] = useState(instant ? 1 : 0);
  const done = useRef(instant);
  useEffect(() => {
    if (!ready || done.current) return undefined;
    done.current = true;
    let raf;
    let t0;
    const d = DURATION.focal + 200;
    const step = (t) => {
      if (t0 === undefined) t0 = t;
      const k = Math.min(1, (t - t0) / d);
      setP(1 - Math.pow(1 - k, 4));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setP(1);
    };
  }, [ready]);
  return p;
};

/** Donut with multiple segments: [{ value, color }] — unrolls clockwise when data first arrives. */
export const Donut = ({ size = 128, stroke = 16, segments = [], children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, x) => a + (x.value || 0), 0) || 1;
  const sweep = useSweep(segments.length > 0);
  let offset = 0;
  const gap = segments.length > 1 ? 2 : 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {segments.length === 0 || sweep < 1 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.surf2} strokeWidth={stroke} />
        ) : null}
        {segments.map((seg, i) => {
          const len = Math.max(0, (seg.value / total) * c * sweep - gap);
          const el = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += (seg.value / total) * c * sweep;
          return el;
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>{children}</View>
    </View>
  );
};

/**
 * Rounded-square ring split like a pie chart: each segment's share of the
 * outline matches its share of the total, clockwise from 12 o'clock. Sized
 * to sit around a calendar day tile; renders nothing when all values are 0.
 * segments: [{ value, color }]
 */
export const DayRing = React.memo(({ width = 34, height = 30, radius = 10, stroke = 2.5, segments = [] }) => {
  const parts = segments.filter((x) => x.value > 0);
  const total = parts.reduce((a, x) => a + x.value, 0);
  if (!total) return null;
  // Path along the middle of the stroke, starting top-centre, clockwise
  const i = stroke / 2;
  const x0 = i;
  const y0 = i;
  const w = width - stroke;
  const h = height - stroke;
  const r = Math.min(radius - i, w / 2, h / 2);
  const d = [
    `M ${x0 + w / 2} ${y0}`,
    `H ${x0 + w - r}`,
    `A ${r} ${r} 0 0 1 ${x0 + w} ${y0 + r}`,
    `V ${y0 + h - r}`,
    `A ${r} ${r} 0 0 1 ${x0 + w - r} ${y0 + h}`,
    `H ${x0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0} ${y0 + h - r}`,
    `V ${y0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
    "Z",
  ].join(" ");
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
  const gap = parts.length > 1 ? 1.5 : 0;
  let offset = 0;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {parts.map((seg, k) => {
        const share = (seg.value / total) * perimeter;
        const el = (
          <Path
            key={k}
            d={d}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0.5, share - gap)} ${perimeter}`}
            strokeDashoffset={-offset}
          />
        );
        offset += share;
        return el;
      })}
    </Svg>
  );
});

/** Sparkline from values (any range) */
export const Sparkline = ({ values = [], width = 64, height = 30, color, fill }) => {
  if (!values || values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${((i * width) / (values.length - 1)).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <Svg width={width} height={height}>
      {fill ? <Polygon points={`0,${height} ${pts} ${width},${height}`} fill={fill} /> : null}
      <Polyline points={pts} fill="none" stroke={color || P.pos} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

/** Coloured dot legend item */
export const LegendDot = ({ color, label, square }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <View style={{ width: square ? 8 : 6, height: square ? 8 : 6, borderRadius: square ? 2 : 3, backgroundColor: color }} />
    <Text style={{ fontSize: 11, color: P.ink2 }}>{label}</Text>
  </View>
);

// ── Screen scaffolding ──────────────────────────────────────────────

/** Stack header: back box · overline + title · trailing (theme toggle) */
export const ScreenHeader = ({ overline, title, onBack, right, showBack = true, style }) => {
  const navigation = useNavigation();
  return (
    <View style={[s.screenHeader, style]}>
      {showBack ? (
        <IconButton
          icon="back"
          accessibilityLabel="Back"
          onPress={onBack || (() => navigation.canGoBack() && navigation.goBack())}
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {overline ? <Overline numberOfLines={1}>{overline}</Overline> : null}
        <Text style={s.screenTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right !== undefined ? right : <ThemeToggle />}
    </View>
  );
};

/** Tab-root header: overline + 30px title · trailing */
export const TitleHeader = ({ overline, title, right, style }) => (
  <View style={[s.titleHeader, style]}>
    <View style={{ flex: 1, gap: 4 }}>
      {overline ? <Overline>{overline}</Overline> : null}
      <Text style={s.bigTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
    {right !== undefined ? right : <ThemeToggle />}
  </View>
);

/** Empty state block */
export const Empty = ({ icon = "info", title, message, action, onAction }) => (
  <FadeIn>
    <Card style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
      <Icon name={icon} size={24} color={P.mute} />
      {title ? <Text style={{ fontSize: 15, fontWeight: "600", color: P.ink }}>{title}</Text> : null}
      {message ? <Text style={{ fontSize: 13, color: P.ink2, textAlign: "center" }}>{message}</Text> : null}
      {action ? <Chip label={action} selected onPress={onAction} style={{ marginTop: 6 }} /> : null}
    </Card>
  </FadeIn>
);

// ── Styles ──────────────────────────────────────────────────────────

const s = themedStyles(() =>
  StyleSheet.create({
    overline: {
      fontFamily: FONTS.mono(400),
      letterSpacing: 0.66,
      textTransform: "uppercase",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: P.ink,
    },
    card: {
      backgroundColor: P.surf,
      borderWidth: 1,
      borderColor: P.line,
      borderRadius: 14,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    badgeText: {
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    button: {
      width: "100%",
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "600",
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: P.surf,
      borderWidth: 1,
      borderColor: P.line,
      alignItems: "center",
      justifyContent: "center",
    },
    chip: {
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    segmented: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: P.surf2,
    },
    segment: {
      flex: 1,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    segmentText: {
      fontWeight: "600",
    },
    segmentPill: {
      position: "absolute",
      left: 4,
      top: 4,
      borderRadius: 9,
      backgroundColor: P.ink,
    },
    segmentLit: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    fieldRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
      gap: 12,
    },
    fieldLabel: {
      fontSize: 14,
      color: P.ink2,
    },
    fieldValueWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 1,
    },
    fieldValue: {
      fontSize: 14,
      fontWeight: "600",
      color: P.ink,
      flexShrink: 1,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    listTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: P.ink,
    },
    listSub: {
      fontSize: 13,
      color: P.ink2,
    },
    listValue: {
      fontSize: 15,
      fontWeight: "600",
      color: P.ink,
    },
    listRightSub: {
      fontSize: 12,
      color: P.mute,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: P.line,
      borderRadius: 12,
      backgroundColor: P.surf2,
      fontSize: 15,
      color: P.ink,
      paddingHorizontal: 14,
    },
    initialTile: {
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    screenHeader: {
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: P.bg,
    },
    screenTitle: {
      fontSize: 20,
      fontWeight: "600",
      letterSpacing: -0.4,
      color: P.ink,
    },
    titleHeader: {
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
      backgroundColor: P.bg,
    },
    bigTitle: {
      fontSize: 30,
      fontWeight: "600",
      letterSpacing: -0.9,
      lineHeight: 34,
      color: P.ink,
    },
  })
);

export const pulseStyles = s;

// Sheets, selects, date fields, stat grids — see forms.js
export { Sheet, SheetActions, Summary, StatGrid, SelectField, DateField, TextAction, Hint, QuickAmounts } from "./forms";
export { Press, Skeleton, SkeletonRows, Tip, ActionSheet, markLearned } from "./feedback";
export {
  FadeIn,
  Stagger,
  RowIn,
  staggerDelay,
  CountUp,
  ClockLoader,
  SkeletonCard,
  ScreenSkeleton,
  useSlideOnChange,
  usePop,
  useShake,
} from "./motion";
export { default as ToastHost } from "./ToastHost";
export { OfflineBanner, Updated, ErrorState, CelebrationHost } from "./status";
export { SwipeRow } from "./swipe";
