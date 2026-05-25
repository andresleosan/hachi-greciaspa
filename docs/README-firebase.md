## Firebase setup, env vars and security rules

This project uses Firebase Auth and Firestore. Follow these steps to configure and deploy safely.

1. Add environment variables locally (do NOT commit secrets)

Create a `.env.local` with the following keys (values from your Firebase console):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

2. Local testing (recommended): Firebase Emulator Suite

- Install `firebase-tools` and start emulators:

```powershell
npm install -g firebase-tools
npx firebase emulators:start --only auth,firestore
```

3. Deploy Firestore rules (production)

Use the Firebase CLI to deploy only rules when ready:

```powershell
firebase deploy --only firestore:rules
```

4. Security notes

- The `firestore.rules` in the repo implements strict defaults: public read for marketing collections and strong restrictions for user data and bookings.
- The rules check for an `admin` custom claim (preferred) or the user's `users/{uid}.role == 'admin'` document field. To grant admin rights securely, set a custom claim from a trusted server or via Firebase Admin SDK.
- Rotate keys if they were ever committed publicly.

5. Next steps

- Wire the dashboard UI to Firestore queries (the codebase contains a `DashboardPage` scaffold).
- Consider adding Cloud Functions for privileged operations (role assignment, scheduled jobs).
