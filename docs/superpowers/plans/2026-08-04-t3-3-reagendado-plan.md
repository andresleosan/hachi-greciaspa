# T3.3 Reagendado De Reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure client rescheduling for pending reservations while hardening cancellation and enforcing slot availability in a callable Firebase Function.

**Architecture:** Keep the reservation schema unchanged. The browser calls a Firebase Functions v2 callable for rescheduling; the Function validates the caller and performs the reservation/slot read-update sequence in an Admin SDK transaction. Firestore rules provide defense-in-depth for direct client updates, while the dashboard exposes a small inline rescheduling form.

**Tech Stack:** React 19, TypeScript 6, Firebase Auth/Firestore, Firebase Functions v2, Firebase Admin SDK, `date-fns-tz`, Firestore emulator, Vitest.

## Global Constraints

- The client may reschedule only through the `rescheduleReserva` callable; direct Firestore date/time updates are denied.
- Rescheduling changes only `date` and `timeSlot`; no new fields or collections are introduced.
- The callable validates future date/time in `America/Mexico_City` and rejects an occupied active slot.
- The client may cancel only by changing `status` to `'cancelled'`; no other field may change.
- Admin retains full reservation update access.
- The callable uses Admin SDK and never exposes a secret to the browser.
- No destructive migration is allowed; no production deployment is performed.
- Preserve existing local changes in `src/components/AdminPrices.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/DashboardPage.tsx`, `src/services/firebase.ts`, `tools/set-admin.js`, and `src/vite-env.d.ts`; coordinate Dashboard changes instead of reverting them.
- Error responses and logs must not contain secrets or unnecessary personal data.
- Client-side pure error mapping is tested with Vitest; Firebase-dependent UI behavior is verified through typecheck/build and the callable/rules tests.

---

### Task 1: Implement Reschedule Domain And Callable

**Files:**
- Create: `functions/src/rescheduleReserva.ts`
- Create: `functions/src/rescheduleReserva.test.ts`
- Modify: `functions/src/index.ts`
- Test: `npm --prefix functions test -- rescheduleReserva.test.ts`

**Interfaces:**
- Produces `RescheduleReservaInput` with `reservaId: string`, `date: string`, and `timeSlot: string`.
- Produces `RescheduleReservaResult` with `reservaId: string`, `date: string`, and `timeSlot: string`.
- Produces `rescheduleReserva` as a Firebase Functions v2 callable export.
- Produces a testable `rescheduleReservaHandler(request, db, now)` seam so tests do not call the real provider or production Firebase.

- [ ] **Step 1: Write failing validation tests**

Cover malformed input, invalid `YYYY-MM-DD`, invalid `HH:mm`, missing auth, past appointment date/time, and a valid future input in `America/Mexico_City`. Assert Firebase `HttpsError` codes and do not assert implementation details.

- [ ] **Step 2: Run the tests and verify the expected red state**

Run:

```powershell
npm --prefix functions test -- rescheduleReserva.test.ts
```

Expected: fail because `rescheduleReserva.ts` and its handler do not exist yet.

- [ ] **Step 3: Implement minimal input validation and callable export**

Add the exact input/result contracts, timezone-aware appointment validation, `HttpsError` mapping, and export the callable from `functions/src/index.ts`. Use `onCall` from `firebase-functions/v2/https`; do not read environment variables or log request payloads.

- [ ] **Step 4: Write failing transaction tests**

Add a Firestore seam test for a valid pending owned reservation and tests for reservation not found, another owner, non-pending status, an active conflicting reservation, and a cancelled conflicting reservation. Assert that success updates only `date` and `timeSlot` and returns the result.

- [ ] **Step 5: Implement the Admin SDK transaction**

Read the reservation in a transaction, validate `userId` and `status`, query the same `serviceId/date/timeSlot`, ignore only `cancelled` conflicts, and update only the two reschedule fields. Use `getFirestore()` only in the callable wrapper and inject the `Firestore` instance into the handler for tests.

- [ ] **Step 6: Run the focused Functions tests green**

Run:

```powershell
npm --prefix functions test -- rescheduleReserva.test.ts
npm --prefix functions run typecheck
```

Expected: all reschedule tests pass and Functions typecheck passes.

---

### Task 2: Harden Firestore Rules And Rule Tests

**Files:**
- Modify: `firestore.rules:37-55`
- Modify: `tools/firestore-tests/run-rules-tests.mjs` in the reservations section
- Test: `npm run rules:test`

**Interfaces:**
- Consumes the client mutation contract from Task 1.
- Produces rules that allow cancellation only for the owner and deny direct client rescheduling; the callable is the only rescheduling path.

- [ ] **Step 1: Write failing rule assertions**

Add tests for: owner cannot directly update `date/timeSlot` even while pending; owner cannot reschedule another user's reservation directly; owner cannot combine date/time changes with `price`, `serviceId`, `notes`, or `status`; owner can cancel with only `status`; owner cannot cancel while changing `notes`; admin can still update a reservation.

- [ ] **Step 2: Run the rules suite and verify the new assertions fail**

Run:

```powershell
npm run rules:test
```

Expected: the new rescheduling/hardening assertions fail against the current denylist rule.

- [ ] **Step 3: Replace the denylist with exact affected-key checks**

Use `affectedKeys().hasOnly(['status'])` for client cancellation and do not add an owner rescheduling branch. Require the current reservation state to be `pending` or `confirmed` for cancellation. Leave admin access unchanged; the callable uses Admin SDK and performs the authoritative rescheduling update.

- [ ] **Step 4: Run the rules suite green**

Run:

```powershell
npm run rules:test
```

Expected: all existing and new tests pass with zero failures.

---

### Task 3: Add Client Service And Dashboard Flow

**Files:**
- Modify: `src/services/firebase.ts`
- Modify: `src/services/reservas.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/services/reservaErrors.ts`
- Create: `src/services/reservaErrors.test.ts`
- Modify: `package.json` and `package-lock.json` to add root dev dependency `vitest: ^4.1.10` and a `test:client` script running `vitest run src/services/reservaErrors.test.ts`
- Test: `npm run test:client`, `npx tsc --noEmit`, and `npm run build`

**Interfaces:**
- Consumes `RescheduleReservaInput` and `RescheduleReservaResult` from the callable contract.
- Produces `rescheduleMyReserva(reservaId: string, date: string, timeSlot: string): Promise<RescheduleReservaResult>`.

- [ ] **Step 1: Write failing client error-mapping tests**

Add `src/services/reservaErrors.test.ts` covering the pure mapping contract: `failed-precondition` becomes a slot/date message, `permission-denied` becomes an ownership/status message, `invalid-argument` becomes an input message, and unknown errors become a generic operational message. Keep Firebase callable access behind the service function.

- [ ] **Step 2: Run the client test and verify the expected red state**

Run:

```powershell
npm run test:client
```

Expected: fail because the pure error-mapping helper and root Vitest script do not exist yet.

- [ ] **Step 3: Add Functions client initialization**

Export `firebaseFunctions = getFunctions(firebaseApp)` from `src/services/firebase.ts`. When `VITE_USE_FIREBASE_EMULATOR === 'true'`, connect it to `localhost:5001` inside the existing guarded emulator initialization. Do not add any new environment secret.

- [ ] **Step 4: Implement pure error mapping and `rescheduleMyReserva`**

Implement `src/services/reservaErrors.ts`, configure the root `test:client` script and Vitest dev dependency, then call `httpsCallable<RescheduleReservaInput, RescheduleReservaResult>(firebaseFunctions, 'rescheduleReserva')`, pass only the three contract fields, and translate `HttpsError` codes to user-safe `ReservaError` messages. Do not update Firestore directly from this function.

- [ ] **Step 5: Run the client tests green**

Run:

```powershell
npm run test:client
```

Expected: all pure error-mapping tests pass.

- [ ] **Step 6: Add dashboard rescheduling state and controls**

Add an inline form per eligible booking with date and time inputs, `min` set to the current local date, submit/cancel controls, and per-booking busy/error state. Show the control only for a non-admin booking with `status === 'pending'` and a future date. Keep the existing cancellation behavior intact.

- [ ] **Step 7: Update local booking only after callable success**

On success replace the booking's `date` and `timeSlot` in `setBookings`. On failure leave the booking unchanged and render the mapped error. Disable both reservation actions while the request is in flight.

- [ ] **Step 8: Verify frontend compatibility**

Run:

```powershell
npm run test:client
npx tsc --noEmit
npm run build
```

Expected: both commands pass without inline styles or source regressions.

---

### Task 4: Document Completion And Run Full Verification

**Files:**
- Modify: `docs/Fase3.md` T3.3 status/checklist
- Modify: `docs/adr/ADR-002-cancelacion-cliente.md`
- Modify: `docs/tasks.md` residual debt/status
- Modify: `docs/STACK.md` reservation security status
- Modify: `docs/SCHEMA.md` reservation rules cross-reference
- Test: full project verification

**Interfaces:**
- Consumes implementation and test evidence from Tasks 1-3.
- Produces honest status for T3.3 and a documented rollback path.

- [ ] **Step 1: Update T3.3 status with evidence**

Replace the stale T3.3 explanation that says the client cannot cancel. Mark only the cancellation hardening, client controls, server-side reschedule validation, and rule tests supported by the final code. Keep deployment and operational configuration claims separate.

- [ ] **Step 2: Update ADR-002**

Document that cancellation now requires an exact `status`-only mutation, rescheduling requires exact `date/timeSlot` fields and pending status, and the callable is the authoritative slot-availability check. Include the code rollback and no-data-migration consequence.

- [ ] **Step 3: Reconcile cross-references**

Update `docs/tasks.md` to remove the stale cancellation denylist debt, update `docs/STACK.md` to describe exact cancellation/rescheduling field allowlists and the callable, and update `docs/SCHEMA.md` so it no longer says ADR-002 will implement a future cancellation relaxation.

- [ ] **Step 4: Run the complete verification matrix**

Run:

```powershell
npm test
npm run test:client
npx tsc --noEmit
npm run build
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
```

Expected: rules and Functions tests pass, both frontend and Functions compile/build, and no whitespace errors are reported.

- [ ] **Step 5: Inspect scope and security**

Run `git status --short --branch` and inspect the final diff. Confirm no secrets, production deployment, destructive migration, unrelated source reversion, or direct client write path bypassing the callable was added.
