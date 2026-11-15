// Shareable F.I.R.E. progress card. Rendered as a one-page, square PDF with
// expo-print (no native screenshot module needed) and handed to the share
// sheet. In privacy mode the card shows the percentage only, no rupees.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { inrCompact } from "./format";
import { amountsHidden } from "../ux/privacy";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const cardHtml = ({ pct, invested, target, yearsToGo }) => {
  const p = Math.max(0, Math.min(100, pct || 0));
  const r = 120;
  const c = 2 * Math.PI * r;
  const showMoney = !amountsHidden() && target > 0;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: 540px 540px; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 540px; height: 540px; background: #0A0C0B; color: #E9F0EB;
    font-family: -apple-system, Roboto, "Segoe UI", sans-serif; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 22px; }
  .over { font: 600 13px/1 monospace; letter-spacing: 2.4px; color: #7F8C84; text-transform: uppercase; }
  .ring { position: relative; width: 280px; height: 280px; }
  .ring svg { position: absolute; inset: 0; }
  .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .pct { font: 700 64px/1 monospace; letter-spacing: -2px; color: #FFFFFF; }
  .sub { font-size: 15px; color: #AAB6AE; }
  .money { font: 600 18px/1.4 monospace; color: #E9F0EB; text-align: center; }
  .brand { font-weight: 700; font-size: 16px; color: #C6F432; letter-spacing: 0.5px; }
  </style></head><body>
  <div class="over">My F.I.R.E. progress</div>
  <div class="ring">
    <svg width="280" height="280" viewBox="0 0 280 280">
      <circle cx="140" cy="140" r="${r}" fill="none" stroke="#1E2621" stroke-width="18"/>
      <circle cx="140" cy="140" r="${r}" fill="none" stroke="#C6F432" stroke-width="18" stroke-linecap="round"
        stroke-dasharray="${((c * p) / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 140 140)"/>
    </svg>
    <div class="mid"><div class="pct">${p.toFixed(0)}%</div><div class="sub">to financial freedom</div></div>
  </div>
  ${
    showMoney
      ? `<div class="money">${esc(inrCompact(invested, { reveal: true }))} of ${esc(inrCompact(target, { reveal: true }))}</div>`
      : ""
  }
  ${yearsToGo > 0 ? `<div class="sub">${esc(yearsToGo)} years to go</div>` : ""}
  <div class="brand">LigthsON</div>
  </body></html>`;
};

/** Opens the share sheet with the card. Throws if sharing isn't possible. */
export const shareFireCard = async (data) => {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
  const { uri } = await Print.printToFileAsync({ html: cardHtml(data), width: 540, height: 540 });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Share your F.I.R.E. progress",
  });
};
