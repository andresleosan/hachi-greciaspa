# Billing y Budget Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconciliar la evidencia local de Fase 3 y verificar de forma controlada la cuenta de facturación, Blaze y el budget de Google Cloud antes de habilitar Functions en producción.

**Architecture:** La documentación local será la fuente de estado del proyecto, pero nunca sustituirá la evidencia de Google Cloud Console. La configuración externa se hará manualmente en la consola oficial porque `gcloud` no está instalado; cada cambio tendrá un checkpoint de proyecto, costo, alcance y evidencia antes de continuar.

**Tech Stack:** Firebase CLI `15.25.1`, Firebase project `hachi-greciaspa`, Google Cloud Console, Markdown, npm verification matrix.

## Global Constraints

- No copiar ni solicitar credenciales, API keys, cookies, tokens o archivos secretos.
- No configurar Resend, App Check, backups, observabilidad ni deploy en este subproyecto.
- No ejecutar comandos productivos ni migraciones.
- No tratar un budget como límite duro: Google Cloud Budgets solo notifica.
- No marcar Blaze o budget como verificados sin evidencia visible de la consola.
- El rango local estimado es Blaze/Functions `$0–3/mes` y Resend `$0–3/mes`.
- El presupuesto objetivo es `$10/mes`, con alertas de gasto real y pronosticado en `$1`, `$5` y `$10`.
- Si la consola muestra un proyecto distinto de `hachi-greciaspa`, detenerse antes de guardar.
- El rollback es no destructivo: editar o retirar el budget y deshabilitar Functions si fuera necesario; no borrar datos, reservas, locks ni documentos de auditoría.
- Mantener sin stagear `graphify-out/cache/last_query_stamp`, que es un cambio ajeno.

---

### Task 1: Reconcile local Phase 3 evidence

**Files:**
- Modify: `docs/Fase3.md:1-7, 163, 291-314`.
- Modify: `docs/RUNBOOK.md:1-4, 87-90, 214-227, 246-253`.
- Modify: `docs/STACK.md:3, 19, 37-45, 69, 77, 161-173`.

**Interfaces:**
- Consumes: fresh local evidence from `npm run test:client`, `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run qa:local`, `node --test qa/local/seed.test.mjs`, `npm audit --omit=dev`, Firebase CLI project discovery.
- Produces: synchronized local evidence dated `2026-08-09`; external gates remain explicitly pending.

- [ ] **Step 1: Run the local evidence commands**

Run from `F:\Proyectos\hachi-greciaspa\Dev`:

```powershell
npm run test:client
npm test
npx tsc --noEmit
npm run build
npm run qa:local
node --test qa/local/seed.test.mjs
npm audit --omit=dev
firebase use
```

Expected current values are client `34` files / `156` tests, Rules `74 passed / 0 failed`, Functions `159 passed / 2 skipped`, browser QA `22 passed / 0 failed`, seed `2 passed`, build/typecheck green, runtime audit `0 vulnerabilities`, and Firebase project `hachi-greciaspa`. Record observed values if they differ.

- [ ] **Step 2: Update Fase 3 status without closing external gates**

Update the status block in `docs/Fase3.md` to use the observed date/counts. Keep these items unchecked: `RESEND_API_KEY`, Resend domain, App Check Console, Billing/Blaze, budget alert, deploy authorization, rollback verification, backfill production and browser QA production.

Update stale local QA references from `12 passed` or `103 passed` to the actual current evidence. Do not claim production verification.

- [ ] **Step 3: Update RUNBOOK local evidence and cost gate**

Update the local evidence blocks in `docs/RUNBOOK.md` to the observed date/counts. Preserve the manual checklist:

```text
Cuenta de facturación: no verificada
Plan Blaze: no verificado
Budget de $10/mes: no verificado
Alertas $1/$5/$10 real y pronosticado: no verificadas
```

Keep the statement that Budgets notify but do not cap billing, and that no production action has been executed.

- [ ] **Step 4: Synchronize STACK cost and evidence wording**

Update `docs/STACK.md` only where its local counts or date are stale. Preserve the cost estimate, the statement that Blaze is required for production Functions, and the warning that no billing account or budget alert is verified.

- [ ] **Step 5: Validate and commit documentation**

Run:

```powershell
git diff --check -- docs/Fase3.md docs/RUNBOOK.md docs/STACK.md
```

Confirm no source, Rules, Functions, indexes, secrets or generated artifacts changed. Commit only the three documentation files:

```powershell
git add docs/Fase3.md docs/RUNBOOK.md docs/STACK.md
git commit -m "docs: reconcile phase 3 operational evidence"
```

---

### Task 2: Verify Billing and configure the budget manually

**Files:**
- Modify after external evidence: `docs/RUNBOOK.md`, `docs/Fase3.md`, `docs/STACK.md`.
- No repository file stores billing IDs, payment details or full notification addresses.

**Interfaces:**
- Consumes: the local documentation from Task 1 and the Firebase project `hachi-greciaspa`.
- Produces: verified Billing/Blaze/budget evidence or an explicit blocked state with the reason.

- [ ] **Step 1: Open the official Billing console read-only**

Open:

```text
https://console.cloud.google.com/billing?project=hachi-greciaspa
```

Confirm visually that the selected project is exactly `hachi-greciaspa`. Inspect the linked billing account and plan without saving changes. Do not paste account numbers, payment details or credentials into chat or Git.

- [ ] **Step 2: Confirm the cost checkpoint**

Before activating Blaze, compare the console's displayed billing account and payment method with the operator's intended account. The repository estimate is `$0–3/mes` for expected Functions usage, but actual charges are variable and the budget is not a hard cap.

If the account or expected cost is not correct, stop and leave all external settings unchanged.

- [ ] **Step 3: Confirm or activate Blaze**

If Functions production deployment requires Blaze and the operator confirms the displayed account, activate Blaze in the console. Record only `Blaze confirmado: sí/no` and the verification timestamp in documentation; never record payment details.

- [ ] **Step 4: Create and scope the budget**

Open:

```text
https://console.cloud.google.com/billing/budgets?project=hachi-greciaspa
```

Create a budget with:

- Amount: `$10/mes`.
- Scope: project `hachi-greciaspa` and the confirmed billing account only.
- Alerts: actual and forecasted spend at `$1`, `$5` and `$10`.
- Recipients: only approved operators; record redacted recipient descriptions, not full addresses.

- [ ] **Step 5: Verify the saved configuration**

After saving, reopen the budget and verify project scope, amount, thresholds, notification mode and active status. Capture a redacted screenshot or console reference outside Git if needed; do not store it in the repository. If any value is wrong, edit the budget before marking the gate complete.

- [ ] **Step 6: Update the repository state**

Only after visible console evidence exists, change the corresponding checkboxes in `docs/RUNBOOK.md`, `docs/Fase3.md` and `docs/STACK.md` to `[x]`, adding the resource name/ID only if it is non-sensitive and the verification date. If the external step is blocked, keep `[ ]` and record the exact blocker instead.

Run:

```powershell
git diff --check -- docs/Fase3.md docs/RUNBOOK.md docs/STACK.md
```

Commit only the documentation update:

```powershell
git add docs/Fase3.md docs/RUNBOOK.md docs/STACK.md
git commit -m "docs: record billing budget gate status"
```

---

### Task 3: Stop before the next external integration

**Files:**
- Verify: `docs/Fase3.md`, `docs/RUNBOOK.md`, `docs/STACK.md`.

**Interfaces:**
- Consumes: evidence from Tasks 1 and 2.
- Produces: a clear handoff to the next independent subproject, App Check or Resend.

- [ ] **Step 1: Run release-safe verification**

Run:

```powershell
npm run release:preflight
git diff --check
git status --short --branch
```

Expected: local evidence remains green; any external gate not verified remains `BLOCKED` or unchecked; no deploy is executed.

- [ ] **Step 2: Record the handoff**

Document which of Billing, Blaze, budget and alerts are verified. Keep App Check, Resend, backups, observability, deployment authorization, rollback rehearsal and production browser QA pending until their own approved subprojects.
