// Money / number formatting in the Pulse style (Indian grouping, ₹, L / Cr).
// In privacy mode (ux/privacy.js) amounts render as "₹ ••••"; pass
// { reveal: true } where a real figure is required (share text, exports).

import { MASK, amountsHidden } from "../ux/privacy";

const toNum = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** ₹1,12,000 — full Indian grouping, no decimals */
export const inr = (v, { sign = false, decimals = 0, reveal = false } = {}) => {
  if (!reveal && amountsHidden()) return `₹${MASK}`;
  const n = toNum(v);
  const abs = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = n < 0 ? "−" : sign && n > 0 ? "+" : "";
  return `${prefix}₹${abs}`;
};

/** ₹42.6L / ₹3.48 Cr / ₹18,000 — compact for hero figures and allocation rows */
export const inrCompact = (v, { sign = false, reveal = false } = {}) => {
  if (!reveal && amountsHidden()) return `₹${MASK}`;
  const n = toNum(v);
  const abs = Math.abs(n);
  const prefix = n < 0 ? "−" : sign && n > 0 ? "+" : "";
  let body;
  if (abs >= 1e7) body = `${(abs / 1e7).toFixed(abs >= 1e9 ? 0 : 2)} Cr`;
  else if (abs >= 1e5) body = `${(abs / 1e5).toFixed(abs >= 1e6 ? 1 : 2)}L`;
  else body = Math.round(abs).toLocaleString("en-IN");
  return `${prefix}₹${body}`;
};

/**
 * Amount inputs keep a plain number string ("12450.5") in state and show it
 * grouped while typing ("12,450.5"). parseAmountInput returns the plain
 * string for a keystroke, or null to reject it.
 */
export const groupAmountInput = (raw) => {
  if (raw === undefined || raw === null || raw === "") return "";
  const [i, d] = String(raw).split(".");
  const whole = i ? Number(i).toLocaleString("en-IN") : "0";
  return d !== undefined ? `${whole}.${d}` : whole;
};
export const parseAmountInput = (text) => {
  const t = String(text).replace(/[,\s₹]/g, "");
  if (!/^\d{0,12}(\.\d{0,2})?$/.test(t)) return null;
  return t.replace(/^0+(?=\d)/, "");
};

/** +14.2% */
export const pct = (v, { sign = true, decimals = 1 } = {}) => {
  const n = toNum(v);
  const s = Math.abs(n).toFixed(decimals);
  const prefix = n < 0 ? "−" : sign && n > 0 ? "+" : "";
  return `${prefix}${s}%`;
};

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * "2026-10-06" for the device's local calendar day. Use instead of
 * toISOString().split("T")[0], which is the UTC day — in India that is still
 * yesterday until 5:30 AM.
 */
export const localISODate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Wed · 23 Sep" */
export const dayStamp = (d = new Date()) => `${DAYS_SHORT[d.getDay()]} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

/** "Morning" / "Afternoon" / "Evening" */
export const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};

/** "9:40 AM" from an ISO string / Date / Firestore timestamp */
export const timeOf = (v) => {
  let d = null;
  if (!v) return "";
  if (v instanceof Date) d = v;
  else if (typeof v === "string") d = new Date(v);
  else if (v && typeof v.toDate === "function") d = v.toDate();
  else if (v && v.seconds) d = new Date(v.seconds * 1000);
  if (!d || isNaN(d.getTime())) return "";
  // Date-only strings carry no time of day
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
};

/** Two-letter initials from a name or email */
export const initials = (name = "") => {
  const clean = String(name).split("@")[0].replace(/[._-]+/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export { toNum };
