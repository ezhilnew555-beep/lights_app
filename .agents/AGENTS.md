# 💡 LigthsON — Impeccable Standard v3 ("Warm Precision")

Workspace rules for the LigthsON React Native (Expo 54) personal finance app.

---

## 🎯 1. Core Principles

1. **Uncompromising UI/UX ("Impeccable Standard")**:
   - Every screen, modal, and component must feel polished, modern, and premium.
   - Use dynamic visual hierarchy, structured card containers, soft layered shadows, rounded borders, and curated spacing.
   - Maintain visual consistency across all financial calculators, transaction logs, and gamification screens.

2. **Monetary Precision & Data Integrity**:
   - All financial figures must be cleanly formatted (`₹` currency symbol, `en-IN` locale thousands separation, standard decimal rounding).
   - Ensure clean validation on user inputs (prevent non-numeric input crashes, zero division errors in calculators).

3. **Performance & Responsiveness**:
   - Use relative and scaled units using `src/utils/responsive.js`.
   - Prevent unnecessary re-renders in charts and large lists.
   - Graceful offline state and async storage persistence.

---

## 🎨 2. Design System — Token Reference

**All UI values MUST be imported from `src/theme/theme.js`.** No hardcoded hex codes, font sizes, spacing values, or shadow definitions in screen files.

### Identity: "Warm Precision"
- **Teal primary** (`#0D9488`) — distinctive, unoccupied in Indian fintech
- **Coral expense** (`#E11D48`) — warmer than alarm-red, less fatigue
- **Warm Stone neutrals** — off-white canvas, charcoal text, no cold blues
- **Indigo investments** (`#4F46E5`) — authoritative for portfolio data

### Color Tokens
```
COLORS.primary       (#0D9488)  — CTAs, active tabs, links
COLORS.primaryLight  (#14B8A6)  — Hover/focus states, icon fills
COLORS.primarySoft   (#CCFBF1)  — Tag backgrounds, soft highlights
COLORS.primaryDark   (#0F766E)  — Pressed states, gradient anchors

COLORS.income        (#059669)  — Income figures, +% indicators
COLORS.incomeSoft    (#D1FAE5)  — Income row backgrounds
COLORS.expense       (#E11D48)  — Expense figures, -% indicators
COLORS.expenseSoft   (#FFE4E6)  — Expense row backgrounds

COLORS.success       (#059669)  — Operation success
COLORS.warning       (#D97706)  — Attention alerts
COLORS.warningSoft   (#FEF3C7)  — Warning card fills
COLORS.error         (#E11D48)  — Validation errors
COLORS.info          (#0D9488)  — Informational banners

COLORS.amber         (#D97706)  — Coin values, streak badges
COLORS.amberSoft     (#FEF3C7)  — Badge card fills
COLORS.flame         (#EA580C)  — FIRE progress, milestones
COLORS.flameSoft     (#FFF7ED)  — FIRE card light fills

COLORS.indigo        (#4F46E5)  — MF charts, SIP projections
COLORS.indigoSoft    (#EEF2FF)  — Investment card fills

COLORS.background    (#FAFAF9)  — Warm app canvas
COLORS.surface       (#FFFFFF)  — Card fill
COLORS.surfaceMuted  (#F5F5F4)  — Recessed areas, input backgrounds
COLORS.skeleton      (#E7E5E4)  — Shimmer placeholder

COLORS.border        (#E7E5E4)  — Input borders, card outlines
COLORS.borderLight   (#F5F5F4)  — Subtle internal dividers
COLORS.borderFocus   (#14B8A6)  — Teal input focus ring
COLORS.borderError   (#E11D48)  — Coral validation error border

COLORS.overlay       (rgba warm 0.6) — Modal backdrop
COLORS.overlayHeavy  (rgba warm 0.8) — Full-screen takeover

COLORS.textPrimary   (#1C1917)  — Headings, monetary values (warm charcoal)
COLORS.textSecondary (#57534E)  — Subheadings, labels
COLORS.textMuted     (#A8A29E)  — Placeholders, captions
COLORS.textInverse   (#FFFFFF)  — Text on dark fills
COLORS.textLink      (#0D9488)  — Tappable links

COLORS.disabled      (#D6D3D1)  — Disabled button fill
COLORS.disabledText  (#A8A29E)  — Disabled label text
```

### Typography Scale
```
TYPOGRAPHY.display    — 36/40, w800  — Hero monetary figures
TYPOGRAPHY.heading    — 22/28, w700  — Screen titles
TYPOGRAPHY.subheading — 17/22, w600  — Card titles, modal headers
TYPOGRAPHY.body       — 15/22, w400  — Body text, input values
TYPOGRAPHY.mono       — 15/20, w700  — Monetary figures in lists
TYPOGRAPHY.caption    — 13/18, w500  — Labels, metadata
TYPOGRAPHY.overline   — 11/14, w700  — Uppercase micro-text, tags
```

### Spacing & Layout
```
SPACING['4'] through SPACING['48'] — 4pt base grid
LAYOUT.screenPadding  = 16  — Horizontal page inset
LAYOUT.cardPadding    = 20  — Internal card content inset
LAYOUT.sectionGap     = 24  — Vertical space between sections
LAYOUT.itemGap        = 12  — Vertical space between list items
LAYOUT.inlineGap      = 8   — Horizontal inline spacing
```

### Radius
```
RADIUS.xs   = 4   — Progress bar tracks
RADIUS.sm   = 8   — Chips, small tags
RADIUS.md   = 12  — Inputs, buttons
RADIUS.lg   = 16  — Content cards
RADIUS.xl   = 20  — Prominent cards
RADIUS['2xl'] = 24 — Modals, FIRE card
RADIUS.full = 9999 — Circles, pill badges
```

### Shadows
```
SHADOWS.sm — Resting card (elevation 2)
SHADOWS.md — Interactive card (elevation 4)
SHADOWS.lg — Floating elements (elevation 8)
SHADOWS.xl — Hero cards (elevation 12, teal tint)
```

---

## 📐 3. Component Architecture & Patterns

### **Card Containers**
- Use **borderless elevation** (`SHADOWS.sm` or `SHADOWS.md`) over warm canvas (`COLORS.background`).
- Reserve `COLORS.border` for input fields and explicit dividers only.
- Standard padding: `LAYOUT.cardPadding` (20px).
- Standard radius: `RADIUS.lg` (16px) for content cards, `RADIUS['2xl']` (24px) for modals/hero.

### **Interactive Elements & Buttons**
- Minimum touch target size: 44×44 dp.
- Primary Action: `COLORS.primary` (teal) fill, `COLORS.textInverse` text, `RADIUS.md`, height 48–52 dp.
- Secondary/Ghost: `COLORS.surfaceMuted` fill or `COLORS.border` outline.
- Disabled: `COLORS.disabled` fill, `COLORS.disabledText` text. **Never use `opacity: 0.6`.**
- Always include `activeOpacity={0.7}` on `TouchableOpacity`.

### **Input Fields**
- Background: `COLORS.surfaceMuted` (`#F5F5F4`).
- Border: `COLORS.border` default → `COLORS.borderFocus` (teal) on focus → `COLORS.borderError` (coral) on error.
- Text: `COLORS.textPrimary`. Placeholder: `COLORS.textMuted`.

### **Semantic Color Usage**
- Income screens: Teal/green accent (`COLORS.income`, `COLORS.incomeSoft`)
- Expense screens: Coral accent (`COLORS.expense`, `COLORS.expenseSoft`)
- Investment screens: Indigo accent (`COLORS.indigo`, `COLORS.indigoSoft`)
- Gamification: Amber accent (`COLORS.amber`, `COLORS.amberSoft`)
- FIRE: Flame accent (`COLORS.flame`, `COLORS.flameSoft`)

---

## 🛠️ 4. Engineering & Code Standards

1. **Theme-First Rule**: Import `COLORS`, `TYPOGRAPHY`, `SPACING`, `LAYOUT`, `RADIUS`, `SHADOWS` from `../../theme/theme` (or appropriate relative path). No inline hex codes in StyleSheet.create blocks.

2. **React Native & Expo Guidelines**:
   - Keep functional components lean and modular.
   - Extract re-usable components into `src/components/`.
   - Never mutate state directly; leverage React state hooks cleanly.

3. **Navigation Guidelines**:
   - Use typed/defined route names in React Navigation stack.
   - Standardize headers with custom options (`headerOptions` helper in `App.js`).

4. **Firebase & Data Layer**:
   - Store configurations cleanly in `src/config/`.
   - Wrap async Firestore calls and Secure Storage reads in proper `try/catch` blocks with user-friendly error notifications.

---

## ✨ 5. Quality Checklist ("Impeccable Quality Gate")

Before completing any task or releasing code changes:
- [ ] All color/spacing/typography values reference `theme.js` tokens — zero hardcoded hex.
- [ ] Visual polish matches design tokens (colors, margins, border-radii).
- [ ] Responsive scaling verified for various mobile screen dimensions.
- [ ] Zero unhandled JS exceptions or missing key warnings in lists.
- [ ] Currency formatting verified (`₹XX,XXX` with `en-IN` locale).
- [ ] Safe area handling verified (`useSafeAreaInsets`).
- [ ] Disabled states use `COLORS.disabled` / `COLORS.disabledText` — not opacity hacks.
- [ ] Warm Stone neutrals used consistently — no cold slate/blue-gray values.
