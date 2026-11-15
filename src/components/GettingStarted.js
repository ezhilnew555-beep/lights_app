// Getting Started — a first-week checklist on Home. Each step is checked off
// by doing the real thing (not by tapping the row), steps are ordered by
// what the person said they care about in onboarding, and the card retires
// for good once everything is done or it's dismissed.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, Icon, Card, Overline, ProgressBar, Press, FadeIn } from "./pulse";
import { P, themedStyles } from "../theme/theme";
import { animateLayout } from "../ux/motion";
import { celebrateOnce } from "../ux/celebrate";
import { useFocus, useSeen } from "../ux/discovery";
import haptics from "../ux/haptics";

const DISMISSED = "ux.checklist.dismissed";

const STEPS = {
  profile: { title: "Add your age and retirement age", sub: "Unlocks your F.I.R.E. number", route: "Profile" },
  expense: { title: "Log your first expense", sub: "Takes about ten seconds", route: "Expenses", params: { openAdd: true } },
  invest: { title: "Add an investment", sub: "FD, fund, stock, RD or savings", route: "AddInvestment" },
  fire: { title: "See your F.I.R.E. plan", sub: "Your number and the SIP to reach it", route: "Plan", params: { screen: "FireNumber" } },
};

const ORDER = {
  spend: ["expense", "profile", "fire", "invest"],
  invest: ["invest", "profile", "fire", "expense"],
  fire: ["profile", "fire", "invest", "expense"],
  default: ["expense", "profile", "invest", "fire"],
};

/**
 * @param {boolean} ready          data has loaded (don't flash a wrong state)
 * @param {object}  done           { profile, expense, invest } from Home's data
 * @param {(route, params) => void} onGo
 * @param {string}  uid
 */
const GettingStarted = ({ ready, done, onGo, uid }) => {
  const { focus, loaded: focusLoaded } = useFocus();
  const seen = useSeen(["fire"]);
  const [dismissed, setDismissed] = useState(null);
  const shown = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED)
      .then((v) => setDismissed(v === "1"))
      .catch(() => setDismissed(false));
  }, []);

  const state = { ...done, fire: seen.fire };
  const order = ORDER[focus] || ORDER.default;
  const complete = order.filter((k) => state[k]).length;
  const allDone = complete === order.length;

  const retire = () => {
    animateLayout();
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED, "1").catch(() => {});
  };

  ready = ready && seen.loaded && focusLoaded;

  // Everything done: one celebration (only if they saw the card while
  // working through it — not for someone who'd done it all already)
  useEffect(() => {
    if (!ready || dismissed !== false || !allDone) return;
    if (!shown.current) {
      retire();
      return;
    }
    celebrateOnce(`setup.${uid || "me"}`, {
      icon: "check2",
      title: "You're all set up",
      message: "Spending, investments and your F.I.R.E. plan are all connected now.",
    });
    retire();
  }, [ready, dismissed, allDone]);

  if (!ready || dismissed !== false || allDone) return null;
  shown.current = true;

  return (
    <FadeIn>
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={styles.head}>
          <View style={{ flex: 1, gap: 4 }}>
            <Overline>Getting started · {complete} of {order.length}</Overline>
            <Text style={styles.title}>Set up LigthsON in a few minutes</Text>
          </View>
          <Press scaleTo={0.96} activeOpacity={0.7}
            onPress={() => {
              haptics.tap();
              retire();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Hide getting started"
          >
            <Icon name="close" size={16} color={P.mute} />
          </Press>
        </View>
        <ProgressBar value={complete / order.length} color={P.acc} height={5} />
        <View>
          {order.map((k, i) => {
            const s = STEPS[k];
            const ok = !!state[k];
            return (
              <Press
                key={k}
                scaleTo={0.985}
                disabled={ok}
                onPress={() => onGo(s.route, s.params)}
                accessibilityRole="button"
                accessibilityState={{ checked: ok, disabled: ok }}
                accessibilityLabel={`${s.title}${ok ? ", done" : ""}`}
                style={[styles.row, i === order.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Icon name={ok ? "check2" : "circle"} size={20} color={ok ? P.pos : P.mute} strokeWidth={ok ? 2.2 : 1.6} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[styles.step, ok && styles.stepDone]}>{s.title}</Text>
                  {!ok ? <Text style={styles.sub}>{s.sub}</Text> : null}
                </View>
                {!ok ? <Icon name="chevron" size={16} color={P.mute} /> : null}
              </Press>
            );
          })}
        </View>
      </Card>
    </FadeIn>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    title: { fontSize: 16, fontWeight: "600", color: P.ink },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    step: { fontSize: 14, fontWeight: "600", color: P.ink },
    stepDone: { color: P.mute, fontWeight: "400", textDecorationLine: "line-through" },
    sub: { fontSize: 12, color: P.mute },
  }),
);

export default GettingStarted;
