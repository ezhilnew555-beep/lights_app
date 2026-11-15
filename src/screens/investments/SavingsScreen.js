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
  DateField,
  SelectField,
  TextAction,
  SkeletonCard,
} from "../../components/pulse";
import { inr, inrCompact, localISODate } from "../../utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { EventRegister } from "react-native-event-listeners";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth } from "../../config/FirebaseConfig";
import {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment as fsDeleteInvestment,
  getGoals,
  addTransaction,
} from "../../services/firestoreService";


import { toast, friendlyError } from "../../ux/toast";
export default function SavingsScreen({ navigation }) {
  const [savings, setSavings] = useState([]);
  const [initialDeposit, setInitialDeposit] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [maturityDate, setMaturityDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    fetchSavings();
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

  const fetchSavings = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) { toast.error("User not logged in."); setLoading(false); return; }
      const all = await getInvestments(uid, "Savings");
      setSavings(all);
    } catch (error) {
      console.error("Error fetching savings:", error);
      toast.error("Failed to fetch savings. Please try again.");
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
      const fallback = { id: "firenumber", _id: "firenumber", name: "FIRE Number", customName: "FIRE Number", isDefault: true };
      setGoals([fallback]);
      if (!selectedGoal) setSelectedGoal(fallback.id);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || maturityDate;
    setShowDatePicker(Platform.OS === "ios");
    setMaturityDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const hideDatepicker = () => {
    setShowDatePicker(false);
  };

  const addSavings = async () => {
    if (!initialDeposit || !maturityDate) {
      toast.warning("Please enter initial deposit and select a maturity date.", { title: "Missing information" });
      return;
    }
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) { toast.error("User not logged in."); setLoading(false); return; }

      const existingSavings = savings.find(
        (inv) => inv.investmentType === "Savings" && inv.goalId === selectedGoal && parseFloat(inv.interestRate) === parseFloat(interestRate)
      );

      let transactionName;

      if (existingSavings) {
        const updatedAmount = parseFloat(existingSavings.amount) + parseFloat(initialDeposit);
        const updatedCurrentAmount = parseFloat(existingSavings.currentAmount) + parseFloat(initialDeposit);
        await updateInvestment(uid, existingSavings.id, {
          amount: updatedAmount,
          currentAmount: updatedCurrentAmount,
          description: `Savings account for ₹${updatedAmount} maturing on ${maturityDate.toLocaleDateString("en-GB")}`,
        });
        toast.success("Savings amount updated successfully!");
        transactionName = `Savings account for ₹${updatedAmount} maturing on ${maturityDate.toLocaleDateString("en-GB")}`;
      } else {
        const newSavings = {
          amount: parseFloat(initialDeposit),
          currentAmount: parseFloat(initialDeposit),
          investmentType: "Savings",
          startDate: new Date().toISOString(),
          interestRate: parseFloat(interestRate),
          maturityDate: maturityDate.toISOString(),
          description: `Savings account for ₹${initialDeposit} maturing on ${maturityDate.toLocaleDateString("en-GB")}`,
          goalId: selectedGoal,
        };
        await addInvestment(uid, newSavings);
        toast.coin("Savings account added to your portfolio.", { title: "Saved · +15 coins" });
        transactionName = newSavings.description;
      }

      setInitialDeposit("");
      setInterestRate("0");
      setMaturityDate(new Date());
      setSelectedGoal(goals[0]?.id || goals[0]?._id || "firenumber");

      EventRegister.emit("investmentAdded", { type: "Investment", subType: "Savings", name: "New Savings", date: localISODate(), amount: parseFloat(initialDeposit), interestRate: parseFloat(interestRate), investmentType: "Savings" });

      try {
        await addTransaction(uid, { name: transactionName, amount: parseFloat(initialDeposit), type: "Investment", subType: "Savings", method: "Bank", date: localISODate() });
      } catch (err) { console.error("Error adding Savings transaction for calendar:", err); }

      fetchSavings();
    } catch (error) {
      console.error("Error adding savings:", error);
      toast.error(friendlyError(error, "Couldn't add savings. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const deleteInvestment = async (id) => {
    Alert.alert(
      "Delete Savings",
      "Are you sure you want to delete this savings entry?",
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
              setSavings((prev) => prev.filter((item) => item.id !== id));
              toast.success("Savings entry deleted successfully.");
            } catch (error) {
              console.error("Error deleting savings:", error);
              toast.error(friendlyError(error, "Couldn't delete savings. Please try again."));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Calculate maturity amount for a single lump sum deposit (Savings/Fixed Deposit)
  const calculateMaturityAmount = (
    initialDeposit,
    annualRate,
    startDate,
    maturityDate
  ) => {
    const principal = parseFloat(initialDeposit);
    const r = parseFloat(annualRate) / 100; // Annual rate as decimal
    const start = new Date(startDate);
    const maturity = new Date(maturityDate);

    // Calculate time in years
    const diffTime = Math.abs(maturity.getTime() - start.getTime());
    const t = diffTime / (1000 * 60 * 60 * 24 * 365.25); // Time in years, considering leap years

    const n = 12; // Monthly compounding for consistency with RD, or adjust as needed (e.g., 1 for annual)

    // A = P * (1 + r/n)^(nt)
    return principal * Math.pow(1 + r / n, n * t);
  };

  // Calculate current value for a single lump sum deposit (Savings/Fixed Deposit)
  const calculateCurrentValue = (initialDeposit, annualRate, startDate) => {
    const principal = parseFloat(initialDeposit);
    const r = parseFloat(annualRate) / 100; // Annual rate as decimal
    const start = new Date(startDate);
    const now = new Date();

    // Calculate elapsed time in years
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const t = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    const n = 12; // Monthly compounding

    // A = P * (1 + r/n)^(nt)
    return principal * Math.pow(1 + r / n, n * t);
  };

  const goalLabel = (id) => {
    const g = goals.find((x) => x.id === id || x._id === id);
    if (!g) return null;
    return (g.description && g.description.trim()) || (g.name === "Custom Goal" ? g.customName : g.customName || g.name);
  };

  const rows = savings.map((item) => {
    const amount = Number(item.amount) || 0;
    const start = item.startDate || item.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString();
    const hasMaturity = item.maturityDate && !Number.isNaN(new Date(item.maturityDate).getTime());
    return {
      item,
      amount,
      current: calculateCurrentValue(amount, item.interestRate || 0, start),
      maturity: hasMaturity ? calculateMaturityAmount(amount, item.interestRate || 0, start, item.maturityDate) : null,
    };
  });
  const totals = rows.reduce(
    (t, r) => ({ invested: t.invested + r.amount, current: t.current + r.current }),
    { invested: 0, current: 0 }
  );
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="Wealth" title="Savings accounts" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {loading && savings.length === 0 ? (
            <SkeletonCard rows={3} />
          ) : rows.length > 0 ? (
            <>
              <Card style={{ padding: 16 }}>
                <Overline>Current value · {rows.length} {rows.length === 1 ? "account" : "accounts"}</Overline>
                <Mono size={30} weight="700" style={styles.hero}>{inr(totals.current)}</Mono>
                <StatGrid
                  style={styles.heroStats}
                  items={[
                    { label: "Deposited", value: inrCompact(totals.invested) },
                    { label: "Interest so far", value: inrCompact(totals.current - totals.invested, { sign: true }), color: P.pos },
                  ]}
                  columns={2}
                />
              </Card>

              <SectionHeader title="Your savings" />
              {rows.map(({ item, amount, current, maturity }, i) => (
                <Card key={item.id || i} style={{ gap: 12 }}>
                  <View style={styles.rowHead}>
                    <Mono size={17}>{inr(amount)}</Mono>
                    <Badge color={P.pos} bg={P.posSoft}>{Number(item.interestRate || 0)}% p.a.</Badge>
                  </View>
                  <StatGrid
                    items={[
                      { label: "Value now", value: inr(current) },
                      { label: "At maturity", value: maturity !== null ? inr(maturity) : "—", color: maturity !== null ? P.pos : undefined },
                      { label: "Matures", value: item.maturityDate ? fmtDate(item.maturityDate) : "—" },
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
              <Text style={styles.emptyTitle}>No savings yet</Text>
              <Text style={styles.note}>Add a savings balance below to count it towards your goals.</Text>
            </Card>
          )}

          <SectionHeader title="Add savings" />
          <Card style={{ gap: 14 }}>
            <Field label="Amount (₹)" value={initialDeposit} onChangeText={setInitialDeposit} placeholder="e.g. 50,000" keyboardType="numeric" />
            <Field label="Interest rate (% p.a.)" value={interestRate} onChangeText={setInterestRate} placeholder="e.g. 3.5" keyboardType="decimal-pad" />
            <DateField label="Keep until" value={maturityDate} onChange={(d) => onDateChange({ type: "set" }, d)} minimumDate={new Date()} />
            <SelectField
              label="Link to goal (optional)"
              value={selectedGoal}
              onChange={setSelectedGoal}
              placeholder="Select a goal"
              title="Which goal is this for?"
              options={goals.map((g) => ({ value: g.id || g._id, label: g.customName || g.name || "F.I.R.E Number" }))}
            />
            <Button title="Add savings" onPress={addSavings} loading={loading} disabled={!initialDeposit} />
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
    rowFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line },
    note: { flex: 1, fontSize: 12, color: P.mute },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  })
);
