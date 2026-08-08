# Fase 3 Transition Design

## Context

The Hachi & Grecia Spa project has a verified reservation MVP. The current
repository documents Phase 2 as closed, while the Phase 3 backlog has not
started. The next work must close the documentation gap, choose an email
provider, add appointment reminders, and establish a cost gate before enabling
Firebase Functions.

Existing local changes are out of scope and must remain untouched:

- `src/components/AdminPrices.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/DashboardPage.tsx`
- `src/services/firebase.ts`
- `tools/set-admin.js`
- `src/vite-env.d.ts`

No automatic git commit is part of this work.

## Goals

1. Make Phase 2 documentation match the implemented and tested MVP.
2. Select and document an email provider without exposing credentials.
3. Implement idempotent 24-hour appointment reminders in Firebase Functions.
4. Establish a verified budget-alert gate before enabling paid infrastructure.

## Non-goals

- Agenda management, therapist management, pets, re-booking, or multi-branch
  support.
- Payments.
- Replacing the current client-side double-booking strategy in this cycle.
- Deploying to production without explicit operator confirmation.
- Modifying unrelated local worktree changes.

## Step 1: Phase 2 Documentation Closure

Update only documentation files:

- `docs/tasks.md`: keep Phase 2 marked closed, mark implemented tasks as
  complete, and list residual debt explicitly.
- `docs/adr/ADR-001-validacion-reservas.md`: mark the client-side best-effort
  decision as accepted and implemented, including its race-condition risk.
- `docs/adr/ADR-002-cancelacion-cliente.md`: mark the whitelist-based client
  cancellation decision as accepted and implemented, referencing the rules
  tests.
- `docs/adr/ADR-003-storage-vs-paths-publicos.md`: mark the static-public-path
  decision as accepted and implemented.
- `docs/STACK.md`: distinguish verified MVP capability from operational Phase 3
  work.

Residual debt must include the remaining landing-page placeholder links and
inline styles, plus the accepted double-booking race condition.

Acceptance criteria:

- No ADR claims that an already implemented decision is still pending.
- The task list does not hide known residual debt.
- Documentation references the current verification evidence.

## Step 2: Email Provider Decision

Create or update the Phase 3 email ADR with a comparison of Resend, Postmark,
and SendGrid. Resend is the recommended provider because the project needs a
small, direct transactional-email integration rather than a broad marketing
platform.

The comparison must cover:

- Current free-tier limits and estimated monthly cost for approximately 900
  reminders.
- Cost when the initial free tier is exceeded.
- Domain verification and deliverability.
- Firebase Functions integration complexity.
- Template support and operational burden.
- Rate limits and failure behavior.

The selected integration contract is:

- Provider: Resend.
- Secret: `RESEND_API_KEY`, stored only in Firebase Secret Manager.
- Sender: a verified spa-owned domain.
- Caller: Firebase Functions only; the browser never calls Resend.
- Retry policy: at most three attempts with bounded backoff.
- Failure policy: persist a sanitized error and stop retrying after the limit.

Update `docs/STACK.md` with the cost estimate, alert status, and provider
decision.

Acceptance criteria:

- The ADR names one selected provider and one fallback.
- No credentials are added to source files or frontend environment variables.
- The cost estimate is a range and includes Firebase Functions separately.
- The ADR states what happens when the provider is unavailable.

## Step 3: 24-Hour Appointment Reminders

Add a separate Firebase Functions project under `functions/` with a backend-only
email adapter:

- `functions/src/scheduledSendReminders.ts`: hourly scheduled trigger.
- `functions/src/reminders.ts`: due-window calculation and state handling.
- `functions/src/email/resend.ts`: Resend adapter.
- `functions/templates/reminder.html`: email template.

### Reminder data model

Use `recordatorios/{id}` with the deterministic ID
`reminder-${encodeURIComponent(reservaId)}`:

```text
reservaId: string
status: pending | sent | failed
attempts: number
scheduledFor: Timestamp
sentAt: Timestamp | null
lastAttemptAt: Timestamp | null
lastError: string | null
processingLockUntil: Timestamp | null
processingToken: string | null
nextAttemptAt: Timestamp | null
providerMessageId: string | null
createdAt: Timestamp
updatedAt: Timestamp
```

The collection is additive. Firebase Functions uses the Admin SDK and bypasses
client rules; clients must not read or write reminder documents. Admin access
may read them for operations and debugging.

### Processing flow

1. Run once per hour.
2. Query confirmed reservations whose date is within the next three local calendar
   days, using the required Firestore index.
3. Combine `date` and `timeSlot` using the spa timezone
   `America/Mexico_City`.
4. Select appointments 23 to 25 hours in the future.
5. Create or reuse the deterministic reminder document.
6. Use a Firestore transaction to acquire a temporary processing lock and
   increment the attempt count.
7. Send the message through the Resend adapter.
8. Send the deterministic reminder ID as the provider idempotency key.
9. Set `sent`, `sentAt`, and the provider message ID on success.
10. Set `failed`, a sanitized `lastError`, and bounded `nextAttemptAt` on
    retryable failure. Refuse acquisition before that timestamp.
11. Skip cancelled, completed, or non-confirmed reservations.

The reservation itself is never changed when email delivery fails. A duplicate
scheduled invocation must not send a second message after the reminder is
marked `sent`.

### Validation and errors

- Validate reservation status, date, time, recipient email, and service name
  before sending.
- Reject malformed or missing data without calling Resend.
- Do not log full emails, API keys, tokens, or provider response bodies that may
  contain personal data.
- Treat provider timeouts and 5xx responses as retryable.
- Treat malformed requests and permanent 4xx responses as failed without
  infinite retries.
- Reuse the same provider idempotency key when persistence fails after delivery.

### Tests

- Unit tests for timezone and 23-to-25-hour selection.
- Unit tests for cancelled and non-confirmed reservations.
- Unit tests for malformed input and retry classification.
- Emulator test for deterministic IDs and concurrent lock behavior.
- Rules tests for admin-only reads and denied client writes.
- Frontend build, Functions build, TypeScript, and full Firestore rules suite.

### Rollback

The change is additive. Rollback means disabling the scheduled function,
removing its deployment, and preserving `recordatorios` documents for audit.
No destructive migration is allowed. If a new index is created, its removal is
documented separately and is not required for the application rollback.

## Step 4: Budget and Production Gate

Create `docs/RUNBOOK.md` with the operational procedure for project
`hachi-greciaspa`:

- Confirm the billing account and Blaze plan before enabling Functions.
- Create a Google Cloud budget of `$10/month`.
- Configure notifications at `$1`, `$5`, and `$10` for actual and forecasted
  spend.
- Record recipients and the date of verification.
- Document how to disable the scheduled Function if spend becomes anomalous.

`docs/STACK.md` must state whether the alert is actually configured. The system
must not claim that an alert exists without operator verification. Google Cloud
Budgets are alerts, not a strict automatic hard cap; this limitation must be
explicit.

Before production activation, the operator must confirm:

- Budget exists for the correct project and billing account.
- Alert recipients are correct.
- The provider domain and secret are configured.
- Functions rollback is documented.
- Build, TypeScript, rules, security review, and browser QA are green.
- Production deployment is explicitly authorized.

## Verification Order

1. Documentation consistency check.
2. Frontend `npx tsc --noEmit`.
3. Frontend `npm run build`.
4. Functions typecheck/build and unit tests.
5. `npm run rules:test`.
6. Emulator integration test for reminders.
7. Browser QA for the existing reservation flow.
8. Operator verification of budget and deployment prerequisites.

The implementation stops before deployment unless every required gate has
evidence and the operator explicitly authorizes production deployment.
