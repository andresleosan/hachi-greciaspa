# Fase 3 Gates y Dependencias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the Phase 3 documentation, record honest operational gates, and move React Router to the latest stable version with any residual advisory assessed honestly, without touching production or unrelated local changes.

**Architecture:** Documentation changes will distinguish locally verified implementation from external operational configuration. The dependency change will pin only `react-router-dom` to the latest published stable version, currently `7.18.2`, update the root lockfile through npm, and use the existing frontend and Functions verification commands as the compatibility gate.

**Tech Stack:** React 19, TypeScript 6, Vite 8, React Router 7, Firebase, Firebase Functions v2, npm audit, Firestore emulator, Vitest.

## Global Constraints

- No changes will be executed in Firebase Console, Google Cloud, Resend, or production.
- Do not execute `firebase deploy`.
- Do not execute `npm audit fix --force`.
- Preserve the existing local changes in `src/components/AdminPrices.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/DashboardPage.tsx`, `src/services/firebase.ts`, `tools/set-admin.js`, and `src/vite-env.d.ts`.
- Mark only code, tests, and local evidence that actually exist.
- If npm audit reports an advisory limited to unused RSC/server-action paths, document the reachability assessment and keep the advisory visible rather than suppressing it.
- Keep domain verification, Secret Manager, budget alerts, browser QA, and production authorization explicitly unverified until the operator confirms them.
- Do not add API keys, secrets, or production credentials to the repository.
- Do not create a commit automatically.

---

### Task 1: Reconcile Phase Documentation

**Files:**
- Modify: `docs/tasks.md`
- Modify: `docs/Fase3.md`
- Modify: `docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`
- Test: `git diff --check -- docs/tasks.md docs/Fase3.md docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`

**Interfaces:**
- Consumes: Existing source files, current rule and Functions test evidence, `docs/STACK.md`, `docs/SCHEMA.md`, and `docs/adr/ADR-004-proveedor-email.md`.
- Produces: Documentation that distinguishes completed local implementation, incomplete acceptance criteria, and external production gates.

- [ ] **Step 1: Record the current evidence boundary**

Use the already verified facts without claiming external configuration: frontend typecheck and build pass, Firestore rules report `40 passed, 0 failed`, Functions report `34 passed` and `2 skipped`, and Functions typecheck/build pass. Record that scheduled reminders, the Resend adapter, the template, Firestore model, and rules exist in code, while domain, secret, billing, deployment, and browser QA remain unverified.

- [ ] **Step 2: Correct stale Phase 2 checklist entries**

In `docs/tasks.md`, mark only the stale checkbox for the existing `src/pages/Reservar.tsx` implementation if its surrounding acceptance criteria are already represented by checked items. Keep the emulator catalog verification, inline-style cleanup, App Check console activation, and App Check rejection validation unchecked because they were not verified in this session.

- [ ] **Step 3: Add an honest Phase 3 status block**

In `docs/Fase3.md`, add a short status block immediately below the title stating that the project is in operational transition, reminder code is implemented locally, Resend is the documented primary provider, and production configuration is pending. Update the stale T3.1 wording from `SENDGRID_API_KEY` to the implemented `RESEND_API_KEY` contract without marking Secret Manager configuration complete.

- [ ] **Step 4: Annotate the historical implementation plan**

In `docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`, add a status note near the goal stating that implementation evidence for the Functions/reminder tasks exists, the plan checkboxes are historical execution notes, and the remaining work is operational verification. Do not fabricate checkbox completion for console actions.

- [ ] **Step 5: Validate the documentation diff**

Run:

```powershell
git diff --check -- docs/tasks.md docs/Fase3.md docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md
```

Expected: exit code `0`, with no whitespace errors and no changes to application source files from this task.

---

### Task 2: Record Operational Gates

**Files:**
- Modify: `docs/RUNBOOK.md`
- Verify: `docs/STACK.md`
- Test: `git diff --check -- docs/RUNBOOK.md docs/STACK.md`

**Interfaces:**
- Consumes: Resend contract in `docs/adr/ADR-004-proveedor-email.md`, current Functions deployment shape in `firebase.json`, and existing release checklist in `docs/RUNBOOK.md`.
- Produces: An operator-ready checklist that never reports external configuration as verified by repository evidence alone.

- [ ] **Step 1: Keep external gates explicitly pending**

Retain unchecked items for domain verification, Secret Manager, browser QA, production authorization, and any Google Cloud budget configuration that has not been confirmed by the operator. Use the exact secret name `RESEND_API_KEY` and the documented Resend sender-domain requirement.

- [ ] **Step 2: Add local evidence to the runbook**

Add a dated evidence section to `docs/RUNBOOK.md` listing the commands and observed results:

```text
npx tsc --noEmit                         PASS
npm run build                            PASS
npm run rules:test                       40 passed, 0 failed
npm --prefix functions test              34 passed, 2 skipped
npm --prefix functions run typecheck     PASS
npm --prefix functions run build         PASS
```

State that this evidence is local and does not authorize deployment.

- [ ] **Step 3: Document the external execution sequence**

Add the operator order without executing it: verify SPF/DKIM/DMARC in Resend, create `RESEND_API_KEY` in Firebase Secret Manager, configure the `$10` budget with `$1/$5/$10` notifications, deploy only after authorization, invoke a controlled test, and verify rollback by disabling the scheduled Function. State that Google Cloud budgets alert but do not impose a hard billing cap.

- [ ] **Step 4: Validate operational wording**

Run:

```powershell
git diff --check -- docs/RUNBOOK.md docs/STACK.md
```

Expected: exit code `0`; the docs must still say budget alert, domain, secret, deployment, and browser QA are not verified.

---

### Task 3: Pin the Vulnerable Production Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: root dependency audit and project verification commands

**Interfaces:**
- Consumes: npm audit advisory for `react-router` and the existing React Router 7 application API.
- Produces: Root dependency resolution with the latest published stable `react-router-dom` version and a lockfile matching `package.json`.

- [ ] **Step 1: Confirm the current dependency graph**

Run:

```powershell
npm ls react-router react-router-dom --depth=0
npm audit --omit=dev
```

Expected before the change: `react-router-dom@7.18.2` or another `7.12+` resolution and the reported React Router advisory.

- [ ] **Step 2: Pin only React Router**

Run:

```powershell
npm install --save-exact react-router-dom@7.18.2
```

Do not pass `--force`, do not update Firebase Tools, and inspect the resulting diff to ensure only the intended root dependency and lockfile entries changed.

- [ ] **Step 3: Verify the production audit and reachability**

Run:

```powershell
npm audit --omit=dev
```

Expected: the audit output is captured without suppression. If the current database reports the RSC-only advisory, verify the app uses no RSC/server-action APIs, document that residual reachability assessment in `docs/STACK.md`, and report it instead of claiming a clean audit. Any non-RSC production vulnerability remains blocking.

- [ ] **Step 4: Verify frontend compatibility**

Run:

```powershell
npx tsc --noEmit
npm run build
```

Expected: both commands exit `0`.

- [ ] **Step 5: Verify security and Functions regressions**

Run:

```powershell
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
```

Expected: Firestore reports `40 passed, 0 failed`; Functions reports `34 passed, 2 skipped`; typechecks/builds pass; and the diff has no whitespace errors.

- [ ] **Step 6: Review final scope without committing**

Run:

```powershell
git status --short --branch
git diff -- package.json package-lock.json
```

Confirm that existing local changes remain present, no secrets were added, and only the approved documentation and dependency files changed in this plan.
