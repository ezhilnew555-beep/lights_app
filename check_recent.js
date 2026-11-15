const admin = require("firebase-admin");
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || (() => { throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path"); })());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRecent() {
  try {
    const snapshot = await db.collection("breakout_history")
                             .orderBy("Date", "desc")
                             .limit(10)
                             .get();
    
    console.log("Most recent documents:");
    snapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = new Date(data.Date).toISOString();
      console.log(doc.id, '=> Date:', data.Date, dateStr, 'symbol:', data.symbol);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

checkRecent();
