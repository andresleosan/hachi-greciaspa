# T3.12 Observabilidad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar captura de errores frontend y Functions con Sentry opcional, sanitización de PII, Cloud Logging preservado y verificación local completa.

**Architecture:** El frontend tendrá un módulo aislado `src/observability/sentry.ts` que controla inicialización, sanitización y boundary React. Functions tendrá un módulo paralelo que usa `SENTRY_DSN`, captura excepciones sin cambiar retries ni estados, y mantiene logs estructurados en Cloud Logging. Ambas integraciones estarán desactivadas cuando falta el DSN.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Firebase Cloud Functions Node 22, `@sentry/react`, `@sentry/node`.

## Global Constraints

- `VITE_SENTRY_DSN` se usa únicamente en frontend; `SENTRY_DSN` se usa únicamente en Functions.
- `sendDefaultPii: false`; no usar `Sentry.setUser`.
- No enviar emails, contraseñas, tokens Firebase, cookies, headers de autorización, payloads Firestore ni query strings.
- Session Replay, tracing y profiling quedan fuera de la primera implementación.
- Un fallo de Sentry no puede impedir el arranque ni provocar retries adicionales de Functions.
- No se ejecutan deploys, cambios de Billing/Blaze, creación de cuenta Sentry ni configuración de alertas externas.
- No ejecutar commits durante la implementación salvo solicitud explícita del operador.

---

### Task 1: Módulo frontend de Sentry y sanitización

**Files:**
- Create: `src/observability/sentry.ts`
- Test: `src/observability/sentry.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces `initSentry(options?: SentryInitOptions): boolean`, `captureException(error: unknown, context?: Record<string, unknown>): void`, `sanitizeSentryEvent(event: Sentry.Event): Sentry.Event` y `isSentryEnabled(): boolean`.
- `initSentry` debe ser idempotente y devolver `false` si `VITE_SENTRY_DSN` está vacío o `VITE_USE_FIREBASE_EMULATOR === 'true'`.
- `captureException` nunca debe lanzar una excepción al caller.

- [ ] **Step 1: Add the frontend dependency**

Run:

```bash
npm install @sentry/react
```

Expected: `package.json` y `package-lock.json` contienen `@sentry/react`; no se agrega ningún paquete de replay, tracing o profiling.

- [ ] **Step 2: Write failing sanitizer tests**

Add tests that build a representative Sentry event and assert that sensitive values disappear:

```ts
it('removes PII and credentials from an event before transport', () => {
  const sanitized = sanitizeSentryEvent({
    request: {
      url: 'https://spa.test/reservar?email=cliente@example.com&token=secret',
      headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
    },
    user: { email: 'cliente@example.com', id: 'uid-123' },
    extra: {
      password: 'secret',
      token: 'secret',
      safeOperation: 'booking-submit',
    },
    breadcrumbs: [{ data: { email: 'cliente@example.com', token: 'secret' } }],
  } as Sentry.Event)

  expect(sanitized.request).toBeUndefined()
  expect(sanitized.user).toBeUndefined()
  expect(sanitized.extra).toEqual({ safeOperation: 'booking-submit' })
  expect(sanitized.breadcrumbs).toBeUndefined()
})
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/observability/sentry.test.ts
```

Expected: FAIL because `src/observability/sentry.ts` and `sanitizeSentryEvent` do not exist yet.

- [ ] **Step 4: Write tests for activation and failure isolation**

Add tests for these exact behaviors:

```ts
it('stays disabled without a DSN or when the emulator is enabled', () => {
  expect(isSentryEnabled()).toBe(false)
  expect(initSentry({ dsn: '', useEmulator: false })).toBe(false)
  expect(initSentry({ dsn: 'https://public@example.ingest.sentry.io/1', useEmulator: true })).toBe(false)
})

it('captures an explicit exception without propagating SDK errors', () => {
  expect(() => captureException(new Error('expected test error'), { operation: 'test' })).not.toThrow()
})
```

Define `SentryInitOptions` as `{ dsn?: string; useEmulator?: boolean }`; tests pass this object and production calls `initSentry()` without arguments so the module reads `import.meta.env`. Do not read `.env` files in tests.

- [ ] **Step 5: Implement the minimal frontend module**

Use `@sentry/react` with this configuration shape:

```ts
Sentry.init({
  dsn,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanitizeSentryEvent,
})
```

The implementation must:

- remove `request`, `user`, and `breadcrumbs` from events;
- recursively drop keys matching `email`, `password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`, `accessToken`, or `refreshToken` from `extra`, `contexts`, and tags;
- remove query strings from any retained URL;
- catch SDK initialization and capture failures;
- use `console.error('[observability]', sanitizedError)` only with sanitized operation metadata when Sentry is disabled or fails;
- never log the original error object if it may contain request data.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/observability/sentry.test.ts
```

Expected: all focused tests pass.

---

### Task 2: Mount the frontend boundary and global capture

**Files:**
- Create: `src/components/ObservabilityBoundary.tsx`
- Test: `src/components/ObservabilityBoundary.test.tsx`
- Modify: `src/main.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- `ObservabilityBoundary` accepts `{ children: React.ReactNode }` and renders a stable fallback with `role="alert"` if a React render error occurs.
- It consumes `initSentry`, `captureException`, and the Sentry boundary from Task 1.

- [ ] **Step 1: Write the failing boundary test**

Install the DOM test dependencies before writing the component test:

```bash
npm install --save-dev @testing-library/react jsdom
```

Run the focused test with the required environment:

Create a component that throws during render and assert the fallback is rendered without inline styles:

```tsx
it('renders an accessible fallback when a child throws', () => {
  render(
    <ObservabilityBoundary>
      <ThrowingComponent />
    </ObservabilityBoundary>,
  )

  expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run --environment jsdom src/components/ObservabilityBoundary.test.tsx
```

Expected: FAIL because the boundary component does not exist.

- [ ] **Step 3: Implement the boundary and mount initialization**

Implement `ObservabilityBoundary` using `Sentry.ErrorBoundary` only after `initSentry()` has run. The fallback must use existing CSS classes, not `style={{}}`:

```tsx
function ErrorFallback() {
  return (
    <main className="container section" role="alert">
      Ocurrió un error inesperado.
    </main>
  )
}
```

Update `src/main.tsx` so the order is:

```tsx
initSentry()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ObservabilityBoundary>
      <App />
    </ObservabilityBoundary>
  </React.StrictMode>,
)
```

Do not add manual `window.addEventListener` handlers if the Sentry SDK already owns global error and rejection handlers; avoid duplicate events.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run --environment jsdom src/components/ObservabilityBoundary.test.tsx src/observability/sentry.test.ts
```

Expected: all focused tests pass.

---

### Task 3: Optional Functions integration

**Files:**
- Create: `functions/src/observability/sentry.ts`
- Test: `functions/src/observability/sentry.test.ts`
- Modify: `functions/package.json`
- Modify: `functions/package-lock.json`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/assignmentService.ts`
- Modify: `functions/src/confirmations.ts`
- Modify: `functions/src/scheduledSendReminders.ts`
- Modify: `functions/src/email/resend.ts`

**Interfaces:**
- Produces `initFunctionsSentry(): boolean` and `captureFunctionException(error: unknown, context: { operation: string }): void`.
- `SENTRY_DSN` is read only from `process.env.SENTRY_DSN`.
- `captureFunctionException` accepts operation names only; callers must not pass reservation, user, email, or provider payloads.

- [ ] **Step 1: Add the backend dependency**

Run:

```bash
npm --prefix functions install @sentry/node
```

Expected: Functions manifests and lockfile contain `@sentry/node`; no frontend package is added to `functions`.

- [ ] **Step 2: Write failing Functions observability tests**

Add tests for disabled initialization and failure isolation:

```ts
it('does not initialize when SENTRY_DSN is absent', () => {
  expect(initFunctionsSentry({ dsn: '' })).toBe(false)
})

it('does not throw when Sentry capture fails', () => {
  expect(() => captureFunctionException(new Error('test'), { operation: 'test-operation' })).not.toThrow()
})
```

Also assert that the submitted scope contains only the operation tag and no raw error payload in extras.

- [ ] **Step 3: Run the focused Functions test and verify RED**

Run:

```bash
npm --prefix functions exec vitest run src/observability/sentry.test.ts
```

Expected: FAIL because the module and functions do not exist yet.

- [ ] **Step 4: Implement initialization and capture**

Use `@sentry/node` with:

```ts
Sentry.init({
  dsn,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanitizeFunctionsEvent,
})
```

The module must be safe when `SENTRY_DSN` is missing, idempotent, and unable to throw from `captureFunctionException`. Preserve `console.error` structured logging in existing callers.

- [ ] **Step 5: Initialize from the Functions entry point**

Update `functions/src/index.ts` to call `initFunctionsSentry()` after `initializeApp()` and before exporting Functions. Do not change the exported Function names or trigger configuration.

- [ ] **Step 6: Capture caught permanent failures without changing business behavior**

At the existing catch sites in `assignmentService.ts`, `confirmations.ts`, `scheduledSendReminders.ts`, and `email/resend.ts`, call:

```ts
captureFunctionException(error, { operation: 'stable-operation-name' })
```

Use stable operation names such as `assign-pending-reservas`, `send-confirmation-email`, `send-scheduled-reminders`, and `resend-provider-request`. Keep the existing status updates, retry limits, return values, and rethrows exactly as they are. Never pass the caught payload or user input as context.

- [ ] **Step 7: Run focused Functions tests and verify GREEN**

Run:

```bash
npm --prefix functions exec vitest run src/observability/sentry.test.ts src/confirmations.test.ts src/assignment.test.ts src/scheduledSendReminders.test.ts src/email/resend.test.ts
```

Expected: all focused tests pass with no additional retries or changed error assertions.

---

### Task 4: Environment and operational documentation

**Files:**
- Modify: `.env.example`
- Create: `docs/adr/ADR-007-observabilidad.md`
- Modify: `docs/STACK.md`
- Modify: `docs/Fase3.md`
- Modify: `docs/RUNBOOK.md`

**Interfaces:**
- Documents `VITE_SENTRY_DSN` for frontend and `SENTRY_DSN` for Functions.
- Records Sentry as optional until the operator creates the project and provides a DSN.

- [ ] **Step 1: Document environment variables without values**

Append to `.env.example`:

```text
# Sentry error monitoring (optional; leave empty to disable)
VITE_SENTRY_DSN=
```

Document `SENTRY_DSN` only in the Functions operational section; never add its value to any tracked file.

- [ ] **Step 2: Write ADR-007**

Record the decision for Sentry over frontend-only or Cloud-Logging-only alternatives, including:

- frontend and optional Functions coverage;
- `sendDefaultPii: false` and centralized sanitization;
- no Session Replay, tracing or profiling initially;
- Cloud Logging remains authoritative for operational logs;
- DSN-empty degradation;
- free-tier estimate and the USD 26/month Team baseline;
- external gates: account, DSN, controlled event, privacy review and Cloud Monitoring alert.

- [ ] **Step 3: Update project state documentation**

Update `docs/STACK.md` with the service table row, cost estimate and unresolved budget/alert state. Update `docs/Fase3.md` so T3.12 implementation items are marked only when locally evidenced, while the DSN, controlled event and Cloud Monitoring alert remain unchecked. Update `docs/RUNBOOK.md` with activation steps, safe test-event procedure, rollback by clearing/disabling DSN, and the rule that no production secrets enter the repository or logs.

- [ ] **Step 4: Check documentation consistency**

Run:

```bash
```

Expected: no whitespace errors; all references use `VITE_SENTRY_DSN` and `SENTRY_DSN` consistently.

---

### Task 5: Full verification and self-critique

**Files:**
- Modify: `docs/release-preflight.md`
- Modify: `docs/Fase3.md` only after evidence is available

- [ ] **Step 1: Run client verification**

Run:

```bash
npm run test:client
npx tsc --noEmit
npm run build
```

Expected: all client tests pass, typecheck exits 0, and Vite build exits 0.

- [ ] **Step 2: Run Functions and rules verification**

Run:

```bash
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected: rules and Functions tests pass, with only the known existing skips, and both Functions checks exit 0.

- [ ] **Step 3: Run release preflight**

Run:

```bash
npm run release:preflight
```

Expected: `PASS_WITH_WARNINGS` is acceptable only if the output preserves known external gates and the React Router audit warning; no new failures or security findings may appear.

- [ ] **Step 4: Perform the security review**

Inspect the changed files for secrets, raw exception payloads, email/token/password fields, query strings, authorization headers, and accidental `setUser` usage. Confirm the only tracked DSN declaration is empty in `.env.example`; do not read or print `.env.local`.

- [ ] **Step 5: Record honest evidence**

Update `docs/release-preflight.md` with the actual command results. Mark local T3.12 items as reviewed only with evidence. Leave external Sentry event verification and Cloud Monitoring alert unchecked until the operator provides a DSN and performs the console steps.

## File Map

- `src/observability/sentry.ts`: frontend initialization, sanitization and explicit capture.
- `src/observability/sentry.test.ts`: frontend configuration and PII regression tests.
- `src/components/ObservabilityBoundary.tsx`: React error boundary and accessible fallback.
- `src/components/ObservabilityBoundary.test.tsx`: render-error behavior.
- `functions/src/observability/sentry.ts`: backend initialization, sanitization and capture.
- `functions/src/observability/sentry.test.ts`: backend failure isolation and context tests.
- `src/main.tsx`: frontend initialization and boundary mount.
- `functions/src/index.ts`: backend initialization before exports.
- `docs/adr/ADR-007-observabilidad.md`: architecture decision and alternatives.
- `docs/STACK.md`, `docs/Fase3.md`, `docs/RUNBOOK.md`: costs, state and operating procedure.

## Plan Self-Review

- Spec coverage: frontend capture, Functions capture, Cloud Logging preservation, sanitization, DSN gating, cost, tests and external gates are covered by Tasks 1–5.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step is used in the plan.
- Type consistency: `initSentry`, `captureException`, `sanitizeSentryEvent`, `initFunctionsSentry` and `captureFunctionException` are defined once and consumed with the same signatures.
- Scope: no Firestore schema, rules, Billing, deploy or browser-visual changes are included.
