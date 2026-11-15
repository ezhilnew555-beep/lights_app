// Connectivity — is the app online? Drives the offline banner.
//
// No native NetInfo module: a tiny reachability request (HTTP 204) runs on
// launch, when the app returns to the foreground, after any error that
// looks like a network failure (friendlyError reports those), and every
// 30 s while offline until the connection is back.

import { useEffect, useState } from "react";
import { AppState } from "react-native";

const PROBE_URL = "https://clients3.google.com/generate_204";
const OFFLINE_RETRY_MS = 30000;

let online = true;
let probing = null;
let retry = null;
const subs = new Set();

const set = (v) => {
  clearTimeout(retry);
  if (!v) retry = setTimeout(checkConnection, OFFLINE_RETRY_MS);
  if (v === online) return;
  online = v;
  subs.forEach((fn) => fn(online));
};

export const isOnline = () => online;

/** Runs one reachability check (deduplicated while in flight). */
export const checkConnection = () => {
  if (probing) return probing;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 6000);
  probing = fetch(PROBE_URL, { method: "GET", cache: "no-store", signal: ctrl?.signal })
    .then((r) => set(r.status === 204 || r.ok))
    .catch(() => set(false))
    .finally(() => {
      clearTimeout(timer);
      probing = null;
    });
  return probing;
};

/** Call when a request failed in a way that looks like no network. */
export const reportNetworkError = () => {
  checkConnection();
};

let started = false;
const start = () => {
  if (started) return;
  started = true;
  checkConnection();
  AppState.addEventListener("change", (s) => {
    if (s === "active") checkConnection();
  });
};

/**
 * Call `fn(online)` whenever the connection drops or returns (non-React
 * callers such as the offline sync queue). Returns an unsubscribe function.
 */
export const onConnectivityChange = (fn) => {
  start();
  subs.add(fn);
  return () => subs.delete(fn);
};

/** Re-renders when the connection drops or returns. */
export const useOnline = () => {
  const [v, setV] = useState(online);
  useEffect(() => {
    start();
    setV(online);
    subs.add(setV);
    return () => subs.delete(setV);
  }, []);
  return v;
};
