/**
 * FirebaseConfig.js
 * Core Firebase initialization for LigthsON.
 * Exports `auth` and `db` used across all services and screens.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
          apiKey: "AIzaSyDDP2HdqDJ1jpay63UOY3E8dtrb3EUFxG4",
          authDomain: "ligthson-93799.firebaseapp.com",
          projectId: "ligthson-93799",
          storageBucket: "ligthson-93799.firebasestorage.app",
          messagingSenderId: "507100918170",
          appId: "1:507100918170:web:a6cc82b141c1ed767b4a23",
          measurementId: "G-82V9Z1DHXX",
};

// isFirstInit prevents double-initialization on Metro hot-reload
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Use initializeAuth with AsyncStorage persistence only on first boot.
// On hot-reload (app already exists), getAuth() safely returns the existing instance.
export const auth = isFirstInit
          ? initializeAuth(app, {
                    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
          })
          : getAuth(app);

export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

export default app;
