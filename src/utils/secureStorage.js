/**
 * secureStorage.js — Session Management (Firebase Edition)
 *
 * Firebase Auth handles token management internally (no manual JWT storage).
 * This file provides a compatibility layer so existing screen code continues
 * to work while we migrate screen by screen.
 *
 * getUserSession() → reads Firebase Auth current user + Firestore profile
 * saveUserSession() → caches user profile in AsyncStorage for display
 * clearUserSession() → signs out from Firebase Auth + clears AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../config/FirebaseConfig";
import { readProfile } from "../services/offlineStore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const USER_INFO_KEY = "userInfo";

/**
 * Save user profile to AsyncStorage (for display in screens).
 * Firebase Auth token is managed automatically — no manual storage needed.
 * @param {Object} data - { user: { username, email, firstName, ... }, token }
 */
export const saveUserSession = async (data) => {
    try {
        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Error saving user session:", error);
        throw error;
    }
};

/**
 * Get current user session.
 * Tries Firebase Auth first (source of truth), falls back to AsyncStorage cache.
 * @returns {Object|null} session data with .user.username / .user.uid
 */
export const getUserSession = async () => {
    try {
        // Primary: check Firebase Auth. Wait for it to restore the saved
        // sign-in from the phone first (no network needed), else a cold start
        // can briefly look signed out and drop the user on Login.
        await Promise.race([auth.authStateReady?.(), new Promise((r) => setTimeout(r, 3000))]);
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            // Try to load Firestore profile for username
            try {
                // Phone copy when offline, so opening the app never waits on the network
                const profile = await readProfile(firebaseUser.uid);
                if (profile) {
                    // A cached token is fine offline; refreshing needs the network
                    const token = await firebaseUser.getIdToken().catch(() => null);
                    return {
                        token,
                        uid: firebaseUser.uid,
                        user: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            username: profile.userName,
                            userName: profile.userName,
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            age: profile.age,
                            retirementAge: profile.retirementAge,
                            phoneNumber: profile.phoneNumber,
                            country: profile.country,
                        },
                    };
                }
            } catch (firestoreErr) {
                console.warn("Firestore profile fetch failed, using cached session:", firestoreErr.message);
            }
        }

        // Fallback: AsyncStorage cache
        const userInfoString = await AsyncStorage.getItem(USER_INFO_KEY);
        if (!userInfoString) return null;
        return JSON.parse(userInfoString);
    } catch (error) {
        console.error("Error getting user session:", error);
        return null;
    }
};

/**
 * Get the Firebase Auth ID token (replaces old JWT token).
 * @returns {string|null}
 */
export const getAuthToken = async () => {
    try {
        const user = auth.currentUser;
        if (user) return await user.getIdToken();
        return null;
    } catch (error) {
        console.error("Error getting auth token:", error);
        return null;
    }
};

/**
 * Clear session: sign out from Firebase + clear AsyncStorage cache.
 */
export const clearUserSession = async () => {
    try {
        await signOut(auth);
        await AsyncStorage.removeItem(USER_INFO_KEY);
    } catch (error) {
        console.error("Error clearing user session:", error);
        throw error;
    }
};

/**
 * Check if a user is currently signed in.
 * @returns {boolean}
 */
export const isLoggedIn = async () => {
    return auth.currentUser !== null;
};

/**
 * Listen to auth state changes (use in App.js instead of one-time check).
 * @param {function} callback — called with user object or null
 * @returns unsubscribe function
 */
export const onSessionChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export default {
    saveUserSession,
    getUserSession,
    getAuthToken,
    clearUserSession,
    isLoggedIn,
    onSessionChange,
};

