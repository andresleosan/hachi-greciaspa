# Lock De Disponibilidad De Reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la carrera de disponibilidad entre usuarios serializando `createReserva` y `rescheduleReserva` del mismo servicio y dia con un lock server-only determinista.

**Architecture:** Las callables `createReserva` y `rescheduleReserva` leeran y actualizaran `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` dentro de sus transacciones. `createReserva` lo lee antes de consultar disponibilidad y lo escribe al crear `reservas`; `rescheduleReserva` lo lee antes de consultar conflictos y lo escribe antes de actualizar la reserva. El lock se crea bajo demanda, no se expone por Rules y no requiere backfill; la contencion queda acotada al servicio y dia.

**Tech Stack:** Firebase Functions v2, Firebase Admin SDK, Firestore transactions, Firestore Rules Emulator, TypeScript, Vitest, Node test runner.

## Global Constraints

- No desplegar Functions, Rules ni frontend.
- No configurar Firebase Console, App Check productivo, Billing/Blaze, Resend o Secret Manager.
- No crear migraciones ni reescribir reservas existentes; los locks se crean lazy.
- No leer secretos, no hacer commits ni staging; preservar cambios ajenos del worktree.
- El lock debe ser server-only: `bookingSlotGuards` tendra `allow read, write: if false`.
- La callable debe mantener Auth, App Check, cuota 3/15 minutos, limite de 10 activas, snapshots canonicos y fail-closed.
- La disponibilidad debe seguir calculando solapamientos por `durationMin`, incluso cuando las reservas sean de usuarios distintos.
- La prueba de concurrencia debe demostrar exactamente una reserva para dos solicitudes solapadas del mismo servicio y dia.
- La prueba cross-call debe demostrar exactamente una operacion exitosa cuando una creacion y un reagendado de usuarios distintos compiten por el mismo servicio y dia.
- Documentar que la consulta de disponibilidad trae todos los activos del servicio/dia y que el lock no sustituye una futura estrategia de particionamiento o limpieza de datos.

## Final Fix Wave: Invariante Compartido

La revision final exige que ambas callables compartan el mismo helper de ID y
el mismo documento de lock. El fake transaccional permanece optimista: registra
versiones por path, mantiene `set`, `create` y `update` staged hasta el commit,
y reintenta solo conflictos de lectura. No se introduce una cola global.

La regresion cubre la escritura del lock por `rescheduleReserva` y una carrera
cross-call entre usuarios distintos. El comportamiento de ownership, estado
`pending`, empleado, conflictos y fecha futura en `America/Mexico_City` no
cambia.

---

### Task 1: Fake Transaccional Y Regresion De Concurrencia

**Files:**
- Modify: `functions/src/createReserva.test.ts:19-115`
- Modify: `functions/src/createReserva.test.ts:487-598`

**Interfaces:**
- Consumes: `createReservaHandler(request, db, now)` y el fake `TransactionFirestoreFake` existente.
- Produces: un fake que permite interleaving concurrente, detecta conflictos de documentos leidos y reintenta hasta 5 intentos; regresiones cross-user de create y de create/reschedule.

- [ ] **Step 1: Reemplazar la serializacion global artificial del fake**

  Sustituir `transactionQueue` por versiones por path, escrituras staged y un retry interno de hasta 5 intentos. `transaction.get()` debe registrar la version del documento leido; una lectura de documento inexistente registra version `0`. `set()` y `create()` deben aplicarse solo al commit. Si una version leida cambio antes del commit, lanzar un error interno de conflicto y reejecutar el callback.

  El commit debe validar todos los paths leidos antes de aplicar escrituras, incrementar la version de cada path escrito y mantener los arrays de evidencia `created`/`sets`. Un error de negocio devuelto por el callback no debe reintentarse; solo el error de conflicto debe hacerlo.

- [ ] **Step 2: Agregar la prueba RED de usuarios distintos**

  Añadir en `describe('createReservaHandler availability and concurrency', ...)`:

  ```ts
  it('serializes overlapping attempts from different users for the same service and date', async () => {
    const firestore = readyFirestore()
    const first = createReservaHandler(request(validInput, 'user-1'), firestore as unknown as Firestore, NOW)
    const second = createReservaHandler(
      request(validInput, 'user-2', { email: 'second@example.com', name: 'Second User' }),
      firestore as unknown as Firestore,
      NOW,
    )

    const results = await Promise.allSettled([first, second])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { code: 'failed-precondition' },
    })
    expect(firestore.created).toHaveLength(1)
  })
  ```

- [ ] **Step 3: Ejecutar la prueba para confirmar RED**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts -t "different users"`

  Expected: FAIL because both users currently can commit reservations; no production code is changed in this task.

- [ ] **Step 4: Confirmar que las pruebas existentes siguen describiendo el contrato**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts -t "concurrency|availability"`

  Expected: the new test fails for the race while existing availability assertions remain attributable to the current implementation.

No commit or staging: project policy requires the worktree to remain uncommitted.

---

### Task 2: Lock Server-Side En La Callable

**Files:**
- Modify: `functions/src/createReserva.ts:179-345`
- Test: `functions/src/createReserva.test.ts`

**Interfaces:**
- Consumes: the optimistic fake and cross-user RED test from Task 1.
- Produces: helper compartido para el path determinista `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` y transacciones que lo leen/escriben en los caminos exitosos de create y reschedule.

- [ ] **Step 1: Agregar el helper de document path**

   Implementar un helper compartido con este contrato:

  ```ts
   export function bookingSlotGuardId(serviceId: string, date: string): string {
    return `${encodeURIComponent(serviceId)}__${date}`
  }
  ```

   Usar el helper desde ambas callables con `db.collection('bookingSlotGuards').doc(bookingSlotGuardId(serviceId, date))`. No usar el id del usuario ni un timestamp, porque todas las solicitudes del mismo servicio/dia deben compartir el documento.

- [ ] **Step 2: Leer el lock antes de las consultas de disponibilidad**

  Despues de `parsed.ok` y de validar que la cita es futura, leer el documento determinista con `await transaction.get(slotGuardReference)`. Mantener todas las lecturas del camino exitoso antes de cualquier `transaction.set` o `transaction.create`.

- [ ] **Step 3: Escribir el lock en el commit exitoso**

  Antes de `transaction.create(reservationReference, reservationData)`, agregar:

  ```ts
  transaction.set(slotGuardReference, {
    serviceId: input.serviceId,
    date: input.date,
    updatedAt: FieldValue.serverTimestamp(),
  })
  ```

  No escribir el lock en `persistFailure`; una solicitud invalida o no disponible solo consume el guard de cuota. El guard de cuota y el lock deben confirmarse junto con la reserva en la misma transaccion.

- [ ] **Step 4: Ejecutar la prueba GREEN y el bloque de Functions**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts -t "different users"`

  Expected: PASS with one fulfilled result, one `failed-precondition`, and one created reservation.

  Run: `npm --prefix functions test`

  Expected: all existing Functions tests pass with exactly the documented skips.

---

### Task 2b: Lock De Destino En Reschedule

**Files:**
- Modify: `functions/src/rescheduleReserva.ts`
- Test: `functions/src/rescheduleReserva.test.ts`, `functions/src/createReserva.test.ts`

`rescheduleReserva` lee el lock del servicio/dia destino despues de validar
ownership/estado y antes de consultar conflictos. Antes de
`transaction.update(reservationReference, update)`, escribe el mismo lock con
`serviceId`, `date` y `updatedAt`. La prueba cross-call demuestra que una
creacion y un reagendado solapados de usuarios distintos dejan exactamente una
operacion exitosa.

### Task 3: Rules Y Cobertura De Acceso Al Lock

**Files:**
- Modify: `firestore.rules:75-78`
- Modify: `tools/firestore-tests/run-rules-tests.mjs:138-141`

**Interfaces:**
- Consumes: collection `bookingSlotGuards` escrita solo por Admin SDK desde Task 2.
- Produces: Rules que niegan lectura/escritura a cliente normal y admin autenticado, con evidencia automatizada.

- [ ] **Step 1: Agregar la regla privada**

  Añadir junto a `bookingGuards`:

  ```text
  match /bookingSlotGuards/{lockId} {
    allow read, write: if false;
  }
  ```

- [ ] **Step 2: Agregar cuatro pruebas Rules**

  Cubrir con `aliceDb` y `bobAdminDb` las operaciones `set()` y `get()` sobre `bookingSlotGuards/service-1__2099-01-01`, siguiendo exactamente el bloque existente de `bookingGuards`. Las cuatro expectativas deben ser `assertFails`.

- [ ] **Step 3: Ejecutar Rules**

  Run: `npm run rules:test`

  Expected: `74 passed, 0 failed`.

---

### Task 4: Documentacion, Rollback Y Costos

**Files:**
- Modify: `docs/adr/ADR-008-creacion-reservas-callable.md`
- Modify: `docs/SCHEMA.md`
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/Fase3.md`

**Interfaces:**
- Consumes: comportamiento final de Tasks 2-3 y la especificacion aprobada.
- Produces: decision tecnica consistente; ningun documento afirma que produccion esta configurada.

- [ ] **Step 1: Corregir la decision de ADR-008**

  Reemplazar la alternativa que descarta el lock por la decision actual: lock `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` lazy, server-only, por servicio/dia. Explicar que serializa disponibilidad entre usuarios y que la contencion deliberada es el trade-off para soportar intervalos de duracion variable.

- [ ] **Step 2: Documentar el esquema y Rules**

  En `SCHEMA.md`, agregar `bookingSlotGuards` como coleccion operativa sin backfill, sus campos `serviceId`, `date`, `updatedAt`, ownership Functions/Admin SDK y acceso cliente denegado. Incluir que el rollback no borra locks.

- [ ] **Step 3: Documentar costo y limite conocido**

  En `STACK.md` y `ADR-008`, registrar la lectura/escritura adicional por reserva y que la consulta de disponibilidad sigue devolviendo todos los activos del servicio/dia; el lock evita carreras pero no sustituye una futura estrategia de particionamiento o retencion de datos.

- [ ] **Step 4: Actualizar operación y Fase 3**

  En `RUNBOOK.md` y `Fase3.md`, reflejar el orden local ya verificado, la colección privada, el rollback no destructivo y los gates productivos pendientes. No agregar comandos de producción ejecutables ni valores de secretos.

- [ ] **Step 5: Revisar documentación**

  Run: `git diff --check -- docs/adr/ADR-008-creacion-reservas-callable.md docs/SCHEMA.md docs/STACK.md docs/RUNBOOK.md docs/Fase3.md`

  Expected: no whitespace errors, no contradicciones con el lock aprobado y ninguna afirmación de producción lista.

---

### Task 5: Verificacion Final Y Revision

**Files:**
- Verify: `functions/src/createReserva.ts`, `functions/src/createReserva.test.ts`, `firestore.rules`, `tools/firestore-tests/run-rules-tests.mjs`
- Verify: `functions/src/rescheduleReserva.ts`, `functions/src/rescheduleReserva.test.ts`, `functions/src/bookingSlotGuard.ts`
- Verify: `docs/adr/ADR-008-creacion-reservas-callable.md`, `docs/SCHEMA.md`, `docs/STACK.md`, `docs/RUNBOOK.md`, `docs/Fase3.md`

- [ ] **Step 1: Ejecutar regresion completa**

  Run each command independently:

  ```text
  npm run test:client
  npm run rules:test
  npm --prefix functions test
  npx tsc --noEmit
  npm run build
  npm --prefix functions run typecheck
  npm --prefix functions run build
  node --test qa/local/run.test.mjs qa/local/processes.test.mjs qa/local/seed.test.mjs
  ```

  Expected: exit code `0`; Functions conserva exactamente sus skips documentados.

- [ ] **Step 2: Ejecutar browser QA**

  Run: `npm run qa:local`

  Expected: 12 casos PASS contra emuladores, incluida creación/cancelación mediante callable; el runner debe elegir un puerto Vite efímero y no alterar procesos externos.

- [ ] **Step 3: Ejecutar seguridad y preflight**

  Run: `npm audit --omit=dev`
  Run: `npm --prefix functions audit --omit=dev`
  Run: `npm run release:preflight`
  Run: `git diff --check`

  Expected: cliente sin vulnerabilidades; advisories transitorios de Functions documentados si persisten; `PASS_WITH_WARNINGS` solo por gates externos/advisories, sin deploy ni lectura de secretos.

- [ ] **Step 4: Revisión final**

  Revisar que la prueba cross-user realmente falla antes del lock y pasa despues, que las Rules niegan la colección, que el ADR ya no descarta el lock y que no haya secretos o cambios ajenos atribuidos a esta tarea. Dejar el worktree sin commits ni staging según la política del proyecto.
