// Wealth — portfolio overview (Pulse design, "wealth" artboard).
// Live data: the user's investments from Firestore, stock prices and
// sparklines from Yahoo Finance.

import React, { useCallback, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/FirebaseConfig";
import { getInvestments } from "../../services/firestoreService";
import { getMultipleQuotes, getStockHistory } from "../../services/yahooFinanceService";
import { valueInvestment } from "../../services/livePriceService";
import { usePortfolioLive, refreshPortfolio } from "../../services/portfolioLive";
import { P, themedStyles } from "../../theme/theme";
import { inr, inrCompact, pct, toNum } from "../../utils/format";
import {
  Text,
  Icon,
  Card,
  Overline,
  Mono,
  SectionHeader,
  TitleHeader,
  Donut,
  Sparkline,
  Chip,
  Empty,
  Press,
  FadeIn,
  RowIn,
  CountUp,
  SkeletonRows,
  Updated,
} from "../../components/pulse";

const CLASSES = [
  { key: "mf", name: "Mutual Funds", color: "a1", route: "MFPortfolio", market: true },
  { key: "stock", name: "Stocks", color: "a2", route: "StocksScreen", market: true },
  { key: "fd", name: "Fixed Deposits", color: "a3", route: "FDScreen" },
  { key: "savings", name: "Savings", color: "a4", route: "SavingsScreen" },
  { key: "rd", name: "Recurring Deposits", color: "a5", route: "RDScreen" },
];

const WATCH_DEFAULT = ["INFY", "RELIANCE", "HDFCBANK", "TCS", "TATAMOTORS"];

const classOf = (inv) => {
  const t = String(inv.investmentType || "").toLowerCase();
  if (t.includes("mutual") || t.includes("sip") || t === "mf") return "mf";
  if (t.includes("stock")) return "stock";
  if (t.includes("fixed")) return "fd";
  if (t.includes("recurring")) return "rd";
  if (t.includes("saving")) return "savings";
  return null;
};

const cleanSymbol = (s) => String(s || "").toUpperCase().replace(/\.(NS|BO)$/, "");

const WealthScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState([]);
  const [marketAt, setMarketAt] = useState(null);

  // Allocation and gains come from the shared live feed, so they tick with
  // Home, F.I.R.E. and Goals.
  const portfolio = usePortfolioLive();
  const { rows, total, gains } = useMemo(() => {
    const invs = portfolio.investments;
    const live = portfolio.live;
    const agg = {};
      CLASSES.forEach((c) => (agg[c.key] = { invested: 0, value: 0, rate: [], count: 0 }));
      invs.forEach((inv) => {
        const k = classOf(inv);
        if (!k) return;
        const { invested, current: value } = valueInvestment(inv, live);
        agg[k].invested += invested;
        agg[k].value += value;
        agg[k].count += 1;
        if (toNum(inv.interestRate)) agg[k].rate.push(toNum(inv.interestRate));
      });

      const sum = CLASSES.reduce((a, c) => a + agg[c.key].value, 0);
      let marketGain = 0;
      const next = CLASSES.map((c) => {
        const a = agg[c.key];
        let ret;
        if (c.market) {
          const g = a.value - a.invested;
          marketGain += g;
          ret = a.invested ? { text: pct((g / a.invested) * 100), color: g >= 0 ? P.pos : P.neg } : null;
        } else if (a.rate.length) {
          const avg = a.rate.reduce((x, y) => x + y, 0) / a.rate.length;
          ret = { text: `${avg.toFixed(1)}% p.a.`, color: P.pos };
        }
        return { ...c, ...a, weight: sum ? a.value / sum : 0, ret };
      });

    return { rows: next, total: sum, gains: marketGain };
  }, [portfolio]);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const stockSymbols = [
        ...new Set(portfolio.investments.filter((i) => classOf(i) === "stock" && i.symbol).map((i) => cleanSymbol(i.symbol))),
      ];

      // Markets list: user's stocks first, topped up with large caps
      const watch = [...stockSymbols, ...WATCH_DEFAULT.filter((s) => !stockSymbols.includes(s))].slice(0, 5);
      const [wq, hist] = await Promise.all([
        getMultipleQuotes(watch.map((s) => `${s}.NS`)),
        Promise.all(watch.map((s) => getStockHistory(`${s}.NS`, "1mo", "1d").catch(() => null))),
      ]);
      const qBy = {};
      wq.forEach((q) => (qBy[cleanSymbol(q.symbol)] = q));
      setMarketAt(Date.now());
      setMarket(
        watch
          .map((s, i) => {
            const q = qBy[s];
            if (!q) return null;
            const prices = (hist[i]?.prices || hist[i]?.data?.map?.((d) => d.close) || []).filter(
              (v) => typeof v === "number"
            );
            return { symbol: s, name: q.shortName, price: q.regularMarketPrice, change: q.dayChangePercent || 0, spark: prices };
          })
          .filter(Boolean)
      );
    } catch (e) {
      console.warn("WealthScreen load failed", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [portfolio.investments]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeClasses = rows.filter((r) => r.count > 0).length;
  const go = (route, params) => navigation.navigate(route, params);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <TitleHeader overline={`Portfolio · ${activeClasses || 5} asset classes`} title="Wealth" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refreshPortfolio({ reload: true, force: true });
              load();
            }}
            tintColor={P.ink}
            colors={[P.ink]}
          />
        }
      >
        {/* Allocation donut + market gains */}
        <FadeIn>
        <Card style={{ padding: 16, marginTop: 2 }}>
          <View style={styles.heroRow}>
            <Donut
              size={128}
              stroke={16}
              segments={rows.filter((r) => r.value > 0).map((r) => ({ value: r.value, color: P[r.color] }))}
            >
              <Overline>Total</Overline>
              {!portfolio.loaded ? (
                <Mono size={18} weight="700">
                  —
                </Mono>
              ) : (
                <CountUp
                  id="wealth.total"
                  value={total}
                  format={inrCompact}
                  size={18}
                  weight="700"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ maxWidth: 90 }}
                />
              )}
            </Donut>
            <View style={{ flex: 1, gap: 8 }}>
              <Overline>Market gains</Overline>
              {!portfolio.loaded ? (
                <Mono size={22}>—</Mono>
              ) : (
                <CountUp
                  id="wealth.gains"
                  value={gains}
                  format={(v) => inrCompact(v, { sign: true })}
                  size={22}
                  color={gains >= 0 ? P.pos : P.neg}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                />
              )}
              <Text style={styles.heroNote}>Mutual funds and stocks, since you started tracking.</Text>
              <Updated at={portfolio.live?.at || portfolio.updatedAt} prefix="Prices" />
            </View>
          </View>
        </Card>
        </FadeIn>

        {/* Allocation rows */}
        <FadeIn delay={45}>
        <Card style={styles.listCard}>
          {rows.map((r, i) => (
            <RowIn key={r.key} index={i} delay={90}>
            <Press
              scaleTo={0.985}
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => go(r.route)}
              style={[styles.allocRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.swatch, { backgroundColor: P[r.color] }]} />
              <Text style={styles.allocName} numberOfLines={1}>
                {r.name}
              </Text>
              <Text mono style={styles.allocWeight}>
                {Math.round(r.weight * 100)}%
              </Text>
              <View style={styles.allocValue}>
                <Mono size={14}>{inrCompact(r.value)}</Mono>
                <Text mono style={{ fontSize: 11, color: r.ret ? r.ret.color : P.mute }}>
                  {r.ret ? r.ret.text : r.count ? "—" : "Add"}
                </Text>
              </View>
            </Press>
            </RowIn>
          ))}
        </Card>
        </FadeIn>

        {/* Markets */}
        <FadeIn delay={90} style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <SectionHeader title="Markets" action="Live" onAction={() => go("StocksScreen")} />
          <Updated at={marketAt} />
        </View>
        <Press scaleTo={0.97} accessibilityRole="button" style={styles.signalCard} onPress={() => go("BreakoutStocksScreen")}>
          <Icon name="bolt" size={22} color={P.accInk} strokeWidth={2} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.signalTitle}>Breakout signals</Text>
            <Text style={styles.signalSub}>Technical breakouts with T1 · T2 · T3 targets</Text>
          </View>
          <Icon name="arrowRight" size={20} color={P.accInk} />
        </Press>

        <Card style={styles.listCard}>
          {market.length === 0 ? (
            loading ? (
              <SkeletonRows count={4} />
            ) : (
              <View style={styles.marketDown}>
                <Text style={[styles.heroNote, { flex: 1 }]}>Live prices are unavailable right now.</Text>
                <Chip label="Retry" icon="refresh" onPress={load} />
              </View>
            )
          ) : (
            market.map((m, i) => {
              const up = m.change >= 0;
              return (
                <RowIn key={m.symbol} index={i}>
                <Press
                  scaleTo={0.985}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  onPress={() => go("StockDetail", { symbol: m.symbol, company: { name: m.name, symbol: m.symbol, exchange: "NSE" }, exchange: "NSE" })}
                  style={[styles.stockRow, i === market.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text mono style={styles.stockSym} numberOfLines={1}>
                    {m.symbol}
                  </Text>
                  <Sparkline values={m.spark} width={56} height={28} color={up ? P.pos : P.neg} />
                  <Text mono style={styles.stockPrice} numberOfLines={1}>
                    {inr(m.price, { decimals: 2, reveal: true })}
                  </Text>
                  <Text mono style={[styles.stockChg, { color: up ? P.pos : P.neg }]}>
                    {pct(m.change, { decimals: 2 })}
                  </Text>
                </Press>
                </RowIn>
              );
            })
          )}
        </Card>
        </FadeIn>

        {/* Add holding */}
        <SectionHeader title="Add holding" />
        <View style={styles.chips}>
          <Chip label="Mutual fund" icon="plus" onPress={() => go("MFScreen")} style={styles.addChip} />
          <Chip label="Stock" icon="plus" onPress={() => go("StockSearch")} style={styles.addChip} />
          <Chip label="FD" icon="plus" onPress={() => go("FDScreen")} style={styles.addChip} />
          <Chip label="RD" icon="plus" onPress={() => go("RDScreen")} style={styles.addChip} />
          <Chip label="Savings" icon="plus" onPress={() => go("SavingsScreen")} style={styles.addChip} />
        </View>

        {/* Advisor */}
        <Card>
          <View style={styles.advisorRow}>
            <Icon name="phone" size={20} color={P.ink} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.advisorTitle}>Investment advisor</Text>
              <Text style={styles.advisorSub}>Free appointment · review your allocation</Text>
            </View>
            <Chip
              label="Book"
              selected
              onPress={() => navigation.navigate("Plan", { screen: "FireNumber", params: { openAdvisor: true } })}
            />
          </View>
        </Card>

        {portfolio.loaded && total === 0 ? (
          <Empty
            icon="wallet"
            title="No holdings yet"
            message="Add a mutual fund, stock, FD, RD or savings account to see your allocation."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
    heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    heroNote: { fontSize: 12, color: P.ink2, lineHeight: 17 },
    marketDown: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    listCard: { paddingTop: 2, paddingBottom: 2 },
    allocRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    allocName: { flex: 1, fontSize: 14, fontWeight: "600", color: P.ink },
    allocWeight: { width: 36, textAlign: "right", fontSize: 12, color: P.mute },
    allocValue: { width: 84, alignItems: "flex-end", gap: 2 },
    signalCard: {
      backgroundColor: P.acc,
      padding: 16,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    signalTitle: { fontSize: 16, fontWeight: "700", color: P.accInk },
    signalSub: { fontSize: 12, color: P.accInk, opacity: 0.8 },
    stockRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    stockSym: { flex: 1, fontSize: 13, fontWeight: "700", color: P.ink },
    stockPrice: { width: 92, textAlign: "right", fontSize: 13, color: P.ink },
    stockChg: { width: 60, textAlign: "right", fontSize: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    addChip: { height: 40 },
    advisorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    advisorTitle: { fontSize: 14, fontWeight: "600", color: P.ink },
    advisorSub: { fontSize: 12, color: P.mute },
  })
);

export default WealthScreen;
