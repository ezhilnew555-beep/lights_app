// Renders the toast from src/ux/toast.js.
//
// React Native Modals draw above the rest of the app, so a toast raised from
// inside a sheet would be hidden behind it. Every surface that can be on top
// (the app root, Sheet, full-screen form modals) mounts a <ToastHost />; the
// most recently mounted one draws the toast. Closing the sheet hands it back
// to the host underneath without interrupting the toast.

import React, { useEffect, useRef, useState } from "react";
import { Animated, AppState, Keyboard, PanResponder, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import Icon from "./Icon";
import { PALETTES } from "../../theme/theme";
import { currentToast, dismiss, runAction, subscribeToast } from "../../ux/toast";
import { DURATION, EASE, reduceMotion } from "../../ux/motion";

// ── Host stack & dock inset ─────────────────────────────────────────

let hostSeq = 0;
let hosts = [];
let dockInset = 0;
const layoutSubs = new Set();
const emitLayout = () => layoutSubs.forEach((fn) => fn());

/** The dock reports its height so toasts float just above it. */
export const setToastDockInset = (h) => {
  if (h === dockInset) return;
  dockInset = h;
  emitLayout();
};

// The toast surface is dark in both themes, so it uses the dark palette.
const D = PALETTES.dark;
const KIND = {
  success: { icon: "check", bg: D.acc, fg: D.accInk },
  error: { icon: "alert", bg: D.neg, fg: D.accInk },
  warning: { icon: "alert", bg: D.amber, fg: D.accInk },
  info: { icon: "info", bg: "#2A332E", fg: D.ink },
  coin: { icon: "coin", bg: D.amber, fg: D.accInk },
};

const ToastHost = ({ inModal = false }) => {
  const insets = useSafeAreaInsets();
  const id = useRef(++hostSeq).current;
  const [, force] = useState(0);
  const [shown, setShown] = useState(currentToast());
  const [kb, setKb] = useState(0);
  // A host mounted mid-toast (a sheet opening) shows it without re-animating
  const anim = useRef(new Animated.Value(currentToast() ? 1 : 0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  // The icon lands a beat after the toast: a check pops, a coin flips
  const icon = useRef(new Animated.Value(1)).current;

  // Register in the host stack
  useEffect(() => {
    hosts.push(id);
    emitLayout();
    const rerender = () => force((n) => n + 1);
    layoutSubs.add(rerender);
    return () => {
      hosts = hosts.filter((h) => h !== id);
      layoutSubs.delete(rerender);
      emitLayout();
    };
  }, [id]);

  // Follow the toast store: animate in on a new toast, out when it closes
  useEffect(
    () =>
      subscribeToast((t) => {
        if (t) {
          drag.setValue(0);
          setShown(t);
          anim.setValue(0);
          Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start();
          if (reduceMotion()) {
            icon.setValue(1);
          } else {
            icon.setValue(0);
            Animated.sequence([
              Animated.delay(90),
              t.kind === "coin"
                ? Animated.timing(icon, { toValue: 1, duration: DURATION.focal, easing: EASE.out, useNativeDriver: true })
                : Animated.spring(icon, { toValue: 1, friction: 5, tension: 170, useNativeDriver: true }),
            ]).start();
          }
        } else {
          Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
            if (finished && !currentToast()) setShown(null);
          });
        }
      }),
    [anim, drag, icon],
  );

  // Leaving the app closes the toast, so a pending undo commits rather than
  // being lost if the OS kills the app in the background.
  useEffect(() => {
    if (inModal) return undefined;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") dismiss(null, "background");
    });
    return () => sub.remove();
  }, [inModal]);

  // Android resizes the window for the keyboard; iOS needs the height.
  useEffect(() => {
    if (Platform.OS !== "ios") return undefined;
    const a = Keyboard.addListener("keyboardWillShow", (e) => setKb(e.endCoordinates?.height || 0));
    const b = Keyboard.addListener("keyboardWillHide", () => setKb(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 36 || g.vy > 0.6) dismiss();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const onTop = hosts[hosts.length - 1] === id;
  if (!shown || !onTop) return null;

  const k = KIND[shown.kind] || KIND.info;
  const bottom = kb ? kb + 12 : inModal ? Math.max(insets.bottom, 12) + 12 : Math.max(dockInset, insets.bottom + 16);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Animated.View
        {...pan.panHandlers}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            bottom,
            opacity: anim,
            transform: [
              { translateY: Animated.add(anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }), drag) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => dismiss()}
          style={styles.body}
          accessibilityHint="Dismisses this message"
        >
          <Animated.View
            style={[
              styles.icon,
              { backgroundColor: k.bg },
              {
                transform:
                  shown.kind === "coin"
                    ? [
                        { perspective: 300 },
                        { rotateY: icon.interpolate({ inputRange: [0, 1], outputRange: ["-540deg", "0deg"] }) },
                        { scale: icon.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.15, 1] }) },
                      ]
                    : [{ scale: icon.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              },
            ]}
          >
            <Icon name={k.icon} size={15} color={k.fg} strokeWidth={2.4} />
          </Animated.View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            {shown.title ? (
              <Text style={styles.title} numberOfLines={1}>
                {shown.title}
              </Text>
            ) : null}
            <Text style={[styles.message, !shown.title && { color: D.ink }]} numberOfLines={3}>
              {shown.message}
            </Text>
          </View>
        </TouchableOpacity>
        {shown.action ? (
          <TouchableOpacity
            onPress={runAction}
            style={styles.action}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={shown.action.label}
          >
            {shown.action.label === "Undo" ? <Icon name="undo" size={15} color={D.acc} strokeWidth={2.2} /> : null}
            <Text mono style={styles.actionText}>
              {shown.action.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Below AppLockGate (1000) so a locked app never shows toast content
  layer: { zIndex: 900, elevation: 900 },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    alignSelf: "center",
    maxWidth: 560,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#141A16",
    borderWidth: 1,
    borderColor: "#2A332E",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
    shadowColor: "#0C110E",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
  },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "600", color: D.ink },
  message: { fontSize: 13, lineHeight: 18, color: D.ink2 },
  action: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 40, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: D.acc },
});

export default ToastHost;
