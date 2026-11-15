/**
 * firebaseAuthService.js
 * Replaces the custom JWT backend auth (POST /api/register, /api/login, /api/google-auth).
 * Uses Firebase Auth + Firestore to manage users.
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithCredential,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import {
    doc,
    getDoc,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { auth, db } from "../config/FirebaseConfig";

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
/**
 * Creates a new Firebase Auth user and stores their profile in Firestore.
 * @param {string} email
 * @param {string} password
 * @param {object} profileData — { firstName, lastName, userName, age, retirementAge, phoneNumber, country, securityPin }
 *
 * The profile and the username reservation are written in one batch, so the
 * security rules can guarantee usernames stay unique. The security PIN never
 * leaves the device: it is kept in the OS keychain via expo-secure-store.
 */
export const registerUser = async (email, password, profileData) => {
    const userName = profileData.userName.trim().toLowerCase();
    if (!/^[^\s/]{3,40}$/.test(userName)) {
        const error = new Error("Usernames need 3–40 characters with no spaces or slashes.");
        error.code = "app/invalid-username";
        throw error;
    }

    // Step 1: Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Step 2: Save profile to users/{uid} and reserve usernames/{userName}
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid), {
        uid,
        email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        userName,
        age: parseInt(profileData.age),
        retirementAge: parseInt(profileData.retirementAge),
        phoneNumber: profileData.phoneNumber,
        country: profileData.country,
        createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "usernames", userName), { uid, createdAt: serverTimestamp() });
    try {
        await batch.commit();
    } catch (err) {
        // Username taken in the meantime (or profile rejected): undo the auth account.
        await userCredential.user.delete().catch(() => {});
        const error = new Error("That username was just taken. Please choose another.");
        error.code = "app/username-taken";
        throw error;
    }

    // Step 3: Keep the security PIN on this device only
    if (profileData.securityPin) {
        await SecureStore.setItemAsync(`securityPin_${uid}`, profileData.securityPin);
    }

    return userCredential.user;
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
/**
 * Signs in a user with email + password via Firebase Auth.
 * @param {string} email
 * @param {string} password
 * @returns Firebase user object
 */
export const loginUser = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
/**
 * Sends a Firebase password reset email.
 * It deliberately does not reveal whether the address has an account, so the
 * screen should always show the same "if an account exists…" message.
 * @param {string} email
 */
export const forgotPassword = async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
};

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
/**
 * Signs out the current user from Firebase.
 */
export const logoutUser = async () => {
    await signOut(auth);
};

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
/**
 * Returns the currently signed-in Firebase user (or null).
 */
export const getCurrentUser = () => auth.currentUser;

// ─────────────────────────────────────────────
// USERNAME AVAILABILITY CHECK
// ─────────────────────────────────────────────
/**
 * Checks if a username is already taken in Firestore.
 * @param {string} userName
 * @returns {boolean} true if available, false if taken
 */
export const checkUsernameAvailable = async (userName) => {
    // usernames/{name} holds only a uid; the users collection is private.
    const snap = await getDoc(doc(db, "usernames", userName.trim().toLowerCase()));
    return !snap.exists(); // true = available
};

// ─────────────────────────────────────────────
// GET USER PROFILE FROM FIRESTORE
// ─────────────────────────────────────────────
/**
 * Fetches the Firestore profile for a given uid.
 * @param {string} uid
 */
export const getUserProfile = async (uid) => {
    const profileSnap = await getDoc(doc(db, "users", uid));
    if (profileSnap.exists()) return profileSnap.data();
    return null;
};
