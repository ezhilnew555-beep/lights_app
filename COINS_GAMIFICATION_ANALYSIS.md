# Gamification & Coins System Analysis - LigthsON App

## Overview
The LigthsON app implements a **gamification system using "Coins" (🪙)** to reward users for performing financial tracking actions. Users earn coins for various activities, which are tracked and displayed in the app.

---

## 🪙 Coin Reward Structure

### 1. **Daily App Open** - 5 Coins
- **Action**: User opens the app for the first time each day
- **Function**: `checkAndAwardDailyCoins()` in [calendarmain.js](src/screens/calendar/calendarmain.js#L253)
- **Logic**: 
  - Checked when app loads (Calendar screen)
  - Tracks `lastSeenDate` in user profile
  - Only awards once per day per user
  - Triggered automatically on app startup

**Code Reference:**
```javascript
const dailyPoints = 5;
await addCoins(uid, dailyPoints, 'daily_open', 'Daily app open reward');
await updateProfile(uid, { lastSeenDate: today });
```

---

### 2. **Add Income** - 10 Coins
- **Action**: User adds a new income transaction
- **Screens Involved**: [Income.js](src/screens/transactions/Income.js#L314)
- **When Triggered**: After successfully adding an income transaction
- **Alert Message**: "Transaction added successfully! Earned +10 🪙"

**Code Reference:**
```javascript
await addCoins(uid, 10, 'add_income', transactionData.name);
```

---

### 3. **Add Expense** - 10 Coins
- **Action**: User adds a new expense transaction
- **Screens Involved**: [Expenses.js](src/screens/transactions/Expenses.js#L383-L392)
- **When Triggered**: After successfully adding an expense transaction
- **Supports Recurring**: Same +10 coins awarded for recurring expenses
- **Alert Message**: "Transaction added successfully! Earned +10 🪙"

**Code Reference:**
```javascript
await addCoins(uid, 10, 'add_expense', transactionData.name);
await addCoins(uid, 10, 'add_expense', transactionData.name + ' (Recurring)');
```

---

### 4. **Add Savings** - 15 Coins
- **Action**: User adds a savings account/investment
- **Screens Involved**: [SavingsScreen.js](src/screens/investments/SavingsScreen.js#L171)
- **When Triggered**: After successfully creating a savings investment
- **Alert Message**: "Savings added successfully! Earned +15 🪙"

**Code Reference:**
```javascript
await addCoins(uid, 15, 'add_investment', 'Savings');
```

---

### 5. **Add Fixed Deposit (FD) / Recurring Deposit (RD)** - 20 Coins
- **Actions**: 
  - Fixed Deposit: [FDScreen.js](src/screens/investments/FDScreen.js#L187)
  - Recurring Deposit: [RDScreen.js](src/screens/investments/RDScreen.js#L172)
- **When Triggered**: After successfully creating a FD or RD investment
- **Alert Messages**: 
  - "Fixed deposit added successfully! Earned +20 🪙"
  - "Recurring Deposit added successfully! Earned +20 🪙"

**Code Reference:**
```javascript
await addCoins(uid, 20, 'add_investment', 'Fixed Deposit');
await addCoins(uid, 20, 'add_investment', 'Recurring Deposit');
```

---

### 6. **Add Mutual Fund / Stock** - 25 Coins
- **Actions**:
  - Mutual Fund: [MFCalculator.js](src/screens/investments/MFCalculator.js#L821)
  - Stock: [StockDetailScreen.js](src/screens/investments/StockDetailScreen.js#L686)
- **When Triggered**: After successfully adding a Mutual Fund or Stock investment
- **Alert Messages**:
  - "Mutual Fund added successfully! Earned +25 🪙"
  - "Stock added successfully! Earned +25 🪙"

**Code Reference:**
```javascript
await addCoins(uid, 25, 'add_investment', 'Mutual Fund');
await addCoins(uid, 25, 'add_investment', 'Stock');
```

---

### 7. **Inactivity Penalty** - (-500 Coins)
- **Action**: User fails to log into the application for 1 or more consecutive days.
- **Function**: `checkAndAwardDailyCoins()` in [calendarmain.js](src/screens/calendar/calendarmain.js)
- **Logic**:
  - Compares the current date with the user's `lastSeenDate`.
  - If the difference is > 1 day, deducts 500 coins as a penalty to encourage consistency.
- **Alert Message**: "Inactivity Penalty: You lost 500 coins for not logging in yesterday."

---

## 📊 Coins Reward Summary Table

| Action | Coins | Frequency | Type |
|--------|-------|-----------|------|
| Daily App Open | 5 | Once per day | Engagement |
| Add Income | 10 | Per transaction | Tracking |
| Add Expense | 10 | Per transaction | Tracking |
| Add Savings | 15 | Per account | Investment |
| Add FD / RD | 20 | Per account | Investment |
| Add Mutual Fund | 25 | Per investment | High-Value Investment |
| Add Stock | 25 | Per investment | High-Value Investment |
| Inactivity Penalty | -500 | Per missed day | Penalty |

---

## 🏦 Coin System Architecture

### Database Structure
- **User Document**: Contains `coins` field (total balance)
- **Coin History Subcollection**: Located at `users/{uid}/coinHistory/`
  - Stores each coin transaction with:
    - `action`: Type of action (e.g., 'daily_open', 'add_income', 'add_expense', 'add_investment')
    - `points`: Number of coins awarded
    - `description`: Details about the action (e.g., transaction name)
    - `timestamp`: When the coin was awarded

### Core Function: `addCoins()`
**Location**: [firestoreService.js](src/services/firestoreService.js#L54)

```javascript
export const addCoins = async (uid, points, action, description = null) => {
    // Atomically increment the coins field on the user document
    await updateDoc(doc(db, "users", uid), { coins: increment(points) });

    // Log the coin event for history
    await addDoc(collection(db, "users", uid, "coinHistory"), {
        action,
        points,
        description: description || null,
        timestamp: serverTimestamp(),
    });
};
```

**Key Features:**
- ✅ **Atomic Operation**: Ensures coins are incremented safely
- ✅ **History Tracking**: Every coin award is logged with timestamp
- ✅ **Error Handling**: Try-catch blocks prevent coin award failures from breaking transactions
- ✅ **Description**: Stores details about what action earned the coins

---

## 👁️ Coins Display Interface

### Coins Screen ([CoinsScreen.js](src/screens/profile/CoinsScreen.js))
- **Location**: Profile tab → Coins section
- **Features**:
  - Current coin balance (displayed in orange gradient card)
  - "How to Earn Coins" section with reward breakdown
  - "Earning History" section showing recent coin awards
  - Real-time history from Firestore

### Coins Balance Display
- **Profile Screen**: Shows coin count at the top
- **Transaction Success Alerts**: Displays "+X 🪙" in success messages
- **Coin Modal**: Displays earned coins when user opens app (daily reward)

---

## 🔓 Coin Access Tiers

Instead of deducting coins for premium features, the app uses a balance-based "Access Tier" approach for certain features:

### Breakout Stocks Access
- **Requirement**: Minimum balance of `10,000` coins.
- **Function**: `handleBreakoutPress()` in [calendarmain.js](src/screens/calendar/calendarmain.js)
- **Logic**:
  - User can view daily breakout stocks indefinitely as long as their balance is >= 10,000.
  - No coins are deducted when viewing.
  - If balance falls below 10,000, access is restricted with an alert.

---

## 🎯 Gamification Strategy

### Reward Tiers (By Value)
1. **Small Rewards (5-10 coins)**: Low-barrier, frequent actions
   - Daily engagement: 5 coins
   - Basic tracking: 10 coins each

2. **Medium Rewards (15 coins)**: Mid-tier investments
   - Savings accounts: 15 coins

3. **High Rewards (20-25 coins)**: Complex/long-term investments
   - FD/RD: 20 coins
   - Mutual Funds/Stocks: 25 coins

### Gamification Mechanics
- **Frequency**: Daily app opens encourage habit formation
- **Progression**: Rewards increase with investment complexity
- **Variety**: Different actions get different reward values
- **Visibility**: Success messages and coin history make rewards visible
- **Leaderboard Ready**: Coin system is set up to support future leaderboards

---

## 📋 Implementation Details

### Action Types
Used in code and history tracking:
- `daily_open`: Daily app opening bonus
- `add_income`: Income transaction added
- `add_expense`: Expense transaction added
- `add_investment`: Any investment added (savings, FD, RD, MF, stock)

### Error Handling
All coin awards are wrapped in try-catch blocks:
```javascript
try {
  await addCoins(uid, points, 'action_type', 'description');
} catch (coinErr) {
  console.warn("Failed to award coins:", coinErr);
}
```
This ensures that **coin award failures do NOT prevent transaction completion**.

---

## 🔐 Data Validation

### User Profile Fields
Allowed fields for update (defined in [firestoreService.js](src/services/firestoreService.js#L36)):
```javascript
const allowed = ["firstName", "lastName", "phoneNumber", "country", "age", 
                 "retirementAge", "pushToken", "lastSeenDate", "coins"];
```
The `coins` field is protected and only modified through the `addCoins()` function.

---

## 💡 Future Enhancement Possibilities

1. **Coin Spending/Rewards**
   - Allow users to redeem coins for app features
   - Premium features or unlocks

2. **Leaderboards**
   - Monthly coin leaders
   - Friends comparison
   - Achievement badges

3. **Bonus Events**
   - Weekend multipliers
   - Monthly challenges
   - Seasonal events

4. **Tier System**
   - Bronze/Silver/Gold status based on total coins
   - Different perks per tier

5. **Streak Bonuses**
   - Additional coins for consecutive days
   - Week/month streak multipliers

---

## 📈 User Earning Potential (Daily)

**Scenario: Active User**
- Daily app open: +5
- Add 1 income: +10
- Add 1 expense: +10
- Add 1 investment (e.g., stock): +25
- **Daily Maximum**: ~50+ coins

**Monthly Estimate (30 days)**:
- Daily opens: 150 coins (5 × 30)
- Regular tracking: ~600 coins (assuming 10 transactions/month)
- Investments: 100-250+ coins (variable)
- **Monthly Total**: 850-1000+ coins possible

---

## Summary

The LigthsON app uses a well-structured gamification system to incentivize financial tracking behavior. The coin rewards are:
- ✅ Properly integrated with Firestore
- ✅ Fully tracked with history and timestamps
- ✅ Error-safe (won't break transactions)
- ✅ Visible to users throughout the app
- ✅ Scalable for future enhancements

The reward structure encourages both daily engagement and investment activity, with higher rewards for complex financial decisions.
