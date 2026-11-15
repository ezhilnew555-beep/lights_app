// Preview stand-in for src/utils/secureStorage.js.
// Also drives the screenshot harness through URL params:
//   ?auth=out            start signed out (Auth stack)
//   ?theme=dark          start in the dark theme
//   ?nav=Tab/Screen      open a screen, e.g. nav=Wealth/MFScreen, nav=Auth/Login
//   ?p={"symbol":"INFY"} route params for the screen opened by nav (JSON)
import { auth } from "./FirebaseConfig";
import { applyTheme } from "../../src/theme/theme";
import { navigationRef } from "../../src/navigation/navigationRef";

const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

if (params.get("theme") === "dark") applyTheme("dark");

const openRequestedScreen = () => {
  const nav = params.get("nav");
  if (!nav) return;
  const [a, b, c] = nav.split("/");
  let leaf;
  try {
    leaf = params.get("p") ? JSON.parse(params.get("p")) : undefined;
  } catch (e) {}
  const tryNav = (n = 0) => {
    if (!navigationRef.isReady()) {
      if (n < 100) setTimeout(() => tryNav(n + 1), 100);
      return;
    }
    if (a === "Auth") navigationRef.navigate("Auth", { screen: b });
    else if (a === "Root") navigationRef.navigate(b);
    else if (c) navigationRef.navigate("MainApp", { screen: a, params: { screen: b, params: { screen: c, params: leaf } } });
    else if (b) navigationRef.navigate("MainApp", { screen: a, params: { screen: b, params: leaf } });
    else navigationRef.navigate("MainApp", { screen: a });
  };
  setTimeout(() => tryNav(), 400);
};

export const saveUserSession = async () => {};
export const getUserSession = async () => (auth.currentUser ? { user: { uid: auth.currentUser.uid, username: "arjun" } } : null);
export const getAuthToken = async () => (auth.currentUser ? "preview-token" : null);
export const clearUserSession = async () => {};
export const isLoggedIn = async () => auth.currentUser !== null;
export const onSessionChange = (callback) => {
  // ?hold=1 keeps the launch loader on screen (never finishes loading)
  if (params.get("hold") === "1") return () => {};
  setTimeout(() => {
    callback(auth.currentUser);
    openRequestedScreen();
  }, 50);
  return () => {};
};

export default { saveUserSession, getUserSession, getAuthToken, clearUserSession, isLoggedIn, onSessionChange };
