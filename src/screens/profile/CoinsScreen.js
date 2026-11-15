// Coins — balance, premium rewards, how to earn and earning history
// (Pulse design, "coins" artboard). Coins are awarded and deducted only by
// Cloud Functions; this screen reads them and files reward requests.

import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../config/FirebaseConfig";
import { getProfile, getCoinHistory } from "../../services/firestoreService";
import { getPremiumRewardClaims } from "../../services/premiumRewardsService";
import { requestPremiumReward } from "../../services/secureFunctions";
import { P, themedStyles } from "../../theme/theme";
import {
  Text,
  Icon,
  Card,
  Overline,
  Mono,
  SectionHeader,
  ScreenHeader,
  ProgressBar,
  Chip,
  ListRow,
  ScreenSkeleton,
  FadeIn,
  RowIn,
  CountUp,
} from "../../components/pulse";
import { MONTHS_SHORT, timeOf } from "../../utils/format";

import { toast } from "../../ux/toast";
// Mirrors REWARDS in functions/index.js
const REWARDS = [
  {
    key: "stock-recommendation",
    title: "Stock Recommendation",
    subtitle: "A focused stock pick with clear entry ideas.",
    coins: 10000,
  },
  {
    key: "free-consultation-call",
    title: "Free Consultation Call",
    subtitle: "A one-to-one call with an investment advisor.",
    coins: 75000,
  },
];

// Mirrors COINS in functions/index.js
const EARN = [
  { name: "Open the app daily", points: 5 },
  { name: "Log an income", points: 10 },
  { name: "Log an expense", points: 10 },
  { name: "Add savings", points: 15 },
  { name: "Add an FD or RD", points: 20 },
  { name: "Add a mutual fund or stock", points: 25 },
];

const ACTION_LABELS = {
  daily_open: "Daily app open",
  add_income: "Income",
  add_expense: "Expense",
  add_investment: "Investment added",
  reward_redemption: "Reward redeemed",
  reward_refund: "Reward refund",
  inactivity_penalty: "Inactivity penalty",
};

const STATUS_PRIORITY = { Pending: 4, Approved: 3, Completed: 2, Rejected: 1 };

const whenOf = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
  if (!d) return "Just now";
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return `Today, ${timeOf(d)}`;
  if (same(d, y)) return `Yesterday, ${timeOf(d)}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

const CoinsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coins, setCoins] = useState(0);
  const [history, setHistory] = useState([]);
  const [claims, setClaims] = useState({});
  const [claimingKey, setClaimingKey] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const [profile, logs, rewardClaims] = await Promise.all([
        getProfile(uid),
        getCoinHistory(uid),
        getPremiumRewardClaims(uid).catch(() => []),
      ]);
      setCoins(Number(profile?.coins) || 0);
      setHistory(logs || []);
      const byType = {};
      (rewardClaims || []).forEach((c) => {
        if (!c?.rewardType) return;
        const prev = byType[c.rewardType];
        if (!prev || (STATUS_PRIORITY[c.status] || 0) > (STATUS_PRIORITY[prev.status] || 0)) byType[c.rewardType] = c;
      });
      setClaims(byType);
    } catch (e) {
      console.error("CoinsScreen fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const todayEarned = history
    .filter((h) => whenOf(h.timestamp).startsWith("Today"))
    .reduce((s, h) => s + (Number(h.points) || 0), 0);

  const claim = (reward) => {
    Alert.alert("Confirm redemption", `Request ${reward.title} for ${reward.coins.toLocaleString("en-IN")} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          if (claimingKey) return;
          setClaimingKey(reward.key);
          try {
            // Coins are checked and deducted on the server, atomically with the claim.
            const result = await requestPremiumReward(reward.key);
            toast.success(result?.status === "Completed"
                ? "Reward claimed successfully."
                : "Your request is under review. We'll be in touch soon.", { title: "Request sent" });
          } catch (error) {
            if (error?.code === "functions/failed-precondition") {
              toast.warning(`You need ${reward.coins.toLocaleString("en-IN")} coins for this reward.`, { title: "Not enough coins" });
            } else if (error?.code === "functions/already-exists") {
              toast.warning("You already have an open request for this reward.", { title: "Pending request" });
            } else {
              toast.error("Unable to process your reward request. Please try again later.");
            }
          } finally {
            setClaimingKey(null);
            fetchData();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenSkeleton safe header rows={4} />
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader overline="Rewards" title="Coins" />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={P.ink}
            colors={[P.ink]}
          />
        }
      >
        <FadeIn>
        <Card style={{ padding: 18 }}>
          <View style={{ gap: 6 }}>
            <Overline>Current balance</Overline>
            <View style={styles.balanceRow}>
              <Icon name="coin" size={34} color={P.amber} strokeWidth={1.6} />
              <CountUp
                id="coins.balance"
                component={Text}
                mono
                value={coins}
                format={(v) => Math.round(v).toLocaleString("en-IN")}
                style={styles.balance}
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </View>
            <Text style={styles.note}>
              {todayEarned > 0 ? `+${todayEarned} today · ` : ""}
              {coins >= 10000 ? "breakout signals unlocked" : `${(10000 - coins).toLocaleString("en-IN")} to unlock breakout signals`}
            </Text>
          </View>
        </Card>
        </FadeIn>

        <SectionHeader title="Premium rewards" />
        {REWARDS.map((r, ri) => {
          const c = claims[r.key];
          const open = c && (c.status === "Pending" || c.status === "Approved");
          const done = c && (c.status === "Completed" || c.status === "completed");
          const ready = coins >= r.coins;
          let status = ready ? "Ready to claim" : `${(r.coins - coins).toLocaleString("en-IN")} to go`;
          if (open) status = c.status === "Pending" ? "Under review" : "Approved";
          if (done) status = "Claimed";
          const bookable = r.key === "free-consultation-call" && (done || c?.status === "Approved");
          return (
            <RowIn key={r.key} index={ri} delay={60}>
            <Card>
              <View style={{ gap: 10 }}>
                <View style={styles.rewardHead}>
                  <Icon name="gift" size={22} color={P.amber} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rewardTitle}>{r.title}</Text>
                    <Text style={styles.note}>{r.subtitle}</Text>
                  </View>
                </View>
                <ProgressBar value={coins / r.coins} color={P.amber} />
                <View style={styles.rewardFoot}>
                  <Text style={styles.note}>
                    <Text mono style={{ fontWeight: "700", color: P.ink }}>
                      {r.coins.toLocaleString("en-IN")}
                    </Text>{" "}
                    coins · {status}
                  </Text>
                  {bookable ? (
                    <Chip
                      label="Book"
                      selected
                      onPress={() =>
                        Linking.openURL(
                          `mailto:narendran2cool@gmail.com?subject=${encodeURIComponent("Free Consultation Booking - LigthsON")}`
                        )
                      }
                    />
                  ) : claimingKey === r.key ? (
                    <ActivityIndicator color={P.ink} />
                  ) : (
                    <Chip
                      label={open || done ? status : ready ? "Claim" : "Locked"}
                      selected={ready && !open && !done}
                      onPress={ready && !open && !done ? () => claim(r) : undefined}
                    />
                  )}
                </View>
              </View>
            </Card>
            </RowIn>
          );
        })}

        <SectionHeader title="How to earn" />
        <Card style={styles.listCard}>
          {EARN.map((e, i) => (
            <ListRow key={e.name} title={e.name} right={`+${e.points}`} rightColor={P.amber} last={i === EARN.length - 1} />
          ))}
        </Card>

        <SectionHeader
          title="Earning history"
          action="My reward claims"
          onAction={() => navigation.navigate("MyRewardClaims")}
        />
        <Card style={styles.listCard}>
          {history.length === 0 ? (
            <Text style={[styles.note, { paddingVertical: 14 }]}>
              No coins yet. Log a transaction to earn your first coins.
            </Text>
          ) : (
            history.slice(0, 30).map((h, i) => {
              const pts = Number(h.points) || 0;
              const label = ACTION_LABELS[h.action] || "Reward";
              return (
                <ListRow
                  key={h.id || i}
                  title={h.description && h.action !== "daily_open" ? `${label} · ${h.description}` : label}
                  subtitle={whenOf(h.timestamp)}
                  right={`${pts >= 0 ? "+" : "−"}${Math.abs(pts).toLocaleString("en-IN")}`}
                  rightColor={pts >= 0 ? P.pos : P.neg}
                  last={i === Math.min(history.length, 30) - 1}
                />
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: P.bg },
    body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
    balanceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    balance: { fontSize: 44, fontWeight: "600", letterSpacing: -1.3, lineHeight: 48, color: P.ink, flexShrink: 1 },
    note: { fontSize: 13, color: P.ink2 },
    rewardHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    rewardTitle: { fontSize: 16, fontWeight: "700", color: P.ink },
    rewardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    listCard: { paddingTop: 4, paddingBottom: 4 },
  })
);

export default CoinsScreen;
