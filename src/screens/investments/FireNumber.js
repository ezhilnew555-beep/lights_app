import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Modal,
  Linking,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import {
  Card,
  Ring,
  Mono,
  Overline,
  StatCard,
  SectionHeader,
  FieldRow,
  Button,
  Field,
  Sheet,
  SheetActions,
  StatGrid,
  DateField,
  TextAction,
  Hint,
  LegendDot,
  ScreenSkeleton,
  FadeIn,
  CountUp,
  ErrorState,
} from "../../components/pulse";
import { markSeen } from "../../ux/discovery";
import { dailySpendAverage } from "../../ux/insights";
import { inr, inrCompact } from "../../utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import { auth } from "../../config/FirebaseConfig";
import { getInvestments, getTransactions, getProfile } from "../../services/firestoreService";
import { usePortfolioLive, goalHoldings, refreshPortfolio, assetClassOf as classKey, FIRE_GOAL_ID } from "../../services/portfolioLive";
import inflationWorkbook from "../../../assets/reference/inflation_values.json";
import PPPCalculator from "../../components/PPPCalculator";
import { ADVISORS, AdvisorCard, BookingSheet } from "../../components/AdvisorBooking";

import { toast } from "../../ux/toast";
const { width } = Dimensions.get("window");

// Bundled inflation data fallback (India-first, common countries)
const BUNDLED_INFLATION = [
  { country_name: "India", AVG: 7.5 },
  { country_name: "United States", AVG: 3.5 },
  { country_name: "United Kingdom", AVG: 4.1 },
  { country_name: "Euro Area", AVG: 3.8 },
  { country_name: "China", AVG: 1.8 },
  { country_name: "Japan", AVG: 1.2 },
  { country_name: "Brazil", AVG: 5.4 },
  { country_name: "Germany", AVG: 3.6 },
  { country_name: "Canada", AVG: 3.3 },
  { country_name: "Australia", AVG: 4.0 },
];
const INDIA_INFLATION_AVG = 7.5;

// Same asset-class colours as the Wealth tab, so each class reads the same everywhere
const ASSET_CLASSES = [
  { key: "SIP/MF", label: "Mutual funds", color: "a1" },
  { key: "Stock", label: "Stocks", color: "a2" },
  { key: "FD", label: "Fixed deposits", color: "a3" },
  { key: "Savings", label: "Savings", color: "a4" },
  { key: "RD", label: "Recurring deposits", color: "a5" },
];

const sortCountriesIndiaFirst = (data = []) => {
  const uniqueCountries = new Map();

  data.forEach((item) => {
    if (!item?.country_name || typeof item.AVG !== "number") return;
    uniqueCountries.set(item.country_name, {
      country_name: item.country_name,
      AVG: item.AVG,
    });
  });

  const normalized = Array.from(uniqueCountries.values()).sort((a, b) =>
    a.country_name.localeCompare(b.country_name)
  );

  const indiaIndex = normalized.findIndex((item) => item.country_name === "India");
  if (indiaIndex > 0) {
    const [india] = normalized.splice(indiaIndex, 1);
    normalized.unshift(india);
  }

  return normalized;
};

const applyInflationOverrides = (countries = []) =>
  countries.map((item) =>
    item?.country_name === "India"
      ? { ...item, AVG: INDIA_INFLATION_AVG }
      : item
  );

const extractInflationAvgData = (workbook) => {
  const rows = workbook?.global_inflation_data;
  if (!Array.isArray(rows) || rows.length < 2) return [];

  const header = rows[0];
  const avgIndex = Array.isArray(header) ? header.indexOf("AVG") : -1;
  if (avgIndex === -1) return [];

  return rows
    .slice(1)
    .map((row) => ({
      country_name: row?.[0],
      AVG: Number(row?.[avgIndex]),
    }))
    .filter((item) => item.country_name && Number.isFinite(item.AVG));
};

const FireNumber = () => {
  const route = useRoute();
  const scrollRef = React.useRef(null);
  const navigation = useNavigation();

  const [currentAge, setCurrentAge] = useState("");
  const [retirementAge, setRetirementAge] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState("4");
  const [yearsToRetirement, setYearsToRetirement] = useState("");
  const [yearlyExpense, setYearlyExpense] = useState("");
  const [futureAnnualExpense, setFutureAnnualExpense] = useState("");
  const [fireNumber, setFireNumber] = useState("");
  const [sip8Percent, setSip8Percent] = useState("0.00");
  const [sip10Percent, setSip10Percent] = useState("0.00");
  const [sip12Percent, setSip12Percent] = useState("0.00");
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [uniqueDays, setUniqueDays] = useState(0);
  const [dailyAverage, setDailyAverage] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [includeToday, setIncludeToday] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");

  const [linkedInvestments, setLinkedInvestments] = useState([]);
  const [totalInvested, setTotalInvested] = useState(0); // current value at live prices
  const [pricedAt, setPricedAt] = useState(null);
  const [investmentsByType, setInvestmentsByType] = useState({});

  const [booking, setBooking] = useState(null);
  const [inputsOpen, setInputsOpen] = useState(false);
  const [draft, setDraft] = useState({ age: "", retire: "", swr: "" });

  const getInflationRate = () => {
    return INDIA_INFLATION_AVG;
  };

  const availableFilters = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { years: [], months: [] };
    }

    const years = [
      ...new Set(
        expenses.map((expense) => {
          const date = new Date(expense.date);
          return date.getFullYear();
        })
      ),
    ].sort((a, b) => b - a);

    const months = [
      { name: "January", value: 0 },
      { name: "February", value: 1 },
      { name: "March", value: 2 },
      { name: "April", value: 3 },
      { name: "May", value: 4 },
      { name: "June", value: 5 },
      { name: "July", value: 6 },
      { name: "August", value: 7 },
      { name: "September", value: 8 },
      { name: "October", value: 9 },
      { name: "November", value: 10 },
      { name: "December", value: 11 },
    ];

    return { years, months };
  }, [expenses]);

  // Everything mapped to F.I.R.E., valued from the shared live feed: a price
  // tick updates this screen, Home and Goals at the same moment.
  const portfolio = usePortfolioLive();
  const [fireDayChange, setFireDayChange] = useState(0);
  // Ticks "See your F.I.R.E. plan" on Home's Getting Started card
  useEffect(() => markSeen("fire"), []);
  useEffect(() => {
    const hold = goalHoldings(portfolio.investments, portfolio.live, FIRE_GOAL_ID);
    const byType = {};
    hold.items.forEach(({ inv, value }) => {
      const key = classKey(inv);
      if (!byType[key]) byType[key] = { amount: 0, count: 0, investments: [] };
      byType[key].amount += value.current;
      byType[key].count += 1;
      byType[key].investments.push(inv);
    });
    setLinkedInvestments(hold.items.map((x) => x.inv));
    setInvestmentsByType(byType);
    setTotalInvested(hold.current);
    setFireDayChange(hold.dayChange);
    setPricedAt(portfolio.live?.at || null);
  }, [portfolio]);

  useEffect(() => {
    if (!expenses || expenses.length === 0) {
      setFilteredExpenses([]);
      return;
    }

    let result = [...expenses];
    if (filterYear !== "All") {
      const yearNum = parseInt(filterYear);
      result = result.filter(
        (expense) => new Date(expense.date).getFullYear() === yearNum
      );
    }
    if (filterMonth !== "All") {
      const monthNum = parseInt(filterMonth);
      result = result.filter(
        (expense) => new Date(expense.date).getMonth() === monthNum
      );
    }
    setFilteredExpenses(result);
  }, [expenses, filterYear, filterMonth]);

  const fetchInflationData = async () => {
    try {
      const workbookInflationData = extractInflationAvgData(inflationWorkbook);

      const finalInflationData = applyInflationOverrides(
        workbookInflationData.length > 0
          ? sortCountriesIndiaFirst(workbookInflationData)
          : sortCountriesIndiaFirst(BUNDLED_INFLATION)
      );

      if (!finalInflationData.length) {
        throw new Error("No inflation data available");
      }

      return true;
    } catch (err) {
      console.error("Error loading inflation data:", err);
      return false;
    }
  };

  // Pull-to-refresh / data changes: reload the shared feed (values arrive via the effect above)
  const fetchLinkedInvestments = () => refreshPortfolio({ reload: true, force: true });

  const fetchUserData = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { 
        setError("User not logged in"); 
        setLoading(false); 
        return false; 
      }

      const profile = await getProfile(uid);
      if (profile) {
        if (profile.age) setCurrentAge(String(profile.age));
        if (profile.retirementAge) setRetirementAge(String(profile.retirementAge));
      }

      const allTx = await getTransactions(uid);
      const expenseTx = allTx.filter((tx) => tx.type === "Expense");

      setExpenses(expenseTx);
      setFilteredExpenses(expenseTx);

      // Per calendar day since the first expense, so ₹0 days count too
      const { avg: dailyAvg, days } = dailySpendAverage(allTx, { includeToday });
      if (days > 0) {
        setUniqueDays(days);
        setDailyAverage(dailyAvg.toFixed(2));
        setMonthlyExpense(dailyAvg.toFixed(2));
      } else {
        setMonthlyExpense("0.00");
        setDailyAverage("0.00");
        setUniqueDays(0);
      }

      await fetchLinkedInvestments();
      return true;
    } catch (err) {
      console.error("Error fetching user data:", err);
      return false;
    }
  };

  const getExpensesSummary = () => {
    if (expenses.length === 0) return "No essential expenses recorded";
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const earliestDate = new Date(sortedExpenses[0].date);
    const latestDate = new Date(sortedExpenses[sortedExpenses.length - 1].date);
    const formattedEarliest = earliestDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedLatest = latestDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${expenses.length} expenses across ${uniqueDays} days (avg ₹${dailyAverage}/day) from ${formattedEarliest} to ${formattedLatest}`;
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      const inflationLoaded = await fetchInflationData();
      const userDataLoaded = await fetchUserData();
      if (inflationLoaded && userDataLoaded) {
        setError(null);
      }
      setLoading(false);
    };
    loadAllData();
  }, [includeToday]);

  useEffect(() => {
    const refreshDataListener = EventRegister.addEventListener(
      "refreshData",
      () => {
        onRefresh();
      }
    );
    return () => EventRegister.removeEventListener(refreshDataListener);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (currentAge && retirementAge) {
      const years = parseInt(retirementAge) - parseInt(currentAge);
      setYearsToRetirement(years > 0 ? years.toString() : "0");
    }
  }, [currentAge, retirementAge]);

  useEffect(() => {
    if (monthlyExpense) {
      const yearly = parseFloat(monthlyExpense) * 365;
      setYearlyExpense(yearly.toFixed(2));
    }
  }, [monthlyExpense]);

  useEffect(() => {
    if (yearlyExpense && yearsToRetirement) {
      const inflation = getInflationRate() / 100;
      const years = parseInt(yearsToRetirement);
      const presentExpense = parseFloat(yearlyExpense);
      const futureExpense = presentExpense * Math.pow(1 + inflation, years);
      setFutureAnnualExpense(futureExpense.toFixed(2));
    }
  }, [yearlyExpense, yearsToRetirement]);

  useEffect(() => {
    if (futureAnnualExpense && safeWithdrawalRate) {
      const swr = parseFloat(safeWithdrawalRate) / 100;
      const fireNum = parseFloat(futureAnnualExpense) / swr;
      setFireNumber(fireNum.toFixed(2));
    }
  }, [futureAnnualExpense, safeWithdrawalRate]);

  useEffect(() => {
    if (fireNumber && yearsToRetirement) {
      const futureValueTarget = parseFloat(fireNumber) - totalInvested;
      const n = parseInt(yearsToRetirement) * 12;
      const calculateSIP = (annualInterestRate) => {
        const monthlyInterestRate = annualInterestRate / 100 / 12;
        if (n <= 0) return 0;
        if (monthlyInterestRate === 0) return futureValueTarget / n;
        const sip =
          (futureValueTarget * monthlyInterestRate) /
          (Math.pow(1 + monthlyInterestRate, n) - 1);
        return sip > 0 ? sip.toFixed(2) : "0.00";
      };
      setSip8Percent(calculateSIP(8));
      setSip10Percent(calculateSIP(10));
      setSip12Percent(calculateSIP(12));
    } else {
      setSip8Percent("0.00");
      setSip10Percent("0.00");
      setSip12Percent("0.00");
    }
  }, [fireNumber, yearsToRetirement, totalInvested]);

  // Wealth → "Book" lands here with openAdvisor: scroll to the advisor section
  useEffect(() => {
    if (!route.params?.openAdvisor || loading) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
    return () => clearTimeout(t);
  }, [route.params?.openAdvisor, loading]);

  const resetFilters = () => {
    setFilterMonth("All");
    setFilterYear("All");
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const toggleIncludeToday = () => {
    setIncludeToday(!includeToday);
  };

  const handleLinkPress = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      toast.error("This link can't be opened on your phone.", { title: "Couldn't open link" });
    }
  };

  // Linked investments by asset class, in the Wealth tab's order
  const allocation = ASSET_CLASSES.map((c) => ({ ...c, amount: investmentsByType[c.key]?.amount || 0 }))
    .concat(
      Object.keys(investmentsByType)
        .filter((k) => !ASSET_CLASSES.some((c) => c.key === k))
        .map((k) => ({ key: k, label: k, color: "mute", amount: investmentsByType[k].amount }))
    )
    .filter((c) => c.amount > 0);

  const openInputs = () => {
    setDraft({ age: currentAge, retire: retirementAge, swr: safeWithdrawalRate });
    setInputsOpen(true);
  };
  const saveInputs = () => {
    const age = parseInt(draft.age, 10);
    const retire = parseInt(draft.retire, 10);
    const swr = parseFloat(draft.swr);
    if (!(age > 0) || !(retire > age)) return toast.warning("Retirement age must be greater than your current age.", { title: "Check your ages" });
    if (!(swr > 0 && swr <= 10)) return toast.warning("Use a rate between 0 and 10% (4% is typical).", { title: "Check the withdrawal rate" });
    setCurrentAge(String(age));
    setRetirementAge(String(retire));
    setSafeWithdrawalRate(String(swr));
    setInputsOpen(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenSkeleton rows={3} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState fill title="Couldn't load your F.I.R.E. plan" message={error} onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      
      {/* Plan tab header (title + F.I.R.E./Goals switch) is rendered by App.js */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />
          }
        >
          {/* Pulse F.I.R.E. summary — ring, number, milestones and key figures */}
          {(() => {
            const target = parseFloat(fireNumber) || 0;
            const invested = parseFloat(totalInvested) || 0;
            const progress = target > 0 ? Math.min(invested / target, 1) : 0;
            const sipNeeded = parseFloat(sip12Percent) || 0;
            return (
              <View style={{ gap: 14 }}>
                <FadeIn>
                <Card style={{ padding: 20, alignItems: "center", gap: 14 }}>
                  <Ring size={200} stroke={14} value={progress}>
                    <CountUp
                      id="fire.pct"
                      value={progress * 100}
                      format={(v) => `${v.toFixed(1)}%`}
                      size={40}
                      weight="700"
                      style={{ letterSpacing: -1.6 }}
                    />
                    <Overline>to freedom</Overline>
                  </Ring>
                  <View style={{ alignItems: "center", gap: 4 }}>
                    <Overline>Your F.I.R.E. number</Overline>
                    {target ? (
                      <CountUp
                        id="fire.target"
                        value={target}
                        format={inrCompact}
                        size={32}
                        weight="700"
                        style={{ letterSpacing: -1 }}
                      />
                    ) : (
                      <Mono size={32} weight="700" style={{ letterSpacing: -1 }}>
                        —
                      </Mono>
                    )}
                    <Text style={{ fontSize: 13, color: P.ink2 }}>
                      {inrCompact(invested)} invested
                      {target ? ` · ${inrCompact(Math.max(target - invested, 0))} to go` : ""}
                    </Text>
                  </View>
                </Card>
                </FadeIn>
                {target ? (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {/* Milestones light up one after another as the ring fills */}
                    {[0.25, 0.5, 0.75, 1].map((m, mi) => (
                      <FadeIn key={m} delay={250 + mi * 90} offset={6} style={{ flex: 1 }}>
                      <View
                        style={{
                          flex: 1,
                          gap: 4,
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 10,
                          backgroundColor: progress >= m ? P.acc : P.surf2,
                        }}
                      >
                        <Mono size={11} weight="400" color={progress >= m ? P.accInk : P.mute}>
                          {m * 100}%
                        </Mono>
                        <Mono size={12} color={progress >= m ? P.accInk : P.ink} numberOfLines={1} adjustsFontSizeToFit>
                          {inrCompact(target * m)}
                        </Mono>
                      </View>
                      </FadeIn>
                    ))}
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <StatCard label="Years to go" value={yearsToRetirement || "—"} />
                  <StatCard label="SIP needed" value={sipNeeded ? `${inr(sipNeeded)}/mo` : "—"} color={P.accTx} />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <StatCard label="Spend today" value={yearlyExpense ? `${inrCompact(yearlyExpense)}/yr` : "—"} />
                  <StatCard
                    label={retirementAge ? `Spend at ${retirementAge}` : "Spend at retirement"}
                    value={futureAnnualExpense ? `${inrCompact(futureAnnualExpense)}/yr` : "—"}
                  />
                </View>
              </View>
            );
          })()}

          {/* Inputs (design: key/value list with an Edit action) */}
          <SectionHeader title="Inputs" action="Edit" onAction={openInputs} />
          <Card style={styles.listCard}>
            <FieldRow label="Current age" value={currentAge || "—"} onPress={openInputs} />
            <FieldRow label="Retirement age" value={retirementAge || "—"} onPress={openInputs} />
            <FieldRow label="Avg daily expenses" value={monthlyExpense ? inr(monthlyExpense) : "—"} chevron={false} />
            <FieldRow label="Country · inflation" value={`India · ${INDIA_INFLATION_AVG.toFixed(1)}%`} chevron={false} />
            <FieldRow label="Withdrawal rate" value={`${safeWithdrawalRate || "—"}%`} onPress={openInputs} last />
          </Card>
          <Text style={styles.note}>{getExpensesSummary()}. Daily expenses come from your logged spending.</Text>

          {/* Monthly SIP to close the gap */}
          <SectionHeader title="Monthly SIP needed" />
          <Card>
            <StatGrid
              items={[
                { label: "At 8%", value: inr(sip8Percent) },
                { label: "At 10%", value: inr(sip10Percent) },
                { label: "At 12%", value: inr(sip12Percent), color: P.pos },
              ]}
            />
            <Text style={[styles.note, { marginTop: 12 }]}>
              To reach {fireNumber ? inrCompact(fireNumber) : "your number"} in {yearsToRetirement || "—"} years, on top of what you've already invested.
            </Text>
          </Card>

          {/* Progress by asset class */}
          <SectionHeader
            title="Invested towards F.I.R.E."
            action={pricedAt ? `Live · ${pricedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : null}
          />
          {allocation.length ? (
            <Card>
              <View style={styles.allocHead}>
                <Mono size={22} weight="700">{inr(totalInvested)}</Mono>
                <Text style={styles.note}>
                  {parseFloat(fireNumber) > 0 ? `${((totalInvested / parseFloat(fireNumber)) * 100).toFixed(1)}% of target` : ""}
                  {fireDayChange ? (
                    <Text mono style={{ color: fireDayChange > 0 ? P.pos : P.neg }}>
                      {" · today "}
                      {inrCompact(fireDayChange, { sign: true })}
                    </Text>
                  ) : null}
                </Text>
              </View>
              {/* Share of the target each class covers; the track is what's still to go */}
              <View style={styles.allocTrack}>
                {allocation.map((c) => (
                  <View
                    key={c.key}
                    style={{
                      width: `${Math.max(1, (c.amount / Math.max(parseFloat(fireNumber) || 0, totalInvested || 1)) * 100)}%`,
                      backgroundColor: P[c.color],
                    }}
                  />
                ))}
              </View>
              {allocation.map((c, i) => (
                <View key={c.key} style={[styles.allocRow, i === allocation.length - 1 && { borderBottomWidth: 0 }]}>
                  <LegendDot color={P[c.color]} label={c.label} square />
                  <View style={{ flex: 1 }} />
                  <Mono size={14}>{inr(c.amount)}</Mono>
                  <Text mono style={styles.allocPct}>
                    {totalInvested ? Math.round((c.amount / totalInvested) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Card style={{ alignItems: "center", gap: 6, paddingVertical: 22 }}>
              <Text style={styles.emptyTitle}>Nothing linked yet</Text>
              <Text style={[styles.note, { textAlign: "center" }]}>
                When you add an FD, fund or stock, map it to F.I.R.E. and it counts here at live prices.
              </Text>
            </Card>
          )}

          {/* Purchasing Power Parity */}
          <PPPCalculator fireNumber={fireNumber} />

          {/* Advisors */}
          <SectionHeader title="Talk to an advisor" />
          {ADVISORS.map((advisor) => (
            <AdvisorCard key={advisor.id} advisor={advisor} onBook={setBooking} />
          ))}
          <Button title="Book an advisor call" variant="ghost" onPress={() => setBooking(ADVISORS[0])} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit inputs */}
      <Sheet
        visible={inputsOpen}
        onClose={() => setInputsOpen(false)}
        overline="F.I.R.E. inputs"
        title="Your plan"
        footer={
          <SheetActions>
            <Button title="Cancel" variant="ghost" onPress={() => setInputsOpen(false)} />
            <Button title="Save" onPress={saveInputs} />
          </SheetActions>
        }
      >
        <Field label="Current age" value={draft.age} onChangeText={(v) => setDraft((d) => ({ ...d, age: v }))} keyboardType="number-pad" />
        <Field label="Retirement age" value={draft.retire} onChangeText={(v) => setDraft((d) => ({ ...d, retire: v }))} keyboardType="number-pad" />
        <Field label="Safe withdrawal rate (%)" value={draft.swr} onChangeText={(v) => setDraft((d) => ({ ...d, swr: v }))} keyboardType="decimal-pad" />
        <Hint>4% is the common rule: withdraw 4% of your corpus a year.</Hint>
      </Sheet>

      <BookingSheet advisor={booking} onClose={() => setBooking(null)} />
    </SafeAreaView>
  );
};

const formatCurrency = (value) => {
  if (!value || value === "0.00") return "0";
  return parseFloat(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: P.bg },
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontSize: 14, color: P.ink2 },
    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
    errorIconContainer: { marginBottom: 4 },
    errorTitle: { fontSize: 18, fontWeight: "600", color: P.ink },
    errorText: { fontSize: 14, color: P.ink2, textAlign: "center" },
    retryButton: { marginTop: 6, height: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: P.acc, alignItems: "center", justifyContent: "center" },
    retryButtonText: { fontSize: 15, fontWeight: "600", color: P.accInk },
    listCard: { paddingVertical: 2 },
    note: { fontSize: 12, lineHeight: 17, color: P.mute },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
    allocHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
    allocTrack: { flexDirection: "row", gap: 2, height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: P.surf2, marginTop: 12, marginBottom: 4 },
    allocRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.line },
    allocPct: { width: 40, textAlign: "right", fontSize: 12, color: P.mute },
  })
);

export default FireNumber;
