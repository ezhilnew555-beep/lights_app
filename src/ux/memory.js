// What the app learns about how this person logs money, kept on the device.
//
// Each saved entry is remembered per kind ("expense", "income"): the last
// category and payment method become the next form's defaults, and the most
// used items become one-tap shortcuts. The longer someone uses LigthsON, the
// fewer taps a log takes.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = (kind) => `ux.memory.${kind}`;
const MAX_ITEMS = 40;

const empty = () => ({ last: null, items: {} });

export const getEntryMemory = async (kind) => {
  try {
    const raw = await AsyncStorage.getItem(KEY(kind));
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch (e) {
    return empty();
  }
};

/** Record a saved entry: { name, subType, method }. */
export const rememberEntry = async (kind, { name, subType, method }) => {
  if (!name) return;
  const mem = await getEntryMemory(kind);
  const k = `${subType || ""}|${name}`;
  const prev = mem.items[k] || { name, subType, count: 0 };
  mem.items[k] = { ...prev, count: prev.count + 1, at: Date.now() };
  mem.last = { subType, method };

  // Keep the store small: drop the least used, oldest entries
  const keys = Object.keys(mem.items);
  if (keys.length > MAX_ITEMS) {
    keys
      .sort((a, b) => mem.items[a].count - mem.items[b].count || mem.items[a].at - mem.items[b].at)
      .slice(0, keys.length - MAX_ITEMS)
      .forEach((x) => delete mem.items[x]);
  }
  AsyncStorage.setItem(KEY(kind), JSON.stringify(mem)).catch(() => {});
};

/**
 * Shortcuts for the form: the most used items, ties broken by recency.
 * Only items logged at least twice count as a habit.
 */
export const topEntries = (mem, limit = 4) =>
  Object.values(mem?.items || {})
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.at - a.at)
    .slice(0, limit);
