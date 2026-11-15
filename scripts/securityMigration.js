/**
 * One-time security migration for existing LigthsON data.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/NEW-key.json \
 *     node scripts/securityMigration.js                 # dry run, prints what would change
 *     node scripts/securityMigration.js --apply         # writes the changes
 *     node scripts/securityMigration.js --apply --admins=a@x.com,b@y.com
 *
 * What it does:
 *   1. Creates usernames/{userName} → { uid } for every existing profile, so
 *      username availability and login keep working under the new rules.
 *   2. Deletes the plaintext `securityPin` field from every profile (new
 *      sign-ups keep the PIN in the device keychain instead).
 *   3. Deletes the legacy `isAdmin` profile flag (users could set it on themselves).
 *   4. With --admins, creates admins/{uid} for those emails — the only source
 *      of admin rights for the rules, functions and admin panel.
 */
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const adminEmails = (args.find((a) => a.startsWith("--admins=")) || "")
  .replace("--admins=", "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key path first.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const run = async () => {
  console.log(APPLY ? "APPLYING changes" : "DRY RUN (add --apply to write)");
  const users = await db.collection("users").get();
  const seen = new Map();
  let usernames = 0, pins = 0, flags = 0, conflicts = 0;
  let batch = db.batch(), pending = 0;

  const flush = async () => {
    if (APPLY && pending) await batch.commit();
    batch = db.batch();
    pending = 0;
  };
  const queue = async (fn) => {
    fn(batch);
    if (++pending >= 400) await flush();
  };

  for (const snap of users.docs) {
    const data = snap.data();
    const name = typeof data.userName === "string" ? data.userName.trim().toLowerCase() : "";

    if (/^[^\s/]{3,40}$/.test(name)) {
      if (seen.has(name) && seen.get(name) !== snap.id) {
        conflicts++;
        console.warn(`  duplicate username "${name}": ${seen.get(name)} and ${snap.id} (kept the first)`);
      } else {
        seen.set(name, snap.id);
        const ref = db.doc(`usernames/${name}`);
        const existing = await ref.get();
        if (!existing.exists) {
          usernames++;
          await queue((b) => b.set(ref, { uid: snap.id, createdAt: FieldValue.serverTimestamp() }));
        }
      }
    } else if (name) {
      console.warn(`  username "${name}" (${snap.id}) has spaces or slashes; username login will fall back to a server lookup`);
    }

    const cleanup = {};
    if ("securityPin" in data) { cleanup.securityPin = FieldValue.delete(); pins++; }
    if ("isAdmin" in data) { cleanup.isAdmin = FieldValue.delete(); flags++; }
    if (Object.keys(cleanup).length) await queue((b) => b.update(snap.ref, cleanup));
  }

  for (const email of adminEmails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      console.log(`  admin: ${email} → admins/${user.uid}`);
      await queue((b) => b.set(db.doc(`admins/${user.uid}`), { email, grantedAt: FieldValue.serverTimestamp() }, { merge: true }));
    } catch (err) {
      console.warn(`  admin: no auth account for ${email}`);
    }
  }

  await flush();
  console.log(`\nProfiles scanned: ${users.size}`);
  console.log(`usernames index entries ${APPLY ? "created" : "to create"}: ${usernames}`);
  console.log(`plaintext PINs ${APPLY ? "removed" : "to remove"}: ${pins}`);
  console.log(`isAdmin flags ${APPLY ? "removed" : "to remove"}: ${flags}`);
  if (conflicts) console.log(`duplicate usernames needing manual review: ${conflicts}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
