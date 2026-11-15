/**
 * LigthsON Cloud Functions — the only code allowed to change coins.
 *
 * Coins used to be written straight from the app, so any user could grant
 * themselves a balance and claim paid rewards. Now:
 *   - logging income / expenses / investments awards coins through Firestore
 *     triggers (idempotent per document, capped per day),
 *   - the daily open reward and inactivity penalty run in dailyCheckIn,
 *   - reward requests and admin reviews go through callable functions,
 *   - username login resolves the email server-side, so clients never need
 *     to query the users collection.
 */
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// Set ENFORCE_APP_CHECK=true in functions/.env once App Check is live in the app.
const callOptions = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };

// ── Coin economy ────────────────────────────────────────────────────────

const COINS = {
  dailyOpen: 5,
  inactivityPenalty: 500,
  income: 10,
  expense: 10,
  investment: {
    savings: 15,
    "fixed deposit": 20,
    "recurring deposit": 20,
    "mutual fund": 25,
    "sip/mf": 25,
    stock: 25,
    stocks: 25,
  },
};

// Stops create/delete loops from farming coins.
const MAX_REWARDED_LOGS_PER_DAY = 20;

const REWARDS = {
  "stock-recommendation": { title: "Stock Recommendation", coins: 10000, autoComplete: false },
  "free-consultation-call": { title: "Free Consultation Call", coins: 75000, autoComplete: true },
};

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calendar date in India (UTC+5:30), e.g. "2026-09-23". */
const istDate = (d = new Date()) =>
  new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const clip = (value, max = 120) =>
  typeof value === "string" ? value.slice(0, max) : null;

const requireAuth = (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in again.");
  return uid;
};

const requireAdmin = async (request) => {
  const uid = requireAuth(request);
  if (request.auth.token?.admin === true) return uid;
  const adminDoc = await db.doc(`admins/${uid}`).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Administrator access required.");
  return uid;
};

/**
 * Grant coins once per idempotency key (Firestore triggers can retry).
 * Capped grants count toward MAX_REWARDED_LOGS_PER_DAY.
 */
const grantCoins = (uid, points, action, description, key, { capped = false } = {}) => {
  const userRef = db.doc(`users/${uid}`);
  const historyRef = userRef.collection("coinHistory").doc(key);
  const dayRef = userRef.collection("coinDaily").doc(istDate());

  return db.runTransaction(async (tx) => {
    const [history, day, user] = await Promise.all([
      tx.get(historyRef),
      tx.get(dayRef),
      tx.get(userRef),
    ]);
    if (history.exists || !user.exists) return 0;
    if (capped && (day.get("count") || 0) >= MAX_REWARDED_LOGS_PER_DAY) return 0;

    tx.update(userRef, { coins: FieldValue.increment(points) });
    tx.set(historyRef, {
      action,
      points,
      description: clip(description),
      timestamp: FieldValue.serverTimestamp(),
    });
    if (capped) tx.set(dayRef, { count: FieldValue.increment(1) }, { merge: true });
    return points;
  });
};

const sendAdminEmail = async ({ subject, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !toEmail) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "LigthsON <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Email service error: ${response.status}`);
  return true;
};

// ── Coin triggers ───────────────────────────────────────────────────────

exports.onTransactionCreated = onDocumentCreated("users/{uid}/transactions/{txId}", async (event) => {
  const data = event.data?.data();
  // noReward marks edits and later recurring copies; it can only withhold coins.
  if (!data || data.noReward === true) return;
  const type = String(data.type || "").toLowerCase();
  if (type !== "income" && type !== "expense") return; // investments are rewarded below

  await grantCoins(
    event.params.uid,
    COINS[type],
    type === "income" ? "add_income" : "add_expense",
    data.name,
    `tx_${event.params.txId}`,
    { capped: true }
  );
});

exports.onInvestmentCreated = onDocumentCreated("users/{uid}/investments/{invId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const points = COINS.investment[String(data.investmentType || "").toLowerCase()];
  if (!points) return;

  await grantCoins(
    event.params.uid,
    points,
    "add_investment",
    data.investmentType,
    `inv_${event.params.invId}`,
    { capped: true }
  );
});

// ── Daily check-in ──────────────────────────────────────────────────────

exports.dailyCheckIn = onCall(callOptions, async (request) => {
  const uid = requireAuth(request);
  const userRef = db.doc(`users/${uid}`);
  const today = istDate();

  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists) throw new HttpsError("not-found", "Profile not found.");

    const balance = Number(user.get("coins") || 0);
    const lastSeen = user.get("lastSeenDate");
    if (lastSeen === today) return { awarded: 0, penalty: 0, missedDays: 0, coins: balance };

    let penalty = 0;
    let missedDays = 0;
    if (typeof lastSeen === "string" && !Number.isNaN(Date.parse(lastSeen))) {
      const diffDays = Math.round((Date.parse(today) - Date.parse(lastSeen)) / 86400000);
      if (diffDays > 1) {
        missedDays = diffDays - 1;
        penalty = Math.min(COINS.inactivityPenalty, Math.max(balance, 0)); // never below zero
      }
    }

    const history = userRef.collection("coinHistory");
    if (penalty > 0) {
      tx.set(history.doc(`penalty_${today}`), {
        action: "inactivity_penalty",
        points: -penalty,
        description: `Missed ${missedDays} day(s) of login`,
        timestamp: FieldValue.serverTimestamp(),
      });
    }
    tx.set(history.doc(`daily_${today}`), {
      action: "daily_open",
      points: COINS.dailyOpen,
      description: "Daily app open reward",
      timestamp: FieldValue.serverTimestamp(),
    });
    tx.update(userRef, {
      coins: FieldValue.increment(COINS.dailyOpen - penalty),
      lastSeenDate: today,
    });

    return { awarded: COINS.dailyOpen, penalty, missedDays, coins: balance - penalty + COINS.dailyOpen };
  });
});

// ── Premium rewards ─────────────────────────────────────────────────────

exports.requestPremiumReward = onCall(callOptions, async (request) => {
  const uid = requireAuth(request);
  const rewardKey = request.data?.rewardKey;
  const reward = Object.prototype.hasOwnProperty.call(REWARDS, rewardKey) ? REWARDS[rewardKey] : null;
  if (!reward) throw new HttpsError("invalid-argument", "Unknown reward.");

  const userRef = db.doc(`users/${uid}`);
  const claimRef = db.collection("rewardClaims").doc();
  const openClaims = db.collection("rewardClaims")
    .where("uid", "==", uid)
    .where("rewardType", "==", rewardKey)
    .where("status", "in", ["Pending", "Approved"]);

  const claim = await db.runTransaction(async (tx) => {
    const [user, open] = await Promise.all([tx.get(userRef), tx.get(openClaims)]);
    if (!user.exists) throw new HttpsError("not-found", "Profile not found.");
    if (!open.empty) throw new HttpsError("already-exists", "You already have an open request for this reward.");

    const balance = Number(user.get("coins") || 0);
    if (balance < reward.coins) {
      throw new HttpsError("failed-precondition", "Not enough coins.", { required: reward.coins, balance });
    }

    const firstName = user.get("firstName") || "";
    const lastName = user.get("lastName") || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
      || user.get("userName") || "LigthsON User";
    const phone = user.get("phoneNumber") || "";
    const status = reward.autoComplete ? "Completed" : "Pending";

    const record = {
      claimId: claimRef.id,
      uid,
      firstName,
      lastName,
      fullName,
      userName: user.get("userName") || fullName,
      email: request.auth.token.email || user.get("email") || "",
      phone,
      phoneNumber: phone,
      rewardName: reward.title,
      rewardType: rewardKey,
      coinsRequired: reward.coins,
      currentCoins: balance - reward.coins,
      status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    tx.update(userRef, { coins: FieldValue.increment(-reward.coins) });
    tx.set(userRef.collection("coinHistory").doc(`redeem_${claimRef.id}`), {
      action: "reward_redemption",
      points: -reward.coins,
      description: reward.title,
      timestamp: FieldValue.serverTimestamp(),
    });
    tx.set(claimRef, record);
    return record;
  });

  try {
    await sendAdminEmail({
      subject: `New Premium Reward request - ${reward.title}`,
      text: [
        "A LigthsON user has requested a premium reward.",
        "",
        `User: ${claim.fullName} (${claim.email || "no email"})`,
        `User ID: ${uid}`,
        `Reward: ${reward.title}`,
        `Coins deducted: ${reward.coins}`,
        `Remaining balance: ${claim.currentCoins}`,
        `Status: ${claim.status}`,
        "",
        "Review it in the LigthsON admin panel.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Reward email failed", { claimId: claim.claimId, message: error.message });
  }

  return { claimId: claim.claimId, status: claim.status, coins: claim.currentCoins };
});

/** Admin panel: approve, reject (refunds coins) or complete a claim. */
exports.reviewRewardClaim = onCall(callOptions, async (request) => {
  await requireAdmin(request);
  const { claimId, action } = request.data || {};
  const reason = clip(request.data?.reason, 500);
  if (typeof claimId !== "string" || !claimId || claimId.includes("/")) {
    throw new HttpsError("invalid-argument", "Invalid claim.");
  }
  if (!["approve", "reject", "complete"].includes(action)) {
    throw new HttpsError("invalid-argument", "Invalid action.");
  }

  const claimRef = db.doc(`rewardClaims/${claimId}`);
  const reviewer = request.auth.token.email || request.auth.uid;

  return db.runTransaction(async (tx) => {
    const claim = await tx.get(claimRef);
    if (!claim.exists) throw new HttpsError("not-found", "Claim does not exist.");
    const status = claim.get("status");

    if (action === "approve") {
      if (status !== "Pending") throw new HttpsError("failed-precondition", `Claim is already ${status}.`);
      // Coins were deducted when the user requested the reward; do not charge twice.
      tx.update(claimRef, {
        status: "Approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: reviewer,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { status: "Approved" };
    }

    if (action === "reject") {
      if (status !== "Pending") throw new HttpsError("failed-precondition", "Only pending claims can be rejected.");
      const uid = claim.get("uid");
      const refund = Number(claim.get("coinsRequired") || 0);
      const userRef = db.doc(`users/${uid}`);
      tx.update(userRef, { coins: FieldValue.increment(refund) });
      tx.set(userRef.collection("coinHistory").doc(`refund_${claimId}`), {
        action: "reward_refund",
        points: refund,
        description: `Refund: ${claim.get("rewardName") || "reward"}`,
        timestamp: FieldValue.serverTimestamp(),
      });
      tx.update(claimRef, {
        status: "Rejected",
        rejectedReason: reason || null,
        rejectedAt: FieldValue.serverTimestamp(),
        rejectedBy: reviewer,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { status: "Rejected", refunded: refund };
    }

    if (status !== "Approved") throw new HttpsError("failed-precondition", "Only approved claims can be completed.");
    tx.update(claimRef, {
      status: "Completed",
      completedAt: FieldValue.serverTimestamp(),
      completedBy: reviewer,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: "Completed" };
  });
});

// ── Login by username ───────────────────────────────────────────────────

exports.lookupLoginEmail = onCall(callOptions, async (request) => {
  const userName = String(request.data?.userName || "").trim().toLowerCase();
  if (userName.length < 3 || userName.length > 40 || /[\s/]/.test(userName)) {
    throw new HttpsError("invalid-argument", "Enter a valid username.");
  }

  let email = null;
  const index = await db.doc(`usernames/${userName}`).get();
  if (index.exists) {
    const profile = await db.doc(`users/${index.get("uid")}`).get();
    email = profile.get("email") || null;
  }
  if (!email) {
    // Accounts created before the usernames index existed.
    const legacy = await db.collection("users").where("userName", "==", userName).limit(1).get();
    email = legacy.empty ? null : legacy.docs[0].get("email") || null;
  }
  if (!email) throw new HttpsError("not-found", "No account found with that username.");
  return { email };
});
