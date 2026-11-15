// Mutual funds portfolio (Pulse design, "mf" artboard): current value at
// live NAV, returns, one row per scheme (tap to manage: invest more, redeem,
// edit or delete purchases) and a SIP calculator.
//
// Values come from the shared live feed, the same one F.I.R.E. and Goals
// use, so a NAV change moves all of them together.

import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { aggregateFunds } from "../../services/livePriceService";
import { usePortfolioLive, refreshPortfolio } from "../../services/portfolioLive";
import { P, themedStyles } from "../../theme/theme";
import { inr, inrCompact, pct, toNum } from "../../utils/format";
import {
  Text,
  TextInput,
  Card,
  Overline,
  Stat,
  SectionHeader,
  ScreenHeader,
  Button,
  Empty,
  Icon,
  Press,
  SkeletonRows,
  Updated,
} from "../../components/pulse";

// Future value of a monthly SIP (payments at the start of each month)
const sipFutureValue = (monthly, annualPct, years) => {
  const n = Math.round(years * 12);
  const r = annualPct / 100 / 12;
  if (n <= 0 || monthly <= 0) return 0;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};

const CalcRow = ({ label, value, onChangeText, suffix, last }) => (
  <View style={[styles.calcRow, last && { borderBottomWidth: 0 }]}>
    <Text style={styles.calcLabel}>{label}</Text>
    <View style={styles.calcValueWrap}>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ""))}
        keyboardType="numeric"
        style={styles.calcInput}
        selectTextOnFocus
        accessibilityLabel={label}
      />
      {suffix ? <Text mono style={styles.calcSuffix}>{suffix}</Text> : null}
    </View>
  </View>
);

const MFPortfolioScreen = ({ navigation }) => {
  const portfolio = usePortfolioLive();
  const funds = useMemo(() => aggregateFunds(portfolio.investments, portfolio.live), [portfolio]);
  const loading = !portfolio.loaded;
  const [refreshing, setRefreshing] = useState(false);
  const [sip, setSip] = useState("10000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("15");

  const totals = useMemo(() => {
    const invested = funds.reduce((s, f) => s + f.invested, 0);
    const value = funds.reduce((s, f) => s + f.current, 0);
    // Monthly SIP: the latest instalment of each SIP scheme
    const monthly = funds.filter((f) => f.sip).reduce((s, f) => s + (toNum(f.lots[0]?.amount) || 0), 0);
    const gain = value - invested;
    return { invested, value, gain, gainPct: invested ? (gain / invested) * 100 : 0, monthly };
  }, [funds]);

  const est = useMemo(() => {
    const m = toNum(sip);
    const y = toNum(years);
    const fv = sipFutureValue(m, toNum(rate), y);
    const paid = m * Math.round(y * 12);
    return { fv, paid, gain: fv - paid };
  }, [sip, rate, years]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio({ reload: true, force: true });
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader overline="Wealth" title="Mutual funds" />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.ink} colors={[P.ink]} />}
      >
        <Card style={{ padding: 18 }}>
          <View style={{ gap: 14 }}>
            <Overline>Current value</Overline>
            <Text style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
              {loading ? "—" : inrCompact(totals.value)}
            </Text>
            <View style={styles.statRow}>
              <Stat label="Invested" value={inrCompact(totals.invested)} />
              <Stat
                label="Returns"
                value={`${inrCompact(totals.gain, { sign: true })}`}
                color={totals.gain >= 0 ? P.pos : P.neg}
              />
              <Stat label="Monthly SIP" value={totals.monthly ? inr(totals.monthly) : "—"} />
            </View>
            <Updated at={portfolio.live?.at} prefix="NAVs" />
          </View>
        </Card>

        <SectionHeader
          title="Your funds"
          action={funds.length ? `${funds.length} scheme${funds.length === 1 ? "" : "s"}` : null}
        />
        {loading ? (
          <Card>
            <SkeletonRows count={3} />
          </Card>
        ) : funds.length === 0 ? (
          <Empty
            icon="chart"
            title="No mutual funds yet"
            message="Track a fund to see its value, returns and SIP here."
            action="Track a fund"
            onAction={() => navigation.navigate("MFScreen")}
          />
        ) : (
          <Card padded={false}>
            {funds.map((f, i) => {
              const type = [f.category, f.sip ? "SIP" : "Lumpsum"].filter(Boolean).join(" · ");
              return (
                <Press
                  key={f.key}
                  scaleTo={0.98}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("MFHolding", { fundKey: f.key, schemeName: f.name })}
                  style={[styles.fundRow, i === funds.length - 1 && { borderBottomWidth: 0 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, value ${inr(f.current)}, returns ${pct(f.pnlPct)}`}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={styles.fundName} numberOfLines={2}>
                      {f.name}
                    </Text>
                    {type ? <Text style={styles.fundType} numberOfLines={1}>{type}</Text> : null}
                    <Text mono style={styles.nav} numberOfLines={1}>
                      {f.units.toFixed(3)} u{f.nav ? ` · NAV ${inr(f.nav, { decimals: 2, reveal: true })}` : ""}
                      {f.goals.length ? ` · ${f.goals.join(", ")}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Text mono style={styles.fundValue}>{inr(f.current)}</Text>
                    <Text mono style={[styles.nav, { color: f.pnl >= 0 ? P.pos : P.neg }]}>
                      {inr(f.pnl, { sign: true })}
                    </Text>
                    <Text mono style={[styles.nav, { color: f.pnl >= 0 ? P.pos : P.neg }]}>{pct(f.pnlPct)}</Text>
                  </View>
                  <Icon name="chevron" size={16} color={P.mute} />
                </Press>
              );
            })}
          </Card>
        )}
        {funds.length ? <Text style={styles.footnote}>Tap a fund to invest more, redeem, or edit its purchases.</Text> : null}

        <SectionHeader title="SIP calculator" />
        <Card>
          <CalcRow label="Monthly SIP (₹)" value={sip} onChangeText={setSip} />
          <CalcRow label="Expected annual return" value={rate} onChangeText={setRate} suffix="%" />
          <CalcRow label="Time period" value={years} onChangeText={setYears} suffix="years" last />
          <View style={styles.calcResult}>
            <Overline>Estimated value</Overline>
            <Text style={styles.estValue}>{inrCompact(est.fv)}</Text>
            <Text style={styles.fundType}>
              You invest {inrCompact(est.paid)} · estimated gains {inrCompact(est.gain)}
            </Text>
          </View>
        </Card>

        <Button title="Track a new fund" icon="plus" variant="ghost" onPress={() => navigation.navigate("MFScreen")} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
    hero: { fontSize: 40, fontWeight: "600", letterSpacing: -1.2, lineHeight: 44, color: P.ink },
    statRow: { flexDirection: "row", gap: 12 },
    fundRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    fundValue: { fontSize: 15, fontWeight: "600", color: P.ink },
    footnote: { fontSize: 12, color: P.mute, textAlign: "center" },
    fundName: { fontSize: 16, fontWeight: "600", color: P.ink },
    fundType: { fontSize: 13, color: P.ink2 },
    nav: { fontSize: 12, color: P.mute },
    calcRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
      gap: 12,
    },
    calcLabel: { fontSize: 14, color: P.ink2, flex: 1 },
    calcValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    calcInput: {
      minWidth: 72,
      textAlign: "right",
      fontSize: 14,
      fontWeight: "600",
      color: P.ink,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: P.surf2,
    },
    calcSuffix: { fontSize: 13, color: P.mute },
    calcResult: { paddingTop: 14, gap: 4 },
    estValue: { fontSize: 32, fontWeight: "600", letterSpacing: -1, color: P.ink },
  })
);

export default MFPortfolioScreen;
