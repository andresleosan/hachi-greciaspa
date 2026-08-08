# Creacion De Reservas Mediante Callable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task with checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la escritura directa de reservas desde el navegador por una callable transaccional con App Check, cuota de abuso, limite de reservas activas y disponibilidad server-side.

**Architecture:** `createReserva` sera la unica autoridad para crear citas. Una transaccion de Firestore serializara el guard `bookingGuards/{uid}`, la cuota de intentos, el conteo de reservas activas, el catalogo canonico, la mascota y el solapamiento del slot antes de crear la reserva. Las rules negaran `create` directo y el frontend conservara la misma API visual mediante un wrapper con `httpsCallable`.

**Tech Stack:** Firebase Functions v2, Firebase Admin Firestore, Firebase Auth/App Check, React 19, TypeScript 6, Firestore Emulator Suite, Vitest, Playwright local.

## Global Constraints

- La callable aceptara solo `serviceId`, `date`, `timeSlot`, `mascotaId` opcional y `notes` opcional.
- La cuota sera de 3 intentos por usuario en 15 minutos; el cuarto intento se rechazara.
- Todo intento que pase Auth y App Check consumira cuota, incluso si el payload es invalido o falla otra cuota.
- Las reservas activas seran solo `pending` y `confirmed`; `cancelled` y `completed` no contaran para el limite de 10.
- App Check sera obligatorio en produccion y se omitira solo en emuladores.
- El catalogo, identidad, nombre, email, duracion, estado, precio y `createdBy` se resolveran en backend.
- La disponibilidad usara solapamiento por `durationMin` dentro de una transaccion.
- La nueva coleccion `bookingGuards` sera privada para Functions/Admin SDK.
- No se ejecutara `firebase deploy`, `gcloud`, seed productivo, configuracion de consola ni llamada real a Resend.
- No se leeran `.env`, `.env.local`, cuentas de servicio ni secretos.
- No se agregaran dependencias nuevas.
- No se crearan commits automaticos; el operador decidira cuando integrar cambios.
- Toda migracion de indices sera aditiva y tendra rollback documentado antes de produccion.

## Mapa De Archivos

### Backend y datos

- Crear `functions/src/bookingQuota.ts`: constantes y calculo puro de la ventana de intentos.
- Crear `functions/src/bookingQuota.test.ts`: pruebas unitarias de cuota y reinicio.
- Crear `functions/src/createReserva.ts`: contrato, validacion, transaccion y callable.
- Crear `functions/src/createReserva.test.ts`: pruebas de Auth, payload, catalogo, mascota, cuota, limite, solapamiento y snapshots.
- Modificar `functions/src/index.ts`: exportar `createReserva`.
- Modificar `firestore.rules`: negar `create` cliente en `reservas` y bloquear `bookingGuards`.
- Modificar `firestore.indexes.json`: agregar indices para reservas activas por usuario y servicio/fecha/estado.
- Modificar `tools/firestore-tests/run-rules-tests.mjs`: actualizar expectativas de create directo y agregar guard tests.

### Frontend

- Modificar `src/services/reservas.ts`: cambiar `addDoc` por `httpsCallable`.
- Modificar `src/services/reservas.test.ts`: probar el contrato de la callable.
- Modificar `src/services/reservaErrors.ts`: mapear cuota, autenticacion, App Check y disponibilidad.
- Modificar `src/services/reservaErrors.test.ts`: cubrir los nuevos codigos.
- Modificar `src/pages/Reservar.tsx`: enviar solo el input permitido y retirar datos canonicos controlados por el cliente.

### QA y documentacion

- Revisar `qa/tests/local-authenticated.spec.mjs`: conservar la prueba de crear/cancelar usando la callable.
- Crear `docs/adr/ADR-008-creacion-reservas-callable.md`: registrar la decision y sus consecuencias.
- Modificar `docs/SCHEMA.md`: documentar el owner Functions, `bookingGuards`, indices y rollback.
- Modificar `docs/STACK.md`: registrar App Check, cuota, costo de Firestore y gates externos.
- Modificar `docs/RUNBOOK.md`: documentar verificacion local y orden de rollout/rollback.
- Modificar `docs/Fase3.md`: actualizar T3.3/T3.8 y dejar pendientes los gates productivos.

---

### Task 1: Cuota Pura De Intentos

**Files:**
- Create: `functions/src/bookingQuota.ts`
- Test: `functions/src/bookingQuota.test.ts`

**Interfaces:**
- Produce `BOOKING_ATTEMPT_WINDOW_MS = 15 * 60 * 1000`.
- Produce `MAX_BOOKING_ATTEMPTS = 3`.
- Produce `consumeBookingAttempt(current, now) -> { allowed, state }`.
- `current` tendra `{ windowStartedAt: Date; attempts: number } | null`.
- `state` tendra `{ windowStartedAt: Date; attempts: number }`.

- [ ] **Step 1: Escribir las pruebas rojas de ventana y limite**

  En `bookingQuota.test.ts`, cubrir exactamente:

  ```ts
  const now = new Date('2026-08-07T12:00:00.000Z')

  expect(consumeBookingAttempt(null, now)).toEqual({
    allowed: true,
    state: { windowStartedAt: now, attempts: 1 },
  })

  expect(consumeBookingAttempt(
    { windowStartedAt: now, attempts: 2 },
    new Date(now.getTime() + 1_000),
  )).toEqual({
    allowed: true,
    state: { windowStartedAt: now, attempts: 3 },
  })

  expect(consumeBookingAttempt(
    { windowStartedAt: now, attempts: 3 },
    new Date(now.getTime() + 1_000),
  ).allowed).toBe(false)

  expect(consumeBookingAttempt(
    { windowStartedAt: now, attempts: 3 },
    new Date(now.getTime() + 15 * 60 * 1000),
  )).toEqual({
    allowed: true,
    state: {
      windowStartedAt: new Date(now.getTime() + 15 * 60 * 1000),
      attempts: 1,
    },
  })
  ```

  Agregar un caso de estado corrupto con `attempts < 0` o `attempts > 3`; debe reiniciar la ventana en el intento actual en vez de conceder intentos ilimitados.

- [ ] **Step 2: Ejecutar la prueba y confirmar el rojo**

  Run: `npm --prefix functions exec vitest run src/bookingQuota.test.ts`

  Expected: FAIL porque `functions/src/bookingQuota.ts` aun no existe.

- [ ] **Step 3: Implementar el calculo minimo de cuota**

  Implementar `consumeBookingAttempt` sin Firestore ni efectos secundarios. Si no existe estado o la ventana tiene 15 minutos o mas, devolver `attempts: 1` con `now`. Si la ventana sigue vigente y `attempts` es `0`, `1` o `2`, incrementar. Si es `3`, devolver `allowed: false` conservando el estado. Para valores fuera de rango, reiniciar con `attempts: 1`.

- [ ] **Step 4: Ejecutar la prueba en verde**

  Run: `npm --prefix functions exec vitest run src/bookingQuota.test.ts`

  Expected: todos los casos PASS.

---

### Task 2: Contrato Y Validacion De Entrada

**Files:**
- Create: `functions/src/createReserva.ts`
- Test: `functions/src/createReserva.test.ts`

**Interfaces:**
- Produce `CreateReservaInput` con `serviceId`, `date`, `timeSlot`, `mascotaId?` y `notes?`.
- Produce `CreateReservaResult` con `reservaId`, `date`, `timeSlot` y `status: 'pending'`.
- Produce `parseCreateReservaInput(value) -> { ok: true; input: CreateReservaInput } | { ok: false; error: HttpsError }` para que el handler pueda consumir cuota antes de devolver un payload invalido.
- La validacion usara `fromZonedTime` y `formatInTimeZone` de `functions/src/timeZone.ts`.

- [ ] **Step 1: Escribir pruebas rojas de input**

  En `createReserva.test.ts`, probar que el resultado tiene `ok: false` y `error.code == 'invalid-argument'` para `undefined`, `null`, tipos no string, campos desconocidos, `serviceId` vacio, `date` `2026-02-30`, `timeSlot` `25:00`, `notes` de mas de 1000 caracteres y `mascotaId` con `/`. Probar tambien que el resultado `ok: true` normaliza espacios exteriores de `serviceId`, `date`, `timeSlot` y `notes`.

- [ ] **Step 2: Ejecutar las pruebas y confirmar el rojo**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts`

  Expected: FAIL porque el contrato y `parseCreateReservaInput` aun no existen.

- [ ] **Step 3: Implementar el parser seguro**

  Aceptar solamente estas claves: `serviceId`, `date`, `timeSlot`, `mascotaId`, `notes`. Exigir `YYYY-MM-DD`, horario `HH:mm`, fecha calendario real y conversion valida en `America/Mexico_City`. Rechazar una cita cuyo instante sea menor o igual a `now` en el handler; el parser recibira `now` o dejara esa comprobacion para la capa transaccional. No aceptar ningun campo de identidad, precio, estado o empleado.

- [ ] **Step 4: Ejecutar las pruebas en verde**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts`

  Expected: casos de forma y normalizacion PASS; los casos de transaccion pueden permanecer pendientes hasta Task 3.

---

### Task 3: Callable Transaccional Y Disponibilidad

**Files:**
- Modify: `functions/src/createReserva.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/createReserva.test.ts`

**Interfaces:**
- Produce `createReservaHandler(request, db, now) -> Promise<CreateReservaResult>` para pruebas sin red.
- Produce `createReserva = onCall({ enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' }, handler)`.
- Consume `consumeBookingAttempt`, `reservationsOverlap`, `fromZonedTime` y `formatInTimeZone`.

- [ ] **Step 1: Completar fixtures y pruebas rojas de autenticacion**

  Agregar un `CallableRequest` sin `auth` y comprobar `HttpsError('unauthenticated')`. Agregar un request autenticado con input valido y un fake Firestore que inicialmente no tenga servicio; comprobar que la callable no crea una reserva.

- [ ] **Step 2: Agregar la prueba roja de snapshot canonico**

  Sembrar en el fake `servicios/spa-day` con `{ name: 'Spa Day', active: true, durationMin: 90 }` y un perfil/mascota propios. Comprobar que la respuesta es `{ reservaId: '...', date, timeSlot, status: 'pending' }` y que el documento creado contiene `userId` del auth, email del token, nombre del perfil/token, `serviceName: 'Spa Day'`, `durationMin: 90`, `price: null`, `status: 'pending'`, `createdBy: 'client'`, `createdAt` server-side y no contiene `empleadoId` recibido del request.

- [ ] **Step 3: Agregar pruebas rojas de ownership, cuota y limite activo**

  Cubrir mascota ajena con `permission-denied`, cuarto intento con `resource-exhausted`, reinicio despues de 15 minutos, 10 reservas `pending/confirmed` con rechazo del intento 11 y reservas `cancelled/completed` que no cuentan. Comprobar que el documento guard actualiza `attempts` tambien cuando el input es invalido o el limite activo se alcanza.

- [ ] **Step 4: Agregar pruebas rojas de disponibilidad y concurrencia**

  Sembrar una reserva activa del mismo servicio y fecha cuyo intervalo se solape con el input y exigir `failed-precondition`. Sembrar una reserva del mismo dia que termine antes del nuevo inicio y comprobar que se permite. Ejecutar dos handlers concurrentes para el mismo usuario/slot con un fake transaccional serializado y comprobar que solo uno crea la reserva.

- [ ] **Step 5: Implementar la transaccion con lecturas antes de escrituras**

  En `createReservaHandler`, obtener `uid` de `request.auth`, parsear el input sin devolver temprano antes de consumir cuota, y abrir una transaccion. Leer en la transaccion el guard, servicio, perfil/mascota y queries de reservas antes de escribir. Usar `consumeBookingAttempt` para actualizar `bookingGuards/{uid}`. Si el intento esta bloqueado, devolver el resultado de cuota sin crear reserva. Si el payload o una regla de negocio falla, escribir el guard y devolver el `HttpsError` correspondiente despues de cerrar la transaccion.

  Para el conteo activo usar `where('userId', '==', uid).where('status', 'in', ['pending', 'confirmed'])`. Para disponibilidad usar `where('serviceId', '==', serviceId).where('date', '==', date).where('status', 'in', ['pending', 'confirmed'])`, convertir los documentos a `AssignmentReservation` y usar `reservationsOverlap` con la duracion canonica.

  Crear el documento con `db.collection('reservas').doc()` y `transaction.create`. Tomar email/nombre del token o perfil; nunca copiar los campos de identidad del request. Usar `FieldValue.serverTimestamp()` para `createdAt`.

- [ ] **Step 6: Configurar App Check y exportar la callable**

  Registrar `enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true'` en las opciones de `onCall`, exportar `createReserva` desde `functions/src/index.ts` y no agregar una segunda funcion HTTP publica. Mantener el handler directo testeable con request autenticado de unit tests.

- [ ] **Step 7: Ejecutar la suite de callable en verde**

  Run: `npm --prefix functions exec vitest run src/createReserva.test.ts src/bookingQuota.test.ts`

  Expected: todos los casos de Auth, input, cuota, limite activo, catalogo, mascota, solapamiento, concurrencia y snapshot PASS.

---

### Task 4: Rules E Indices

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `tools/firestore-tests/run-rules-tests.mjs`

**Interfaces:**
- Las rules deben aceptar lectura/cancelacion existentes y negar creacion directa.
- Los indices deben soportar `userId + status` y `serviceId + date + status`.

- [ ] **Step 1: Escribir pruebas rojas de acceso directo**

  Cambiar las pruebas que actualmente esperan que Alice cree reservas validas para que esperen `assertFails`. Agregar casos de cliente escribiendo `bookingGuards/alice`, leyendo ese documento y creando una reserva con payload canonico. Todos deben fallar.

- [ ] **Step 2: Ejecutar rules y confirmar el rojo**

  Run: `npm run rules:test`

  Expected: fallan los casos que siguen permitiendo el `create` directo porque las rules actuales aun lo aceptan.

- [ ] **Step 3: Negar create y proteger guards**

  En `reservas/{resId}` cambiar `allow create` a `if false`; conservar `allow read`, cancelacion exacta, update/delete admin y la compatibilidad de `empleadoId`. Agregar:

  ```text
  match /bookingGuards/{uid} {
    allow read, write: if false;
  }
  ```

  Retirar funciones de validacion que solo servian al create directo si quedan sin referencias; no relajar ninguna regla de ownership.

- [ ] **Step 4: Agregar los indices aditivos**

  En `firestore.indexes.json`, agregar indices `reservas` con campos ascendentes `userId, status` y `serviceId, date, status`. No borrar indices existentes. Documentar en `docs/SCHEMA.md` el rollback retirando unicamente estos bloques.

- [ ] **Step 5: Ejecutar rules en verde**

  Run: `npm run rules:test`

  Expected: cliente no puede crear reservas ni tocar guards; las pruebas admin, ownership, cancelacion, mascotas, catalogo y Functions-owned collections siguen PASS.

---

### Task 5: Migracion Del Servicio Frontend

**Files:**
- Modify: `src/services/reservas.ts`
- Modify: `src/services/reservas.test.ts`
- Modify: `src/services/reservaErrors.ts`
- Modify: `src/services/reservaErrors.test.ts`
- Modify: `src/pages/Reservar.tsx`

**Interfaces:**
- `createReserva(input: CreateReservaInput) -> Promise<string>` consumira la callable y devolvera `reservaId`.
- El input del servicio no contendra `userId`, `userName`, `userEmail`, `serviceName`, `price` ni `durationMin`.

- [ ] **Step 1: Escribir la prueba roja del contrato callable**

  En `src/services/reservas.test.ts`, mockear `httpsCallable` para devolver `{ data: { reservaId: 'reservation-id', date: '2026-08-09', timeSlot: '10:00', status: 'pending' } }`. Comprobar que `createReserva` invoca `httpsCallable(firebaseFunctions, 'createReserva')` y luego envia exactamente `{ serviceId: 'spa-day', date: '2026-08-09', timeSlot: '10:00', mascotaId: null, notes: 'local QA' }`. Comprobar que no se importa ni llama `addDoc`.

- [ ] **Step 2: Ejecutar la prueba y confirmar el rojo**

  Run: `npx vitest run src/services/reservas.test.ts`

  Expected: FAIL porque `createReserva` aun usa `addDoc` y exige el input antiguo.

- [ ] **Step 3: Migrar `createReserva` a `httpsCallable`**

  Importar `httpsCallable` desde `firebase/functions`, crear el callable con `firebaseFunctions` y `createReserva`, enviar solo el contrato nuevo y mapear cualquier rechazo a `ReservaError(mapReservaError(error))`. Retirar `SlotTakenError` si ya no tiene callers.

- [ ] **Step 4: Mapear errores publicos**

  Agregar a `mapReservaError`: `resource-exhausted` para cuota/limite activo, `failed-precondition` para slot/fecha, `unauthenticated` para sesion y `permission-denied` para App Check/ownership. Mantener mensajes sin detalles internos y cubrir cada codigo en `reservaErrors.test.ts`.

- [ ] **Step 5: Ajustar `Reservar.tsx` sin cambiar el wizard**

  Cambiar la llamada para enviar `serviceId: servicio.id`, `date`, `timeSlot`, `mascotaId: mascotaId || null` y `notes: notes.trim() || null`. Retirar del objeto `userId`, `userName`, `userEmail`, `serviceName`, `price` y `durationMin`. Mantener el mensaje de exito y el estado `pending`.

- [ ] **Step 6: Ejecutar pruebas frontend en verde**

  Run: `npm run test:client`

  Expected: los tests de reservas, errores, componentes y paginas publicas PASS.

---

### Task 6: QA Local Y Regresiones De Flujo

**Files:**
- Review: `qa/tests/local-authenticated.spec.mjs`
- Review: `qa/local/run.mjs`
- Modify: `qa/tests/local-authenticated.spec.mjs` only if selectors/assertions need the callable contract.
- Test: `npm run qa:local`

**Interfaces:**
- El seed local seguira usando Admin SDK para fixtures y no necesitara App Check.
- El caso de navegador de creacion usara el wizard real, que ahora llama `createReserva`.

- [ ] **Step 1: Verificar que el seed Admin no dependa de `allow create`**

  Revisar los writes de `qa/local/run.mjs` y sus seeds; conservarlos con Admin SDK. No cambiar rules para que el seed cliente vuelva a funcionar.

- [ ] **Step 2: Agregar una asercion E2E de reserva pendiente**

  En el caso de crear/cancelar, despues de confirmar verificar que el dashboard muestra el estado `Pendiente` antes de cancelar. La prueba no debe inspeccionar `bookingGuards` ni usar rutas internas.

- [ ] **Step 3: Ejecutar el caso autenticado enfocado**

  Run: `npm run qa:local -- --grep "create and cancel a reservation"`

  Expected: login, creacion via callable, estado pendiente y cancelacion PASS contra emuladores; App Check ausente sera permitido solo por el bypass local.

- [ ] **Step 4: Ejecutar toda la QA local**

  Run: `npm run qa:local`

  Expected: los 12 casos actuales y la asercion nueva PASS, sin credenciales productivas ni llamadas externas.

---

### Task 7: ADR, Schema Y Runbook

**Files:**
- Create: `docs/adr/ADR-008-creacion-reservas-callable.md`
- Modify: `docs/SCHEMA.md`
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/Fase3.md`

**Interfaces:**
- La documentacion debe distinguir evidencia local de gates productivos.
- El ADR debe usar el formato de `technical-governance` y registrar alternativas descartadas.

- [ ] **Step 1: Escribir el ADR de decision**

  Documentar contexto, decision de callable transaccional, cuota de 3/15 minutos, limite activo 10, App Check, alternativa de mantener `addDoc`, consecuencias de costo Firestore y rollback. Estado `aceptada` solo para la decision local aprobada; no declarar production-ready.

- [ ] **Step 2: Actualizar `SCHEMA.md`**

  Marcar `reservas` como creada por Functions en el flujo cliente, documentar snapshots canonicos, `bookingGuards/{uid}`, indices nuevos y rollback aditivo. Mantener compatibilidad de documentos existentes y no inventar una migracion.

- [ ] **Step 3: Actualizar `STACK.md` y `Fase3.md`**

  Registrar que App Check, callable, cuota y disponibilidad fueron verificados localmente. Mantener pendientes App Check Console, Billing/Blaze, budget, Secret Manager, deploy, rollback operativo y browser QA de produccion.

- [ ] **Step 4: Actualizar `RUNBOOK.md`**

  Documentar `npm run rules:test`, `npm --prefix functions test`, `npm run qa:local`, el bypass exclusivo del emulador, el orden productivo y el rollback. No incluir valores de secretos ni comandos productivos ejecutables sin autorizacion.

- [ ] **Step 5: Revisar documentacion**

  Run: `git diff --check -- docs/adr/ADR-008-creacion-reservas-callable.md docs/SCHEMA.md docs/STACK.md docs/RUNBOOK.md docs/Fase3.md`

  Expected: sin errores de whitespace y sin afirmar que produccion esta configurada.

---

### Task 8: Verificacion Final Y Autocritica

**Files:**
- Verify: `functions/src/bookingQuota.ts`, `functions/src/createReserva.ts`, `firestore.rules`, `firestore.indexes.json`
- Verify: `src/services/reservas.ts`, `src/pages/Reservar.tsx`, `qa/tests/local-authenticated.spec.mjs`
- Verify: ADR, schema, stack, runbook y fase 3.

- [ ] **Step 1: Ejecutar toda la regresion automatizada**

  Run: `npm run test:client`
  Run: `npm run rules:test`
  Run: `npm --prefix functions test`
  Run: `npx tsc --noEmit`
  Run: `npm run build`
  Run: `npm --prefix functions run typecheck`
  Run: `npm --prefix functions run build`

  Expected: todos los comandos exit code `0`; los skips de Functions deben seguir siendo exactamente los casos documentados.

- [ ] **Step 2: Ejecutar browser QA local**

  Run: `npm run qa:local`

  Expected: todos los casos PASS contra emuladores, incluyendo crear/cancelar por callable, sin App Check productivo ni servicios externos.

- [ ] **Step 3: Auditar seguridad del diff**

  Revisar que no haya `.env.local`, service accounts, API keys, emails reales de QA ni logs de tokens rastreados. Confirmar que `bookingGuards` no tiene acceso cliente, que la callable no copia identidad del payload y que errores/Resend no exponen secretos.

- [ ] **Step 4: Auditar cuota y concurrencia**

  Confirmar con tests que el cuarto intento se rechaza, la ventana reinicia, reservas canceladas/completadas no cuentan, el limite activo es 10 y solo una de dos solicitudes solapadas crea la reserva.

- [ ] **Step 5: Ejecutar preflight y revisar diff**

  Run: `npm run release:preflight`
  Run: `git diff --check`
  Run: `git status --short`

  Expected: preflight `PASS_WITH_WARNINGS` solo por gates externos o advisories transitorios documentados; no debe ejecutar deploy ni leer secretos.

## Verificacion Del Plan Contra La Especificacion

- Callable, input minimo y snapshots canonicos: Tasks 2 y 3.
- Guard de 3 intentos/15 minutos y limite de 10 activas: Tasks 1 y 3.
- App Check productivo con bypass de emulador: Task 3 y Task 6.
- Solapamiento, fecha futura y disponibilidad transaccional: Task 3.
- Rules e indices aditivos con rollback: Task 4.
- Migracion del frontend y errores publicos: Task 5.
- QA autenticada y regresiones: Task 6 y Task 8.
- ADR, costo, operacion y rollback: Task 7.
- No secretos, no deploy, no commits automaticos: Global Constraints y Task 8.
