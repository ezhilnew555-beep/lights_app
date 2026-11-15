import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { P, themedStyles } from "../../theme/theme";
import {
  Text,
  Card,
  Mono,
  Overline,
  Chip,
  Field,
  Button,
  ProgressBar,
  SectionHeader,
  StatGrid,
  TextAction,
  LegendDot,
  SkeletonCard,
  RowIn,
} from "../../components/pulse";
import { inr, inrCompact } from "../../utils/format";
import { useNavigation } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../config/FirebaseConfig";
import {
  getGoals,
  addGoal,
  updateGoal as fsUpdateGoal,
  deleteGoal as fsDeleteGoal,
} from "../../services/firestoreService";
import { usePortfolioLive, goalHoldings } from "../../services/portfolioLive";


import { toast } from "../../ux/toast";
import { animateLayout } from "../../ux/motion";
import { celebrateOnce } from "../../ux/celebrate";
// Default inflation is 7.5
const GOAL_TEMPLATES = {
  Education: {
    name: "Education",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  Marriage: {
    name: "Marriage",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  "Dream Home": {
    name: "Dream Home",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  "Wealth Creation": {
    name: "Wealth Creation",
    presentCost: "",
    currentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  Custom: {
    name: "Custom Goal",
    customName: "",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
};

const ASSET_CLASSES = [
  { key: "SIP/MF", label: "Mutual funds", color: "a1" },
  { key: "Stock", label: "Stocks", color: "a2" },
  { key: "FD", label: "Fixed deposits", color: "a3" },
  { key: "Savings", label: "Savings", color: "a4" },
  { key: "RD", label: "Recurring deposits", color: "a5" },
];

const goalTitle = (g) =>
  (g.description && g.description.trim()) || (g.name === "Custom Goal" ? g.customName : g.customName || g.name);

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

const sipFor = (amount, years, ratePct) => {
  const n = Math.round(years * 12);
  if (!(amount > 0) || !(n > 0)) return 0;
  const r = ratePct / 1200;
  return r > 0 ? (amount * r) / (Math.pow(1 + r, n) - 1) : amount / n;
};

/**
 * Goal figures, computed from its inputs when the stored results are missing
 * (older goals were saved before these fields existed).
 */
const deriveGoal = (g) => {
  const years = Number(g.years) || 0;
  const inflation = Number(g.inflation) || 0;
  const ret = Number(g.returnRate) || 12;
  const savings = Number(g.currentSip ?? g.currentSavings) || 0;
  const futureCost = Number(g.futureCost) || Number(g.presentCost || 0) * Math.pow(1 + inflation / 100, years);
  const futureSavings = Number(g.futureValueOfSavings) || savings * Math.pow(1 + ret / 100, years);
  const required = g.required !== undefined && g.required !== null ? Number(g.required) : Math.max(0, futureCost - futureSavings);
  return { years, futureCost, futureSavings, required, returnRate: ret };
};

export default function GoalCalculator() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [selectedGoal, setSelectedGoal] = useState("Education");
  const [goalData, setGoalData] = useState({
    ...GOAL_TEMPLATES["Education"],
  });
  const [goalResults, setGoalResults] = useState([]);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [errorFields, setErrorFields] = useState([]);
  const [loading, setLoading] = useState(true);
  // Investments mapped to each goal, valued from the shared live feed: when a
  // stock or fund moves, every goal it's mapped to moves with it (and Home /
  // F.I.R.E. update on the same tick).
  const portfolio = usePortfolioLive();

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    const listener = EventRegister.addEventListener("investmentAdded", () => fetchGoals());
    return () => { EventRegister.removeEventListener(listener); };
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }
      const goals = await getGoals(uid);
      setGoalResults(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to fetch goals.");
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (goalId) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) return;
              await fsDeleteGoal(uid, goalId);
              fetchGoals();
              if (editingGoalId === goalId) cancelEdit();
            } catch (error) {
              console.error("Error deleting goal:", error);
              toast.error("Failed to delete the goal.");
            }
          },
        },
      ]
    );
  };

  const calculateGoal = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error("Please log in again.");
      return;
    }

    const g = goalData;
    const cost = parseFloat(g.presentCost);
    let y;

    if (g.name === "Education" || g.name === "Marriage") {
      y = parseFloat(g.goalAge) - parseFloat(g.childCurrentAge);
    } else if (g.name === "Wealth Creation") {
      y = parseFloat(g.goalAge) - parseFloat(g.currentAge);
    } else {
      y = parseFloat(g.years);
    }

    const inf = parseFloat(g.inflation);
    const ret = parseFloat(g.returnRate) || 12;
    const inHandValue = parseFloat(g.currentSip) || 0;

    const requiredFields = [];
    requiredFields.push({
      key: "presentCost",
      value: cost,
      fieldValue: g.presentCost,
    });
    requiredFields.push({
      key: "description",
      value: g.description,
      fieldValue: g.description,
    });
    requiredFields.push({
      key: "inflation",
      value: inf,
      fieldValue: g.inflation,
    });

    if (g.name === "Education" || g.name === "Marriage") {
      requiredFields.push({
        key: "goalAge",
        value: parseFloat(g.goalAge),
        fieldValue: g.goalAge,
      });
      requiredFields.push({
        key: "childCurrentAge",
        value: parseFloat(g.childCurrentAge),
        fieldValue: g.childCurrentAge,
      });
    } else if (g.name === "Wealth Creation") {
      requiredFields.push({
        key: "goalAge",
        value: parseFloat(g.goalAge),
        fieldValue: g.goalAge,
      });
      requiredFields.push({
        key: "currentAge",
        value: parseFloat(g.currentAge),
        fieldValue: g.currentAge,
      });
    } else if (g.name === "Dream Home" || g.name === "Custom Goal") {
      requiredFields.push({
        key: "years",
        value: parseFloat(g.years),
        fieldValue: g.years,
      });
    }

    if (g.name === "Custom Goal") {
      requiredFields.push({
        key: "customName",
        value: g.customName,
        fieldValue: g.customName,
      });
    }

    const invalidFields = requiredFields.filter((field) => {
      const isStringField = field.key === "customName" || field.key === "description";
      if (isStringField) {
        return !field.fieldValue || field.fieldValue.trim() === "";
      } else {
        return (
          !field.fieldValue ||
          field.fieldValue.trim() === "" ||
          isNaN(field.value) ||
          field.value <= 0
        );
      }
    });

    if (invalidFields.length > 0) {
      const invalidFieldNames = invalidFields.map((field) => field.key);
      setErrorFields(invalidFieldNames);
      toast.warning("Please fill all required fields with valid values.", { title: "Check the details" });
      return;
    }

    if (g.name === "Education" || g.name === "Marriage") {
      if (parseFloat(g.goalAge) <= parseFloat(g.childCurrentAge)) {
        setErrorFields(["goalAge", "childCurrentAge"]);
        toast.warning("Goal age must be greater than current age.");
        return;
      }
    } else if (g.name === "Wealth Creation") {
      if (parseFloat(g.goalAge) <= parseFloat(g.currentAge)) {
        setErrorFields(["goalAge", "currentAge"]);
        toast.warning("Goal age must be greater than current age.");
        return;
      }
    }

    setErrorFields([]);
    const futureCost = cost * Math.pow(1 + inf / 100, y);
    const futureValueOfInHand = inHandValue * Math.pow(1 + ret / 100, y);
    const totalFutureValueOfSavings = futureValueOfInHand;
    const requiredAmount = futureCost - totalFutureValueOfSavings > 0 ? futureCost - totalFutureValueOfSavings : 0;
    const months = y * 12;
    const monthlyRate = ret / 1200;
    let monthlySIP = 0;

    if (requiredAmount > 0 && monthlyRate > 0) {
      monthlySIP = (requiredAmount * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    } else if (requiredAmount > 0) {
      monthlySIP = requiredAmount / months;
    }

    const result = {
      name: g.name,
      customName: g.customName || null,
      description: g.description || null,
      presentCost: cost,
      childCurrentAge: parseFloat(g.childCurrentAge) || null,
      goalAge: parseFloat(g.goalAge) || null,
      years: y,
      currentAge: parseFloat(g.currentAge) || null,
      inflation: inf,
      returnRate: ret,
      currentSip: inHandValue,
      investmentType: g.investmentType,
      futureCost,
      required: requiredAmount,
      futureValueOfSavings: totalFutureValueOfSavings,
      monthlySIP: monthlySIP > 0 ? monthlySIP : 0,
    };

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("Please log in again.");
        return;
      }
      if (editingGoalId) {
        await fsUpdateGoal(uid, editingGoalId, result);
        toast.success("Goal updated successfully!");
      } else {
        await addGoal(uid, result);
        toast.success("Goal saved successfully!");
      }
      await fetchGoals();
      cancelEdit();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error(`Failed to ${editingGoalId ? "update" : "save"} the goal.`);
    }
  };

  const updateGoal = (key, value) => {
    let updatedData = { ...goalData, [key]: value };
    setGoalData(updatedData);
    if (errorFields.includes(key)) {
      setErrorFields(errorFields.filter((field) => field !== key));
    }
  };

  const editGoal = (goal) => {
    setGoalData({
      name: goal.name,
      customName: goal.customName || "",
      description: goal.description || "",
      presentCost: goal.presentCost?.toString() || "",
      childCurrentAge: goal.childCurrentAge?.toString() || "",
      goalAge: goal.goalAge?.toString() || "",
      years: goal.years?.toString() || "",
      currentAge: goal.currentAge?.toString() || "",
      inflation: goal.inflation?.toString() || "7.5",
      returnRate: goal.returnRate?.toString() || "",
      currentSip: goal.currentSip?.toString() || "",
      investmentType: goal.investmentType || "SIP/MF",
    });
    setSelectedGoal(goal.name === "Custom Goal" ? "Custom" : goal.name);
    setEditingGoalId(goal.id || goal.id);
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    setGoalData({ ...GOAL_TEMPLATES[selectedGoal] });
    setErrorFields([]);
  };

  // Live value of what's mapped to a goal, by asset class, plus today's move
  const linkedValue = (goal) => {
    const h = goalHoldings(portfolio.investments, portfolio.live, goal);
    return { total: h.current, byClass: h.byClass, dayChange: h.dayChange };
  };

  // Live preview of the goal being entered
  const preview = (() => {
    const g = goalData;
    const cost = parseFloat(g.presentCost);
    let y;
    if (g.name === "Education" || g.name === "Marriage") y = parseFloat(g.goalAge) - parseFloat(g.childCurrentAge);
    else if (g.name === "Wealth Creation") y = parseFloat(g.goalAge) - parseFloat(g.currentAge);
    else y = parseFloat(g.years);
    if (!(cost > 0) || !(y > 0)) return null;
    const d = deriveGoal({ presentCost: cost, years: y, inflation: parseFloat(g.inflation) || 0, returnRate: parseFloat(g.returnRate) || 12, currentSip: parseFloat(g.currentSip) || 0 });
    return { ...d, years: y };
  })();

  const pickTemplate = (key) => {
    setSelectedGoal(key);
    setGoalData({ ...GOAL_TEMPLATES[key] });
    setEditingGoalId(null);
    setErrorFields([]);
  };

  const field = (key, label, placeholder, numeric = true) => (
    <Field
      key={key}
      label={label}
      value={goalData[key]}
      onChangeText={(t) => updateGoal(key, t)}
      placeholder={placeholder}
      keyboardType={numeric ? "decimal-pad" : "default"}
      inputStyle={errorFields.includes(key) ? { borderColor: P.neg } : null}
    />
  );

  const renderGoalInputs = () => {
    const common = [
      field("presentCost", "Cost today (₹)", "e.g. 50,00,000"),
      field("description", "Description", "e.g. Riya's engineering degree", false),
    ];
    const rest = [field("inflation", "Inflation (%)", "7.5"), field("currentSip", "Already saved (₹)", "e.g. 1,00,000")];
    switch (selectedGoal) {
      case "Education":
      case "Marriage":
        return [...common, field("childCurrentAge", "Child's age now", "e.g. 5"), field("goalAge", "Age at goal", "e.g. 18"), ...rest];
      case "Wealth Creation":
        return [...common, field("currentAge", "Your age now", "e.g. 30"), field("goalAge", "Age at goal", "e.g. 60"), ...rest];
      case "Custom":
        return [...common, field("customName", "Goal name", "e.g. World tour", false), field("years", "Years to goal", "e.g. 15"), ...rest];
      default:
        return [...common, field("years", "Years to goal", "e.g. 8"), ...rest];
    }
  };

  const goals = goalResults;

  // A goal whose linked investments already cover what it needs (no SIP
  // left to pay) gets one celebration
  useEffect(() => {
    if (!portfolio.loaded || loading) return;
    goals.forEach((goal) => {
      const d = deriveGoal(goal);
      const linked = linkedValue(goal);
      if (!goal.id || !(d.required > 0) || linked.total < d.required) return;
      celebrateOnce(`goal.${goal.id}`, {
        icon: "trophy",
        tone: "pos",
        title: "Goal fully funded",
        message: `${goal.customName || goal.name || "Your goal"} is covered by the investments linked to it. No more SIP needed.`,
      });
    });
  }, [portfolio, loading, goals]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      {/* Plan tab header (title + F.I.R.E./Goals switch) is rendered by App.js */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Saved goals */}
          {loading ? (
            <SkeletonCard rows={2} />
          ) : goals.length === 0 ? (
            <Card style={{ alignItems: "center", gap: 6, paddingVertical: 22 }}>
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.note}>Pick a goal below to see what it will cost and the SIP it needs.</Text>
            </Card>
          ) : (
            goals.map((goal, gi) => {
              const d = deriveGoal(goal);
              const linked = linkedValue(goal);
              const have = d.futureSavings + linked.total;
              const progress = d.futureCost ? Math.min(1, have / d.futureCost) : 0;
              const remaining = Math.max(0, d.required - linked.total);
              const sip12 = sipFor(remaining, d.years, 12);
              const open = !!expanded[goal.id];
              const updated = toDate(goal.updatedAt || goal.createdAt);
              return (
                <RowIn key={goal.id} index={gi}>
                <Card
                  onPress={() => {
                    // Details open in place; the goals below make room smoothly
                    animateLayout();
                    setExpanded((e) => ({ ...e, [goal.id]: !e[goal.id] }));
                  }}
                >
                  <View style={{ gap: 12 }}>
                    <View style={styles.goalHead}>
                      <Text style={styles.goalName} numberOfLines={1}>{goalTitle(goal)}</Text>
                      <Mono size={17}>{inrCompact(d.futureCost)}</Mono>
                    </View>
                    <ProgressBar value={progress} color={P.acc} />
                    <View style={styles.goalMeta}>
                      <Text style={styles.metaText}>
                        {inrCompact(have)} saved · {Math.round(progress * 100)}%
                      </Text>
                      <Text style={styles.metaText}>
                        {d.years} yrs · {inrCompact(goal.presentCost)} today
                      </Text>
                    </View>
                    {linked.dayChange ? (
                      <Text style={styles.metaText}>
                        Market today{" "}
                        <Text mono style={{ color: linked.dayChange > 0 ? P.pos : P.neg, fontWeight: "600" }}>
                          {inrCompact(linked.dayChange, { sign: true })}
                        </Text>
                      </Text>
                    ) : null}
                    <Text style={styles.sipLine}>
                      SIP needed <Text mono style={{ fontWeight: "700" }}>{inr(sip12)}</Text>/mo at 12%
                    </Text>

                    {open ? (
                      <View style={styles.details}>
                        <Overline>Monthly SIP by return</Overline>
                        <StatGrid
                          columns={4}
                          items={[6, 8, 10, 12].map((r) => ({
                            label: `At ${r}%`,
                            value: inrCompact(sipFor(remaining, d.years, r)),
                            color: r === 12 ? P.pos : undefined,
                          }))}
                        />
                        {linked.total > 0 ? (
                          <>
                            <Overline style={{ marginTop: 4 }}>Invested towards this goal</Overline>
                            {ASSET_CLASSES.filter((c) => linked.byClass[c.key] > 0).map((c) => (
                              <View key={c.key} style={styles.classRow}>
                                <LegendDot color={P[c.color]} label={c.label} square />
                                <View style={{ flex: 1 }} />
                                <Mono size={13}>{inr(linked.byClass[c.key])}</Mono>
                              </View>
                            ))}
                          </>
                        ) : (
                          <Text style={styles.note}>No investments linked yet. Map an FD, fund or stock to this goal when you add it.</Text>
                        )}
                        <View style={styles.cardActions}>
                          <Text style={styles.note}>
                            {updated && !Number.isNaN(updated.getTime())
                              ? `Updated ${updated.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                              : ""}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 18 }}>
                            <TextAction title="Edit" onPress={() => editGoal(goal)} />
                            <TextAction title="Delete" color={P.neg} onPress={() => deleteGoal(goal.id)} />
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </Card>
                </RowIn>
              );
            })
          )}

          {/* New / edit goal */}
          <SectionHeader
            title={editingGoalId ? "Edit goal" : "Start a new goal"}
            action={editingGoalId ? "Cancel" : null}
            onAction={editingGoalId ? cancelEdit : null}
          />
          <View style={styles.chips}>
            {Object.keys(GOAL_TEMPLATES).map((key) => (
              <Chip key={key} label={key === "Custom" ? "Custom Goal" : key} selected={selectedGoal === key} onPress={() => pickTemplate(key)} />
            ))}
          </View>
          <Card style={{ gap: 14 }}>
            {renderGoalInputs()}
            <View style={styles.previewBox}>
              <Overline>Future value</Overline>
              <Mono size={30} weight="600" style={{ letterSpacing: -0.9 }}>
                {preview ? inrCompact(preview.futureCost) : "—"}
              </Mono>
              <StatGrid
                items={[8, 10, 12].map((r) => ({
                  label: r === 8 ? "SIP at 8%" : `At ${r}%`,
                  value: preview ? inr(sipFor(preview.required, preview.years, r)) : "—",
                  color: r === 12 && preview ? P.pos : undefined,
                }))}
              />
            </View>
          </Card>
          <Button title={editingGoalId ? "Update goal" : "Save goal"} onPress={calculateGoal} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: P.bg },
    content: { paddingHorizontal: 16, gap: 14 },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
    note: { fontSize: 12, lineHeight: 17, color: P.mute },
    goalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
    goalName: { flex: 1, fontSize: 17, fontWeight: "700", color: P.ink },
    goalMeta: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    metaText: { fontSize: 13, color: P.ink2 },
    sipLine: { fontSize: 14, color: P.ink },
    details: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line },
    classRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    previewBox: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line },
  })
);
