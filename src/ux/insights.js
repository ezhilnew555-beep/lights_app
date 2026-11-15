// Small, explainable insights computed on the device from data the screen
// already has. Pure functions — no storage, no network.

import { localISODate } from "../utils/format";

const DAY = 86400000;
const isoDaysAgo = (today, n) => localISODate(new Date(new Date(`${today}T12:00:00`).getTime() - n * DAY));

/**
 * Consecutive days with at least one entry, ending today — or yesterday,
 * so a streak isn't shown as broken before the user has logged today.
 * dates: iterable of "YYYY-MM-DD". Returns { days, start, loggedToday }.
 */
export const loggingStreak = (dates, today = localISODate()) => {
  const set = dates instanceof Set ? dates : new Set(dates);
  const loggedToday = set.has(today);
  let n = loggedToday ? 0 : 1;
  if (!loggedToday && !set.has(isoDaysAgo(today, 1))) return { days: 0, start: null, loggedToday };
  let days = 0;
  while (set.has(isoDaysAgo(today, n))) {
    days += 1;
    n += 1;
  }
  return { days, start: days ? isoDaysAgo(today, n - 1) : null, loggedToday };
};

/** Streak lengths worth a celebration. */
export const STREAK_MILESTONES = [7, 30, 100, 365];
export const streakMilestone = (days) => [...STREAK_MILESTONES].reverse().find((m) => days >= m) || null;

/** F.I.R.E. progress milestones (percent). */
export const FIRE_MILESTONES = [25, 50, 75, 100];
export const fireMilestone = (pct) => [...FIRE_MILESTONES].reverse().find((m) => pct >= m) || null;

/** "dd/mm/yyyy" (older entries) or ISO → "YYYY-MM-DD". */
export const txDay = (date) => {
  const s = String(date || "");
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s.slice(0, 10);
};

const INVEST_SUBTYPES = ["Stock", "Mutual Fund", "FD", "RD", "Savings", "SIP", "Lumpsum"];
const isInvest = (t) => t.type === "Investment" || t.method === "Investment" || INVEST_SUBTYPES.includes(t.subType);

/**
 * The 7 days ending yesterday, against the 7 before. Everything the weekly
 * recap shows. Returns null when nothing was logged in either week.
 */
export const weekRecap = (transactions, today = localISODate()) => {
  const start = isoDaysAgo(today, 7);
  const end = isoDaysAgo(today, 1);
  const prevStart = isoDaysAgo(today, 14);
  const week = { spent: 0, earned: 0, invested: 0 };
  let prevSpent = 0;
  const byCategory = {};
  const byDay = {};
  const logged = new Set();

  transactions.forEach((t) => {
    const d = txDay(t.date);
    const a = Number(t.amount) || 0;
    if (d >= prevStart && d < start && t.type === "Expense" && !isInvest(t)) prevSpent += a;
    if (d < start || d > end) return;
    logged.add(d);
    if (isInvest(t)) week.invested += a;
    else if (t.type === "Income") week.earned += a;
    else if (t.type === "Expense") {
      week.spent += a;
      const cat = t.name || t.subType || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + a;
      byDay[d] = (byDay[d] || 0) + a;
    }
  });

  if (!logged.size && !prevSpent) return null;
  const categories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const biggest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    start,
    end,
    ...week,
    net: week.earned - week.spent,
    prevSpent,
    change: prevSpent > 0 ? (week.spent - prevSpent) / prevSpent : null,
    categories,
    biggestDay: biggest ? { date: biggest[0], amount: biggest[1] } : null,
    daysLogged: logged.size,
  };
};

/** Whole calendar days from ISO date a to ISO date b (b - a). */
const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY);

/**
 * Average spend per calendar day, from the first logged expense up to today.
 * Days with no spending count as ₹0 days — dividing by only the days that
 * had an entry would inflate the average.
 * transactions: raw transactions (any type); investments, income and
 * future-dated entries are ignored.
 * Returns { total, days, daysWithSpend, avg, first, last }.
 */
export const dailySpendAverage = (transactions, { today = localISODate(), includeToday = true } = {}) => {
  const end = includeToday ? today : isoDaysAgo(today, 1);
  let total = 0;
  let first = null;
  let last = null;
  const spendDays = new Set();
  (transactions || []).forEach((t) => {
    if (t.type !== "Expense" || isInvest(t)) return;
    const d = txDay(t.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > end) return;
    total += Number(t.amount) || 0;
    spendDays.add(d);
    if (!first || d < first) first = d;
    if (!last || d > last) last = d;
  });
  if (!first) return { total: 0, days: 0, daysWithSpend: 0, avg: 0, first: null, last: null };
  const days = daysBetween(first, end) + 1;
  return { total, days, daysWithSpend: spendDays.size, avg: total / days, first, last };
};

/**
 * Today's spending against the daily average of the previous 30 days
 * (or fewer, if logging started less than 30 days ago).
 * expenses: [{ date: "YYYY-MM-DD", amount }]. Returns null with no history.
 */
export const spendingToday = (expenses, today = localISODate()) => {
  const from = isoDaysAgo(today, 30);
  let todaySpent = 0;
  let past = 0;
  let earliest = null;
  const seen = new Set();
  expenses.forEach(({ date, amount }) => {
    const a = Number(amount) || 0;
    if (date && date < today && (!earliest || date < earliest)) earliest = date;
    if (date === today) todaySpent += a;
    else if (date >= from && date < today) {
      past += a;
      seen.add(date);
    }
  });
  // Need a little history before comparing, or the "average" is noise
  if (seen.size < 5) return { todaySpent, avg: null, diff: null };
  // Divide by the calendar days actually covered: a full 30, or since the first entry
  const windowDays = Math.min(30, daysBetween(earliest, today));
  const avg = past / windowDays;
  return { todaySpent, avg, diff: todaySpent - avg };
};
