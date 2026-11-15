// Preview stand-in for src/services/breakoutService.js (sample session).
export const BREAKOUT_UNLOCK_COST = 10000;

const s = (symbol, Close, pct, breakout_down, next_targets, rsi, vol_chg, Vwap) => ({
  id: symbol, symbol, Close, pct, breakout_down, next_targets, rsi, vol_chg, Vwap,
});

export const getBreakoutSignals = async () => {
  const locked = typeof window !== "undefined" && /[?&]locked=1\b/.test(window.location.search);
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (locked) return { stocks: [], sessionDate: d, locked: true, coins: 6480 };
  return {
    sessionDate: d,
    locked: false,
    coins: 12480,
    stocks: [
      s("BEL", 312.4, "4.82%", "Breakout", [328, 336.2, 349.5], 64.2, "2.4×", 305.1),
      s("IRCTC", 884.1, "3.10%", "St Breakout", [918, 936.4, 962], 61.3, "1.8×", 871.6),
      s("HAL", 4521.35, "2.64%", "Breakout", "[4630, 4712.5, 4890]", 67.8, "2.1×", 4466.2),
      s("TATAPOWER", 438.9, "1.95%", "St Breakout", [449.5, 458, 472.2], 58.4, "1.5×", 433.7),
      s("ZEEL", 131.2, "-3.42%", "Breakdown", [125.6, 121.4, 116], 34.1, "2.1×", 135.8),
      s("IDEA", 14.62, "-2.18%", "St Breakdown", [14.1, 13.7, 13.2], 38.6, "1.6×", 14.95),
    ],
  };
};
