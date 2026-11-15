// Line + soft area price chart in the Pulse style (design: stock artboard).
// Drag a finger across it to read the price at any point; the readout
// replaces the caption while touching.

import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, PanResponder } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle } from "react-native-svg";
import { Text } from "./pulse";
import { P, themedStyles } from "../theme/theme";
import { inr } from "../utils/format";

const H = 168;
const PAD_Y = 10;

const fmtStamp = (ts, intraday) => {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return intraday
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/**
 * @param {number[]} prices
 * @param {number[]} timestamps unix seconds, same length as prices
 * @param {boolean} intraday   label points with time instead of date
 */
const PriceChart = ({ prices = [], timestamps = [], intraday = false, loading = false }) => {
  const [w, setW] = useState(0);
  const [active, setActive] = useState(null);

  const points = useMemo(() => {
    const out = [];
    prices.forEach((p, i) => {
      if (typeof p === "number" && Number.isFinite(p)) out.push({ p, t: timestamps[i] });
    });
    return out;
  }, [prices, timestamps]);

  const geo = useMemo(() => {
    if (points.length < 2 || !w) return null;
    const vals = points.map((x) => x.p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const xy = points.map((x, i) => [
      (i / (points.length - 1)) * w,
      PAD_Y + (1 - (x.p - min) / span) * (H - PAD_Y * 2),
    ]);
    return { xy, min, max, line: xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ") };
  }, [points, w]);

  const up = points.length > 1 ? points[points.length - 1].p >= points[0].p : true;
  const color = up ? P.pos : P.neg;
  const soft = up ? P.posSoft : P.negSoft;

  const geoRef = useRef(null);
  geoRef.current = geo;
  const pick = (x) => {
    const g = geoRef.current;
    if (!g) return;
    const i = Math.round((Math.max(0, Math.min(x, w)) / w) * (g.xy.length - 1));
    setActive(i);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
        onPanResponderRelease: () => setActive(null),
        onPanResponderTerminate: () => setActive(null),
      }),
    [w]
  );

  const change = points.length > 1 ? points[points.length - 1].p - points[0].p : 0;
  const changePct = points.length > 1 && points[0].p ? (change / points[0].p) * 100 : 0;
  const a = active !== null && geo ? { ...points[active], xy: geo.xy[active] } : null;

  return (
    <View>
      <View style={styles.readout}>
        {a ? (
          <Text style={styles.readoutText}>
            <Text mono style={styles.readoutValue}>{inr(a.p, { decimals: 2, reveal: true })}</Text>
            {"  "}
            {fmtStamp(a.t, intraday)}
          </Text>
        ) : points.length > 1 ? (
          <Text style={styles.readoutText}>
            Period{" "}
            <Text mono style={{ color }}>
              {change >= 0 ? "+" : "−"}
              {Math.abs(changePct).toFixed(2)}%
            </Text>
            {"  ·  "}drag to inspect
          </Text>
        ) : (
          <Text style={styles.readoutText}>{loading ? "Loading chart…" : "No price history available"}</Text>
        )}
      </View>
      <View
        style={{ height: H }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
        accessibilityLabel={`Price chart, ${up ? "rising" : "falling"} ${Math.abs(changePct).toFixed(1)} percent over the period`}
      >
        {geo ? (
          <Svg width={w} height={H}>
            <Polygon points={`0,${H} ${geo.line} ${w},${H}`} fill={soft} />
            <Polyline points={geo.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {a ? (
              <>
                <Line x1={a.xy[0]} x2={a.xy[0]} y1={0} y2={H} stroke={P.mute} strokeWidth={1} strokeDasharray="3 3" />
                <Circle cx={a.xy[0]} cy={a.xy[1]} r={5} fill={color} stroke={P.bg} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    readout: { minHeight: 20, marginBottom: 6 },
    readoutText: { fontSize: 12, color: P.mute },
    readoutValue: { fontSize: 13, fontWeight: "700", color: P.ink },
  })
);

export default PriceChart;
