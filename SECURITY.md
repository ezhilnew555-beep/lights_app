# LigthsON security

How user data is protected across the app, the Cloud Functions and the admin panel, and the steps to deploy it.

## Security model

| Data | Who can read | Who can write |
|---|---|---|
| `users/{uid}` profile | The user; admins | The user, limited to name, age, retirement age, phone, country, push token. Never `coins`, `email`, `userName`, `lastSeenDate` or admin flags |
| `users/{uid}/transactions`, `investments`, `goals`, `stockPortfolio` | The user | The user (size and amount checks) |
| `users/{uid}/coinHistory`, `badgeAwards`, `premiumRewardRedemptions` | The user | Cloud Functions only |
| `usernames/{name}` → `{ uid }` | Anyone, one doc at a time (no listing) | The user, once, in the same batch as their profile |
| `rewardClaims` | The claim's owner; admins | Cloud Functions only |
| `breakout_history` | Signed-in users with ≥ 10,000 coins | Server pipelines only |
| `mutualFunds` | Signed-in users | Server pipelines only |
| `admins/{uid}` | That admin | Firebase console or `scripts/securityMigration.js` only |
| Cloud Storage | Nobody | Nobody (not used) |
| Anything else | Nobody | Nobody |

Coins can only change on the server:

- `onTransactionCreated` / `onInvestmentCreated` award coins for new records. Awards are idempotent per document and capped at 20 per day. Edits and repeat recurring entries carry `noReward: true`.
- `dailyCheckIn` gives the +5 daily reward and the 500-coin inactivity penalty, using the server's date in India time. The penalty never takes a balance below zero.
- `requestPremiumReward` checks the balance, deducts coins and files the claim in one transaction.
- `reviewRewardClaim` lets admins approve (no second deduction), reject (refunds the coins) or complete a claim.
- `lookupLoginEmail` resolves a username to an email for login, so the app never lists users.

The security PIN chosen at sign-up is stored in the device keychain (`expo-secure-store`), never in Firestore.

## Deploy runbook

Do these in order.

### 1. Rotate the leaked service-account key (urgent)

`ligthson-93799-firebase-adminsdk-fbsvc-317afbc2b6.json` was committed to git, so anyone with a clone can act as an admin on the whole project.

1. Google Cloud console → IAM & Admin → Service accounts → `firebase-adminsdk-fbsvc@…` → Keys. Create a new JSON key, then **delete** key `317afbc2b6…`.
2. Store the new key outside the repo, then update the `FIREBASE_SERVICE_ACCOUNT` secret in GitHub → Settings → Secrets → Actions.
3. Local scripts (`check_*.js`, `scripts/securityMigration.js`) read the key path from `GOOGLE_APPLICATION_CREDENTIALS`.
4. Optional, once rotated: remove the file from history with `git filter-repo --path ligthson-93799-firebase-adminsdk-fbsvc-317afbc2b6.json --invert-paths`, force-push, and have collaborators re-clone.

### 2. Lock down the API key and Auth settings

- Cloud console → APIs & Services → Credentials → the browser key: restrict it to the Android package + SHA-1, the iOS bundle ID and the admin panel's domain, and to the Firebase APIs the app uses.
- Firebase console → Authentication → Settings: turn on **Email enumeration protection** and set a password policy (at least 8 characters, matching the sign-up screen).

### 3. Deploy the functions

```bash
npm install -g firebase-tools && firebase login
cd functions && npm install && cp .env.example .env   # fill in RESEND_* and ADMIN_NOTIFICATION_EMAIL
cd .. && firebase deploy --only functions
```

The CLI will offer to delete the old `claimPremiumReward` function. Accept: its prices were wrong, including a 20-coin reward.

### 4. Migrate existing data and create admins

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/new-key.json
node scripts/securityMigration.js                       # dry run
node scripts/securityMigration.js --apply --admins=admin1@example.com,admin2@example.com
```

### 5. Ship the app and admin panel updates

Build a new app release (EAS) and redeploy `web/ligthsweb`. Older app builds cannot sign up, claim rewards or log in by username under the new rules. Ship a forced update if you can.

### 6. Deploy the rules

```bash
firebase firestore:indexes > firestore.indexes.json   # keep existing indexes before deploying
firebase deploy --only firestore:rules,firestore:indexes,storage
```

If the rules currently deployed in the console are open (test mode), do this step as soon as possible, even before every user has updated.

### 7. Test the rules (needs Java 11+)

```bash
cd security-tests && npm install && npm test
```

## Still to do

- **Voice backend** (`api.robxinnovations.in`): it must verify the Firebase ID token it receives and use the token's `uid`, never the `userId` in the request body. Otherwise one user can write into another's account.
- **App Check**: add Firebase App Check to the app and admin panel, then set `ENFORCE_APP_CHECK=true` in `functions/.env` and enforce it for Firestore in the console.
- **Local caches**: notes, MF state and the stock portfolio are also kept in plain AsyncStorage. That's acceptable for non-secret data, but clear it on sign-out.
