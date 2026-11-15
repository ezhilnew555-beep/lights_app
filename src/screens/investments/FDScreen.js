import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
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
  DateField,
  SelectField,
  TextAction,
  SkeletonCard,
} from "../../components/pulse";
import { inr, inrCompact } from "../../utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { EventRegister } from "react-native-event-listeners";
import { Picker } from "@react-native-picker/picker";
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
export default function FDScreen({ navigation }) {
  const [investments, setInvestments] = useState([]);
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityDate, setMaturityDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);

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
      const all = await getInvestments(uid, "Fixed Deposit");
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

      const fireNumberGoal = {
        id: "firenumber",
        _id: "firenumber",
        name: "F.I.R.E Number",
        customName: "F.I.R.E Number",
        description: "Financial Independence, Retire Early",
        isDefault: true,
      };
      const hasFireNumber = goalsData.some(
        (g) => g.name === "F.I.R.E Number" || g.customName === "F.I.R.E Number" || g.id === "firenumber"
      );
      const allGoals = hasFireNumber ? goalsData : [fireNumberGoal, ...goalsData];
      setGoals(allGoals);
      if (!selectedGoal) {
        setSelectedGoal(hasFireNumber ? (goalsData.find((g) =>
          g.name === "FIRE Number" || g.customName === "FIRE Number") || fireNumberGoal).id : fireNumberGoal.id);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      const fireNumberGoal = { id: "firenumber", _id: "firenumber", name: "F.I.R.E Number", customName: "F.I.R.E Number", isDefault: true };
      setGoals([fireNumberGoal]);
      if (!selectedGoal) setSelectedGoal(fireNumberGoal.id);
    }
  };

  const addFD = async () => {
    if (!amount || !interestRate) {
      toast.warning("Please enter amount and interest rate");
      return;
    }

    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const existingFD = investments.find(
        (inv) =>
          inv.investmentType === "Fixed Deposit" &&
          inv.goalId === selectedGoal &&
          parseFloat(inv.interestRate) === parseFloat(interestRate)
      );

      let transactionName;
      let startDate = new Date().toISOString();

      if (existingFD) {
        const updatedAmount = parseFloat(existingFD.amount) + parseFloat(amount);
        await updateInvestment(uid, existingFD.id, {
          amount: updatedAmount,
          currentAmount: updatedAmount,
          description: `Fixed Deposit at ${interestRate}% maturing on ${formatDate(maturityDate)}`,
        });
        toast.success("Fixed deposit amount updated successfully");
        transactionName = `FD - ${formatDate(maturityDate)}`;
      } else {
        const newFD = {
          name: `FD - ${formatDate(maturityDate)}`,
          amount: parseFloat(amount),
          currentAmount: parseFloat(amount),
          interestRate: parseFloat(interestRate),
          investmentType: "Fixed Deposit",
          startDate,
          maturityDate: maturityDate.toISOString(),
          compoundingFrequency: "yearly",
          description: `Fixed Deposit at ${interestRate}% maturing on ${formatDate(maturityDate)}`,
          goalId: selectedGoal,
          goalName:
            goals.find((g) => g.id === selectedGoal || g._id === selectedGoal)?.customName ||
            goals.find((g) => g.id === selectedGoal || g._id === selectedGoal)?.name ||
            "F.I.R.E Number",
        };
        await addInvestment(uid, newFD);
        toast.coin("Fixed deposit added to your portfolio.", { title: "Saved · +20 coins" });
        transactionName = newFD.name;
      }

      setAmount("");
      setInterestRate("");
      setMaturityDate(new Date());
      setSelectedGoal(goals[0]?.id || goals[0]?._id || "firenumber");

      EventRegister.emit("investmentAdded", { type: "Investment", subType: "FD", date: new Date().toISOString(), amount: parseFloat(amount) });

      try {
        await addTransaction(uid, {
          name: transactionName,
          amount: parseFloat(amount),
          type: "Investment",
          subType: "FD",
          method: "Bank",
          date: startDate.split("T")[0],
        });
      } catch (err) {
        console.error("Error adding FD transaction for calendar:", err);
      }

      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast.error("Failed to add investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || maturityDate;
    setShowDatePicker(Platform.OS === "ios");
    setMaturityDate(currentDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate current amount based on the principal, interest rate, and time passed
  const calculateCurrentAmount = (
    principal,
    interestRate,
    startDate,
    maturityDate
  ) => {
    // Convert strings to numbers if needed
    principal = parseFloat(principal);
    interestRate = parseFloat(interestRate);

    // Convert dates to Date objects if they're strings
    const startDateObj =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    const maturityDateObj =
      typeof maturityDate === "string" ? new Date(maturityDate) : maturityDate;
    const currentDate = new Date();

    // Calculate total duration in years
    const totalDurationMs = maturityDateObj - startDateObj;
    const totalDurationYears = totalDurationMs / (1000 * 60 * 60 * 24 * 365);

    // Calculate elapsed duration in years
    const elapsedDurationMs = currentDate - startDateObj;
    const elapsedDurationYears =
      elapsedDurationMs / (1000 * 60 * 60 * 24 * 365);

    // Calculate current amount using compound interest formula
    // A = P(1 + r)^t where r is annual interest rate and t is time in years
    const annualRate = interestRate / 100;

    // If maturity date is in the past, return the full maturity amount
    if (currentDate > maturityDateObj) {
      return principal * Math.pow(1 + annualRate, totalDurationYears);
    }

    // If we haven't reached maturity, calculate based on elapsed time
    return principal * Math.pow(1 + annualRate, elapsedDurationYears);
  };

  // Delete investment
  const deleteInvestment = async (id) => {
    Alert.alert(
      "Delete Investment",
      "Are you sure you want to delete this investment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const uid = auth.currentUser?.uid;
              if (!uid) {
                toast.error("User not logged in.");
                setLoading(false);
                return;
              }
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

  const handleSubmit = () => {
    // handleSubmit is no longer needed – addFD handles all cases
    addFD();
  };

  const goalLabel = (id) => {
    const g = goals.find((x) => x.id === id || x._id === id);
    if (!g) return null;
    return (g.description && g.description.trim()) || (g.name === "Custom Goal" ? g.customName : g.customName || g.name);
  };

  const rows = investments.map((item) => ({
    item,
    current: Number(item.currentAmount) || Number(item.amount) || 0,
    maturity: calculateCurrentAmount(item.amount, item.interestRate, item.startDate, item.maturityDate),
  }));
  const totals = rows.reduce(
    (t, r) => ({ invested: t.invested + (Number(r.item.amount) || 0), current: t.current + r.current, maturity: t.maturity + r.maturity }),
    { invested: 0, current: 0, maturity: 0 }
  );
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="Wealth" title="Fixed deposits" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {loading && investments.length === 0 ? (
            <SkeletonCard rows={3} />
          ) : investments.length > 0 ? (
            <>
              <Card style={{ padding: 16 }}>
                <Overline>Current value · {investments.length} {investments.length === 1 ? "deposit" : "deposits"}</Overline>
                <Mono size={30} weight="700" style={styles.hero}>{inr(totals.current)}</Mono>
                <StatGrid
                  style={styles.heroStats}
                  items={[
                    { label: "Invested", value: inrCompact(totals.invested) },
                    { label: "At maturity", value: inrCompact(totals.maturity), color: P.pos },
                    { label: "Interest", value: inrCompact(totals.maturity - totals.invested, { sign: true }), color: P.pos },
                  ]}
                />
              </Card>

              <SectionHeader title="Your deposits" />
              {rows.map(({ item, current, maturity }, i) => (
                <Card key={item.id || i} style={{ gap: 12 }}>
                  <View style={styles.rowHead}>
                    <Mono size={17}>{inr(item.amount)}</Mono>
                    <Badge color={P.pos} bg={P.posSoft}>{item.interestRate}% p.a.</Badge>
                  </View>
                  <StatGrid
                    items={[
                      { label: "Value now", value: inr(current) },
                      { label: "At maturity", value: inr(maturity), color: P.pos },
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
              <Text style={styles.emptyTitle}>No fixed deposits yet</Text>
              <Text style={styles.note}>Add one below to track its value and maturity.</Text>
            </Card>
          )}

          <SectionHeader title="Add a fixed deposit" />
          <Card style={{ gap: 14 }}>
            <Field label="Amount (₹)" value={amount} onChangeText={setAmount} placeholder="Principal, e.g. 1,00,000" keyboardType="numeric" />
            <Field label="Interest rate (% p.a.)" value={interestRate} onChangeText={setInterestRate} placeholder="e.g. 7.1" keyboardType="decimal-pad" />
            <DateField label="Maturity date" value={maturityDate} onChange={(d) => onDateChange({ type: "set" }, d)} minimumDate={new Date()} />
            <SelectField
              label="Link to goal"
              value={selectedGoal}
              onChange={setSelectedGoal}
              placeholder="Select a goal"
              title="Which goal is this for?"
              options={goals.map((g) => ({ value: g.id || g._id, label: g.customName || g.name || "F.I.R.E Number" }))}
            />
            {(() => {
              const amt = parseFloat(amount);
              const rate = parseFloat(interestRate);
              if (!(amt > 0) || !(rate > 0)) return null;
              const years = Math.max(0, (maturityDate - new Date()) / (365.25 * 86400000));
              const atMaturity = amt * Math.pow(1 + rate / 100, years);
              return (
                <Summary
                  rows={[
                    { label: "At maturity (approx.)", value: inr(atMaturity), strong: true },
                    { label: "Interest earned", value: inr(atMaturity - amt, { sign: true }), color: P.pos },
                  ]}
                />
              );
            })()}
            <Button
              title="Add fixed deposit"
              onPress={addFD}
              loading={loading}
              disabled={!amount || !interestRate || !selectedGoal}
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
    rowFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line },
    note: { flex: 1, fontSize: 12, color: P.mute },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  })
);
