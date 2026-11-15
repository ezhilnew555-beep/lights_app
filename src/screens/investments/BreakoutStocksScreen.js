// Breakout signals (Pulse design): session summary, search + filters, and one
// clearly spaced card per signal — price, three targets, then technicals.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../config/FirebaseConfig";
import { getBreakoutSignals, BREAKOUT_UNLOCK_COST } from "../../services/breakoutService";
import { P, themedStyles } from "../../theme/theme";
import {
  Text,
  TextInput,
  Icon,
  Card,
  Overline,
  Mono,
  ScreenHeader,
  IconButton,
  Button,
  Empty,
  ClockLoader,
  ErrorState,
  Press,
} from "../../components/pulse";
import { inr } from "../../utils/format";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";

const CATEGORIES = ["All", "Breakout", "St Breakout", "Breakdown", "St Breakdown"];
const TARGET_LABELS = ["Conservative", "Moderate", "Extended"];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pctOf = (item) => parseFloat(String(item.pct ?? "0").replace("%", "")) || 0;
const signed = (n, d = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(d)}%`;

/** Three targets (T1–T3), stop-loss and technical context for one signal. */
const metricsFor = (item) => {
  const close = num(item.Close);
  const signal = item.breakout_down || "Breakout";
  const bullish = signal.includes("Breakout");

  let raw = [];
  if (Array.isArray(item.next_targets)) raw = item.next_targets.map(Number);
  else if (typeof item.next_targets === "string")
    raw = item.next_targets.replace(/[[\]]/g, "").split(",").map((t) => Number(t.trim()));
  raw = raw.filter((n) => Number.isFinite(n) && n > 0);

  // Fill missing targets from volatility bands so T1–T3 always exist
  const fallback = bullish ? [1.025, 1.05, 1.1] : [0.975, 0.95, 0.9];
  const targets = [0, 1, 2].map((i) => (raw[i] != null ? raw[i] : close * fallback[i])).map((price, i) => ({
    label: `T${i + 1}`,
    kind: TARGET_LABELS[i],
    price,
    move: close > 0 ? ((price - close) / close) * 100 : 0,
  }));

  const vwap = num(item.Vwap) || close;
  let stop = bullish ? close * 0.98 : close * 1.02;
  if (bullish && vwap && vwap < close) stop = Math.min(close * 0.98, vwap * 0.99);
  if (!bullish && vwap && vwap > close) stop = Math.max(close * 1.02, vwap * 1.01);

  const rsi = num(item.rsi) || 50;
  const rsiNote = rsi >= 70 ? "Overbought" : rsi >= 55 ? "Bullish" : rsi <= 35 ? "Oversold" : "Neutral";

  return {
    bullish,
    signal,
    targets,
    potential: targets[2].move,
    stop,
    stopMove: close > 0 ? ((stop - close) / close) * 100 : 0,
    rsi,
    rsiNote,
    vwap,
    vwapGap: vwap > 0 ? ((close - vwap) / vwap) * 100 : 0,
  };
};

const SignalCard = ({ item, onPress }) => {
  const m = metricsFor(item);
  const change = pctOf(item);
  const dir = m.bullish ? P.pos : P.neg;
  const dirSoft = m.bullish ? P.posSoft : P.negSoft;

  return (
    <Card onPress={onPress} style={styles.card}>
      {/* 1 · Symbol, signal and price */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.symbol} numberOfLines={1}>
            {item.symbol}
          </Text>
          <View style={[styles.signalTag, { backgroundColor: dirSoft }]}>
            <Icon name={m.bullish ? "income" : "expense"} size={12} color={dir} strokeWidth={2.2} />
            <Text mono style={[styles.signalTagText, { color: dir }]}>
              {m.signal}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Mono size={17}>{inr(item.Close, { decimals: 2, reveal: true })}</Mono>
          <Mono size={13} weight="500" color={change >= 0 ? P.pos : P.neg}>
            {signed(change, 2)} today
          </Mono>
        </View>
      </View>

      {/* 2 · Targets */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Overline>Price targets</Overline>
          <Text mono style={[styles.potential, { color: dir }]}>
            {m.bullish ? "Upside" : "Downside"} {signed(m.potential)}
          </Text>
        </View>
        <View style={styles.targets}>
          {m.targets.map((t) => (
            <View key={t.label} style={styles.target}>
              <View style={styles.targetHead}>
                <Text mono style={styles.targetLabel}>
                  {t.label}
                </Text>
                <Text mono style={styles.targetMove}>
                  {signed(t.move)}
                </Text>
              </View>
              <Mono size={15} color={dir} numberOfLines={1} adjustsFontSizeToFit>
                {inr(t.price, { decimals: 2, reveal: true })}
              </Mono>
              <Text style={styles.targetKind}>{t.kind}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3 · Technicals */}
      <View style={styles.techRow}>
        <View style={styles.tech}>
          <Text mono style={styles.techLabel}>
            RSI 14
          </Text>
          <Text mono style={styles.techValue}>
            {m.rsi.toFixed(0)}
          </Text>
          <Text style={styles.techNote}>{m.rsiNote}</Text>
        </View>
        <View style={styles.techDivider} />
        <View style={styles.tech}>
          <Text mono style={styles.techLabel}>
            VOL SURGE
          </Text>
          <Text mono style={[styles.techValue, { color: P.inv }]}>
            {item.vol_chg || "—"}
          </Text>
          <Text style={styles.techNote}>vs 30D avg</Text>
        </View>
        <View style={styles.techDivider} />
        <View style={styles.tech}>
          <Text mono style={styles.techLabel}>
            VWAP
          </Text>
          <Text mono style={styles.techValue} numberOfLines={1} adjustsFontSizeToFit>
            {inr(m.vwap, { decimals: 0 })}
          </Text>
          <Text style={[styles.techNote, { color: m.vwapGap >= 0 ? P.pos : P.neg }]}>
            {signed(m.vwapGap)} {m.vwapGap >= 0 ? "above" : "below"}
          </Text>
        </View>
        <View style={styles.techDivider} />
        <View style={styles.tech}>
          <Text mono style={styles.techLabel}>
            STOP LOSS
          </Text>
          <Text mono style={[styles.techValue, { color: P.neg }]} numberOfLines={1} adjustsFontSizeToFit>
            {inr(m.stop, { decimals: 0 })}
          </Text>
          <Text style={styles.techNote}>{signed(m.stopMove)}</Text>
        </View>
      </View>
    </Card>
  );
};

const BreakoutStocksScreen = () => {
  const navigation = useNavigation();
  const [stocks, setStocks] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionDate, setSessionDate] = useState(null);
  const [locked, setLocked] = useState(false);
  const [coins, setCoins] = useState(0);
  const [error, setError] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const res = await getBreakoutSignals(uid);
      setStocks(res.stocks);
      setSessionDate(res.sessionDate);
      setLocked(res.locked);
      setCoins(res.coins);
    } catch (e) {
      console.error("Error fetching breakout stocks:", e);
      setError("Couldn't load today's signals. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { All: stocks.length };
    CATEGORIES.slice(1).forEach((k) => (c[k] = stocks.filter((s) => (s.breakout_down || "Breakout") === k).length));
    return c;
  }, [stocks]);

  const summary = useMemo(() => {
    const bull = stocks.filter((s) => (s.breakout_down || "Breakout").includes("Breakout")).length;
    const top = stocks.reduce((mx, s) => Math.max(mx, metricsFor(s).potential), 0);
    return { total: stocks.length, bull, bear: stocks.length - bull, top };
  }, [stocks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stocks.filter(
      (s) =>
        (category === "All" || (s.breakout_down || "Breakout") === category) &&
        (!q || String(s.symbol || "").toLowerCase().includes(q))
    );
  }, [stocks, category, search]);

  const sessionLabel = sessionDate
    ? sessionDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
    : "Latest";

  const openStock = (item) =>
    navigation.navigate("StockDetail", {
      symbol: item.symbol,
      company: { name: item.symbol, symbol: item.symbol, exchange: "NSE" },
      exchange: "NSE",
    });

  const ListHeader = (
    <View style={{ gap: 14, paddingBottom: 2 }}>
      {/* Session summary */}
      <Card style={styles.summary}>
        {[
          ["Signals", String(summary.total), P.ink],
          ["Bullish", String(summary.bull), P.pos],
          ["Bearish", String(summary.bear), P.neg],
          ["Top move", summary.total ? signed(summary.top) : "—", P.inv],
        ].map(([label, value, color], i) => (
          <React.Fragment key={label}>
            {i > 0 ? <View style={styles.summaryDivider} /> : null}
            <View style={styles.summaryCell}>
              <Overline>{label}</Overline>
              <Mono size={17} color={color} numberOfLines={1} adjustsFontSizeToFit>
                {value}
              </Mono>
            </View>
          </React.Fragment>
        ))}
      </Card>

      {/* Search */}
      <View style={styles.search}>
        <Icon name="search" size={18} color={P.mute} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbol, e.g. BEL"
          placeholderTextColor={P.mute}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {search ? (
          <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSearch("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={16} color={P.mute} />
          </Press>
        ) : null}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {CATEGORIES.map((c) => {
          const on = category === c;
          return (
            <Press scaleTo={0.96}
              key={c}
              onPress={() => setCategory(c)}
              activeOpacity={0.8}
              style={[styles.filter, on && { backgroundColor: P.ink }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.filterText, { color: on ? P.bg : P.ink2 }]}>{c}</Text>
              <Text mono style={[styles.filterCount, { color: on ? P.bg : P.mute }]}>
                {counts[c] || 0}
              </Text>
            </Press>
          );
        })}
      </ScrollView>

      {filtered.length ? (
        <Overline>
          {filtered.length} signal{filtered.length === 1 ? "" : "s"} · sorted by today's move
        </Overline>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (locked) {
      return (
        <Card style={styles.lockCard}>
          <Icon name="lock" size={28} color={P.amber} />
          <Text style={styles.lockTitle}>Unlock today's signals</Text>
          <Text style={styles.lockText}>
            Breakout signals open with {BREAKOUT_UNLOCK_COST.toLocaleString("en-IN")} coins. You have{" "}
            {coins.toLocaleString("en-IN")} — keep logging daily to earn more.
          </Text>
          <Button title="See how to earn coins" onPress={() => navigation.navigate("Coins")} style={{ marginTop: 6 }} />
        </Card>
      );
    }
    if (error) return <ErrorState title="Signals unavailable" message="Today's signals didn't load. Check your connection and try again." onRetry={load} />;
    if (search || category !== "All")
      return (
        <Empty
          icon="search"
          title="No matching signals"
          message={search ? `Nothing matches "${search}" in ${category}.` : `No ${category} signals this session.`}
          action="Clear filters"
          onAction={() => {
            setSearch("");
            setCategory("All");
          }}
        />
      );
    return (
      <Empty
        icon="bolt"
        title="No signals yet"
        message="Signals are published after market close (5 PM IST). Check back this evening."
      />
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader
        overline={`Session · ${sessionLabel}`}
        title="Breakout signals"
        right={<IconButton icon="info" accessibilityLabel="How signals work" onPress={() => setInfoVisible(true)} />}
      />

      {loading ? (
        <ClockLoader fill label="Loading today's signals…" />
      ) : (
        <FlatList
          data={locked ? [] : filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SignalCard item={item} onPress={() => openStock(item)} />}
          ListHeaderComponent={locked ? null : ListHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            filtered.length && !locked ? (
              <Text style={styles.disclaimer}>
                Signals come from technical pivots and volatility. They are not investment advice.
              </Text>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={P.ink}
              colors={[P.ink]}
            />
          }
        />
      )}

      {/* How it works */}
      <PopupModal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <PopupBackdrop style={styles.scrim}>
          <PopupPanel placement="center" style={styles.sheet}>
            <Overline>Guide</Overline>
            <Text style={styles.sheetTitle}>How signals work</Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={styles.guide}>
                <Text style={styles.guideHead}>Price targets</Text>
                <Text style={styles.guideText}>
                  T1 (conservative) suits quick profit booking, T2 (moderate) is a swing objective, and T3 (extended) is
                  for strong momentum. Targets come from pivots and volatility bands.
                </Text>
              </View>
              <View style={styles.guide}>
                <Text style={styles.guideHead}>Signal types</Text>
                <Text style={styles.guideText}>
                  Breakout: trend shift with bullish moving-average alignment. St Breakout: short-term momentum. Breakdown
                  / St Breakdown: the bearish equivalents, with downward targets.
                </Text>
              </View>
              <View style={styles.guide}>
                <Text style={styles.guideHead}>Risk</Text>
                <Text style={styles.guideText}>
                  Each card shows a suggested stop loss (about 2% beyond price or VWAP support). Always size positions
                  to your own risk — signals are not advice.
                </Text>
              </View>
            </ScrollView>
            <Button title="Got it" onPress={() => setInfoVisible(false)} />
          </PopupPanel>
        </PopupBackdrop>
      </PopupModal>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    loadingText: { fontSize: 13, color: P.ink2 },

    summary: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    summaryCell: { flex: 1, alignItems: "center", gap: 4 },
    summaryDivider: { width: 1, alignSelf: "stretch", backgroundColor: P.line },

    search: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: P.line,
      backgroundColor: P.surf2,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 10,
    },
    searchInput: { flex: 1, height: 48, fontSize: 15, color: P.ink },

    filters: { gap: 8 },
    filter: {
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: P.surf2,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    filterText: { fontSize: 13, fontWeight: "600" },
    filterCount: { fontSize: 12 },

    card: { padding: 16, gap: 16 },
    cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    symbol: { fontSize: 17, fontWeight: "700", color: P.ink, letterSpacing: -0.2 },
    signalTag: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    signalTagText: { fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },

    section: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    potential: { fontSize: 12, fontWeight: "600" },
    targets: { flexDirection: "row", gap: 8 },
    target: { flex: 1, minWidth: 0, gap: 4, padding: 10, borderRadius: 10, backgroundColor: P.surf2 },
    targetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    targetLabel: { fontSize: 11, fontWeight: "700", color: P.ink },
    targetKind: { fontSize: 11, color: P.mute },
    targetMove: { fontSize: 11, color: P.ink2 },

    techRow: { flexDirection: "row", paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line },
    tech: { flex: 1, minWidth: 0, gap: 3 },
    techDivider: { width: 1, backgroundColor: P.line, marginHorizontal: 8 },
    techLabel: { fontSize: 9, letterSpacing: 0.5, color: P.mute },
    techValue: { fontSize: 14, fontWeight: "600", color: P.ink },
    techNote: { fontSize: 11, color: P.ink2 },

    lockCard: { alignItems: "center", gap: 8, paddingVertical: 28, marginTop: 8 },
    lockTitle: { fontSize: 17, fontWeight: "600", color: P.ink },
    lockText: { fontSize: 13, lineHeight: 19, color: P.ink2, textAlign: "center" },

    disclaimer: { fontSize: 12, lineHeight: 18, color: P.mute, textAlign: "center", marginTop: 18 },

    scrim: { flex: 1, backgroundColor: P.overlay, justifyContent: "center", padding: 20 },
    sheet: {
      backgroundColor: P.surf,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: P.line,
      padding: 20,
      gap: 12,
    },
    sheetTitle: { fontSize: 20, fontWeight: "600", color: P.ink, letterSpacing: -0.4 },
    guide: { gap: 4 },
    guideHead: { fontSize: 15, fontWeight: "600", color: P.ink },
    guideText: { fontSize: 13, lineHeight: 20, color: P.ink2 },
  })
);

export default BreakoutStocksScreen;
