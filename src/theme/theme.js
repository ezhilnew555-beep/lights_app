// ─────────────────────────────────────────────────────────────────────
// LigthsON Design System — "Pulse"
// ─────────────────────────────────────────────────────────────────────
// Source of truth: Design/pulse/Pulse.dc.html (light + dark token sets).
// Lime accent, graphite ink, sage-grey neutrals. Space Grotesk for text,
// JetBrains Mono (tabular) for every number, label and overline.
//
// Token objects (P, COLORS) are mutable: applyTheme() swaps their values in
// place, and themedStyles() rebuilds StyleSheets for the active theme, so the
// same static-looking `styles.x` / `COLORS.x` code works in light and dark.
// ─────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

// ── PULSE PALETTES (verbatim from the design) ───────────────────────

const PULSE_LIGHT = {
  bg: '#EEF1EC',
  surf: '#FFFFFF',
  surf2: '#E3E8E1',
  ink: '#0C110E',
  ink2: '#3E4A43',
  mute: '#5B675F',
  line: '#D3DAD2',
  acc: '#C6F432',
  accInk: '#0C110E',
  accTx: '#476600',
  pos: '#0E8246',
  posSoft: '#D6F1E1',
  neg: '#D22F2F',
  negSoft: '#FADFDF',
  inv: '#3450CC',
  invSoft: '#E0E6FF',
  amber: '#A05E00',
  a1: '#0C110E',
  a2: '#3450CC',
  a3: '#0E8246',
  a4: '#9FC21E',
  a5: '#A7B0A9',
  tabOn: '#0C110E',
  tabOff: '#8C978F',
  tabOnBg: '#C6F432',
  tabOnInk: '#0C110E',
  dock: '#0C110E',
  dockMic: '#FFFFFF',
};

const PULSE_DARK = {
  bg: '#0A0C0B',
  surf: '#131715',
  surf2: '#1C221F',
  ink: '#E9F0EB',
  ink2: '#AAB6AE',
  mute: '#7F8C84',
  line: '#252D28',
  acc: '#C6F432',
  accInk: '#0A0C0B',
  accTx: '#C6F432',
  pos: '#3DDC84',
  posSoft: '#10301F',
  neg: '#FF6B6B',
  negSoft: '#3A1618',
  inv: '#8FA8FF',
  invSoft: '#1A2140',
  amber: '#FFC247',
  a1: '#C6F432',
  a2: '#8FA8FF',
  a3: '#3DDC84',
  a4: '#FFC247',
  a5: '#5E6A63',
  tabOn: '#0A0C0B',
  tabOff: '#8C978F',
  tabOnBg: '#C6F432',
  tabOnInk: '#0A0C0B',
  dock: '#1A201C',
  dockMic: '#E9F0EB',
};

// Derived roles the legacy screens need. "solid" is a filled surface that
// stays dark in both themes, so text/icons drawn on it (onSolid) stay light.
const derive = (p, dark) => ({
  ...p,
  primary: p.ink,                          // brand foreground (icons, links, active text)
  solid: dark ? '#26302A' : '#0C110E',     // filled buttons / headers
  solid2: dark ? '#303B34' : '#28322C',    // gradient partner for solid
  onSolid: dark ? '#E9F0EB' : '#FFFFFF',   // text on solid / coloured fills
  amberSoft: dark ? '#3A2A0E' : '#F6E9D2',
  accSoft: dark ? '#2A3312' : '#EEF9CC',
  overlay: dark ? 'rgba(0,0,0,0.7)' : 'rgba(12,17,14,0.55)',
  overlayHeavy: dark ? 'rgba(0,0,0,0.85)' : 'rgba(12,17,14,0.8)',
  statusBar: dark ? 'light-content' : 'dark-content',
  shadow: '#000000',
  skeleton: dark ? '#252D28' : '#DDE3DB',
  disabled: dark ? '#303B34' : '#C9D0C8',
});

export const PALETTES = {
  light: derive(PULSE_LIGHT, false),
  dark: derive(PULSE_DARK, true),
};

// Active Pulse tokens (mutable — see applyTheme)
export const P = { ...PALETTES.light };

// ── LEGACY COLOR NAMES → PULSE ──────────────────────────────────────
// Existing screens reference these names; they now resolve to Pulse values.

const legacyFrom = (t) => ({
  primary: t.primary,
  primaryLight: t.ink2,
  primarySoft: t.surf2,
  primaryDark: t.solid,
  primaryFill: t.solid,
  primaryFill2: t.solid2,

  income: t.pos,
  incomeSoft: t.posSoft,
  expense: t.neg,
  expenseSoft: t.negSoft,

  success: t.pos,
  warning: t.amber,
  warningSoft: t.amberSoft,
  error: t.neg,
  info: t.inv,

  amber: t.amber,
  amberSoft: t.amberSoft,
  flame: t.amber,
  flameSoft: t.amberSoft,

  indigo: t.inv,
  indigoSoft: t.invSoft,

  accent: t.acc,
  accentInk: t.accInk,
  accentText: t.accTx,

  background: t.bg,
  surface: t.surf,
  surfaceRaised: t.surf,
  surfaceMuted: t.surf2,
  skeleton: t.skeleton,

  border: t.line,
  borderLight: t.line,
  borderFocus: t.ink,
  borderError: t.neg,

  overlay: t.overlay,
  overlayHeavy: t.overlayHeavy,

  textPrimary: t.ink,
  textSecondary: t.ink2,
  textMuted: t.mute,
  textInverse: t.onSolid,
  textLink: t.accTx,

  disabled: t.disabled,
  disabledText: t.mute,
});

export const COLORS = legacyFrom(P);

// ── THEME SWITCHING ─────────────────────────────────────────────────

let themeMode = 'light';
let themeVersion = 0;
const listeners = new Set();

export const getThemeMode = () => themeMode;
export const getThemeVersion = () => themeVersion;

export const applyTheme = (mode) => {
  const next = mode === 'dark' ? 'dark' : 'light';
  if (next === themeMode) return;
  themeMode = next;
  Object.assign(P, PALETTES[next]);
  Object.assign(COLORS, legacyFrom(P));
  themeVersion += 1;
  listeners.forEach((fn) => fn(next));
};

export const subscribeTheme = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Wrap a StyleSheet factory so it is rebuilt for the active theme.
 * Usage: const styles = themedStyles(() => StyleSheet.create({ ... }));
 * `styles.x` then always returns the style for the current theme.
 */
export const themedStyles = (factory) => {
  let cache = null;
  let cachedVersion = -1;
  const resolve = () => {
    if (cachedVersion !== themeVersion || !cache) {
      cache = factory();
      cachedVersion = themeVersion;
    }
    return cache;
  };
  return new Proxy(
    {},
    {
      get: (_, key) => resolve()[key],
      has: (_, key) => key in resolve(),
      ownKeys: () => Reflect.ownKeys(resolve()),
      getOwnPropertyDescriptor: (_, key) => {
        const d = Object.getOwnPropertyDescriptor(resolve(), key);
        if (d) d.configurable = true;
        return d;
      },
    }
  );
};

// ── FONTS ───────────────────────────────────────────────────────────
// Registered in App.js via expo-font. One family per weight, because Android
// cannot synthesise weights for custom fonts.

export const FONT_FILES = {
  SpaceGrotesk_300Light: require('@expo-google-fonts/space-grotesk/300Light/SpaceGrotesk_300Light.ttf'),
  SpaceGrotesk_400Regular: require('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
  SpaceGrotesk_500Medium: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
  SpaceGrotesk_600SemiBold: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
  SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
  JetBrainsMono_400Regular: require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  JetBrainsMono_600SemiBold: require('@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf'),
  JetBrainsMono_700Bold: require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
};

const SANS = {
  300: 'SpaceGrotesk_300Light',
  400: 'SpaceGrotesk_400Regular',
  500: 'SpaceGrotesk_500Medium',
  600: 'SpaceGrotesk_600SemiBold',
  700: 'SpaceGrotesk_700Bold',
};
const MONO = {
  400: 'JetBrainsMono_400Regular',
  500: 'JetBrainsMono_500Medium',
  600: 'JetBrainsMono_600SemiBold',
  700: 'JetBrainsMono_700Bold',
};

export const normalizeWeight = (w) => {
  if (w === 'bold') return 700;
  if (w === 'normal' || w == null) return 400;
  const n = parseInt(w, 10);
  return Number.isFinite(n) ? n : 400;
};

const pick = (map, weight) => {
  const n = normalizeWeight(weight);
  const keys = Object.keys(map).map(Number);
  const best = keys.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
  return map[best];
};

export const FONTS = {
  sans: (weight = 400) => pick(SANS, weight),
  mono: (weight = 400) => pick(MONO, weight),
  SANS,
  MONO,
};

export const isPulseFamily = (f) =>
  typeof f === 'string' && (f.startsWith('SpaceGrotesk_') || f.startsWith('JetBrainsMono_'));

// ── TYPOGRAPHY SCALE (from the design) ──────────────────────────────

export const TYPOGRAPHY = {
  // Hero monetary figures (Net cash flow, amount entry)
  display: { fontSize: 42, fontWeight: '600', lineHeight: 44, letterSpacing: -1.6, fontFamily: MONO[600] },
  // Big screen titles ("Wealth", "F.I.R.E.")
  title: { fontSize: 30, fontWeight: '600', lineHeight: 32, letterSpacing: -0.9, fontFamily: SANS[600] },
  // Stack screen titles ("Add expense")
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26, letterSpacing: -0.4, fontFamily: SANS[600] },
  // Section headers ("Today", "Due soon")
  subheading: { fontSize: 16, fontWeight: '600', lineHeight: 22, letterSpacing: 0, fontFamily: SANS[600] },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22, letterSpacing: 0, fontFamily: SANS[400] },
  // Money in lists
  mono: { fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0, fontFamily: MONO[600] },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: 0, fontFamily: SANS[400] },
  // Mono uppercase labels ("NET CASH FLOW · SEP")
  overline: { fontSize: 11, fontWeight: '400', lineHeight: 14, letterSpacing: 0.66, textTransform: 'uppercase', fontFamily: MONO[400] },
};

// ── SPACING & LAYOUT GRID ───────────────────────────────────────────

export const SPACING = {
  '2': 2,
  '4': 4,
  '6': 6,
  '8': 8,
  '10': 10,
  '12': 12,
  '14': 14,
  '16': 16,
  '20': 20,
  '24': 24,
  '32': 32,
  '40': 40,
  '48': 48,
};

export const LAYOUT = {
  screenPadding: 16,       // Horizontal screen padding (design: 16)
  cardPadding: 14,         // Internal card padding (design: 14)
  sectionGap: 14,          // Vertical space between sections
  itemGap: 8,
  inlineGap: 8,
};

// ── CORNER RADIUS ───────────────────────────────────────────────────

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,       // inputs, icon buttons
  lg: 14,       // cards, primary buttons
  xl: 16,
  '2xl': 22,    // dock
  full: 9999,
};

// ── SHADOWS ─────────────────────────────────────────────────────────
// Pulse is flat: surfaces are separated by 1px lines, not drop shadows.

const createShadow = (elevation) => {
  if (Platform.OS === 'android') return { elevation: 0 };
  return {
    shadowColor: '#0C110E',
    shadowOffset: { width: 0, height: Math.round(elevation * 0.5) },
    shadowOpacity: Math.min(0.02 + elevation * 0.008, 0.08),
    shadowRadius: Math.round(elevation * 1.5),
  };
};
export const SHADOWS = {
  sm: { ...createShadow(1) },
  md: { ...createShadow(2) },
  lg: { ...createShadow(4) },
  xl: { ...createShadow(6) },
};

export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
};
