// Preview stand-in for src/services/secureFunctions.js
import { profile } from "./demoData";

export const dailyCheckIn = async () => ({ awarded: 0, coins: profile.coins, penalty: 0 });
export const requestPremiumReward = async () => ({ status: "Pending" });
export const lookupLoginEmail = async () => profile.email;
