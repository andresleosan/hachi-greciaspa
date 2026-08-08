# Agenda Diaria Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `T3.4` as an admin-only daily agenda with a date selector, service filtering, 08:00–20:00 horizontal timeline, reservation detail drawer, and safe status actions.

**Architecture:** Keep `DashboardPage.tsx` as the summary view and add a lazy `/dashboard/agenda` page protected by `ProtectedRoute requireRole="admin"`. Put timeline math, filtering, and allowed-action decisions in pure helpers under `src/services/agenda.ts`; keep Firestore status writes in `src/services/reservas.ts`; render all visual layout through CSS classes in `src/styles/maqueta.css`.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Firebase Auth/Firestore, date-fns, Vitest, existing custom CSS tokens.

## Global Constraints

- The route must require `ProtectedRoute` with `requireRole="admin"`.
- The operating timeline is `08:00`–`20:00` in 30-minute slots.
- The selected date is queried with `where('date', '==', selectedDate)` and results are sorted in memory by `timeSlot`.
- No schema fields, collections, Firestore indexes, migrations, or therapist assignments are added.
- The service filter is functional; the therapist filter is visibly prepared but disabled until `empleadoId` exists in `T3.5`.
- Admin status writes update only `status`; allowed transitions are `pending → confirmed`, `pending → cancelled`, `confirmed → cancelled`, and `confirmed → completed` after the appointment.
- No `style={{}}` is introduced. Dynamic placement uses named CSS classes, not inline styles or CSS custom properties set from JSX.
- Preserve the existing dashboard, reservation, cancellation, and rescheduling behavior.
- No deployment or external Firebase Console changes are performed.
- Do not create a commit automatically inside task subagents; integration is handled by the controller after review.

---

### Task 1: Add Pure Agenda Domain Helpers

**Files:**
- Create: `src/services/agenda.ts`
- Create: `src/services/agenda.test.ts`
- Modify: `package.json` if needed so `test:client` runs both client test files
- Test: `npm run test:client`

**Interfaces:**
- Consumes: `Reserva` and `ReservaStatus` from `src/types`.
- Produces:
  - `AGENDA_START_MINUTES = 480` and `AGENDA_END_MINUTES = 1200`.
  - `AGENDA_SLOT_MINUTES = 30`.
  - `AgendaAction = 'confirm' | 'cancel' | 'complete'`.
  - `AgendaPlacement = { startSlot: number; span: number; inOperatingHours: boolean }`.
  - `parseTimeSlot(timeSlot: string): number | null`.
  - `getAgendaPlacement(timeSlot: string, durationMin: number): AgendaPlacement | null`.
  - `filterAgendaBookings(bookings: Reserva[], serviceId: string): Reserva[]`.
  - `getAgendaActions(reserva: Reserva, now: Date): AgendaAction[]`.
  - `getAgendaStatusLabel(action: AgendaAction): string`.

- [ ] **Step 1: Write failing helper tests.**

Create tests covering:

```ts
expect(parseTimeSlot('08:00')).toBe(480)
expect(parseTimeSlot('19:30')).toBe(1170)
expect(parseTimeSlot('8:00')).toBeNull()
expect(parseTimeSlot('24:00')).toBeNull()

expect(getAgendaPlacement('08:00', 60)).toEqual({
  startSlot: 0,
  span: 2,
  inOperatingHours: true,
})
expect(getAgendaPlacement('19:30', 60)?.inOperatingHours).toBe(false)
expect(getAgendaPlacement('07:30', 60)?.inOperatingHours).toBe(false)
```

Also test filtering by `serviceId`, preservation of all bookings for the `all` filter, action matrices for pending/confirmed/cancelled/completed bookings, and that `complete` is absent before the appointment datetime.

- [ ] **Step 2: Run the focused client tests and verify the red state.**

Run:

```powershell
npm run test:client
```

Expected: fail because `src/services/agenda.ts` and the new helper exports do not exist yet.

- [ ] **Step 3: Implement the minimal pure helpers.**

Use strict `HH:mm` validation, integer minute arithmetic, and 30-minute slot indices relative to 08:00. Clamp `span` to at least `1`; mark a booking outside the operating window when its start is before 08:00, at/after 20:00, or its duration ends after 20:00. Return no admin actions for cancelled/completed bookings. Return `complete` only when the combined reservation date/time is not later than `now`.

Use these labels:

```ts
confirm: 'Confirmar'
cancel: 'Cancelar'
complete: 'Marcar completada'
```

- [ ] **Step 4: Run the helper tests green.**

Run:

```powershell
npm run test:client
```

Expected: the existing reservation error tests and all agenda helper tests pass.

---

### Task 2: Add Admin Reservation Status Service And Route Link

**Files:**
- Modify: `src/services/reservas.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Test: `npm run test:client`, `npx tsc --noEmit`

**Interfaces:**
- Consumes: `ReservaStatus` and `AgendaAction` from Task 1.
- Produces `updateAdminReservaStatus(reservaId: string, status: 'confirmed' | 'cancelled' | 'completed'): Promise<void>`.

- [ ] **Step 1: Add the service contract without changing existing services.**

Implement `updateAdminReservaStatus` with `updateDoc(doc(firebaseDb, 'reservas', reservaId), { status })`. Do not send any other fields. The Firestore rule already grants full reservation updates to admin; the route guard and server rules remain the authorization boundary.

- [ ] **Step 2: Add the dashboard agenda link.**

Replace only the disabled sidebar `Citas` item with a real `Link` to `/dashboard/agenda`. Keep its current sidebar styling and leave unrelated disabled navigation entries untouched.

- [ ] **Step 3: Verify the service and dashboard compile.**

Run:

```powershell
npm run test:client
npx tsc --noEmit
```

Expected: client tests and TypeScript pass; no inline style is added.

---

### Task 3: Build The Admin Agenda Page And Responsive Styles

**Files:**
- Create: `src/pages/DashboardAgenda.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/maqueta.css`
- Test: `npx tsc --noEmit`, `npm run build`

**Interfaces:**
- Consumes: Task 1 helpers, `updateAdminReservaStatus`, `useAuth`, `firebaseDb`, and `Reserva`.
- Produces a lazy `/dashboard/agenda` route with admin guard and the complete agenda UI.

- [ ] **Step 1: Add the lazy route and protected page shell.**

In `src/App.tsx`, lazy-load `DashboardAgenda` and add:

```tsx
<Route path="/dashboard/agenda" element={<DashboardAgenda />} />
```

The page must render its content inside:

```tsx
<ProtectedRoute requireRole="admin">
  <main>...</main>
</ProtectedRoute>
```

Include a back link to `/dashboard`, page title, selected-date `<input type="date">` initialized to `format(new Date(), 'yyyy-MM-dd')`, and visible loading/error/empty states.

- [ ] **Step 2: Load and filter the selected date.**

Query only:

```ts
query(collection(firebaseDb, 'reservas'), where('date', '==', selectedDate))
```

Convert each document to `{ id: doc.id, ...data } as Reserva`, sort by `timeSlot` in memory, derive unique service options from `serviceId` and `serviceName`, and apply `filterAgendaBookings`. Do not add `orderBy`, an index, or a therapist field.

- [ ] **Step 3: Render the horizontal timeline without inline styles.**

Render 24 half-hour columns from 08:00 through 19:30. Use CSS classes such as `agenda-event--start-0` and `agenda-event--span-2`; generate only from bounded helper output. Each event must show service, client name when available, time, and status color class. Use an `incidencias` section for invalid/out-of-hours bookings instead of dropping them.

The page must include a service `<select>` and a disabled therapist `<select>` labeled as prepared for `T3.5`. Mobile CSS must allow horizontal scrolling for the timeline while keeping filters and event text usable.

- [ ] **Step 4: Implement the accessible detail drawer.**

Selecting an event opens an aside/dialog with `role="dialog"`, `aria-modal="true"`, an accessible close button, service, customer, date, time, duration, notes, and current status. Close on the close button and overlay; do not require a new dependency.

- [ ] **Step 5: Implement status actions and optimistic-safe updates.**

Use `getAgendaActions` to render only valid actions. On action:

1. confirm cancellation with the existing browser confirmation pattern;
2. set a per-reservation busy state;
3. call `updateAdminReservaStatus` with only the target status;
4. update the selected booking and list only after success;
5. close the drawer or refresh its status;
6. show an inline error and preserve the old status on failure.

Disable all drawer actions while that reservation is busy. Do not allow `completed` before the appointment datetime.

- [ ] **Step 6: Add CSS classes and verify no inline styles.**

Add focused `.agenda-*` rules to `src/styles/maqueta.css` using existing tokens. Cover timeline axis, event status colors, drawer overlay/panel, filters, empty/error states, and the mobile horizontal-scroll breakpoint. Search the changed TSX files for `style={{` and remove any occurrence introduced by this task.

- [ ] **Step 7: Verify page compilation and build.**

Run:

```powershell
npx tsc --noEmit
npm run build
```

Expected: both commands exit `0`.

---

### Task 4: Browser Regression, Documentation, And Full Verification

**Files:**
- Modify: `docs/Fase3.md`
- Test: `npm run test:client`, `npx tsc --noEmit`, `npm run build`, `npm run rules:test`, `npm --prefix functions test`, `npm --prefix functions run typecheck`, `npm --prefix functions run build`

**Interfaces:**
- Consumes: the completed agenda route, helpers, and status service.
- Produces: documented local completion for T3.4 and evidence that existing reservation behavior still passes.

- [ ] **Step 1: Update the T3.4 checklist honestly.**

In `docs/Fase3.md`, mark only the implemented T3.4 UI, date selector, timeline, status-colored blocks, drawer actions, admin-only completion, and service filter as checked. State that therapist filtering remains prepared but disabled pending `T3.5`; do not mark production/browser QA or therapist management complete.

- [ ] **Step 2: Run browser QA against a non-production environment.**

Using the configured local emulator or test environment, verify:

- authenticated non-admin user cannot see the agenda route and is redirected;
- admin can open `/dashboard/agenda` from the dashboard;
- changing date reloads that day;
- service filter changes visible blocks;
- clicking a block opens and closes the drawer;
- pending can confirm/cancel; confirmed can cancel/complete only after its appointment;
- failed status writes preserve the previous status and show an error;
- mobile viewport can horizontally scroll the timeline.

Capture console errors and do not use production data.

- [ ] **Step 3: Run the complete verification matrix.**

Run:

```powershell
npm run test:client
npx tsc --noEmit
npm run build
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected: all commands exit `0`; rules remain `41 passed, 0 failed`; Functions remain `47 passed, 2 skipped`.

- [ ] **Step 4: Review scope and security.**

Run:

```powershell
git status --short --branch
git diff --stat
git diff --name-only
```

Confirm no new schema field, therapist assignment, secret, direct non-admin write path, inline style, production deployment, or unrelated source reversion exists.

## Handoff

Report the route, helper/service/test files, browser QA result, full verification output, remaining `T3.5` dependency, and whether deployment was intentionally not performed.
