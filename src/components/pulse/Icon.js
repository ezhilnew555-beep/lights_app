// Pulse line icons — path data taken verbatim from the design
// (24×24 grid, 1.8 stroke, round caps/joins).

import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { P } from "../../theme/theme";

const ICONS = {
  moon: [["path", "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"]],
  sun: [
    ["circle", 12, 12, 4],
    ["path", "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  ],
  back: [["path", "m15 18-6-6 6-6"]],
  chevron: [["path", "m9 6 6 6-6 6"]],
  chevronDown: [["path", "m6 9 6 6 6-6"]],
  arrowRight: [["path", "M5 12h14M13 6l6 6-6 6"]],
  coin: [
    ["circle", 12, 12, 9],
    // Rupee sign (the design used a dollar glyph; LigthsON is ₹-only)
    ["path", "M8.5 7.5h7M8.5 10.5h7M10 7.5h1.5a2.5 2.5 0 0 1 0 5H9l4.5 4.5"],
  ],
  expense: [["path", "M7 7l10 10M17 8v9H8"]],
  income: [["path", "M7 17 17 7M8 7h9v9"]],
  chart: [["path", "M3 3v18h18"], ["path", "m7 15 4-4 3 3 5-6"]],
  report: [
    ["path", "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"],
    ["path", "M14 3v5h5M9 13h6M9 17h6"],
  ],
  bell: [["path", "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"], ["path", "M10 21h4"]],
  plus: [["path", "M12 5v14M5 12h14"]],
  check: [["path", "m5 12 5 5 9-10"]],
  bolt: [["path", "M13 2 4 14h7l-1 8 9-12h-7z"]],
  phone: [["path", "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"]],
  close: [["path", "M6 6l12 12M18 6 6 18"]],
  mic: [["rect", 9, 3, 6, 11, 3], ["path", "M5 11a7 7 0 0 0 14 0M12 18v3"]],
  pin: [["path", "M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"], ["circle", 12, 9, 2.5]],
  download: [["path", "M12 3v12m-5-5 5 5 5-5M4 21h16"]],
  notes: [["path", "M4 4h16v11l-5 5H4z"], ["path", "M15 20v-5h5M8 9h8M8 13h4"]],
  logout: [["path", "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"]],
  gift: [
    ["rect", 3, 8, 18, 5, 1],
    ["path", "M5 13v8h14v-8M12 8v13M12 8c-1-3-3-5-5-4s0 4 5 4zm0 0c1-3 3-5 5-4s0 4-5 4z"],
  ],
  lock: [["rect", 5, 11, 14, 10, 2], ["path", "M8 11V7a4 4 0 0 1 8 0v4"]],
  home: [["path", "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"]],
  target: [["circle", 12, 12, 9], ["circle", 12, 12, 5], ["circle", 12, 12, 1]],
  user: [["circle", 12, 8, 4], ["path", "M4 21c0-4 4-6 8-6s8 2 8 6"]],
  search: [["circle", 11, 11, 7], ["path", "m20 20-3.5-3.5"]],
  calendar: [["rect", 3, 5, 18, 16, 2], ["path", "M16 3v4M8 3v4M3 10h18"]],
  trash: [["path", "M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"]],
  edit: [["path", "M4 20h4L19 9l-4-4L4 16z"], ["path", "m14 6 4 4"]],
  share: [["path", "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5"]],
  info: [["circle", 12, 12, 9], ["path", "M12 11v5M12 8h.01"]],
  settings: [
    ["circle", 12, 12, 3],
    ["path", "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"],
  ],
  wallet: [["path", "M3 7a2 2 0 0 1 2-2h13v4"], ["rect", 3, 7, 18, 13, 2], ["path", "M16 13h2"]],
  refresh: [["path", "M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"]],
  undo: [["path", "M9 14 4 9l5-5"], ["path", "M4 9h11a5 5 0 0 1 0 10h-3"]],
  alert: [["path", "M12 3 2 20h20z"], ["path", "M12 10v4M12 17h.01"]],
  eye: [["path", "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"], ["circle", 12, 12, 3]],
  eyeOff: [
    ["path", "M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.7 3.6M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"],
    ["path", "M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"],
  ],
  offline: [
    ["path", "M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.2-1.6M1.4 9a16 16 0 0 1 4.4-2.7M22.6 9a16 16 0 0 0-11.2-4.4"],
    ["path", "M12 20h.01"],
  ],
  sparkle: [["path", "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"]],
  flame: [["path", "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 4 0-2-1-4-2-5-1 4-4 6-4 10a7 7 0 0 0 7 7z"]],
  trophy: [
    ["path", "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"],
    ["path", "M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"],
  ],
  repeat: [["path", "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"]],
  check2: [["circle", 12, 12, 9], ["path", "m8 12 3 3 5-6"]],
  circle: [["circle", 12, 12, 9]],
  clock: [["circle", 12, 12, 9], ["path", "M12 7v5l3 2"]],
};

const Icon = ({ name, size = 20, color, strokeWidth = 1.8, fill = "none", style }) => {
  const parts = ICONS[name];
  if (!parts) return null;
  const stroke = color || P.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {parts.map((p, i) => {
        if (p[0] === "path") return <Path key={i} d={p[1]} />;
        if (p[0] === "circle") return <Circle key={i} cx={p[1]} cy={p[2]} r={p[3]} />;
        if (p[0] === "rect") return <Rect key={i} x={p[1]} y={p[2]} width={p[3]} height={p[4]} rx={p[5]} />;
        return null;
      })}
    </Svg>
  );
};

export const ICON_NAMES = Object.keys(ICONS);
export default Icon;
