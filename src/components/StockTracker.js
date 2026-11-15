// Stock tracking for the Stocks screen:
//   PortfolioPanel — what you own: value, invested, total and today's P&L,
//                    one row per stock at live prices.
//   WatchlistPanel — what you plan to buy: live price, distance to your
//                    target price and the cost of your planned quantity.
// Both refresh on focus and every minute while the market is open.

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Overline, Mono, Badge, Button, Field, Empty, Sheet, Summary, SkeletonCard, Icon, Press } from "./pulse";
import { P, themedStyles } from "../theme/theme";
import { inr, inrCompact, pct } from "../utils/format";
import { auth } from "../config/FirebaseConfig";
import { getInvestments, saveWatchlistItem, removeWatchlistItem } from "../services/firestoreService";
import { aggregateHoldings, getLivePrices, getLiveQuotes, quoteSymbol, isMarketOpen } from "../services/livePriceService";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import { usePortfolioLive, refreshPortfolio } from "../services/portfolioLive";

import { toast, friendlyError } from "../ux/toast";
const signColor = (v) => (v > 0 ? P.pos : v < 0 ? P.neg : P.ink2);
const price2 = (v) => inr(v, { decimals: 2, reveal: true });
const timeLabel = (d) => (d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "");

const openDetail = (navigation, item, openSheet) =>
  navigation.navigate("StockDetail", {
    openSheet,
    symbol: item.symbol,
    company: { name: item.name || item.symbol, symbol: quoteSymbol(item), exchange: item.exchange || "NSE" },
    exchange: item.exchange || "NSE",
  });

const MarketStatus = ({ at }) => {
  const open = isMarketOpen();
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: open ? P.pos : P.mute }]} />
      <Text style={styles.statusText}>
        {open ? "Market open · live" : "Market closed · last price"}
        {at ? ` · ${timeLabel(at)}` : ""}
      </Text>
    </View>
  );
};

// ── Portfolio ───────────────────────────────────────────────────────

export const PortfolioPanel = ({ navigation, onBrowse }) => {
  // Same live feed as Home, Wealth, F.I.R.E. and Goals
  const portfolio = usePortfolioLive();
  const holdings = useMemo(() => aggregateHoldings(portfolio.investments, portfolio.live), [portfolio]);
  const pricedAt = portfolio.live?.at || null;
  const loading = !portfolio.loaded;
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    await refreshPortfolio({ reload: true, force: true });
    setRefreshing(false);
  };

  const totals = useMemo(() => {
    const t = holdings.reduce(
      (a, h) => ({ invested: a.invested + h.invested, current: a.current + h.current, day: a.day + h.dayChange }),
      { invested: 0, current: 0, day: 0 }
    );
    const pnl = t.current - t.invested;
    return { ...t, pnl, pnlPct: t.invested ? (pnl / t.invested) * 100 : 0, dayPct: t.current - t.day ? (t.day / (t.current - t.day)) * 100 : 0 };
  }, [holdings]);

  if (loading) return <SkeletonCard rows={4} style={{ marginTop: 16 }} />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={P.ink} colors={[P.ink]} />
      }
    >
      {holdings.length === 0 ? (
        <Empty
          icon="chart"
          title="No stocks yet"
          message="Stocks you buy in LigthsON show up here with live value and profit / loss."
          action="Browse market"
          onAction={onBrowse}
        />
      ) : (
        <>
          <Card style={styles.summary}>
            <Overline>Current value · {holdings.length} {holdings.length === 1 ? "stock" : "stocks"}</Overline>
            <Mono size={28} weight="700" style={{ marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
              {inr(totals.current)}
            </Mono>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Overline size={10}>Invested</Overline>
                <Mono size={14}>{inrCompact(totals.invested)}</Mono>
              </View>
              <View style={styles.summaryCell}>
                <Overline size={10}>Total P&L</Overline>
                <Mono size={14} color={signColor(totals.pnl)} numberOfLines={1} adjustsFontSizeToFit>
                  {inrCompact(totals.pnl, { sign: true })}
                </Mono>
                <Text mono style={[styles.cellSub, { color: signColor(totals.pnl) }]}>{pct(totals.pnlPct)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Overline size={10}>Today</Overline>
                <Mono size={14} color={signColor(totals.day)} numberOfLines={1} adjustsFontSizeToFit>
                  {inrCompact(totals.day, { sign: true })}
                </Mono>
                <Text mono style={[styles.cellSub, { color: signColor(totals.day) }]}>{pct(totals.dayPct)}</Text>
              </View>
            </View>
            <MarketStatus at={pricedAt} />
          </Card>

          <Overline style={styles.listTitle}>Holdings</Overline>
          <Card padded={false}>
            {holdings.map((h, i) => (
              <Press scaleTo={0.96}
                key={h.symbol}
                activeOpacity={0.7}
                onPress={() => openDetail(navigation, h)}
                style={[styles.row, i === holdings.length - 1 && { borderBottomWidth: 0 }]}
                accessibilityLabel={`${h.symbol}, ${h.quantity} shares, value ${inr(h.current)}, ${h.pnl >= 0 ? "profit" : "loss"} ${inr(Math.abs(h.pnl))}`}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <View style={styles.symRow}>
                    <Text style={styles.sym}>{h.symbol}</Text>
                    <Text mono style={styles.exch}>{h.exchange}</Text>
                  </View>
                  <Text style={styles.sub} numberOfLines={1}>
                    {h.quantity} sh · avg {price2(h.avgPrice)}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    LTP {h.price !== null ? price2(h.price) : "—"}{" "}
                    <Text mono style={{ color: signColor(h.dayChangePercent) }}>{pct(h.dayChangePercent)}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <Mono size={15}>{inr(h.current)}</Mono>
                  <Mono size={13} color={signColor(h.pnl)}>{inr(h.pnl, { sign: true })}</Mono>
                  <Text mono style={[styles.cellSub, { color: signColor(h.pnl) }]}>{pct(h.pnlPct)}</Text>
                </View>
                <Icon name="chevron" size={16} color={P.mute} />
              </Press>
            ))}
          </Card>
          <Text style={styles.footnote}>Tap a stock to buy more, sell, or see its chart.</Text>
        </>
      )}
    </ScrollView>
  );
};

// ── Watchlist ───────────────────────────────────────────────────────

export const WatchlistPanel = ({ navigation, items, onChanged, onBrowse }) => {
  const [quotes, setQuotes] = useState({});
  const [pricedAt, setPricedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadQuotes = useCallback(
    async (force = false) => {
      try {
        const q = await getLiveQuotes(items.map(quoteSymbol), { force });
        setQuotes(q);
        setPricedAt(new Date());
      } finally {
        setRefreshing(false);
      }
    },
    [items]
  );

  useLiveRefresh(loadQuotes);
  // Price newly added items straight away
  React.useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const remove = (item) =>
    Alert.alert("Remove from watchlist", `Stop tracking ${item.symbol}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          await removeWatchlistItem(uid, item.symbol);
          onChanged?.();
        },
      },
    ]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); onChanged?.(); loadQuotes(true); }} tintColor={P.ink} colors={[P.ink]} />
      }
    >
      {items.length === 0 ? (
        <Empty
          icon="plus"
          title="Nothing on your watchlist"
          message="Tap the ☆ next to any stock in Market to track it here, set a target buy price and plan how many shares to buy."
          action="Browse market"
          onAction={onBrowse}
        />
      ) : (
        <>
          <MarketStatus at={pricedAt} />
          <Card padded={false} style={{ marginTop: 10 }}>
            {items.map((item, i) => {
              const q = quotes[item.symbol];
              const price = q?.price ?? null;
              const target = item.targetPrice;
              const gap = price !== null && target ? (price - target) / target : null;
              const sinceAdded = price !== null && item.addedPrice ? ((price - item.addedPrice) / item.addedPrice) * 100 : null;
              return (
                <View key={item.symbol} style={[styles.watchRow, i === items.length - 1 && { borderBottomWidth: 0 }]}>
                  <Press scaleTo={0.96} style={styles.watchMain} activeOpacity={0.7} onPress={() => openDetail(navigation, item)}>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={styles.symRow}>
                        <Text style={styles.sym}>{item.symbol}</Text>
                        <Text mono style={styles.exch}>{item.exchange || "NSE"}</Text>
                      </View>
                      <Text style={styles.sub} numberOfLines={1}>{item.name || item.symbol}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 3 }}>
                      <Mono size={15}>{price !== null ? price2(price) : "—"}</Mono>
                      <Text mono style={[styles.cellSub, { color: signColor(q?.dayChangePercent || 0) }]}>
                        {q ? `${pct(q.dayChangePercent)} today` : "loading"}
                      </Text>
                    </View>
                  </Press>

                  <View style={styles.planRow}>
                    {target ? (
                      gap !== null && gap <= 0 ? (
                        <Badge color={P.pos} bg={P.posSoft}>AT TARGET {price2(target)} · BUY ZONE</Badge>
                      ) : (
                        <Text style={styles.planText}>
                          Target {price2(target)}
                          {gap !== null ? ` · ${(gap * 100).toFixed(1)}% above` : ""}
                        </Text>
                      )
                    ) : (
                      <Text style={styles.planText}>No target price set</Text>
                    )}
                    {item.plannedQty ? (
                      <Text style={styles.planText}>
                        Plan {item.plannedQty} sh{price !== null ? ` ≈ ${inr(item.plannedQty * price)}` : ""}
                      </Text>
                    ) : null}
                    {sinceAdded !== null ? (
                      <Text style={styles.planText}>
                        Since added <Text mono style={{ color: signColor(sinceAdded) }}>{pct(sinceAdded)}</Text>
                      </Text>
                    ) : null}
                    {item.note ? <Text style={styles.planText} numberOfLines={2}>“{item.note}”</Text> : null}
                  </View>

                  <View style={styles.actions}>
                    <Press scaleTo={0.96} activeOpacity={0.7} style={styles.action} onPress={() => setEditing(item)} accessibilityLabel={`Edit plan for ${item.symbol}`}>
                      <Icon name="edit" size={15} color={P.ink2} />
                      <Text style={styles.actionText}>Plan</Text>
                    </Press>
                    <Press scaleTo={0.96} activeOpacity={0.7} style={styles.action} onPress={() => remove(item)} accessibilityLabel={`Remove ${item.symbol}`}>
                      <Icon name="trash" size={15} color={P.ink2} />
                      <Text style={styles.actionText}>Remove</Text>
                    </Press>
                    <Press scaleTo={0.96} activeOpacity={0.7}
                      style={[styles.action, styles.actionPrimary]}
                      onPress={() => openDetail(navigation, item, "buy")}
                      accessibilityLabel={`Buy ${item.symbol}`}
                    >
                      <Text style={[styles.actionText, { color: P.accInk, fontWeight: "700" }]}>Buy</Text>
                    </Press>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      <WatchPlanModal
        item={editing}
        price={editing ? quotes[editing.symbol]?.price : null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged?.();
        }}
      />
    </ScrollView>
  );
};

/** Target price, planned quantity and a note for a watchlist stock. */
export const WatchPlanModal = ({ item, price, onClose, onSaved }) => {
  const [target, setTarget] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!item) return;
    setTarget(item.targetPrice ? String(item.targetPrice) : "");
    setQty(item.plannedQty ? String(item.plannedQty) : "");
    setNote(item.note || "");
  }, [item]);

  const save = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !item) return;
    const t = target.trim() ? parseFloat(target) : null;
    const q = qty.trim() ? parseInt(qty, 10) : null;
    if ((t !== null && !(t > 0)) || (q !== null && !(q > 0))) {
      toast.warning("Target price and quantity must be positive numbers.", { title: "Check the numbers" });
      return;
    }
    setSaving(true);
    try {
      await saveWatchlistItem(uid, { ...item, targetPrice: t, plannedQty: q, note: note.trim() });
      onSaved?.();
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't save" });
    } finally {
      setSaving(false);
    }
  };

  const estCost = (parseInt(qty, 10) || 0) * (parseFloat(target) || price || 0);

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      overline="Buy plan"
      title={item?.symbol}
      footer={<Button title="Save plan" onPress={save} loading={saving} />}
    >
      <Summary rows={[{ label: "Current price", value: price ? price2(price) : "—" }]} />
      <Field label="Target buy price (₹)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={price ? price.toFixed(2) : "e.g. 1450"} />
      <Field label="Shares you plan to buy" value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="e.g. 10" />
      <Field label="Note" value={note} onChangeText={setNote} placeholder="Why this stock?" maxLength={120} />
      {estCost > 0 ? <Summary rows={[{ label: "Estimated cost", value: inr(estCost), strong: true }]} /> : null}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
    summary: { padding: 16 },
    summaryGrid: { flexDirection: "row", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line },
    summaryCell: { flex: 1, gap: 4, minWidth: 0 },
    cellSub: { fontSize: 11 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, color: P.mute },
    listTitle: { marginTop: 18, marginBottom: 8 },
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.line },
    symRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    sym: { fontSize: 15, fontWeight: "700", color: P.ink },
    exch: { fontSize: 10, color: P.mute },
    sub: { fontSize: 12, color: P.ink2 },
    footnote: { fontSize: 12, color: P.mute, marginTop: 10, textAlign: "center" },
    watchRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.line, gap: 8 },
    watchMain: { flexDirection: "row", alignItems: "center", gap: 10 },
    planRow: { gap: 4 },
    planText: { fontSize: 12, color: P.ink2 },
    actions: { flexDirection: "row", gap: 8, marginTop: 2 },
    action: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 8, borderWidth: 1, borderColor: P.line },
    actionPrimary: { marginLeft: "auto", backgroundColor: P.acc, borderColor: P.acc, paddingHorizontal: 16 },
    actionText: { fontSize: 12, color: P.ink2, fontWeight: "600" },
  })
);
