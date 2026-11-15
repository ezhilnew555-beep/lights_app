// Firestore rules tests. Needs Java 11+.  cd security-tests && npm install && npm test
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore";

let env;
const alice = () => env.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
const bob = () => env.authenticatedContext("bob", { email: "bob@example.com" }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ligths",
    firestore: { rules: readFileSync("../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { uid: "alice", email: "alice@example.com", userName: "alice", coins: 100, phoneNumber: "1" });
    await setDoc(doc(db, "users/rich"), { uid: "rich", email: "r@example.com", userName: "rich", coins: 20000 });
    await setDoc(doc(db, "breakout_history/d1"), { Date: 1 });
    await setDoc(doc(db, "rewardClaims/c1"), { uid: "alice", status: "Pending" });
    await setDoc(doc(db, "admins/root"), { email: "root@example.com" });
  });
});

const profile = (uid, email, userName) => ({
  uid, email, userName, firstName: "A", lastName: "B", age: 29, retirementAge: 45,
  phoneNumber: "9999999999", country: "India", createdAt: serverTimestamp(),
});

test("strangers cannot read or list profiles", async () => {
  await assertFails(getDoc(doc(anon(), "users/alice")));
  await assertFails(getDoc(doc(bob(), "users/alice")));
  await assertFails(getDocs(query(collection(bob(), "users"), where("userName", "==", "alice"))));
  await assertSucceeds(getDoc(doc(alice(), "users/alice")));
});

test("users cannot change their own coins, email or last-seen date", async () => {
  await assertFails(updateDoc(doc(alice(), "users/alice"), { coins: 999999 }));
  await assertFails(updateDoc(doc(alice(), "users/alice"), { email: "x@y.com" }));
  await assertFails(updateDoc(doc(alice(), "users/alice"), { lastSeenDate: "2000-01-01" }));
  await assertFails(updateDoc(doc(alice(), "users/alice"), { isAdmin: true }));
  await assertSucceeds(updateDoc(doc(alice(), "users/alice"), { firstName: "Alicia", age: "30" }));
});

test("sign-up must reserve the username in the same batch", async () => {
  const db = bob();
  await assertFails(setDoc(doc(db, "users/bob"), profile("bob", "bob@example.com", "bob")));
  const b = writeBatch(db);
  b.set(doc(db, "users/bob"), profile("bob", "bob@example.com", "bob"));
  b.set(doc(db, "usernames/bob"), { uid: "bob", createdAt: serverTimestamp() });
  await assertSucceeds(b.commit());
});

test("a taken username cannot be claimed", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "usernames/alice"), { uid: "alice" }));
  const db = bob();
  const b = writeBatch(db);
  b.set(doc(db, "users/bob"), profile("bob", "bob@example.com", "alice"));
  b.set(doc(db, "usernames/alice"), { uid: "bob" });
  await assertFails(b.commit());
});

test("sign-up cannot grant coins or impersonate another email", async () => {
  const db = bob();
  const b = writeBatch(db);
  b.set(doc(db, "users/bob"), { ...profile("bob", "bob@example.com", "bob"), coins: 100000 });
  b.set(doc(db, "usernames/bob"), { uid: "bob" });
  await assertFails(b.commit());
  const c = writeBatch(db);
  c.set(doc(db, "users/bob"), profile("bob", "alice@example.com", "bob"));
  c.set(doc(db, "usernames/bob"), { uid: "bob" });
  await assertFails(c.commit());
});

test("financial records are private to their owner", async () => {
  await assertSucceeds(addDoc(collection(alice(), "users/alice/transactions"), { name: "Groceries", amount: 350, type: "Expense" }));
  await assertFails(addDoc(collection(bob(), "users/alice/transactions"), { amount: 1, type: "Expense" }));
  await assertFails(getDocs(collection(bob(), "users/alice/transactions")));
  await assertFails(addDoc(collection(alice(), "users/alice/transactions"), { amount: "350" }));
});

test("coin history and reward claims are server-only", async () => {
  await assertFails(addDoc(collection(alice(), "users/alice/coinHistory"), { points: 1000 }));
  await assertFails(setDoc(doc(alice(), "rewardClaims/c2"), { uid: "alice", status: "Completed" }));
  await assertFails(updateDoc(doc(alice(), "rewardClaims/c1"), { status: "Approved" }));
  await assertSucceeds(getDocs(query(collection(alice(), "rewardClaims"), where("uid", "==", "alice"))));
  await assertFails(getDocs(collection(alice(), "rewardClaims")));
});

test("breakout signals need 10,000 server-granted coins", async () => {
  await assertFails(getDocs(collection(alice(), "breakout_history")));
  await assertSucceeds(getDocs(collection(env.authenticatedContext("rich").firestore(), "breakout_history")));
});

test("admin rights cannot be self-granted", async () => {
  await assertFails(setDoc(doc(alice(), "admins/alice"), { email: "alice@example.com" }));
  const root = env.authenticatedContext("root").firestore();
  await assertSucceeds(getDocs(collection(root, "rewardClaims")));
  await assertSucceeds(getDoc(doc(root, "users/alice")));
});

test("unknown collections are closed", async () => {
  await assertFails(setDoc(doc(alice(), "anything/x"), { a: 1 }));
  await assertFails(getDoc(doc(alice(), "mutualFunds/1")).then(() => setDoc(doc(alice(), "mutualFunds/1"), { nav: 1 })));
});
