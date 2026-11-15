// Transaction list for the Expenses / Income ledgers, drawn like the Day
// view: filter chips, an optional month / year filter, and rows in one card.
// Tapping a row opens Edit / Delete; deleting can be undone from the toast.

import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Text,
  Card,
  TxRow,
  SectionHeader,
  ChipRow,
  SelectField,
  TextAction,
  SkeletonRows,
  Tip,
  ActionSheet,
  markLearned,
  RowIn,
  SwipeRow,
  Icon,
  TextInput,
  Press,
} from "./pulse";
import { P, themedStyles } from "../theme/theme";
import { inr, MONTHS_LONG } from "../utils/format";

/**
 * @param {"exp"|"inc"} kind
 * @param {object[]} items          filtered transactions to show
 * @param {number} total            count before filtering
 * @param {{value,label}[]} types   subtype chips (first should be "all")
 * @param {string} type / onType    selected chip
 * @param {boolean} showPeriod      show the month / year selects
 * @param {string} month, year      "All" or month index / year string
 * @param {number[]} years          years present in the data
 * @param {(item) => void} onDelete
 * @param {(item) => void} [onEdit]
 * @param {(item) => void} [onRepeat]  log the same entry again, dated today
 * @param {(value) => string} formatDate
 */
const LedgerList = ({
  kind,
  items,
  total,
  types,
  type,
  onType,
  showPeriod,
  month,
  year,
  years = [],
  onMonth,
  onYear,
  onResetPeriod,
  onDelete,
  onEdit,
  onRepeat,
  formatDate,
  loading,
}) => {
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState("");
  const sign = kind === "exp" ? "−" : "+";

  // Search name, note, category, method or amount ("450" finds ₹450)
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!q) return items;
    const digits = q.replace(/[₹,\s]/g, "");
    return items.filter((t) => {
      const text = [t.name, t.description, t.subType, t.method].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q) || (digits && /^\d+(\.\d+)?$/.test(digits) && String(t.amount).includes(digits));
    });
  }, [items, q]);

  return (
    <View style={{ gap: 14 }}>
      {total > 0 ? (
        <View style={styles.search}>
          <Icon name="search" size={17} color={P.mute} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={kind === "exp" ? "Search expenses" : "Search income"}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search transactions"
          />
          {query ? (
            <Press scaleTo={0.96} activeOpacity={0.7}
              onPress={() => setQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={16} color={P.mute} />
            </Press>
          ) : null}
        </View>
      ) : null}

      <ChipRow options={types} value={type} onChange={onType} />

      {showPeriod ? (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SelectField
              label="Month"
              value={month}
              onChange={onMonth}
              title="Show month"
              options={[{ value: "All", label: "All months" }, ...MONTHS_LONG.map((m, i) => ({ value: String(i), label: m }))]}
              style={{ flex: 1 }}
            />
            <SelectField
              label="Year"
              value={year}
              onChange={onYear}
              title="Show year"
              options={[{ value: "All", label: "All years" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.periodFoot}>
            <Text style={styles.note}>
              Showing {items.length} of {total}
            </Text>
            <TextAction title="Reset" onPress={onResetPeriod} />
          </View>
        </Card>
      ) : null}

      <SectionHeader
        title={q ? "Results" : "Transactions"}
        action={loading && !items.length ? "" : `${shown.length} ${shown.length === 1 ? "item" : "items"}`}
      />
      {shown.length === 0 ? (
        loading ? (
          <Card style={{ paddingVertical: 2 }}>
            <SkeletonRows count={4} />
          </Card>
        ) : (
          <Card style={{ alignItems: "center", paddingVertical: 22, gap: 6 }}>
            <Text style={styles.emptyTitle}>
              {q ? `No matches for “${query.trim()}”` : total ? "Nothing matches this filter" : "Nothing here yet"}
            </Text>
            <Text style={styles.note}>
              {q
                ? "Try a name, category or amount."
                : total
                  ? "Try another category or period."
                  : `Tap + to add ${kind === "exp" ? "an expense" : "income"}.`}
            </Text>
          </Card>
        )
      ) : (
        <>
          <Tip id="ledger.rowActions">Swipe an entry for quick actions, or tap it to edit or delete.</Tip>
          <Card style={{ paddingVertical: 2, overflow: "hidden" }}>
            {shown.map((item, i) => (
              <RowIn key={item.id || item._id || i} index={i}>
              <SwipeRow
                onDelete={() => {
                  markLearned("ledger.rowActions");
                  onDelete(item);
                }}
                onEdit={onEdit && (() => onEdit(item))}
                onRepeat={onRepeat && (() => onRepeat(item))}
              >
              <TxRow
                detailed
                kind={kind}
                name={item.name}
                sub={[item.subType, item.method, item.description].filter((x) => x && String(x).trim()).join(" · ")}
                amount={`${sign}${inr(item.amount)}`}
                time={formatDate(item.date)}
                onPress={() => {
                  markLearned("ledger.rowActions");
                  setActive(item);
                }}
                last={i === shown.length - 1}
              />
              </SwipeRow>
              </RowIn>
            ))}
          </Card>
        </>
      )}

      <ActionSheet
        visible={!!active}
        onClose={() => setActive(null)}
        overline={active ? `${sign}${inr(active.amount)} · ${formatDate(active.date)}` : ""}
        title={active?.name || "Transaction"}
        actions={[
          onEdit && { label: "Edit", icon: "edit", sub: "Change amount, category or date", onPress: () => onEdit(active) },
          onRepeat && { label: "Log again today", icon: "repeat", sub: "Same entry, dated today", onPress: () => onRepeat(active) },
          { label: "Delete", icon: "trash", destructive: true, sub: "You can undo for a few seconds", onPress: () => onDelete(active) },
        ]}
      />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    periodFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    note: { fontSize: 12, color: P.mute },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink, textAlign: "center" },
    search: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: P.line,
      backgroundColor: P.surf,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontSize: 15, color: P.ink, paddingVertical: 0 },
  })
);

export default LedgerList;
