Firestore rules test harness

This project includes a small test runner using `@firebase/rules-unit-testing` that exercises some of the security rules in `firestore.rules`.

Files added:

- `tools/firestore-tests/run-rules-tests.mjs` — small ESM script that runs a few basic assertions (public read, blocked write, user profile create).
- `package.json` script: `npm run rules:test` (calls the script above)

How to run (local):

1. Install dev dependency: `npm install -D @firebase/rules-unit-testing`
2. Option A (recommended): Use the test runner directly (it uses a sandboxed test environment):
   - `npm run rules:test`
   - The script will load `firestore.rules` and run the included assertions. It does not require the Firebase CLI emulator to be running.

3. Option B (integration with emulator):
   - Install Firebase CLI: `npm i -g firebase-tools`
   - Start emulator: `npx firebase emulators:start --only firestore`
   - (Optional) Run the test script while the emulator is running to exercise rules against the running emulator.

Notes:

- The test runner is minimal and intended as a starting point. Add more `assertSucceeds` / `assertFails` cases to cover admin-only paths, reservas, and user role checks.
- If you see errors about missing packages, install `@firebase/rules-unit-testing` as above. The script expects `firestore.rules` at the repository root.

If you want, I can extend the test suite to cover `reservas` creation rules, admin checks using custom claims, and automated CI integration (GitHub Actions).
