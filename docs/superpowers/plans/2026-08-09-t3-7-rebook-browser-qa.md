# T3.7 Re-booking Browser QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el acceptance criterion E2E de T3.7 verificando que un cliente puede abrir una reserva completada y llegar al wizard de reservas con servicio, fecha y horario prellenados.

**Architecture:** No se modificará la lógica productiva de reservas. El harness local agregará una reserva `completed` determinista al seed del usuario QA cliente y Playwright validará el contrato existente entre `DashboardPage`, la URL de prefill y `Reservar`.

**Tech Stack:** Playwright, Firebase Auth/Firestore emulators, Firebase Admin SDK local, React Router 7, Vitest, TypeScript, Vite.

## Global Constraints

- Mantener intactos `DashboardPage`, `Reservar`, `readBookingPrefill`, Functions, Firestore Rules, índices y contratos productivos.
- Ejecutar el seed únicamente contra los emuladores iniciados por `qa/local/run.mjs`.
- No agregar dependencias, credenciales, tokens ni datos productivos.
- Usar roles, labels y URL parseada en Playwright; no depender de clases CSS internas ni de posiciones frágiles.
- Mantener el estado `completed` fuera de las acciones de cancelar y reagendar del cliente.
- No ejecutar Firebase Console, Secret Manager, Resend, Billing, `firebase deploy` ni cambios de producción.
- La evidencia browser seguirá siendo local y no será evidencia de producción.

---

### Task 1: Add the failing re-booking browser contract

**Files:**
- Modify: `qa/tests/local-authenticated.spec.mjs` after the existing reservation lifecycle tests.

**Interfaces:**
- Consumes: `login(page, email, password, roleLabel)`, `QA_AGENDA_DATE`, the `DashboardPage` link labeled `Reservar de nuevo`, and the existing `Reservar` wizard roles.
- Produces: a browser assertion that fails until the QA seed contains a completed reservation identified by `QA_REBOOK`.

- [x] **Step 1: Write the failing test**

Agregar este caso a `qa/tests/local-authenticated.spec.mjs`:

```js
test('client can rebook a completed reservation with prefilled booking details', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')

  const card = page.locator('li.reserva-card').filter({ hasText: 'QA_REBOOK' })
  await expect(card).toBeVisible()
  await expect(card.getByRole('link', { name: 'Reservar de nuevo', exact: true })).toBeVisible()

  await card.getByRole('link', { name: 'Reservar de nuevo', exact: true }).click()

  const url = new URL(page.url())
  expect(url.pathname).toBe('/reservar')
  expect(url.searchParams.get('service')).toBe('spa-day')
  expect(url.searchParams.get('timeSlot')).toBe('10:00')
  expect(url.searchParams.get('date')).toBe(process.env.QA_AGENDA_DATE)

  await expect(page.getByRole('radiogroup', { name: 'Servicio' }).getByRole('radio', { name: /Spa Day/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const dateGroup = page.getByRole('radiogroup', { name: 'Fecha' })
  await expect(dateGroup.getByRole('radio', { checked: true })).toHaveCount(1)

  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const timeGroup = page.getByRole('radiogroup', { name: 'Horario' })
  await expect(timeGroup.getByRole('radio', { name: '10:00', exact: true })).toHaveAttribute('aria-checked', 'true')
})
```

- [x] **Step 2: Run the focused browser test and verify RED**

Run:

```powershell
npm run qa:local -- --grep "rebook a completed reservation"
```

Expected: FAIL because the current seed has no `QA_REBOOK` card. The failure must be the missing fixture, not a Vite, emulator, authentication or selector error.

---

### Task 2: Add the deterministic completed reservation fixture

**Files:**
- Modify: `qa/local/seed.mjs:139-187`.

**Interfaces:**
- Consumes: `dates.agendaDate`, `safeRunId(runId)` and the existing `base` reservation fields.
- Produces: a client-owned local reservation with id `qa-rebook-${safeRunId(runId)}`, status `completed`, service `spa-day`, date `dates.agendaDate`, time `10:00` and notes `QA_REBOOK`.

- [x] **Step 1: Add the minimal seed entry**

Insert this object in the `reservations` array:

```js
{
  id: `qa-rebook-${safeRunId(runId)}`,
  date: dates.agendaDate,
  timeSlot: '10:00',
  status: 'completed',
  notes: 'QA_REBOOK',
  empleadoId: null,
},
```

The object must inherit `userId`, `userEmail`, `serviceId`, `serviceName`, `durationMin` and `createdAt` from `base`; the explicit `status` overrides the base `pending` value.

- [x] **Step 2: Run the focused browser test and verify GREEN**

Run:

```powershell
npm run qa:local -- --grep "rebook a completed reservation"
```

Expected: `1 passed`, including the URL query values, selected service, one selected date and selected `10:00` slot.

- [x] **Step 3: Run the seed unit tests**

Run:

```powershell
node --test qa/local/seed.test.mjs
```

Expected: all seed helper tests pass. The test must continue to verify that QA credentials and dates are generated without depending on the current wall-clock date beyond the existing helper contract.

---

### Task 3: Update Phase 3 evidence and run the complete verification matrix

**Files:**
- Modify: `docs/Fase3.md:155-164`.
- Verify: `qa/local/seed.mjs`, `qa/tests/local-authenticated.spec.mjs`, `src/pages/DashboardPage.tsx`, `src/pages/Reservar.tsx`, `src/services/bookingPrefill.ts`.

**Interfaces:**
- Consumes: the passing browser evidence from Task 2.
- Produces: T3.7 marked with the actual local E2E evidence while preserving the statement that production verification remains pending.

- [x] **Step 1: Mark only the E2E acceptance criterion**

Change the T3.7 checklist item from unchecked to checked and update its local verification paragraph to record the actual `npm run qa:local` result. With the existing 21 cases plus this case, the expected total is `22 passed, 0 failed`; if the harness reports a different total, record the observed total instead.

Do not mark production deployment, production browser QA, Resend, App Check, Billing or Secret Manager as complete.

- [x] **Step 2: Run the full client and application checks**

Run:

```powershell
npm run test:client
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit with code `0`; existing rules and Functions evidence remains green; no source behavior outside the QA fixture and documentation changes is altered.

- [x] **Step 3: Run the complete local browser QA**

Run:

```powershell
npm run qa:local
```

Expected: `22 passed, 0 failed` or the actual current total after the added test, with no browser console or emulator failure that is attributable to this change.

- [x] **Step 4: Review scope and commit**

Run:

```powershell
git diff --stat
git diff --check
```

Confirm that only `qa/local/seed.mjs`, `qa/tests/local-authenticated.spec.mjs` and `docs/Fase3.md` are changed for this task; preserve unrelated worktree changes. Then commit only the intended files:

```powershell
git add qa/local/seed.mjs qa/tests/local-authenticated.spec.mjs docs/Fase3.md
git commit -m "test: cover completed reservation rebooking"
```

## Final review corrections

- [x] Eliminated the tracked `functions/.secret.local` without reading or restoring its content and added it to `.gitignore`.
- [x] Strengthened the date assertion to match the selected accessible radio to `QA_AGENDA_DATE` through its visible weekday, day and month text.
- [x] Clarified that the E2E opens a local `completed` fixture reservation and verifies re-booking; it does not create or complete the appointment.
- [x] Re-ran the focused E2E, the seed test, ESLint, TypeScript and `git diff --check`.

The correct runner for `qa/local/seed.test.mjs` is `node --test qa/local/seed.test.mjs`.
