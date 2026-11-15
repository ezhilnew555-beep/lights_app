const admin = require("firebase-admin");
const { quotes } = require("./motivationQuotes");

let Expo;
let expo;

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();
const notificationStateRef = db.collection("system").doc("notificationState");
const mode = String(process.env.NOTIFICATION_MODE || "auto").toLowerCase();

const toIstDateKey = (date = new Date()) => {
    // Forcefully formats the date into YYYY-MM-DD using Asia/Kolkata timezone standard
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
};

const isValidDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const normalizeDateKey = (value) => {
    if (!value) return null;
    if (isValidDateKey(value)) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
};

const daysBetween = (fromDateKey, toDateKey) => {
    const fromDate = new Date(`${fromDateKey}T00:00:00Z`);
    const toDate = new Date(`${toDateKey}T00:00:00Z`);
    return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
};

const formatDate = (dateKey) => {
    if (!dateKey) return "";
    return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });
};

const clampToMonthEnd = (date, desiredDay) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(desiredDay, lastDay));
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const getNextMonthlyOccurrence = (anchorDateKey, referenceDateKey, endDateKey = null) => {
    if (!anchorDateKey || !referenceDateKey) return null;

    const anchorDate = new Date(`${anchorDateKey}T00:00:00Z`);
    const referenceDate = new Date(`${referenceDateKey}T00:00:00Z`);
    const desiredDay = anchorDate.getUTCDate();

    let candidate = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), desiredDay));
    candidate = clampToMonthEnd(candidate, desiredDay);

    if (candidate.getTime() < referenceDate.getTime()) {
        candidate = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, desiredDay));
        candidate = clampToMonthEnd(candidate, desiredDay);
    }

    if (endDateKey) {
        const endDate = new Date(`${endDateKey}T00:00:00Z`);
        if (candidate.getTime() > endDate.getTime()) {
            return null;
        }
    }

    return candidate.toISOString().slice(0, 10);
};

const ensureExpoMessages = (messages) =>
    messages.filter((message) => message.to && Expo.isExpoPushToken(message.to));

const sendExpoMessages = async (messages) => {
    const validMessages = ensureExpoMessages(messages);
    if (validMessages.length === 0) {
        return 0;
    }

    const chunks = expo.chunkPushNotifications(validMessages);
    let sentCount = 0;

    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
            sentCount += chunk.length;
        } catch (error) {
            console.error("Error sending Expo chunk:", error);
        }
    }

    return sentCount;
};

const getRecipients = async () => {
    const snapshot = await db.collection("users").get();
    const recipients = [];

    snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const token = data.pushToken || data.expoPushToken || null;

        if (token && Expo.isExpoPushToken(token)) {
            recipients.push({
                uid: doc.id,
                token,
                displayName: data.firstName || data.displayName || data.username || doc.id,
            });
        }
    });

    return recipients;
};

const getNextMotivationQuote = async (todayKey) => {
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(notificationStateRef);
        const state = snapshot.exists ? snapshot.data() || {} : {};

        if (state.lastQuoteDate === todayKey) {
            return {
                quote: state.lastQuoteText || null,
                quoteIndex: Number.isInteger(state.quoteIndex) ? state.quoteIndex : 0,
                alreadySentToday: true,
            };
        }

        const quoteIndex = Number.isInteger(state.quoteIndex) ? state.quoteIndex : 0;
        if (quoteIndex >= quotes.length) {
            return {
                quote: null,
                quoteIndex,
                exhausted: true,
            };
        }

        const quote = quotes[quoteIndex];
        transaction.set(
            notificationStateRef,
            {
                quoteIndex: quoteIndex + 1,
                lastQuoteDate: todayKey,
                lastQuoteText: quote,
                lastMorningRunAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return {
            quote,
            quoteIndex,
            alreadySentToday: false,
        };
    });
};

const appendReminder = (bucket, uid, reminder) => {
    if (!bucket.has(uid)) {
        bucket.set(uid, []);
    }

    bucket.get(uid).push(reminder);
};

const collectExpenseReminders = async (todayKey, recipientsByUser) => {
    const reminderMap = new Map();
    const snapshot = await db.collectionGroup("transactions").get();

    snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const userId = doc.ref.parent.parent?.id;
        if (!userId || !recipientsByUser.has(userId)) return;

        if (String(data.type || "").toLowerCase() !== "expense") return;

        const baseDateKey = normalizeDateKey(data.date || data.scheduledDate || data.reminderDate);
        if (!baseDateKey) return;

        // Check if the expense is marked as recurring
        let dateKey = baseDateKey;
        if (data.isRecurring === true || data.recurring === true) {
            dateKey = getNextMonthlyOccurrence(baseDateKey, todayKey);
        }

        if (!dateKey) return;

        const daysUntilDue = daysBetween(todayKey, dateKey);
        if (daysUntilDue !== 2 && daysUntilDue !== 0) return;

        const dueLabel = daysUntilDue === 2 ? "in 2 days" : "today";
        const recurringLabel = (data.isRecurring || data.recurring) ? "Recurring expense" : "Expense";
        
        appendReminder(reminderMap, userId, {
            title: daysUntilDue === 2 ? `${recurringLabel} reminder ⏳` : `${recurringLabel} due today 🔔`,
            body: `${data.name || "An expense"} of ₹${Number(data.amount || 0).toLocaleString("en-IN")} is due ${dueLabel} (${formatDate(dateKey)}).`,
            data: {
                type: "expenseReminder",
                transactionId: doc.id,
                dueDate: dateKey,
            },
        });
    });

    return reminderMap;
};

const collectInvestmentReminders = async (todayKey, recipientsByUser) => {
    const reminderMap = new Map();
    const snapshot = await db.collectionGroup("investments").get();

    snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const userId = doc.ref.parent.parent?.id;
        if (!userId || !recipientsByUser.has(userId)) return;

        const investmentType = String(data.investmentType || data.type || "").trim();
        const normalizedType = investmentType.toLowerCase();

        let dueDateKey = null;
        let title = null;
        let body = null;

        if (normalizedType === "fixed deposit") {
            dueDateKey = normalizeDateKey(data.maturityDate);
            title = "FD maturity reminder 📌";
            body = `${data.name || "Your FD"} matures on ${formatDate(dueDateKey)}.`;
        } else if (normalizedType === "recurring deposit") {
            const startDateKey = normalizeDateKey(data.startDate);
            const maturityDateKey = normalizeDateKey(data.maturityDate);
            dueDateKey = getNextMonthlyOccurrence(startDateKey, todayKey, maturityDateKey);
            title = "RD reminder 💰";
            body = `${data.name || "Your recurring deposit"} is due on ${formatDate(dueDateKey)}.`;
        } else if (normalizedType === "mutual fund" && String(data.calculationType || "").toUpperCase() === "SIP") {
            const anchorDateKey = normalizeDateKey(data.startDate || data.investmentDate);
            dueDateKey = getNextMonthlyOccurrence(anchorDateKey, todayKey);
            title = "SIP reminder 📈";
            body = `${data.schemeName || data.name || "Your SIP"} is due on ${formatDate(dueDateKey)}.`;
        }

        if (!dueDateKey) return;

        const daysUntilDue = daysBetween(todayKey, dueDateKey);
        if (daysUntilDue !== 2 && daysUntilDue !== 0) return;

        const amountValue = Number(data.amount || 0).toLocaleString("en-IN");
        const friendlyTitle = daysUntilDue === 2 ? title.replace("reminder", "in 2 days") : title.replace("reminder", "due today");

        appendReminder(reminderMap, userId, {
            title: friendlyTitle,
            body: body || `${data.name || "A scheduled item"} for ₹${amountValue} is due ${daysUntilDue === 2 ? "in 2 days" : "today"} (${formatDate(dueDateKey)}).`,
            data: {
                type: "investmentReminder",
                investmentId: doc.id,
                dueDate: dueDateKey,
                investmentType: normalizedType,
            },
        });
    });

    return reminderMap;
};

const buildReminderMessages = (recipientsByUser, reminderMap) => {
    const messages = [];

    reminderMap.forEach((reminders, uid) => {
        const recipient = recipientsByUser.get(uid);
        if (!recipient) return;

        reminders.forEach((reminder) => {
            messages.push({
                to: recipient.token,
                sound: "default",
                title: reminder.title,
                body: reminder.body,
                data: {
                    ...reminder.data,
                    uid,
                },
            });
        });
    });

    return messages;
};

const sendMorningNotifications = async (sendMotivation = true, sendReminders = true) => {
    const todayKey = toIstDateKey();
    const recipients = await getRecipients();
    const recipientsByUser = new Map(recipients.map((recipient) => [recipient.uid, recipient]));

    if (recipients.length === 0) {
        console.log("No valid Expo recipients found.");
        return;
    }

    const [motivationResult, expenseReminders, investmentReminders] = await Promise.all([
        sendMotivation ? getNextMotivationQuote(todayKey) : Promise.resolve({}),
        sendReminders ? collectExpenseReminders(todayKey, recipientsByUser) : Promise.resolve(new Map()),
        sendReminders ? collectInvestmentReminders(todayKey, recipientsByUser) : Promise.resolve(new Map()),
    ]);

    const { quote, alreadySentToday, exhausted } = motivationResult;
    const messages = [];

    if (sendMotivation && quote && !alreadySentToday && !exhausted) {
        recipients.forEach((recipient) => {
            messages.push({
                to: recipient.token,
                sound: "default",
                title: "6 AM Motivation ✨",
                body: quote,
                data: {
                    type: "dailyMotivation",
                    quote,
                    quoteDate: todayKey,
                },
            });
        });
    }

    messages.push(...buildReminderMessages(recipientsByUser, expenseReminders));
    messages.push(...buildReminderMessages(recipientsByUser, investmentReminders));

    console.log(
        `Morning job: ${recipients.length} recipients, ${messages.length} push messages, quote sent: ${Boolean(quote && !alreadySentToday && !exhausted)}`
    );

    const sentCount = await sendExpoMessages(messages);
    console.log(`Morning notification job completed. Sent ${sentCount} messages.`);
};

const sendEveningNotifications = async () => {
    const recipients = await getRecipients();
    if (recipients.length === 0) {
        console.log("No valid Expo recipients found.");
        return;
    }

    const messages = recipients.map((recipient) => ({
        to: recipient.token,
        sound: "default",
        title: "Have you uploaded your expense?",
        body: "Please update your daily expense before the day ends.",
        data: {
            type: "dailyExpensePrompt",
        },
    }));

    console.log(`Evening job: ${recipients.length} recipients, ${messages.length} push messages.`);
    const sentCount = await sendExpoMessages(messages);
    console.log(`Evening notification job completed. Sent ${sentCount} messages.`);
};

const waitTillExactTime = async (targetUtcHour, targetUtcMinute) => {
    if (process.env.GITHUB_EVENT_NAME !== 'schedule') {
        return; // Don't wait for manual triggers
    }

    const targetDate = new Date();
    targetDate.setUTCHours(targetUtcHour, targetUtcMinute, 0, 0);

    const diff = targetDate.getTime() - Date.now();

    // If the diff is positive (future) and less than 2 hours (sanity check)
    if (diff > 0 && diff < 2 * 60 * 60 * 1000) {
        console.log(`Current UTC time: ${new Date().toISOString()}`);
        console.log(`Target exact UTC time: ${targetDate.toISOString()}`);
        console.log(`Waiting ${Math.round(diff / 1000)} seconds for exact timing...`);
        await new Promise(r => setTimeout(r, diff));
        console.log(`Wait finished. Executing at exact target time!`);
    } else {
        console.log(`Target time already passed by ${Math.round(-diff / 1000)} seconds, executing immediately.`);
    }
};

const main = async () => {
    try {
        const expoModule = await import("expo-server-sdk");
        Expo = expoModule.Expo;
        expo = new Expo();

        let activeMode = mode;
        if (activeMode === "auto") {
            const currentHour = new Date().getUTCHours();
            // If it's past 12:00 UTC (which is 5:30 PM IST), we assume it's the evening run (15:30 UTC)
            if (currentHour >= 12) {
                activeMode = "evening";
            } else {
                activeMode = "morning";
            }
            console.log(`Auto mode detected. Current UTC hour: ${currentHour}. Selecting mode: ${activeMode}`);
        }

        if (activeMode === "evening") {
            await waitTillExactTime(15, 30); // 9:00 PM IST = 15:30 UTC
            await sendEveningNotifications();
        } else if (activeMode === "motivation_only") {
            await waitTillExactTime(0, 30); // 6:00 AM IST = 00:30 UTC
            await sendMorningNotifications(true, false);
        } else if (activeMode === "reminders_only") {
            await waitTillExactTime(0, 30); // 6:00 AM IST = 00:30 UTC
            await sendMorningNotifications(false, true);
        } else {
            await waitTillExactTime(0, 30); // 6:00 AM IST = 00:30 UTC
            await sendMorningNotifications(true, true);
        }
    } catch (error) {
        console.error("Error running notification job:", error);
        process.exit(1);
    }
};

main();

