// Spending / income analysis shown at the top of the Expenses and Income
// ledgers: a month hero with the change vs last month, a 6-month trend
// (tap a bar to inspect that month), the category-type mix and the top
// categories, plus a few plain-language insights.

import React, { useMemo, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Overline, Mono, LegendDot, Press } from "./pulse";
import { P, themedStyles } from "../theme/theme";
import { inr, inrCompact, MONTHS_SHORT } from "../utils/format";

const TREND_MONTHS = 6;
const TOP_N = 5;
const CHART_H = 132;
const LABEL_H = 18;
const DISCRETIONARY_GUIDE = 0.3; // 50/30/20 rule: wants ≤ 30%

/** Accepts "2026-09-26", ISO timestamps and "26/09/2026". */
export const parseTxDate = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The screen's Month / Year filter as a month to pin, or null for "All". */
export const pinnedMonth = (filterMonth, filterYear) => {
  if (filterMonth === "All") return null;
  const year = filterYear === "All" ? new Date().getFullYear() : parseInt(filterYear, 10);
  return { year, month: parseInt(filterMonth, 10) };
};

const monthKey = (y, m) => y * 12 + m;
const amountOf = (t) => {
  const n = parseFloat(t?.amount);
  return Number.isFinite(n) ? n : 0;
};
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/**
 * @param {"expense"|"income"} kind
 * @param {object[]} transactions   every transaction of this kind (not month-filtered)
 * @param {{key:string,label:string,color:string}[]} groups  subType buckets, in stack order
 * @param {{year:number,month:number}|null} pinned  month chosen in the screen's filters
 */
const CashflowInsights = ({ kind, transactions, groups, pinned }) => {
  const isExpense = kind === "expense";
  const hue = isExpense ? P.neg : P.pos;
  const now = new Date();
  const nowKey = monthKey(now.getFullYear(), now.getMonth());

  const [selectedKey, setSelectedKey] = useState(null);
  const [chartW, setChartW] = useState(0);

  // Bucket every transaction by month once.
  const byMonth = useMemo(() => {
    const map = new Map();
    (transactions || []).forEach((t) => {
      const d = parseTxDate(t?.date);
      if (!d) return;
      const k = monthKey(d.getFullYear(), d.getMonth());
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ ...t, _d: d });
    });
    return map;
  }, [transactions]);

  const latestKey = useMemo(() => {
    const keys = [...byMonth.keys()].filter((k) => k <= nowKey);
    return keys.length ? Math.max(...keys) : nowKey;
  }, [byMonth, nowKey]);

  const pinnedKey = pinned ? monthKey(pinned.year, pinned.month) : null;
  const focusKey = pinnedKey ?? selectedKey ?? (byMonth.has(nowKey) ? nowKey : latestKey);
  // The trend runs up to this month, unless the focused month is further back.
  const endKey = nowKey - focusKey < TREND_MONTHS ? Math.max(nowKey, focusKey) : focusKey;

  const trend = useMemo(() => {
    const out = [];
    for (let k = endKey - TREND_MONTHS + 1; k <= endKey; k += 1) {
      const list = byMonth.get(k) || [];
      out.push({
        key: k,
        year: Math.floor(k / 12),
        month: ((k % 12) + 12) % 12,
        total: list.reduce((s, t) => s + amountOf(t), 0),
      });
    }
    return out;
  }, [byMonth, endKey]);

  const focus = useMemo(() => {
    const list = byMonth.get(focusKey) || [];
    const year = Math.floor(focusKey / 12);
    const month = ((focusKey % 12) + 12) % 12;
    const total = list.reduce((s, t) => s + amountOf(t), 0);
    const prevTotal = (byMonth.get(focusKey - 1) || []).reduce((s, t) => s + amountOf(t), 0);
    const prior3 = [1, 2, 3].map((i) => (byMonth.get(focusKey - i) || []).reduce((s, t) => s + amountOf(t), 0));
    const prior3Months = prior3.filter((v) => v > 0);
    const avg3 = prior3Months.length ? prior3Months.reduce((a, b) => a + b, 0) / prior3Months.length : 0;

    const isCurrent = focusKey === nowKey;
    const elapsedDays = isCurrent ? now.getDate() : daysInMonth(year, month);
    const perDay = elapsedDays ? total / elapsedDays : 0;
    const projected = isCurrent ? perDay * daysInMonth(year, month) : null;

    const groupTotals = groups.map((g) => ({
      ...g,
      value: list.filter((t) => t.subType === g.key).reduce((s, t) => s + amountOf(t), 0),
    }));

    const byName = new Map();
    list.forEach((t) => {
      const name = String(t.name || "Other").trim() || "Other";
      byName.set(name, (byName.get(name) || 0) + amountOf(t));
    });
    const categories = [...byName.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const largest = list.reduce((best, t) => (amountOf(t) > amountOf(best || {}) ? t : best), null);

    return { list, year, month, total, prevTotal, avg3, perDay, projected, groupTotals, categories, largest, isCurrent };
  }, [byMonth, focusKey, groups, nowKey]);

  const insights = useMemo(() => buildInsights(kind, focus), [kind, focus]);

  if (!transactions || transactions.length === 0) return null;

  const monthLabel = `${MONTHS_SHORT[focus.month]} ${focus.year}`;
  const delta = focus.prevTotal > 0 ? (focus.total - focus.prevTotal) / focus.prevTotal : null;
  // For spending, going up is bad; for income, going up is good.
  const deltaGood = delta === null ? null : isExpense ? delta <= 0 : delta >= 0;

  const maxTrend = Math.max(...trend.map((t) => t.total), 1);
  const nonZero = trend.filter((t) => t.total > 0);
  const avgTrend = nonZero.length ? nonZero.reduce((s, t) => s + t.total, 0) / nonZero.length : 0;
  const plotH = CHART_H - LABEL_H - 16; // room for the value label above the focused bar
  const slot = chartW / TREND_MONTHS;
  const barW = Math.min(28, Math.max(12, slot * 0.5));
  const yOf = (v) => 16 + plotH - (v / maxTrend) * plotH;

  const groupSum = focus.groupTotals.reduce((s, g) => s + g.value, 0);
  const topCats = focus.categories.slice(0, TOP_N);
  const moreCount = Math.max(0, focus.categories.length - TOP_N);
  const topMax = topCats[0]?.value || 1;

  return (
    <View style={styles.wrap}>
      {/* Hero + trend */}
      <Card style={styles.card}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Overline>{isExpense ? "Spent" : "Earned"} · {monthLabel}</Overline>
            <Mono size={26} weight="700" style={{ marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
              {inr(focus.total)}
            </Mono>
          </View>
          {delta !== null ? (
            <View style={[styles.deltaChip, { backgroundColor: deltaGood ? P.posSoft : P.negSoft }]}>
              <Ionicons
                name={delta >= 0 ? "arrow-up" : "arrow-down"}
                size={12}
                color={deltaGood ? P.pos : P.neg}
              />
              <Text mono style={[styles.deltaText, { color: deltaGood ? P.pos : P.neg }]}>
                {Math.abs(delta * 100).toFixed(0)}% vs {MONTHS_SHORT[(focus.month + 11) % 12]}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.subStats}>
          <SubStat label="Per day" value={inrCompact(focus.perDay)} />
          <SubStat label="Entries" value={String(focus.list.length)} />
          {focus.projected !== null ? (
            <SubStat label={isExpense ? "On pace for" : "Projected"} value={inrCompact(focus.projected)} />
          ) : (
            <SubStat label="3-mo avg" value={focus.avg3 ? inrCompact(focus.avg3) : "—"} />
          )}
        </View>

        <View
          style={styles.chart}
          onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
          accessibilityLabel={`${isExpense ? "Spending" : "Income"} for the last ${TREND_MONTHS} months`}
        >
          {chartW > 0 ? (
            <>
              <Svg width={chartW} height={CHART_H - LABEL_H}>
                {avgTrend > 0 ? (
                  <Line
                    x1={0}
                    x2={chartW}
                    y1={yOf(avgTrend)}
                    y2={yOf(avgTrend)}
                    stroke={P.mute}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                ) : null}
                <Line x1={0} x2={chartW} y1={16 + plotH} y2={16 + plotH} stroke={P.line} strokeWidth={1} />
                {trend.map((t, i) => {
                  const h = Math.max(t.total > 0 ? 3 : 0, 16 + plotH - yOf(t.total));
                  const x = i * slot + (slot - barW) / 2;
                  const active = t.key === focusKey;
                  return (
                    <Rect
                      key={t.key}
                      x={x}
                      y={16 + plotH - h}
                      width={barW}
                      height={h}
                      rx={4}
                      fill={hue}
                      opacity={active ? 1 : 0.3}
                    />
                  );
                })}
              </Svg>
              {/* Value label on the focused bar only */}
              {trend.map((t, i) =>
                t.key === focusKey && t.total > 0 ? (
                  <Text
                    key={`v${t.key}`}
                    mono
                    style={[
                      styles.barValue,
                      { left: i * slot, width: slot, top: Math.max(0, yOf(t.total) - 16) },
                    ]}
                    numberOfLines={1}
                  >
                    {inrCompact(t.total)}
                  </Text>
                ) : null
              )}
              {/* Tap targets span the full column, larger than the bar */}
              <View style={StyleSheet.absoluteFill}>
                <View style={{ flexDirection: "row", flex: 1 }}>
                  {trend.map((t) => (
                    <Press scaleTo={0.96}
                      key={`h${t.key}`}
                      style={{ flex: 1 }}
                      activeOpacity={0.6}
                      disabled={pinnedKey !== null}
                      onPress={() => setSelectedKey(t.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`${MONTHS_SHORT[t.month]} ${t.year}: ${inr(t.total)}`}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.axisRow}>
                {trend.map((t) => (
                  <Text
                    key={`l${t.key}`}
                    mono
                    style={[styles.axisLabel, t.key === focusKey && { color: P.ink, fontWeight: "700" }]}
                  >
                    {MONTHS_SHORT[t.month]}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </View>
        {avgTrend > 0 ? (
          <Text style={styles.chartNote}>
            Dashed line: {TREND_MONTHS}-month average {inrCompact(avgTrend)}
            {pinnedKey === null ? " · tap a bar to see that month" : ""}
          </Text>
        ) : null}
      </Card>

      {/* Mix by type */}
      {groupSum > 0 ? (
        <Card style={styles.card}>
          <Overline>{isExpense ? "Where it went" : "Income mix"}</Overline>
          <View style={styles.stack}>
            {focus.groupTotals
              .filter((g) => g.value > 0)
              .map((g) => (
                <View key={g.key} style={{ flex: g.value, height: 12, backgroundColor: g.color, borderRadius: 4 }} />
              ))}
          </View>
          {focus.groupTotals.map((g) => (
            <View key={g.key} style={styles.mixRow}>
              <LegendDot color={g.color} label={g.label} square />
              <View style={{ flex: 1 }} />
              <Mono size={13}>{inr(g.value)}</Mono>
              <Text mono style={styles.share}>
                {groupSum ? Math.round((g.value / groupSum) * 100) : 0}%
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Top categories */}
      {topCats.length > 0 ? (
        <Card style={styles.card}>
          <Overline>{isExpense ? "Top categories" : "Top sources"} · {monthLabel}</Overline>
          {topCats.map((c) => (
            <View key={c.name} style={styles.catRow}>
              <View style={styles.catHead}>
                <Text style={styles.catName} numberOfLines={1}>{c.name}</Text>
                <Mono size={13}>{inr(c.value)}</Mono>
                <Text mono style={styles.share}>
                  {focus.total ? Math.round((c.value / focus.total) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.catTrack}>
                <View style={{ width: `${(c.value / topMax) * 100}%`, height: 6, borderRadius: 3, backgroundColor: hue }} />
              </View>
            </View>
          ))}
          {moreCount > 0 ? (
            <Text style={styles.chartNote}>+{moreCount} more {moreCount === 1 ? "category" : "categories"}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* Plain-language insights */}
      {insights.length > 0 ? (
        <Card style={styles.card}>
          <Overline>Insights</Overline>
          {insights.map((line, i) => (
            <View key={i} style={styles.insightRow}>
              <Ionicons name={line.icon} size={16} color={line.tone === "bad" ? P.neg : line.tone === "good" ? P.pos : P.ink2} />
              <Text style={styles.insightText}>{line.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
};

const SubStat = ({ label, value }) => (
  <View style={{ flex: 1, gap: 3 }}>
    <Overline size={10}>{label}</Overline>
    <Mono size={14} numberOfLines={1} adjustsFontSizeToFit>{value}</Mono>
  </View>
);

const pctText = (v) => `${Math.round(v * 100)}%`;

const buildInsights = (kind, f) => {
  const out = [];
  if (!f.total) return out;
  const isExpense = kind === "expense";

  if (f.avg3 > 0) {
    const diff = (f.total - f.avg3) / f.avg3;
    if (Math.abs(diff) >= 0.05 && !f.isCurrent) {
      const up = diff > 0;
      out.push({
        icon: up ? "trending-up" : "trending-down",
        tone: isExpense ? (up ? "bad" : "good") : up ? "good" : "bad",
        text: `${isExpense ? "Spending" : "Income"} was ${pctText(Math.abs(diff))} ${up ? "above" : "below"} your 3-month average of ${inrCompact(f.avg3)}.`,
      });
    } else if (f.isCurrent && f.projected) {
      const diff = (f.projected - f.avg3) / f.avg3;
      if (Math.abs(diff) >= 0.05) {
        const up = diff > 0;
        out.push({
          icon: up ? "trending-up" : "trending-down",
          tone: isExpense ? (up ? "bad" : "good") : up ? "good" : "bad",
          text: `At this pace you'll ${isExpense ? "spend" : "earn"} ${inrCompact(f.projected)} this month, ${pctText(Math.abs(diff))} ${up ? "more" : "less"} than your 3-month average.`,
        });
      }
    }
  }

  if (isExpense) {
    const disc = f.groupTotals.find((g) => g.key === "Discretionary")?.value || 0;
    const share = disc / f.total;
    if (share > DISCRETIONARY_GUIDE) {
      out.push({
        icon: "cart-outline",
        tone: "bad",
        text: `Discretionary is ${pctText(share)} of spending. Bringing it to 30% would free ${inrCompact(disc - f.total * DISCRETIONARY_GUIDE)}.`,
      });
    } else if (disc > 0) {
      out.push({ icon: "checkmark-circle-outline", tone: "good", text: `Discretionary spending is ${pctText(share)}, within the 30% guideline.` });
    }
    if (f.largest) {
      const d = f.largest._d;
      out.push({
        icon: "receipt-outline",
        tone: "neutral",
        text: `Largest expense: ${f.largest.name || "Expense"} ${inr(amountOf(f.largest))} on ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}.`,
      });
    }
  } else {
    const passive = f.groupTotals.find((g) => g.key === "Passive")?.value || 0;
    const share = passive / f.total;
    out.push(
      passive > 0
        ? { icon: "wallet-outline", tone: "good", text: `Passive income is ${pctText(share)} of what you earned this month.` }
        : { icon: "bulb-outline", tone: "neutral", text: "All income this month is active. Interest, dividends or rent would add a passive stream." }
    );
    const top = f.categories[0];
    if (top && f.categories.length > 1) {
      out.push({
        icon: "pie-chart-outline",
        tone: top.value / f.total > 0.8 ? "bad" : "neutral",
        text: `${f.categories.length} sources; ${top.name} brings in ${pctText(top.value / f.total)}.`,
      });
    }
  }
  return out.slice(0, 3);
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 12, marginBottom: 16 }, // the ledger's scroll content supplies the side gutter
    card: { padding: 16 },
    heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    deltaChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    deltaText: { fontSize: 11, fontWeight: "700" },
    subStats: { flexDirection: "row", gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line },
    chart: { height: CHART_H, marginTop: 16 },
    barValue: { position: "absolute", textAlign: "center", fontSize: 11, fontWeight: "700", color: P.ink },
    axisRow: { flexDirection: "row", height: LABEL_H, alignItems: "flex-end" },
    axisLabel: { flex: 1, textAlign: "center", fontSize: 10, color: P.mute },
    chartNote: { fontSize: 11, color: P.mute, marginTop: 8 },
    stack: { flexDirection: "row", gap: 2, marginTop: 12, marginBottom: 6 },
    mixRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10 },
    share: { width: 40, textAlign: "right", fontSize: 12, color: P.mute },
    catRow: { paddingTop: 12 },
    catHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    catName: { flex: 1, fontSize: 13, color: P.ink2 },
    catTrack: { height: 6, borderRadius: 3, backgroundColor: P.surf2, overflow: "hidden" },
    insightRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 10 },
    insightText: { flex: 1, fontSize: 13, lineHeight: 19, color: P.ink2 },
  })
);

export default CashflowInsights;
