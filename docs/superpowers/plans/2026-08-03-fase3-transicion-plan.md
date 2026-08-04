# Fase 3 Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 2 documentation, select Resend, implement idempotent 24-hour reminders, and establish a verified budget gate without touching existing local work or deploying automatically.

> **Estado al 2026-08-04:** Existe evidencia de implementación para las tareas de Functions y recordatorios. Las casillas de este plan son notas históricas de ejecución; el trabajo restante es la verificación operativa. No se considera completada ninguna acción de consola, dominio, secreto, billing, despliegue o browser QA sin confirmación externa.

**Architecture:** Keep the current React/Firebase MVP unchanged. Add a separate `functions/` Firebase Functions project with pure reminder-domain functions, a Firestore-backed state machine, and a Resend adapter that is called only from the backend. Treat budget configuration and deployment authorization as operational gates documented outside the code.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Firebase Auth/Firestore, Firebase Functions v2 on Node 22, Firebase Admin SDK, Resend, `date-fns-tz`, Firestore emulator, and Vitest for Functions tests.

## Global Constraints

- Preserve these existing local changes: `src/components/AdminPrices.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/DashboardPage.tsx`, `src/services/firebase.ts`, `tools/set-admin.js`, and `src/vite-env.d.ts`.
- Do not add API keys to source code, frontend environment variables, or logs.
- Do not replace the accepted client-side double-booking strategy in this cycle.
- Reminder writes are additive; no destructive migration is allowed.
- Reminder processing uses `America/Mexico_City` explicitly.
- Email retries are bounded at three attempts with backoff.
- Clients cannot read or write `recordatorios`; Admin SDK writes bypass client rules.
- Do not create commits automatically.
- Do not deploy to production without explicit operator authorization and all release gates.

---

## File Map

### Existing documentation

- Modify `docs/tasks.md`: reconcile Phase 2 checkboxes and residual debt.
- Modify `docs/adr/ADR-001-validacion-reservas.md`: mark accepted and implemented.
- Modify `docs/adr/ADR-002-cancelacion-cliente.md`: mark accepted and implemented.
- Modify `docs/adr/ADR-003-storage-vs-paths-publicos.md`: mark accepted and implemented.
- Modify `docs/STACK.md`: record verified MVP, Phase 3 transition, provider, cost, and alert state.
- Create `docs/adr/ADR-004-proveedor-email.md`: provider comparison and decision.
- Create `docs/RUNBOOK.md`: budget and emergency Function-disable procedure.
- Create `docs/superpowers/specs/2026-08-03-fase3-transicion-design.md`: approved design, already present.

### Functions project

- Modify `firebase.json`: register `functions` source.
- Create `functions/package.json`: isolated Functions dependencies and scripts.
- Create `functions/tsconfig.json`: strict Node 22 TypeScript compilation.
- Create `functions/src/types.ts`: reservation, reminder, and email contracts.
- Create `functions/src/reminders.ts`: pure time-window, ID, retry, and lock helpers.
- Create `functions/src/reminders.test.ts`: pure reminder-domain tests.
- Create `functions/src/email/resend.ts`: Resend adapter and sanitized error mapping.
- Create `functions/src/email/resend.test.ts`: provider adapter tests with mocked HTTP/client.
- Create `functions/src/templates/reminder.ts`: escaped HTML rendering.
- Create `functions/src/scheduledSendReminders.ts`: scheduled trigger and Firestore orchestration.
- Create `functions/src/scheduledSendReminders.test.ts`: emulator or mocked Firestore orchestration tests.
- Create `functions/src/index.ts`: Functions exports.
- Create `functions/templates/reminder.html`: source template/reference copy if the renderer uses an external template.

### Firestore model and security

- Modify `firestore.rules`: admin read-only access for `recordatorios`, all client writes denied.
- Modify `firestore.indexes.json`: index confirmed reservations by `status` and `date` if required by the due query.
- Modify `docs/SCHEMA.md`: document `recordatorios`, fields, ownership, and rollback.
- Modify `tools/firestore-tests/run-rules-tests.mjs`: add recordatorio access tests.

---

## Task 1: Reconcile Phase 2 Documentation

**Files:**
- Modify: `docs/tasks.md`
- Modify: `docs/adr/ADR-001-validacion-reservas.md`
- Modify: `docs/adr/ADR-002-cancelacion-cliente.md`
- Modify: `docs/adr/ADR-003-storage-vs-paths-publicos.md`
- Modify: `docs/STACK.md`

**Interfaces:**
- Produces the documented Phase 2 status used by all later tasks.

- [ ] **Step 1: Confirm implementation evidence before editing.**

Run:

```powershell
npx tsc --noEmit
npm run build
npm run rules:test
```

Expected: TypeScript exits with code 0, Vite reports a successful build, and the Firestore suite reports `40 passed, 0 failed`.

- [ ] **Step 2: Update the task list.**

Mark T2.1 through T2.8 complete only where the current code and tests support the checkbox. Add a short `Deuda residual` section naming the accepted double-booking race, landing `href="#"` links, and remaining inline styles.

- [ ] **Step 3: Update ADR statuses.**

Replace stale `Estado: propuesta (pendiente...)` text with accepted/implemented status and add the current evidence: `src/services/reservas.ts`, `firestore.rules`, and the 40-rule-test suite where applicable.

- [ ] **Step 4: Update the stack phase statement.**

Change the “inicio Fase 2” wording to “MVP verificado; transicion a Fase 3 operativa” and separate verified features from Phase 3 gaps. Do not claim budget alerts or email integration exists.

- [ ] **Step 5: Validate documentation-only changes.**

Run:

```powershell
git diff --check -- docs/tasks.md docs/adr docs/STACK.md
```

Expected: no whitespace errors and no changes outside the listed documentation files.

---

## Task 2: Choose and Document the Email Provider

**Files:**
- Create: `docs/adr/ADR-004-proveedor-email.md`
- Modify: `docs/STACK.md`

**Interfaces:**
- Produces the provider decision consumed by the Functions task.
- Contract: `RESEND_API_KEY` is a backend secret; browser code never calls Resend.

- [ ] **Step 1: Gather current public pricing and limits.**

Record the access date and source URLs for Resend, Postmark, and SendGrid. Compare a baseline of 900 reminders per month and state the range for Firebase Functions separately from provider email cost.

- [ ] **Step 2: Write the comparison table.**

Use columns for free tier, estimated baseline cost, overage model, domain verification, deliverability, Firebase integration, templates, rate limits, and failure handling.

- [ ] **Step 3: Record the decision.**

Select Resend, name Postmark as the fallback, and state why SendGrid is not preferred for this small transactional workload. Specify that the final sender must use a verified spa-owned domain.

- [ ] **Step 4: Document credential and retry policy.**

The ADR must state:

```text
Secret: RESEND_API_KEY in Firebase Secret Manager
Caller: Firebase Functions only
Retries: maximum 3, bounded backoff
Permanent failure: record sanitized error and stop retrying
```

- [ ] **Step 5: Update the stack cost section.**

Record provider, baseline monthly estimate, Functions/Blaze estimate, and `Budget alert: no verificada` until the operator confirms the console configuration.

- [ ] **Step 6: Validate the ADR.**

Run:

```powershell
git diff --check -- docs/adr/ADR-004-proveedor-email.md docs/STACK.md
```

Expected: no whitespace errors and no credentials in the diff.

---

## Task 3: Scaffold Firebase Functions Safely

**Files:**
- Modify: `firebase.json`
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/types.ts`
- Create: `functions/src/index.ts`

**Interfaces:**
- `ReservationForReminder` contains `id`, `status`, `userEmail`, `userName`, `serviceName`, `date`, and `timeSlot`.
- `ReminderStatus` is `'pending' | 'sent' | 'failed'`.
- `ReminderRecord` contains `reservaId`, `status`, `attempts`, `scheduledFor`, `sentAt`, `lastAttemptAt`, `lastError`, `processingLockUntil`, `processingToken`, `nextAttemptAt`, `providerMessageId`, `createdAt`, and `updatedAt`.
- `ReminderEmailInput` contains `to`, `recipientName`, `serviceName`, `date`, `timeSlot`, and deterministic `idempotencyKey`.
- `EmailProvider` exposes `sendReminderEmail(input: ReminderEmailInput): Promise<{ providerMessageId?: string }>`.

- [ ] **Step 1: Create the isolated package.**

Add scripts `build`, `test`, and `typecheck`, with `test` running `vitest run`. Use Node 22-compatible Firebase Functions v2, Firebase Admin SDK, Resend client, timezone utilities, and Vitest. Keep Functions dependencies isolated from the frontend package.

- [ ] **Step 2: Configure strict compilation.**

Set `target` and module settings compatible with Node 22, enable `strict`, emit declarations only if needed by tests, and compile `src` to `lib`.

- [ ] **Step 3: Register the Functions source.**

Add the Functions source directory to `firebase.json` without changing existing Firestore, Hosting, or emulator settings.

- [ ] **Step 4: Define shared contracts.**

Create the types listed above. Keep Firestore `Timestamp` fields typed explicitly and do not use `any` for reservation or reminder payloads.

- [ ] **Step 5: Compile the empty scaffold.**

Run:

```powershell
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected: both commands pass before reminder logic is added.

---

## Task 4: Implement Reminder-Domain Tests First

**Files:**
- Create: `functions/src/reminders.test.ts`
- Create: `functions/src/reminders.ts`

**Interfaces:**
- `getAppointmentInstant(date: string, timeSlot: string, timeZone: string, now?: Date): Date`
- `isReminderDue(appointment: Date, now: Date): boolean`
- `reminderDocId(reservaId: string): string`
- `canRetry(attempts: number): boolean`
- `getRetryDelayMs(attempts: number): number`

- [ ] **Step 1: Write failing time-window tests.**

Cover an appointment at 24 hours, 23 hours, and 25 hours as due; appointments just outside the window as not due; and a date/time interpreted in `America/Mexico_City`, not the host timezone.

- [ ] **Step 2: Write failing state helper tests.**

Assert that `reminderDocId('abc')` is deterministic, `canRetry(0..2)` is true, `canRetry(3)` is false, and retry delays increase while remaining bounded.

- [ ] **Step 3: Run the focused tests.**

Run:

```powershell
npm --prefix functions test -- reminders.test.ts
```

Expected: FAIL because the domain module is not implemented.

- [ ] **Step 4: Implement pure helpers.**

Use timezone conversion utilities and a half-open/closed window definition that makes the 23-to-25-hour boundary deterministic. Do not read Firestore or environment variables from this module.

- [ ] **Step 5: Re-run focused tests.**

Expected: all domain tests pass.

---

## Task 5: Implement the Resend Adapter

**Files:**
- Create: `functions/src/email/resend.ts`
- Create: `functions/src/email/resend.test.ts`
- Create: `functions/src/templates/reminder.ts`
- Create: `functions/templates/reminder.html`

**Interfaces:**
- `createResendProvider(secret: string): EmailProvider`
- `EmailProvider.sendReminderEmail(input: ReminderEmailInput): Promise<{ providerMessageId?: string }>`
- `renderReminderHtml(input: ReminderEmailInput): string`
- `class EmailProviderError extends Error { retryable: boolean }`

- [ ] **Step 1: Write adapter tests with a mocked provider.**

Test successful delivery, timeout/5xx as `retryable: true`, malformed/permanent 4xx as `retryable: false`, and HTML escaping for recipient-controlled values.

- [ ] **Step 2: Implement the HTML renderer.**

Render the service, local date, local time, recipient name, and a dashboard link. Escape all dynamic text before interpolation. Do not include secrets or internal document IDs beyond the optional dashboard link contract.

- [ ] **Step 3: Implement the provider adapter.**

Implement `createResendProvider(secret)` so the Resend client is instantiated only inside the adapter factory. Map provider errors to the internal error type, keep provider response bodies out of logs, and do not retry inside the adapter.

- [ ] **Step 4: Run adapter tests.**

Run:

```powershell
npm --prefix functions test -- resend.test.ts
```

Expected: all adapter tests pass without network access or a real API key.

---

## Task 6: Add Firestore Model, Index, and Rules

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `docs/SCHEMA.md`
- Modify: `tools/firestore-tests/run-rules-tests.mjs`

**Interfaces:**
- Clients: no read/write access to `recordatorios`.
- Admins: read access only.
- Functions: Admin SDK writes and does not depend on client rule grants.

- [ ] **Step 1: Write failing rules tests.**

Add tests proving a guest and client cannot read or write `recordatorios`, while an admin can read it. Keep Admin SDK seeding separate from client assertions.

- [ ] **Step 2: Add the rules.**

Use:

```firestore
match /recordatorios/{reminderId} {
  allow read: if isAdmin();
  allow write: if false;
}
```

- [ ] **Step 3: Add the due-query index.**

Add the composite index required by the final query shape, at minimum `status ASC, date ASC`, and keep the index file valid JSON.

- [ ] **Step 4: Document the collection.**

Add fields, lifecycle, admin visibility, deterministic ID, and additive rollback procedure to `docs/SCHEMA.md`.

- [ ] **Step 5: Run rules tests.**

Run:

```powershell
npm run rules:test
```

Expected: the existing 40 tests plus the new recordatorio cases pass.

---

## Task 7: Implement Scheduled Reminder Orchestration

**Files:**
- Create: `functions/src/scheduledSendReminders.ts`
- Modify: `functions/src/index.ts`
- Create: `functions/src/scheduledSendReminders.test.ts`
- Modify: `functions/src/types.ts`
- Modify: `docs/SCHEMA.md`
- Modify: `functions/package.json` only to restrict Vitest discovery to `src` if needed

**Interfaces:**
- Export `scheduledSendReminders` as a Firebase Functions v2 scheduled function.
- Internal orchestration consumes `ReservationForReminder`, `ReminderRecord`, and `EmailProvider` contracts from prior tasks.

- [ ] **Step 1: Write orchestration tests with fake Firestore/provider seams.**

Cover confirmed due reservations, skipped cancelled/non-confirmed reservations, missing email/service data, already-sent records, three-attempt exhaustion, provider retryable errors, and concurrent invocation lock behavior.

- [ ] **Step 2: Implement deterministic reminder lookup.**

Use `reminderDocId(reservaId)` and create the initial record with `pending`, `attempts: 0`, timestamps, and the calculated `scheduledFor` value.

- [ ] **Step 3: Implement the transaction lock.**

Within a Firestore transaction, skip `sent`, skip an active lock, reject attempts at or above three, otherwise update `lastAttemptAt`, increment `attempts`, and set a short processing lock field. Clear the lock when the send finishes.

- [ ] **Step 4: Implement due-reservation selection.**

Query only `confirmed` reservations in the next three local date values, then calculate exact due status in code using `America/Mexico_City`. Do not query on a computed timestamp that does not exist in the current reservation schema.

- [ ] **Step 5: Implement success and failure transitions.**

On success write `status: 'sent'`, `sentAt`, `updatedAt`, and clear the error. On failure write `status: 'failed'`, a sanitized error category, `updatedAt`, and clear the lock. A later hourly run may retry only below three attempts.

- [ ] **Step 6: Bind the secret and schedule.**

Use Firebase Functions v2 `defineSecret('RESEND_API_KEY')` and an hourly `onSchedule` trigger. The function must fail closed when the secret is absent and must not log it.

- [ ] **Step 7: Run Functions tests and build.**

Run:

```powershell
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected: all unit/orchestration tests, typecheck, and build pass without calling Resend.

---

## Task 8: Emulator Integration Test

**Files:**
- Create: `functions/src/emulator-reminder.test.ts`
- Modify: `functions/package.json` only if a dedicated test script is needed

**Interfaces:**
- Uses Firestore emulator data and a fake email provider.
- Does not require a real Firebase project, billing account, or Resend key.

- [ ] **Step 1: Seed confirmed and cancelled reservations.**

Use fixed dates around a fixed `now` value and deterministic user/service fields.

- [ ] **Step 2: Execute the orchestration twice.**

Assert that the first run creates exactly one reminder and the second run does not send a duplicate after `sent` is stored.

- [ ] **Step 3: Exercise failure and retry.**

Use a fake provider that fails twice and succeeds on the third attempt. Assert the attempt count and final status. Use a permanently failing provider to assert `failed` after the retry limit.

- [ ] **Step 4: Run the emulator test.**

Run:

```powershell
npx firebase emulators:exec --only firestore "npm --prefix functions test -- emulator-reminder.test.ts"
```

Expected: integration tests pass and no real network call occurs.

---

## Task 9: Budget Runbook and Operational Gate

**Files:**
- Create: `docs/RUNBOOK.md`
- Modify: `docs/STACK.md`

**Interfaces:**
- Produces the operator checklist required before enabling the scheduled Function.

- [ ] **Step 1: Write the budget procedure.**

Document project `hachi-greciaspa`, billing account confirmation, Blaze confirmation, `$10/month` budget, `$1/$5/$10` notifications, actual and forecasted spend, recipients, and verification date.

- [ ] **Step 2: Document the non-hard-cap limitation.**

State that Google Cloud Budget sends alerts and does not automatically stop billing. Document the emergency action: disable the scheduled Function, inspect logs/usage, revoke or rotate the provider secret if exposed, and preserve reminder records.

- [ ] **Step 3: Add the release gate.**

The runbook must require provider-domain verification, secret configuration, build/typecheck/rules evidence, security review, browser QA, rollback documentation, and explicit production authorization.

- [ ] **Step 4: Record current state honestly.**

Until the operator verifies the console, write `Budget alert: not verified` in `docs/STACK.md`; do not claim configuration based only on documentation.

- [ ] **Step 5: Validate documentation.**

Run:

```powershell
git diff --check -- docs/RUNBOOK.md docs/STACK.md
```

Expected: no whitespace errors and no production configuration falsely marked as complete.

---

## Task 10: Full Verification and Handoff

**Files:**
- No new source files. Review all files from Tasks 1-9.

- [ ] **Step 1: Check worktree safety.**

Run `git status --short` and confirm the pre-existing local changes remain present and unmodified by this work.

- [ ] **Step 2: Run frontend verification.**

```powershell
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Run security-sensitive rules verification.**

```powershell
npm run rules:test
```

Expected: all original and new tests pass.

- [ ] **Step 4: Run Functions verification.**

```powershell
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
```

- [ ] **Step 5: Run browser QA for the existing reservation flow.**

Exercise login, service selection, reservation creation, dashboard visibility, and client cancellation against the emulator or configured test environment. Capture failures and console errors; do not use production data.

- [ ] **Step 6: Perform final diff review.**

Run:

```powershell
git diff --check
```

Confirm no secrets, generated credentials, destructive migration, or unrelated local-file reversion exists.

- [ ] **Step 7: Stop at the deployment gate.**

Do not run `firebase deploy`. Report the evidence and ask for explicit operator authorization only after the budget, provider, rollback, security, tests, and browser QA gates are satisfied.

## Handoff

After the plan is implemented, report:

- Documentation status and residual debt.
- Selected provider and recorded cost estimate.
- Functions test/build evidence.
- Firestore rules/index changes.
- Budget-alert verification state.
- Existing local changes preserved.
- Whether deployment was intentionally not performed.
