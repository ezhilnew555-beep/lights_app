// Pulse form & overlay building blocks shared by the nested screens
// (stock trading, investments, plan). Same tokens and metrics as
// index.js: 14px cards, 12px inputs on surf2, mono overlines.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text } from "./Text";
import Icon from "./Icon";
import { P, themedStyles } from "../../theme/theme";
import { Overline, Mono } from "./type";
import ToastHost from "./ToastHost";
import haptics from "../../ux/haptics";
import { DURATION, EASE, SPRING, reduceMotion } from "../../ux/motion";

const WINDOW_H = Dimensions.get("window").height;
const DRAG_CLOSE = 110; // px pulled down (or a quick flick) that closes the sheet

/**
 * Bottom sheet: overline + title + close, scrollable body, pinned footer.
 * footer is usually one Button or a two-button row (see SheetActions).
 *
 * The backdrop fades while the panel springs up; closing drops it away
 * faster than it arrived. Pull the handle or header down to dismiss.
 * `onHidden` fires once the exit has finished — open follow-up sheets
 * there, not in the same tick as closing this one.
 */
export const Sheet = ({ visible, onClose, onHidden, overline, title, children, footer }) => {
  const [mounted, setMounted] = useState(!!visible);
  const y = useRef(new Animated.Value(WINDOW_H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const height = useRef(WINDOW_H);
  const latest = useRef({ onClose, onHidden });
  latest.current = { onClose, onHidden };
  // Callers often clear the record the sheet shows as they close it
  // (visible={!!item}); keep drawing the last open content while it leaves.
  const content = useRef(null);
  if (visible || !content.current) content.current = { overline, title, children, footer };
  ({ overline, title, children, footer } = content.current);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(y, {
        toValue: reduceMotion() ? 0 : height.current,
        duration: DURATION.quick + 40,
        easing: EASE.in,
        useNativeDriver: true,
      }),
      Animated.timing(fade, { toValue: 0, duration: DURATION.quick + 40, useNativeDriver: true }),
    ]).start(({ finished }) => {
      // Not finished = reopened mid-exit; stay mounted
      if (!finished) return;
      setMounted(false);
      latest.current.onHidden?.();
    });
  }, [visible]);

  useEffect(() => {
    if (!visible || !mounted) return;
    // Springs up from wherever the panel is: off-screen, or mid-exit if reopened
    if (reduceMotion()) y.setValue(0);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, ...SPRING, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: DURATION.base, easing: EASE.out, useNativeDriver: true }),
    ]).start();
  }, [visible, mounted]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_CLOSE || g.vy > 0.8) {
          haptics.tap();
          latest.current.onClose?.();
        } else {
          Animated.spring(y, { toValue: 0, ...SPRING, overshootClamping: true, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(y, { toValue: 0, ...SPRING, overshootClamping: true, useNativeDriver: true }).start(),
    }),
  ).current;

  const reduced = reduceMotion();

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: fade }]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: y }] }, reduced && { opacity: fade }]}
          onLayout={(e) => {
            height.current = e.nativeEvent.layout.height + 24;
          }}
        >
          <View {...pan.panHandlers}>
            <View style={s.grabber} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                {overline ? <Overline>{overline}</Overline> : null}
                {title ? (
                  <Text style={s.sheetTitle} numberOfLines={2}>
                    {title}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={18} color={P.ink2} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={s.sheetFooter}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
      <ToastHost inModal />
    </Modal>
  );
};

/** Two equal buttons side by side (e.g. Cancel · Confirm). */
export const SheetActions = ({ children }) => <View style={s.actions}>{React.Children.map(children, (c) => c && <View style={{ flex: 1 }}>{c}</View>)}</View>;

/** Label/value summary rows inside a surf2 panel — order totals, projections. */
export const Summary = ({ rows, style }) => (
  <View style={[s.summary, style]}>
    {rows.filter(Boolean).map((r, i) => (
      <View key={r.label} style={[s.summaryRow, i === 0 && { paddingTop: 0 }]}>
        <Text style={s.summaryLabel}>{r.label}</Text>
        <Mono size={r.strong ? 16 : 14} weight={r.strong ? "700" : "600"} color={r.color}>
          {r.value}
        </Mono>
      </View>
    ))}
  </View>
);

/** Grid of label / figure stats, `columns` per row (design: 3 or 4). */
export const StatGrid = ({ items, columns = 3, style }) => {
  const rows = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={[{ gap: 14 }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 10 }}>
          {row.map((it) => (
            <View key={it.label} style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Overline numberOfLines={1}>{it.label}</Overline>
              <Mono size={it.size || 15} color={it.color} numberOfLines={1} adjustsFontSizeToFit>
                {it.value}
              </Mono>
              {it.sub ? <Text style={[s.statSub, it.subColor && { color: it.subColor }]}>{it.sub}</Text> : null}
            </View>
          ))}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)
            : null}
        </View>
      ))}
    </View>
  );
};

/** Tappable field box (same metrics as Field) showing a value + chevron. */
const FieldButton = ({ label, value, placeholder, onPress, icon = "chevronDown", style }) => (
  <View style={[{ gap: 6 }, style]}>
    {label ? <Overline>{label}</Overline> : null}
    <TouchableOpacity style={s.fieldBox} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[s.fieldText, !value && { color: P.mute }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Icon name={icon} size={16} color={P.mute} />
    </TouchableOpacity>
  </View>
);

/**
 * Dropdown replacement: opens a sheet listing the options.
 * options: [{ value, label, sub? }]
 */
export const SelectField = ({ label, value, options, onChange, placeholder = "Select", title, style }) => {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <FieldButton label={label} value={current?.label} placeholder={placeholder} onPress={() => setOpen(true)} style={style} />
      <Sheet visible={open} onClose={() => setOpen(false)} overline={label} title={title || placeholder}>
        <View style={s.optionList}>
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <TouchableOpacity
                key={String(o.value)}
                style={[s.option, i === options.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  haptics.select();
                  onChange?.(o.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.optionText, on && { fontWeight: "700" }]}>{o.label}</Text>
                  {o.sub ? <Text style={s.optionSub}>{o.sub}</Text> : null}
                </View>
                {on ? <Icon name="check" size={18} color={P.accTx} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>
    </>
  );
};

const fmtDate = (d, mode) =>
  !d
    ? ""
    : mode === "time"
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Date (or mode="time") field: shows "26 Sep 2026", opens the platform picker. */
export const DateField = ({ label, value, onChange, minimumDate, maximumDate, mode = "date", placeholder = "Pick a date", style }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldButton label={label} value={fmtDate(value, mode)} placeholder={placeholder} onPress={() => setOpen(true)} icon="chevronDown" style={style} />
      {open && Platform.OS !== "web" ? (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={Platform.OS === "ios" ? (mode === "time" ? "spinner" : "inline") : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(Platform.OS === "ios");
            if (event?.type !== "dismissed" && date) {
              haptics.select();
              onChange?.(date);
            }
          }}
        />
      ) : null}
    </>
  );
};

/**
 * One-tap amount chips under an amount field: +100, +500 … Adds to what's
 * already typed, so "+500 +500 +100" builds ₹1,100 without the keyboard.
 */
export const QuickAmounts = ({ value, onChange, steps = [100, 500, 1000, 5000], style }) => (
  <View style={[s.quick, style]}>
    {steps.map((n) => (
      <TouchableOpacity
        key={n}
        style={s.quickChip}
        onPress={() => {
          haptics.select();
          const cur = parseFloat(value) || 0;
          onChange?.(String(Math.round((cur + n) * 100) / 100));
        }}
        accessibilityRole="button"
        accessibilityLabel={`Add ${n} rupees`}
      >
        <Text mono style={s.quickText}>
          +{n.toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/** Quiet text action — "Remove", "Edit" — for secondary or destructive links. */
export const TextAction = ({ title, onPress, color, icon, style }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[s.textAction, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    {icon ? <Icon name={icon} size={15} color={color || P.ink2} /> : null}
    <Text mono style={[s.textActionText, { color: color || P.accTx }]}>
      {title}
    </Text>
  </TouchableOpacity>
);

/** "Label ........ value" inline note row used under inputs. */
export const Hint = ({ children, style }) => <Text style={[s.hint, style]}>{children}</Text>;

const s = themedStyles(() =>
  StyleSheet.create({
    backdrop: { backgroundColor: P.overlay },
    overlay: { flex: 1, justifyContent: "flex-end" },
    sheet: {
      width: "100%",
      maxWidth: 640,
      alignSelf: "center",
      backgroundColor: P.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: "90%",
      borderWidth: 1,
      borderColor: P.line,
      paddingBottom: Platform.OS === "ios" ? 28 : 16,
    },
    grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: P.line, marginTop: 8 },
    sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    sheetTitle: { fontSize: 20, fontWeight: "600", letterSpacing: -0.4, color: P.ink },
    close: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: P.surf,
      borderWidth: 1,
      borderColor: P.line,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetBody: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
    sheetFooter: { paddingHorizontal: 16, paddingTop: 10 },
    actions: { flexDirection: "row", gap: 10 },
    summary: { backgroundColor: P.surf2, borderRadius: 12, padding: 14 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, gap: 12 },
    summaryLabel: { fontSize: 13, color: P.ink2, flexShrink: 1 },
    statSub: { fontSize: 12, color: P.mute },
    fieldBox: {
      height: 48,
      borderWidth: 1,
      borderColor: P.line,
      borderRadius: 12,
      backgroundColor: P.surf2,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    fieldText: { flex: 1, fontSize: 15, color: P.ink },
    optionList: { backgroundColor: P.surf, borderRadius: 14, borderWidth: 1, borderColor: P.line, paddingHorizontal: 14 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.line },
    optionText: { fontSize: 15, color: P.ink },
    optionSub: { fontSize: 12, color: P.mute },
    textAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
    textActionText: { fontSize: 11, letterSpacing: 0.44, textTransform: "uppercase" },
    hint: { fontSize: 12, color: P.mute, marginTop: -6 },
    quick: { flexDirection: "row", gap: 8, marginTop: 8 },
    quickChip: {
      flex: 1,
      height: 34,
      borderRadius: 9,
      backgroundColor: P.surf2,
      alignItems: "center",
      justifyContent: "center",
    },
    quickText: { fontSize: 12, fontWeight: "600", color: P.ink2 },
  })
);
