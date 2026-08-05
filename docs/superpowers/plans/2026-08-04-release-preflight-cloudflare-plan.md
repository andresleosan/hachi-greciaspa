# Preflight de Release y Cloudflare - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reproducible local release preflight and document the future free Vercel + Firebase + Cloudflare DNS architecture without making production changes.

**Architecture:** Implement the preflight as a Node ESM script that invokes existing npm, git, and audit commands through a small injectable runner. Required local commands stop the preflight on failure; audit commands continue as warnings and preserve their output. The script writes a dated `docs/release-preflight.md` report containing local evidence, known warnings, and blocked external gates.

**Tech Stack:** Node.js ESM, npm scripts, Vitest, Firebase emulator test suite, Vite, TypeScript, existing Markdown runbook.

## Global Constraints

- The preflight verifies local code and evidence but does not authorize production.
- Do not activate Billing/Blaze, configure Resend, create secrets, modify DNS, execute a production backfill, or run `firebase deploy`.
- Do not read or print `.env` values, API keys, passwords, tokens, or service-account contents.
- Keep Vercel Free as the frontend host and Firebase as Auth/Firestore/Functions backend.
- Treat Cloudflare as future free DNS for a domain that the operator will acquire later.
- Do not use `hachi-greciaspa.vercel.app` as a Resend verification domain.
- The future DNS record values must come from current Vercel, Cloudflare, and Resend instructions; never invent values in the repository.
- Required local commands must return exit code `0`; audit commands may return nonzero and must be classified as warnings.
- The final local result may be `PASS_WITH_WARNINGS` and must never be labeled `production ready` while external gates remain pending.
- Do not introduce inline `style={{}}`, new runtime dependencies, or unrelated source changes.
- Preserve known audit findings; do not run `npm audit fix --force`.

---

### Task 1: Add the Testable Preflight Runner

**Files:**
- Create: `tools/release-preflight.mjs`
- Create: `tools/release-preflight.test.mjs`

**Interfaces:**
- Consumes: process platform, repository root, command runner, and current git commit.
- Produces:
  - `const REQUIRED_CHECKS`
  - `const AUDIT_CHECKS`
  - `runReleasePreflight(options): Promise<PreflightResult>`
  - `classifyAuditExit(exitCode): 'PASS' | 'WARN'`
  - `renderPreflightReport(result): string`
  - `interface PreflightResult { commit: string; checks: CheckResult[]; overall: 'PASS' | 'PASS_WITH_WARNINGS' | 'BLOCKED'; productionGates: GateResult[] }`

- [ ] **Step 1: Write failing unit tests for result classification.**

In `tools/release-preflight.test.mjs`, import the pure exports and test:

```js
expect(classifyAuditExit(0)).toBe('PASS')
expect(classifyAuditExit(1)).toBe('WARN')
expect(renderPreflightReport(resultWithLocalPassesAndPendingGates)).toContain('PASS_WITH_WARNINGS')
expect(renderPreflightReport(resultWithRequiredFailure)).toContain('BLOCKED')
```

Also test that report output includes the commit, each command label, the two known audit labels, pending domain/Resend/Secret Manager/Billing/budget/QA/rollback/deploy gates, and the phrase `no production`.

- [ ] **Step 2: Run the focused test and verify red.**

Run: `npx vitest run tools/release-preflight.test.mjs`

Expected: FAIL because `tools/release-preflight.mjs` does not exist.

- [ ] **Step 3: Define the exact command matrix.**

Use these labels and commands in this exact order:

```text
client tests       -> npm run test:client
full rules/functions tests -> npm test
client typecheck   -> npx tsc --noEmit
client build       -> npm run build
functions typecheck -> npm --prefix functions run typecheck
functions build    -> npm --prefix functions run build
diff check         -> git diff --check
client audit       -> npm audit --omit=dev
functions audit    -> npm audit --prefix functions --audit-level=high
```

Represent each command as `{ label, executable, args, kind }`, where `kind` is `required` or `audit`. Resolve `npm.cmd` and `git.exe` on Windows and `npm`/`git` elsewhere. Do not use a shell string or interpolate user input into a command.

- [ ] **Step 4: Implement command execution and classification.**

Implement `runReleasePreflight({ runCommand, cwd, commit })` so tests can inject `runCommand`. A required command with nonzero exit creates a `BLOCKED` result and stops later required checks. An audit command always continues, records stdout/stderr and exit code, and becomes `WARN` when nonzero. Do not include process environment values in captured output.

Read the commit only with `git rev-parse HEAD`. Build the fixed production gate list with status `BLOCKED` and reasons: domain not acquired, Resend/DNS not configured, `RESEND_API_KEY`/Secret Manager not configured, Billing/Blaze and budget not configured, browser QA incomplete, rollback authorization pending, and production deployment not authorized.

- [ ] **Step 5: Implement deterministic Markdown rendering.**

Render a report with:

```markdown
# Release Preflight
Fecha: <ISO timestamp>
Commit: <sha>
Resultado local: PASS | PASS_WITH_WARNINGS | BLOCKED

## Checks locales
| Check | Tipo | Exit code | Resultado |

## Gates de producción
| Gate | Estado | Motivo |

## Auditoría
<captured audit output>

## Restricciones
No se activó Billing/Blaze, no se configuró Resend, no se leyeron secretos y no se ejecutó deploy.
```

Use Spanish copy consistent with `docs/RUNBOOK.md`. Escape Markdown table cells for command output and truncate only extremely long lines, never remove the audit result or exit code.

- [ ] **Step 6: Run the focused tests green.**

Run: `npx vitest run tools/release-preflight.test.mjs`

Expected: all preflight unit tests pass.

- [ ] **Step 7: Commit the runner.**

```bash
git add tools/release-preflight.mjs tools/release-preflight.test.mjs
git commit -m "feat: add local release preflight runner"
```

---

### Task 2: Register and Execute the Preflight Command

**Files:**
- Modify: `package.json:9-18`

**Interfaces:**
- Consumes: `tools/release-preflight.mjs` from Task 1.
- Produces: `npm run release:preflight` as the single documented local command.

- [ ] **Step 1: Add the npm script.**

Add:

```json
"release:preflight": "node tools/release-preflight.mjs"
```

Do not change dependency versions or existing test/build scripts.

- [ ] **Step 2: Add a CLI entrypoint with safe report writing.**

The script entrypoint must call the runner from `process.cwd()`, print the summary, and write `docs/release-preflight.md` only after the command matrix completes. Create no report from a required-command failure unless it includes the failure and `BLOCKED` status. Do not write outside the repository root.

- [ ] **Step 3: Add the CLI smoke test.**

Extend `tools/release-preflight.test.mjs` with a temporary directory test or injected writer proving the CLI/report path does not read `.env`, does not call `firebase deploy`, and preserves audit nonzero as a warning. Keep tests deterministic and do not invoke production services.

- [ ] **Step 4: Run the command locally.**

Run: `npm run release:preflight`

Expected: local checks pass, known audits appear as warnings, the report is generated, and the process exits `0` only when required checks pass. The report must state that external production gates are blocked/pending.

- [ ] **Step 5: Commit the command registration and generated evidence separately.**

```bash
git add package.json tools/release-preflight.mjs tools/release-preflight.test.mjs
git commit -m "chore: register release preflight command"
```

Do not commit the generated report in this task until its documentation format is reviewed in Task 3.

---

### Task 3: Document Preflight and Future Cloudflare DNS Flow

**Files:**
- Create: `docs/release-preflight.md` through the approved command output
- Modify: `docs/RUNBOOK.md`

**Interfaces:**
- Consumes: report output and cost/architecture decisions from the approved spec.
- Produces: an honest dated local release record and future DNS runbook.

- [ ] **Step 1: Add the preflight report generated by the command.**

Ensure the report contains the actual commit and command exit codes from the run. Keep audit output and classify React Router/Functions advisories as warnings. Keep domain, Resend, Secret Manager, Billing/Blaze, budget, browser QA, rollback, authorization, and deploy as pending/blocked.

- [ ] **Step 2: Update the runbook command section.**

Document:

```bash
npm run release:preflight
```

Explain `PASS`, `WARN`, `BLOCKED`, and `PASS_WITH_WARNINGS`. State that a passing local preflight is not production authorization and never executes deployment or external configuration.

- [ ] **Step 3: Update the future domain sequence.**

Document the operator-only sequence:

1. Acquire a domain and control its nameservers.
2. Add Vercel web records in Cloudflare.
3. Validate the Vercel site before enabling optional proxying.
4. Add Resend SPF/DKIM/DMARC records as DNS-only when required.
5. Add the domain to Firebase Auth Authorized domains and App Check as appropriate.
6. Confirm Billing/Blaze, budget, Secret Manager, rollback, authorization, and browser QA before Functions deploy.

Explicitly state that exact record values come from the providers and that `hachi-greciaspa.vercel.app` is not a Resend verification domain.

- [ ] **Step 4: Synchronize cost statements.**

Keep these values consistent with the spec: Vercel `$0`, Spark `$0`, Blaze/Functions `$0–3/mes` estimate, Resend `$0–3/mes` estimate, Cloudflare DNS `$0`, domain purchase cost separate, budget `$10/mes` not configured, and alerts do not cap charges.

- [ ] **Step 5: Run documentation checks.**

Run: `git diff --check`

Run: `npm run release:preflight`

Expected: the generated report and runbook agree on command names, local evidence, costs, and pending external gates.

- [ ] **Step 6: Commit documentation and evidence.**

```bash
git add docs/release-preflight.md docs/RUNBOOK.md
git commit -m "docs: record release preflight and DNS plan"
```

---

### Task 4: Full Verification and Scope Review

**Files:**
- Test: `tools/release-preflight.test.mjs`, generated `docs/release-preflight.md`
- Review: all files changed by Tasks 1–3

**Interfaces:**
- Consumes: complete preflight command, report, runbook, and cost documentation.
- Produces: verified local release-preflight status without deployment.

- [ ] **Step 1: Run focused preflight tests.**

Run: `npx vitest run tools/release-preflight.test.mjs`

Expected: all runner tests pass.

- [ ] **Step 2: Run the full project matrix through the preflight.**

Run: `npm run release:preflight`

Expected: required checks pass; audits are visible as warnings; report status is `PASS_WITH_WARNINGS`, not `production ready`, because external gates remain blocked.

- [ ] **Step 3: Run direct diff and source safety checks.**

Run:

```bash
git diff --check
git status --short --branch
git diff --name-only
```

Confirm no `.env` value, service-account file, API key, password, token, DNS value, production credential, `firebase deploy`, or `npm audit fix --force` was introduced.

- [ ] **Step 4: Verify rollback wording.**

Confirm the runbook says preflight rollback is removing the script/report and that future deployment rollback requires disabling/removing the scheduled Function without deleting reminder data.

- [ ] **Step 5: Commit final verification evidence if changed.**

```bash
git add docs/release-preflight.md
git commit -m "test: verify local release preflight"
```

If the generated report is unchanged, do not create an empty commit.

## Handoff

Report the preflight command, exact local test/build/audit results, report path, current cost estimate, blocked production gates, Cloudflare DNS sequence, and explicit confirmation that no external configuration or deployment was performed.
