const admin = require("firebase-admin");
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || (() => { throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path"); })());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDates() {
  try {
    const snapshot = await db.collection("breakout_history").get();
    
    const datesMap = new Map();
    snapshot.forEach(doc => {
      const data = doc.data();
      const count = datesMap.get(data.Date) || 0;
      datesMap.set(data.Date, count + 1);
    });
    
    console.log("Unique Date values and their record counts:");
    const sortedDates = Array.from(datesMap.entries()).sort((a, b) => b[0] - a[0]);
    for (const [dateMs, count] of sortedDates) {
        if (dateMs) {
            const d = new Date(dateMs);
            console.log(`- ${dateMs} (${d.toISOString()}): ${count} records`);
        } else {
            console.log(`- undefined/null: ${count} records`);
        }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkDates();
