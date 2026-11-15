# LigthsON — UX system

How the app responds to people: what they feel when they tap, how they learn
what's possible, what happens when something goes wrong, and how the app gets
faster for them over time. The visual design lives in `Design/pulse` and
`src/theme`; this document covers behaviour.

Code lives in `src/ux/` (logic) and `src/components/pulse/` (UI).

---

## 1. Principles

1. **Never block for good news.** Confirmations of success are toasts, not dialogs.
2. **Prefer undo to "Are you sure?".** Deleting a transaction is instant and reversible for 5 s.
3. **Every touch answers.** Buttons, chips, cards and tabs ease down when pressed; choices tick.
4. **Don't flash on revisit.** Show skeletons only on the first load; afterwards refresh in place.
5. **Teach once, then get out of the way.** Tips disappear once the user performs the gesture.
6. **Learn the person.** Forms start from the user's last choices and offer their frequent items.
7. **Errors in human words.** Never show a raw Firebase/stack message (`friendlyError`).

---

## 2. Building blocks

| Need | Use | Where |
|---|---|---|
| Something saved / failed / needs attention | `toast.success / error / warning / info / coin(msg, { title, action })` | `src/ux/toast.js` |
| Destructive action | `withUndo({ message, apply, revert, commit })` | `src/ux/toast.js` |
| Human error copy | `friendlyError(err, fallback)` | `src/ux/toast.js` |
| Touch feedback | `haptics.tap / select / success / warning / error` | `src/ux/haptics.js` |
| Pressable with scale | `<Press scaleTo haptic>` (already inside Button, Card, Chip, IconButton, dock) | `pulse/feedback.js` |
| Loading placeholder | `<Skeleton>`, `<SkeletonRows>` | `pulse/feedback.js` |
| Row actions | `<ActionSheet actions={[{ label, icon, sub, destructive, onPress }]}>` | `pulse/feedback.js` |
| One-time hint | `<Tip id>` + `markLearned(id)` when the user does the thing | `pulse/feedback.js` |
| Learned defaults | `getEntryMemory`, `rememberEntry`, `topEntries` | `src/ux/memory.js` |
| Swipe through time | `useSwipe({ onNext, onPrev })` | `src/ux/useSwipe.js` |
| Today's date | `localISODate()` — never `toISOString().split("T")[0]` (UTC) | `src/utils/format.js` |
| Amount input | `groupAmountInput(raw)` to show, `parseAmountInput(text)` to store; `<QuickAmounts>` chips | `src/utils/format.js`, `pulse/forms.js` |
| Row swipe actions | `<SwipeRow onDelete onEdit onRepeat>` around a `TxRow` | `pulse/swipe.js` |
| Older popups | `<PopupModal>` → `<PopupBackdrop>` → `<PopupPanel placement>` (same motion as `Sheet`) | `pulse/popup.js` |
| Failed load | `<ErrorState title message onRetry fill>` | `pulse/status.js` |
| Freshness | `<Updated at={date} prefix>` — "Updated 3 min ago" | `pulse/status.js` |
| No network | `<OfflineBanner />` (root); `useOnline()`, `checkConnection()` | `pulse/status.js`, `src/ux/connectivity.js` |
| Milestone | `celebrate({...})` / `celebrateOnce(key, {...})` — rare, earned moments only | `src/ux/celebrate.js` |
| Hide amounts | `amountsHidden()`, `toggleAmountsHidden()`; `inr(v, { reveal: true })` for public prices | `src/ux/privacy.js` |
| Streak / insights | `loggingStreak`, `spendingToday`, `weekRecap` (pure, tested) | `src/ux/insights.js` |
| What they've found | `markSeen(key)`, `useSeen([...])`, `useFocus()` | `src/ux/discovery.js` |

### Toasts inside modals
React Native `Modal`s draw above everything. Any raw `<Modal>` that can raise
a toast must contain `<ToastHost inModal />` as its last child. Pulse `Sheet`
and `ActionSheet` already do.

### When to use which feedback

| Situation | Feedback |
|---|---|
| Saved / updated | `toast.success` with *what* was saved: `"Groceries · ₹450"` |
| Validation problem | `toast.warning` naming the field: title `"Amount"`, `"Enter an amount above ₹0."` |
| Network / server failure | `toast.error(friendlyError(e, "Couldn't save…"))` |
| Delete a record | `withUndo` — no confirmation dialog |
| Irreversible or costly (sign out, redeem coins, sell shares, delete an FD/goal) | Keep `Alert.alert` with Cancel / Confirm |
| Choosing between actions on a row | `ActionSheet` |

### Haptic vocabulary
- `tap` — FABs, quick actions, pull-to-refresh
- `select` — tab switch, chip, segmented control, picking an option, changing day/month
- `success` / `warning` / `error` — fired automatically by the matching toast

Android gets short ticks; iOS only buzzes on errors (RN `Vibration` can't do
short taps there). Users can switch haptics off in **Me → Settings → Haptic feedback**.
Moving to `expo-haptics` later means editing `src/ux/haptics.js` only.

---

## 3. Motion

Motion explains what changed and where things went; it never makes anyone
wait. Tokens and Reduce Motion live in `src/ux/motion.js`; components in
`src/components/pulse/motion.js` (exported from `pulse`).

**The two authored moments.** The brand mark is a clock ("time in the
market"), so waiting shows that clock (`ClockLoader`). Money *settles into
place*: figures count up when data first arrives (`CountUp`), and rings, bars
and the allocation donut sweep to their value. Everything else is quiet
feedback.

### Timing (`DURATION`, `EASE`)
| Token | ms | Use |
|---|---|---|
| `tap` | 120 | press feedback, icon pops |
| `quick` | 180 | exits, small state changes |
| `base` | 240 | entrances, crossfades, segment pill |
| `layout` | 300 | rows added/removed, sheets |
| `focal` | 700 | a figure counting up / ring filling on first load |

Arrivals use `EASE.out` (fast start, soft landing); exits use `EASE.in` and are
faster than entrances. Springs (`SPRING`) are near-critically damped, so nothing wobbles.

### Where motion lives
| Moment | Behaviour | Where |
|---|---|---|
| App launch | Logo intro → fades into the first screen | `brand/AppLoader` |
| Tab switch | Crossfade; dock pill grows in, icon lifts | `App.js` (`DockItem`) |
| Stack push | Platform transition (crossfade under Reduce Motion) | `App.js` |
| F.I.R.E. ⇄ Goals | Crossfade between siblings | `PlanStackNavigator` |
| Theme switch | New palette fades in; entrances don't replay | `ThemeFade`, `quietEntrances` |
| Screen first render | Sections fade + rise 10 px, cascading ≤ 6 steps | `FadeIn`, `Stagger` |
| List rows | First screenful cascades; rows mounted by scrolling just appear | `RowIn`, `staggerDelay` |
| Loading with a known layout | Skeletons shaped like the content | `ScreenSkeleton`, `SkeletonCard`, `SkeletonRows` |
| Loading with no layout | Brand clock with honest copy | `ClockLoader` |
| Figures | Count up on first data, glide on updates, resume after remount | `CountUp id=…` |
| Progress | Bars fill, rings sweep, donut unrolls | `ProgressBar`, `Ring`, `Donut` |
| Press | Scale down while held (buttons 0.97, rows 0.985, chips 0.94) | `Press` (in all Pulse controls) |
| Segmented control | Ink pill slides, labels light up as it passes | `Segmented` |
| Month / day change | Content slides in from the direction you moved | `useSlideOnChange` |
| Sheets | Backdrop fades, panel springs up, drag handle down to close | `Sheet` |
| Delete / undo | Neighbours glide into the gap and back | `withUndo` → `animateLayout` |
| Tips | Fade in; content below glides when they retire | `Tip` |
| Toast | Slides up; icon pops; coin rewards flip the coin | `ToastHost` |
| Coins change | Coin icon pops, balance counts | Home header, Coins |
| Rejected input | Fields shake + error buzz | `useShake` (Login, Register steps) |
| Onboarding | Active page dot stretches into place | `onboardingScreen` |

### Rules
- **Reduce Motion is honoured everywhere.** Primitives check `reduceMotion()`:
  slides, springs and count-ups become instant or short crossfades.
- **Once per screen.** Entrances run on mount; screens stay mounted, so
  revisiting a tab never replays them. Pass a stable `id` to `CountUp`.
- **Never gate content on an animation.** Nothing waits for motion to finish
  before it's usable. Long loops stop on unmount.
- **Open follow-up sheets in `onHidden`**, not in the same tick as closing one
  (iOS can't present over a dismissing modal). `ActionSheet` already does.
- Don't put components that can render `null` inside `Stagger` (an empty
  wrapper still takes a `gap` slot) — wrap the known blocks with `FadeIn`.
- Native-driver everything that can be (opacity, transforms). Width and SVG
  values are JS-driven and only run on first data or a real change.

---

## 4. Journeys

### First run → first week
- Login: errors appear inline with an icon and a buzz, clear as you type; keyboard
  **Next → Go** moves between fields; ~0.7 s success beat instead of a 2 s wait.
- Home: figures show skeletons until the first load. A tip teaches swiping the calendar.
- Ledgers and the Day view: a tip says "Tap an entry to edit or delete it" until used.
- Tips retire after the user does the action, dismisses them, or sees them 4 times.

### Daily habit (the core loop)
1. Home → **Expense / Income** quick action opens the form directly (date = today).
2. The form starts from the last category + payment method; frequent items appear
   as one-tap chips once something has been logged twice.
3. Save → toast `"Expense saved · Groceries · ₹450 · +10 coins"` → back on Home.
4. Daily check-in shows as a coin toast with a **View** action (it used to be a
   blocking modal on every first open of the day).

### Reviewing and correcting
- Day view: **swipe left/right** (or ‹ › buttons) to move between days instantly;
  "Jump to today" when away from today.
- Tap any entry → Edit / Delete sheet. Delete → **Undo** for 5 s. The server
  delete runs when the toast closes, is replaced by another toast, or the app
  goes to the background — so undo never re-creates records or re-awards coins.
- Edits update the record in place (they used to delete and re-create it).

### Over time
- Defaults and shortcuts follow the user's habits (`ux.memory.*`, on device only).
- Tips stop appearing; the interface gets quieter as the user gets fluent.

### Getting going (first week)
- Onboarding ends with an optional "Where do you want to start?" (spend / invest / F.I.R.E.).
- Home shows **Getting started**: profile ages, first expense, first investment, open
  F.I.R.E. Steps tick when the real thing happens, are ordered by that answer, and the
  card retires (with one celebration) when done or dismissed. Users who'd already done
  everything never see the celebration.
- Hints appear only once they're useful: voice logging after a 2-day streak, sharing
  once F.I.R.E. has data.

### Habit and reward
- **Today** card on Home: logging streak and today's spend against the 30-day daily
  average (needs 5 active days of history before it compares).
- Celebrations, each at most once: 7/30/100/365-day streaks, 25/50/75/100% of
  F.I.R.E., a goal fully funded by its linked investments, a new account.
- **Weekly recap** (Home on Sunday/Monday, Me → Weekly recap): last 7 days vs the
  week before, top categories, biggest day, days logged, what was kept.
- Long-press the F.I.R.E. card to share a designed progress card (PDF); in privacy
  mode it shows only the percentage.

### Faster daily logging
- Ledgers: search by name, note, category, method or amount.
- Swipe a row left to delete (undoable), right to edit or **log again today**.
- Amounts show grouped while typing (₹12,450) with +100 / +500 … chips.

### Trust
- Eye on Home's cash-flow card (or Me → Hide amounts) masks every personal amount;
  market prices stay visible.
- Live figures carry "Updated x min ago"; an offline pill appears when there's no
  network and clears itself when it returns.
- Load failures show what failed and a **Try again**, never a dead end.

---

## 5. Storage keys (AsyncStorage)

| Key | Purpose |
|---|---|
| `ux.haptics` | `"on"` / `"off"` |
| `ux.tip.<id>` | view count, or `"done"` when learned |
| `ux.memory.expense`, `ux.memory.income` | last category/method + item counts |
| `ux.privacy` | `"on"` / `"off"` — hide amounts |
| `ux.focus` | onboarding answer: `spend` / `invest` / `fire` |
| `ux.seen.<key>` | discovered features (`fire`, `weekRecap`) |
| `ux.checklist.dismissed` | Getting started retired |
| `ux.celebrated.<key>` | milestones already celebrated |

---

## 6. Checklist for new screens
- [ ] No `Alert.alert` for success or plain errors — use toasts.
- [ ] Deletes use `withUndo` unless the action can't be reversed client-side.
- [ ] First load shows skeletons (or `ClockLoader` when there is no layout to sketch); refocus refreshes silently.
- [ ] Main sections use `FadeIn` (rows `RowIn`); headline figures use `CountUp` with an `id`.
- [ ] New animations use `DURATION` / `EASE` tokens and respect `reduceMotion()`.
- [ ] Every raw `<Modal>` that can toast contains `<ToastHost inModal />`.
- [ ] Dates for "today" use `localISODate()`.
- [ ] Errors go through `friendlyError`.
- [ ] Icon-only buttons have an `accessibilityLabel`; icons come from Pulse `Icon`.
- [ ] Touchables are `Press` (or a Pulse control); popups use `Sheet` or `PopupModal`.
- [ ] Personal amounts go through `inr` / `inrCompact` (privacy mode); public prices pass `reveal: true`.
- [ ] Live data shows `<Updated>`; failed loads show `<ErrorState onRetry>`.
- [ ] Run `node scripts/check-undefined.js` and `npx expo export --platform android`.
