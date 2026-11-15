import { getProfile, getTransactions, getInvestments } from "../services/firestoreService";
import { getLivePrices, valuePortfolio } from "../services/livePriceService";
import { dailySpendAverage } from "../ux/insights";

const INDIA_INFLATION_AVG = 7.5;

/**
 * Calculates F.I.R.E progress details for a given user.
 * Matches calculations done in FireNumber.js.
 * 
 * @param {string} uid User ID
 * @returns {Promise<{
 *   hasData: boolean,
 *   reason?: string,
 *   fireNumber?: number,
 *   totalInvested?: number,   // current value of FIRE-linked investments at live prices
 *   costBasis?: number,        // what was paid for them
 *   progressPercentage?: number,
 *   currentAge?: number,
 *   retirementAge?: number
 * }>}
 */
export const calculateFireTarget = async (uid) => {
  if (!uid) {
    return { hasData: false, reason: "No user ID provided" };
  }

  // 1. Fetch Profile
  const profile = await getProfile(uid);
  if (!profile) {
    return { hasData: false, reason: "Profile not found" };
  }

  const currentAge = profile.age ? parseInt(profile.age, 10) : null;
  const retirementAge = profile.retirementAge ? parseInt(profile.retirementAge, 10) : null;

  if (!currentAge || !retirementAge) {
    return {
      hasData: false,
      reason: "Please set your Age and Target Retirement Age in your profile settings.",
      currentAge,
      retirementAge,
    };
  }

  // 2. Fetch Transactions & Calculate Average Daily Expenses
  const allTx = await getTransactions(uid);
  const { avg: dailyExpense } = dailySpendAverage(allTx);

  const yearlyExpense = dailyExpense * 365;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  // 3. Calculate future annual expenses and F.I.R.E number
  const inflation = INDIA_INFLATION_AVG / 100;
  const futureAnnualExpense = yearlyExpense * Math.pow(1 + inflation, yearsToRetirement);
  const safeWithdrawalRate = 4 / 100; // 4% SWR
  const fireNumber = futureAnnualExpense / safeWithdrawalRate;

  return { hasData: true, fireNumber, currentAge, retirementAge };
};

/**
 * Target plus the live value of everything mapped to F.I.R.E.
 * Screens subscribed to the live portfolio (services/portfolioLive) should use
 * calculateFireTarget and goalHoldings instead, so they tick with prices.
 */
export const calculateFireProgress = async (uid) => {
  const target = await calculateFireTarget(uid);
  if (!target.hasData) return target;
  const { fireNumber, currentAge, retirementAge } = target;

  // 4. Fetch and Aggregate Investments linked to FIRE
  const allInvestments = await getInvestments(uid);
  const fireInvestments = allInvestments.filter(inv =>
    inv.goalId === "firenumber" || inv.goalName === "F.I.R.E Number" || inv.goalName === "FIRE Number"
  );

  // Value at live prices so market moves show up in progress, up or down.
  const live = await getLivePrices(fireInvestments);
  const { current: totalInvested, invested: costBasis } = valuePortfolio(fireInvestments, live);

  const progressPercentage = fireNumber > 0 ? (totalInvested / fireNumber) * 100 : 0;

  return {
    hasData: true,
    fireNumber,
    totalInvested,
    costBasis,
    progressPercentage,
    pricedAt: live.at,
    currentAge,
    retirementAge,
  };
};
