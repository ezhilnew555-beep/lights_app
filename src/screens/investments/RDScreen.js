import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import {
  ScreenHeader,
  Card,
  Overline,
  Mono,
  Badge,
  Button,
  Field,
  SectionHeader,
  StatGrid,
  Summary,
  SelectField,
  TextAction,
  ProgressBar,
  SkeletonCard,
} from "../../components/pulse";
import { inr, inrCompact, localISODate } from "../../utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { EventRegister } from "react-native-event-listeners";
import { auth } from "../../config/FirebaseConfig";
import {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment as fsDeleteInvestment,
  getGoals,
  addTransaction,
} from "../../services/firestoreService";


import { toast } from "../../ux/toast";
export default function RDScreen({ navigation }) {
  const [investments, setInvestments] = useState([]);
  const [monthlyDeposit, setMonthlyDeposit] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  // const [linkedGoal, setLinkedGoal] = useState(null); // This state isn't directly used for display

  useEffect(() => {
    fetchInvestments();
    fetchGoals();
  }, []);

  // Hide React Navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Start rotation animation when loading
  useEffect(() => {
    if (loading) {
      const startRotation = () => {
        rotateAnim.setValue(0);
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
      };
      startRotation();
    }
  }, [loading]);

  // Interpolate rotation value
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("User not logged in. Please log in again.");
        setLoading(false);
        return;
      }
      const all = await getInvestments(uid, "Recurring Deposit");
      setInvestments(all);
    } catch (error) {
      console.error("Error fetching investments:", error);
      toast.error("Failed to fetch investments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const goalsData = await getGoals(uid);
      const fireNumberGoal = { id: "firenumber", _id: "firenumber", name: "FIRE Number", customName: "FIRE Number", description: "Financial Independence, Retire Early", isDefault: true };
      const hasFireNumber = goalsData.some((g) => g.name === "FIRE Number" || g.customName === "FIRE Number" || g.id === "firenumber");
      const allGoals = hasFireNumber ? goalsData : [fireNumberGoal, ...goalsData];
      setGoals(allGoals);
      if (!selectedGoal) {
        setSelectedGoal((hasFireNumber ? goalsData.find((g) => g.name === "FIRE Number" || g.customName === "FIRE Number") || fireNumberGoal : fireNumberGoal).id);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      const fallback = { id: "firenumber", _id: "firenumber", name: "F.I.R.E Number", customName: "F.I.R.E Number", isDefault: true };
      setGoals([fallback]);
      if (!selectedGoal) setSelectedGoal(fallback.id);
    }
  };

  const addRD = async () => {
    if (!monthlyDeposit || !interestRate || !duration) {
      toast.warning("Please enter all required fields");
      return;
    }
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) { toast.error("User not logged in."); setLoading(false); return; }

      const existingRD = investments.find(
        (inv) => inv.investmentType === "Recurring Deposit" && inv.goalId === selectedGoal && parseFloat(inv.interestRate) === parseFloat(interestRate)
      );

      let transactionName;
      const transactionStartDate = new Date();

      if (existingRD) {
        const newTotalAmount = parseFloat(existingRD.amount) + parseFloat(monthlyDeposit) * parseInt(duration);
        const newCurrentAmount = parseFloat(existingRD.currentAmount) + parseFloat(monthlyDeposit);
        const expectedMaturityAmount = calculateMaturityAmount(monthlyDeposit, interestRate, duration);
        await updateInvestment(uid, existingRD.id, {
          amount: newTotalAmount,
          currentAmount: newCurrentAmount,
          description: `₹${monthlyDeposit} monthly for ${duration} months at ${interestRate}% (Maturity: ₹${Math.round(expectedMaturityAmount).toLocaleString("en-IN")})`,
        });
        toast.success("Recurring deposit amount updated successfully");
        transactionName = `RD - ₹${monthlyDeposit}/month for ${duration} months`;
      } else {
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + parseInt(duration));
        const expectedMaturityAmount = calculateMaturityAmount(monthlyDeposit, interestRate, duration);
        const selectedGoalData = goals.find((g) => g.id === selectedGoal || g._id === selectedGoal);
        const newRD = {
          name: `RD - ₹${monthlyDeposit}/month for ${duration} months`,
          amount: parseFloat(monthlyDeposit) * parseInt(duration),
          currentAmount: parseFloat(monthlyDeposit),
          interestRate: parseFloat(interestRate),
          goalId: selectedGoal,
          goalName: selectedGoalData ? selectedGoalData.customName || selectedGoalData.name : "F.I.R.E Number",
          investmentType: "Recurring Deposit",
          startDate: transactionStartDate.toISOString(),
          maturityDate: maturityDate.toISOString(),
          compoundingFrequency: "quarterly",
          description: `₹${monthlyDeposit} monthly for ${duration} months at ${interestRate}% (Maturity: ₹${Math.round(expectedMaturityAmount).toLocaleString("en-IN")})`,
          monthlyDeposit: parseFloat(monthlyDeposit),
          duration: parseInt(duration),
          expectedMaturityAmount,
        };
        await addInvestment(uid, newRD);
        toast.coin("Recurring deposit added to your portfolio.", { title: "Saved · +20 coins" });
        transactionName = newRD.name;
      }

      setMonthlyDeposit("");
      setInterestRate("");
      setDuration("");
      setSelectedGoal(goals[0]?.id || goals[0]?._id || "firenumber");

      EventRegister.emit("investmentAdded", { type: "Investment", subType: "RD", date: transactionStartDate.toISOString(), amount: parseFloat(monthlyDeposit) * parseInt(duration) });

      try {
        await addTransaction(uid, { name: transactionName, amount: parseFloat(monthlyDeposit), type: "Investment", subType: "RD", method: "Bank", date: localISODate(transactionStartDate) });
      } catch (err) { console.error("Error adding RD transaction for calendar:", err); }

      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast.error("Failed to add investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate maturity amount for RD
  const calculateMaturityAmount = (deposit, rate, months) => {
    const monthlyDeposit = parseFloat(deposit);
    const annualRate = parseFloat(rate) / 100;
    const quarterlyRate = annualRate / 4; // Most RDs compound quarterly
    const totalMonths = parseInt(months);

    // RD formula: M = P × [((1 + r/4)^(4n) - 1) / (r/4)] × (1 + r/4)^(1/3)
    // Where P = monthly deposit, r = annual rate, n = years
    const years = totalMonths / 12;
    const quarters = totalMonths / 3; // Number of quarters

    if (quarterlyRate === 0) {
      // If no interest, just return total deposits
      return monthlyDeposit * totalMonths;
    }

    // Calculate maturity using quarterly compounding
    const factor = Math.pow(1 + quarterlyRate, quarters) - 1;
    const maturityAmount = monthlyDeposit * 3 * (factor / quarterlyRate);

    return maturityAmount;
  };

  // Calculate current value of RD
  const calculateCurrentValue = (deposit, rate, startDate, duration) => {
    const monthlyDeposit = parseFloat(deposit);
    const annualRate = parseFloat(rate) / 100;
    const quarterlyRate = annualRate / 4;
    const totalMonths = parseInt(duration);

    // Calculate elapsed months since start date
    const start = new Date(startDate);
    const now = new Date();
    const elapsedMonths = Math.max(
      1,
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth()) +
      1
    );

    // Limit to actual duration or elapsed time, whichever is smaller
    const depositsCompleted = Math.min(elapsedMonths, totalMonths);
    const elapsedQuarters = depositsCompleted / 3;

    if (quarterlyRate === 0) {
      // If no interest, just return total deposits made so far
      return monthlyDeposit * depositsCompleted;
    }

    // Calculate current value with quarterly compounding
    const factor = Math.pow(1 + quarterlyRate, elapsedQuarters) - 1;
    const currentValue = monthlyDeposit * 3 * (factor / quarterlyRate);

    return Math.max(currentValue, monthlyDeposit * depositsCompleted);
  };

  // Delete investment
  const deleteInvestment = async (id) => {
    Alert.alert(
      "Delete Investment",
      "Are you sure you want to delete this recurring deposit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const uid = auth.currentUser?.uid;
              if (!uid) { toast.error("User not logged in."); setLoading(false); return; }
              await fsDeleteInvestment(uid, id);
              setInvestments((prev) => prev.filter((item) => item.id !== id));
              toast.success("Investment deleted successfully");
            } catch (error) {
              console.error("Error deleting investment:", error);
              toast.error("Failed to delete investment");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const goalLabel = (id) => {
    const g = goals.find((x) => x.id === id || x._id === id);
    if (!g) return null;
    return (g.description && g.description.trim()) || (g.name === "Custom Goal" ? g.customName : g.customName || g.name);
  };

  const monthsDone = (startDate, duration) => {
    const start = new Date(startDate);
    const now = new Date();
    const elapsed = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
    return Math.min(elapsed, duration);
  };

  const rows = investments.map((item) => {
    const deposit = Number(item.monthlyDeposit || item.amount) || 0;
    const duration = Number(item.duration) || 12;
    return {
      item,
      deposit,
      duration,
      done: monthsDone(item.startDate, duration),
      current: calculateCurrentValue(deposit, item.interestRate, item.startDate, duration),
      maturity: calculateMaturityAmount(deposit, item.interestRate, duration),
    };
  });
  const totals = rows.reduce(
    (t, r) => ({ monthly: t.monthly + (r.done < r.duration ? r.deposit : 0), current: t.current + r.current, maturity: t.maturity + r.maturity }),
    { monthly: 0, current: 0, maturity: 0 }
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="Wealth" title="Recurring deposits" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {loading && investments.length === 0 ? (
            <SkeletonCard rows={3} />
          ) : rows.length > 0 ? (
            <>
              <Card style={{ padding: 16 }}>
                <Overline>Current value · {rows.length} {rows.length === 1 ? "deposit" : "deposits"}</Overline>
                <Mono size={30} weight="700" style={styles.hero}>{inr(totals.current)}</Mono>
                <StatGrid
                  style={styles.heroStats}
                  items={[
                    { label: "Monthly", value: inrCompact(totals.monthly) },
                    { label: "At maturity", value: inrCompact(totals.maturity), color: P.pos },
                    { label: "Active", value: String(rows.filter((r) => r.done < r.duration).length) },
                  ]}
                />
              </Card>

              <SectionHeader title="Your deposits" />
              {rows.map(({ item, deposit, duration, done, current, maturity }, i) => (
                <Card key={item.id || i} style={{ gap: 12 }}>
                  <View style={styles.rowHead}>
                    <Text style={styles.rowTitle}>
                      <Text mono style={styles.rowAmount}>{inr(deposit)}</Text> / month
                    </Text>
                    <Badge color={P.pos} bg={P.posSoft}>{item.interestRate}% p.a.</Badge>
                  </View>
                  <View style={{ gap: 6 }}>
                    <ProgressBar value={done / duration} color={P.acc} />
                    <Text style={styles.note}>
                      {done} of {duration} deposits made
                    </Text>
                  </View>
                  <StatGrid
                    items={[
                      { label: "Value now", value: inr(current) },
                      { label: "Deposited", value: inr(deposit * done) },
                      { label: "At maturity", value: inr(maturity), color: P.pos },
                    ]}
                  />
                  <View style={styles.rowFoot}>
                    <Text style={styles.note} numberOfLines={1}>
                      {item.goalId ? `Goal · ${goalLabel(item.goalId) || item.goalName || "—"}` : "Not linked to a goal"}
                    </Text>
                    <TextAction title="Delete" color={P.neg} onPress={() => deleteInvestment(item.id)} />
                  </View>
                </Card>
              ))}
            </>
          ) : (
            <Card style={{ alignItems: "center", gap: 6, paddingVertical: 22 }}>
              <Text style={styles.emptyTitle}>No recurring deposits yet</Text>
              <Text style={styles.note}>Add one below to track deposits and maturity.</Text>
            </Card>
          )}

          <SectionHeader title="Add a recurring deposit" />
          <Card style={{ gap: 14 }}>
            <Field label="Monthly deposit (₹)" value={monthlyDeposit} onChangeText={setMonthlyDeposit} placeholder="e.g. 5,000" keyboardType="numeric" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field label="Rate (% p.a.)" value={interestRate} onChangeText={setInterestRate} placeholder="6.8" keyboardType="decimal-pad" style={{ flex: 1 }} />
              <Field label="Months" value={duration} onChangeText={setDuration} placeholder="12" keyboardType="number-pad" style={{ flex: 1 }} />
            </View>
            <SelectField
              label="Link to goal"
              value={selectedGoal}
              onChange={setSelectedGoal}
              placeholder="Select a goal"
              title="Which goal is this for?"
              options={goals.map((g) => ({ value: g.id || g._id, label: g.customName || g.name || "F.I.R.E Number" }))}
            />
            {parseFloat(monthlyDeposit) > 0 && parseInt(duration, 10) > 0 ? (
              <Summary
                rows={[
                  { label: "You deposit", value: inr(parseFloat(monthlyDeposit) * parseInt(duration, 10)) },
                  {
                    label: "At maturity (approx.)",
                    value: inr(calculateMaturityAmount(monthlyDeposit, interestRate || 0, duration)),
                    strong: true,
                  },
                ]}
              />
            ) : null}
            <Button
              title="Add recurring deposit"
              onPress={addRD}
              loading={loading}
              disabled={!monthlyDeposit || !interestRate || !duration || !selectedGoal}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
    hero: { marginTop: 6, letterSpacing: -0.9 },
    heroStats: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line },
    rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    rowTitle: { fontSize: 13, color: P.ink2 },
    rowAmount: { fontSize: 17, fontWeight: "600", color: P.ink },
    rowFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line },
    note: { flex: 1, fontSize: 12, color: P.mute },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  })
);
