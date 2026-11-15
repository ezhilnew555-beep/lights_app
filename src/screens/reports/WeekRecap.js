// Weekly recap — the last 7 days told as a short, swipeable story:
// what you spent (vs the week before), where it went, your biggest day,
// your logging habit, and what you kept. Computed on the device from the
// user's transactions (ux/insights.weekRecap).

import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { auth } from "../../config/FirebaseConfig";
import { getTransactions } from "../../services/firestoreService";
import { P, themedStyles } from "../../theme/theme";
import { inr, DAYS_LONG, MONTHS_SHORT } from "../../utils/format";
import { weekRecap } from "../../ux/insights";
import { markSeen } from "../../ux/discovery";
import haptics from "../../ux/haptics";
import {
  Text,
  Icon,
  Overline,
  Mono,
  Button,
  Empty,
  ScreenHeader,
  ProgressBar,
  CountUp,
  FadeIn,
  ScreenSkeleton,
  ErrorState,
} from "../../components/pulse";
import { friendlyError } from "../../ux/toast";

const shortDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};
const weekday = (iso) => DAYS_LONG[new Date(`${iso}T12:00:00`).getDay()];

const Page = ({ width, overline, children, tone }) => (
  <View style={{ width, paddingHorizontal: 16 }}>
    <View style={[styles.page, tone === "acc" && { backgroundColor: P.acc, borderColor: P.acc }]}>
      <Overline color={tone === "acc" ? P.accInk : undefined}>{overline}</Overline>
      {children}
    </View>
  </View>
);

const WeekRecap = () => {
  const navigation = useNavigation();
  const [recap, setRecap] = useState(undefined); // undefined = loading, null = nothing logged
  const [error, setError] = useState(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setError(null);
    try {
      setRecap(weekRecap(await getTransactions(uid)));
      markSeen("weekRecap");
    } catch (e) {
      setError(friendlyError(e, "Your week couldn't be loaded."));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = <ScreenHeader overline="Weekly recap" title="Your week" />;

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {header}
        <ErrorState fill title="Couldn't load your week" message={error} onRetry={load} />
      </SafeAreaView>
    );
  }
  if (recap === undefined) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {header}
        <ScreenSkeleton rows={3} />
      </SafeAreaView>
    );
  }
  if (recap === null) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {header}
        <View style={{ padding: 16 }}>
          <Empty
            icon="calendar"
            title="Nothing logged last week"
            message="Log a few expenses this week and your recap will be ready next Monday."
            action="Add expense"
            onAction={() => navigation.navigate("Expenses", { openAdd: true })}
          />
        </View>
      </SafeAreaView>
    );
  }

  const r = recap;
  const range = `${shortDate(r.start)} – ${shortDate(r.end)}`;
  const top = r.categories.slice(0, 4);
  const topMax = top[0]?.amount || 1;
  const pages = [
    <Page key="spent" width={width} overline={`Spent · ${range}`}>
      <CountUp id="recap.spent" value={r.spent} format={inr} size={44} weight="700" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit />
      {r.change !== null ? (
        <Text style={[styles.lead, { color: r.change <= 0 ? P.pos : P.neg }]}>
          {r.change <= 0 ? `${Math.round(-r.change * 100)}% less` : `${Math.round(r.change * 100)}% more`} than the week before
          ({inr(r.prevSpent)})
        </Text>
      ) : (
        <Text style={styles.lead}>Your first full week tracked. Next week you'll see how it compares.</Text>
      )}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Overline>Earned</Overline>
          <Mono size={16} color={P.pos}>{inr(r.earned)}</Mono>
        </View>
        <View style={styles.stat}>
          <Overline>Invested</Overline>
          <Mono size={16} color={P.inv}>{inr(r.invested)}</Mono>
        </View>
      </View>
    </Page>,
    <Page key="where" width={width} overline="Where it went">
      {top.length ? (
        <View style={{ gap: 14, marginTop: 6 }}>
          {top.map((c) => (
            <View key={c.name} style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.cat} numberOfLines={1}>
                  {c.name}
                </Text>
                <Mono size={15}>{inr(c.amount)}</Mono>
              </View>
              <ProgressBar value={c.amount / topMax} color={P.neg} />
            </View>
          ))}
          {r.categories.length > top.length ? (
            <Text style={styles.note}>+ {r.categories.length - top.length} more categories</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.lead}>No spending logged last week.</Text>
      )}
    </Page>,
    <Page key="day" width={width} overline="Biggest day">
      {r.biggestDay ? (
        <>
          <Text style={styles.big}>{weekday(r.biggestDay.date)}</Text>
          <Mono size={28} weight="700">{inr(r.biggestDay.amount)}</Mono>
          <Text style={styles.lead}>
            {r.spent ? `${Math.round((r.biggestDay.amount / r.spent) * 100)}% of the week's spending, ` : ""}on{" "}
            {shortDate(r.biggestDay.date)}.
          </Text>
        </>
      ) : (
        <Text style={styles.lead}>A quiet week — no spending logged.</Text>
      )}
    </Page>,
    <Page key="habit" width={width} overline="Your habit">
      <Text style={styles.big}>
        {r.daysLogged} of 7 days
      </Text>
      <View style={styles.dots}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={[styles.dot, i < r.daysLogged && { backgroundColor: P.acc, borderColor: P.acc }]} />
        ))}
      </View>
      <Text style={styles.lead}>
        {r.daysLogged >= 6
          ? "Nearly every day. That's what makes your numbers trustworthy."
          : r.daysLogged >= 3
            ? "A good rhythm. Logging a little every day makes the month easier to read."
            : "Try logging once a day this week — the evening reminder helps."}
      </Text>
    </Page>,
    <Page key="kept" width={width} overline="What you kept" tone="acc">
      <Mono size={40} weight="700" color={P.accInk} numberOfLines={1} adjustsFontSizeToFit>
        {inr(r.net, { sign: true })}
      </Mono>
      <Text style={[styles.lead, { color: P.accInk }]}>
        {r.net >= 0 ? "Earned minus spent last week. Nice work." : "You spent more than you earned last week."}
      </Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        <Button
          title="Done"
          variant="dark"
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("CalendarMain"))}
        />
      </View>
    </Page>,
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {header}
      <View style={{ flex: 1 }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width ? (
          <FadeIn style={{ flex: 1 }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.x / width);
                if (i !== page) haptics.select();
                setPage(i);
              }}
            >
              {pages}
            </ScrollView>
          </FadeIn>
        ) : null}
      </View>
      <View style={styles.footer} accessibilityRole="adjustable" accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
        {pages.map((_, i) => (
          <View key={i} style={[styles.pageDot, i === page && styles.pageDotOn]} />
        ))}
        <View style={{ flex: 1 }} />
        {page < pages.length - 1 ? (
          <View style={styles.swipeHint}>
            <Text style={styles.note}>Swipe</Text>
            <Icon name="arrowRight" size={14} color={P.mute} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    page: {
      flex: 1,
      marginBottom: 8,
      padding: 22,
      gap: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: P.line,
      backgroundColor: P.surf,
      justifyContent: "center",
    },
    hero: { letterSpacing: -1.6 },
    big: { fontSize: 30, fontWeight: "600", letterSpacing: -0.9, color: P.ink },
    lead: { fontSize: 15, lineHeight: 22, color: P.ink2 },
    note: { fontSize: 12, color: P.mute },
    stats: { flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line },
    stat: { flex: 1, gap: 6 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    cat: { flex: 1, fontSize: 15, fontWeight: "600", color: P.ink },
    dots: { flexDirection: "row", gap: 8, marginVertical: 4 },
    dot: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: P.line, backgroundColor: P.surf2 },
    footer: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
    pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.line },
    pageDotOn: { width: 20, backgroundColor: P.ink },
    swipeHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  }),
);

export default WeekRecap;
