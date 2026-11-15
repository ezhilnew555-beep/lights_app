import { collection, getDocs, query, where } from "firebase/firestore";
import app, { db } from "../config/FirebaseConfig";

/**
 * Fetch all reward claims for a specific user from the root rewardClaims collection.
 * Sorted by newest request first (client-side to avoid composite index requirement).
 */
export const getPremiumRewardClaims = async (uid) => {
  const q = query(
    collection(db, "rewardClaims"),
    where("uid", "==", uid)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  // Sort newest first client-side (avoids needing a Firestore composite index)
  return docs.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
};