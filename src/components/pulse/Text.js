// Pulse typography layer.
// Drop-in replacements for React Native's Text / TextInput that map
// fontWeight onto the matching Space Grotesk / JetBrains Mono file, and set
// money-like strings ("₹1,240", "+0.42%", "12,480") in tabular mono, as the
// Pulse design does.

import React, { createContext, forwardRef, useContext } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";
import { FONTS, P, isPulseFamily, normalizeWeight } from "../../theme/theme";

const MONO_HINT = /mono|courier|menlo|jetbrains/i;
const NUMERIC =
  /^[+\-−–]?\s*[₹$]?\s*[+\-−–]?\s*\d[\d,]*(\.\d+)?\s*(%|L|Cr|K|k|M|×|x|\/mo|\/yr|\/-|coins)?$/;

// Parent font context so nested <Text> inherits weight/family like RN does.
const FontContext = createContext(null);

const plainText = (children) => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children).trim();
  }
  if (Array.isArray(children) && children.length > 0) {
    let out = "";
    for (const c of children) {
      if (typeof c === "string" || typeof c === "number") out += c;
      else if (c === null || c === undefined || c === false) continue;
      else return null;
    }
    return out.trim();
  }
  return null;
};

export const isMoneyLike = (s) => !!s && s.length <= 24 && NUMERIC.test(s);

const resolveFont = (style, parent, text, forceMono) => {
  const flat = StyleSheet.flatten(style) || {};
  const ownFamily = flat.fontFamily;
  const hasOwnWeight = flat.fontWeight !== undefined;

  if (isPulseFamily(ownFamily)) {
    return { family: ownFamily, weight: normalizeWeight(flat.fontWeight), mono: ownFamily.startsWith("JetBrains") };
  }

  const weight = hasOwnWeight
    ? normalizeWeight(flat.fontWeight)
    : parent
      ? parent.weight
      : 400;

  let mono;
  if (forceMono !== undefined) mono = forceMono;
  else if (ownFamily && MONO_HINT.test(ownFamily)) mono = true;
  else if (!ownFamily && parent) mono = parent.mono;
  else mono = false;
  if (!mono && forceMono === undefined && isMoneyLike(text)) mono = true;

  return {
    family: mono ? FONTS.mono(weight) : FONTS.sans(weight),
    weight,
    mono,
  };
};

// System font size is honoured up to a cap: large enough to help, small
// enough that the 40px hero figures and the dock don't break their layout.
// Big text (titles, figures) already reads well, so it scales less.
const scaleCap = (style) => {
  const size = (StyleSheet.flatten(style) || {}).fontSize || 14;
  return size >= 28 ? 1.15 : size >= 20 ? 1.3 : 1.5;
};

export const Text = forwardRef(function PulseText({ style, mono, children, maxFontSizeMultiplier, ...rest }, ref) {
  const parent = useContext(FontContext);
  const font = resolveFont(style, parent, plainText(children), mono);
  const node = (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? scaleCap(style)}
      {...rest}
      style={[style, { fontFamily: font.family, fontWeight: "normal" }]}
    >
      {children}
    </RNText>
  );
  return <FontContext.Provider value={font}>{node}</FontContext.Provider>;
});

export const TextInput = forwardRef(function PulseTextInput({ style, mono, keyboardType, ...rest }, ref) {
  const numeric =
    mono !== undefined
      ? mono
      : keyboardType === "numeric" ||
        keyboardType === "decimal-pad" ||
        keyboardType === "number-pad" ||
        keyboardType === "phone-pad";
  const font = resolveFont(style, null, null, numeric);
  // RN defaults input text to black, which vanishes on dark surfaces. Default
  // to the theme ink; a screen's own color / placeholderTextColor still wins.
  return (
    <RNTextInput
      ref={ref}
      maxFontSizeMultiplier={1.4}
      keyboardType={keyboardType}
      placeholderTextColor={P.mute}
      selectionColor={P.accTx}
      {...rest}
      style={[{ color: P.ink }, style, { fontFamily: font.family, fontWeight: "normal" }]}
    />
  );
});

// Keep static members (e.g. TextInput.State) available on the wrappers.
Object.keys(RNTextInput).forEach((k) => {
  if (!(k in TextInput)) {
    try {
      TextInput[k] = RNTextInput[k];
    } catch (e) {}
  }
});

export default Text;
