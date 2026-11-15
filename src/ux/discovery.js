// Discovery — what the person has already found, and what they told us
// they care about. Drives the Getting Started card and when hints appear.
//
//   markSeen("fire")          the user has opened their F.I.R.E. plan
//   useSeen(["fire"])         { fire: true, loaded: true }
//   setFocus("invest")        answer to onboarding's "start with" question
//   useFocus()                { focus: "spend" | "invest" | "fire" | null, loaded }
//
// Device-only (AsyncStorage), like tips and entry memory.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN = "ux.seen.";
const FOCUS = "ux.focus";

const seen = {};
let focus;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export const markSeen = (key) => {
  if (seen[key]) return;
  seen[key] = true;
  AsyncStorage.setItem(SEEN + key, "1").catch(() => {});
  emit();
};

export const setFocus = (value) => {
  focus = value || null;
  AsyncStorage.setItem(FOCUS, focus || "").catch(() => {});
  emit();
};

// [value, loaded] — loaded turns true once storage has been read
const useStore = (read, load) => {
  const [v, setV] = useState(read);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const update = () => alive && setV(read());
    subs.add(update);
    load().then(() => {
      update();
      if (alive) setLoaded(true);
    });
    return () => {
      alive = false;
      subs.delete(update);
    };
  }, []);
  return [v, loaded];
};

/** { key: boolean } for each key, plus `loaded`. */
export const useSeen = (keys) => {
  const [v, loaded] = useStore(
    () => Object.fromEntries(keys.map((k) => [k, !!seen[k]])),
    () =>
      AsyncStorage.multiGet(keys.filter((k) => !seen[k]).map((k) => SEEN + k))
        .then((rows) => rows.forEach(([k, v]) => v && (seen[k.slice(SEEN.length)] = true)))
        .catch(() => {}),
  );
  return { ...v, loaded };
};

export const useFocus = () => {
  const [v, loaded] = useStore(
    () => focus || null,
    () =>
      focus !== undefined
        ? Promise.resolve()
        : AsyncStorage.getItem(FOCUS)
            .then((v) => (focus = v || null))
            .catch(() => (focus = null)),
  );
  return { focus: v, loaded };
};
