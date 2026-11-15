import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  StatusBar,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import { localISODate, inr } from "../../utils/format";
import { ScreenHeader, Card, Overline, Badge, StatGrid, Segmented, Field, DateField, SelectField, Button, Hint, Icon, Press } from "../../components/pulse";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth } from "../../config/FirebaseConfig";
import { scheduleLocalNotification } from "../../services/notificationService";
import {
  getInvestments,
  addInvestment,
  getGoals,
  updateGoal as fsUpdateGoal,
  addTransaction,
} from "../../services/firestoreService";
import { fetchMutualFundDetails } from "../../services/mutualFundApiService";
import { fundKey } from "../../services/livePriceService";


import { toast, friendlyError } from "../../ux/toast";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import ToastHost from "../../components/pulse/ToastHost";
const MFCalculator = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { fund } = route.params;

  // --- State for Calculator Inputs ---
  const [sipAmount, setSipAmount] = useState("");
  const [lumpsumAmount, setLumpsumAmount] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("12");

  // --- NEW: State for Real-time SIP Investment Tracking ---
  const [investmentDate, setInvestmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [sipHistory, setSipHistory] = useState([]); // Store monthly SIP data
  const [isActiveSIP, setIsActiveSIP] = useState(false);
  const [nextSIPDate, setNextSIPDate] = useState(null);

  // --- State for Results and UI ---
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationType, setCalculationType] = useState("SIP");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // --- NEW: State for existing investment ---
  const [existingInvestment, setExistingInvestment] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // --- NEW: Goals and Delete functionality ---
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [hasInvestedThisMonth, setHasInvestedThisMonth] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [nextAllowedInvestmentDate, setNextAllowedInvestmentDate] =
    useState(null);

  // --- NEW: Enhanced date-based investment control ---
  const [firstInvestmentDate, setFirstInvestmentDate] = useState(null);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [tempInvestmentData, setTempInvestmentData] = useState(null);
  const [notificationScheduled, setNotificationScheduled] = useState(false);

  // --- NEW: Live NAV state ---
  const [liveNav, setLiveNav] = useState(fund.nav ? parseFloat(fund.nav) : null);
  const [isFetchingNav, setIsFetchingNav] = useState(!fund.nav || isNaN(parseFloat(fund.nav)));
  const [fundMeta, setFundMeta] = useState({
    fundHouse: fund?.fundHouse || null,
    schemeType: fund?.schemeType || null,
    schemeCategory: fund?.schemeCategory || null,
    isinGrowth: fund?.isinGrowth || null,
    isinDivReinvestment: fund?.isinDivReinvestment || null,
    navDate: fund?.lastUpdated || null,
  });
  const effectiveNav = Number.isFinite(liveNav) && liveNav > 0
    ? liveNav
    : (Number.isFinite(parseFloat(fund?.nav)) ? parseFloat(fund.nav) : 0);
  const skipFirstFocusSyncRef = useRef(true);
  const disableFirestoreReadsRef = useRef(false);

  const isPermissionDeniedError = (error) => {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();
    return code.includes("permission-denied") || message.includes("insufficient permissions");
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const fetchLiveNav = async () => {
    const lookupIdentifier = fund?.schemeCode || fund?.symbol || fund?.schemeName;
    if (!lookupIdentifier) return null;
    try {
      const details = await fetchMutualFundDetails(lookupIdentifier);
      if (!details) {
        return null;
      }
      setFundMeta({
        fundHouse: details?.fundHouse || null,
        schemeType: details?.schemeType || null,
        schemeCategory: details?.schemeCategory || null,
        isinGrowth: details?.isinGrowth || null,
        isinDivReinvestment: details?.isinDivReinvestment || null,
        navDate: details?.lastUpdated || null,
      });

      if (Number.isFinite(details?.nav)) {
        setLiveNav(details.nav);
        return details.nav;
      }
    } catch (error) {
      console.warn("Could not fetch live NAV:", error?.message || error);
    }
    return null;
  };

  useEffect(() => {
    const initializeData = async () => {
      let currentNavVal = liveNav;
      if (!currentNavVal || isNaN(currentNavVal)) {
        setIsFetchingNav(true);
        currentNavVal = await fetchLiveNav();
        setIsFetchingNav(false);
      } else {
        // NAV came with the fund list; load fund house / category without blocking
        fetchLiveNav();
      }

      if (!currentNavVal) {
        toast.error("Could not fetch live pricing for this mutual fund.", { title: "NAV Error" });
      }

      // Load existing investment when component mounts
      loadExistingInvestment(currentNavVal);
      loadInvestmentStateFromStorage(currentNavVal);
      loadGoals();
    };
    initializeData();
  }, []);

  // Update focus listener
  useFocusEffect(
    React.useCallback(() => {
      if (skipFirstFocusSyncRef.current) {
        skipFirstFocusSyncRef.current = false;
        return;
      }

      if (disableFirestoreReadsRef.current) {
        return;
      }

      if (liveNav && !isNaN(liveNav)) {
        loadExistingInvestment(liveNav);
        loadInvestmentStateFromStorage(liveNav);
      }
    }, [liveNav])
  );

  // --- NEW: Load investment state from AsyncStorage ---
  const loadInvestmentStateFromStorage = async (navValue = liveNav) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const key = `mf_investment_${uid}_${fund.schemeCode || fund.symbol || fund.schemeName}`;
      const savedState = await AsyncStorage.getItem(key);

      if (savedState) {
        const state = JSON.parse(savedState);
        console.log("Loaded investment state from storage:", state);

        // Restore investment state
        setCalculationType(state.calculationType || "SIP");
        setExpectedReturn(state.expectedReturn || "12");

        if (state.amount) {
          if (state.calculationType === "SIP") {
            setSipAmount(String(state.amount));
          } else {
            setLumpsumAmount(String(state.amount));
          }
        }

        if (state.firstInvestmentDate) {
          const firstDate = new Date(state.firstInvestmentDate);
          setFirstInvestmentDate(firstDate);
          setInvestmentDate(firstDate);

          // Check if user can invest today for SIP
          if (state.calculationType === "SIP") {
            const today = new Date();
            const dayOfMonth = firstDate.getDate();

            // Check if at least a month has passed and it's the right day
            const monthsPassed =
              (today.getFullYear() - firstDate.getFullYear()) * 12 +
              (today.getMonth() - firstDate.getMonth());

            if (monthsPassed > 0 && today.getDate() === dayOfMonth) {
              setHasInvestedThisMonth(false); // Allow investment
            } else {
              setHasInvestedThisMonth(true); // Prevent investment
            }

            const nextDate = calculateNextInvestmentDate(firstDate);
            setNextAllowedInvestmentDate(nextDate);
          }
        }

        // Auto-calculate results
        setTimeout(() => {
          if (state.calculationType === "SIP" && state.amount) {
            calculateRealTimeSIP(navValue);
          } else if (state.calculationType === "LUMPSUM" && state.amount) {
            calculateLumpsum(navValue);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error loading investment state from storage:", error);
    }
  };

  // --- NEW: Load existing investment for this fund ---
  const loadExistingInvestment = async (navValue = liveNav) => {
    try {
      if (disableFirestoreReadsRef.current) {
        setIsLoadingExisting(false);
        return;
      }

      setIsLoadingExisting(true);
      const uid = auth.currentUser?.uid;
      if (!uid) { setIsLoadingExisting(false); return; }

      const allInvestments = await getInvestments(uid, "Mutual Fund");
      const mfInvestments = allInvestments.filter((investment) => {
        return (
          investment.schemeCode === fund.schemeCode ||
          investment.schemeCode === fund.symbol ||
          investment.name === fund.schemeName ||
          investment.schemeName === fund.schemeName
        );
      });

      console.log(`🎯 Found ${mfInvestments.length} MF investments for ${fund.schemeName}`);

      if (mfInvestments.length > 0) {
        const existing = mfInvestments[mfInvestments.length - 1];
        setExistingInvestment(existing);

        if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
          setCalculationType("SIP");
          setSipAmount(String(existing.monthlyDeposit || existing.amount));
        } else {
          setCalculationType("LUMPSUM");
          setLumpsumAmount(String(existing.amount));
        }

        if (existing.investmentDate || existing.startDate) {
          const startDate = new Date(existing.investmentDate || existing.startDate);
          setInvestmentDate(startDate);
          setFirstInvestmentDate(startDate);

          if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
            const nextDate = calculateNextInvestmentDate(startDate);
            setNextAllowedInvestmentDate(nextDate);
            const today = new Date();
            const daysSinceLastInvestment = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastInvestment < 30) setHasInvestedThisMonth(true);
          }
        }

        if (existing.interestRate) setExpectedReturn(String(existing.interestRate));
        setTimeout(() => displayExistingInvestmentResult(existing, navValue), 100);
      } else {
        setExistingInvestment(null);
      }
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        disableFirestoreReadsRef.current = true;
        setExistingInvestment(null);
        console.warn("⚠️ Firestore read blocked by security rules for investments. Using local state fallback.");
      } else {
        console.error("Error loading existing investment:", error);
      }
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // --- NEW: Load goals for dropdown ---
  // --- NEW: Helper function to get goal display name like FD/RD ---
  const loadGoals = async () => {
    try {
      const uid = auth.currentUser?.uid;

      const fireNumberGoal = {
        id: "firenumber",
        _id: "firenumber",
        name: "F.I.R.E Number",
        customName: "F.I.R.E Number",
        description: "Financial Independence, Retire Early",
        isDefault: true,
      };

      let allGoals = [fireNumberGoal];

      if (uid && !disableFirestoreReadsRef.current) {
        const goalsData = await getGoals(uid);
        const hasFireNumber = goalsData.some(
          (g) => g.name === "F.I.R.E Number" || g.name === "FIRE Number" || g.id === "firenumber"
        );
        allGoals = hasFireNumber ? goalsData : [fireNumberGoal, ...goalsData];
      }

      setGoals(allGoals);

      if (!selectedGoal) {
        const defaultGoal = allGoals.find(
          (g) => g.name === "F.I.R.E Number" || g.name === "FIRE Number" || g.id === "firenumber"
        ) || allGoals[0];
        setSelectedGoal(defaultGoal);
      }

      console.log("🎯 Loaded", allGoals.length, "goals for MF");
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        disableFirestoreReadsRef.current = true;
        console.warn("⚠️ Firestore read blocked by security rules for goals. Falling back to default goal.");
      } else {
        console.error("Error loading goals:", error);
      }
      const fireNumberGoal = {
        id: "firenumber",
        _id: "firenumber",
        name: "F.I.R.E Number",
        customName: "F.I.R.E Number",
        description: "Financial Independence, Retire Early",
        isDefault: true,
      };
      setGoals([fireNumberGoal]);
      if (!selectedGoal) setSelectedGoal(fireNumberGoal);
    }
  };

  // --- NEW: Display result for existing investment ---
  const displayExistingInvestmentResult = (existing, navValue = liveNav) => {
    const currentNAV = navValue || liveNav;

    if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
      // Display SIP result
      const monthlyAmount = existing.monthlyDeposit || existing.amount;
      const totalUnits = existing.totalUnits || existing.amount / existing.nav;
      const averageNAV = existing.averageNAV || existing.nav;
      const currentValue = totalUnits * currentNAV;
      const totalInvestment = existing.amount;
      const totalReturns = currentValue - totalInvestment;

      // Create simplified breakdown for existing investment
      const sipBreakdown = [];
      const months = 12;
      for (let i = 1; i <= months; i++) {
        const navVariation = (Math.random() - 0.5) * 0.2;
        const monthlyNAV = currentNAV * (1 + navVariation);
        const monthlyUnits = monthlyAmount / monthlyNAV;

        sipBreakdown.push({
          month: i,
          invested: monthlyAmount,
          nav: monthlyNAV,
          units: monthlyUnits,
          navStatus:
            monthlyNAV > currentNAV
              ? "high"
              : monthlyNAV < currentNAV
                ? "low"
                : "neutral",
        });
      }

      setCalculationResult({
        type: "SIP",
        monthlyAmount: monthlyAmount,
        totalInvestment: totalInvestment,
        totalUnits: totalUnits,
        averageNAV: averageNAV,
        currentNAV: currentNAV,
        currentValue: currentValue,
        totalReturns: totalReturns,
        sipBreakdown: sipBreakdown,
        startDate: existing.startDate
          ? new Date(existing.startDate)
          : new Date(),
        isExisting: true, // Flag to indicate this is an existing investment
      });
    } else {
      // Display Lumpsum result
      const totalUnits = existing.totalUnits || existing.amount / existing.nav;
      const currentValue = totalUnits * currentNAV;
      const totalReturns = currentValue - existing.amount;

      setCalculationResult({
        type: "LUMPSUM",
        principal: existing.amount,
        units: totalUnits,
        currentNAV: currentNAV,
        currentValue: currentValue,
        totalReturns: totalReturns,
        startDate: existing.startDate
          ? new Date(existing.startDate)
          : new Date(),
        isExisting: true, // Flag to indicate this is an existing investment
      });
    }
  };

  // --- Date Picker Logic ---
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || investmentDate;
    setShowDatePicker(Platform.OS === "ios"); // On iOS, the picker is a modal
    setInvestmentDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // --- Real-time SIP Calculation with Monthly Investment ---
  const calculateRealTimeSIP = (navValue = liveNav) => {
    const monthlyAmount = parseFloat(sipAmount);
    const currentNAV = navValue || liveNav;

    if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
      toast.warning("Please enter valid SIP amount.");
      return;
    }

    if (isNaN(currentNAV) || currentNAV <= 0) {
      toast.error("Live NAV is currently unavailable. Cannot calculate SIP.");
      return;
    }

    // First month investment
    const firstMonthUnits = monthlyAmount / currentNAV;
    const firstMonthData = {
      month: 1,
      date: new Date(investmentDate),
      invested: monthlyAmount,
      nav: currentNAV,
      units: firstMonthUnits,
      totalInvested: monthlyAmount,
      totalUnits: firstMonthUnits,
      currentValue: firstMonthUnits * currentNAV,
      profit: 0,
    };

    // Calculate next SIP date (same date next month)
    const nextDate = new Date(investmentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    // Handle month-end dates (30/31)
    if (investmentDate.getDate() > 28) {
      nextDate.setDate(0); // Set to last day of month
      nextDate.setDate(nextDate.getDate() + 1); // Adjust to correct last day
    }

    setSipHistory([firstMonthData]);
    setCurrentMonth(1);
    setNextSIPDate(nextDate);
    setIsActiveSIP(true);

    // Set result for first month
    setCalculationResult({
      type: "REAL_TIME_SIP",
      monthlyAmount: monthlyAmount,
      currentMonth: 1,
      totalInvestment: monthlyAmount,
      totalUnits: firstMonthUnits,
      averageNAV: currentNAV,
      currentNAV: currentNAV,
      currentValue: firstMonthUnits * currentNAV,
      totalReturns: 0,
      profitPercentage: 0,
      sipHistory: [firstMonthData],
      nextSIPDate: nextDate,
      startDate: investmentDate,
      isActiveSIP: true,
    });

    console.log("First Month SIP Investment:", firstMonthData);
  };

  const calculateLumpsum = (navValue = liveNav) => {
    const principal = parseFloat(lumpsumAmount);
    const currentNAV = navValue || liveNav;

    console.log("Lumpsum Input values:", { principal, currentNAV });

    if (isNaN(principal) || principal <= 0) {
      toast.warning("Please enter valid lumpsum amount.");
      console.log("Lumpsum validation failed");
      return;
    }

    if (isNaN(currentNAV) || currentNAV <= 0) {
      toast.error("Live NAV is currently unavailable. Cannot calculate Lumpsum.");
      return;
    }

    const units = principal / currentNAV;
    const currentValue = units * currentNAV; // Same as principal initially

    const result = {
      type: "LUMPSUM",
      principal,
      units: units,
      currentNAV: currentNAV,
      currentValue: currentValue,
      totalReturns: 0, // No returns initially
      startDate: investmentDate,
    };

    console.log("Lumpsum Calculation Result:", result);
    setCalculationResult(result);
  };

  const handleCalculate = () => {
    console.log("Calculate button clicked");
    console.log("Current state:", {
      sipAmount,
      lumpsumAmount,
      expectedReturn,
      calculationType,
      selectedGoal,
    });

    // Validate goal selection
    if (!selectedGoal) {
      toast.warning("Pick the goal this investment is for, so it counts towards it.", {
        title: "Choose a goal",
        action: { label: "Choose", onPress: () => setShowGoalModal(true) },
      });
      return;
    }

    if (calculationType === "SIP") {
      console.log("Starting Real-time SIP");
      calculateRealTimeSIP();
    } else {
      console.log("Calling calculateLumpsum");
      calculateLumpsum();
    }
  };

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    if (isNaN(number)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(number);
  };

  // --- NEW: Enhanced date-based investment checking ---
  const canInvestToday = () => {
    if (!firstInvestmentDate && !nextAllowedInvestmentDate) return true;

    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // If we have a first investment date, check if today matches the allowed date
    if (firstInvestmentDate) {
      const firstDate = new Date(firstInvestmentDate);
      const expectedDay = firstDate.getDate();

      // Check if today's date matches the investment day and we're in a new month
      if (todayDate === expectedDay) {
        // Check if we're in a different month than the last investment
        if (nextAllowedInvestmentDate) {
          const nextDate = new Date(nextAllowedInvestmentDate);
          return today >= nextDate;
        }
        return true;
      }
      return false;
    }

    // Fallback to original logic if no first investment date
    if (!nextAllowedInvestmentDate) return true;
    const allowedDate = new Date(nextAllowedInvestmentDate);
    today.setHours(0, 0, 0, 0);
    allowedDate.setHours(0, 0, 0, 0);
    return today >= allowedDate;
  };

  // --- NEW: Calculate remaining days until next investment ---
  const getRemainingDaysToInvest = () => {
    if (!firstInvestmentDate) return 0;

    const today = new Date();
    const firstDate = new Date(firstInvestmentDate);

    // Calculate 30 days from first investment
    const thirtyDaysFromFirst = new Date(firstDate);
    thirtyDaysFromFirst.setDate(thirtyDaysFromFirst.getDate() + 30);

    // If less than 30 days have passed, return days until 30-day mark
    if (today < thirtyDaysFromFirst) {
      return Math.ceil((thirtyDaysFromFirst - today) / (1000 * 60 * 60 * 24));
    }

    // If 30+ days have passed, calculate next SIP date
    const expectedDay = firstDate.getDate();
    const nextInvestment = new Date(today);
    nextInvestment.setDate(expectedDay);

    // If the day has passed this month, move to next month
    if (
      today.getDate() > expectedDay ||
      (today.getDate() === expectedDay && hasInvestedThisMonth)
    ) {
      nextInvestment.setMonth(nextInvestment.getMonth() + 1);
    }

    // Handle month-end dates
    if (expectedDay > 28) {
      const lastDayOfMonth = new Date(
        nextInvestment.getFullYear(),
        nextInvestment.getMonth() + 1,
        0
      ).getDate();
      if (expectedDay > lastDayOfMonth) {
        nextInvestment.setDate(lastDayOfMonth);
      }
    }

    const diffTime = nextInvestment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(diffDays, 0);
  };

  // --- NEW: Check if today is the exact investment date ---
  const isTodayInvestmentDate = () => {
    if (!firstInvestmentDate) return true;

    const today = new Date();
    const firstDate = new Date(firstInvestmentDate);

    // Check if it's the first investment
    if (!hasInvestedThisMonth) return true;

    // If user has invested this month, check if at least 30 days have passed
    const daysSinceLastInvestment = Math.floor(
      (today - firstDate) / (1000 * 60 * 60 * 24)
    );

    // Strict 30-day rule: user can only invest after 30 days
    if (daysSinceLastInvestment < 30) {
      return false;
    }

    // Check if it's the same date in a new month
    const isSameDateInMonth = today.getDate() === firstDate.getDate();

    // Allow investment only if:
    // 1. At least 30 days have passed
    // 2. It's the same date in the new month
    // 3. User hasn't invested this month yet
    return isSameDateInMonth && !hasInvestedThisMonth;
  };

  // --- NEW: Calculate next allowed investment date ---
  const calculateNextInvestmentDate = (lastInvestmentDate) => {
    const nextDate = new Date(lastInvestmentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    // Handle month-end dates (30/31)
    if (lastInvestmentDate.getDate() > 28) {
      nextDate.setDate(0); // Set to last day of month
      nextDate.setDate(nextDate.getDate() + 1); // Adjust to correct last day
    }

    return nextDate;
  };

  // --- NEW: Show investment permission dialog ---
  const showInvestmentPermissionDialog = () => {
    if (!selectedGoal) {
      toast.warning("Please select a goal to invest in.");
      return;
    }

    const investmentAmount =
      calculationType === "SIP"
        ? parseFloat(sipAmount)
        : parseFloat(lumpsumAmount);

    if (!investmentAmount || investmentAmount <= 0) {
      toast.warning("Please enter a valid investment amount.");
      return;
    }

    // Store temporary investment data
    setTempInvestmentData({
      amount: investmentAmount,
      goal: selectedGoal,
      type: calculationType,
      date: new Date(),
    });

    // Show custom confirmation modal
    setShowConfirmModal(true);
  };

  // --- NEW: Schedule notification for next SIP ---
  const scheduleNextSIPNotification = (nextDate, fundName, amount) => {
    // 1. Two Days Before Notification (at 6:00 AM sharp)
    const twoDaysBefore = new Date(nextDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    twoDaysBefore.setHours(6, 0, 0, 0); // 6:00 AM sharp

    if (twoDaysBefore > new Date()) {
      scheduleLocalNotification(
        "Upcoming SIP Reminder 💰",
        `Your ₹${amount.toLocaleString()} SIP for ${fundName} is coming up in 2 days on ${nextDate.toLocaleDateString("en-IN")}!`,
        twoDaysBefore
      );
      console.log(`✅ SIP Prior Notification scheduled for ${twoDaysBefore.toLocaleString()}`);
    }

    // 2. Day-Of Notification (at 6:00 AM sharp)
    const dayOfDate = new Date(nextDate);
    dayOfDate.setHours(6, 0, 0, 0); // 6:00 AM sharp

    if (dayOfDate > new Date()) {
      scheduleLocalNotification(
        "SIP Due Today! 💰",
        `Your ₹${amount.toLocaleString()} SIP for ${fundName} is due TODAY! Make sure your auto-pay is set.`,
        dayOfDate
      );
      console.log(`✅ SIP Exact Day Notification scheduled for ${dayOfDate.toLocaleString()}`);
    }
  };

  // --- NEW: Process the confirmed investment ---
  const processInvestment = async () => {
    if (!tempInvestmentData) return;

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("You must be logged in.", { title: "Authentication error" });
        return;
      }

      // 🔹 Save MF investment to Firestore
      const mfInvestmentData = {
        schemeCode: fund.schemeCode,
        schemeName: fund.schemeName,
        name: fund.schemeName,
        investmentType: "Mutual Fund",
        amount: tempInvestmentData.amount,
        currentAmount: tempInvestmentData.amount,
        units: tempInvestmentData.amount / (effectiveNav || 1),
        nav: effectiveNav,
        currentNAV: effectiveNav,
        averageNAV: effectiveNav,
        fundHouse: fundMeta.fundHouse,
        schemeType: fundMeta.schemeType,
        schemeCategory: fundMeta.schemeCategory,
        calculationType: calculationType,
        startDate: investmentDate.toISOString(),
        investmentDate: investmentDate.toISOString(),
        sipDate: calculationType === "SIP" ? investmentDate.getDate() : null,
        interestRate: parseFloat(expectedReturn) || 12,
        goalId: tempInvestmentData.goal?.id === "firenumber" || tempInvestmentData.goal?._id === "firenumber"
          ? "firenumber"
          : (tempInvestmentData.goal?.id || tempInvestmentData.goal?._id),
        goalName:
          tempInvestmentData.goal?.customName ||
          tempInvestmentData.goal?.name ||
          "F.I.R.E Number",
      };

      const newInvestmentId = await addInvestment(uid, mfInvestmentData);
      console.log("✅ MF investment created with ID:", newInvestmentId);

      // 🔹 Update linked goal (if not firenumber pseudo-goal)
      const goalId = tempInvestmentData.goal?.id || tempInvestmentData.goal?._id;
      if (goalId && goalId !== "firenumber") {
        try {
          await fsUpdateGoal(uid, goalId, {
            currentAmount: (tempInvestmentData.goal.currentAmount || 0) + tempInvestmentData.amount,
            lastUpdated: new Date().toISOString(),
          });
          console.log("✅ Goal updated successfully");
        } catch (goalErr) {
          console.warn("Goal update failed (non-critical):", goalErr.message);
        }
      }

      // 🔹 Add a transaction record for calendar display
      try {
        await addTransaction(uid, {
          amount: tempInvestmentData.amount,
          type: "Investment",
          subType: "Mutual Fund",
          name: `MF Investment: ${fund.schemeName}`,
          method: "Investment",
          date: localISODate(investmentDate),
          goalId: goalId || "firenumber",
          investmentId: newInvestmentId,
          units: tempInvestmentData.amount / (effectiveNav || 1),
          nav: effectiveNav,
        });
        console.log("✅ Transaction created for calendar");
      } catch (txnErr) {
        console.warn("Transaction creation failed (non-critical):", txnErr.message);
      }

      // Set first investment date and SIP state
      if (!firstInvestmentDate) setFirstInvestmentDate(tempInvestmentData.date);
      if (calculationType === "SIP") {
        const nextInvestmentDate = calculateNextInvestmentDate(tempInvestmentData.date);
        setNextAllowedInvestmentDate(nextInvestmentDate);
        setHasInvestedThisMonth(true);
      }

      // Save investment state to AsyncStorage
      try {
        const investmentState = {
          fundSchemeCode: fund.schemeCode,
          fundSchemeName: fund.schemeName,
          calculationType: calculationType,
          amount: tempInvestmentData.amount,
          firstInvestmentDate: tempInvestmentData.date.toISOString(),
          hasInvestedThisMonth: calculationType === "SIP",
          expectedReturn: expectedReturn,
          goalId: goalId || "firenumber",
          lastUpdated: new Date().toISOString(),
          mfInvestmentId: newInvestmentId,
        };
        const key = `mf_investment_${uid}_${fund.schemeCode}`;
        await AsyncStorage.setItem(key, JSON.stringify(investmentState));
      } catch (storageError) {
        console.warn("Failed to save investment state:", storageError.message);
      }

      EventRegister.emit("investmentAdded", {
        type: "Investment",
        subType: "Mutual Fund",
        investmentType: "Mutual Fund",
        name: fund.schemeName,
        amount: tempInvestmentData.amount,
        goalId: goalId || "firenumber",
        investmentId: newInvestmentId,
        date: new Date().toISOString(),
        calculationType: calculationType,
      });
      EventRegister.emit("goalUpdated");
      EventRegister.emit("transactionAdded");

      setSipAmount("");
      setLumpsumAmount("");
      setSelectedGoal(null);
      setCalculationResult(null);

      const goalName = tempInvestmentData.goal?.customName || tempInvestmentData.goal?.name || "F.I.R.E.";
      const nextSip =
        calculationType === "SIP"
          ? `Next SIP ${calculateNextInvestmentDate(tempInvestmentData.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
          : null;
      toast.coin([`${inr(tempInvestmentData.amount)} in ${fund.schemeName}`, goalName, nextSip].filter(Boolean).join(" · "), {
        title: "Invested · +25 coins",
      });
      setShowConfirmModal(false);
      setShowInvestmentDialog(false);
      await loadExistingInvestment();
    } catch (error) {
      console.error("❌ Investment processing error:", error);
      toast.error(friendlyError(error, "Couldn't save this investment. Please try again."));
    } finally {
      setTempInvestmentData(null);
    }
  };

  // --- NEW: Schedule notification for next investment date ---
  const scheduleNotification = () => {
    const remainingDays = getRemainingDaysToInvest();

    const nextDate = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    toast.success(`Next investment ${nextDate} · we'll remind you before it.`, { title: "Reminder set" });

    setNotificationScheduled(true);

    if (nextAllowedInvestmentDate && fund?.schemeName) {
      scheduleNextSIPNotification(
        new Date(nextAllowedInvestmentDate),
        fund.schemeName,
        sipAmount || existingInvestment?.amount || 0
      );
    }
  };

  // --- NEW: Add investment to selected goal (updated with enhanced date checking) ---
  const addToGoal = async () => {
    if (!selectedGoal) {
      toast.warning("Please select a goal to invest in.");
      return;
    }

    // Enhanced date checking for SIP
    if (calculationType === "SIP") {
      if (!isTodayInvestmentDate()) {
        const remainingDays = getRemainingDaysToInvest();

        const d = firstInvestmentDate ? new Date(firstInvestmentDate).getDate() : null;
        const suffix = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
        const sipDay = d ? `the ${d}${suffix}` : "the same day";
        toast.info(`You invest on ${sipDay} of each month · ${remainingDays} day${remainingDays === 1 ? "" : "s"} to go.`, {
          title: "Not your SIP date yet",
          action: { label: "Remind me", onPress: scheduleNotification },
        });
        return;
      }
    }

    // Show permission dialog
    showInvestmentPermissionDialog();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />

      {/* Modern Header */}
      <ScreenHeader overline="Mutual funds" title="Track a fund" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading indicator while checking for existing investment */}
        {isLoadingExisting && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Loading existing investment...
            </Text>
          </View>
        )}
        {/* Fund */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Overline>{fundMeta.fundHouse || "Mutual fund"}</Overline>
            <Text style={styles.fundTitle}>{fund.schemeName}</Text>
          </View>
          {existingInvestment ? <Badge>You track this fund</Badge> : null}
          <StatGrid
            items={[
              { label: "NAV", value: isFetchingNav ? "…" : formatCurrency(liveNav), sub: fundMeta.navDate ? `as of ${fundMeta.navDate}` : null },
              { label: "Scheme code", value: String(fund.schemeCode || "—") },
            ]}
            columns={2}
          />
          {fundMeta.schemeCategory ? <Text style={styles.metaNote}>{fundMeta.schemeCategory}</Text> : null}
        </Card>

        <Segmented
          options={[
            { value: "SIP", label: "Track a SIP" },
            { value: "LUMPSUM", label: "Track lumpsum" },
          ]}
          value={calculationType}
          onChange={setCalculationType}
        />

        {/* Inputs */}
        <Card style={{ gap: 14 }}>
          {calculationType === "SIP" ? (
            <Field
              label={isActiveSIP ? "Monthly SIP (₹) · editable for next month" : "Monthly SIP (₹)"}
              value={sipAmount}
              onChangeText={setSipAmount}
              placeholder="e.g. 5,000"
              keyboardType="numeric"
            />
          ) : (
            <Field label="Lumpsum amount (₹)" value={lumpsumAmount} onChangeText={setLumpsumAmount} placeholder="e.g. 50,000" keyboardType="numeric" />
          )}
          {(() => {
            const amt = parseFloat(calculationType === "SIP" ? sipAmount : lumpsumAmount);
            return amt > 0 && liveNav ? (
              <Hint>
                ≈ {(amt / liveNav).toFixed(2)} units {calculationType === "SIP" ? "each month" : ""} at today's NAV
              </Hint>
            ) : null;
          })()}
          <DateField
            label={calculationType === "SIP" ? "SIP start date" : "Investment date"}
            value={investmentDate}
            onChange={(d) => onDateChange({ type: "set" }, d)}
            maximumDate={new Date()}
          />
          <Field label="Expected annual return (%)" value={expectedReturn} onChangeText={setExpectedReturn} placeholder="12" keyboardType="numeric" />
          <SelectField
            label="Link to goal"
            value={selectedGoal?.id || selectedGoal?._id || null}
            onChange={(id) => setSelectedGoal(goals.find((g) => (g.id || g._id) === id) || null)}
            title="Which goal is this for?"
            placeholder="Select a goal"
            options={goals.map((g) => ({ value: g.id || g._id, label: g.customName || g.name || "F.I.R.E Number" }))}
          />
          <Button title={calculationType === "SIP" ? "Calculate SIP" : "Calculate lumpsum"} onPress={handleCalculate} />
        </Card>

        {/* Results Display */}
        {calculationResult && (
          <View style={styles.resultContainer}>
            <View style={styles.resultTitleContainer}>
              <Text style={styles.resultTitle}>
                {calculationResult.type === "REAL_TIME_SIP"
                  ? `SIP Progress - Month ${calculationResult.currentMonth}`
                  : "Projected Growth"}
              </Text>
              {calculationResult.type === "REAL_TIME_SIP" && (
                <View style={styles.liveBadge}>
                  <Ionicons name="pulse" size={12} color={P.neg} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            <View style={styles.resultGrid}>
              {calculationResult.type === "REAL_TIME_SIP" ? (
                <>
                  {/* Row 1 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Monthly SIP</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.monthlyAmount)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Current Month</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      Month {calculationResult.currentMonth}
                    </Text>
                  </View>
                  {/* Row 2 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Total Invested</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.totalInvestment)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Total Units</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {calculationResult.totalUnits.toFixed(2)}
                    </Text>
                  </View>
                  {/* Row 3 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Average NAV</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.averageNAV)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Current NAV</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.currentNAV)}
                    </Text>
                  </View>
                  {/* Highlighted Full Width Row */}
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text style={[styles.resultLabel, { color: P.ink2 }]}>
                        Current Portfolio Value
                      </Text>
                    </View>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text
                        style={[
                          styles.resultLabel,
                          {
                            color:
                              calculationResult.totalReturns >= 0
                                ? P.pos
                                : P.neg,
                          },
                        ]}
                      >
                        Total{" "}
                        {calculationResult.totalReturns >= 0
                          ? "Profit"
                          : "Loss"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.resultValue,
                        calculationResult.totalReturns >= 0
                          ? styles.successValue
                          : styles.errorValue,
                      ]}
                    >
                      {formatCurrency(Math.abs(calculationResult.totalReturns))}
                      {calculationResult.profitPercentage !== undefined && (
                        <Text style={styles.percentageText}>
                          {" "}
                          ({calculationResult.profitPercentage >= 0 ? "+" : ""}
                          {calculationResult.profitPercentage.toFixed(1)}%)
                        </Text>
                      )}
                    </Text>
                  </View>
                </>
              ) : calculationResult.type === "SIP" ? (
                <>
                  {/* Row 1 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Monthly SIP</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.monthlyAmount)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Months</Text>
                    </View>
                    <Text style={styles.resultValue}>12 months</Text>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Total Invested</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.totalInvestment)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Total Units</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {calculationResult.totalUnits.toFixed(2)}
                    </Text>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Average NAV</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.averageNAV)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Current NAV</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.currentNAV)}
                    </Text>
                  </View>

                  {/* Highlighted Full Width Rows */}
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text style={[styles.resultLabel, { color: P.primary }]}>
                        Current Value
                      </Text>
                    </View>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text
                        style={[
                          styles.resultLabel,
                          {
                            color:
                              calculationResult.totalReturns >= 0
                                ? P.pos
                                : P.neg,
                          },
                        ]}
                      >
                        Total{" "}
                        {calculationResult.totalReturns >= 0
                          ? "Profit"
                          : "Loss"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.resultValue,
                        calculationResult.totalReturns >= 0
                          ? styles.successValue
                          : styles.errorValue,
                      ]}
                    >
                      {formatCurrency(Math.abs(calculationResult.totalReturns))}{" "}
                      (
                      {calculationResult.totalInvestment > 0
                        ? (
                          (calculationResult.totalReturns /
                            calculationResult.totalInvestment) *
                          100
                        ).toFixed(0)
                        : 0}
                      %)
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Row 1 */}
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Lumpsum Amount</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.principal)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Units Purchased</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {calculationResult.units.toFixed(2)}
                    </Text>
                  </View>

                  {/* Highlighted Full Width Rows */}
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text style={styles.resultLabel}>Current NAV</Text>
                    </View>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.currentNAV)}
                    </Text>
                  </View>
                  <View style={[styles.resultItem, styles.resultItemFull]}>
                    <View style={styles.resultItemTop}>
                      <Text style={[styles.resultLabel, { color: P.primary }]}>
                        Current Value
                      </Text>
                    </View>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View>
              {/* Enhanced Investment Status Info for SIP */}
              {calculationType === "SIP" && (
                <View style={styles.investmentStatusContainer}>
                  <Ionicons
                    name={isTodayInvestmentDate() ? "checkmark-circle" : "time"}
                    size={16}
                    color={isTodayInvestmentDate() ? P.pos : P.amber}
                  />
                  <Text style={styles.investmentStatusText}>
                    {isTodayInvestmentDate()
                      ? "Today is your investment date!"
                      : firstInvestmentDate
                        ? `Investment allowed on ${new Date(
                          firstInvestmentDate
                        ).getDate()}${["th", "st", "nd", "rd"][
                        new Date(firstInvestmentDate).getDate() % 10 > 3
                          ? 0
                          : new Date(firstInvestmentDate).getDate() % 10
                        ]
                        } of each month`
                        : "First investment can be made anytime"}
                  </Text>
                </View>
              )}

              {/* Remaining Days Info for early investment attempts */}
              {calculationType === "SIP" &&
                !isTodayInvestmentDate() &&
                firstInvestmentDate && (
                  <View style={styles.remainingDaysContainer}>
                    <Icon name="calendar" size={14} color={P.mute} />
                    <Text style={styles.remainingDaysText}>
                      {getRemainingDaysToInvest()} days remaining until next
                      investment
                    </Text>
                  </View>
                )}

              {/* ===== MODIFIED BUTTON CONTAINER ===== */}
              <View style={styles.actionButtonsContainer}>
                {/* Add to Goal Button */}
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[
                    styles.addToGoalButton,
                    calculationType === "SIP" &&
                    !isTodayInvestmentDate() &&
                    styles.disabledButton,
                  ]}
                  onPress={addToGoal}
                  disabled={
                    calculationType === "SIP" && !isTodayInvestmentDate()
                  }
                >
                  <Ionicons
                    name="flag"
                    size={20}
                    color={calculationType === "SIP" && !isTodayInvestmentDate() ? P.mute : P.accInk}
                  />
                  <Text
                    style={[
                      styles.addToGoalButtonText,
                      calculationType === "SIP" &&
                      !isTodayInvestmentDate() &&
                      styles.disabledButtonText,
                    ]}
                  >
                    {calculationType === "SIP" && !isTodayInvestmentDate()
                      ? "Scheduled"
                      : "Invest"}
                  </Text>
                </Press>

                {/* Manage: redeem, edit or delete purchases of a held fund */}
                {existingInvestment && (
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.manageButton}
                    onPress={() =>
                      navigation.navigate("MFHolding", { fundKey: fundKey(existingInvestment), schemeName: fund.schemeName })
                    }
                  >
                    <Icon name="edit" size={20} color={P.ink} />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </Press>
                )}
              </View>

              {/* Notify Me Button - Show when investment is not allowed */}
              {calculationType === "SIP" &&
                !isTodayInvestmentDate() &&
                firstInvestmentDate && (
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.notifyButton}
                    onPress={scheduleNotification}
                    disabled={notificationScheduled}
                  >
                    <Ionicons
                      name={
                        notificationScheduled
                          ? "checkmark-circle"
                          : "notifications"
                      }
                      size={20}
                      color={notificationScheduled ? P.pos : P.primary}
                    />
                    <Text
                      style={[
                        styles.notifyButtonText,
                        notificationScheduled && styles.notifiedText,
                      ]}
                    >
                      {notificationScheduled ? "Notification Set" : "Notify Me"}
                    </Text>
                  </Press>
                )}
            </View>

            {/* SIP History Section - Only for Real-time SIP */}
            {calculationResult.type === "REAL_TIME_SIP" &&
              calculationResult.sipHistory && (
                <View style={styles.historySection}>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.toggleHistoryButton}
                    onPress={() => setShowBreakdown(!showBreakdown)}
                  >
                    <Ionicons
                      name={showBreakdown ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={P.pos}
                    />
                    <Text style={styles.toggleHistoryText}>
                      {showBreakdown ? "Hide" : "Show"} SIP Investment History (
                      {calculationResult.sipHistory.length} months)
                    </Text>
                  </Press>

                  {showBreakdown && (
                    <View style={styles.historyContent}>
                      <View style={styles.historyTitleSection}>
                        <Icon name="calendar" size={20} color={P.ink2} />
                        <Text style={styles.historyTitle}>
                          Your SIP Investment Journey
                        </Text>
                      </View>

                      {/* SIP History Table */}
                      <View style={styles.historyTable}>
                        <View style={styles.tableHeader}>
                          <Text style={styles.tableHeaderCell}>Month</Text>
                          <Text style={styles.tableHeaderCell}>Invested</Text>
                          <Text style={styles.tableHeaderCell}>NAV</Text>
                          <Text style={styles.tableHeaderCell}>Units</Text>
                        </View>

                        {calculationResult.sipHistory.map(
                          (monthData, index) => (
                            <View key={index} style={styles.tableDataRow}>
                              <Text style={styles.tableCell}>
                                Month {monthData.month}
                              </Text>
                              <Text style={styles.tableCell}>
                                ₹{monthData.invested.toLocaleString()}
                              </Text>
                              <Text style={styles.tableCell}>
                                ₹{monthData.nav.toFixed(2)}
                              </Text>
                              <Text style={styles.tableCell}>
                                {monthData.units.toFixed(2)}
                              </Text>
                            </View>
                          )
                        )}
                      </View>

                      <View style={styles.historySummary}>
                        <Text style={styles.historySummaryText}>
                          Your SIP shows the power of rupee cost averaging -
                          you bought more units when NAV was low and fewer when
                          it was high, leading to a better average NAV!
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

            {/* SIP Breakdown Section - Only for SIP */}
            {calculationResult.type === "SIP" && (
              <View style={styles.breakdownSection}>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.toggleBreakdownButton}
                  onPress={() => setShowBreakdown(!showBreakdown)}
                >
                  <Ionicons
                    name={showBreakdown ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={P.primary}
                  />
                  <Text style={styles.toggleBreakdownText}>
                    {showBreakdown ? "Hide" : "Show"} Monthly Breakdown
                  </Text>
                </Press>

                {/* Breakdown Content */}
                {showBreakdown && (
                  <View style={styles.breakdownContent}>
                    <View style={styles.breakdownTitleSection}>
                      <Ionicons name="bulb" size={20} color={P.ink2} />
                      <Text style={styles.breakdownTitle}>
                        SIP Calculation Breakdown
                      </Text>
                    </View>

                    <Text style={styles.exampleFundName}>
                      Example: {fund.schemeName}
                    </Text>

                    <View style={styles.investmentDetailsHeader}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={P.ink2}
                      />
                      <Text style={styles.investmentDetailsTitle}>
                        Investment Details:
                      </Text>
                    </View>

                    {/* Monthly Breakdown Table */}
                    <View style={styles.monthlyTable}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderCell}>Month</Text>
                        <Text style={styles.tableHeaderCell}>NAV</Text>
                        <Text style={styles.tableHeaderCell}>Investment</Text>
                        <Text style={styles.tableHeaderCell}>Units</Text>
                      </View>

                      {calculationResult.sipBreakdown
                        ?.slice(0, 2)
                        .map((month, index) => (
                          <View key={index} style={styles.tableDataRow}>
                            <Text style={styles.tableCell}>
                              {new Date(2025, 7 + index).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </Text>
                            <Text style={styles.tableCell}>
                              ₹{month.nav.toFixed(2)}
                            </Text>
                            <Text style={styles.tableCell}>
                              {formatCurrency(month.invested)}
                            </Text>
                            <Text style={styles.tableCell}>
                              {month.units.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                    </View>

                    <View style={styles.historySummary}>
                      <Text style={styles.historySummaryText}>
                        Your SIP shows the power of rupee cost averaging -
                        you bought more units when NAV was low and fewer when it
                        was high, leading to a better average NAV!
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Goal Selection Modal */}
      <PopupModal toastHost={false}
        visible={showGoalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <PopupBackdrop style={styles.modalOverlay}>
          <PopupPanel placement="center" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a goal</Text>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close"
                onPress={() => setShowGoalModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={P.mute} />
              </Press>
            </View>

            <ScrollView
              style={styles.goalsList}
              showsVerticalScrollIndicator={false}
            >
              {goals.length === 0 ? (
                <View style={styles.noGoalsContainer}>
                  <Text style={styles.noGoalsText}>
                    No goals found. Create a goal first!
                  </Text>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.createGoalButton}
                    onPress={() => {
                      setShowGoalModal(false);
                      navigation.navigate("Plan", { screen: "Goals" });
                    }}
                  >
                    <Text style={styles.createGoalButtonText}>Create Goal</Text>
                  </Press>
                </View>
              ) : (
                goals.map((goal) => (
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    key={goal.id || goal._id || Math.random().toString()}
                    style={[
                      styles.goalOption,
                      (selectedGoal?.id === goal.id || selectedGoal?._id === goal._id) &&
                      styles.selectedGoalOption,
                    ]}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setShowGoalModal(false);
                    }}
                  >
                    <Text style={styles.goalOptionText}>
                      {goal.description && goal.description.trim() !== ""
                        ? goal.description
                        : goal.name === "Custom Goal"
                          ? goal.customName
                          : goal.name}
                    </Text>
                    {goal.targetAmount && (
                      <Text style={styles.goalAmountText}>
                        Target: ₹{goal.targetAmount.toLocaleString("en-IN")}
                      </Text>
                    )}
                  </Press>
                ))
              )}
            </ScrollView>
          </PopupPanel>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>

      {/* Investment Confirmation Modal */}
      <PopupModal toastHost={false}
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <PopupBackdrop style={styles.confirmModalOverlay}>
          <PopupPanel placement="center" style={styles.confirmModalContainer}>
            {/* Header */}
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmHeaderIcon}>
                <Icon name="wallet" size={24} color={P.ink2} />
              </View>
              <Text style={styles.confirmModalTitle}>Confirm Investment</Text>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close"
                onPress={() => {
                  setShowConfirmModal(false);
                  setTempInvestmentData(null);
                }}
                style={styles.confirmCloseButton}
              >
                <Icon name="close" size={24} color={P.mute} />
              </Press>
            </View>

            {/* Investment Details */}
            <View style={styles.investmentDetailsSection}>
              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="business" size={18} color={P.pos} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Fund</Text>
                  <Text style={styles.detailValue}>{fund.schemeName}</Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Icon name="wallet" size={18} color={P.ink2} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValueAmount}>
                    ₹{tempInvestmentData?.amount?.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons
                    name={calculationType === "SIP" ? "repeat" : "trending-up"}
                    size={18}
                    color={P.inv}
                  />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Investment Type</Text>
                  <Text style={styles.detailValue}>
                    {calculationType === "SIP"
                      ? "Systematic Investment Plan"
                      : "Lumpsum Investment"}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="flag" size={18} color={P.neg} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Goal</Text>
                  <Text style={styles.detailValue}>
                    {selectedGoal?.customName ||
                      selectedGoal?.name ||
                      "F.I.R.E Number"}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Icon name="calendar" size={18} color={P.inv} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Investment Date</Text>
                  <Text style={styles.detailValue}>
                    {investmentDate.toLocaleDateString("en-IN")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notification Option */}
            {calculationType === "SIP" && (
              <Press scaleTo={0.96}
                style={[
                  styles.notificationSection,
                  !enableNotifications && styles.notificationSectionDisabled,
                ]}
                onPress={() => setEnableNotifications(!enableNotifications)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIconContainer}>
                  <Ionicons
                    name={
                      enableNotifications
                        ? "notifications"
                        : "notifications-off"
                    }
                    size={20}
                    color={enableNotifications ? P.ink : P.mute}
                  />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !enableNotifications && styles.notificationTitleDisabled,
                    ]}
                  >
                    SIP Reminder{" "}
                    {enableNotifications ? "(Enabled)" : "(Disabled)"}
                  </Text>
                  <Text
                    style={[
                      styles.notificationSubtitle,
                      !enableNotifications &&
                      styles.notificationSubtitleDisabled,
                    ]}
                  >
                    {enableNotifications
                      ? "We'll notify you for your next SIP investment"
                      : "Tap to enable SIP investment reminders"}
                  </Text>
                </View>
                <Ionicons
                  name={
                    enableNotifications
                      ? "checkmark-circle"
                      : "radio-button-off"
                  }
                  size={24}
                  color={enableNotifications ? P.pos : P.mute}
                />
              </Press>
            )}

            {/* Action Buttons */}
            <View style={styles.confirmModalActions}>
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.cancelButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  setTempInvestmentData(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Press>

              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.editButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  // Keep tempInvestmentData so user can re-open modal with same data
                }}
              >
                <Icon name="edit" size={18} color={P.ink2} />
                <Text style={styles.editButtonText}>Edit</Text>
              </Press>

              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.confirmButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  processInvestment();
                }}
              >
                <Icon name="check" size={20} color={P.accInk} />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Press>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              This investment will be added to your portfolio and linked to your
              selected goal.
            </Text>
          </PopupPanel>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>
    </SafeAreaView>
  );
};

// --- Styles (with additions for the date picker) ---
const styles = themedStyles(() => StyleSheet.create({
  fundTitle: { fontSize: 18, fontWeight: "600", lineHeight: 24, color: P.ink },
  metaNote: { fontSize: 12, color: P.mute },
  // ===== MODIFIED: Reduced Padding =====
  container: { flex: 1, backgroundColor: P.bg },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: P.surf,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16, borderWidth: 1, borderColor: P.line,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.bg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
  },
  headerSubtitle: {
    fontSize: 14,
    color: P.mute,
    marginTop: 2,
  },
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
  loadingContainer: { backgroundColor: P.surf2, padding: 12, borderRadius: 12, alignItems: "center" },
  loadingText: {
    fontSize: 14,
    color: P.ink,
    fontWeight: "500",
  },
  fundInfo: {
    backgroundColor: P.surf,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  fundName: {
    fontSize: 18,
    fontWeight: "bold",
    color: P.ink,
    marginBottom: 15,
    lineHeight: 24,
  },
  existingInvestmentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    padding: 10,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: P.ink,
  },
  existingInvestmentText: {
    fontSize: 13,
    color: P.ink,
    fontWeight: "600",
    marginLeft: 6,
  },
  fundDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navContainer: { flex: 1 },
  navLabel: { fontSize: 12, color: P.mute, marginBottom: 5 },
  navValue: { fontSize: 20, fontWeight: "bold", color: P.ink },
  navDateMeta: { fontSize: 12, color: P.mute, marginTop: 4 },
  codeContainer: { alignItems: "flex-end" },
  codeLabel: { fontSize: 12, color: P.mute, marginBottom: 5 },
  codeValue: { fontSize: 14, fontWeight: "600", color: P.ink },
  metaContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: P.line,
  },
  metaLine: {
    fontSize: 12,
    color: P.ink2,
    marginBottom: 4,
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: P.surf2,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.surf2,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTypeButton: { backgroundColor: P.ink },
  typeButtonText: { fontSize: 14, fontWeight: "600", color: P.mute },
  activeTypeButtonText: { color: P.onSolid },
  inputContainer: {
    backgroundColor: P.surf,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  inputGroup: { marginBottom: 16 }, // Reduced margin
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.ink2,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: P.ink,
  },
  editableInput: {
    borderColor: P.ink,
    backgroundColor: P.surf2,
    borderWidth: 2,
  },
  editableLabel: {
    fontSize: 12,
    color: P.ink,
    fontWeight: "500",
    fontStyle: "italic",
  },
  goalSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: P.bg,
  },
  goalSelectorText: {
    fontSize: 16,
    color: P.ink,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { backgroundColor: P.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "80%", padding: 16, borderWidth: 1, borderColor: P.line },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: P.ink,
  },
  closeButton: {
    padding: 4,
  },
  goalsList: {
    maxHeight: 400,
  },
  goalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  selectedGoalOption: {
    backgroundColor: P.surf2,
  },
  goalOptionText: {
    fontSize: 16,
    color: P.ink,
    fontWeight: "500",
  },
  goalAmountText: {
    fontSize: 14,
    color: P.mute,
    marginTop: 4,
  },
  noGoalsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noGoalsText: {
    fontSize: 16,
    color: P.mute,
    textAlign: "center",
    marginBottom: 20,
  },
  createGoalButton: {
    backgroundColor: P.acc,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createGoalButtonText: {
    color: P.accInk,
    fontSize: 16,
    fontWeight: "600",
  },
  // Confirmation Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContainer: { backgroundColor: P.bg, borderRadius: 18, padding: 16, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: P.line },
  confirmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  confirmHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
    flex: 1,
  },
  confirmCloseButton: {
    padding: 4,
  },
  investmentDetailsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  investmentDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.bg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: P.mute,
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: P.ink,
    fontWeight: "600",
  },
  detailValueAmount: {
    fontSize: 18,
    color: P.pos,
    fontWeight: "700",
  },
  notificationSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    color: P.ink,
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: P.mute,
  },
  notificationSectionDisabled: {
    backgroundColor: P.bg,
    borderWidth: 1,
    borderColor: P.line,
  },
  notificationTitleDisabled: {
    color: P.mute,
  },
  notificationSubtitleDisabled: {
    color: P.mute,
  },
  confirmModalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  cancelButton: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: P.line, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { color: P.ink, fontSize: 15, fontWeight: "600" },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.ink,
    backgroundColor: P.surf,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: P.ink,
    fontWeight: "600",
  },
  confirmButton: { flex: 1, height: 52, borderRadius: 14, backgroundColor: P.acc, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  confirmButtonText: { color: P.accInk, fontSize: 15, fontWeight: "600" },
  disclaimer: {
    fontSize: 11,
    color: P.mute,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 16,
  },
  // ===== MODIFIED: Action Buttons Layout =====
  actionButtonsContainer: { flexDirection: "row", gap: 10, marginTop: 14 },
  investmentStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.line,
    marginTop: 20, // Add margin here instead of the parent
    marginBottom: 10,
  },
  investmentStatusText: {
    fontSize: 13,
    color: P.mute,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  addToGoalButton: { backgroundColor: P.acc, height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1.5 },
  addToGoalButtonText: { color: P.accInk, fontSize: 15, fontWeight: "600" },
  disabledButton: { backgroundColor: P.surf2 },
  disabledButtonText: { color: P.mute },
  manageButton: { backgroundColor: P.surf2, borderWidth: 1, borderColor: P.line, height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 },
  manageButtonText: { fontSize: 15, fontWeight: "700", color: P.ink },
  deleteButton: { backgroundColor: P.negSoft, height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 },
  deleteButtonText: { color: P.neg, fontSize: 15, fontWeight: "600" },
  readOnlyInput: {
    backgroundColor: P.bg,
    color: P.mute,
    fontStyle: "italic",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: P.bg,
  },
  dateInputText: { fontSize: 16, color: P.ink, marginLeft: 10 },
  calculateButton: {
    backgroundColor: P.acc,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  calculateButtonText: { color: P.accInk, fontSize: 16, fontWeight: "600" },
  continueButton: {
    backgroundColor: P.acc,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  continueButtonText: { color: P.onSolid, fontSize: 16, fontWeight: "600" },
  nextMonthInstruction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  instructionText: {
    fontSize: 13,
    color: P.primary,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: P.negSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveText: {
    fontSize: 10,
    color: P.neg,
    fontWeight: "bold",
    marginLeft: 4,
  },
  nextSipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: P.ink,
  },
  nextSipText: {
    fontSize: 14,
    color: P.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultContainer: { backgroundColor: P.surf, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: P.line },
  resultTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultTitle: { fontSize: 16, fontWeight: "600", color: P.ink },
  existingResultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: P.line,
  },
  existingResultText: {
    fontSize: 11,
    color: P.primary,
    fontWeight: "600",
    marginLeft: 4,
  },

  // --- MODIFIED: Results UI ---
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultItem: { flexBasis: "45%", flexGrow: 1, backgroundColor: P.surf2, borderRadius: 10, padding: 10, gap: 4 },
  resultItemFull: {
    width: "100%",
  },
  resultItemTop: { flexDirection: "row", alignItems: "center" },
  resultLabel: { fontSize: 11, color: P.mute, letterSpacing: 0.66, textTransform: "uppercase" },
  resultValue: { fontSize: 15, fontWeight: "600", color: P.ink },
  highlightValue: { fontSize: 17, fontWeight: "700", color: P.ink },
  successValue: {
    color: P.pos,
    fontSize: 20,
    fontWeight: "bold",
  },
  errorValue: {
    color: P.neg,
    fontSize: 20,
    fontWeight: "bold",
  },
  // --- END MODIFIED ---

  // Rupee Cost Averaging Styles
  rupeeAveragingContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: P.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  conceptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  conceptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: P.ink,
    marginLeft: 8,
  },
  conceptDescription: {
    fontSize: 14,
    color: P.mute,
    lineHeight: 20,
    marginBottom: 12,
  },
  averagingBenefits: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 13,
    color: P.ink2,
    marginLeft: 8,
    fontWeight: "500",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: P.surf,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.line,
    marginBottom: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.primary,
    marginLeft: 6,
  },
  detailedBreakdown: {
    backgroundColor: P.surf,
    borderRadius: 12,
    padding: 12,
  },
  breakdownHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: P.ink,
    marginBottom: 12,
    textAlign: "center",
  },
  breakdownScroll: {
    marginBottom: 12,
  },
  breakdownTable: {
    minWidth: 260,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: P.line,
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: P.ink,
    textAlign: "center",
    fontWeight: "500",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: P.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  statusCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  breakdownSummary: {
    backgroundColor: P.surf2,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: P.ink,
  },
  summaryText: {
    fontSize: 12,
    color: P.ink,
    lineHeight: 16,
  },
  investButton: {
    backgroundColor: P.acc,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  investButtonText: { color: P.onSolid, fontSize: 16, fontWeight: "bold" },

  // New Breakdown Section Styles
  breakdownSection: { marginTop: 14, backgroundColor: P.surf, borderRadius: 14, borderWidth: 1, borderColor: P.line, overflow: "hidden" },
  toggleBreakdownButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14 },
  toggleBreakdownText: { fontSize: 14, fontWeight: "600", color: P.ink, flex: 1, marginLeft: 8 },
  // SIP History Section Styles
  historySection: { marginTop: 14, backgroundColor: P.surf, borderRadius: 14, borderWidth: 1, borderColor: P.line, overflow: "hidden" },
  toggleHistoryButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14 },
  toggleHistoryText: { fontSize: 14, fontWeight: "600", color: P.ink, flex: 1, marginLeft: 8 },
  historyContent: { padding: 14 },
  historyTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: P.ink,
    marginLeft: 8,
  },
  historyTable: {
    backgroundColor: P.surf,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.posSoft,
    overflow: "hidden",
    marginBottom: 16,
  },
  historySummary: {
    backgroundColor: P.surf2,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: P.ink,
  },
  historySummaryText: {
    fontSize: 12,
    color: P.ink,
    lineHeight: 16,
  },
  breakdownContent: {
    padding: 20,
  },
  breakdownTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: P.ink,
    marginLeft: 8,
  },
  exampleFundName: {
    fontSize: 14,
    color: P.primary,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  investmentDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  investmentDetailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: P.pos,
    marginLeft: 6,
  },
  monthlyTable: {
    backgroundColor: P.surf,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.line,
    overflow: "hidden",
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: P.ink2,
    textAlign: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  // --- NEW: Enhanced investment status styles ---
  remainingDaysContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    padding: 8,
    borderRadius: 6,
    marginTop: 12, // Added margin
  },
  remainingDaysText: {
    fontSize: 12,
    color: P.ink,
    marginLeft: 4,
  },
  notifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2, // Lighter background
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: P.line,
  },
  notifyButtonText: {
    color: P.primary, // Blue text
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notifiedText: {
    color: P.pos,
  },
}));

export default MFCalculator;
