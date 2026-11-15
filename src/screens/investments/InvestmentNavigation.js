// Add investment — pick an asset class (same order and colours as the Wealth
// tab), talk to an advisor, and a few ground rules. Serves both the
// "AddInvestment" (Home) and "Investment" (Day view) routes.

import React, { useLayoutEffect, useState } from "react";
import { View, ScrollView, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { P, themedStyles } from "../../theme/theme";
import { Text, Card, ListRow, SectionHeader, ScreenHeader, Button } from "../../components/pulse";
import { ADVISORS, AdvisorCard, BookingSheet } from "../../components/AdvisorBooking";

const CLASSES = [
  { route: "MFScreen", title: "Mutual funds", sub: "Track a SIP or lumpsum at live NAV", color: "a1" },
  { route: "StocksScreen", title: "Stocks", sub: "Buy, sell and watch NSE / BSE shares", color: "a2" },
  { route: "FDScreen", title: "Fixed deposit", sub: "Principal, rate and maturity value", color: "a3" },
  { route: "SavingsScreen", title: "Savings", sub: "Bank balances that count towards goals", color: "a4" },
  { route: "RDScreen", title: "Recurring deposit", sub: "Monthly deposits and maturity", color: "a5" },
];

const HABITS = [
  { title: "Start early", body: "Compounding needs time more than money; small amounts started now beat large amounts started later." },
  { title: "Diversify", body: "Spread money across equity, debt and deposits so one bad year doesn't sink every goal." },
  { title: "Invest regularly", body: "A monthly SIP averages out market swings (rupee-cost averaging) and builds the habit." },
];

const InvestmentNavigation = () => {
  const navigation = useNavigation();
  const [booking, setBooking] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="New entry" title="Add investment" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={{ paddingVertical: 2 }}>
          {CLASSES.map((c, i) => (
            <ListRow
              key={c.route}
              title={c.title}
              subtitle={c.sub}
              left={<View style={[styles.swatch, { backgroundColor: P[c.color] }]} />}
              onPress={() => navigation.navigate(c.route)}
              chevron
              last={i === CLASSES.length - 1}
            />
          ))}
        </Card>
        <Text style={styles.note}>
          Link each investment to a goal and it counts towards that goal's progress, at live prices for stocks and funds.
        </Text>

        <SectionHeader title="Talk to an advisor" />
        {ADVISORS.map((a) => (
          <AdvisorCard key={a.id} advisor={a} onBook={setBooking} />
        ))}
        <Button title="Book an advisor call" variant="ghost" onPress={() => setBooking(ADVISORS[0])} />

        <SectionHeader title="Good habits" />
        <Card style={{ paddingVertical: 4 }}>
          {HABITS.map((h, i) => (
            <View key={h.title} style={[styles.habit, i === HABITS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.habitTitle}>{h.title}</Text>
              <Text style={styles.habitBody}>{h.body}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <BookingSheet advisor={booking} onClose={() => setBooking(null)} />
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
    swatch: { width: 10, height: 36, borderRadius: 3 },
    note: { fontSize: 12, lineHeight: 17, color: P.mute },
    habit: { paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: P.line },
    habitTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
    habitBody: { fontSize: 13, lineHeight: 19, color: P.ink2 },
  })
);

export default InvestmentNavigation;
