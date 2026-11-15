// Pulse status surfaces — how the app tells people about the state of
// their data rather than about an action they took.
//
//   <OfflineBanner />            app root: slim pill while there's no network
//   <Updated at={date} />        "Updated 3 min ago" — ticks while visible
//   <ErrorState onRetry />       a section or screen that failed to load
//   <CelebrationHost />          app root: draws celebrate() milestones

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import Icon from "./Icon";
import { Overline } from "./type";
import { Press } from "./feedback";
import { FadeIn } from "./motion";
import { P, PALETTES, themedStyles } from "../../theme/theme";
import { DURATION, EASE, SPRING, reduceMotion } from "../../ux/motion";
import { checkConnection, useOnline } from "../../ux/connectivity";
import { usePendingSync } from "../../services/offlineStore";
import { currentCelebration, dismissCelebration, subscribeCelebration } from "../../ux/celebrate";

const D = PALETTES.dark;

// ── Offline ─────────────────────────────────────────────────────────

/** Slides down from under the status bar while offline; tap to re-check. */
export const OfflineBanner = () => {
  const online = useOnline();
  const pending = usePendingSync();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(online ? 0 : 1)).current;
  const [shown, setShown] = useState(!online);

  useEffect(() => {
    if (!online) setShown(true);
    Animated.timing(y, {
      toValue: online ? 0 : 1,
      duration: online ? DURATION.quick : DURATION.layout,
      easing: online ? EASE.in : EASE.out,
      useNativeDriver: true,
    }).start(({ finished }) => finished && online && setShown(false));
  }, [online]);

  if (!shown) return null;
  // Changes made offline are kept on the phone and synced when the network is back
  const label = pending
    ? `${pending} change${pending === 1 ? "" : "s"} saved, will sync`
    : "showing saved data";
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 950, elevation: 950 }]}>
      <Animated.View
        style={[
          st.offline,
          {
            top: insets.top + 6,
            opacity: y,
            transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={checkConnection}
          style={st.offlineBody}
          accessibilityRole="alert"
          accessibilityLabel={`You're offline. ${label}. Tap to check again.`}
        >
          <Icon name="offline" size={14} color={D.amber} strokeWidth={2.2} />
          <Text style={st.offlineText}>Offline · {label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ── Freshness ───────────────────────────────────────────────────────

const ago = (t) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** "Updated 3 min ago" for live figures, so people can trust what they see. */
export const Updated = ({ at, prefix = "Updated", style }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const t = at instanceof Date ? at.getTime() : typeof at === "number" ? at : at ? new Date(at).getTime() : null;
  if (!t || !Number.isFinite(t)) return null;
  return (
    <View style={[st.updated, style]}>
      <Icon name="clock" size={11} color={P.mute} />
      <Overline size={10}>
        {prefix} {ago(t)}
      </Overline>
    </View>
  );
};

// ── Errors ──────────────────────────────────────────────────────────

/** Something failed to load: say what, offer a retry. `fill` centres it on the screen. */
export const ErrorState = ({ title = "Couldn't load this", message, onRetry, fill, style }) => (
  <FadeIn style={[fill && st.fill, style]}>
    <View style={st.error}>
      <View style={st.errorIcon}>
        <Icon name="alert" size={20} color={P.neg} />
      </View>
      <Text style={st.errorTitle}>{title}</Text>
      {message ? <Text style={st.errorMsg}>{message}</Text> : null}
      {onRetry ? (
        <Press onPress={onRetry} haptic="tap" scaleTo={0.95} style={st.retry} accessibilityRole="button">
          <Icon name="refresh" size={16} color={P.accInk} />
          <Text style={st.retryText}>Try again</Text>
        </Press>
      ) : null}
    </View>
  </FadeIn>
);

// ── Celebrations ────────────────────────────────────────────────────

const PARTICLES = 14;

const Burst = ({ run }) => {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [run]);
  const colors = [D.acc, P.amber, D.acc, P.pos, P.inv];
  return (
    <View pointerEvents="none" style={st.burst}>
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const a = (i / PARTICLES) * Math.PI * 2;
        const dist = 70 + (i % 3) * 18;
        return (
          <Animated.View
            key={i}
            style={[
              st.particle,
              {
                backgroundColor: colors[i % colors.length],
                width: i % 2 ? 6 : 8,
                height: i % 2 ? 6 : 8,
                opacity: p.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
                  { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
                  { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

/** Draws celebrations from ux/celebrate.js. Tap anywhere to dismiss. */
export const CelebrationHost = () => {
  const [c, setC] = useState(currentCelebration());
  const v = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      subscribeCelebration((next) => {
        if (next) {
          setC(next);
          v.setValue(0);
          Animated.spring(v, { toValue: 1, ...SPRING, useNativeDriver: true }).start();
        } else {
          Animated.timing(v, { toValue: 0, duration: DURATION.quick, useNativeDriver: true }).start(
            ({ finished }) => finished && !currentCelebration() && setC(null),
          );
        }
      }),
    [],
  );

  // Leaves on its own; long enough to read, short enough not to block
  useEffect(() => {
    if (!c) return undefined;
    const t = setTimeout(dismissCelebration, 3600);
    return () => clearTimeout(t);
  }, [c?.id]);

  if (!c) return null;
  const tone = { acc: [D.acc, D.accInk], amber: [P.amber, D.accInk], pos: [P.pos, "#FFFFFF"] }[c.tone] || [D.acc, D.accInk];
  const reduced = reduceMotion();
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 960, elevation: 960 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, st.scrim, { opacity: v }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissCelebration} accessibilityLabel="Close" />
      </Animated.View>
      <View pointerEvents="box-none" style={st.center}>
        <Animated.View
          style={[
            st.card,
            {
              opacity: v,
              transform: reduced ? [] : [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.95} onPress={dismissCelebration} style={{ alignItems: "center", gap: 10 }}>
            <View>
              {!reduced ? <Burst run={c.id} /> : null}
              <View style={[st.badge, { backgroundColor: tone[0] }]}>
                <Icon name={c.icon} size={30} color={tone[1]} strokeWidth={2} />
              </View>
            </View>
            {c.title ? <Text style={st.title}>{c.title}</Text> : null}
            {c.message ? <Text style={st.message}>{c.message}</Text> : null}
            <Overline color={D.mute} style={{ marginTop: 4 }}>
              Tap to continue
            </Overline>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const st = themedStyles(() =>
  StyleSheet.create({
    offline: {
      position: "absolute",
      alignSelf: "center",
      borderRadius: 999,
      backgroundColor: "#141A16",
      borderWidth: 1,
      borderColor: "#2A332E",
      shadowColor: "#0C110E",
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    offlineBody: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 34 },
    offlineText: { fontSize: 12, fontWeight: "600", color: D.ink },
    updated: { flexDirection: "row", alignItems: "center", gap: 4 },
    fill: { flex: 1, justifyContent: "center", padding: 24 },
    error: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: P.surf,
      borderWidth: 1,
      borderColor: P.line,
    },
    errorIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: P.negSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    errorTitle: { fontSize: 16, fontWeight: "600", color: P.ink, textAlign: "center" },
    errorMsg: { fontSize: 13, color: P.ink2, textAlign: "center", lineHeight: 18 },
    retry: {
      marginTop: 8,
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: P.acc,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    retryText: { fontSize: 14, fontWeight: "600", color: P.accInk },
    scrim: { backgroundColor: "rgba(6,9,7,0.55)" },
    center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 32 },
    card: {
      width: "100%",
      maxWidth: 320,
      borderRadius: 22,
      backgroundColor: "#141A16",
      borderWidth: 1,
      borderColor: "#2A332E",
      paddingVertical: 26,
      paddingHorizontal: 22,
    },
    burst: { position: "absolute", left: 36, top: 36, width: 0, height: 0, alignItems: "center", justifyContent: "center" },
    particle: { position: "absolute", borderRadius: 4 },
    badge: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 20, fontWeight: "700", color: D.ink, textAlign: "center", letterSpacing: -0.4 },
    message: { fontSize: 14, color: D.ink2, textAlign: "center", lineHeight: 20 },
  }),
);
