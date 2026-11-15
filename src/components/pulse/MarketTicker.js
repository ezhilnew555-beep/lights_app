// Live index strip — "● LIVE  NIFTY 24,812.40 +0.42%   SENSEX …"
// Prices come from the shared poller in services/marketIndices (Yahoo Finance);
// a value flashes green/red for a moment when it moves.

import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView } from "react-native";
import { Text } from "./Text";
import { P } from "../../theme/theme";
import { useMarketIndices } from "../../services/marketIndices";

const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const IndexItem = ({ ix }) => {
  const prev = useRef(ix.price);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (prev.current !== ix.price) {
      setFlash(ix.price > prev.current ? "up" : "down");
      prev.current = ix.price;
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
  }, [ix.price]);

  const up = ix.changePct >= 0;
  return (
    <Text mono style={{ fontSize: 12, color: P.ink }}>
      <Text mono style={{ color: P.mute }}>
        {ix.label}
      </Text>{" "}
      <Text
        mono
        style={{
          color: flash === "up" ? P.pos : flash === "down" ? P.neg : P.ink,
          backgroundColor: flash === "up" ? P.posSoft : flash === "down" ? P.negSoft : "transparent",
        }}
      >
        {fmt(ix.price)}
      </Text>{" "}
      <Text mono style={{ color: up ? P.pos : P.neg }}>
        {up ? "+" : "−"}
        {Math.abs(ix.changePct).toFixed(2)}%
      </Text>
    </Text>
  );
};

const MarketTicker = ({ style }) => {
  const { indices, live } = useMarketIndices();
  return (
    <View
      style={[
        {
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: P.line,
          paddingVertical: 8,
          backgroundColor: P.bg,
        },
        style,
      ]}
      accessibilityLabel={
        indices.length
          ? indices.map((i) => `${i.name} ${fmt(i.price)}, ${i.changePct >= 0 ? "up" : "down"} ${Math.abs(i.changePct).toFixed(2)} percent`).join(". ")
          : "Loading market indices"
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 18, alignItems: "center" }}
      >
        <Text mono style={{ fontSize: 10, letterSpacing: 0.6, color: live ? P.pos : P.mute }}>
          {live ? "● LIVE" : "CLOSED"}
        </Text>
        {indices.length === 0 ? (
          <Text mono style={{ fontSize: 12, color: P.mute }}>
            Loading NIFTY · SENSEX · BANKNIFTY…
          </Text>
        ) : (
          indices.map((ix) => <IndexItem key={ix.symbol} ix={ix} />)
        )}
      </ScrollView>
    </View>
  );
};

export default MarketTicker;
