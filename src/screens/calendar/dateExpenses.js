import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  AntDesign,
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../../config/FirebaseConfig";
import {
  getTransactions,
  addTransaction as fsAddTransaction,
  updateTransaction as fsUpdateTransaction,
  deleteTransaction as fsDeleteTransaction,
} from "../../services/firestoreService";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../../theme/theme";
import {
  Card,
  StatCard,
  ChipRow,
  TxRow,
  Button,
  Empty,
  IconButton,
  Overline,
  SkeletonRows,
  Tip,
  ActionSheet,
  markLearned,
  ToastHost,
  RowIn,
  useSlideOnChange,
  SwipeRow,
  Press,
} from "../../components/pulse";
import { inr, timeOf, DAYS_LONG, MONTHS_LONG, localISODate, groupAmountInput, parseAmountInput } from "../../utils/format";
import { toast, withUndo, friendlyError } from "../../ux/toast";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import useSwipe from "../../ux/useSwipe";

const shiftDay = (iso, delta) => {
  const [y, m, d] = iso.split("-").map(Number);
  return localISODate(new Date(y, m - 1, d + delta));
};

// "Today" · "Yesterday" · "Tomorrow" · "3 days ago" · "In 2 days"
const relativeDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  const diff = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return diff < 0 ? `${-diff} days ago` : `In ${diff} days`;
};

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

const TransactionsPage = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const selectedDate = route.params?.selectedDate || localISODate();
  // Every transaction, cached: switching days filters locally (instant)
  const [all, setAll] = useState(null);
  const transactions = useMemo(() => (all || []).filter((t) => t.date === selectedDate), [all, selectedDate]);
  const [activeTx, setActiveTx] = useState(null);
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    description: "",
    type: "",
    subType: "",
    method: "",
    date: selectedDate,
  });
  const [isEditing, setIsEditing] = useState(false); // State to track edit mode
  const [currentTransactionId, setCurrentTransactionId] = useState(null); // State for ID of transaction being edited

  // Pulse header: weekday overline + "23 September"
  useEffect(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    navigation.setOptions({ overline: DAYS_LONG[dt.getDay()], title: `${d} ${MONTHS_LONG[m - 1]}` });
  }, [selectedDate, navigation]);

  // Refresh transactions when screen comes into focus (when returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions();
    }, [])
  );

  // The new day's figures and entries slide in from the side you moved towards
  const dayDir = useRef(1);
  const daySlide = useSlideOnChange(selectedDate, dayDir.current);
  const goToDay = (iso) => {
    dayDir.current = iso > selectedDate ? 1 : -1;
    markLearned("day.swipe");
    navigation.setParams({ selectedDate: iso });
  };
  const swipe = useSwipe({
    onNext: () => goToDay(shiftDay(selectedDate, 1)),
    onPrev: () => goToDay(shiftDay(selectedDate, -1)),
  });

  // Add or Update Transaction (used by modal for generic transactions)
  const handleSaveTransaction = async () => {
    if (!newTransaction.name || !newTransaction.amount || !newTransaction.type || !newTransaction.method) {
      toast.warning("Please fill out all required fields.", { title: "Missing information" });
      return;
    }

    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("Please log in again to continue.", { title: "Session expired" });
        return;
      }

      if (isEditing && currentTransactionId) {
        await fsUpdateTransaction(uid, currentTransactionId, {
          ...newTransaction,
          amount: parseFloat(newTransaction.amount),
        });
      } else {
        await fsAddTransaction(uid, {
          ...newTransaction,
          amount: parseFloat(newTransaction.amount),
        });
      }

      await fetchTransactions();
      setNewTransaction({ name: "", amount: "", description: "", type: "", subType: "", method: "", date: selectedDate });
      setModalVisible(false);
      setIsEditing(false);
      setCurrentTransactionId(null);
      toast.success(`Transaction ${isEditing ? "updated" : "added"} successfully!`);
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle navigation to specific edit screens
  const handleEditTransaction = (transaction) => {
    const commonParams = {
      editItem: transaction, // Pass the entire transaction object for editing
      date: selectedDate, // Ensure the date is available if needed by the edit screen
      fromDailyTransactions: true, // A flag to indicate where the navigation originated
    };

    // Determine target screen based on type and subType
    if (transaction.type === "Expense") {
      navigation.navigate("Expenses", commonParams);
    } else if (transaction.type === "Income") {
      navigation.navigate("Income", commonParams);
    } else if (transaction.type === "Investment") {
      if (transaction.subType === "FD") {
        navigation.navigate("FDScreen", commonParams);
      } else if (transaction.subType === "RD") {
        navigation.navigate("RDScreen", commonParams);
      } else if (transaction.subType === "Savings") {
        navigation.navigate("SavingsScreen", commonParams);
      } else {
        // Fallback for other investment types not directly handled by a specific screen
        // In this case, open the generic modal for editing
        setNewTransaction({
          name: transaction.name,
          amount: transaction.amount.toString(),
          description: transaction.description || "",
          type: transaction.type,
          subType: transaction.subType || "",
          method: transaction.method,
          date: transaction.date,
        });
        setIsEditing(true);
        setCurrentTransactionId(transaction.id || transaction._id);
        setModalVisible(true);
      }
    } else {
      // For types not explicitly handled (e.g., if you had other base types)
      // or to handle potential existing "non-type" transactions for editing
      setNewTransaction({
        name: transaction.name,
        amount: transaction.amount.toString(),
        description: transaction.description || "",
        type: transaction.type,
        subType: transaction.subType || "",
        method: transaction.method,
        date: transaction.date,
      });
      setIsEditing(true);
      setCurrentTransactionId(transaction.id || transaction._id);
      setModalVisible(true);
    }
  };

  // Fetch Transactions — refreshes silently; the skeleton only shows before the first load
  const fetchTransactions = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("Please sign in again to continue.", { title: "Session expired" });
        return;
      }
      setAll(await getTransactions(uid));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error(friendlyError(error, "Couldn't load this day. Pull down or try again."));
      setAll((prev) => prev || []);
    } finally {
      setLoading(false);
    }
  };

  // Delete with a few seconds to undo; the server delete runs when the toast closes
  const deleteTransaction = (item) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !item) return;
    let before = null;
    withUndo({
      message: `${item.name || "Entry"} · ${inr(item.amount)} deleted`,
      apply: () =>
        setAll((prev) => {
          before = prev;
          return (prev || []).filter((t) => t.id !== item.id);
        }),
      revert: () => before && setAll(before),
      commit: () => fsDeleteTransaction(uid, item.id),
      failMessage: "Couldn't delete that entry. It has been restored.",
    });
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter(
    (transaction) => filter === "All" || transaction.type === filter
  );

  // Get icon based on transaction type
  const getTransactionIcon = (type) => {
    switch (type) {
      case "Income":
        return (
          <MaterialIcons name="arrow-circle-down" size={24} color={P.pos} />
        );
      case "Expense":
        return (
          <MaterialIcons name="arrow-circle-up" size={24} color={P.neg} />
        );
      case "Investment":
        return (
          <MaterialCommunityIcons name="chart-line" size={24} color={P.primary} />
        );
      default:
        return <MaterialIcons name="currency-rupee" size={24} color={P.mute} />;
    }
  };

  // Get method icon
  const getMethodIcon = (method) => {
    switch (method) {
      case "Cash":
        return <MaterialIcons name="money" size={18} color={P.mute} />;
      case "Credit Card":
        return <AntDesign name="creditcard" size={18} color={P.mute} />;
      case "Debit Card":
        return <AntDesign name="creditcard" size={18} color={P.mute} />;
      case "UPI":
        return (
          <MaterialCommunityIcons name="cellphone" size={18} color={P.mute} />
        );
      default:
        return <MaterialIcons name="payment" size={18} color={P.mute} />;
    }
  };

  // Pulse "day" view — totals, filters and the day's ledger
  const sumOf = (type) =>
    transactions.filter((t) => t.type === type).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const dayIn = sumOf("Income");
  const dayOut = sumOf("Expense");
  const dayInv = sumOf("Investment");
  const kindOf = (t) => (t.type === "Income" ? "inc" : t.type === "Investment" ? "inv" : "exp");
  const amountText = (t) => {
    const v = inr(t.amount);
    return t.type === "Expense" ? `−${v}` : t.type === "Income" ? `+${v}` : v;
  };
  const openRowActions = (item) => {
    markLearned("day.rowActions");
    setActiveTx(item);
  };
  const openAddMenu = () => {
    setIsEditing(false);
    setNewTransaction({ name: "", amount: "", description: "", type: "", subType: "", method: "", date: selectedDate });
    setActionMenuVisible(true);
  };

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScrollView contentContainerStyle={styles.pBody} showsVerticalScrollIndicator={false} {...swipe.panHandlers}>
        <View style={styles.pDayNav}>
          <IconButton icon="back" haptic="select" accessibilityLabel="Previous day" onPress={() => goToDay(shiftDay(selectedDate, -1))} />
          <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <Text style={styles.pDayRel}>{relativeDay(selectedDate)}</Text>
            {selectedDate !== localISODate() ? (
              <Press scaleTo={0.96} activeOpacity={0.7} onPress={() => goToDay(localISODate())} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
                <Overline color={P.accTx}>Jump to today</Overline>
              </Press>
            ) : (
              <Overline>{formatDate(selectedDate)}</Overline>
            )}
          </View>
          <IconButton icon="chevron" haptic="select" accessibilityLabel="Next day" onPress={() => goToDay(shiftDay(selectedDate, 1))} />
        </View>

        <Tip id="day.swipe">Swipe left or right to move between days.</Tip>

        <Animated.View style={[styles.pStats, daySlide]}>
          <StatCard label="In" value={`+${inr(dayIn)}`} color={P.pos} />
          <StatCard label="Out" value={`−${inr(dayOut)}`} color={P.neg} />
          <StatCard label="Invested" value={inr(dayInv)} color={P.inv} />
        </Animated.View>

        <ChipRow
          options={[
            { value: "All", label: "All" },
            { value: "Expense", label: "Expense" },
            { value: "Income", label: "Income" },
            { value: "Investment", label: "Invest" },
          ]}
          value={filter}
          onChange={setFilter}
        />

        <Animated.View style={daySlide}>
        {all === null ? (
          <Card style={{ paddingTop: 2, paddingBottom: 2 }}>
            <SkeletonRows count={3} />
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Empty
            icon="calendar"
            title="No transactions"
            message={
              filter === "All"
                ? "Nothing logged on this day yet."
                : `No ${filter.toLowerCase()} entries on this day.`
            }
          />
        ) : (
          <Card style={{ paddingTop: 4, paddingBottom: 4, overflow: "hidden" }}>
            {filteredTransactions.map((item, i) => (
              <RowIn key={item.id || item._id || `txn-${i}`} index={i}>
              <SwipeRow
                onDelete={() => {
                  markLearned("day.rowActions");
                  deleteTransaction(item);
                }}
                onEdit={() => handleEditTransaction(item)}
              >
              <TxRow
                detailed
                name={item.name}
                sub={[item.description, item.subType, item.method].filter((x) => x && String(x).trim()).join(" · ")}
                kind={kindOf(item)}
                amount={amountText(item)}
                time={timeOf(item.createdAt)}
                last={i === filteredTransactions.length - 1}
                onPress={() => openRowActions(item)}
              />
              </SwipeRow>
              </RowIn>
            ))}
          </Card>
        )}
        </Animated.View>

        {filteredTransactions.length ? <Tip id="day.rowActions">Swipe an entry to edit or delete it, or tap it for options.</Tip> : null}
        <Button title="Add a transaction" icon="plus" onPress={openAddMenu} />
      </ScrollView>

      <ActionSheet
        visible={!!activeTx}
        onClose={() => setActiveTx(null)}
        overline={activeTx ? [amountText(activeTx), activeTx.method || activeTx.subType].filter(Boolean).join(" · ") : ""}
        title={activeTx?.name || "Transaction"}
        actions={[
          { label: "Edit", icon: "edit", sub: "Change amount, category or date", onPress: () => handleEditTransaction(activeTx) },
          { label: "Delete", icon: "trash", destructive: true, sub: "You can undo for a few seconds", onPress: () => deleteTransaction(activeTx) },
        ]}
      />

      <ActionSheet
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
        overline={relativeDay(selectedDate)}
        title="Add to this day"
        actions={[
          { label: "Expense", icon: "expense", sub: "Money that went out", onPress: () => navigation.navigate("Expenses", { date: selectedDate }) },
          { label: "Income", icon: "income", sub: "Money that came in", onPress: () => navigation.navigate("Income", { date: selectedDate }) },
          { label: "Investment", icon: "chart", sub: "FD, RD, savings, funds or stocks", onPress: () => navigation.navigate("Investment", { date: selectedDate }) },
        ]}
      />

      {/* Add/Edit Transaction Modal (used for generic/unhandled types) */}
      <PopupModal toastHost={false}
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditing(false); // Exit edit mode on close
          setCurrentTransactionId(null); // Clear editing ID
          setNewTransaction({
            // Reset form
            name: "",
            amount: "",
            description: "",
            type: "",
            subType: "",
            method: "",
            date: selectedDate,
          });
        }}
      >
        <PopupBackdrop component={KeyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <PopupPanel style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit Transaction" : "Add Transaction"}
                </Text>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setModalVisible(false);
                    setIsEditing(false);
                    setCurrentTransactionId(null);
                    setNewTransaction({
                      name: "",
                      amount: "",
                      description: "",
                      type: "",
                      subType: "",
                      method: "",
                      date: selectedDate,
                    });
                  }}
                >
                  <AntDesign name="close" size={24} color={P.mute} />
                </Press>
              </View>

              <ScrollView
                style={styles.formScrollView}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Transaction Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., Groceries, Salary, etc."
                    placeholderTextColor={P.mute}
                    value={newTransaction.name}
                    onChangeText={(text) =>
                      setNewTransaction({ ...newTransaction, name: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor={P.mute}
                    keyboardType="numeric"
                    value={groupAmountInput(newTransaction.amount)}
                    onChangeText={(text) => {
                      // Shown grouped (12,450), stored plain (12450)
                      const v = parseAmountInput(text);
                      if (v !== null) setNewTransaction((prev) => ({ ...prev, amount: v }));
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a description..."
                    placeholderTextColor={P.mute}
                    value={newTransaction.description}
                    onChangeText={(text) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: text,
                      })
                    }
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Transaction Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newTransaction.type}
                      onValueChange={(itemValue) =>
                        setNewTransaction({
                          ...newTransaction,
                          type: itemValue,
                          subType: "",
                        })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Type" value="" />
                      <Picker.Item label="Income" value="Income" />
                      <Picker.Item label="Investment" value="Investment" />
                      <Picker.Item label="Expense" value="Expense" />
                    </Picker>
                  </View>
                </View>

                {newTransaction.type && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {newTransaction.type === "Income"
                        ? "Income Type"
                        : newTransaction.type === "Expense"
                          ? "Expense Category"
                          : "Investment Type"}
                    </Text>
                    <View style={styles.pickerContainer}>
                      {newTransaction.type === "Income" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item label="Select Income Type" value="" />
                          <Picker.Item label="Active" value="Active" />
                          <Picker.Item label="Passive" value="Passive" />
                        </Picker>
                      )}

                      {newTransaction.type === "Expense" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select Expense Category"
                            value=""
                          />
                          <Picker.Item
                            label="Discretionary"
                            value="Discretionary"
                          />
                          <Picker.Item label="Essential" value="Essential" />
                          <Picker.Item label="Mandatory" value="Mandatory" />
                        </Picker>
                      )}

                      {newTransaction.type === "Investment" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select Investment Type"
                            value=""
                          />
                          <Picker.Item label="Equity" value="Equity" />
                          <Picker.Item label="Debt" value="Debt" />
                          <Picker.Item label="Gold" value="Gold" />
                          <Picker.Item
                            label="Real Estate"
                            value="Real Estate"
                          />
                        </Picker>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newTransaction.method}
                      onValueChange={(itemValue) =>
                        setNewTransaction({
                          ...newTransaction,
                          method: itemValue,
                        })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Payment Method" value="" />
                      <Picker.Item label="Cash" value="Cash" />
                      <Picker.Item label="Credit Card" value="Credit Card" />
                      <Picker.Item label="Debit Card" value="Debit Card" />
                      <Picker.Item label="UPI" value="UPI" />
                    </Picker>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setIsEditing(false); // Exit edit mode on cancel
                    setCurrentTransactionId(null);
                    setNewTransaction({
                      // Reset form
                      name: "",
                      amount: "",
                      description: "",
                      type: "",
                      subType: "",
                      method: "",
                      date: selectedDate,
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Press>

                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={styles.saveButton}
                  onPress={handleSaveTransaction} // Use the new handleSaveTransaction
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={P.onSolid} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isEditing ? "Update" : "Save"}
                    </Text>
                  )}
                </Press>
              </View>
            </PopupPanel>
          </TouchableWithoutFeedback>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>

    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  pBody: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  pStats: { flexDirection: "row", gap: 8 },
  pDayNav: { flexDirection: "row", alignItems: "center", gap: 12 },
  pDayRel: { fontSize: 15, fontWeight: "600", color: P.ink },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[12],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: SPACING[8],
  },
  headerTextContainer: {
    marginLeft: SPACING[8],
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    padding: SPACING[12],
    paddingHorizontal: SPACING[8],
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.sm,
    marginHorizontal: 2,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  activeFilter: {
    backgroundColor: COLORS.primarySoft,
  },
  activeIncomeFilter: {
    backgroundColor: COLORS.incomeSoft,
  },
  activeInvestmentFilter: {
    backgroundColor: COLORS.indigoSoft,
  },
  activeExpenseFilter: {
    backgroundColor: COLORS.expenseSoft,
  },
  activeFilterText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  listContainer: {
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: SPACING[16],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  transactionLeftContent: {
    marginRight: SPACING[12],
    justifyContent: "center",
  },
  transactionMiddleContent: {
    flex: 1,
    justifyContent: "center",
  },
  transactionRightContent: {
    alignItems: "flex-end",
    height: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: 4,
    lineHeight: 18,
  },
  transactionMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
    marginRight: 0,
    flex: 0,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.disabled,
    marginHorizontal: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    marginRight: 10,
  },
  incomeAmount: {
    color: COLORS.income,
  },
  expenseAmount: {
    color: COLORS.expense,
  },
  investmentAmount: {
    color: COLORS.indigo,
  },
  actionIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  editIconContainer: {
    padding: SPACING[8],
  },
  deleteIconContainer: {
    padding: SPACING[8],
  },
  addButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 90 : 80,
    right: 20,
    backgroundColor: COLORS.primaryFill,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.lg,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING[24],
  },
  loadingText: {
    marginTop: SPACING[16],
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING[24],
  },
  emptyText: {
    marginTop: SPACING[16],
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    marginTop: SPACING[8],
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: SPACING[24],
    backgroundColor: COLORS.primaryFill,
    paddingVertical: SPACING[12],
    paddingHorizontal: SPACING[24],
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  emptyButtonText: {
    color: COLORS.textInverse,
    fontWeight: "700",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING[20],
    maxHeight: "90%",
  },
  formScrollView: {
    maxHeight: Platform.OS === "ios" ? 500 : 450,
  },
  formScrollContent: {
    paddingBottom: SPACING[10],
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING[20],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
    hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  },
  inputGroup: {
    marginBottom: SPACING[16],
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[12],
    paddingVertical: SPACING[10],
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  pickerContainer: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: COLORS.textPrimary,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: SPACING[16],
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING[16],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: SPACING[12],
    borderRadius: RADIUS.md,
    marginRight: SPACING[8],
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primaryFill,
    paddingVertical: SPACING[12],
    borderRadius: RADIUS.md,
    marginLeft: SPACING[8],
    alignItems: "center",
    ...SHADOWS.md,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontWeight: "700",
    fontSize: 15,
  },

  // Action Menu Styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  actionMenuContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING[24],
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING[16],
    textAlign: "center",
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING[14],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  actionMenuItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: SPACING[16],
  },
  actionMenuCancelButton: {
    marginTop: SPACING[16],
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[14],
    alignItems: "center",
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
}));

export default TransactionsPage;
