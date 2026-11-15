// One mutual fund in the user's portfolio: live NAV, NAV chart, the position
// and every purchase (each SIP instalment or lumpsum is one lot), with
// Invest more / Redeem / Edit sheets — the fund twin of StockDetailScreen.
//
// Values come from the shared live feed (portfolioLive), so a NAV change
// moves this screen, Wealth, F.I.R.E. and every goal the fund is mapped to.
// Redeeming works through lots oldest-first (FIFO); "Correct position"
// collapses them into a single lot.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, Alert, RefreshControl, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import {
  Text,
  Card,
  Mono,
  Button,
  Field,
  Segmented,
  SectionHeader,
  ScreenHeader,
  Empty,
  Sheet,
  SheetActions,
  Summary,
  StatGrid,
  SelectField,
  DateField,
  TextAction,
  Hint,
  QuickAmounts,
  SwipeRow,
  Press,
  Updated,
  Icon,
} from "../../components/pulse";
import PriceChart from "../../components/PriceChart";
import { P, themedStyles } from "../../theme/theme";
import { inr, pct, localISODate } from "../../utils/format";
import { auth } from "../../config/FirebaseConfig";
import {
  addInvestment,
  updateInvestment,
  deleteInvestment,
  addTransaction,
  getGoals,
} from "../../services/firestoreService";
import { fetchMutualFundHistory } from "../../services/mutualFundApiService";
import { aggregateFunds, lotUnits, lotNav, lotTime } from "../../services/livePriceService";
import { usePortfolioLive, refreshPortfolio, FIRE_GOAL_ID } from "../../services/portfolioLive";
import { toast, friendlyError } from "../../ux/toast";

const FIRE_GOAL = { id: FIRE_GOAL_ID, name: "F.I.R.E Number", customName: "F.I.R.E Number" };
const isFireGoal = (g) => g?.id === FIRE_GOAL_ID || g?.name === "F.I.R.E Number" || g?.name === "FIRE Number";
const goalLabel = (g) => g?.customName || g?.name || "F.I.R.E Number";

const nav4 = (v) => inr(v, { decimals: 4, reveal: true });
const units3 = (v) => (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const round3 = (v) => Math.round(v * 1000) / 1000;
const round2 = (v) => Math.round(v * 100) / 100;
const signColor = (v) => (v > 0 ? P.pos : v < 0 ? P.neg : P.ink);
const dateLabel = (ms) =>
  ms ? new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const DUST = 0.0005; // units below this are treated as zero

const PERIODS = [
  { value: "1M", label: "1M", days: 31 },
  { value: "6M", label: "6M", days: 183 },
  { value: "1Y", label: "1Y", days: 366 },
  { value: "3Y", label: "3Y", days: 3 * 366 },
  { value: "5Y", label: "5Y", days: 5 * 366 },
];

/** Write one lot with a new unit count at its own purchase NAV (0 deletes it). */
const writeLot = (uid, lot, units, nav = lotNav(lot), extra = {}) => {
  if (units <= DUST) return deleteInvestment(uid, lot.id);
  const amount = round2(units * nav);
  return updateInvestment(uid, lot.id, {
    units: round3(units),
    nav,
    averageNAV: nav,
    amount,
    currentAmount: lot.currentNAV ? round2(units * lot.currentNAV) : amount,
    ...extra,
  });
};

const MFHoldingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { fundKey: key, schemeName } = route.params || {};

  const portfolio = usePortfolioLive();
  const fund = useMemo(
    () => aggregateFunds(portfolio.investments, portfolio.live).find((f) => f.key === key) || null,
    [portfolio, key]
  );
  // Keep the last known fund so the header doesn't blank out while a fully
  // redeemed fund's screen closes.
  const [lastFund, setLastFund] = useState(null);
  useEffect(() => {
    if (fund) setLastFund(fund);
  }, [fund]);
  const f = fund || lastFund;
  const name = f?.name || schemeName || "Mutual fund";
  const schemeCode = f?.schemeCode || (/^\d+$/.test(String(key)) ? String(key) : null);

  const [goals, setGoals] = useState([FIRE_GOAL]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [period, setPeriod] = useState("1Y");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Sheets: "buy" | "redeem" | "edit" | "lot"
  const [sheet, setSheet] = useState(null);
  const [amount, setAmount] = useState("");
  const [navInput, setNavInput] = useState("");
  const [unitsInput, setUnitsInput] = useState("");
  const [date, setDate] = useState(new Date());
  const [goalId, setGoalId] = useState(FIRE_GOAL_ID);
  const [redeemBy, setRedeemBy] = useState("units");
  const [editingLot, setEditingLot] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getGoals(uid)
      .then((list) => setGoals(list.some(isFireGoal) ? list : [FIRE_GOAL, ...list]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!schemeCode) {
      setHistoryLoading(false);
      return;
    }
    let alive = true;
    fetchMutualFundHistory(schemeCode)
      .then((rows) => alive && setHistory(rows))
      .finally(() => alive && setHistoryLoading(false));
    return () => {
      alive = false;
    };
  }, [schemeCode]);

  // Fully redeemed or deleted: nothing left to manage here
  useEffect(() => {
    if (portfolio.loaded && lastFund && !fund && !busy) navigation.goBack();
  }, [portfolio.loaded, fund, lastFund, busy, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio({ reload: true, force: true });
    setRefreshing(false);
  };

  // ── Derived ─────────────────────────────────────────────────────────

  const latestNav = f?.nav || (history.length ? history[history.length - 1].nav : 0);
  const prevNav = history.length > 1 ? history[history.length - 2].nav : 0;
  const dayChangePct = prevNav && latestNav ? ((latestNav - prevNav) / prevNav) * 100 : null;
  const navDate = history.length ? history[history.length - 1].t * 1000 : null;

  const chart = useMemo(() => {
    const p = PERIODS.find((x) => x.value === period);
    if (!history.length) return { prices: [], timestamps: [] };
    const from = history[history.length - 1].t - p.days * 86400;
    const rows = history.filter((r) => r.t >= from);
    return { prices: rows.map((r) => r.nav), timestamps: rows.map((r) => r.t) };
  }, [history, period]);

  const lots = f?.lots || [];
  const goalOptions = goals.map((g) => ({ value: g.id || g._id, label: goalLabel(g) }));
  const goalById = (id) => goals.find((g) => (g.id || g._id) === id) || FIRE_GOAL;
  const goalFields = (id) => {
    const g = goalById(id);
    return { goalId: isFireGoal(g) ? FIRE_GOAL_ID : g.id || g._id, goalName: goalLabel(g) };
  };
  const lotGoalId = (lot) => (lot.goalId && goals.some((g) => (g.id || g._id) === lot.goalId) ? lot.goalId : FIRE_GOAL_ID);

  const afterChange = () => {
    EventRegister.emit("investmentAdded", {});
    EventRegister.emit("goalUpdated");
    return refreshPortfolio({ reload: true });
  };

  // ── Sheets ──────────────────────────────────────────────────────────

  const open = (kind, lot = null) => {
    setDate(new Date());
    if (kind === "buy") {
      setAmount("");
      setNavInput(latestNav ? String(latestNav) : "");
      setGoalId(lots[0] ? lotGoalId(lots[0]) : FIRE_GOAL_ID);
    } else if (kind === "redeem") {
      setRedeemBy("units");
      setUnitsInput(f ? String(round3(f.units)) : "");
      setAmount("");
    } else if (kind === "edit") {
      setUnitsInput(f ? String(round3(f.units)) : "");
      setNavInput(f?.avgNav ? f.avgNav.toFixed(4) : "");
    } else if (kind === "lot" && lot) {
      setEditingLot(lot);
      setAmount(String(round2(Number(lot.amount) || 0)));
      setNavInput(lotNav(lot) ? String(+lotNav(lot).toFixed(4)) : "");
      setDate(lotTime(lot) ? new Date(lotTime(lot)) : new Date());
      setGoalId(lotGoalId(lot));
    }
    setSheet(kind);
  };
  const close = () => setSheet(null);

  const amountNum = parseFloat(amount) || 0;
  const navNum = parseFloat(navInput) || 0;
  const unitsNum = parseFloat(unitsInput) || 0;

  // Invest more: a new lot (lumpsum or this month's SIP instalment)
  const executeBuy = async () => {
    if (amountNum <= 0 || navNum <= 0) return toast.warning("Enter an amount and a NAV above zero.", { title: "Check the order" });
    const uid = auth.currentUser?.uid;
    if (!uid || !f) return;
    const units = round3(amountNum / navNum);
    const base = lots[0] || {};
    const g = goalFields(goalId);
    setBusy(true);
    try {
      const id = await addInvestment(uid, {
        schemeCode: f.schemeCode,
        schemeName: f.name,
        name: f.name,
        investmentType: "Mutual Fund",
        amount: amountNum,
        currentAmount: latestNav ? round2(units * latestNav) : amountNum,
        units,
        nav: navNum,
        averageNAV: navNum,
        currentNAV: latestNav || navNum,
        fundHouse: f.fundHouse || base.fundHouse || null,
        schemeType: base.schemeType || null,
        schemeCategory: f.category || base.schemeCategory || null,
        calculationType: f.sip ? "SIP" : "LUMPSUM",
        startDate: date.toISOString(),
        investmentDate: date.toISOString(),
        sipDate: f.sip ? date.getDate() : null,
        interestRate: Number(base.interestRate) || 12,
        ...g,
      });
      addTransaction(uid, {
        amount: amountNum,
        type: "Investment",
        subType: "Mutual Fund",
        name: `MF Investment: ${f.name}`,
        method: "Investment",
        date: localISODate(date),
        goalId: g.goalId,
        investmentId: id,
        units,
        nav: navNum,
      }).catch(() => {});
      await afterChange();
      EventRegister.emit("transactionAdded");
      close();
      toast.success(`${inr(amountNum)} · ${units3(units)} units at ${nav4(navNum)}.`, { title: "Investment recorded" });
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't save" });
    } finally {
      setBusy(false);
    }
  };

  const redeemUnits = f ? Math.min(f.units, redeemBy === "units" ? unitsNum : latestNav ? amountNum / latestNav : 0) : 0;

  // Redeem across lots, oldest first; each lot keeps its purchase NAV
  const executeRedeem = async () => {
    if (!f) return;
    if (redeemUnits <= 0) return toast.warning("Enter how much to redeem.", { title: "Check the order" });
    if ((redeemBy === "units" ? unitsNum : redeemUnits) > f.units + DUST)
      return toast.warning(`You hold ${units3(f.units)} units.`, { title: "Too many units" });
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    let remaining = redeemUnits;
    let costOfSold = 0;
    try {
      for (const lot of [...lots].sort((a, b) => lotTime(a) - lotTime(b))) {
        if (remaining <= DUST) break;
        const have = lotUnits(lot);
        const take = Math.min(have, remaining);
        costOfSold += take * lotNav(lot);
        await writeLot(uid, lot, have - take);
        remaining -= take;
      }
      await afterChange();
      close();
      const proceeds = redeemUnits * (latestNav || 0);
      const realized = proceeds - costOfSold;
      toast.success(
        `Redeemed ${units3(redeemUnits)} units for about ${inr(proceeds)}.\n${realized >= 0 ? "Gain" : "Loss"}: ${inr(Math.abs(realized))}`,
        { title: "Redeemed" }
      );
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't redeem" });
      refreshPortfolio({ reload: true });
    } finally {
      setBusy(false);
    }
  };

  // Correct the position: keep the oldest lot with the new totals, drop the rest
  const executeEdit = async () => {
    if (unitsNum <= 0 || navNum <= 0) return toast.warning("Units and average NAV must be above zero.", { title: "Check the values" });
    const uid = auth.currentUser?.uid;
    if (!uid || !lots.length) return;
    setBusy(true);
    try {
      const [keep, ...rest] = [...lots].sort((a, b) => lotTime(a) - lotTime(b));
      await writeLot(uid, keep, unitsNum, navNum);
      for (const lot of rest) await deleteInvestment(uid, lot.id);
      await afterChange();
      close();
      toast.success(`${units3(unitsNum)} units at ${nav4(navNum)} average.`, { title: "Position updated" });
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't update" });
    } finally {
      setBusy(false);
    }
  };

  // Edit one purchase: amount, NAV, date and goal
  const executeLotEdit = async () => {
    const lot = editingLot;
    if (!lot) return;
    if (amountNum <= 0 || navNum <= 0) return toast.warning("Enter an amount and a NAV above zero.", { title: "Check the values" });
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    try {
      await writeLot(uid, lot, amountNum / navNum, navNum, {
        startDate: date.toISOString(),
        investmentDate: date.toISOString(),
        ...goalFields(goalId),
      });
      await afterChange();
      close();
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't update" });
    } finally {
      setBusy(false);
    }
  };

  const removeLot = (lot) =>
    Alert.alert("Delete purchase", `Delete the ${inr(Number(lot.amount) || 0)} purchase on ${dateLabel(lotTime(lot))}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          setBusy(true);
          try {
            await deleteInvestment(uid, lot.id);
            await afterChange();
            close();
          } catch (e) {
            toast.error(friendlyError(e, "Please try again."), { title: "Couldn't delete" });
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const removeFund = () =>
    Alert.alert("Remove fund", `Delete all ${lots.length} purchase${lots.length === 1 ? "" : "s"} of ${name}? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          setBusy(true);
          try {
            for (const lot of lots) await deleteInvestment(uid, lot.id);
            await afterChange();
            close();
            toast.success(`${name} removed from your portfolio.`, { title: "Fund removed" });
          } catch (e) {
            toast.error(friendlyError(e, "Please try again."), { title: "Couldn't delete" });
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  // Map every purchase of this fund to one goal
  const remapGoal = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !lots.length) return;
    const g = goalFields(id);
    setBusy(true);
    try {
      for (const lot of lots) {
        if (lot.goalId !== g.goalId || lot.goalName !== g.goalName) await updateInvestment(uid, lot.id, g);
      }
      await afterChange();
      toast.success(`${name} now counts towards ${g.goalName}.`, { title: "Goal updated" });
    } catch (e) {
      toast.error(friendlyError(e, "Please try again."), { title: "Couldn't update" });
    } finally {
      setBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  if (!f) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
        <ScreenHeader overline="Mutual fund" title={name} />
        <View style={styles.content}>
          <Empty
            icon="chart"
            title={portfolio.loaded ? "You don't hold this fund" : "Loading your fund…"}
            message={portfolio.loaded ? "Invest from the fund's calculator to track it here." : ""}
          />
        </View>
      </SafeAreaView>
    );
  }

  const sharedGoal = f.goals.length === 1 ? lots.map(lotGoalId)[0] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline={[f.fundHouse, f.sip ? "SIP" : null].filter(Boolean).join(" · ") || "Mutual fund"} title={name} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.ink} colors={[P.ink]} />}
      >
        {/* NAV hero */}
        <View style={{ gap: 4 }}>
          <Mono size={36} weight="600" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
            {latestNav ? nav4(latestNav) : "—"}
          </Mono>
          <Text style={styles.muted}>
            NAV{navDate ? ` · ${dateLabel(navDate)}` : ""}
            {dayChangePct !== null ? (
              <Text mono style={{ color: signColor(dayChangePct) }}>{`  ${pct(dayChangePct, { decimals: 2 })} vs previous`}</Text>
            ) : null}
          </Text>
          <Updated at={portfolio.live?.at} prefix={f.navLive ? "Live NAV" : "Saved NAV"} />
        </View>

        {schemeCode ? (
          <>
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <PriceChart prices={chart.prices} timestamps={chart.timestamps} loading={historyLoading} />
          </>
        ) : null}

        <SectionHeader title="Your holding" action="Correct" onAction={() => open("edit")} />
        <Card>
          <StatGrid
            items={[
              { label: "Units", value: units3(f.units) },
              { label: "Avg NAV", value: nav4(f.avgNav) },
              { label: "Invested", value: inr(f.invested) },
              { label: "Current", value: inr(f.current) },
              { label: "Returns", value: inr(f.pnl, { sign: true }), color: signColor(f.pnl) },
              { label: "Return %", value: pct(f.pnlPct, { decimals: 2 }), color: signColor(f.pnl) },
            ]}
          />
        </Card>

        <Card>
          <SelectField
            label="Counts towards goal"
            value={sharedGoal}
            placeholder={f.goals.length > 1 ? `${f.goals.length} goals — tap to use one` : "Pick a goal"}
            title="Which goal is this fund for?"
            options={goalOptions}
            onChange={remapGoal}
          />
        </Card>
        <Hint>When the NAV moves, the value of this fund in that goal and in F.I.R.E. moves with it.</Hint>

        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Button title="Invest more" onPress={() => open("buy")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Redeem" variant="ghost" onPress={() => open("redeem")} />
          </View>
        </View>

        <SectionHeader title="Purchases" action={`${lots.length}`} />
        <Card padded={false}>
          {lots.map((lot, i) => {
            const u = lotUnits(lot);
            const cost = Number(lot.amount) || 0;
            const value = latestNav ? u * latestNav : cost;
            return (
              <SwipeRow key={lot.id} onEdit={() => open("lot", lot)} onDelete={() => removeLot(lot)}>
                <Press
                  scaleTo={0.98}
                  activeOpacity={0.7}
                  onPress={() => open("lot", lot)}
                  style={[styles.lotRow, i === lots.length - 1 && { borderBottomWidth: 0 }]}
                  accessibilityLabel={`Purchase on ${dateLabel(lotTime(lot))}, ${inr(cost)}, ${units3(u)} units`}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={styles.lotTitle}>{dateLabel(lotTime(lot))}</Text>
                    <Text style={styles.lotSub} numberOfLines={1}>
                      {units3(u)} units @ {nav4(lotNav(lot))}
                      {lot.goalName ? ` · ${lot.goalName}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Mono size={14}>{inr(cost)}</Mono>
                    <Text mono style={[styles.lotSub, { color: signColor(value - cost) }]}>
                      {inr(value - cost, { sign: true })}
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={P.mute} />
                </Press>
              </SwipeRow>
            );
          })}
        </Card>
        <Text style={styles.footnote}>Tap a purchase to edit it, or swipe to delete.</Text>

        {schemeCode ? (
          <TextAction
            title="Open SIP calculator"
            icon="chart"
            onPress={() => navigation.navigate("MFCalculator", { fund: { schemeCode, schemeName: name, nav: latestNav } })}
            style={{ alignSelf: "center" }}
          />
        ) : null}
        <TextAction title="Remove fund from portfolio" color={P.neg} onPress={removeFund} style={{ alignSelf: "center" }} />
      </ScrollView>

      {/* Invest more */}
      <Sheet
        visible={sheet === "buy"}
        onClose={close}
        overline="Invest more"
        title={name}
        footer={
          <Button
            title={amountNum > 0 && navNum > 0 ? `Add ${inr(amountNum)} · ${units3(amountNum / navNum)} units` : "Add purchase"}
            onPress={executeBuy}
            loading={busy}
          />
        }
      >
        <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 5000" />
        <QuickAmounts value={amount} onChange={setAmount} steps={[500, 1000, 5000, 10000]} />
        <Field label="NAV on purchase date (₹)" value={navInput} onChangeText={setNavInput} keyboardType="decimal-pad" placeholder="Purchase NAV" />
        <Hint>Defaults to today's NAV; change it to the NAV on your statement.</Hint>
        <DateField label="Purchase date" value={date} onChange={setDate} maximumDate={new Date()} />
        <SelectField label="Map to goal" value={goalId} onChange={setGoalId} title="Which goal is this for?" options={goalOptions} />
        <Summary
          rows={[
            { label: "Units allotted", value: navNum ? units3(amountNum / navNum) : "—", strong: true },
            { label: "Units after", value: navNum ? units3(f.units + amountNum / navNum) : units3(f.units) },
          ]}
        />
      </Sheet>

      {/* Redeem */}
      <Sheet
        visible={sheet === "redeem"}
        onClose={close}
        overline="Redeem"
        title={name}
        footer={
          <Button
            title={redeemUnits > 0 ? `Redeem ${units3(redeemUnits)} units` : "Redeem"}
            variant="dark"
            onPress={executeRedeem}
            loading={busy}
          />
        }
      >
        <Summary
          rows={[
            { label: "Units held", value: units3(f.units) },
            { label: "Current value", value: inr(f.current) },
            { label: "NAV", value: latestNav ? nav4(latestNav) : "—" },
          ]}
        />
        <Segmented
          options={[
            { value: "units", label: "By units" },
            { value: "amount", label: "By amount" },
          ]}
          value={redeemBy}
          onChange={setRedeemBy}
        />
        {redeemBy === "units" ? (
          <>
            <Field label="Units to redeem" value={unitsInput} onChangeText={setUnitsInput} keyboardType="decimal-pad" />
            <View style={styles.quickRow}>
              {[0.25, 0.5, 1].map((x) => (
                <TextAction key={x} title={x === 1 ? "All" : `${x * 100}%`} onPress={() => setUnitsInput(String(round3(f.units * x)))} />
              ))}
            </View>
          </>
        ) : (
          <Field label="Amount to redeem (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 10000" />
        )}
        {(() => {
          const proceeds = redeemUnits * (latestNav || 0);
          const cost = redeemUnits * f.avgNav;
          return (
            <Summary
              rows={[
                { label: "Proceeds (approx.)", value: inr(proceeds), strong: true },
                { label: "Gain / loss", value: inr(proceeds - cost, { sign: true }), color: signColor(proceeds - cost) },
                { label: "Units left", value: units3(Math.max(0, f.units - redeemUnits)) },
              ]}
            />
          );
        })()}
        <Hint>Units are redeemed from your oldest purchases first.</Hint>
      </Sheet>

      {/* Correct the whole position */}
      <Sheet
        visible={sheet === "edit"}
        onClose={close}
        overline="Correct your holding"
        title={name}
        footer={
          <SheetActions>
            <Button title="Cancel" variant="ghost" onPress={close} />
            <Button title="Save" onPress={executeEdit} loading={busy} />
          </SheetActions>
        }
      >
        <Field label="Total units" value={unitsInput} onChangeText={setUnitsInput} keyboardType="decimal-pad" />
        <Field label="Average NAV (₹)" value={navInput} onChangeText={setNavInput} keyboardType="decimal-pad" />
        <Summary
          rows={[
            { label: "Invested", value: inr(unitsNum * navNum), strong: true },
            { label: "Change", value: inr(unitsNum * navNum - f.invested, { sign: true }), color: signColor(unitsNum * navNum - f.invested) },
          ]}
        />
        {lots.length > 1 ? <Hint>Your {lots.length} purchases are merged into one. To fix a single purchase, tap it in the list instead.</Hint> : null}
        <TextAction title="Remove fund from portfolio" color={P.neg} onPress={removeFund} style={{ alignSelf: "center" }} />
      </Sheet>

      {/* Edit one purchase */}
      <Sheet
        visible={sheet === "lot"}
        onClose={close}
        overline="Edit purchase"
        title={editingLot ? dateLabel(lotTime(editingLot)) : ""}
        footer={
          <SheetActions>
            <Button title="Delete" variant="ghost" onPress={() => editingLot && removeLot(editingLot)} />
            <Button title="Save" onPress={executeLotEdit} loading={busy} />
          </SheetActions>
        }
      >
        <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Field label="Purchase NAV (₹)" value={navInput} onChangeText={setNavInput} keyboardType="decimal-pad" />
        <DateField label="Purchase date" value={date} onChange={setDate} maximumDate={new Date()} />
        <SelectField label="Map to goal" value={goalId} onChange={setGoalId} title="Which goal is this for?" options={goalOptions} />
        <Summary rows={[{ label: "Units", value: navNum ? units3(amountNum / navNum) : "—", strong: true }]} />
      </Sheet>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
    hero: { letterSpacing: -1.2, lineHeight: 42 },
    muted: { fontSize: 13, color: P.mute },
    actionRow: { flexDirection: "row", gap: 10 },
    quickRow: { flexDirection: "row", gap: 18, marginTop: -6 },
    lotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: P.line,
    },
    lotTitle: { fontSize: 14, fontWeight: "600", color: P.ink },
    lotSub: { fontSize: 12, color: P.ink2 },
    footnote: { fontSize: 12, color: P.mute, textAlign: "center" },
  })
);

export default MFHoldingScreen;
