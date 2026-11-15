// Stock detail (Pulse design, "stock" artboard): live price, period chart,
// day range, the user's position and Buy / Sell / Edit sheets.
//
// A position can be several purchase lots (each Buy adds one). Selling works
// through lots oldest-first; editing collapses them into a single lot.

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, ScrollView, Alert, ActivityIndicator, RefreshControl, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import {
  Text,
  Card,
  Overline,
  Mono,
  Button,
  Field,
  Segmented,
  SectionHeader,
  ScreenHeader,
  IconButton,
  FieldRow,
  Empty,
  Sheet,
  SheetActions,
  Summary,
  StatGrid,
  SelectField,
  TextAction,
  Hint,
  ScreenSkeleton,
} from "../../components/pulse";
import PriceChart from "../../components/PriceChart";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import { P, themedStyles } from "../../theme/theme";
import { inr, pct, localISODate } from "../../utils/format";
import RealStockDataService from "../../services/realStockDataService";
import { getStockQuote, getStockHistory } from "../../services/yahooFinanceService";
import { auth } from "../../config/FirebaseConfig";
import {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment as fsDeleteInvestment,
  addTransaction,
  getStockPortfolio,
  updateStock as fsUpdateStock,
  deleteStock as fsDeleteStock,
  getGoals,
  getWatchlist,
  saveWatchlistItem,
  removeWatchlistItem,
} from "../../services/firestoreService";

import { toast, friendlyError } from "../../ux/toast";
// dateAdded is a Firestore Timestamp (stockPortfolio) or an ISO string (investments)
const lotTime = (d) => (d?.toMillis ? d.toMillis() : new Date(d || 0).getTime() || 0);
const price2 = (v) => inr(v, { decimals: 2, reveal: true });
const signColor = (v) => (v > 0 ? P.pos : v < 0 ? P.neg : P.ink);

const PERIODS = [
  { value: "1D", label: "1D", range: "1d", interval: "5m", intraday: true },
  { value: "1W", label: "1W", range: "5d", interval: "30m", intraday: true },
  { value: "1M", label: "1M", range: "1mo", interval: "1d" },
  { value: "1Y", label: "1Y", range: "1y", interval: "1d" },
  { value: "5Y", label: "5Y", range: "5y", interval: "1wk" },
];

const FIRE_GOAL = { id: "firenumber", name: "F.I.R.E Number", customName: "F.I.R.E Number" };
const isFireGoal = (g) => g?.id === "firenumber" || g?.name === "F.I.R.E Number" || g?.name === "FIRE Number";

const StockDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { symbol: rawSymbol, company, exchange = "NSE", openSheet } = route.params || {};
  const symbol = String(rawSymbol || "").toUpperCase();
  const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.${exchange === "BSE" ? "BO" : "NS"}`;

  const [quote, setQuote] = useState(null);
  const [name, setName] = useState(company?.name || symbol);
  const [lots, setLots] = useState([]);
  const [goals, setGoals] = useState([FIRE_GOAL]);
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [period, setPeriod] = useState("1M");
  const [history, setHistory] = useState({ prices: [], timestamps: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  const [sheet, setSheet] = useState(null); // "buy" | "sell" | "edit"
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [goalId, setGoalId] = useState("firenumber");

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Data ────────────────────────────────────────────────────────────

  const fetchQuote = useCallback(async () => {
    try {
      const q = await RealStockDataService.getStockQuote(yahooSymbol);
      if (q?.currentPrice) {
        setQuote({ c: q.currentPrice, pc: q.currentPrice - (q.change || 0), h: q.high, l: q.low, o: q.open });
        if (q.name) setName(q.name);
        return;
      }
    } catch (e) {}
    // Fallback: Yahoo chart meta (no open / high / low)
    const y = await getStockQuote(yahooSymbol);
    if (y) setQuote({ c: y.regularMarketPrice, pc: y.previousClose, h: null, l: null, o: null });
  }, [yahooSymbol]);

  const fetchLots = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const [legacy, investments] = await Promise.all([getStockPortfolio(uid), getInvestments(uid)]);
    const bySymbol = (s) => String(s || "").toUpperCase().replace(/\.(NS|BO)$/, "") === symbol.replace(/\.(NS|BO)$/, "");
    const fromLegacy = legacy.filter((s) => bySymbol(s.symbol)).map((s) => ({ ...s, source: "stockPortfolio" }));
    const fromInvestments = investments
      .filter((i) => /^stocks?$/i.test(i.investmentType || "") && bySymbol(i.symbol || i.stockSymbol))
      .map((i) => ({
        ...i,
        source: "investments",
        quantity: Number(i.quantity || i.stockQuantity || 0),
        purchasePrice: Number(i.purchasePrice || i.stockPrice || 0) || Number(i.amount || 0) / Number(i.quantity || 1),
        dateAdded: i.startDate || i.investmentDate,
      }));
    setLots([...fromLegacy, ...fromInvestments].filter((l) => l.quantity > 0));
  }, [symbol]);

  const fetchGoals = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const list = await getGoals(uid);
      setGoals(list.some(isFireGoal) ? list : [FIRE_GOAL, ...list]);
    } catch (e) {}
  }, []);

  const fetchWatched = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const list = await getWatchlist(uid);
      setWatched(list.some((w) => w.symbol === symbol));
    } catch (e) {}
  }, [symbol]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchQuote(), fetchLots().catch(() => {}), fetchGoals(), fetchWatched()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // Keep the price live: every minute while the market is open
  useLiveRefresh(fetchQuote);

  // Watchlist "Buy" opens straight into the order sheet once prices are in
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (loading || autoOpened || (openSheet !== "buy" && openSheet !== "sell")) return;
    setAutoOpened(true);
    openTrade(openSheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const p = PERIODS.find((x) => x.value === period);
    let cancelled = false;
    setHistoryLoading(true);
    getStockHistory(yahooSymbol, p.range, p.interval)
      .then((h) => !cancelled && setHistory(h || { prices: [], timestamps: [] }))
      .catch(() => !cancelled && setHistory({ prices: [], timestamps: [] }))
      .finally(() => !cancelled && setHistoryLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period, yahooSymbol]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchQuote(), fetchLots().catch(() => {})]);
    setRefreshing(false);
  };

  // ── Position ────────────────────────────────────────────────────────

  const position = useMemo(() => {
    const shares = lots.reduce((s, l) => s + (l.quantity || 0), 0);
    const invested = lots.reduce((s, l) => s + (l.quantity || 0) * (l.purchasePrice || 0), 0);
    const ltp = quote?.c || 0;
    const current = shares * ltp;
    const pnl = ltp ? current - invested : 0;
    return {
      shares,
      invested,
      avg: shares ? invested / shares : 0,
      current: ltp ? current : invested,
      pnl,
      pnlPct: invested ? (pnl / invested) * 100 : 0,
      goalName: lots.find((l) => l.goalName)?.goalName || null,
    };
  }, [lots, quote]);

  const dayChange = quote?.pc ? quote.c - quote.pc : 0;
  const dayPct = quote?.pc ? (dayChange / quote.pc) * 100 : 0;

  // ── Sheets ──────────────────────────────────────────────────────────

  const openTrade = (kind) => {
    if (kind === "buy") {
      setQty("1");
      setPrice(quote?.c ? String(Number(quote.c).toFixed(2)) : "");
    } else if (kind === "sell") {
      setQty(String(position.shares || ""));
    } else if (kind === "edit") {
      setQty(String(position.shares));
      setPrice(position.avg ? position.avg.toFixed(2) : "");
    }
    setSheet(kind);
  };
  const closeSheet = () => setSheet(null);

  const qtyNum = parseInt(qty, 10) || 0;
  const priceNum = parseFloat(price) || 0;
  const selectedGoal = goals.find((g) => (g.id || g._id) === goalId) || FIRE_GOAL;

  const afterChange = async () => {
    await fetchLots();
    EventRegister.emit("investmentAdded", {});
    EventRegister.emit("goalUpdated");
  };

  const executeBuy = async () => {
    if (qtyNum <= 0 || priceNum <= 0) return toast.warning("Enter a quantity and a price above zero.", { title: "Check the order" });
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const total = qtyNum * priceNum;
    setBusy(true);
    try {
      await addInvestment(uid, {
        name: `${symbol} - ${name}`,
        amount: total,
        currentAmount: total,
        interestRate: 0,
        investmentType: "stock",
        description: `${qtyNum} shares at ₹${priceNum} per share`,
        symbol,
        quantity: qtyNum,
        purchasePrice: priceNum,
        exchange,
        startDate: new Date().toISOString(),
        goalId: isFireGoal(selectedGoal) ? "firenumber" : selectedGoal.id || selectedGoal._id,
        goalName: selectedGoal.customName || selectedGoal.name || "F.I.R.E Number",
      });
      // Calendar entry for the purchase
      addTransaction(uid, {
        amount: total,
        type: "Investment",
        subType: "Stock",
        name: `Bought Stock: ${symbol}`,
        method: "Investment",
        date: localISODate(),
        goalId: isFireGoal(selectedGoal) ? "firenumber" : selectedGoal.id || selectedGoal._id,
        units: qtyNum,
      }).catch(() => {});
      await afterChange();
      EventRegister.emit("transactionAdded");
      closeSheet();
      toast.success(`Bought ${qtyNum} ${symbol} for ${price2(total)}.`, { title: "Order recorded" });
    } catch (error) {
      toast.error(friendlyError(error, "Please try again."), { title: "Couldn't buy" });
    } finally {
      setBusy(false);
    }
  };

  // Sell across lots, oldest purchase first (FIFO). A fully sold lot is
  // deleted; a partly sold lot keeps its buy price.
  const executeSell = async () => {
    if (qtyNum <= 0) return toast.warning("Enter how many shares to sell.", { title: "Check the order" });
    if (qtyNum > position.shares) return toast.warning(`You own ${position.shares} shares.`, { title: "Too many shares" });
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    let remaining = qtyNum;
    let costOfSold = 0;
    try {
      for (const lot of [...lots].sort((a, b) => lotTime(a.dateAdded) - lotTime(b.dateAdded))) {
        if (remaining <= 0) break;
        const take = Math.min(lot.quantity, remaining);
        costOfSold += take * lot.purchasePrice;
        await writeLot(uid, lot, lot.quantity - take, lot.purchasePrice);
        remaining -= take;
      }
      await afterChange();
      closeSheet();
      const proceeds = qtyNum * (quote?.c || 0);
      const realized = proceeds - costOfSold;
      toast.success(`Sold ${qtyNum} ${symbol} for about ${price2(proceeds)}.\n${realized >= 0 ? "Profit" : "Loss"}: ${price2(Math.abs(realized))}`, { title: "Sold" });
    } catch (error) {
      toast.error("Please try again.", { title: "Couldn't sell" });
      fetchLots();
    } finally {
      setBusy(false);
    }
  };

  // Correct the position: keep the oldest lot with the new totals, drop the rest.
  const executeEdit = async () => {
    if (qtyNum <= 0 || priceNum <= 0) return toast.warning("Quantity and average price must be above zero.", { title: "Check the values" });
    const uid = auth.currentUser?.uid;
    if (!uid || lots.length === 0) return;
    setBusy(true);
    try {
      const [keep, ...rest] = [...lots].sort((a, b) => lotTime(a.dateAdded) - lotTime(b.dateAdded));
      await writeLot(uid, keep, qtyNum, priceNum);
      for (const lot of rest) await writeLot(uid, lot, 0);
      await afterChange();
      closeSheet();
    } catch (error) {
      toast.error("Please try again.", { title: "Couldn't update" });
    } finally {
      setBusy(false);
    }
  };

  const removePosition = () =>
    Alert.alert("Remove from portfolio", `Delete all ${symbol} holdings? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          setBusy(true);
          try {
            for (const lot of lots) await writeLot(uid, lot, 0);
            await afterChange();
            closeSheet();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const toggleWatch = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      if (watched) await removeWatchlistItem(uid, symbol);
      else await saveWatchlistItem(uid, { symbol, name, exchange, addedPrice: quote?.c });
      setWatched(!watched);
    } catch (e) {
      toast.warning("Could not update your watchlist.", { title: "Watchlist" });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
        <ScreenHeader overline={`${exchange} · ${symbol}`} title={name} />
        <ScreenSkeleton rows={4} />
      </SafeAreaView>
    );
  }

  const periodInfo = PERIODS.find((p) => p.value === period);
  const hasPosition = position.shares > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader
        overline={`${exchange} · ${symbol}`}
        title={name}
        right={
          <IconButton onPress={toggleWatch} accessibilityLabel={watched ? "Remove from watchlist" : "Add to watchlist"}>
            <Text style={{ fontSize: 20, color: watched ? P.amber : P.ink }}>{watched ? "★" : "☆"}</Text>
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.ink} colors={[P.ink]} />}
      >
        {/* Price hero */}
        <View style={{ gap: 4 }}>
          <Mono size={40} weight="600" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
            {quote?.c ? price2(quote.c) : "—"}
          </Mono>
          {quote?.pc ? (
            <Mono size={14} weight="400" color={signColor(dayChange)}>
              {inr(dayChange, { sign: true, decimals: 2 })} ({pct(dayPct, { decimals: 2 })}) today
            </Mono>
          ) : (
            <Text style={styles.muted}>Price unavailable right now. Pull to refresh.</Text>
          )}
        </View>

        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        <PriceChart
          prices={history.prices}
          timestamps={history.timestamps}
          intraday={periodInfo.intraday}
          loading={historyLoading}
        />

        <StatGrid
          columns={4}
          items={[
            { label: "Open", value: quote?.o ? inr(quote.o, { decimals: 2, reveal: true }).replace("₹", "") : "—" },
            { label: "High", value: quote?.h ? inr(quote.h, { decimals: 2, reveal: true }).replace("₹", "") : "—" },
            { label: "Low", value: quote?.l ? inr(quote.l, { decimals: 2, reveal: true }).replace("₹", "") : "—" },
            { label: "Prev close", value: quote?.pc ? inr(quote.pc, { decimals: 2, reveal: true }).replace("₹", "") : "—" },
          ]}
        />

        <SectionHeader
          title="Your holdings"
          action={hasPosition ? "Edit" : null}
          onAction={hasPosition ? () => openTrade("edit") : null}
        />
        {hasPosition ? (
          <>
            <Card>
              <StatGrid
                items={[
                  { label: "Shares", value: String(position.shares) },
                  { label: "Avg price", value: inr(position.avg) },
                  { label: "Invested", value: inr(position.invested) },
                  { label: "Current", value: inr(position.current) },
                  { label: "Overall P&L", value: inr(position.pnl, { sign: true }), color: signColor(position.pnl) },
                  { label: "Return", value: pct(position.pnlPct, { decimals: 2 }), color: signColor(position.pnl) },
                ]}
              />
            </Card>
            <Card style={{ paddingVertical: 2 }}>
              <FieldRow label="Mapped to goal" value={position.goalName || "—"} last />
            </Card>
          </>
        ) : (
          <Empty icon="chart" title={`You don't own ${symbol} yet`} message="Buy to track it in your portfolio and goals." />
        )}

        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Button title="Buy" onPress={() => openTrade("buy")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Sell" variant="ghost" onPress={() => openTrade("sell")} disabled={!hasPosition} />
          </View>
        </View>
        <Text style={styles.footnote}>Orders are recorded in LigthsON to track your portfolio; place the trade with your broker.</Text>
      </ScrollView>

      {/* Buy */}
      <Sheet
        visible={sheet === "buy"}
        onClose={closeSheet}
        overline={`Buy · ${exchange}`}
        title={symbol}
        footer={
          <Button
            title={qtyNum > 0 && priceNum > 0 ? `Buy ${qtyNum} · ${inr(qtyNum * priceNum)}` : "Buy"}
            onPress={executeBuy}
            loading={busy}
          />
        }
      >
        <Summary
          rows={[
            { label: "Market price", value: quote?.c ? price2(quote.c) : "—" },
            { label: "You hold", value: `${position.shares} shares` },
          ]}
        />
        <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="Shares to buy" />
        <Field label="Price per share (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Buy price" />
        <Hint>Defaults to the market price; change it to what you paid.</Hint>
        <SelectField
          label="Map to goal"
          value={goalId}
          onChange={setGoalId}
          title="Which goal is this for?"
          options={goals.map((g) => ({ value: g.id || g._id, label: g.customName || g.name }))}
        />
        <Summary
          rows={[
            { label: "Order value", value: price2(qtyNum * priceNum), strong: true },
            { label: "Shares after", value: String(position.shares + qtyNum) },
          ]}
        />
      </Sheet>

      {/* Sell */}
      <Sheet
        visible={sheet === "sell"}
        onClose={closeSheet}
        overline={`Sell · ${exchange}`}
        title={symbol}
        footer={
          <Button
            title={qtyNum > 0 ? `Sell ${qtyNum} · ${inr(qtyNum * (quote?.c || 0))}` : "Sell"}
            variant="dark"
            onPress={executeSell}
            loading={busy}
          />
        }
      >
        <Summary
          rows={[
            { label: "Shares owned", value: String(position.shares) },
            { label: "Average price", value: price2(position.avg) },
            { label: "Market price", value: quote?.c ? price2(quote.c) : "—" },
          ]}
        />
        <Field label="Quantity to sell" value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="Shares" />
        <View style={styles.quickRow}>
          {[0.25, 0.5, 1].map((f) => (
            <TextAction
              key={f}
              title={f === 1 ? "All" : `${f * 100}%`}
              onPress={() => setQty(String(Math.max(1, Math.floor(position.shares * f))))}
            />
          ))}
        </View>
        {(() => {
          const sold = Math.min(qtyNum, position.shares);
          const proceeds = sold * (quote?.c || 0);
          const cost = sold * position.avg;
          return (
            <Summary
              rows={[
                { label: "Proceeds (approx.)", value: price2(proceeds), strong: true },
                { label: "Profit / loss", value: inr(proceeds - cost, { sign: true, decimals: 2 }), color: signColor(proceeds - cost) },
                { label: "Shares left", value: String(Math.max(0, position.shares - qtyNum)) },
              ]}
            />
          );
        })()}
      </Sheet>

      {/* Edit */}
      <Sheet
        visible={sheet === "edit"}
        onClose={closeSheet}
        overline="Correct your position"
        title={symbol}
        footer={
          <SheetActions>
            <Button title="Cancel" variant="ghost" onPress={closeSheet} />
            <Button title="Save" onPress={executeEdit} loading={busy} />
          </SheetActions>
        }
      >
        <Field label="Total shares" value={qty} onChangeText={setQty} keyboardType="number-pad" />
        <Field label="Average buy price (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Summary
          rows={[
            { label: "Invested", value: price2(qtyNum * priceNum), strong: true },
            {
              label: "Change",
              value: inr(qtyNum * priceNum - position.invested, { sign: true, decimals: 2 }),
              color: signColor(qtyNum * priceNum - position.invested),
            },
          ]}
        />
        <TextAction title="Remove from portfolio" color={P.neg} onPress={removePosition} style={{ alignSelf: "center" }} />
      </Sheet>
    </SafeAreaView>
  );
};

/** Write a lot's new quantity (0 deletes it) to whichever collection holds it. */
const writeLot = async (uid, lot, quantity, purchasePrice = lot.purchasePrice) => {
  const id = lot.id || lot._id;
  if (quantity <= 0) {
    return lot.source === "stockPortfolio" ? fsDeleteStock(uid, id) : fsDeleteInvestment(uid, id);
  }
  const data = { quantity, purchasePrice, amount: quantity * purchasePrice, currentAmount: quantity * purchasePrice };
  return lot.source === "stockPortfolio" ? fsUpdateStock(uid, id, data) : updateInvestment(uid, id, data);
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
    hero: { letterSpacing: -1.2, lineHeight: 44 },
    muted: { fontSize: 13, color: P.mute },
    actionRow: { flexDirection: "row", gap: 10 },
    footnote: { fontSize: 12, color: P.mute, textAlign: "center" },
    quickRow: { flexDirection: "row", gap: 18, marginTop: -6 },
  })
);

export default StockDetailScreen;
