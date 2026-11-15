// Preview stand-in for src/services/firebaseAuthService.js
import { auth } from "./FirebaseConfig";
import { profile } from "./demoData";

export const registerUser = async () => ({ uid: "demo-user" });
export const loginUser = async () => auth.currentUser;
export const forgotPassword = async () => {};
export const logoutUser = async () => {};
export const getCurrentUser = () => auth.currentUser;
export const checkUsernameAvailable = async () => true;
export const getUserProfile = async () => ({ ...profile });
