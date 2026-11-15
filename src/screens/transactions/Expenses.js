import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../../config/FirebaseConfig";
import {
  getTransactions,
  addTransaction as fsAddTransaction,
  deleteTransaction as fsDeleteTransaction,
  updateTransaction as fsUpdateTransaction,
} from "../../services/firestoreService";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../../theme/theme";
import { ScreenHeader, IconButton, Chip, Press, ToastHost, QuickAmounts, Icon } from "../../components/pulse";
import CashflowInsights, { pinnedMonth } from "../../components/CashflowInsights";
import LedgerList from "../../components/LedgerList";
import { toast, friendlyError, withUndo } from "../../ux/toast";
import { getEntryMemory, rememberEntry, topEntries } from "../../ux/memory";
import { inr, localISODate, groupAmountInput, parseAmountInput } from "../../utils/format";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import haptics from "../../ux/haptics";

// Stack order keeps the colour-blind-safe pairs adjacent (green · blue · amber).
const EXPENSE_GROUPS = () => [
  { key: "Essential", label: "Essential", color: P.pos },
  { key: "Mandatory", label: "Mandatory", color: P.inv },
  { key: "Discretionary", label: "Discretionary", color: P.amber },
];


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_COMPACT_SCREEN = SCREEN_WIDTH < 360;

export default function ExpenseTracker({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Extract date from route params if provided (for auto-opening modal)
  const receivedDate = route.params?.date || null;
  // Extract edit item if provided from dateExpenses screen
  const editItem = route.params?.editItem || null;
  const fromDailyTransactions = route.params?.fromDailyTransactions || false;
  // Home's quick action opens the form straight away; closing it stays on this page
  const openAdd = route.params?.openAdd || false;
  // Only the Day view and edit flows return to where they came from
  const returnsOnClose = !!(receivedDate || editItem);

  const [transactions, setTransactions] = useState([]);
  const [localDescriptions, setLocalDescriptions] = useState({}); // Store descriptions locally
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Learned defaults and frequent items (see ux/memory)
  const [memory, setMemory] = useState(null);

  // Month/Year filter states (similar to FireNumber)
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");

  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    description: "",
    type: "Expense",
    subType: "Essential",
    method: "Cash",
    date: receivedDate || localISODate(),
    isRecurring: false,
    recurringMonths: "1",
    recurringType: "Monthly",
  });
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    receivedDate ? new Date(receivedDate) : new Date()
  );

  // For the dropdown states
  const [isExpenseDropdownOpen, setIsExpenseDropdownOpen] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  // Add edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState(null);

  // Animation for loading icon
  const spinValue = useState(new Animated.Value(0))[0];

  // Month/Year filter options similar to FireNumber
  const availableFilters = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { years: [], months: [] };
    }

    const years = [
      ...new Set(
        transactions.map((transaction) => {
          const date = new Date(transaction.date);
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
  }, [transactions]);

  // Hide React Navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [loading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Fill the form from an existing entry and switch to edit mode
  const startEdit = useCallback((item, { repeat = false } = {}) => {
    const allOptions = [
      ...(expenseTypeOptions.Mandatory || []),
      ...(expenseTypeOptions.Discretionary || []),
      ...(expenseTypeOptions.Essential || []),
    ];
    const custom = !!item.name && !allOptions.includes(item.name);
    // "Log again" reuses a past entry as a new one dated today
    setIsEditMode(!repeat);
    // Firestore rows carry `id`; older callers passed `_id`
    setEditTransactionId(repeat ? null : item.id || item._id);
    setNewTransaction({
      name: custom ? "Others" : item.name || "",
      amount: item.amount?.toString() || "",
      description: item.description || "",
      type: "Expense",
      subType: item.subType || "Essential",
      method: item.method || "Cash",
      date: repeat ? localISODate() : item.date || localISODate(),
      isRecurring: false,
      recurringMonths: "1",
      recurringType: "Monthly",
    });
    setIsCustomExpense(custom);
    setCustomExpenseName(custom ? item.name : "");
    if (repeat) setSelectedDate(new Date());
    else if (item.date) setSelectedDate(new Date(item.date));
    setModalVisible(true);
  }, []);

  // Open the form straight away when arriving from Home, the Day view or an edit
  useEffect(() => {
    if (!returnsOnClose && !openAdd) return undefined;
    const timer = setTimeout(() => (editItem ? startEdit(editItem) : setModalVisible(true)), 250);
    return () => clearTimeout(timer);
  }, [receivedDate, editItem, openAdd]);

  // Start new entries from the category and payment method used last time
  useEffect(() => {
    getEntryMemory("expense").then((mem) => {
      setMemory(mem);
      if (mem.last && !editItem) {
        setNewTransaction((prev) => ({
          ...prev,
          subType: mem.last.subType || prev.subType,
          method: mem.last.method || prev.method,
        }));
      }
    });
  }, []);

  const expenseTypeOptions = {
    Mandatory: [
      "EMI - Education",
      "EMI - Personal",
      "EMI - Property",
      "EMI - Vehicle",
      "Fees & Charges - Consultation",
      "Insurance - Fire",
      "Insurance - Health",
      "Insurance - Life (Term / Pension / Moneyback)",
      "Insurance - Property",
      "Insurance - Travel",
      "Insurance - Vehicle",
      "Loan Repayment",
      "PPF/VPF - Retirement fund",
      "Tax - Income",
      "Tax - utilities",
    ],
    Discretionary: [
      "Charitable donations",
      "Fun / Entertainment",
      "Food Dining",
      "Gifts",
      "Home Décor",
      "Luxury clothing / Jewelery",
      "Sports items",
      "Subscriptions / dues",
      "Tours & travel",
      "Vehicle Purchase",
    ],
    Essential: [
      "Child care",
      "Clothing",
      "Education",
      "Emergency Fund",
      "Fuel - Cooking",
      "Fuel - Vehicles",
      "Groceries",
      "Home care",
      "Medical Care",
      "Miscellaneous",
      "Personal grooming",
      "Pet care",
      "Rents / Mortgage",
      "Transportation",
      "Utilities - Electricity",
      "Utilities - Gas",
      "Utilities - Phone(s)",
      "Utilities - TV / Internet",
      "Utilities - Water",
      "Utilities Maintenance cost",
      "Vehicle Maintenance cost",
    ],
  };

  const formatDate = useCallback((date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    // Store as YYYY-MM-DD for API consistency
    return `${year}-${month}-${day}`;
  }, []);

  const formatDisplayDate = useCallback((dateString) => {
    if (!dateString) return "Select a date";

    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString("en-IN", options);
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  }, []);

  // Date change handler
  const onDateChange = useCallback(
    (event, selected) => {
      setShowDatePicker(Platform.OS === "ios");
      if (selected) {
        setSelectedDate(selected);
        setNewTransaction((prev) => ({
          ...prev,
          date: formatDate(selected),
        }));
      }
    },
    [formatDate]
  );

  // Fetch Transactions from Firestore
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("User not logged in. Please log in again.");
        setLoading(false);
        return;
      }
      const allTx = await getTransactions(uid);
      const expenseTransactions = allTx.filter(
        (t) => t && t.type === "Expense"
      );
      setTransactions(expenseTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Add or Update Transaction (Firestore)
  const addTransaction = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error("Please sign in again to continue.", { title: "Session expired" });
      return;
    }

    const expenseName = (isCustomExpense ? customExpenseName : newTransaction.name).trim();
    const amount = parseFloat(newTransaction.amount);
    if (!expenseName || (isCustomExpense && !customExpenseName.trim())) {
      toast.warning(isCustomExpense ? "Give your expense a name." : "Pick what you spent on.", { title: "Expense item" });
      return;
    }
    if (!(amount > 0)) {
      toast.warning("Enter an amount above ₹0.", { title: "Amount" });
      return;
    }
    if (!newTransaction.date) {
      toast.warning("Pick the date of this expense.", { title: "Date" });
      return;
    }

    const transactionData = {
      name: expenseName,
      amount,
      description: newTransaction.description || "",
      type: "Expense",
      subType: newTransaction.subType,
      method: newTransaction.method || "Cash",
      date: newTransaction.date,
    };

    setSaving(true);
    try {
      if (isEditMode && editTransactionId) {
        // Update in place: no window where the entry is gone, and no coins re-paid.
        await fsUpdateTransaction(uid, editTransactionId, transactionData);
        setTransactions((prev) => prev.map((t) => (t.id === editTransactionId ? { ...t, ...transactionData } : t)));
        toast.success(`${expenseName} · ${inr(amount)}`, { title: "Expense updated" });
      } else if (newTransaction.isRecurring && parseInt(newTransaction.recurringMonths) > 1) {
        const count = parseInt(newTransaction.recurringMonths);
        const yearly = newTransaction.recurringType === "Yearly";
        const [y, m, d] = newTransaction.date.split("-").map(Number);
        const newTxList = [];
        for (let i = 0; i < count; i++) {
          // Clamp to month end so a bill on the 31st lands on 28/29/30 in short months
          const yy = yearly ? y + i : y;
          const mm = yearly ? m - 1 : m - 1 + i;
          const last = new Date(yy, mm + 1, 0).getDate();
          const recurringData = { ...transactionData, date: localISODate(new Date(yy, mm, Math.min(d, last))) };
          // Only the first occurrence earns coins, as before.
          const newId = await fsAddTransaction(uid, i === 0 ? recurringData : { ...recurringData, noReward: true });
          newTxList.push({ id: newId, ...recurringData });
        }
        setTransactions((prev) => [...prev, ...newTxList]);
        toast.success(`${expenseName} · ${inr(amount)} × ${count} ${yearly ? "years" : "months"} · +10 coins`, {
          title: "Recurring expense saved",
        });
      } else {
        const newId = await fsAddTransaction(uid, transactionData);
        setTransactions((prev) => [...prev, { id: newId, ...transactionData }]);
        toast.success(`${expenseName} · ${inr(amount)} · +10 coins`, { title: "Expense saved" });
      }

      rememberEntry("expense", transactionData).then(() => getEntryMemory("expense").then(setMemory));
      handleCancel();
      if (returnsOnClose) navigation.goBack();
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(friendlyError(error, `Couldn't ${isEditMode ? "update" : "save"} this expense. Please try again.`));
    } finally {
      setSaving(false);
    }
  }, [customExpenseName, isCustomExpense, newTransaction, isEditMode, editTransactionId, returnsOnClose]);

  // Delete with a few seconds to undo; the server delete runs when the toast closes
  const deleteTransaction = useCallback((item) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !item) return;
    let before = null;
    withUndo({
      message: `${item.name} · ${inr(item.amount)} deleted`,
      apply: () =>
        setTransactions((prev) => {
          before = prev;
          return prev.filter((t) => t.id !== item.id);
        }),
      revert: () => before && setTransactions(before),
      commit: () => fsDeleteTransaction(uid, item.id),
      failMessage: "Couldn't delete that expense. It has been restored.",
    });
  }, []);

  // Cancel and reset form (new entries start from the last-used category / method)
  const handleCancel = useCallback(() => {
    setNewTransaction({
      name: "",
      amount: "",
      description: "",
      type: "Expense",
      subType: memory?.last?.subType || "Essential",
      method: memory?.last?.method || "Cash",
      date: localISODate(),
      isRecurring: false,
      recurringMonths: "1",
      recurringType: "Monthly",
    });
    setSelectedDate(new Date());
    setCustomExpenseName("");
    setIsCustomExpense(false);
    setIsExpenseDropdownOpen(false);
    setIsMethodDropdownOpen(false);
    setModalVisible(false);

    // Reset edit mode
    setIsEditMode(false);
    setEditTransactionId(null);
  }, [memory]);

  // Closing a form that opened itself returns to where the user came from
  const handleClose = useCallback(() => {
    handleCancel();
    if (returnsOnClose) navigation.goBack();
  }, [handleCancel, returnsOnClose, navigation]);

  // Filter transactions function
  const getFilteredTransactions = useCallback(() => {
    let filtered = transactions || [];

    // Filter by type
    if (filter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction && transaction.subType === filter
      );
    }

    // Filter by month/year (similar to FireNumber)
    if (filterYear !== "All") {
      const yearNum = parseInt(filterYear);
      filtered = filtered.filter(
        (transaction) =>
          transaction &&
          transaction.date &&
          new Date(transaction.date).getFullYear() === yearNum
      );
    }
    if (filterMonth !== "All") {
      const monthNum = parseInt(filterMonth);
      filtered = filtered.filter(
        (transaction) =>
          transaction &&
          transaction.date &&
          new Date(transaction.date).getMonth() === monthNum
      );
    }

    return filtered;
  }, [transactions, filter, filterMonth, filterYear]);

  const filteredTransactions = getFilteredTransactions();

  // Filter control functions
  const resetFilters = () => {
    setFilterMonth("All");
    setFilterYear("All");
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Calculate statistics
  const totalExpense = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  const mandatoryExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.subType === "Mandatory")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  const discretionaryExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.subType === "Discretionary")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  const essentialExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.subType === "Essential")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />

      {/* Header */}
      <ScreenHeader overline="Ledger" title="Expenses" right={<IconButton accessibilityLabel="Filters" onPress={toggleFilters}><Ionicons name="filter-outline" size={20} color={P.ink} /></IconButton>} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Spending analysis */}
        <CashflowInsights
          kind="expense"
          transactions={transactions}
          groups={EXPENSE_GROUPS()}
          pinned={pinnedMonth(filterMonth, filterYear)}
        />

        <LedgerList
          kind="exp"
          items={filteredTransactions}
          total={transactions.length}
          types={[
            { value: "all", label: "All" },
            { value: "Essential", label: "Essential" },
            { value: "Mandatory", label: "Mandatory" },
            { value: "Discretionary", label: "Discretionary" },
          ]}
          type={filter}
          onType={setFilter}
          showPeriod={showFilters}
          month={filterMonth}
          year={filterYear}
          years={availableFilters.years}
          onMonth={setFilterMonth}
          onYear={setFilterYear}
          onResetPeriod={resetFilters}
          onDelete={deleteTransaction}
          onEdit={startEdit}
          onRepeat={(item) => startEdit(item, { repeat: true })}
          formatDate={formatDisplayDate}
          loading={loading && transactions.length === 0}
        />
      </ScrollView>

      {/* Add Transaction Button */}
      <Press
        scaleTo={0.9}
        haptic="tap"
        style={[
          styles.addButton,
          { bottom: (Platform.OS === "ios" ? 96 : 88) + insets.bottom },
        ]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Icon name="plus" size={28} color={P.accInk} />
      </Press>

      {/* Expense Modal */}
      <ExpenseFormModal
        visible={modalVisible}
        onCancel={handleClose}
        onAdd={addTransaction}
        loading={saving}
        shortcuts={isEditMode ? [] : topEntries(memory)}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        isCustomExpense={isCustomExpense}
        setIsCustomExpense={setIsCustomExpense}
        customExpenseName={customExpenseName}
        setCustomExpenseName={setCustomExpenseName}
        expenseTypeOptions={expenseTypeOptions}
        isExpenseDropdownOpen={isExpenseDropdownOpen}
        setIsExpenseDropdownOpen={setIsExpenseDropdownOpen}
        isMethodDropdownOpen={isMethodDropdownOpen}
        setIsMethodDropdownOpen={setIsMethodDropdownOpen}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onDateChange={onDateChange}
        formatDisplayDate={formatDisplayDate}
        isEditMode={isEditMode}
      />
    </SafeAreaView>
  );
}

// Separated the modal component for better performance
const ExpenseFormModal = ({
  visible,
  onCancel,
  onAdd,
  loading,
  newTransaction,
  setNewTransaction,
  isCustomExpense,
  setIsCustomExpense,
  customExpenseName,
  setCustomExpenseName,
  expenseTypeOptions,
  isExpenseDropdownOpen,
  setIsExpenseDropdownOpen,
  isMethodDropdownOpen,
  setIsMethodDropdownOpen,
  showDatePicker,
  setShowDatePicker,
  selectedDate,
  onDateChange,
  formatDisplayDate,
  isEditMode,
  shortcuts = [],
}) => {
  // Item selection handlers
  const handleExpenseTypeSelect = (type) => {
    if (type !== newTransaction.subType) haptics.select();
    setNewTransaction({ ...newTransaction, subType: type, name: "" });
    setIsCustomExpense(false);
  };

  const handleExpenseItemSelect = (value) => {
    haptics.select();
    setNewTransaction({ ...newTransaction, name: value });
    setIsCustomExpense(value === "Others");
    setIsExpenseDropdownOpen(false);
  };

  const handleMethodSelect = (value) => {
    haptics.select();
    setNewTransaction({ ...newTransaction, method: value });
    setIsMethodDropdownOpen(false);
  };

  // One tap fills category + item from something logged often before
  const currentName = isCustomExpense ? customExpenseName : newTransaction.name;
  const pickShortcut = (sc) => {
    const known = (expenseTypeOptions[sc.subType] || []).includes(sc.name);
    setNewTransaction({ ...newTransaction, subType: sc.subType || newTransaction.subType, name: known ? sc.name : "Others" });
    setIsCustomExpense(!known);
    setCustomExpenseName(known ? "" : sc.name);
    setIsExpenseDropdownOpen(false);
  };

  // Expense option items
  const expenseItems = [
    { label: "Select an item", value: "" },
    ...(expenseTypeOptions[newTransaction.subType] || []).map((item) => ({
      label: item,
      value: item,
    })),
    { label: "Others", value: "Others" },
  ];

  // Payment method options
  const paymentMethods = [
    { label: "Cash", value: "Cash" },
    { label: "Bank Transfer", value: "Bank Transfer" },
    { label: "Credit Card", value: "Credit Card" },
    { label: "UPI", value: "UPI" },
    { label: "Other", value: "Other" },
  ];

  return (
    <PopupModal toastHost={false}
      visible={visible}
      transparent={true}
      animationType={Platform.OS === "ios" ? "slide" : "fade"}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setIsExpenseDropdownOpen(false);
            setIsMethodDropdownOpen(false);
            Keyboard.dismiss();
          }}
        >
          <PopupBackdrop style={styles.modalContainer}>
            <PopupPanel style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditMode ? "Edit Expense" : "Add Expense"}
                </Text>
                <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={onCancel} style={styles.modalCloseButton}>
                  <Icon name="close" size={24} color={P.mute} />
                </Press>
              </View>

              {/* Scrollable Form Content */}
              <ScrollView
                style={styles.formScrollView}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
              >
                {shortcuts.length ? (
                  <>
                    <Text style={[styles.label, { marginTop: 0 }]}>Frequent</Text>
                    <View style={styles.shortcutRow}>
                      {shortcuts.map((sc) => (
                        <Chip
                          key={`${sc.subType}|${sc.name}`}
                          label={sc.name}
                          selected={currentName === sc.name}
                          onPress={() => pickShortcut(sc)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {/* Expense Type Selection */}
                <Text style={styles.label}>Expense Type</Text>
                <View style={styles.expenseTypeGrid}>
                  {["Mandatory", "Discretionary", "Essential"].map((type) => (
                    <Press scaleTo={0.96} activeOpacity={0.7}
                      key={type}
                      style={[
                        styles.expenseTypeButton,
                        newTransaction.subType === type &&
                        styles.activeExpenseTypeButton,
                      ]}
                      onPress={() => handleExpenseTypeSelect(type)}
                    >
                      <Text
                        style={[
                          styles.expenseTypeButtonText,
                          newTransaction.subType === type &&
                          styles.activeExpenseTypeButtonText,
                        ]}
                      >
                        {type}
                      </Text>
                    </Press>
                  ))}
                </View>

                {/* Expense Item Dropdown */}
                <Text style={styles.label}>Expense Item</Text>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[
                    styles.pickerButton,
                    isExpenseDropdownOpen && styles.pickerButtonActive,
                  ]}
                  onPress={() => {
                    setIsExpenseDropdownOpen(!isExpenseDropdownOpen);
                    setIsMethodDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      newTransaction.name
                        ? styles.pickerButtonTextSelected
                        : styles.pickerButtonTextPlaceholder,
                    ]}
                  >
                    {newTransaction.name || "Select an expense item"}
                  </Text>
                  <Ionicons
                    name={isExpenseDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={P.mute}
                  />
                </Press>

                {isExpenseDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownMenu}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    >
                      {expenseItems.map((item) => (
                        <Press scaleTo={0.96}
                          key={item.value}
                          style={[
                            styles.dropdownItem,
                            newTransaction.name === item.value &&
                            styles.selectedDropdownItem,
                          ]}
                          onPress={() => handleExpenseItemSelect(item.value)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              newTransaction.name === item.value &&
                              styles.selectedDropdownItemText,
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.label}
                          </Text>
                          {newTransaction.name === item.value && (
                            <Icon
                              name="check"
                              size={16}
                              color={P.neg}
                            />
                          )}
                        </Press>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Custom Expense Input */}
                {isCustomExpense && (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter custom expense name"
                    placeholderTextColor={P.mute}
                    value={customExpenseName}
                    onChangeText={setCustomExpenseName}
                  />
                )}

                {/* Amount */}
                <Text style={styles.label}>Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={P.mute}
                    value={groupAmountInput(newTransaction.amount)}
                    onChangeText={(text) => {
                      // Shown grouped (12,450), stored plain (12450)
                      const v = parseAmountInput(text);
                      if (v !== null) setNewTransaction((prev) => ({ ...prev, amount: v }));
                    }}
                  />
                </View>
                <QuickAmounts
                  value={newTransaction.amount}
                  onChange={(v) => setNewTransaction((prev) => ({ ...prev, amount: v }))}
                />

                {/* Description */}
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add a description for this expense..."
                  placeholderTextColor={P.mute}
                  value={newTransaction.description}
                  onChangeText={(text) =>
                    setNewTransaction({ ...newTransaction, description: text })
                  }
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* Expense Frequency */}
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.typeButtonContainer}>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={[styles.typeButton, !newTransaction.isRecurring && styles.activeTypeButton]}
                    onPress={() => setNewTransaction({ ...newTransaction, isRecurring: false, recurringMonths: "1", recurringType: "Monthly" })}
                  >
                    <Icon name="calendar" size={18} color={!newTransaction.isRecurring ? P.bg : P.mute} />
                    <Text style={[styles.typeButtonText, !newTransaction.isRecurring && styles.activeTypeButtonText]}>One Time</Text>
                  </Press>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={[styles.typeButton, newTransaction.isRecurring && styles.activeTypeButton]}
                    onPress={() => setNewTransaction({ ...newTransaction, isRecurring: true })}
                  >
                    <Icon name="repeat" size={18} color={newTransaction.isRecurring ? P.bg : P.mute} />
                    <Text style={[styles.typeButtonText, newTransaction.isRecurring && styles.activeTypeButtonText]}>Recurring</Text>
                  </Press>
                </View>

                {newTransaction.isRecurring && (
                  <>
                    <Text style={styles.label}>Recurring Type</Text>
                    <View style={styles.typeButtonContainer}>
                      <Press scaleTo={0.96} activeOpacity={0.7}
                        style={[styles.typeButton, (!newTransaction.recurringType || newTransaction.recurringType === "Monthly") && styles.activeTypeButton]}
                        onPress={() => setNewTransaction({ ...newTransaction, recurringType: "Monthly" })}
                      >
                        <Text style={[styles.typeButtonText, (!newTransaction.recurringType || newTransaction.recurringType === "Monthly") && styles.activeTypeButtonText]}>Monthly</Text>
                      </Press>
                      <Press scaleTo={0.96} activeOpacity={0.7}
                        style={[styles.typeButton, newTransaction.recurringType === "Yearly" && styles.activeTypeButton]}
                        onPress={() => setNewTransaction({ ...newTransaction, recurringType: "Yearly" })}
                      >
                        <Text style={[styles.typeButtonText, newTransaction.recurringType === "Yearly" && styles.activeTypeButtonText]}>Yearly</Text>
                      </Press>
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>
                      Duration ({newTransaction.recurringType === "Yearly" ? "Years" : "Months"})
                    </Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g., 6"
                      placeholderTextColor={P.mute}
                      value={newTransaction.recurringMonths}
                      onChangeText={(text) => {
                        if (/^\d*$/.test(text)) {
                          setNewTransaction({ ...newTransaction, recurringMonths: text });
                        }
                      }}
                    />
                  </>
                )}

                {/* Date Picker */}
                <Text style={styles.label}>{newTransaction.isRecurring ? "Start Date" : "Date"}</Text>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color={P.mute} />
                  <Text style={styles.dateButtonText}>
                    {newTransaction.date
                      ? formatDisplayDate(newTransaction.date)
                      : "Select a date"}
                  </Text>
                </Press>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                )}

                {/* Payment Method */}
                <Text style={styles.label}>Payment Method</Text>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[
                    styles.pickerButton,
                    isMethodDropdownOpen && styles.pickerButtonActive,
                  ]}
                  onPress={() => {
                    setIsMethodDropdownOpen(!isMethodDropdownOpen);
                    setIsExpenseDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {newTransaction.method || "Select payment method"}
                  </Text>
                  <Ionicons
                    name={isMethodDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={P.mute}
                  />
                </Press>

                {isMethodDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownMenu}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    >
                      {paymentMethods.map((item) => (
                        <Press scaleTo={0.96}
                          key={item.value}
                          style={[
                            styles.dropdownItem,
                            newTransaction.method === item.value &&
                            styles.selectedDropdownItem,
                          ]}
                          onPress={() => handleMethodSelect(item.value)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              newTransaction.method === item.value &&
                              styles.selectedDropdownItemText,
                            ]}
                          >
                            {item.label}
                          </Text>
                          {newTransaction.method === item.value && (
                            <Icon
                              name="check"
                              size={16}
                              color={P.neg}
                            />
                          )}
                        </Press>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Spacer */}
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Press>

                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={onAdd}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={P.onSolid} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? "Update" : "Add Expense"}
                    </Text>
                  )}
                </Press>
              </View>
            </PopupPanel>
          </PopupBackdrop>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <ToastHost inModal />
    </PopupModal>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
  },
  shortcutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.surf,
    paddingHorizontal: IS_COMPACT_SCREEN ? 14 : 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: IS_COMPACT_SCREEN ? 10 : 16,
  },
  headerTitle: {
    fontSize: IS_COMPACT_SCREEN ? 18 : 20,
    fontWeight: "700",
    color: P.ink,
  },
  filterToggleButton: {
    padding: IS_COMPACT_SCREEN ? 6 : 8,
    backgroundColor: P.negSoft,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: IS_COMPACT_SCREEN ? 14 : 20,
    paddingBottom: 100,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: IS_COMPACT_SCREEN ? 12 : 16,
    marginHorizontal: IS_COMPACT_SCREEN ? 2 : 4,
    alignItems: "center",
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.negSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: P.mute,
    textAlign: "center",
  },

  // Filter Section
  filterSection: {
    marginBottom: 24,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: IS_COMPACT_SCREEN ? 16 : 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 12,
  },
  expenseFilterTabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 4,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  expenseFilterTab: {
    width: "48.5%",
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  activeExpenseFilterTab: {
    backgroundColor: P.ink,
  },
  expenseFilterTabText: {
    fontSize: IS_COMPACT_SCREEN ? 11 : 12,
    fontWeight: "600",
    color: P.mute,
    textAlign: "center",
  },
  activeExpenseFilterTabText: {
    color: P.bg,
  },

  // Month/Year Filter
  filtersContainer: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
    marginHorizontal: IS_COMPACT_SCREEN ? 2 : 4,
  },
  filterLabel: {
    fontSize: IS_COMPACT_SCREEN ? 12 : 13,
    fontWeight: "600",
    color: P.mute,
    marginBottom: 8,
  },
  filterPicker: {
    backgroundColor: P.bg,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 12,
    overflow: "hidden",
    height: Platform.OS === "ios" ? 150 : 50,
  },
  picker: {
    backgroundColor: "transparent",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surf2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  resetButtonText: {
    color: P.mute,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  filterSummary: {
    alignItems: "center",
  },
  filterSummaryText: {
    fontSize: 13,
    color: P.mute,
    fontStyle: "italic",
  },

  // Transactions Section
  transactionsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transactionCount: {
    fontSize: 14,
    color: P.mute,
    fontWeight: "500",
  },

  // Loading & Empty States
  loadingContainer: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: IS_COMPACT_SCREEN ? 32 : 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: P.mute,
  },
  emptyContainer: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: IS_COMPACT_SCREEN ? 32 : 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconContainer: {
    width: IS_COMPACT_SCREEN ? 64 : 80,
    height: IS_COMPACT_SCREEN ? 64 : 80,
    borderRadius: IS_COMPACT_SCREEN ? 32 : 40,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: IS_COMPACT_SCREEN ? 16 : 18,
    fontWeight: "600",
    color: P.mute,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: P.mute,
    textAlign: "center",
  },

  // Transaction Cards
  transactionsList: {
    backgroundColor: P.surf,
    borderRadius: 16,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: IS_COMPACT_SCREEN ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  firstCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lastCard: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.negSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  mandatoryIconContainer: {
    backgroundColor: P.surf2,
  },
  discretionaryIconContainer: {
    backgroundColor: P.amberSoft,
  },
  essentialIconContainer: {
    backgroundColor: P.posSoft,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionName: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    fontWeight: "600",
    color: P.ink,
    marginBottom: 4,
    flexShrink: 1,
  },
  transactionDescription: {
    fontSize: IS_COMPACT_SCREEN ? 12 : 13,
    color: P.mute,
    marginBottom: 4,
    fontStyle: "italic",
    flexShrink: 1,
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  transactionDate: {
    fontSize: IS_COMPACT_SCREEN ? 11 : 12,
    color: P.mute,
    marginLeft: 4,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.line,
    marginHorizontal: 6,
  },
  transactionType: {
    fontSize: IS_COMPACT_SCREEN ? 11 : 12,
    color: P.mute,
  },
  transactionMethod: {
    fontSize: IS_COMPACT_SCREEN ? 11 : 12,
    color: P.mute,
  },
  transactionRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  transactionAmount: {
    fontSize: IS_COMPACT_SCREEN ? 16 : 18,
    fontWeight: "700",
    color: P.neg,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: P.negSoft,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // FAB Button
  addButton: {
    position: "absolute",
    right: IS_COMPACT_SCREEN ? 14 : 20,
    backgroundColor: P.acc,
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: P.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: P.surf,
    borderTopLeftRadius: IS_COMPACT_SCREEN ? 22 : 30,
    borderTopRightRadius: IS_COMPACT_SCREEN ? 22 : 30,
    paddingHorizontal: IS_COMPACT_SCREEN ? 16 : 24,
    paddingTop: IS_COMPACT_SCREEN ? 16 : 20,
    paddingBottom: IS_COMPACT_SCREEN ? 24 : 40,
    maxHeight: "90%",
  },
  formScrollView: {
    flex: 0,
  },
  formScrollContent: {
    paddingBottom: 10,
  },
  dropdownContainer: {
    marginBottom: 16,
    position: "relative",
    zIndex: 1000,
  },
  dropdownMenu: {
    maxHeight: 220,
    backgroundColor: P.surf,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 12,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  modalTitle: {
    fontSize: IS_COMPACT_SCREEN ? 20 : 22,
    fontWeight: "700",
    color: P.ink,
  },
  modalCloseButton: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: P.ink2,
    marginBottom: 8,
    marginTop: 16,
  },

  // Type Buttons
  expenseTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  expenseTypeButton: {
    width: IS_COMPACT_SCREEN ? "100%" : "48.5%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: P.surf2,
  },
  activeExpenseTypeButton: {
    backgroundColor: P.ink,
  },
  expenseTypeButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 12 : 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  activeExpenseTypeButtonText: {
    color: P.bg,
  },
  typeButtonContainer: {
    flexDirection: "row",
    marginBottom: SPACING[8],
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING[14],
    borderRadius: 9,
    marginHorizontal: 4,
    backgroundColor: COLORS.surfaceMuted,
  },
  activeTypeButton: {
    backgroundColor: P.ink,
  },
  typeButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 12 : 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  activeTypeButtonText: {
    color: P.bg,
  },

  // Custom Dropdown
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[14],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  pickerButtonActive: {
    borderColor: P.ink,
    backgroundColor: P.surf2,
  },
  pickerButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: COLORS.textPrimary,
    flex: 1,
  },
  pickerButtonTextPlaceholder: {
    color: COLORS.textMuted,
  },
  pickerButtonTextSelected: {
    color: COLORS.textPrimary,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING[12],
    paddingHorizontal: SPACING[16],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    minHeight: 44,
  },
  selectedDropdownItem: {
    backgroundColor: COLORS.expenseSoft,
  },
  dropdownItemText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectedDropdownItemText: {
    color: COLORS.expense,
    fontWeight: "700",
  },

  // Input Fields
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[14],
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginBottom: SPACING[12],
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[12],
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginBottom: SPACING[12],
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[16],
    marginBottom: SPACING[12],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.expense,
    marginRight: SPACING[8],
  },
  amountInput: {
    flex: 1,
    paddingVertical: SPACING[14],
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[14],
    marginBottom: SPACING[12],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginLeft: SPACING[12],
    color: COLORS.textPrimary,
    flex: 1,
  },
  datePicker: {
    marginBottom: SPACING[12],
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
  },

  // Action Buttons
  buttonContainer: {
    flexDirection: "row",
    paddingTop: SPACING[16],
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SPACING[8],
    gap: SPACING[12],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING[16],
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
  },
  cancelButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: P.acc,
    paddingVertical: SPACING[16],
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.md,
  },
  saveButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    fontWeight: "600",
    color: P.accInk,
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
  },
}));
