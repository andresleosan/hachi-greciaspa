# Gates Operativos De Fase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the Phase 3 documentation, record only locally verified evidence, assess the production dependency audit, and leave all external deployment gates explicitly pending.

**Architecture:** This stage changes documentation and, only if necessary, the root `react-router-dom` resolution. It does not change application behavior, Firestore data, Firebase Console configuration, Resend configuration, or production. The agenda implementation is intentionally a separate follow-up plan.

**Tech Stack:** React 19, TypeScript 6, Vite 8, React Router 7.18.2, Firebase, Firebase Functions v2, npm, Firestore emulator, Vitest.

## Global Constraints

- No changes will be executed in Firebase Console, Google Cloud, Resend, Secret Manager, or production.
- Do not execute `firebase deploy`.
- Do not execute `npm audit fix --force`.
- Preserve existing application changes, especially `src/components/AdminPrices.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/DashboardPage.tsx`, `src/services/firebase.ts`, `tools/set-admin.js`, and `src/vite-env.d.ts`.
- Mark only code, tests, and local evidence that actually exist.
- Keep domain verification, `RESEND_API_KEY`, billing, budget alerts, browser QA, rollback review, and production authorization explicitly unverified until the operator confirms them.
- Do not add API keys, secrets, or production credentials to the repository.
- Do not change Firestore schema, rules, indexes, or application source in this stage.
- Do not create a commit automatically.

---

### Task 1: Establish The Evidence Boundary

**Files:**
- Read: `docs/superpowers/specs/2026-08-04-gates-y-agenda-design.md`
- Read: `docs/Fase3.md`, `docs/STACK.md`, `docs/RUNBOOK.md`, `docs/tasks.md`
- Verify: repository status and current dependency graph

**Interfaces:**
- Consumes: current source tree, existing local evidence, and the approved design specification.
- Produces: a dated, reproducible evidence set for the documentation tasks; no source changes.

- [ ] **Step 1: Inspect the worktree without reverting anything.**

Run:

```powershell
git status --short --branch
git diff --check
```

Confirm that the approved specification is the only expected untracked change before this stage. Do not use `git reset`, `git checkout`, or any destructive cleanup command.

- [ ] **Step 2: Confirm the root dependency graph.**

Run:

```powershell
npm ls react-router react-router-dom --depth=0
npm audit --omit=dev
```

Record the output of both commands. `npm audit --omit=dev` may exit non-zero when an advisory exists; capture the advisory rather than suppressing it. Confirm whether the application dependency is already exactly `react-router-dom@7.18.2`.

- [ ] **Step 3: Verify the application reachability relevant to the audit.**

Search the source tree:

```powershell
git grep -n -E "RSC|server action|ServerAction|createCallServer|matchRoutes" -- src functions
git grep -n -E "BrowserRouter|Routes|Route|Link|Navigate|useNavigate|useSearchParams" -- src
```

The first command should return no RSC or server-action API usage; a no-match exit status is expected. The second command should show the existing SPA router usage. This supports documenting a residual RSC-only advisory without claiming that `npm audit` is clean.

---

### Task 2: Reconcile Phase Documentation

> **Alcance ampliado autorizado al 2026-08-04:** esta ronda de Task 2 incluye `ADR-001-validacion-reservas.md` y los planes históricos de Fase 3 para corregir evidencia local y referencias stale. No modifica código, configuración externa ni crea ADR-005.

**Files:**
- Modify: `docs/tasks.md`
- Modify: `docs/Fase3.md`
- Modify: `docs/STACK.md`
- Modify: `docs/adr/ADR-002-cancelacion-cliente.md`
- Modify: `docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`
- Test: `git diff --check -- docs/tasks.md docs/Fase3.md docs/STACK.md docs/adr/ADR-002-cancelacion-cliente.md docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`

**Interfaces:**
- Consumes: evidence from Task 1, the current Functions implementation under `functions/`, `docs/STACK.md`, `docs/SCHEMA.md`, and `docs/adr/ADR-004-proveedor-email.md`.
- Produces: documentation that distinguishes local implementation from external operation and does not mark unverified console actions complete.

- [ ] **Step 1: Correct stale Phase 2 wording without hiding remaining work.**

In `docs/tasks.md`:

- Keep Phase 2 marked closed.
- Preserve the unchecked emulator catalog verification in T2.2.
- Preserve the unchecked inline-style cleanup in T2.6.
- Preserve the unchecked App Check console activation and production rejection validation in T2.8.
- Keep the T3.3 residual statement accurate: client cancellation is exact `status`-only, direct client rescheduling is denied, and the callable is the server-side path.
- Do not mark operational deployment or console work complete based on local code.

Use the existing checked implementation items as evidence; do not invent new test counts.

- [ ] **Step 2: Reconcile the Phase 3 status block and T3.1 contract.**

In `docs/Fase3.md`, keep the status block immediately below the title with these facts:

```markdown
> **Estado al 2026-08-04:** El proyecto está en transición operativa. La implementación local de recordatorios está en el código y Resend es el proveedor primario documentado; la configuración de producción sigue pendiente.
>
> **Pendiente de verificación externa:** dominio, `RESEND_API_KEY`, billing, budget alert, despliegue y browser QA.
```

In T3.1, describe `RESEND_API_KEY` as a backend secret in Firebase Secret Manager and leave its configuration unchecked. Replace stale provider wording that says only SendGrid or Postmark when it conflicts with the implemented Resend adapter. Keep T3.2 as a documented decision with account/domain/key setup still pending.

- [ ] **Step 3: Annotate the historical transition plan.**

Immediately after the goal in `docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md`, retain or add this status boundary:

```markdown
> **Estado al 2026-08-04:** Existe evidencia local de implementación para Functions y recordatorios. Las casillas de este plan son notas históricas de ejecución; dominio, secreto, billing, despliegue y browser QA requieren verificación externa y no se marcan como completos sin confirmación del operador.
```

Do not rewrite historical checkboxes as if console actions had been executed.

- [ ] **Step 4: Reconcile evidence counts and ADR references.**

In `docs/STACK.md` and `docs/adr/ADR-002-cancelacion-cliente.md`, replace the stale Functions count with the fresh local result `47 passed, 2 skipped`, and keep the rules result at `41 passed, 0 failed` where it is recorded. State that the counts are local evidence dated `2026-08-04`; do not claim production verification.

In `docs/Fase3.md`, replace the nonexistent `docs/ADR-004-recordatorios.md` reference with the planned canonical path `docs/adr/ADR-005-cron-recordatorios.md`, and state that the cron-frequency ADR remains pending until it is created. Do not create that ADR in this task.

- [ ] **Step 5: Validate the documentation-only diff.**

Run:

```powershell
git diff --check -- docs/tasks.md docs/Fase3.md docs/STACK.md docs/adr/ADR-002-cancelacion-cliente.md docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md
```

Expected: exit code `0`, with no application source files changed by this task.

---

### Task 3: Record Operational Gates And Local Evidence

**Files:**
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/STACK.md`
- Test: `git diff --check -- docs/RUNBOOK.md docs/STACK.md`

**Interfaces:**
- Consumes: the Resend contract in `docs/adr/ADR-004-proveedor-email.md`, the Functions deployment shape in `firebase.json`, and the local verification commands.
- Produces: an operator-ready runbook that never treats documentation as proof of external configuration.

- [ ] **Step 1: Preserve every unverified external checklist item.**

In `docs/RUNBOOK.md`, keep unchecked entries for:

- Resend domain ownership plus SPF, DKIM, and DMARC;
- the exact `RESEND_API_KEY` Secret Manager secret;
- Firebase billing account and Blaze plan;
- the `$10/month` budget and `$1`, `$5`, `$10` actual/forecast notifications;
- browser QA;
- rollback review;
- explicit production authorization.

State that Google Cloud Budgets send alerts and do not enforce a hard billing cap.

- [ ] **Step 2: Add the dated local evidence block.**

After the release gate section, record the observed local results using this shape, replacing only counts if the fresh commands differ:

```text
## Evidencia Local — 2026-08-04

Estos resultados pertenecen al repositorio local. No autorizan despliegue ni demuestran que los gates externos estén completados.

npx tsc --noEmit                         PASS
npm run build                            PASS
npm run rules:test                       41 passed, 0 failed
npm --prefix functions test              47 passed, 2 skipped
npm --prefix functions run typecheck     PASS
npm --prefix functions run build         PASS
```

Do not record a command as `PASS` unless it was executed successfully in Task 5.

- [ ] **Step 3: Document the external execution order and emergency path.**

Ensure the runbook orders external work as follows without executing it:

```text
1. Verify the spa-owned Resend domain and SPF/DKIM/DMARC.
2. Create RESEND_API_KEY in Firebase Secret Manager.
3. Confirm billing/Blaze and configure the $10 budget with $1/$5/$10 alerts.
4. Obtain explicit production authorization.
5. Deploy only after all release gates are green.
6. Run a controlled test and verify idempotency.
7. Verify rollback by disabling the scheduled Function.
```

Keep the emergency steps: disable the scheduled Function, inspect usage/logs, rotate a possibly exposed provider secret, and preserve `recordatorios` documents.

- [ ] **Step 4: Align the stack security and cost wording.**

In `docs/STACK.md`:

- Keep `react-router-dom` at the observed installed version.
- Keep the RSC-only advisory visible if `npm audit --omit=dev` reports it.
- State that the SPA uses no RSC/server actions, so the advisory is not reachable through the current application path; do not call the audit clean.
- Keep Resend, domain, secret, billing, budget alert, and deployment as unverified.
- Keep the Functions and rules evidence counts synchronized with Task 5.

- [ ] **Step 5: Validate gate wording.**

Run:

```powershell
git diff --check -- docs/RUNBOOK.md docs/STACK.md
git grep -n -E "Budget alert:.*(verified|configur)|RESEND_API_KEY.*(configured|created)|deployed|producción.*complet" -- docs/RUNBOOK.md docs/STACK.md docs/Fase3.md
```

Inspect each match manually. A match is acceptable only when it explicitly says `no verificado`, `pendiente`, or describes a future operator action rather than claiming completion.

---

### Task 4: Verify Or Pin The Production Dependency

**Files:**
- Modify only if needed: `package.json`
- Modify only if needed: `package-lock.json`
- Possibly modify: `docs/STACK.md` for the audit reachability statement
- Test: `npm audit --omit=dev`, frontend verification, Functions verification

**Interfaces:**
- Consumes: the dependency graph and audit output from Task 1.
- Produces: an exact `react-router-dom@7.18.2` root dependency when it is not already present, with a matching lockfile and an honest residual audit assessment.

- [ ] **Step 1: Pin only when the root manifest is not exact.**

If `package.json` does not already contain:

```json
"react-router-dom": "7.18.2"
```

run:

```powershell
npm install --save-exact react-router-dom@7.18.2
```

Do not pass `--force`; do not update Firebase Tools or unrelated dependencies. If the manifest is already exact, make no dependency edit and verify the lockfile instead.

- [ ] **Step 2: Inspect dependency scope.**

Run:

```powershell
npm ls react-router react-router-dom --depth=0
```

Confirm that any dependency diff is limited to the intended React Router entries and that the installed tree resolves to `7.18.2`.

- [ ] **Step 3: Re-run the production audit without suppression.**

Run:

```powershell
npm audit --omit=dev
```

Record the advisory and its exit status. If only the RSC/server-action advisory remains, retain the reachability assessment in `docs/STACK.md`. Any production advisory unrelated to unused RSC paths must remain visible as a release risk and must not be labeled resolved.

---

### Task 5: Run The Full Local Verification And Review Scope

**Files:**
- Verify all files changed by Tasks 2–4
- Test: complete local verification matrix

**Interfaces:**
- Consumes: documentation and optional dependency changes from the previous tasks.
- Produces: reproducible local evidence and a final scope review; no deployment.

- [ ] **Step 1: Verify frontend and client tests.**

Run:

```powershell
npx tsc --noEmit
npm run test:client
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 2: Verify Firestore rules and Functions.**

Run:

```powershell
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected based on the current local repository evidence: rules report `41 passed, 0 failed`; Functions report `47 passed` and `2 skipped`; typecheck and build exit `0`. These counts do not constitute production verification. If fresh counts differ, record the actual counts and investigate failures before completion.

- [ ] **Step 3: Check whitespace and inspect the final diff.**

Run:

```powershell
git diff --check
git status --short --branch
git diff --stat
git diff -- docs/tasks.md docs/Fase3.md docs/RUNBOOK.md docs/STACK.md docs/superpowers/plans/2026-08-03-fase3-transicion-plan.md package.json package-lock.json
```

Confirm:

- no secrets, tokens, API keys, or generated credentials were added;
- no Firebase deploy or production configuration was executed;
- no Firestore data, schema, rules, or indexes changed;
- no unrelated source files changed;
- the approved design specification and this plan remain present;
- external gates are still explicitly pending.

- [ ] **Step 4: Stop before deployment.**

Do not run `firebase deploy`, Cloud Console commands, Resend configuration, Secret Manager writes, or production browser QA. Report the local evidence and list the external gates still requiring operator confirmation. The next approved work item is a separate implementation plan for `T3.4`.

## Handoff

After this plan is executed, report:

- documentation files reconciled and residual debt retained;
- the observed `npm audit --omit=dev` result and RSC reachability assessment;
- frontend, rules, client test, and Functions evidence;
- whether the dependency was already pinned or changed;
- external gates still pending;
- confirmation that no deployment was performed.
