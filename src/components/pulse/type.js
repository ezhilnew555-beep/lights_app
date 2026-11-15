// Pulse type helpers. Kept in their own module so forms.js and feedback.js
// can use them without importing index.js (which imports them back) — a
// require cycle can hand a module half-initialised exports.

import React from "react";
import { StyleSheet } from "react-native";
import { Text } from "./Text";
import { P, FONTS } from "../../theme/theme";

/** Mono uppercase label — "NET CASH FLOW · SEP" */
export const Overline = ({ children, color, style, size = 11, ...rest }) => (
  <Text mono style={[styles.overline, { fontSize: size, color: color || P.mute }, style]} {...rest}>
    {children}
  </Text>
);

/** Tabular mono figure */
export const Mono = ({ children, size = 14, weight = "600", color, style, ...rest }) => (
  <Text mono style={[{ fontSize: size, fontWeight: weight, color: color || P.ink }, style]} {...rest}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  overline: {
    fontFamily: FONTS.mono(400),
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
});
