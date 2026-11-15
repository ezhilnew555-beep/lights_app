// Theme mode (light / dark) for the Pulse design system.
// The active mode is persisted and applied before the first screen renders.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { P, applyTheme, getThemeMode, subscribeTheme } from "./theme";
import { quietEntrances } from "../ux/motion";

const STORAGE_KEY = "pulse.themeMode";

const ThemeContext = createContext({
  mode: "light",
  dark: false,
  t: P,
  setMode: () => {},
  toggleTheme: () => {},
});

/** Read the saved mode and apply it. Call before rendering screens. */
export const loadStoredTheme = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") applyTheme(saved);
  } catch (e) {}
  return getThemeMode();
};

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState(getThemeMode());

  useEffect(() => subscribeTheme(setModeState), []);

  const setMode = useCallback((next) => {
    // The tree remounts for the new palette: crossfade it, don't replay entrances
    if (next !== getThemeMode()) quietEntrances();
    applyTheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(getThemeMode() === "dark" ? "light" : "dark");
  }, [setMode]);

  const value = useMemo(
    () => ({ mode, dark: mode === "dark", t: { ...P }, setMode, toggleTheme }),
    [mode, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
