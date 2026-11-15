import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { calculateFireTarget } from "../../utils/fireProgressHelper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { P, themedStyles } from "../../theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { EventRegister } from "react-native-event-listeners";
import { getTransactions, getInvestments, getProfile, updateProfile } from "../../services/firestoreService";
import { dailyCheckIn } from "../../services/secureFunctions";
import { auth, db } from "../../config/FirebaseConfig";
import simpleReportService from "../../services/simpleReportService";
import * as Sharing from "expo-sharing";
import {
  Text,
  Icon,
  Card,
  Badge,
  Overline,
  Mono,
  SectionHeader,
  ThemeToggle,
  Segmented,
  Chip,
  TxRow,
  ProgressBar,
  Ring,
  LegendDot,
  DayRing,
  Press,
  Skeleton,
  Tip,
  markLearned,
  FadeIn,
  RowIn,
  CountUp,
  ClockLoader,
  useSlideOnChange,
  usePop,
  Updated,
} from "../../components/pulse";
import useSwipe from "../../ux/useSwipe";
import haptics from "../../ux/haptics";
import MarketTicker from "../../components/pulse/MarketTicker";
import { refreshIndices } from "../../services/marketIndices";
import {
  inr,
  inrCompact,
  initials,
  greeting,
  dayStamp,
  timeOf,
  MONTHS_SHORT,
  MONTHS_LONG,
  localISODate,
} from "../../utils/format";
import { usePortfolioLive, goalHoldings, summarize, FIRE_GOAL_ID } from "../../services/portfolioLive";

import { toast } from "../../ux/toast";
import { amountsHidden, toggleAmountsHidden } from "../../ux/privacy";
import { celebrateOnce, markCelebrated } from "../../ux/celebrate";
import GettingStarted from "../../components/GettingStarted";
import { shareFireCard } from "../../utils/progressCard";
import {
  loggingStreak,
  spendingToday,
  streakMilestone,
  fireMilestone,
  FIRE_MILESTONES,
} from "../../ux/insights";
import ToastHost from "../../components/pulse/ToastHost";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
const INVESTMENT_SUBTYPES = ["Stock", "Mutual Fund", "FD", "RD", "Savings", "SIP", "Lumpsum"];
const isInvestmentTx = (t) =>
  t.type === "Investment" || t.method === "Investment" || INVESTMENT_SUBTYPES.includes(t.subType);

const CalendarMain = () => {
  const today = localISODate();
  const currentMonthDefault = today.slice(0, 7);
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(today);
  const [searchMonth, setSearchMonth] = useState(
    currentMonthDefault.split("-")[1]
  );
  const [searchYear, setSearchYear] = useState(
    new Date().getFullYear().toString()
  );
  const [calendarKey, setCalendarKey] = useState(0);
  const monthDir = useRef(1); // +1 moving forward in time, -1 back
  const [currentMonth, setCurrentMonth] = useState(currentMonthDefault);
  const [transactions, setTransactions] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [incomeData, setIncomeData] = useState([]);
  const [dayFlags, setDayFlags] = useState({});
  const [allTransactions, setAllTransactions] = useState([]);
  const [totalInvested, setTotalInvested] = useState(0);
  // Portfolio and F.I.R.E. value tick together with every other screen
  const portfolio = usePortfolioLive();
  const portfolioSummary = useMemo(() => summarize(portfolio.investments, portfolio.live), [portfolio]);
  const fireHold = useMemo(() => goalHoldings(portfolio.investments, portfolio.live, FIRE_GOAL_ID), [portfolio]);
  const portfolioValue = portfolioSummary.current;
  const portfolioCount = portfolioSummary.count;
  const [userName, setUserName] = useState("");
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Figures show placeholders until the first load, then refresh in place
  const [loaded, setLoaded] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [autoReportUri, setAutoReportUri] = useState(null);
  const [autoReportMeta, setAutoReportMeta] = useState(null);
  const [autoReportModalVisible, setAutoReportModalVisible] = useState(false);
  const [autoReportLoading, setAutoReportLoading] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);

  const [fireProgress, setFireProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  
  const [hasUnreadBreakout, setHasUnreadBreakout] = useState(false);
  const BREAKOUT_UNLOCK_COST = 10000;

  // Check for unread breakout stocks
  useEffect(() => {
    const checkUnreadBreakout = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const now = new Date();
        let cutoffDate = new Date(now);
        if (now.getUTCHours() < 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() < 30)) {
          cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 1);
        }
        const maxCutoffTimestamp = Date.UTC(
          cutoffDate.getUTCFullYear(),
          cutoffDate.getUTCMonth(),
          cutoffDate.getUTCDate()
        );

        const latestQuery = query(
          collection(db, "breakout_history"),
          where("Date", "<=", maxCutoffTimestamp),
          orderBy("Date", "desc"),
          limit(1)
        );
        const snap = await getDocs(latestQuery);
        let latestTimestamp = null;
        if (!snap.empty) {
          latestTimestamp = snap.docs[0].data().Date?.toString();
        } else {
          const fallbackSnap = await getDocs(query(collection(db, "breakout_history"), orderBy("Date", "desc"), limit(1)));
          if (!fallbackSnap.empty) {
            latestTimestamp = fallbackSnap.docs[0].data().Date?.toString();
          }
        }

        if (!latestTimestamp) return;

        const profile = await getProfile(uid);
        const lastUnlocked = profile?.lastBreakoutUnlock;
        
        if (lastUnlocked !== latestTimestamp && (profile?.coins || 0) >= BREAKOUT_UNLOCK_COST) {
          setHasUnreadBreakout(true);
        } else {
          setHasUnreadBreakout(false);
        }
      } catch (e) {
        console.error("Error checking breakout status:", e);
      }
    };
    checkUnreadBreakout();
  }, [auth.currentUser, currentCoins]);

  const handleBreakoutPress = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("You must be logged in to access this feature.");
        return;
      }
      
      if (currentCoins < BREAKOUT_UNLOCK_COST) {
        toast.warning(
          `You have ${currentCoins.toLocaleString("en-IN")} of ${BREAKOUT_UNLOCK_COST.toLocaleString("en-IN")} coins. Log daily to earn more.`,
          { title: "Breakout signals are locked", action: { label: "Coins", onPress: () => navigation.navigate("Coins") } }
        );
        return;
      }
      
      const now = new Date();
      let cutoffDate = new Date(now);
      if (now.getUTCHours() < 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() < 30)) {
        cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 1);
      }
      const maxCutoffTimestamp = Date.UTC(
        cutoffDate.getUTCFullYear(),
        cutoffDate.getUTCMonth(),
        cutoffDate.getUTCDate()
      );

      const latestQuery = query(
        collection(db, "breakout_history"),
        where("Date", "<=", maxCutoffTimestamp),
        orderBy("Date", "desc"),
        limit(1)
      );
      const snap = await getDocs(latestQuery);
      let latestTimestamp = null;
      if (!snap.empty) {
        latestTimestamp = snap.docs[0].data().Date?.toString();
      }

      if (latestTimestamp) {
        await updateProfile(uid, { lastBreakoutUnlock: latestTimestamp });
      }
      setHasUnreadBreakout(false);
      
      navigation.navigate("BreakoutStocksScreen");
    } catch (e) {
      console.error(e);
      toast.error("Failed to verify access.");
    }
  };

  const formatCurrency = (value) => {
    if (!value || value === "0.00" || value === 0) return "0";
    return parseFloat(value).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const fetchPremiumRewardState = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setCurrentCoins(0);
        return;
      }
      const profile = await getProfile(uid);
      setCurrentCoins(Number(profile?.coins) || 0);
      const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
      setUserName(name || profile?.userName || auth.currentUser?.displayName || "");
    } catch (error) {
      console.error("Error fetching coin balance:", error);
    }
  }, []);

  // silent: live price ticks update the figure without flashing the placeholder
  const fetchFireProgress = async (silent = false) => {
    try {
      if (!silent) setLoadingProgress(true);
      const uid = auth.currentUser?.uid;
      if (uid) {
        const result = await calculateFireTarget(uid);
        setFireProgress(result);
      }
    } catch (err) {
      console.error("❌ Error fetching FIRE progress:", err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleShareProgress = async () => {
    if (!fireView || !fireView.hasData) return;
    const { progressPercentage, totalInvested, fireNumber } = fireView;

    try {
      // Share text summary of F.I.R.E. progress
      // A designed card (ring, percentage, LigthsON) — the text below is the fallback
      await shareFireCard({
        pct: progressPercentage,
        invested: totalInvested,
        target: fireNumber,
        yearsToGo: Math.max(0, (fireView.retirementAge || 0) - (fireView.currentAge || 0)),
      });
      return;
    } catch (e) {
      console.warn("Progress card share failed, falling back to text", e);
    }

    try {
      const shareMessage = `I have achieved ${progressPercentage.toFixed(1)}% of my F.I.R.E. (Financial Independence, Retire Early) goal on LigthsON! 🚀\n\n💰 Invested: ₹${formatCurrency(totalInvested)}\n🎯 Target: ₹${formatCurrency(fireNumber)}\n\nTrack your financial independence journey on LigthsON!`;
      await Share.share({
        message: shareMessage,
      });
    } catch (e) {
      console.error("Error sharing text progress", e);
      toast.error("Could not share progress at this time.");
    }
  };

  const normalizeDate = (dateString) => {
    if (dateString && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    return dateString;
  };



  const checkAndAwardDailyCoins = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // The server decides the date, the +5 reward and any inactivity penalty.
      const result = await dailyCheckIn();
      if (!result) return; // check-in service unreachable; keep the profile balance
      setCurrentCoins(Number(result.coins) || 0);
      if (!result.awarded) return; // already checked in today

      const viewCoins = { label: "View", onPress: () => navigation.navigate("Coins") };
      if (result.penalty > 0) {
        toast.warning(
          `+${result.awarded} for today, −${result.penalty} for ${result.missedDays} missed day${result.missedDays === 1 ? "" : "s"}. Open the app daily to keep your coins.`,
          { title: "Welcome back", action: viewCoins }
        );
      } else {
        toast.coin(`+${result.awarded} coins for checking in today`, { title: "Welcome back", action: viewCoins });
      }
    } catch (error) {
      console.error("Error awarding daily coins:", error);
    }
  };

  const formatDataForPieChart = (transactions, type) => {
    const groupedData = {};
    transactions.forEach((transaction) => {
      const category = transaction.subType || "Other";
      if (!groupedData[category]) groupedData[category] = 0;
      groupedData[category] += transaction.amount;
    });

    // Pulse categorical accents
    const colors = [P.a1, P.a2, P.a3, P.a4, P.a5, P.amber, P.neg, P.inv];

    return Object.entries(groupedData).map(([name, amount], index) => ({
      name,
      amount,
      color: colors[index % colors.length],
      legendFontColor: P.ink,
      legendFontSize: 12,
    }));
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const formattedMonth = searchMonth.padStart(2, "0");
      const [transactionsArray, investmentsArray] = await Promise.all([
        getTransactions(uid),
        getInvestments(uid),
      ]);

      const filteredData = transactionsArray.filter(
        (item) =>
          item.date &&
          normalizeDate(item.date).startsWith(`${searchYear}-${formattedMonth}`)
      );
      setTransactions(filteredData);
      setAllTransactions(transactionsArray);
      setTotalInvested(filteredData.filter(isInvestmentTx).reduce((sum, t) => sum + (t.amount || 0), 0));
      const holdings = (investmentsArray || []).filter(Boolean);

      const expenseTransactions = filteredData.filter(
        (t) =>
          t.type === "Expense" &&
          t.method !== "Investment" &&
          !INVESTMENT_SUBTYPES.includes(t.subType)
      );
      const incomeTransactions = filteredData.filter((t) => t.type === "Income");

      setTotalExpense(expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));
      setTotalIncome(incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));

      const defaultData = [];
      setExpenseData(expenseTransactions.length > 0 ? formatDataForPieChart(expenseTransactions, "Expense") : defaultData);
      setIncomeData(incomeTransactions.length > 0 ? formatDataForPieChart(incomeTransactions, "Income") : defaultData);
      setDayFlags(buildDayFlags(transactionsArray, investmentsArray));

      await checkAndAwardDailyCoins();
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setLoaded(true);
      setRefreshing(false);
    }
  }, [searchMonth, searchYear]);


  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      checkAndAwardDailyCoins();
      fetchPremiumRewardState();
    }, [fetchTransactions, fetchPremiumRewardState])
  );

  // The F.I.R.E. target moves with your spending; refresh it on focus.
  useFocusEffect(
    useCallback(() => {
      fetchFireProgress(true);
    }, [])
  );

  const onRefresh = useCallback(() => {
    haptics.tap();
    setRefreshing(true);
    fetchTransactions();
    fetchPremiumRewardState();
    refreshIndices();
  }, [fetchTransactions, fetchPremiumRewardState]);

  // Per-day totals for the calendar rings: { "2026-09-23": { income, expense, investment } } in ₹
  const buildDayFlags = (allTx, allInvestments = []) => {
    const days = {};
    const add = (date, key, amount) => {
      if (!days[date]) days[date] = { income: 0, expense: 0, investment: 0 };
      days[date][key] += Math.abs(parseFloat(amount)) || 0;
    };
    (allTx || []).forEach((item) => {
      if (!item || !item.date) return;
      const d = normalizeDate(item.date).slice(0, 10);
      if (isInvestmentTx(item)) add(d, "investment", item.amount);
      else if (item.type === "Income") add(d, "income", item.amount);
      else if (item.type === "Expense") add(d, "expense", item.amount);
    });
    // Investment records: most purchases also log an Investment transaction,
    // so take the larger of the two per day instead of adding them twice.
    const invByDay = {};
    (allInvestments || []).forEach((item) => {
      if (!item) return;
      const raw = item.date || item.startDate || item.createdAt;
      if (!raw) return;
      const str =
        typeof raw === "string" ? raw : raw.seconds ? new Date(raw.seconds * 1000).toISOString() : null;
      if (!str) return;
      const d = normalizeDate(str.split("T")[0]);
      // An RD's amount is its full planned total; the first deposit is what happened that day
      const amt = parseFloat(item.monthlyDeposit) || parseFloat(item.amount) || 0;
      invByDay[d] = (invByDay[d] || 0) + amt;
    });
    Object.entries(invByDay).forEach(([d, amt]) => {
      const fromTx = days[d]?.investment || 0;
      if (amt > fromTx) add(d, "investment", amt - fromTx);
    });
    return days;
  };

  const getMonthName = (monthNum) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNum, 10) - 1];
  };

  const checkAndGenerateAutoReport = useCallback(async () => {
    try {
      setAutoReportLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Calculate previous month details
      const now = new Date();
      let prevMonth = now.getMonth(); // 0-indexed, if June (5) it returns May (4)
      let prevYear = now.getFullYear();
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      const monthStr = String(prevMonth).padStart(2, "0");
      const yearStr = String(prevYear);

      // Trigger automatic report PDF generation / fetch local path
      const uri = await simpleReportService.autoGeneratePreviousMonthReport(uid);
      setAutoReportUri(uri);

      // Fetch transaction list for previous month to render "relevant content" in the modal
      const transactionsArray = await getTransactions(uid);
      const filteredData = transactionsArray.filter(
        (item) =>
          item.date &&
          normalizeDate(item.date).startsWith(`${yearStr}-${monthStr}`)
      );

      // Calculate totals for previous month
      const income = filteredData
        .filter((t) => t.type === "Income")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const expense = filteredData
        .filter((t) => t.type === "Expense")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const investment = filteredData
        .filter((t) => t.type === "Investment")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setAutoReportMeta({
        monthName: getMonthName(monthStr),
        monthStr,
        yearStr,
        transactions: filteredData,
        income,
        expense,
        investment,
      });
    } catch (error) {
      console.warn("Failed checking/generating automated report:", error);
    } finally {
      setAutoReportLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    checkAndAwardDailyCoins();
    checkAndGenerateAutoReport();
    fetchFireProgress();
    fetchPremiumRewardState();
  }, [fetchTransactions, checkAndGenerateAutoReport, fetchPremiumRewardState]);

  const handleDayPress = (day) => {
    navigation.navigate("DateExpenses", { selectedDate: day.dateString });
  };

  const handleMonthChange = (month) => {
    const newYear = month.year.toString();
    const newMonth = String(month.month).padStart(2, "0");
    setSearchYear(newYear);
    setSearchMonth(newMonth);
    setCurrentMonth(`${newYear}-${newMonth}`);
  };

  const resetToCurrentDate = () => {
    const today = new Date();
    const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");
    const currentYearStr = today.getFullYear().toString();
    monthDir.current = `${currentYearStr}-${currentMonthStr}` > `${searchYear}-${searchMonth.padStart(2, "0")}` ? 1 : -1;
    setSearchMonth(currentMonthStr);
    setSearchYear(currentYearStr);
    setCurrentMonth(`${currentYearStr}-${currentMonthStr}`);
    setCalendarKey((prevKey) => prevKey + 1);
  };

  useEffect(() => {
    const listener1 = EventRegister.addEventListener(
      "transactionAdded",
      fetchTransactions
    );
    const listener2 = EventRegister.addEventListener(
      "investmentAdded",
      fetchTransactions
    );
    return () => {
      EventRegister.removeEventListener(listener1);
      EventRegister.removeEventListener(listener2);
    };
  }, [fetchTransactions]);

  // ── Pulse Home — derived view data ─────────────────────────────────
  const monthIdx = parseInt(searchMonth, 10) - 1;
  const yearNum = parseInt(searchYear, 10);
  const nowDate = new Date();
  const isCurrentMonth = yearNum === nowDate.getFullYear() && monthIdx === nowDate.getMonth();
  const monthShort = MONTHS_SHORT[monthIdx] || "";
  const netFlow = totalIncome - totalExpense;
  const savedPct = totalIncome > 0 ? Math.round((netFlow / totalIncome) * 100) : null;
  const flowBase = Math.max(totalIncome, totalExpense + totalInvested, 1);

  const kindOf = (t) => (isInvestmentTx(t) ? "inv" : t.type === "Income" ? "inc" : "exp");
  const amountText = (t) => {
    const k = kindOf(t);
    const v = inr(t.amount);
    return k === "exp" ? `−${v}` : k === "inc" ? `+${v}` : v;
  };

  const todayTx = allTransactions
    .filter((t) => t.date && normalizeDate(t.date).slice(0, 10) === today)
    .slice(0, 6);

  const dueSoon = allTransactions
    .filter((t) => {
      if (t.type !== "Expense" || !t.date) return false;
      const d = normalizeDate(t.date).slice(0, 10);
      if (d <= today) return false;
      const diff = (new Date(d) - new Date(today)) / 86400000;
      return diff <= 14;
    })
    .sort((a, b) => (normalizeDate(a.date) > normalizeDate(b.date) ? 1 : -1))
    .slice(0, 3);

  const dueLabel = (t) => {
    const d = new Date(normalizeDate(t.date).slice(0, 10));
    const days = Math.round((d - new Date(today)) / 86400000);
    const when = days === 1 ? "tomorrow" : `in ${days} days`;
    return [t.method, when, `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`].filter(Boolean).join(" · ");
  };

  // Month grid, Monday first
  const firstWeekday = (new Date(yearNum, monthIdx, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();
  const gridCells = [];
  for (let i = 0; i < firstWeekday; i++) gridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(d);
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const shiftMonth = (delta) => {
    monthDir.current = delta;
    const d = new Date(yearNum, monthIdx + delta, 1);
    setSearchYear(String(d.getFullYear()));
    setSearchMonth(String(d.getMonth() + 1).padStart(2, "0"));
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // New month's days slide in from the side you swiped towards
  const monthSlide = useSlideOnChange(`${searchYear}-${searchMonth}`, monthDir.current);
  // Pops when coins change after they've loaded (daily check-in, a reward)
  const coinPop = usePop(currentCoins || null);

  const calendarSwipe = useSwipe({
    onNext: () => {
      markLearned("home.swipeMonth");
      shiftMonth(1);
    },
    onPrev: () => {
      markLearned("home.swipeMonth");
      shiftMonth(-1);
    },
  });

  const breakdownIsExpense = activeChartIndex === 0;
  const breakdownData = (breakdownIsExpense ? expenseData : incomeData).filter((d) => d.name !== "No Data");
  const breakdownTotal = breakdownIsExpense ? totalExpense : totalIncome;

  const fireView = fireProgress?.hasData
    ? {
        ...fireProgress,
        totalInvested: fireHold.current,
        progressPercentage: fireProgress.fireNumber > 0 ? (fireHold.current / fireProgress.fireNumber) * 100 : 0,
      }
    : fireProgress;
  const firePct = fireView?.hasData ? fireView.progressPercentage : 0;

  // ── Habit & insight (computed on device from what's already loaded) ──
  const streak = useMemo(() => {
    const days = new Set();
    allTransactions.forEach((t) => {
      if (!t.date) return;
      const d = normalizeDate(t.date).slice(0, 10);
      if (d <= today) days.add(d);
    });
    return loggingStreak(days, today);
  }, [allTransactions, today]);

  const spend = useMemo(
    () =>
      spendingToday(
        allTransactions
          .filter((t) => t.date && t.type === "Expense" && !isInvestmentTx(t))
          .map((t) => ({ date: normalizeDate(t.date).slice(0, 10), amount: t.amount })),
        today
      ),
    [allTransactions, today]
  );

  const insightText = (() => {
    if (!spend) return null;
    const { todaySpent, avg, diff } = spend;
    if (avg === null) return todaySpent > 0 ? `${inr(todaySpent)} spent today.` : null;
    if (todaySpent === 0) return `No spending yet today · you usually spend ${inr(avg)} a day.`;
    return diff <= 0
      ? `${inr(todaySpent)} spent today · ${inr(-diff)} under your daily average.`
      : `${inr(todaySpent)} spent today · ${inr(diff)} over your daily average.`;
  })();

  // Milestones get one celebration each, ever
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !loaded) return;
    const m = streakMilestone(streak.days);
    if (!m) return;
    celebrateOnce(`streak.${uid}.${m}.${streak.start}`, {
      icon: "flame",
      tone: "amber",
      title: `${m}-day streak`,
      message: `You've logged something every day for ${streak.days} days. That habit is what makes a plan work.`,
    });
  }, [loaded, streak.days, streak.start]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || loadingProgress || !fireView?.hasData) return;
    const m = fireMilestone(firePct);
    if (!m) return;
    // Someone already past 50% hears about 50%, not 25% then 50%
    FIRE_MILESTONES.filter((x) => x < m).forEach((x) => markCelebrated(`fire.${uid}.${x}`));
    celebrateOnce(`fire.${uid}.${m}`, {
      icon: m === 100 ? "trophy" : "target",
      title: m === 100 ? "You've reached your F.I.R.E. number" : `${m}% of the way to F.I.R.E.`,
      message:
        m === 100
          ? "Your F.I.R.E.-linked investments now cover your target."
          : `${inrCompact(fireView.totalInvested)} invested towards ${inrCompact(fireView.fireNumber)}.`,
    });
  }, [loadingProgress, Math.floor(firePct)]);

  const prevMonthName = autoReportMeta?.monthName || "Last month";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <View style={styles.pFixedTop}>
        {/* Fixed header: greeting, coins, theme + live market ticker stay put while the page scrolls */}
      <View style={styles.pHeader}>
        <View style={styles.pAvatar}>
          <Text mono style={styles.pAvatarText}>
            {initials(userName || auth.currentUser?.email || "")}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.pGreeting} numberOfLines={1}>
            {greeting()}
            {userName ? `, ${userName.split(" ")[0]}` : ""}
          </Text>
          <Overline>{dayStamp()}</Overline>
        </View>
        <Press
          style={styles.pCoinPill}
          scaleTo={0.94}
          onPress={() => navigation.navigate("Coins")}
          accessibilityRole="button"
          accessibilityLabel={`${currentCoins} coins`}
        >
          <Animated.View style={coinPop}>
            <Icon name="coin" size={18} color={P.amber} />
          </Animated.View>
          <CountUp id="home.coins" value={currentCoins} format={(v) => Math.round(v).toLocaleString("en-IN")} size={13} />
        </Press>
        <ThemeToggle />
      </View>

        <MarketTicker />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.ink} colors={[P.ink]} />
        }
      >
        <View style={styles.pBody}>
          {/* Net cash flow */}
          <FadeIn>
          <Card style={{ padding: 18 }}>
            <View style={{ gap: 14 }}>
              <View style={styles.pRowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Overline>Net cash flow · {monthShort}</Overline>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    onPress={toggleAmountsHidden}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={amountsHidden() ? "Show amounts" : "Hide amounts"}
                  >
                    <Icon name={amountsHidden() ? "eyeOff" : "eye"} size={15} color={P.mute} />
                  </Press>
                </View>
                {savedPct !== null ? (
                  <Badge color={savedPct >= 0 ? P.pos : P.neg} bg={savedPct >= 0 ? P.posSoft : P.negSoft}>
                    {savedPct >= 0 ? `+${savedPct}% saved` : `${savedPct}% overspent`}
                  </Badge>
                ) : null}
              </View>
              {loaded ? (
                <CountUp
                  id="home.netFlow"
                  component={Text}
                  mono
                  value={netFlow}
                  format={inr}
                  style={styles.pHero}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                />
              ) : (
                <Skeleton width="62%" height={40} radius={10} />
              )}
              <Text style={styles.pHeroSub}>
                Portfolio{" "}
                <CountUp
                  id="home.portfolio"
                  component={Text}
                  mono
                  value={portfolioValue}
                  format={inr}
                  style={{ fontWeight: "700", color: P.ink }}
                />{" "}
                across {portfolioCount} holding{portfolioCount === 1 ? "" : "s"}
              </Text>
              {portfolioCount > 0 ? <Updated at={portfolio.live?.at || portfolio.updatedAt} prefix="Prices" style={{ marginTop: -8 }} /> : null}
              <View style={styles.pStatRow}>
                {[
                  { label: "Income", value: totalIncome, color: P.pos },
                  { label: "Spent", value: totalExpense, color: P.neg },
                  { label: "Invested", value: totalInvested, color: P.inv },
                ].map((x) => (
                  <View key={x.label} style={{ flex: 1, gap: 6, minWidth: 0 }}>
                    <Overline>{x.label}</Overline>
                    {loaded ? (
                      <CountUp
                        id={`home.${x.label}`}
                        value={x.value}
                        format={inr}
                        size={14}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      />
                    ) : (
                      <Skeleton width="70%" height={16} />
                    )}
                    <ProgressBar value={x.value / flowBase} color={x.color} height={4} />
                  </View>
                ))}
              </View>
            </View>
          </Card>
          </FadeIn>

          {/* Quick actions */}
          <FadeIn delay={45} style={styles.pQuickRow}>
            {[
              { label: "Expense", icon: "expense", color: P.neg, route: "Expenses", params: { openAdd: true } },
              { label: "Income", icon: "income", color: P.pos, route: "Income", params: { openAdd: true } },
              { label: "Invest", icon: "chart", color: P.inv, route: "AddInvestment" },
              { label: "Report", icon: "report", color: P.ink, route: "ReportScreen" },
            ].map((a) => (
              <Press
                key={a.label}
                style={styles.pQuick}
                scaleTo={0.94}
                haptic="tap"
                onPress={() => navigation.navigate(a.route, a.params)}
                accessibilityRole="button"
                accessibilityLabel={a.params?.openAdd ? `Add ${a.label.toLowerCase()}` : a.label}
              >
                <Icon name={a.icon} size={20} color={a.color} />
                <Text style={styles.pQuickText}>{a.label}</Text>
              </Press>
            ))}
          </FadeIn>

          {/* First-week checklist (retires itself once done or dismissed) */}
          <GettingStarted
            ready={loaded && !loadingProgress}
            uid={auth.currentUser?.uid}
            done={{
              profile: !!fireProgress?.hasData,
              expense: allTransactions.some((t) => t.type === "Expense" && !isInvestmentTx(t)),
              invest: portfolioCount > 0 || allTransactions.some(isInvestmentTx),
            }}
            onGo={(route, params) => navigation.navigate(route, params)}
          />
          {streak.days >= 2 ? (
            <Tip id="home.voice">Tap the mic in the dock to log by voice — try “spent 450 on groceries”.</Tip>
          ) : null}

          {/* F.I.R.E. progress */}
          <FadeIn delay={90}>
          <Press
            scaleTo={0.985}
            style={[styles.pCard, styles.pFireRow]}
            onPress={() =>
              fireProgress?.hasData
                ? navigation.navigate("Plan", { screen: "FireNumber" })
                : navigation.navigate("Profile")
            }
            onLongPress={() => {
              markLearned("home.fireShare");
              handleShareProgress();
            }}
            accessibilityHint="Long press to share your progress"
          >
            <Ring size={64} stroke={7} value={firePct / 100}>
              {loadingProgress ? (
                <Mono size={12} weight="700">
                  …
                </Mono>
              ) : (
                <CountUp id="home.firePct" value={firePct} format={(v) => `${Math.round(v)}%`} size={12} weight="700" />
              )}
            </Ring>
            <View style={{ flex: 1, gap: 3 }}>
              <Overline>F.I.R.E. progress</Overline>
              {fireProgress?.hasData ? (
                <>
                  <Mono size={16} numberOfLines={1} adjustsFontSizeToFit>
                    {inrCompact(fireView.totalInvested)} / {inrCompact(fireView.fireNumber)}
                  </Mono>
                  <Text style={styles.pSmallNote} numberOfLines={1}>
                    {Math.max(0, fireView.retirementAge - fireView.currentAge)} yrs to go
                    {fireHold.dayChange ? (
                      <Text mono style={{ color: fireHold.dayChange > 0 ? P.pos : P.neg }}>
                        {" · today "}
                        {inrCompact(fireHold.dayChange, { sign: true })}
                      </Text>
                    ) : (
                      ` · retire at ${fireView.retirementAge}`
                    )}
                  </Text>
                </>
              ) : (
                <Text style={styles.pSmallNote} numberOfLines={2}>
                  {loadingProgress
                    ? "Calculating your progress…"
                    : fireProgress?.reason || "Set your age and retirement age in Me to start tracking."}
                </Text>
              )}
            </View>
            <Press scaleTo={0.96} activeOpacity={0.7}
              onPress={() => setInfoModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="How F.I.R.E. is calculated"
            >
              <Icon name="info" size={18} color={P.mute} />
            </Press>
            <Icon name="chevron" size={18} color={P.mute} />
          </Press>
          </FadeIn>

          {fireProgress?.hasData ? (
            <Tip id="home.fireShare">Long-press your F.I.R.E. card to share your progress.</Tip>
          ) : null}

          {/* Calendar — swipe sideways to change month */}
          <Tip id="home.swipeMonth">Swipe the calendar sideways to change month. Tap a day to see or add entries.</Tip>
          <FadeIn delay={135}>
          <Card {...calendarSwipe.panHandlers}>
            <View style={{ gap: 8 }}>
              <View style={styles.pRowBetween}>
                <View style={styles.pMonthNav}>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    onPress={() => {
                      haptics.select();
                      shiftMonth(-1);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
                    accessibilityLabel="Previous month"
                  >
                    <Icon name="back" size={18} color={P.ink} />
                  </Press>
                  <Text style={styles.pMonthTitle}>
                    {MONTHS_LONG[monthIdx]} {searchYear}
                  </Text>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    onPress={() => {
                      haptics.select();
                      shiftMonth(1);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
                    accessibilityLabel="Next month"
                  >
                    <Icon name="chevron" size={18} color={P.ink} />
                  </Press>
                </View>
                {isCurrentMonth ? (
                  <View style={styles.pLegend}>
                    <LegendDot color={P.pos} label="In" />
                    <LegendDot color={P.neg} label="Out" />
                    <LegendDot color={P.inv} label="Inv" />
                  </View>
                ) : (
                  <Press scaleTo={0.96} activeOpacity={0.7} onPress={resetToCurrentDate} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Overline color={P.accTx}>Today</Overline>
                  </Press>
                )}
              </View>
              <View style={styles.pGrid}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <View key={`h${i}`} style={styles.pGridHead}>
                    <Overline>{d}</Overline>
                  </View>
                ))}
              </View>
              <View style={{ overflow: "hidden" }}>
              <Animated.View style={[styles.pGrid, monthSlide]}>
                {gridCells.map((d, i) => {
                  if (!d) return <View key={`e${i}`} style={styles.pCell} />;
                  const iso = `${searchYear}-${searchMonth.padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const flags = dayFlags[iso] || {};
                  const isToday = iso === today;
                  const isPast = iso < today;
                  return (
                    <Press scaleTo={0.96}
                      key={iso}
                      style={styles.pCell}
                      onPress={() => handleDayPress({ dateString: iso })}
                      accessibilityLabel={[
                        `${d} ${MONTHS_LONG[monthIdx]}`,
                        flags.income ? `income ${inr(flags.income)}` : null,
                        flags.expense ? `expense ${inr(flags.expense)}` : null,
                        flags.investment ? `invested ${inr(flags.investment)}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pDayRing}>
                        {/* Income / expense / investment share of the day, like a pie */}
                        <DayRing
                          segments={[
                            { value: flags.income || 0, color: P.pos },
                            { value: flags.expense || 0, color: P.neg },
                            { value: flags.investment || 0, color: P.inv },
                          ]}
                        />
                        <View style={[styles.pDay, isToday && { backgroundColor: P.acc }]}>
                          <Text
                            mono
                            style={{
                              fontSize: 13,
                              fontWeight: isToday ? "700" : "500",
                              color: isToday ? P.accInk : isPast ? P.ink : P.mute,
                            }}
                          >
                            {d}
                          </Text>
                        </View>
                      </View>
                    </Press>
                  );
                })}
              </Animated.View>
              </View>
            </View>
          </Card>
          </FadeIn>

          {/* Today */}
          <FadeIn delay={180} style={{ gap: 14 }}>
          <SectionHeader
            title="Today"
            action="View all"
            onAction={() => navigation.navigate("DateExpenses", { selectedDate: today })}
          />
          <Card style={{ paddingTop: 2, paddingBottom: 2 }}>
            {loaded && (insightText || streak.days >= 2) ? (
              <View style={styles.pInsight}>
                {streak.days >= 2 ? (
                  <View style={styles.pStreak} accessibilityLabel={`${streak.days} day logging streak`}>
                    <Icon name="flame" size={13} color={P.amber} strokeWidth={2.2} />
                    <Text mono style={styles.pStreakText}>
                      {streak.days}-day streak{streak.loggedToday ? "" : " · log today to keep it"}
                    </Text>
                  </View>
                ) : null}
                {insightText ? <Text style={styles.pSmallNote}>{insightText}</Text> : null}
              </View>
            ) : null}
            {todayTx.length === 0 ? (
              <View style={styles.pEmptyRow}>
                <Text style={styles.pSmallNote}>Nothing logged today yet.</Text>
                <Chip label="Add expense" selected onPress={() => navigation.navigate("Expenses", { openAdd: true })} />
              </View>
            ) : (
              todayTx.map((t, i) => (
                <RowIn key={t.id || i} index={i} delay={220}>
                  <TxRow
                    name={t.name || t.subType || "Transaction"}
                    kind={kindOf(t)}
                    amount={amountText(t)}
                    time={timeOf(t.createdAt)}
                    last={i === todayTx.length - 1}
                    onPress={() => navigation.navigate("DateExpenses", { selectedDate: today })}
                  />
                </RowIn>
              ))
            )}
          </Card>
          </FadeIn>

          {/* Due soon */}
          {dueSoon.length > 0 ? (
            <>
              <SectionHeader
                title="Due soon"
                action={`${dueSoon.length} alert${dueSoon.length === 1 ? "" : "s"}`}
              />
              {dueSoon.map((t, i) => (
                <Card
                  key={t.id || i}
                  style={{ paddingVertical: 12 }}
                  onPress={() => navigation.navigate("DateExpenses", { selectedDate: normalizeDate(t.date).slice(0, 10) })}
                  accessibilityLabel={`${t.name || t.subType}, ${inr(t.amount)}, ${dueLabel(t)}`}
                >
                  <View style={styles.pDueRow}>
                    <Icon name="bell" size={20} color={P.amber} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.pDueTitle} numberOfLines={1}>
                        {t.name || t.subType}
                      </Text>
                      <Text style={styles.pDueSub} numberOfLines={1}>
                        {dueLabel(t)}
                      </Text>
                    </View>
                    <Mono size={14}>{inr(t.amount)}</Mono>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {/* Weekly recap: offered on Sunday and Monday, when last week is complete */}
          {loaded && [0, 1].includes(new Date().getDay()) ? (
            <FadeIn>
              <Press
                scaleTo={0.97}
                onPress={() => navigation.navigate("WeekRecap")}
                accessibilityRole="button"
                accessibilityLabel="Open your weekly recap"
                style={styles.pRecap}
              >
                <Icon name="sparkle" size={22} color={P.accInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.pRecapTitle}>Your week in review</Text>
                  <Text style={styles.pRecapSub}>Spending, your biggest day and what you kept</Text>
                </View>
                <Icon name="arrowRight" size={20} color={P.accInk} />
              </Press>
            </FadeIn>
          ) : null}

          {/* Signals & monthly report */}
          <View style={styles.pTwoUp}>
            <Press
              scaleTo={0.96}
              onPress={handleBreakoutPress}
              accessibilityRole="button"
              style={[styles.pTile, hasUnreadBreakout && { backgroundColor: P.acc, borderColor: P.acc }]}
            >
              <View style={styles.pRowBetween}>
                <Icon name="bolt" size={20} color={hasUnreadBreakout ? P.accInk : P.inv} />
                {hasUnreadBreakout ? <View style={[styles.pBadgeDot, { backgroundColor: P.accInk }]} /> : null}
              </View>
              <Text style={[styles.pTileTitle, hasUnreadBreakout && { color: P.accInk }]}>Breakout signals</Text>
              <Text style={[styles.pTileSub, hasUnreadBreakout && { color: P.accInk }]} numberOfLines={1}>
                {hasUnreadBreakout ? "New today · tap to unlock" : "10,000 coins to unlock"}
              </Text>
            </Press>
            <Press
              scaleTo={0.96}
              onPress={() => setAutoReportModalVisible(true)}
              accessibilityRole="button"
              style={styles.pTile}
            >
              <View style={styles.pRowBetween}>
                <Icon name="report" size={20} color={P.pos} />
                {autoReportUri ? <View style={styles.pBadgeDot} /> : null}
              </View>
              <Text style={styles.pTileTitle}>{prevMonthName} report</Text>
              <Text style={styles.pTileSub} numberOfLines={1}>
                {autoReportLoading ? "Preparing…" : autoReportUri ? "PDF ready to share" : "Auto-generated monthly"}
              </Text>
            </Press>
          </View>

          {/* Where it went */}
          <SectionHeader title="Where it went" action={inr(breakdownTotal)} />
          <Card>
            <Segmented
              options={[
                { value: 0, label: "Expenses" },
                { value: 1, label: "Income" },
              ]}
              value={activeChartIndex}
              onChange={setActiveChartIndex}
              style={{ marginBottom: 4 }}
            />
            {breakdownData.length === 0 ? (
              <Text style={[styles.pSmallNote, { paddingTop: 12 }]}>
                {breakdownIsExpense
                  ? `No expenses logged in ${MONTHS_LONG[monthIdx]}.`
                  : `No income logged in ${MONTHS_LONG[monthIdx]}.`}
              </Text>
            ) : (
              breakdownData
                .slice()
                .sort((a, b) => b.amount - a.amount)
                .map((item) => {
                  const share = breakdownTotal > 0 ? item.amount / breakdownTotal : 0;
                  return (
                    <View key={item.name} style={styles.pCatRow}>
                      <View style={styles.pRowBetween}>
                        <Text style={styles.pCatName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Mono size={15}>{inr(item.amount)}</Mono>
                      </View>
                      <ProgressBar value={share} color={item.color} />
                      <Text style={styles.pCatPct}>
                        {Math.round(share * 100)}% of {breakdownIsExpense ? "spend" : "income"}
                      </Text>
                    </View>
                  );
                })
            )}
          </Card>
        </View>
      </ScrollView>

      {/* F.I.R.E. Info Explanation Modal */}
      <PopupModal toastHost={false}
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <PopupBackdrop style={styles.modalOverlayCentered}>
          <PopupPanel placement="center" style={styles.fireInfoContainer}>
            <View style={styles.fireInfoHeader}>
              <View style={styles.fireInfoTitleGroup}>
                <Icon name="info" size={24} color={P.amber} />
                <Text style={styles.fireInfoTitle}>F.I.R.E. Methodology</Text>
              </View>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close"
                style={styles.fireInfoCloseButton}
                onPress={() => setInfoModalVisible(false)}
              >
                <Icon name="close" size={20} color={P.mute} />
              </Press>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.fireInfoScroll}>
              <Text style={styles.fireInfoIntro}>
                F.I.R.E stands for <Text style={{ fontWeight: "700" }}>Financial Independence, Retire Early</Text>. It is a movement dedicated to extreme savings and investment to retire sooner than conventional standards.
              </Text>

              <View style={styles.fireFormulaCard}>
                <Text style={styles.fireFormulaLabel}>THE F.I.R.E. FORMULA</Text>
                <Text style={styles.fireFormulaText}>
                  Target F.I.R.E. = Future Annual Expenses × 25
                </Text>
                <Text style={styles.fireFormulaSub}>
                  (Based on the 4% Safe Withdrawal Rate rule)
                </Text>
              </View>

              <Text style={styles.fireSectionSubtitle}>Key Assumptions:</Text>

              <View style={styles.fireAssumptionRow}>
                <View style={styles.fireAssumptionIcon}>
                  <Icon name="income" size={16} color={P.primary} />
                </View>
                <View style={styles.fireAssumptionText}>
                  <Text style={styles.fireAssumptionTitle}>Inflation Adjustment</Text>
                  <Text style={styles.fireAssumptionDesc}>
                    Assumes an average inflation of <Text style={{ fontWeight: "600" }}>7.5% per year</Text> (standard in India) to adjust your current daily/yearly expenses to the target retirement date.
                  </Text>
                </View>
              </View>

              <View style={styles.fireAssumptionRow}>
                <View style={styles.fireAssumptionIcon}>
                  <Ionicons name="cart-outline" size={16} color={P.primary} />
                </View>
                <View style={styles.fireAssumptionText}>
                  <Text style={styles.fireAssumptionTitle}>Current Expenses</Text>
                  <Text style={styles.fireAssumptionDesc}>
                    Derived from your daily average expense based on the transactions logged in your <Text style={{ fontWeight: "600" }}>Calendar</Text> screen.
                  </Text>
                </View>
              </View>

              <View style={styles.fireAssumptionRow}>
                <View style={styles.fireAssumptionIcon}>
                  <Icon name="chart" size={16} color={P.primary} />
                </View>
                <View style={styles.fireAssumptionText}>
                  <Text style={styles.fireAssumptionTitle}>Tracked Investments</Text>
                  <Text style={styles.fireAssumptionDesc}>
                    Aggregates all investments linked to the <Text style={{ fontWeight: "600" }}>"F.I.R.E Number"</Text> goal in your investments page. It automatically fetches real-time stock/mutual fund NAV prices.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Press scaleTo={0.96} activeOpacity={0.7}
              style={styles.fireInfoOkButton}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.fireInfoOkText}>Got it!</Text>
            </Press>
          </PopupPanel>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>

      {/* Auto Report Modal */}
      <PopupModal toastHost={false}
        visible={autoReportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAutoReportModalVisible(false)}
      >
        <PopupBackdrop style={styles.modalOverlay}>
          <PopupPanel placement="center" style={styles.autoReportModalContainer}>
            {/* Decorative Top Pill */}
            <View style={styles.modalPill} />

            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.autoReportTitleWrapper}>
                <View style={styles.autoReportIconContainer}>
                  <Icon name="report" size={20} color={P.pos} />
                </View>
                <View>
                  <Text style={styles.autoReportModalTitle}>
                    {autoReportMeta ? `${autoReportMeta.monthName} ${autoReportMeta.yearStr}` : "Monthly Report"}
                  </Text>
                  <Text style={styles.autoReportModalSubtitle}>Automated Monthly Invoice</Text>
                </View>
              </View>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close"
                onPress={() => setAutoReportModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={20} color={P.mute} />
              </Press>
            </View>

            {/* Body Content */}
            {autoReportLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ClockLoader label="Reading last month’s transactions…" />
              </View>
            ) : autoReportMeta && autoReportMeta.transactions.length > 0 ? (
              <View style={{ flex: 1 }}>
                {/* Summary Grid */}
                <View style={styles.autoReportSummaryRow}>
                  <View style={styles.autoReportSummaryCardIncome}>
                    <View style={styles.summaryCardHeader}>
                      <Ionicons name="arrow-down-circle" size={12} color={P.pos} />
                      <Text style={styles.autoReportSummaryLabelIncome}>Income</Text>
                    </View>
                    <Text style={styles.autoReportSummaryValIncome}>
                      ₹{Math.round(autoReportMeta.income).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.autoReportSummaryCardExpense}>
                    <View style={styles.summaryCardHeader}>
                      <Ionicons name="arrow-up-circle" size={12} color={P.neg} />
                      <Text style={styles.autoReportSummaryLabelExpense}>Expenses</Text>
                    </View>
                    <Text style={styles.autoReportSummaryValExpense}>
                      ₹{Math.round(autoReportMeta.expense).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.autoReportSummaryCardInvested}>
                    <View style={styles.summaryCardHeader}>
                      <Icon name="income" size={12} color={P.primary} />
                      <Text style={styles.autoReportSummaryLabelInvested}>Invested</Text>
                    </View>
                    <Text style={styles.autoReportSummaryValInvested}>
                      ₹{Math.round(autoReportMeta.investment).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Section Header */}
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>Transactions List</Text>
                  <Text style={styles.modalSectionCount}>
                    {autoReportMeta.transactions.length} items
                  </Text>
                </View>

                {/* Scrollable Transaction List */}
                <ScrollView style={styles.modalTxList} showsVerticalScrollIndicator={false}>
                  {autoReportMeta.transactions.map((tx, idx) => {
                    const isIncome = tx.type === "Income";
                    const isExpense = tx.type === "Expense";
                    
                    let iconName = "arrow-forward-outline";
                    let iconBg = P.surf2;
                    let iconColor = P.mute;

                    if (isIncome) {
                      iconName = "arrow-down";
                      iconBg = P.posSoft;
                      iconColor = P.pos;
                    } else if (isExpense) {
                      iconName = "arrow-up";
                      iconBg = P.negSoft;
                      iconColor = P.neg;
                    } else if (tx.type === "Investment") {
                      iconName = "trending-up";
                      iconBg = P.surf2;
                      iconColor = P.primary;
                    }

                    return (
                      <View key={tx.id || idx}>
                        <View style={styles.autoReportTxRow}>
                          <View style={styles.autoReportTxLeft}>
                            <View style={[styles.txIconContainer, { backgroundColor: iconBg }]}>
                              <Ionicons name={iconName} size={16} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.autoReportTxName} numberOfLines={1}>
                                {tx.name || "Transaction"}
                              </Text>
                              <Text style={styles.autoReportTxDate}>
                                {tx.date ? tx.date.split(" ")[0] : ""} • {tx.subType || "Other"}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.autoReportTxRight}>
                            <Text
                              style={[
                                styles.autoReportTxAmount,
                                { color: isIncome ? P.pos : isExpense ? P.neg : P.primary },
                              ]}
                            >
                              {isIncome ? "+" : isExpense ? "-" : ""}₹
                              {Math.round(tx.amount).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        {idx < autoReportMeta.transactions.length - 1 && (
                          <View style={styles.modalTxSeparator} />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* PDF Action Button */}
                {autoReportUri ? (
                  <Press scaleTo={0.96}
                    onPress={async () => {
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(autoReportUri, {
                          mimeType: "application/pdf",
                          dialogTitle: `Monthly Invoice Report`,
                        });
                      } else {
                        toast.error("Sharing is not available on this device.");
                      }
                    }}
                    activeOpacity={0.85}
                    style={styles.modalPdfButtonContainer}
                  >
                    <View style={[styles.modalPdfButtonGradient, { backgroundColor: P.acc }]}>
                      <Icon name="download" size={20} color={P.accInk} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalPdfButtonText, { color: P.accInk }]}>Download / share PDF invoice</Text>
                    </View>
                  </Press>
                ) : null}
              </View>
            ) : (
              <View style={styles.modalEmptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="report" size={48} color={P.mute} />
                </View>
                <Text style={styles.modalEmptyTitle}>No Transactions for {autoReportMeta ? autoReportMeta.monthName : "Previous Month"}</Text>
                <Text style={styles.modalEmptyText}>
                  No transaction activity was recorded during this period, so no automated PDF invoice was generated.
                </Text>
              </View>
            )}
          </PopupPanel>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>


    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  // ── Pulse home ──
  pFixedTop: { backgroundColor: P.bg, zIndex: 2 },
  pHeader: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  pAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: P.acc, alignItems: "center", justifyContent: "center" },
  pAvatarText: { fontSize: 15, fontWeight: "700", color: P.accInk },
  pGreeting: { fontSize: 17, fontWeight: "600", color: P.ink },
  pCoinPill: {
    height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: P.surf,
    borderWidth: 1, borderColor: P.line, flexDirection: "row", alignItems: "center", gap: 6,
  },
  pBody: { paddingHorizontal: 16, gap: 14 },
  pRecap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: P.acc,
  },
  pRecapTitle: { fontSize: 15, fontWeight: "700", color: P.accInk },
  pRecapSub: { fontSize: 12, color: P.accInk, opacity: 0.8 },
  pInsight: { gap: 6, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: P.line },
  pStreak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 7,
    backgroundColor: P.amberSoft || P.surf2,
  },
  pStreakText: { fontSize: 11, fontWeight: "600", color: P.ink },
  pRowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pHero: { fontSize: 42, fontWeight: "600", letterSpacing: -1.6, lineHeight: 46, color: P.ink },
  pHeroSub: { fontSize: 13, color: P.ink2 },
  pStatRow: { flexDirection: "row", gap: 12 },
  pQuickRow: { flexDirection: "row", gap: 8 },
  pQuick: {
    flex: 1, height: 72, borderRadius: 14, backgroundColor: P.surf, borderWidth: 1, borderColor: P.line,
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  pQuickText: { fontSize: 12, fontWeight: "600", color: P.ink },
  pCard: { backgroundColor: P.surf, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 14 },
  pFireRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  pSmallNote: { fontSize: 12, color: P.ink2, lineHeight: 17 },
  pMonthNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  pMonthTitle: { fontSize: 16, fontWeight: "600", color: P.ink },
  pLegend: { flexDirection: "row", gap: 10 },
  pGrid: { flexDirection: "row", flexWrap: "wrap" },
  pGridHead: { width: "14.2857%", alignItems: "center", paddingVertical: 4 },
  pCell: { width: "14.2857%", height: 44, alignItems: "center", justifyContent: "center" },
  // Ring box: the day tile plus a 2.5px pie ring hugging it
  pDayRing: { width: 34, height: 30, alignItems: "center", justifyContent: "center" },
  pDay: { width: 26, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  pEmptyRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pDueRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pDueTitle: { fontSize: 14, fontWeight: "600", color: P.ink },
  pDueSub: { fontSize: 12, color: P.mute },
  pTwoUp: { flexDirection: "row", gap: 8 },
  pTile: { flex: 1, backgroundColor: P.surf, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 14, gap: 6 },
  pTileTitle: { fontSize: 14, fontWeight: "600", color: P.ink, marginTop: 4 },
  pTileSub: { fontSize: 12, color: P.mute },
  pBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.neg },
  pCatRow: { gap: 8, paddingVertical: 10 },
  pCatName: { fontSize: 15, fontWeight: "600", color: P.ink, flex: 1 },
  pCatPct: { fontSize: 13, color: P.ink2 },
  pModalScrim: { flex: 1, backgroundColor: P.overlay, justifyContent: "center", alignItems: "center", padding: 24 },
  pModalCard: {
    width: "100%", maxWidth: 360, backgroundColor: P.surf, borderRadius: 14, borderWidth: 1, borderColor: P.line,
    padding: 22, alignItems: "center", gap: 8,
  },
  pModalTitle: { fontSize: 20, fontWeight: "600", color: P.ink, letterSpacing: -0.4 },
  pModalButton: {
    marginTop: 8, height: 52, alignSelf: "stretch", borderRadius: 14, backgroundColor: P.acc,
    alignItems: "center", justifyContent: "center",
  },
  pModalButtonText: { fontSize: 15, fontWeight: "600", color: P.accInk },
  safeArea: { 
    flex: 1, 
    backgroundColor: P.bg 
  },
  header: {
    backgroundColor: P.surf,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0,
    marginBottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  headerLogo: { 
    height: 42, 
    width: "46%",
    maxWidth: 200,
    minWidth: 130,
  },
  downloadButton: { 
    padding: 10,
    borderRadius: 10,
    backgroundColor: P.surf2,
  },
  reportIcon: { 
    width: 24, 
    height: 24,
    tintColor: P.primary
  },
  scrollContainer: { 
    padding: 20, 
    paddingBottom: 24 
  },
  searchCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  promoSectionCard: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  promoSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  promoSectionTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promoSectionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
  },
  promoSectionSubtitle: {
    fontSize: 11,
    color: P.mute,
    lineHeight: 14,
    marginTop: 1,
  },
  promoUserCoinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: P.amberSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.amberSoft,
  },
  promoUserCoinText: {
    fontSize: 12,
    fontWeight: "800",
    color: P.amber,
  },
  promoCarouselContent: {
    paddingRight: 4,
  },
  promoCard: {
    backgroundColor: P.surf,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  promoCardImageWrap: {
    marginHorizontal: 8,
    marginTop: 8,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: P.surf,
  },
  promoCardImage: {
    width: "100%",
    height: "100%",
  },
  promoCardBody: {
    padding: 10,
    gap: 4,
  },
  promoCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: P.onSolid,
    letterSpacing: 0.2,
  },
  promoCardSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(255,255,255,0.75)",
  },
  promoCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  promoCardCoinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  promoCardCoinText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.amber,
  },
  promoCardRedeemBtn: {
    backgroundColor: P.solid,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promoCardRedeemBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  promoCardRedeemText: {
    fontSize: 10,
    fontWeight: "700",
    color: P.onSolid,
  },
  promoCardRedeemTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  pickerRow: { 
    flexDirection: "row", 
    gap: 12, 
    marginBottom: 18 
  },
  pickerWrapper: { 
    flex: 1 
  },
  pickerLabel: { 
    fontSize: 13, 
    color: P.mute, 
    marginBottom: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: P.line,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: P.bg,
  },
  picker: { 
    width: "100%", 
    height: Platform.OS === "ios" ? 120 : 50,
  },
  pickerItem: { 
    fontSize: 16, 
    color: P.ink,
  },
  buttonRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  searchButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.solid,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.pos,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: P.onSolid,
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  calendarCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: P.line,
  },
  legendContainerCompact: {
    justifyContent: "space-between",
  },
  legendItem: { 
    flexDirection: "row", 
    alignItems: "center",
    flexShrink: 1,
    backgroundColor: P.bg,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
  },
  legendColor: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 6 
  },
  legendText: { 
    fontSize: 11, 
    color: P.ink2,
    fontWeight: "600",
  },
  actionCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  quickActionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: P.mute,
    fontWeight: "500",
  },
  quickActionArrow: {
    marginLeft: 6,
  },
  chartCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  breakdownCard: {
    backgroundColor: P.surf,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 20,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  breakdownAccent: {
    height: 4,
    backgroundColor: P.solid,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  breakdownTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  breakdownIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: P.ink,
    letterSpacing: 0.2,
  },
  breakdownSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: P.mute,
    fontWeight: "500",
  },
  breakdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: P.line,
  },
  breakdownBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
  },
  donutChartWrap: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 16,
  },
  donutHole: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: P.surf,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0C110E",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 2,
    borderColor: P.line,
  },
  donutTotalLabel: {
    fontSize: 9,
    color: P.mute,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  donutTotalValue: {
    fontSize: 17,
    fontWeight: "900",
    color: P.ink,
    marginTop: 4,
  },
  donutTotalCaption: {
    fontSize: 9,
    color: P.mute,
    marginTop: 3,
    fontWeight: "600",
  },
  breakdownLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  breakdownLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLegendText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.ink2,
  },
  dominantChip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: P.amberSoft,
    borderWidth: 1,
    borderColor: P.amberSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  dominantChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.amberSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  dominantChipLabel: {
    fontSize: 10,
    color: P.amber,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dominantChipValue: {
    fontSize: 14,
    color: P.ink,
    fontWeight: "800",
    marginTop: 1,
  },
  dominantChipAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: P.amber,
  },
  statsGrid: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  breakdownStatRow: {
    backgroundColor: P.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  breakdownStatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownStatIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  breakdownStatLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: P.ink,
  },
  breakdownStatRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownStatAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: P.ink,
  },
  breakdownPercentBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  percentageBar: {
    height: 6,
    backgroundColor: P.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  percentageFill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownStatPercent: {
    fontSize: 12,
    fontWeight: "800",
  },
  noBreakdownContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: P.surf2,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: P.line,
    borderStyle: "dashed",
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    textAlign: "center",
  },
  noDataHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: P.mute,
    textAlign: "center",
  },
  chartTabsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: P.surf2,
    borderRadius: 14,
    padding: 5,
  },
  chartTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeChartTab: {
    backgroundColor: P.surf,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  chartTabText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: P.mute 
  },
  activeChartTabText: { 
    color: P.primary,
    fontWeight: "700",
  },
  chartContainer: { 
    alignItems: "center",
    paddingVertical: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 18,
    textAlign: "center",
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: P.bg,
    borderRadius: 16,
    marginVertical: 8,
  },
  noDataText: {
    fontSize: 14,
    color: P.mute,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  customLegendContainer: { 
    width: "100%", 
    marginTop: 16, 
    paddingHorizontal: 0 
  },
  customLegendTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 16,
  },
  customLegendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: P.bg,
  },
  customLegendLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 2 
  },
  customLegendColor: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    marginRight: 10 
  },
  customLegendName: { 
    fontSize: 14, 
    color: P.ink, 
    fontWeight: "600" 
  },
  customLegendRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  customLegendAmount: {
    fontSize: 15,
    color: P.ink,
    fontWeight: "700",
    marginRight: 4,
  },
  customLegendPercent: { 
    fontSize: 12, 
    color: P.mute,
    fontWeight: "600",
  },
  statisticsContainer: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  statisticsRow: { 
    flexDirection: "row", 
    justifyContent: "space-around",
    marginBottom: 4,
  },
  statisticsItem: { 
    flex: 1, 
    alignItems: "center",
    paddingVertical: 8,
  },
  statisticsLabel: {
    fontSize: 12,
    color: P.mute,
    marginBottom: 6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statisticsValue: { 
    fontSize: 18, 
    fontWeight: "800",
  },
  statisticsDivider: {
    height: 1,
    backgroundColor: P.line,
    marginVertical: 16,
  },
  netAmountContainer: { 
    alignItems: "center",
    paddingVertical: 8,
  },
  netAmountValue: { 
    fontSize: 22, 
    fontWeight: "800",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.negSoft,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: P.negSoft,
  },
  warningText: {
    fontSize: 13,
    color: P.neg,
    marginLeft: 8,
    fontWeight: "600",
  },
  ratioContainer: {
    padding: 0,
  },
  ratioTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  ratioSubtitle: {
    fontSize: 13,
    color: P.mute,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: P.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: P.bg,
    alignItems: "center",
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.ink2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 15,
    color: P.ink,
    fontWeight: "600",
  },
  ratioStatsContainer: {
    marginTop: 20,
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  ratioStatsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  ratioStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratioStatsItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
  },
  ratioStatsLabel: {
    fontSize: 11,
    color: P.mute,
    marginBottom: 6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ratioStatsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: P.ink,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  autoReportButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: P.posSoft,
    marginRight: 8,
    position: "relative",
  },
  autoReportBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P.solid,
  },
  autoReportModalContainer: {
    width: "94%",
    height: "82%",
    backgroundColor: P.surf,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0,
    shadowRadius: 24,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  autoReportTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  autoReportModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: P.ink,
  },
  autoReportModalSubtitle: {
    fontSize: 12,
    color: P.mute,
    marginTop: 2,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: 6,
    backgroundColor: P.bg,
    borderRadius: 14,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: P.mute,
    fontWeight: "500",
  },
  autoReportSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  autoReportSummaryCardIncome: {
    flex: 1,
    backgroundColor: P.posSoft,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.posSoft,
  },
  autoReportSummaryCardExpense: {
    flex: 1,
    backgroundColor: P.negSoft,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.negSoft,
  },
  autoReportSummaryCardInvested: {
    flex: 1,
    backgroundColor: P.surf2,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  autoReportSummaryLabelIncome: {
    fontSize: 11,
    color: P.pos,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  autoReportSummaryLabelExpense: {
    fontSize: 11,
    color: P.neg,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  autoReportSummaryLabelInvested: {
    fontSize: 11,
    color: P.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  autoReportSummaryValIncome: {
    fontSize: 15,
    fontWeight: "800",
    color: P.pos,
  },
  autoReportSummaryValExpense: {
    fontSize: 15,
    fontWeight: "800",
    color: P.neg,
  },
  autoReportSummaryValInvested: {
    fontSize: 15,
    fontWeight: "800",
    color: P.primary,
  },
  modalSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.ink,
  },
  modalSectionCount: {
    fontSize: 12,
    color: P.mute,
    fontWeight: "700",
  },
  modalTxList: {
    flex: 1,
    marginBottom: 16,
  },
  autoReportTxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    alignItems: "center",
  },
  autoReportTxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  autoReportTxName: {
    fontSize: 14,
    fontWeight: "700",
    color: P.ink,
  },
  autoReportTxDate: {
    fontSize: 11,
    color: P.mute,
    marginTop: 2,
    fontWeight: "500",
  },
  autoReportTxRight: {
    alignItems: "flex-end",
  },
  autoReportTxAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalTxSeparator: {
    height: 1,
    backgroundColor: P.surf2,
  },
  modalPdfButtonContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalPdfButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
  },
  modalPdfButtonText: {
    color: P.onSolid,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.bg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.ink,
    marginTop: 8,
    marginBottom: 6,
    textAlign: "center",
  },
  modalEmptyText: {
    fontSize: 13,
    color: P.mute,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  modalPill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: P.line,
    alignSelf: "center",
    marginBottom: 16,
  },
  autoReportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.posSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  fireCardWrapper: {
    position: "relative",
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  fireCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  fireGradient: {
    padding: 24,
  },
  fireHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  fireTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fireTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: P.onSolid,
    letterSpacing: 1,
  },
  fireBrandingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 0.5,
  },
  fireCardActionContainer: {
    position: "absolute",
    top: 18,
    right: 30,
    flexDirection: "row",
    gap: 8,
  },
  fireActionButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  fireProgressContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  firePercentage: {
    fontSize: 48,
    fontWeight: "900",
    color: P.onSolid,
    letterSpacing: -1,
  },
  firePhaseWrapper: {
    alignItems: "center",
    marginTop: 4,
  },
  firePhaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 6,
  },
  firePhaseText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  firePhaseDesc: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    paddingHorizontal: 8,
    lineHeight: 15,
  },
  progressBarSection: {
    marginBottom: 20,
    width: "100%",
  },
  fireProgressBarTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 5,
    overflow: "visible",
    position: "relative",
  },
  fireProgressBarFill: {
    height: "100%",
    backgroundColor: P.surf,
    borderRadius: 5,
    position: "relative",
  },
  fireProgressGlowIndicator: {
    position: "absolute",
    right: -6,
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: P.amber,
    borderWidth: 2,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  milestoneLabelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 6,
    position: "relative",
  },
  milestoneTick: {
    alignItems: "center",
    width: 32,
  },
  milestoneTickText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  fireStatsGridModern: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 16,
    gap: 12,
  },
  fireStatItemModern: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  fireStatTextContainer: {
    flex: 1,
  },
  fireStatLabelModern: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  fireStatValueModern: {
    fontSize: 14,
    fontWeight: "800",
    color: P.onSolid,
  },
  fireCardLoading: {
    backgroundColor: P.surf,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 10,
    marginHorizontal: 16,
    height: 200,
    borderWidth: 1,
    borderColor: P.line,
  },
  fireCardEmpty: {
    backgroundColor: P.surf,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    marginTop: 10,
    marginHorizontal: 16,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  fireEmptyGradient: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fireEmptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  fireEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.ink,
    marginBottom: 6,
  },
  fireEmptyText: {
    fontSize: 12,
    color: P.mute,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  fireEmptyCTA: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.solid,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  fireEmptyCTAText: {
    color: P.onSolid,
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  promoModalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: P.surf,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 20,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  promoModalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  promoModalTopBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.ink,
  },
  promoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.surf2,
    alignItems: "center",
    justifyContent: "center",
  },
  promoModalImageWrap: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: P.bg,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  promoModalImage: {
    width: "100%",
    height: "100%",
  },
  promoModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: P.ink,
    textAlign: "center",
    marginBottom: 4,
  },
  promoModalDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: P.mute,
    textAlign: "center",
    marginBottom: 16,
  },
  promoModalCoinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.bg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.line,
  },
  promoModalCoinStat: {
    flex: 1,
    alignItems: "center",
  },
  promoModalCoinStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: P.line,
    marginHorizontal: 12,
  },
  promoModalCoinStatLabel: {
    fontSize: 10,
    color: P.mute,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promoModalCoinStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  promoModalCoinStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: P.ink,
  },
  promoModalProgressWrap: {
    marginBottom: 16,
    gap: 6,
  },
  promoModalProgressBar: {
    height: 6,
    backgroundColor: P.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  promoModalProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  promoModalProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.mute,
    textAlign: "center",
  },
  promoModalButton: {
    backgroundColor: P.solid,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  promoModalButtonDisabled: {
    backgroundColor: P.surf2,
  },
  promoModalButtonText: {
    color: P.onSolid,
    fontSize: 15,
    fontWeight: "800",
  },
  promoModalButtonTextDisabled: {
    color: P.mute,
  },
  promoModalCancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
  },
  promoModalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.mute,
  },
  fireInfoContainer: {
    backgroundColor: P.surf,
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    padding: 24,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 16,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  fireInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
    paddingBottom: 12,
  },
  fireInfoTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fireInfoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: P.ink,
  },
  fireInfoCloseButton: {
    padding: 4,
    backgroundColor: P.bg,
    borderRadius: 12,
  },
  fireInfoScroll: {
    maxHeight: 320,
    marginBottom: 16,
  },
  fireInfoIntro: {
    fontSize: 13,
    color: P.mute,
    lineHeight: 18,
    marginBottom: 16,
  },
  fireFormulaCard: {
    backgroundColor: P.amberSoft,
    borderWidth: 1,
    borderColor: P.amberSoft,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  fireFormulaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: P.amber,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  fireFormulaText: {
    fontSize: 14,
    fontWeight: "800",
    color: P.amber,
    textAlign: "center",
  },
  fireFormulaSub: {
    fontSize: 10,
    color: P.amber,
    marginTop: 4,
    fontStyle: "italic",
  },
  fireSectionSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: P.ink2,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fireAssumptionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  fireAssumptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  fireAssumptionText: {
    flex: 1,
  },
  fireAssumptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 2,
  },
  fireAssumptionDesc: {
    fontSize: 11,
    color: P.mute,
    lineHeight: 16,
  },
  fireInfoOkButton: {
    backgroundColor: P.amber,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fireInfoOkText: {
    color: P.onSolid,
    fontSize: 14,
    fontWeight: "700",
  },
}));

export default CalendarMain;
