import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export default app;
