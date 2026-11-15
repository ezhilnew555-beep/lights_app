// Onboarding (Pulse design, "onboard" artboard): data-card illustration,
// big headline, page dots and a lime Continue button.

import React, { useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, StatusBar, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swiper from "react-native-swiper";
import { animateLayout } from "../../ux/motion";
import { P, themedStyles } from "../../theme/theme";
import { LigthsOnMark } from "../../components/brand/LigthsOnLogo";
import { Text, Card, Overline, Mono, ProgressBar, Ring, Button, LegendDot, Icon, Press } from "../../components/pulse";
import { setFocus } from "../../ux/discovery";
import haptics from "../../ux/haptics";

const SpendMix = () => (
  <Card style={{ padding: 18 }}>
    <View style={{ gap: 14 }}>
      <View style={s.rowBetween}>
        <Overline>Spend mix · this month</Overline>
        <Mono size={12} weight="400" color={P.accTx}>
          ₹46,380
        </Mono>
      </View>
      {[
        ["Essential", 0.54, P.a1],
        ["Mandatory", 0.32, P.a2],
        ["Discretionary", 0.14, P.a3],
      ].map(([n, v, c]) => (
        <View key={n} style={{ gap: 6 }}>
          <View style={s.rowBetween}>
            <Text style={s.label}>{n}</Text>
            <Mono size={13} weight="400">
              {Math.round(v * 100)}%
            </Mono>
          </View>
          <ProgressBar value={v} color={c} height={10} />
        </View>
      ))}
    </View>
  </Card>
);

const CalendarDots = () => {
  const days = Array.from({ length: 14 }, (_, i) => i + 8);
  const flags = { 8: "ei", 9: "e", 10: "ev", 11: "e", 12: "e", 14: "ei", 15: "e", 16: "ev", 18: "e", 19: "e", 21: "e", 22: "ie" };
  return (
    <Card style={{ padding: 18 }}>
      <View style={{ gap: 10 }}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>Every rupee, every day</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <LegendDot color={P.pos} label="In" />
            <LegendDot color={P.neg} label="Out" />
            <LegendDot color={P.inv} label="Inv" />
          </View>
        </View>
        <View style={s.grid}>
          {days.map((d) => {
            const f = flags[d] || "";
            const today = d === 21;
            return (
              <View key={d} style={s.cell}>
                <View style={[s.day, today && { backgroundColor: P.acc }]}>
                  <Text mono style={{ fontSize: 13, fontWeight: today ? "700" : "500", color: today ? P.accInk : P.ink }}>
                    {d}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {["i", "e", "v"].map((k) => (
                    <View
                      key={k}
                      style={[
                        s.dot,
                        { backgroundColor: f.includes(k) ? { i: P.pos, e: P.neg, v: P.inv }[k] : "transparent" },
                      ]}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
};

const IncomeBars = () => {
  const bars = [
    ["Apr", 88, 46],
    ["May", 91, 44],
    ["Jun", 94, 52],
    ["Jul", 96, 39],
    ["Aug", 98, 46],
    ["Sep", 100, 41],
  ];
  return (
    <Card style={{ padding: 18 }}>
      <View style={{ gap: 14 }}>
        <View style={s.rowBetween}>
          <Overline>Income vs expense</Overline>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <LegendDot color={P.pos} label="In" square />
            <LegendDot color={P.neg} label="Out" square />
          </View>
        </View>
        <View style={s.bars}>
          {bars.map(([m, i, e]) => (
            <View key={m} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                <View style={[s.bar, { height: i, backgroundColor: P.pos }]} />
                <View style={[s.bar, { height: e, backgroundColor: P.neg }]} />
              </View>
              <Text style={{ fontSize: 12, color: P.mute }}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
};

const FireCard = () => (
  <Card style={{ padding: 20, alignItems: "center", gap: 12 }}>
    <Ring size={150} stroke={12} value={0.122}>
      <Mono size={30} weight="700">
        12.2%
      </Mono>
      <Overline>to freedom</Overline>
    </Ring>
    <Overline>Your F.I.R.E. number</Overline>
    <Mono size={26} weight="700">
      ₹3.48 Cr
    </Mono>
  </Card>
);

// Last step: what to start with. Optional — it only orders the Getting
// Started checklist on Home; every feature stays one tap away.
const FOCUS_OPTIONS = [
  { value: "spend", icon: "expense", title: "Track my spending", sub: "Log daily and see where money goes" },
  { value: "invest", icon: "chart", title: "Grow my investments", sub: "Funds, stocks, FDs in one place" },
  { value: "fire", icon: "target", title: "Plan early retirement", sub: "My F.I.R.E. number and the SIP for it" },
];

const FocusPicker = ({ value, onChange }) => (
  <View style={{ gap: 10 }} accessibilityRole="radiogroup">
    {FOCUS_OPTIONS.map((o) => {
      const on = value === o.value;
      return (
        <Press
          key={o.value}
          scaleTo={0.98}
          onPress={() => {
            haptics.select();
            onChange(on ? null : o.value);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`${o.title}. ${o.sub}`}
          style={[s.focus, on && s.focusOn]}
        >
          <View style={[s.focusIcon, on && { backgroundColor: P.acc }]}>
            <Icon name={o.icon} size={20} color={on ? P.accInk : P.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.focusTitle}>{o.title}</Text>
            <Text style={s.focusSub}>{o.sub}</Text>
          </View>
          <Icon name={on ? "check2" : "circle"} size={20} color={on ? P.accTx : P.line} strokeWidth={on ? 2.2 : 1.6} />
        </Press>
      );
    })}
  </View>
);

const SLIDES = [
  {
    art: SpendMix,
    title: "Your financial life. All in one screen.",
    body: "Mandatory for rent, loans and school fees. Essential for groceries and utilities. Discretionary for shopping, travel and dining.",
  },
  {
    art: CalendarDots,
    title: "See every day at a glance.",
    body: "Income, expenses and investments land on one calendar, so you always know where the month is going.",
  },
  {
    art: IncomeBars,
    title: "Manage all your income.",
    body: "Salary, freelancing, interest and refunds — tracked alongside your portfolio value, month after month.",
  },
  {
    art: FireCard,
    title: "Know your F.I.R.E. number.",
    body: "Based on what you spend and invest, LigthsON calculates your number and the SIP needed to retire on your terms.",
  },
  {
    choice: true,
    title: "Where do you want to start?",
    body: "We'll put it first on your Home screen. You can skip this.",
  },
];

const OnboardingScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focus, setFocusChoice] = useState(null);
  const swiperRef = useRef(null);
  const last = currentIndex === SLIDES.length - 1;

  const finish = async () => {
    if (focus) setFocus(focus);
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (error) {
      console.error("❌ Error setting onboarding flag:", error);
    }
    navigation.replace("SplashScreen");
  };

  const handleNext = () => {
    if (!last) swiperRef.current?.scrollBy(1);
    else finish();
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <View style={s.top}>
        <View style={s.brand}>
          <LigthsOnMark size={30} />
          <Text style={s.brandText}>LigthsON</Text>
        </View>
        {!last ? (
          <Press scaleTo={0.96} activeOpacity={0.7} onPress={finish} style={s.skip} accessibilityRole="button">
            <Text style={s.skipText}>Skip</Text>
          </Press>
        ) : null}
      </View>

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        onIndexChanged={(index) => {
          // The active page dot stretches into place instead of snapping
          animateLayout();
          setCurrentIndex(index);
        }}
      >
        {SLIDES.map((slide, index) => {
          const Art = slide.art;
          if (slide.choice) {
            return (
              <View key={index} style={s.slide}>
                <Text style={[s.title, isCompact && { fontSize: 32, lineHeight: 34 }]}>{slide.title}</Text>
                <Text style={s.body}>{slide.body}</Text>
                <View style={{ marginTop: 8 }}>
                  <FocusPicker value={focus} onChange={setFocusChoice} />
                </View>
              </View>
            );
          }
          return (
            <View key={index} style={s.slide}>
              <View style={{ marginTop: 12 }}>
                <Art />
              </View>
              <Text style={[s.title, isCompact && { fontSize: 32, lineHeight: 34 }]}>{slide.title}</Text>
              <Text style={s.body}>{slide.body}</Text>
            </View>
          );
        })}
      </Swiper>

      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.pageDot, i === currentIndex && s.pageDotOn]} />
          ))}
        </View>
        <Button title={last ? "Get started" : "Continue"} icon={last ? undefined : undefined} onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
};

const s = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    top: {
      paddingTop: 16,
      paddingHorizontal: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 8 },
    mark: { width: 28, height: 28, borderRadius: 8, backgroundColor: P.acc, alignItems: "center", justifyContent: "center" },
    markText: { fontSize: 15, fontWeight: "700", color: P.accInk },
    brandText: { fontSize: 17, fontWeight: "600", color: P.ink },
    skip: { height: 44, paddingHorizontal: 8, justifyContent: "center" },
    skipText: { fontSize: 14, fontWeight: "600", color: P.ink2 },
    slide: { flex: 1, paddingHorizontal: 20, gap: 20 },
    title: { fontSize: 38, lineHeight: 40, letterSpacing: -1.5, fontWeight: "600", color: P.ink, marginTop: 8 },
    body: { fontSize: 15, lineHeight: 23, color: P.ink2 },
    footer: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
    dots: { flexDirection: "row", gap: 6 },
    pageDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: P.line },
    focus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: P.line,
      backgroundColor: P.surf,
    },
    focusOn: { borderColor: P.ink },
    focusIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: P.surf2, alignItems: "center", justifyContent: "center" },
    focusTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
    focusSub: { fontSize: 12, color: P.mute },
    pageDotOn: { width: 24, backgroundColor: P.acc },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { fontSize: 13, color: P.ink },
    cardTitle: { fontSize: 16, fontWeight: "600", color: P.ink },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: "14.2857%", height: 44, alignItems: "center", justifyContent: "center", gap: 3 },
    day: { width: 30, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    dot: { width: 4, height: 4, borderRadius: 2 },
    bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 128 },
    bar: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  })
);

export default OnboardingScreen;
