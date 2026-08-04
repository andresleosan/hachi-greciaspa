# T3.5 Gestion de empleados y autoasignacion - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-managed employees, recurring shifts, and backend-authoritative automatic reservation assignment without breaking the existing reservation flow.

**Architecture:** Keep employee and assignment domain logic in focused Functions modules. `onReservaCreated` assigns the first eligible employee after a reservation is created, while an authenticated admin callable retries unassigned pending reservations for the selected agenda date. The client adds an admin employee-management page and extends the existing agenda with employee filtering and queue visibility; Firestore rules keep `empleadoId` out of client-controlled writes.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Firebase Auth/Firestore/Functions, Firebase Emulator Suite, date-fns/date-fns-tz, Vitest, existing custom CSS tokens.

## Global Constraints

- Employees use `services[]` with stable service document IDs, never display names.
- Seed Harold Salcedo and Daniela Padilla with `spa-day`, `grooming`, `guarderia`, and `pension`; seed Alberto González with `spa-day`, `guarderia`, and `pension`.
- Seed all three employees with `full` shifts Monday through Saturday and no shift Sunday.
- Shift windows are `morning` 08:00–14:00, `afternoon` 14:00–20:00, and `full` 08:00–20:00.
- Candidate selection is stable by normalized employee name, then employee ID.
- Active overlapping reservation statuses are only `pending` and `confirmed`.
- If no employee is eligible, preserve `pending` and `empleadoId: null`; do not reject the reservation.
- `onReservaCreated` performs first assignment; `assignPendingReservasForDate` retries only pending unassigned reservations for one ISO date.
- Reagendado preserves the current employee only when it remains eligible and free; otherwise it writes `empleadoId: null` and does not silently choose another employee.
- Employee deactivation is soft (`active: false`) and never deletes reservation history.
- Clients cannot set, change, or remove `empleadoId`; Admin SDK and admin-only paths are the assignment boundary.
- Do not add secrets, deploy Firebase, change Firebase Console configuration, or use production data.
- Do not add inline `style={{}}`; use classes in `src/styles/maqueta.css`.
- Preserve current client reservation, cancellation, rescheduling, reminder, and admin status behavior.

---

### Task 1: Add Pure Assignment Domain Rules

**Files:**
- Create: `functions/src/assignment.ts`
- Create: `functions/src/assignment.test.ts`

**Interfaces:**
- Consumes: reservation date/time/duration/service ID and employee service/shift data.
- Produces:
  - `type ShiftName = 'morning' | 'afternoon' | 'full'`
  - `type EmployeeRole = 'groomer' | 'bañador' | 'cuidador'`
  - `type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'`
  - `interface WeeklyShifts { monday: ShiftName | null; tuesday: ShiftName | null; wednesday: ShiftName | null; thursday: ShiftName | null; friday: ShiftName | null; saturday: ShiftName | null; sunday: ShiftName | null }`
  - `interface AssignmentEmployee { id: string; name: string; active: boolean; services: string[]; weeklyShifts: WeeklyShifts }`
  - `interface AssignmentReservation { id: string; serviceId: string; date: string; timeSlot: string; durationMin: number; status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; empleadoId?: string | null }`
  - `parseAssignmentTime(timeSlot: string): number | null`
  - `getWeekday(date: string): Weekday | null`
  - `getShiftWindow(shift: ShiftName | null): { startMinutes: number; endMinutes: number } | null`
  - `isEmployeeEligible(employee: AssignmentEmployee, reservation: AssignmentReservation): boolean`
  - `reservationsOverlap(left: AssignmentReservation, right: AssignmentReservation): boolean`
  - `selectFirstEligibleEmployee(employees: AssignmentEmployee[], reservation: AssignmentReservation, existingReservations: AssignmentReservation[]): AssignmentEmployee | null`

- [ ] **Step 1: Write failing pure-domain tests.**

Add tests for:

```ts
expect(parseAssignmentTime('08:00')).toBe(480)
expect(parseAssignmentTime('8:00')).toBeNull()
expect(getWeekday('2026-08-04')).toBe('tuesday')
expect(getShiftWindow('morning')).toEqual({ startMinutes: 480, endMinutes: 840 })
```

Also cover full-duration shift coverage, reservations crossing a shift boundary, inactive employees, missing service IDs, malformed dates/times, overlap at the same start time, overlap when one booking starts inside another, cancelled/completed bookings not blocking availability, stable name sorting, and ID tie-breaking.

- [ ] **Step 2: Run the focused Functions test and verify the red state.**

Run: `npm --prefix functions test -- assignment.test.ts`

Expected: FAIL because `functions/src/assignment.ts` and its exports do not exist.

- [ ] **Step 3: Implement strict domain helpers.**

Use integer minutes, strict `HH:mm` validation, UTC date parsing for weekday calculation, and return `false` for invalid or non-positive durations. Treat an employee as eligible only when `active` is true, `services` contains the reservation `serviceId`, the weekday has a shift covering the full interval, and the employee has no active overlapping reservation. Normalize names with `normalize('NFD')`, strip combining marks, trim, lowercase, and compare the normalized name before `id`.

- [ ] **Step 4: Run the focused Functions tests green.**

Run: `npm --prefix functions test -- assignment.test.ts`

Expected: all assignment domain tests pass.

- [ ] **Step 5: Commit the domain unit.**

```bash
git add functions/src/assignment.ts functions/src/assignment.test.ts
git commit -m "feat: add employee assignment domain rules"
```

---

### Task 2: Add Employee Types, Seed, and Client Contracts

**Files:**
- Create: `src/types/empleado.ts`
- Modify: `src/types/index.ts`
- Create: `src/types/empleado.test.ts`
- Create: `tools/seed-employees.mjs`
- Modify: `package.json`
- Modify: `src/types/reserva.ts`

**Interfaces:**
- Consumes: service IDs from `tools/seed-services.mjs` and the approved employee seed data.
- Produces:
  - `type EmpleadoRole = 'groomer' | 'bañador' | 'cuidador'`
  - `type EmpleadoShift = 'morning' | 'afternoon' | 'full'`
  - `type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'`
  - `interface WeeklyShifts { monday: EmpleadoShift | null; tuesday: EmpleadoShift | null; wednesday: EmpleadoShift | null; thursday: EmpleadoShift | null; friday: EmpleadoShift | null; saturday: EmpleadoShift | null; sunday: EmpleadoShift | null }`
  - `interface Empleado { id: string; name: string; role: EmpleadoRole; photoUrl: string | null; active: boolean; services: string[]; weeklyShifts: WeeklyShifts }`
  - `type EmpleadoInput = Omit<Empleado, 'id'>`
  - `Reserva.empleadoId?: string | null`

- [ ] **Step 1: Add the type contract test.**

Create `src/types/empleado.test.ts` with a representative employee object and a `Reserva` fixture that includes `empleadoId: null`. Import the types from `src/types/index.ts` so the barrel contract is exercised by the existing client test command. Run `npm run test:client` and confirm the test fails before the types exist.

- [ ] **Step 2: Implement the types and barrel exports.**

Keep the seven weekday properties explicit so invalid schedule keys fail TypeScript checks. Model `empleadoId` as optional for backward compatibility with existing Firestore documents while all new reservation-assignment code treats an absent value as `null`.

- [ ] **Step 3: Create the idempotent employee seed.**

Follow the Admin SDK/emulator conventions in `tools/seed-services.mjs`. Add `npm run seed:employees` and support the same emulator/service-account invocation modes. Upsert stable IDs such as `harold-salcedo`, `daniela-padilla`, and `alberto-gonzalez`; do not delete or overwrite unrelated employee documents. Store the exact approved services and Monday–Saturday `full` schedule.

- [ ] **Step 4: Verify types and seed syntax.**

Run: `npx tsc --noEmit`

Run: `node --check tools/seed-employees.mjs`

Expected: both commands exit `0`.

- [ ] **Step 5: Commit the data contract.**

```bash
git add src/types/empleado.ts src/types/empleado.test.ts src/types/index.ts src/types/reserva.ts tools/seed-employees.mjs package.json
git commit -m "feat: add employee data contract and seed"
```

---

### Task 3: Harden Firestore Rules and Add Backfill Tool

**Files:**
- Modify: `firestore.rules:37-65`
- Modify: `tools/firestore-tests/run-rules-tests.mjs`
- Create: `tools/backfill-empleado-id.mjs`
- Modify: `docs/SCHEMA.md`

**Interfaces:**
- Consumes: `Empleado` fields and optional `Reserva.empleadoId` from Task 2.
- Produces: rules that allow Admin SDK assignment while rejecting client assignment and an idempotent local backfill command.

- [ ] **Step 1: Add failing rules cases.**

Add emulator tests for:

```text
admin can create and update empleados
client cannot read empleados
client cannot create a reserva with empleadoId set to another employee
client cannot add or change empleadoId on an existing reservation
admin can update empleadoId on a reservation
```

Run: `npm run rules:test`

Expected: the new client-protection cases fail against the current permissive reservation create rule.

- [ ] **Step 2: Restrict client-controlled reservation fields.**

Update reservation create so `empleadoId` is absent or `null` for client creates. Extend the owner update allowlist so `empleadoId` cannot be added, changed, or removed. Preserve admin full access and the existing exact cancellation contract.

- [ ] **Step 3: Implement the idempotent backfill tool.**

Create `tools/backfill-empleado-id.mjs` with explicit `--emulator` and service-account modes. It must read reservations in batches, write only `empleadoId: null` when the field is absent, print a count, and require `--apply` before writing. Default mode is dry-run. It must never assign employees or alter any other field.

- [ ] **Step 4: Document the schema and operational command.**

Document `empleados`, `weeklyShifts`, `reservas.empleadoId`, ownership, absent-field compatibility, and the dry-run/apply backfill command in `docs/SCHEMA.md`. State that the backfill is not run against production by this task.

- [ ] **Step 5: Run rules and syntax verification.**

Run: `npm run rules:test`

Run: `node --check tools/backfill-empleado-id.mjs`

Expected: all existing and new rules tests pass; the script parses successfully.

- [ ] **Step 6: Commit the security boundary.**

```bash
git add firestore.rules tools/firestore-tests/run-rules-tests.mjs tools/backfill-empleado-id.mjs docs/SCHEMA.md
git commit -m "feat: protect employee reservation assignments"
```

---

### Task 4: Implement Backend Assignment Trigger and Retry Callable

**Files:**
- Create: `functions/src/employeeRepository.ts`
- Create: `functions/src/assignmentService.ts`
- Create: `functions/src/assignmentService.test.ts`
- Modify: `functions/src/index.ts`

**Interfaces:**
- Consumes: pure helpers from `functions/src/assignment.ts`, Firestore, and the admin-role convention used by existing callables.
- Produces:
  - `interface AssignPendingReservasInput { date: string }`
  - `interface AssignPendingReservasResult { assignedReservationIds: string[]; pendingReservationIds: string[] }`
  - `assignReservaIfNeeded(db: Firestore, reservaId: string): Promise<string | null>`
  - `assignPendingReservasForDateHandler(request: CallableRequest<AssignPendingReservasInput>, db: Firestore): Promise<AssignPendingReservasResult>`
  - exported Functions `onReservaCreated` and `assignPendingReservasForDate`

- [ ] **Step 1: Add failing backend service tests.**

Test the service with the Functions emulator or the repository’s existing Firestore test setup. Cover first eligible assignment, no eligible employee, occupied first candidate selecting the next candidate, deterministic ordering, an already-assigned reservation remaining unchanged, admin-only callable authorization, invalid date rejection, and repeated retry returning no additional changes.

- [ ] **Step 2: Implement employee/reservation reads.**

Use `getFirestore()` and bounded queries. Read active employees, read same-date reservations needed for overlap checks, and normalize documents into the assignment interfaces. Treat missing `empleadoId` as `null`. Keep all writes limited to `empleadoId`.

- [ ] **Step 3: Implement the idempotent assignment transaction.**

Inside a transaction, reread the target reservation, return without writing when it is missing, non-pending, or already assigned, calculate the candidate from the current employee and reservation snapshots, and update only `{ empleadoId: candidate.id }` when a candidate exists. If there is no candidate, return `null` without writing. Use transaction reads before the write and allow Firestore retries to handle concurrent changes.

- [ ] **Step 4: Export the create trigger.**

Use the Firebase Functions v2 Firestore document-created trigger for `reservas/{reservaId}`. Pass the created document to `assignReservaIfNeeded`. A failed assignment must log a sanitized reason and leave the reservation intact; it must not delete or cancel it.

- [ ] **Step 5: Export the admin retry callable.**

Validate an ISO `YYYY-MM-DD` date. Require `request.auth.uid` and accept admin when the token has `admin === true` or the corresponding `users/{uid}` document has `role === 'admin'`. Query only pending reservations for the requested date without an employee, process them in `timeSlot` then ID order, and return assigned/pending ID arrays.

- [ ] **Step 6: Register exports and run Functions tests.**

Export both Functions from `functions/src/index.ts` alongside `scheduledSendReminders` and `rescheduleReserva`.

Run: `npm --prefix functions test`

Run: `npm --prefix functions run typecheck`

Run: `npm --prefix functions run build`

Expected: all assignment and existing reminder/reschedule tests pass, typecheck is clean, and build exits `0`.

- [ ] **Step 7: Commit the backend assignment unit.**

```bash
git add functions/src/employeeRepository.ts functions/src/assignmentService.ts functions/src/assignmentService.test.ts functions/src/index.ts
git commit -m "feat: auto-assign reservations to employees"
```

---

### Task 5: Revalidate Employee Assignment During Rescheduling

**Files:**
- Modify: `functions/src/rescheduleReserva.ts`
- Modify: `functions/src/rescheduleReserva.test.ts`

**Interfaces:**
- Consumes: assignment eligibility and overlap helpers/service from Task 4.
- Produces: rescheduling that preserves a free current employee or writes `empleadoId: null` when the employee is no longer valid for the new slot.

- [ ] **Step 1: Add failing reschedule tests.**

Add cases for an assigned reservation keeping its employee when the new slot is within that employee’s shift and free, clearing the employee when the new slot overlaps that employee’s active reservation, clearing when the employee is inactive or no longer serves the service, and leaving an unassigned reservation unassigned. Keep existing ownership, future-date, service-slot conflict, and status tests.

- [ ] **Step 2: Extend the transaction read set.**

Load the existing `empleadoId` and employee document before writing the new date/time. Query active reservations at the target date/time, excluding the reservation being moved. Use the assignment helper to validate the current employee only; do not select a replacement during the reschedule transaction.

- [ ] **Step 3: Update only the intended fields.**

Write `date`, `timeSlot`, and `empleadoId: null` only when the current assignment is invalid. Preserve the current employee ID when valid. Keep the existing callable result shape unless a test proves the client needs the assignment value.

- [ ] **Step 4: Run the focused and complete Functions tests.**

Run: `npm --prefix functions test -- rescheduleReserva.test.ts assignmentService.test.ts`

Expected: new and existing rescheduling tests pass.

- [ ] **Step 5: Commit the rescheduling integration.**

```bash
git add functions/src/rescheduleReserva.ts functions/src/rescheduleReserva.test.ts
git commit -m "feat: revalidate employee on reschedule"
```

---

### Task 6: Add Client Employee Service and Callable Wrapper

**Files:**
- Create: `src/services/empleados.ts`
- Create: `src/services/empleados.test.ts`

**Interfaces:**
- Consumes: `Empleado`, `EmpleadoInput`, Firestore client SDK, `firebaseFunctions`, and the Functions callable from Task 4.
- Produces:
  - `listEmpleados(): Promise<Empleado[]>`
  - `createEmpleado(input: EmpleadoInput): Promise<string>`
  - `updateEmpleado(empleadoId: string, input: EmpleadoInput): Promise<void>`
  - `deactivateEmpleado(empleadoId: string): Promise<void>`
  - `assignPendingReservasForDate(date: string): Promise<AssignPendingReservasResult>`

- [ ] **Step 1: Add focused service tests.**

Mock Firestore and `httpsCallable` to verify create/update send the employee fields exactly, deactivation sends only `{ active: false }`, list maps document IDs into `Empleado.id`, and the callable wrapper sends `{ date }` and returns the typed summary.

- [ ] **Step 2: Implement Firestore employee CRUD.**

Read the `empleados` collection with `getDocs`, create with `addDoc`, update with `updateDoc`, and deactivate with `updateDoc`. Keep the service admin-facing; do not add client-side role checks as a substitute for rules.

- [ ] **Step 3: Implement the callable wrapper.**

Use `httpsCallable<AssignPendingReservasInput, AssignPendingReservasResult>(firebaseFunctions, 'assignPendingReservasForDate')`. Convert Firebase callable failures into a user-safe `EmpleadoError` message without exposing tokens or server internals.

- [ ] **Step 4: Run client tests and typecheck.**

Run: `npm run test:client`

Run: `npx tsc --noEmit`

Expected: all client service tests and existing client tests pass.

- [ ] **Step 5: Commit the client service.**

```bash
git add src/services/empleados.ts src/services/empleados.test.ts
git commit -m "feat: add employee admin data service"
```

---

### Task 7: Build the Admin Employee Management Page

**Files:**
- Create: `src/pages/DashboardEmpleados.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/styles/maqueta.css`

**Interfaces:**
- Consumes: `Empleado`, `Servicio`, employee service functions, `useAuth`, and `ProtectedRoute`.
- Produces: admin-only `/dashboard/empleados` with list, create, edit, and soft-deactivate flows.

- [ ] **Step 1: Add the protected route and dashboard link.**

Lazy-load `DashboardEmpleados` in `src/App.tsx`, add `/dashboard/empleados`, wrap the page in `ProtectedRoute requireRole="admin"`, and add a real dashboard link without changing unrelated disabled navigation.

- [ ] **Step 2: Add the loading/error/empty shell.**

Load employees and public services on mount. Render explicit loading, read-error, empty, and populated states. Keep the page inaccessible to non-admin users through the existing route guard.

- [ ] **Step 3: Implement the employee form.**

Use controlled inputs for name, role, photo URL, active state, service checkboxes, and seven shift selects. Initialize the seed-compatible default schedule for new employees, validate a non-empty name and at least one service before submit, and show inline field errors.

- [ ] **Step 4: Implement create and edit flows.**

Use `createEmpleado` for new records and `updateEmpleado` for edits. Refresh the list only after success, disable the submit button during the request, preserve form values after failure, and display a safe error message.

- [ ] **Step 5: Implement logical deactivation.**

Add a confirmation step before `deactivateEmpleado`. Do not delete documents. Keep existing reservations and their employee IDs untouched, and show inactive employees separately or with an explicit status label.

- [ ] **Step 6: Add responsive CSS without inline styles.**

Add focused `.empleados-*` classes for cards/table, form sections, shift controls, service list, status badges, errors, and mobile layout. Do not introduce `style={{}}` or CSS custom properties assigned from JSX.

- [ ] **Step 7: Run UI verification.**

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: both commands exit `0` and the route remains lazy-loaded.

- [ ] **Step 8: Commit the admin page.**

```bash
git add src/pages/DashboardEmpleados.tsx src/App.tsx src/pages/DashboardPage.tsx src/styles/maqueta.css
git commit -m "feat: add admin employee management"
```

---

### Task 8: Integrate Assignment Retry and Therapist Filter into Agenda

**Files:**
- Modify: `src/pages/DashboardAgenda.tsx`
- Modify: `src/services/agenda.ts`
- Modify: `src/services/agenda.test.ts`
- Modify: `src/styles/maqueta.css`

**Interfaces:**
- Consumes: `listEmpleados`, `assignPendingReservasForDate`, `Empleado`, and existing agenda helpers.
- Produces:
  - `filterAgendaBookingsByEmployee(bookings: Reserva[], employeeFilter: 'all' | 'unassigned' | string): Reserva[]`
  - `getEmployeeDisplayName(employeeId: string | null | undefined, employees: Empleado[]): string`
  - agenda state for employee filter, assignment retry status, and unassigned bookings.

- [ ] **Step 1: Add failing agenda helper tests.**

Cover all-employees behavior, a selected employee, unassigned filtering, unknown employee IDs, and display fallback text. Preserve the existing service-filter and timeline helper tests.

- [ ] **Step 2: Implement pure employee filtering helpers.**

Return new arrays without mutating Firestore-derived reservations. Treat filter value `all` as no employee filter and `unassigned` as absent/null `empleadoId`.

- [ ] **Step 3: Load employees and retry pending assignments for the selected date.**

When admin access and `selectedDate` are ready, call `assignPendingReservasForDate(selectedDate)` and then reload the date’s reservations and employees. Keep a separate nonfatal assignment error state so already-loaded bookings remain visible if the callable fails.

- [ ] **Step 4: Replace the disabled therapist control.**

Render an enabled select with `Todas`, each active/inactive employee label, and `Sin terapeuta`. Apply it after the service filter. Keep the existing service filter and reset both filters on date changes only when the date actually changes.

- [ ] **Step 5: Show assignment information in blocks and drawer.**

Add the employee name to assigned event blocks and the detail drawer. Add a visible “Sin terapeuta asignado” label and count/section. Do not add manual assignment controls.

- [ ] **Step 6: Add responsive and status styles.**

Extend `.agenda-*` CSS for employee filter state, assignment errors, employee labels, and unassigned queue while preserving the existing mobile timeline behavior.

- [ ] **Step 7: Run agenda tests and build.**

Run: `npm run test:client`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: all client tests, typecheck, and production build pass.

- [ ] **Step 8: Commit the agenda integration.**

```bash
git add src/pages/DashboardAgenda.tsx src/services/agenda.ts src/services/agenda.test.ts src/styles/maqueta.css
git commit -m "feat: add therapist filtering to daily agenda"
```

---

### Task 9: Document T3.5 and Run Full QA

**Files:**
- Modify: `docs/Fase3.md`
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`
- Test artifacts: ignored QA screenshots/reports only; do not commit secrets or production data

**Interfaces:**
- Consumes: completed T3.5 UI, Functions, rules, seed, backfill, and emulator tests.
- Produces: honest local completion documentation and reproducible verification evidence.

- [ ] **Step 1: Mark the local T3.5 criteria accurately.**

In `docs/Fase3.md`, check only employee UI, employee fields, seed, recurring shifts, automatic assignment, overlap filtering, agenda therapist filter, and unassigned queue once those behaviors pass. Keep deployment, production configuration, browser QA against production, and external release gates unchecked.

- [ ] **Step 2: Update operational documentation.**

Document `npm run seed:employees`, the backfill dry-run/apply commands, emulator prerequisites, employee schedule semantics, assignment retry behavior, and the fact that no production backfill or deployment is performed by this task.

- [ ] **Step 3: Run the local verification matrix.**

Run:

```bash
npm run test:client
npx tsc --noEmit
npm run build
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
```

Expected: every command exits `0`; rules remain at least `41 passed, 0 failed` plus the new assignment cases; existing Functions tests remain green plus the new assignment/reschedule cases.

- [ ] **Step 4: Run browser QA against emulators only.**

Start Auth, Firestore, and Functions emulators. Verify:

1. Non-admin cannot access `/dashboard/empleados` or assignment-enabled agenda controls.
2. Admin can create, edit, and deactivate an employee.
3. Service and shift changes are visible after reload.
4. A new reservation is assigned to the first eligible employee after the trigger runs.
5. A conflicting reservation skips the occupied employee.
6. A reservation with no eligible employee appears under “Sin terapeuta asignado”.
7. Refreshing the agenda after a cancellation or employee availability change assigns queued reservations.
8. Reagendado preserves a free employee and clears a conflicting assignment.
9. Therapist filtering shows all, one employee, and unassigned reservations.
10. Mobile agenda remains horizontally scrollable.

Capture console errors and record any emulator limitation; do not use production credentials or data.

- [ ] **Step 5: Review security and scope before completion.**

Run:

```bash
git diff --name-only
```

Confirm no secret, production deployment, client-controlled `empleadoId` write, hard delete of employees, unrelated source reversion, or inline style was introduced.

- [ ] **Step 6: Commit documentation and QA changes.**

```bash
git commit -m "docs: document employee assignment operations"
```

## Handoff

Report the new employee route, seed/backfill commands, Function names, reservation assignment semantics, rules tests, Functions tests, browser QA result, remaining production gates, and whether deployment was intentionally not performed.
