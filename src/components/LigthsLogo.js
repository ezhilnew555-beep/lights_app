// Legacy entry point for the brand logo — now renders the LigthsON "ON" mark
// plus wordmark. Prefer components/brand/LigthsOnLogo in new code.
import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./pulse/Text";
import { P, themedStyles } from "../theme/theme";
import { LigthsOnMark } from "./brand/LigthsOnLogo";

const LigthsLogo = ({ size = 160, style }) => (
  <View style={[styles.row, style]}>
    <LigthsOnMark size={size * 0.35} />
    <Text style={[styles.word, { fontSize: size * 0.18 }]}>LigthsON</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    word: { fontWeight: "600", color: P.ink, letterSpacing: -0.4 },
  })
);

export default LigthsLogo;
