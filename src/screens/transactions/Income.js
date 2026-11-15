import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { Picker } from "@react-native-picker/picker";
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
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { EventRegister } from "react-native-event-listeners";
import { auth } from "../../config/FirebaseConfig";
import {
  getTransactions,
  addTransaction as fsAddTransaction,
  deleteTransaction as fsDeleteTransaction,
  updateTransaction as fsUpdateTransaction,
  updateInvestment,
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

const INCOME_GROUPS = () => [
  { key: "Active", label: "Active", color: P.pos },
  { key: "Passive", label: "Passive", color: P.inv },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_COMPACT_SCREEN = SCREEN_WIDTH < 360;

export default function ExpenseTracker({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Extract date parameter if provided from dateExpenses screen
  const receivedDate = route.params?.date || null;
  // Extract edit item if provided from dateExpenses screen
  const editItem = route.params?.editItem || null;
  const fromDailyTransactions = route.params?.fromDailyTransactions || false;
  // Home's quick action opens the form straight away; closing it stays on this page
  const openAdd = route.params?.openAdd || false;
  // Only the Day view and edit flows return to where they came from
  const returnsOnClose = !!(receivedDate || editItem);

  const [transactions, setTransactions] = useState([]);
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
    type: "Income",
    subType: "Active",
    method: "Cash",
    date: receivedDate || localISODate(),
  });
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    receivedDate ? new Date(receivedDate) : new Date()
  );

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
  const startEdit = (item, { repeat = false } = {}) => {
    const allOptions = [...(expenseTypeOptions.Active || []), ...(expenseTypeOptions.Passive || [])];
    const custom = !!item.name && !allOptions.includes(item.name);
    // "Log again" reuses a past entry as a new one dated today
    setIsEditMode(!repeat);
    // Firestore rows carry `id`; older callers passed `_id`
    setEditTransactionId(repeat ? null : item.id || item._id);
    setNewTransaction({
      name: custom ? "Others" : item.name || "",
      amount: item.amount?.toString() || "",
      description: item.description || "",
      type: "Income",
      subType: item.subType || "Active",
      method: item.method || "Cash",
      date: repeat ? localISODate() : item.date || localISODate(),
    });
    setIsCustomExpense(custom);
    setCustomExpenseName(custom ? item.name : "");
    if (repeat) setSelectedDate(new Date());
    else if (item.date) setSelectedDate(new Date(item.date));
    setModalVisible(true);
  };

  // Open the form straight away when arriving from Home, the Day view or an edit
  useEffect(() => {
    if (!returnsOnClose && !openAdd) return undefined;
    const timer = setTimeout(() => (editItem ? startEdit(editItem) : setModalVisible(true)), 250);
    return () => clearTimeout(timer);
  }, [receivedDate, editItem, openAdd]);

  // Start new entries from the type and payment method used last time
  useEffect(() => {
    getEntryMemory("income").then((mem) => {
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
    Active: [
      "Bonuses",
      "Freelancing",
      "Loans",
      "Refunds/Reimbursements",
      "Salary",
    ],
    Passive: [
      "Capital gains",
      "Dividends",
      "Financial Aid",
      "Income - Business",
      "Income - Chit",
      "Income - Interest",
    ],
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    // Store as YYYY-MM-DD for API consistency
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Select a date";

    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString("en-IN", options);
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  const onDateChange = (event, selected) => {
    // Always close the picker on Android after selection
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    } else {
      // For iOS, only close if dismissed
      if (event.type === "dismissed") {
        setShowDatePicker(false);
        return;
      }
    }

    if (selected) {
      setSelectedDate(selected);
      setNewTransaction({
        ...newTransaction,
        date: formatDate(selected),
      });
    }
  };

  // 📚 Fetch Transactions (Firestore)
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const allTransactions = await getTransactions(uid);
      const incomeTransactions = allTransactions.filter(
        (t) => t && t.type === "Income"
      );
      setTransactions(incomeTransactions);
    } catch (error) {
      console.error("fetchTransactions error:", error);
      toast.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  // ➕ Add or Update Transaction (Firestore)
  const addTransaction = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error("Please sign in again to continue.", { title: "Session expired" });
      return;
    }

    const incomeName = (isCustomExpense ? customExpenseName : newTransaction.name).trim();
    const amount = parseFloat(newTransaction.amount);
    if (!incomeName) {
      toast.warning(isCustomExpense ? "Give this income a name." : "Pick where this income came from.", { title: "Income source" });
      return;
    }
    if (!(amount > 0)) {
      toast.warning("Enter an amount above ₹0.", { title: "Amount" });
      return;
    }
    if (!newTransaction.date) {
      toast.warning("Pick the date you received it.", { title: "Date" });
      return;
    }

    const transactionData = {
      name: incomeName,
      amount,
      description: newTransaction.description || "",
      type: "Income",
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
        toast.success(`${incomeName} · ${inr(amount)}`, { title: "Income updated" });
      } else {
        const newId = await fsAddTransaction(uid, transactionData);
        setTransactions((prev) => [...prev, { id: newId, ...transactionData }]);
        toast.success(`${incomeName} · ${inr(amount)} · +10 coins`, { title: "Income saved" });
      }

      EventRegister.emit("transactionAdded");
      rememberEntry("income", transactionData).then(() => getEntryMemory("income").then(setMemory));
      handleCancel();
      if (returnsOnClose) navigation.goBack();
    } catch (error) {
      console.error("addTransaction error:", error);
      toast.error(friendlyError(error, `Couldn't ${isEditMode ? "update" : "save"} this income. Please try again.`));
    } finally {
      setSaving(false);
    }
  };

  // ❌ Delete with a few seconds to undo; the server delete runs when the toast closes
  const deleteTransaction = (item) => {
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
      failMessage: "Couldn't delete that income. It has been restored.",
    });
  };

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

  // Cancel and reset form (new entries start from the last-used type / method)
  const handleCancel = () => {
    setNewTransaction({
      name: "",
      amount: "",
      description: "",
      type: "Income",
      subType: memory?.last?.subType || "Active",
      method: memory?.last?.method || "Cash",
      date: localISODate(),
    });
    setSelectedDate(new Date());
    setCustomExpenseName("");
    setIsCustomExpense(false);
    setModalVisible(false);

    // Reset edit mode
    setIsEditMode(false);
    setEditTransactionId(null);
  };

  // Closing a form that opened itself returns to where the user came from
  const handleClose = () => {
    handleCancel();
    if (returnsOnClose) navigation.goBack();
  };

  // One tap fills type + source from something logged often before
  const shortcuts = isEditMode ? [] : topEntries(memory);
  const currentName = isCustomExpense ? customExpenseName : newTransaction.name;
  const pickShortcut = (sc) => {
    const known = (expenseTypeOptions[sc.subType] || []).includes(sc.name);
    setNewTransaction({ ...newTransaction, subType: sc.subType || newTransaction.subType, name: known ? sc.name : "Others" });
    setIsCustomExpense(!known);
    setCustomExpenseName(known ? "" : sc.name);
  };

  // Custom dropdown component to replace problematic Picker
  const CustomDropdown = ({ label, options, value, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Ensure we have valid options array
    const safeOptions = Array.isArray(options) ? options : [];

    const selectedLabel =
      safeOptions.find((opt) => opt && opt.value === value)?.label ||
      "Select an option";

    // Close dropdown when modal is touched outside
    useEffect(() => {
      const handleTouch = () => {
        setIsOpen(false);
      };

      return () => {
        // Cleanup if needed
      };
    }, []);

    return (
      <View style={{ marginBottom: 16 }}>
        <Press scaleTo={0.96} activeOpacity={0.7}
          style={[styles.pickerButton, isOpen && styles.pickerButtonActive]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text
            style={[
              styles.pickerButtonText,
              value
                ? styles.pickerButtonTextSelected
                : styles.pickerButtonTextPlaceholder,
            ]}
          >
            {selectedLabel}
          </Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={P.mute}
          />
        </Press>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            <ScrollView
              style={{ maxHeight: 120 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {safeOptions.map((option, index) => (
                <Press scaleTo={0.96}
                  key={option.value || index}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.selectedDropdownItem,
                  ]}
                  onPress={() => {
                    haptics.select();
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.value && styles.selectedDropdownItemText,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {option.label || ""}
                  </Text>
                  {value === option.value && (
                    <Icon name="check" size={16} color={P.primary} />
                  )}
                </Press>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Calculate statistics
  const totalIncome = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  const activeIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.subType === "Active")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  const passiveIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.subType === "Passive")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [filteredTransactions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />

      {/* Header */}
      <ScreenHeader overline="Ledger" title="Income" right={<IconButton accessibilityLabel="Filters" onPress={toggleFilters}><Ionicons name="filter-outline" size={20} color={P.ink} /></IconButton>} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Income analysis */}
        <CashflowInsights
          kind="income"
          transactions={transactions}
          groups={INCOME_GROUPS()}
          pinned={pinnedMonth(filterMonth, filterYear)}
        />

        <LedgerList
          kind="inc"
          items={filteredTransactions}
          total={transactions.length}
          types={[
            { value: "all", label: "All" },
            { value: "Active", label: "Active" },
            { value: "Passive", label: "Passive" },
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
        accessibilityLabel="Add income"
      >
        <Icon name="plus" size={28} color={P.accInk} />
      </Press>

      {/* Modal */}
      <PopupModal toastHost={false}
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <PopupBackdrop style={styles.modalContainer}>
              <PopupPanel style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {isEditMode ? "Edit Income" : "Add Income"}
                  </Text>
                  <Press scaleTo={0.96} activeOpacity={0.7} onPress={handleClose} style={styles.modalCloseButton} accessibilityLabel="Close">
                    <Icon name="close" size={24} color={P.mute} />
                  </Press>
                </View>

                {/* Make the form scrollable */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  style={{ maxHeight: Platform.OS === "ios" ? 450 : 500 }}
                  contentContainerStyle={{ paddingBottom: 20 }}
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

                  {/* SubType Selection */}
                  <Text style={styles.label}>Income Type</Text>
                  <View style={styles.typeButtonContainer}>
                    {["Active", "Passive"].map((type) => (
                      <Press scaleTo={0.96} activeOpacity={0.7}
                        key={type}
                        style={[
                          styles.typeButton,
                          newTransaction.subType === type &&
                          styles.activeTypeButton,
                        ]}
                        onPress={() => {
                          if (type !== newTransaction.subType) haptics.select();
                          setNewTransaction({
                            ...newTransaction,
                            subType: type,
                            name: "",
                          });
                        }}
                      >
                        <Ionicons
                          name={type === "Active" ? "trending-up-outline" : "wallet-outline"}
                          size={18}
                          color={newTransaction.subType === type ? P.bg : P.mute}
                        />
                        <Text
                          style={[
                            styles.typeButtonText,
                            newTransaction.subType === type &&
                            styles.activeTypeButtonText,
                          ]}
                        >
                          {type}
                        </Text>
                      </Press>
                    ))}
                  </View>

                  {/* Income Source using Custom Dropdown */}
                  <Text style={styles.label}>Income Source</Text>
                  <CustomDropdown
                    options={[
                      { label: "Select a source", value: "" },
                      ...((
                        expenseTypeOptions[newTransaction.subType] || []
                      ).map((item) => ({
                        label: item || "",
                        value: item || "",
                      })) || []),
                      { label: "Others", value: "Others" },
                    ]}
                    value={newTransaction.name}
                    onSelect={(value) => {
                      setIsCustomExpense(value === "Others");
                      setNewTransaction({ ...newTransaction, name: value });
                    }}
                  />

                  {/* Custom Expense Input */}
                  {isCustomExpense && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom income source"
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
                    steps={[1000, 5000, 10000, 25000]}
                    value={newTransaction.amount}
                    onChange={(v) => setNewTransaction((prev) => ({ ...prev, amount: v }))}
                  />

                  {/* Description */}
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Add a description for this income..."
                    placeholderTextColor={P.mute}
                    value={newTransaction.description}
                    onChangeText={(text) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: text,
                      })
                    }
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <Text style={styles.label}>Date</Text>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon
                      name="calendar"
                      size={20}
                      color={P.mute}
                    />
                    <Text style={styles.dateButtonText}>
                      {newTransaction.date
                        ? formatDisplayDate(newTransaction.date)
                        : "Select a date"}
                    </Text>
                  </Press>

                  {/* Show DateTimePicker conditionally */}
                  {showDatePicker &&
                    (Platform.OS === "android" ? (
                      // Android implementation
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                    ) : (
                      // iOS implementation
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        style={styles.datePicker}
                      />
                    ))}

                  {/* Payment Method using Custom Dropdown */}
                  <Text style={styles.label}>Payment Method</Text>
                  <CustomDropdown
                    options={[
                      { label: "Cash", value: "Cash" },
                      { label: "Bank Transfer", value: "Bank Transfer" },
                      { label: "Credit Card", value: "Credit Card" },
                      { label: "Debit Card", value: "Debit Card" },
                      { label: "UPI", value: "UPI" },
                      { label: "Other", value: "Other" },
                    ]}
                    value={newTransaction.method}
                    onSelect={(value) =>
                      setNewTransaction({ ...newTransaction, method: value })
                    }
                  />

                  {/* Buttons */}
                  <View style={styles.buttonContainer}>
                    <Press scaleTo={0.96} activeOpacity={0.7}
                      style={styles.cancelButton}
                      onPress={handleClose}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Press>

                    <Press scaleTo={0.96} activeOpacity={0.7}
                      style={[
                        styles.saveButton,
                        saving && styles.disabledButton,
                      ]}
                      onPress={addTransaction}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color={P.onSolid} />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          {isEditMode ? "Update" : "Add Income"}
                        </Text>
                      )}
                    </Press>
                  </View>
                </ScrollView>
              </PopupPanel>
            </PopupBackdrop>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <ToastHost inModal />
      </PopupModal>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  shortcutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
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
    backgroundColor: P.surf2,
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
    marginBottom: 24,
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
    backgroundColor: P.posSoft,
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
  },
  sectionTitle: {
    fontSize: IS_COMPACT_SCREEN ? 16 : 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 4,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  tab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: IS_COMPACT_SCREEN ? 4 : 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: P.ink,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.mute,
    marginTop: 4,
  },
  activeTabText: {
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
    backgroundColor: P.posSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  passiveIconContainer: {
    backgroundColor: P.surf2,
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
    color: P.pos,
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
  typeButtonContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 9,
    marginHorizontal: 4,
    backgroundColor: P.surf2,
  },
  activeTypeButton: {
    backgroundColor: P.ink,
  },
  typeButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 12 : 15,
    fontWeight: "600",
    color: P.mute,
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
    backgroundColor: P.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: P.line,
    marginBottom: 4,
  },
  pickerButtonActive: {
    borderColor: P.ink,
    backgroundColor: P.surf2,
  },
  pickerButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: P.ink,
    flex: 1,
  },
  pickerButtonTextPlaceholder: {
    color: P.mute,
  },
  pickerButtonTextSelected: {
    color: P.ink,
  },
  dropdownMenu: {
    backgroundColor: P.surf,
    borderRadius: 12,
    marginVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
    maxHeight: 120,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
    minHeight: 44,
  },
  selectedDropdownItem: {
    backgroundColor: P.surf2,
  },
  dropdownItemText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: P.ink,
    flex: 1,
  },
  selectedDropdownItemText: {
    color: P.primary,
    fontWeight: "600",
  },

  // Input Fields
  input: {
    backgroundColor: P.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginBottom: 12,
    color: P.ink,
    borderWidth: 1,
    borderColor: P.line,
  },
  textArea: {
    backgroundColor: P.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginBottom: 12,
    color: P.ink,
    borderWidth: 1,
    borderColor: P.line,
    minHeight: 80,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: P.mute,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    color: P.ink,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  dateButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    marginLeft: 12,
    color: P.ink,
    flex: 1,
  },
  datePicker: {
    marginBottom: 12,
    backgroundColor: P.bg,
    borderRadius: 12,
  },

  // Action Buttons
  buttonContainer: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: P.surf2,
  },
  cancelButtonText: {
    fontSize: IS_COMPACT_SCREEN ? 15 : 16,
    fontWeight: "600",
    color: P.mute,
  },
  saveButton: {
    flex: 1,
    backgroundColor: P.acc,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: P.accInk,
  },
  disabledButton: {
    opacity: 0.6,
  },
}));
