const admin = require("firebase-admin");
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || (() => { throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path"); })());

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCategories() {
  try {
    const snapshot = await db.collection("breakout_history")
                             .where("Date", "==", 1785369600000)
                             .get();
    
    const categoriesMap = new Map();
    snapshot.forEach(doc => {
      const data = doc.data();
      const type = data.breakout_down;
      const count = categoriesMap.get(type) || 0;
      categoriesMap.set(type, count + 1);
    });
    
    console.log("Categories for latest date:");
    for (const [type, count] of categoriesMap.entries()) {
      console.log(`- ${type}: ${count} records`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkCategories();
