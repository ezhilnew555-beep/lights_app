/**
 * offlineStore.js
 * Local-first ("edge") copy of the signed-in user's data, so LigthsON works
 * with no network and catches the cloud up when the connection returns.
 *
 *   - Every collection under users/{uid} that the app reads is mirrored in a
 *     file on the phone. Reads go to Firestore when online (with a time
 *     limit) and fall back to the phone copy when offline or slow.
 *   - Every write is applied to the phone copy straight away and appended to
 *     an outbox that is saved to disk, so it survives the app being killed.
 *     The outbox is replayed to Firestore, in order, whenever the app is
 *     online: on reconnect, on returning to the foreground, after each write
 *     and on a retry timer while anything is pending.
 *   - New documents get their id on the phone, so a record created offline
 *     keeps the same id in the cloud and replays are idempotent.
 *
 * Firestore's web SDK only has a memory cache in React Native, which is why
 * this layer exists: without it reads fail offline and writes never resolve.
 */
import * as FileSystem from "expo-file-system/legacy";
import { AppState } from "react-native";
import { EventRegister } from "react-native-event-listeners";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../config/FirebaseConfig";
import { isOnline, checkConnection, reportNetworkError, onConnectivityChange } from "../ux/connectivity";

const DIR = FileSystem.documentDirectory;
const fileFor = (uid) => (DIR ? `${DIR}ligthson_local_${uid}.json` : null);

const READ_TIMEOUT_MS = 6000; // with a phone copy to fall back on
const FIRST_READ_TIMEOUT_MS = 15000; // nothing saved yet: wait longer
const WRITE_TIMEOUT_MS = 15000;
const RETRY_MS = 30000;
const MAX_TRIES = 20; // a change that keeps failing is dropped so it can't block the queue

/** Use in write data where Firestore's serverTimestamp() is wanted. */
export const SERVER_TIME = Object.freeze({ __serverTime: true });

// ── Encoding ────────────────────────────────────────────────────────
// Timestamps / Dates are stored as { __ts: ms } and revived as Firestore
// Timestamps, so records read from the phone look like ones from the cloud.

const isPlain = (v) => v && typeof v === "object" && !Array.isArray(v);

const encode = (v) => {
  if (v === undefined) return undefined;
  if (v === SERVER_TIME || v?.__serverTime) return { __serverTime: true };
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (v instanceof Date) return { __ts: v.getTime() };
  if (Array.isArray(v)) return v.map(encode);
  if (isPlain(v)) {
    const out = {};
    Object.keys(v).forEach((k) => {
      const e = encode(v[k]);
      if (e !== undefined) out[k] = e;
    });
    return out;
  }
  return v;
};

/** Phone copy: pending server times become "now". */
const toLocal = (v) => {
  if (v?.__serverTime) return { __ts: Date.now() };
  if (Array.isArray(v)) return v.map(toLocal);
  if (isPlain(v) && v.__ts === undefined) {
    const out = {};
    Object.keys(v).forEach((k) => (out[k] = toLocal(v[k])));
    return out;
  }
  return v;
};

const revive = (v) => {
  if (Array.isArray(v)) return v.map(revive);
  if (isPlain(v)) {
    if (typeof v.__ts === "number") return Timestamp.fromMillis(v.__ts);
    const out = {};
    Object.keys(v).forEach((k) => (out[k] = revive(v[k])));
    return out;
  }
  return v;
};

/** Outbox data -> Firestore data. */
const toRemote = (v) => {
  if (v?.__serverTime) return serverTimestamp();
  if (Array.isArray(v)) return v.map(toRemote);
  if (isPlain(v)) {
    if (typeof v.__ts === "number") return Timestamp.fromMillis(v.__ts);
    const out = {};
    Object.keys(v).forEach((k) => (out[k] = toRemote(v[k])));
    return out;
  }
  return v;
};

// ── Store ───────────────────────────────────────────────────────────
// { uid, docs: { [col]: { [id]: data } }, loaded: { [col]: ms }, outbox: op[] }
// col "" is the profile document users/{uid}; its id is the uid.

let store = null;
// Changes sent in the last minute, kept in memory: a read that started before
// the cloud had them must not wipe them from the phone copy.
let recent = [];
const RECENT_MS = 60000;
const overlay = (col, since) => {
  recent = recent.filter((r) => Date.now() - r.sentAt < RECENT_MS);
  recent.filter((r) => r.op.col === col && r.sentAt >= since).forEach((r) => applyLocal(r.op));
  store.outbox.filter((op) => op.col === col).forEach(applyLocal);
};
let hydrating = null;
const pendingSubs = new Set();

const emptyStore = (uid) => ({ uid, docs: {}, loaded: {}, outbox: [] });

const hydrate = async (uid) => {
  if (store?.uid === uid) return store;
  if (hydrating?.uid === uid) return hydrating.promise;
  const promise = (async () => {
    recent = [];
    let next = emptyStore(uid);
    const file = fileFor(uid);
    if (file) {
      try {
        const info = await FileSystem.getInfoAsync(file);
        if (info.exists) {
          const saved = JSON.parse(await FileSystem.readAsStringAsync(file));
          if (saved?.uid === uid) next = { ...next, ...saved };
        }
      } catch (e) {
        console.warn("Offline store: couldn't read the phone copy:", e?.message);
      }
    }
    store = next;
    hydrating = null;
    notifyPending();
    return store;
  })();
  hydrating = { uid, promise };
  return promise;
};

// Writes to the file are serialised; a change while one is in flight is
// written right after it.
let saving = null;
let saveAgain = false;
const persist = () => {
  const s = store;
  const file = s && fileFor(s.uid);
  if (!file) return Promise.resolve();
  if (saving) {
    saveAgain = true;
    return saving;
  }
  saving = FileSystem.writeAsStringAsync(file, JSON.stringify(s))
    .catch((e) => console.warn("Offline store: couldn't save the phone copy:", e?.message))
    .finally(() => {
      saving = null;
      if (saveAgain) {
        saveAgain = false;
        persist();
      }
    });
  return saving;
};

const colDocs = (col) => (store.docs[col] = store.docs[col] || {});

const applyLocal = (op) => {
  const docs = colDocs(op.col);
  if (op.kind === "delete") delete docs[op.id];
  else if (op.kind === "set" && !op.merge) docs[op.id] = toLocal(op.data);
  else if (op.kind === "update" && !docs[op.id]) return; // like Firestore: nothing to update
  else docs[op.id] = { ...(docs[op.id] || {}), ...toLocal(op.data) };
};

const list = (col) =>
  Object.entries(store.docs[col] || {}).map(([id, data]) => ({ id, ...revive(data) }));

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), ms))]);

const currentUid = () => auth.currentUser?.uid || null;

// ── Reads ───────────────────────────────────────────────────────────

/**
 * Documents of users/{uid}/{col}, as [{ id, ...data }].
 * Online: fresh from Firestore (saved to the phone, with unsynced local
 * changes laid over it). Offline or slow: the phone copy.
 */
export const readCollection = async (uid, col) => {
  await hydrate(uid);
  const haveCopy = !!store.loaded[col];
  if (isOnline()) {
    const started = Date.now();
    try {
      const snap = await withTimeout(getDocs(collection(db, "users", uid, col)), haveCopy ? READ_TIMEOUT_MS : FIRST_READ_TIMEOUT_MS);
      if (store?.uid !== uid) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const docs = {};
      snap.docs.forEach((d) => (docs[d.id] = encode(d.data())));
      store.docs[col] = docs;
      overlay(col, started);
      store.loaded[col] = Date.now();
      persist();
      flush();
      return list(col);
    } catch (e) {
      if (isNetworkError(e)) reportNetworkError();
      else if (!haveCopy) throw e;
    }
  }
  return list(col);
};

/** The profile document users/{uid}, or null. Same policy as readCollection. */
export const readProfile = async (uid) => {
  await hydrate(uid);
  const haveCopy = !!store.loaded[""];
  if (isOnline()) {
    const started = Date.now();
    try {
      const snap = await withTimeout(getDoc(doc(db, "users", uid)), haveCopy ? READ_TIMEOUT_MS : FIRST_READ_TIMEOUT_MS);
      if (store?.uid !== uid) return snap.exists() ? snap.data() : null;
      store.docs[""] = snap.exists() ? { [uid]: encode(snap.data()) } : {};
      overlay("", started);
      store.loaded[""] = Date.now();
      persist();
      flush();
    } catch (e) {
      if (isNetworkError(e)) reportNetworkError();
      else if (!haveCopy) throw e;
    }
  }
  const data = store.docs[""]?.[uid];
  return data ? revive(data) : null;
};

/**
 * The phone copy of a collection without touching the network, or null if
 * it has never been loaded on this phone. Includes unsynced changes.
 */
export const readLocal = async (uid, col) => {
  await hydrate(uid);
  return store.loaded[col] ? list(col) : null;
};

// ── Writes ──────────────────────────────────────────────────────────

/** A new document id, generated on the phone (works offline). */
export const newId = (uid, col) => doc(collection(db, "users", uid, col)).id;

/**
 * Queue a write and apply it to the phone copy. Resolves once it is saved on
 * the phone — not when the cloud has it — so it never hangs offline.
 * @param {"set"|"update"|"delete"} kind
 * @param {string} col collection under users/{uid}; "" for the profile doc
 */
export const write = async (uid, kind, col, id, data = null, { merge = false } = {}) => {
  await hydrate(uid);
  const op = {
    op: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    kind,
    col,
    id,
    data: data ? encode(data) : null,
    merge,
    at: Date.now(),
  };
  applyLocal(op);
  store.outbox.push(op);
  notifyPending();
  await persist();
  flush();
  return id;
};

// ── Sync ────────────────────────────────────────────────────────────

const isNetworkError = (e) => {
  const code = String(e?.code || "");
  const msg = String(e?.message || "").toLowerCase();
  return (
    ["timeout", "unavailable", "deadline-exceeded", "cancelled", "resource-exhausted", "unknown"].some((c) => code.endsWith(c)) ||
    msg.includes("offline") ||
    msg.includes("network")
  );
};

const remoteRef = (uid, op) => (op.col ? doc(db, "users", uid, op.col, op.id) : doc(db, "users", uid));

const sendOp = (uid, op) => {
  const ref = remoteRef(uid, op);
  if (op.kind === "delete") return deleteDoc(ref);
  if (op.kind === "update") return updateDoc(ref, toRemote(op.data));
  return setDoc(ref, toRemote(op.data), op.merge ? { merge: true } : {});
};

let flushing = null;
let retryTimer = null;

/** Push queued changes to Firestore, oldest first. Safe to call any time. */
export const flush = () => {
  if (flushing) return flushing;
  const uid = currentUid();
  if (!store || !uid || store.uid !== uid || !store.outbox.length) return Promise.resolve(0);
  if (!isOnline()) return Promise.resolve(0);

  flushing = (async () => {
    let sent = 0;
    clearTimeout(retryTimer);
    while (store?.uid === uid && store.outbox.length) {
      const op = store.outbox[0];
      try {
        await withTimeout(sendOp(uid, op), WRITE_TIMEOUT_MS);
        recent.push({ op, sentAt: Date.now() });
        sent += 1;
      } catch (e) {
        op.tries = (op.tries || 0) + 1;
        if (isNetworkError(e) && op.tries < MAX_TRIES) {
          reportNetworkError();
          persist();
          retryTimer = setTimeout(flush, RETRY_MS);
          break;
        }
        // Rejected by the server (rules, missing doc…): retrying won't help
        console.warn(`Offline sync: dropped ${op.kind} ${op.col}/${op.id}:`, e?.code || e?.message);
      }
      store.outbox.shift();
      notifyPending();
      await persist();
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });

  flushing.then((sent) => {
    if (sent) EventRegister.emit("offlineSynced", { sent });
  });
  return flushing;
};

/** Changes saved on the phone that the cloud doesn't have yet. */
export const pendingCount = () => store?.outbox.length || 0;

const notifyPending = () => pendingSubs.forEach((fn) => fn(pendingCount()));

/** Re-renders with the number of changes waiting to sync. */
export const usePendingSync = () => {
  const [n, setN] = useState(pendingCount());
  useEffect(() => {
    pendingSubs.add(setN);
    setN(pendingCount());
    return () => pendingSubs.delete(setN);
  }, []);
  return n;
};

/**
 * Start syncing: load the phone copy for the signed-in user and flush on
 * reconnect / foreground. Call once at app start.
 */
let started = false;
export const startOfflineSync = () => {
  if (started) return;
  started = true;
  const kick = () => {
    const uid = currentUid();
    if (uid) hydrate(uid).then(() => flush());
  };
  auth.onAuthStateChanged?.((user) => user && kick());
  onConnectivityChange((online) => online && kick());
  AppState.addEventListener("change", (s) => {
    if (s === "active") checkConnection().finally(kick);
  });
  kick();
};
