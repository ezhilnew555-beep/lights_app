const admin = require("firebase-admin");
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || (() => { throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path"); })());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
  try {
    const collections = await db.listCollections();
    console.log("Collections:", collections.map(c => c.id));
    
    // Also try to read a collection that might be 'breakout_stocks' or 'breakout'
    for (const name of collections.map(c => c.id)) {
      if (name.toLowerCase().includes('breakout')) {
        console.log(`\nSample from ${name}:`);
        const snapshot = await db.collection(name).limit(1).get();
        snapshot.forEach(doc => {
          console.log(doc.id, '=>', doc.data());
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkCollections();
