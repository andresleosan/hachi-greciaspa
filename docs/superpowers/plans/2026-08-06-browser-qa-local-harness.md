# Harness Local De Browser QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task with checkpoints. Steps use checkbox syntax for tracking.

**Goal:** Ejecutar una corrida reproducible de Playwright contra Auth, Firestore y Functions Emulator que cubra login, empleados, agenda, cancelación y reagendado sin credenciales productivas.

**Architecture:** Un orquestador Node arranca los emuladores, espera sus puertos, siembra servicios/empleados/usuarios/reservas locales, levanta Vite con configuración Firebase dummy y ejecuta una configuración Playwright separada. Los helpers de procesos y puertos serán pequeños y testeables; la suite E2E leerá credenciales y fechas únicamente desde variables del proceso.

**Tech Stack:** Node.js ESM, `child_process`, Firebase Admin SDK, Firebase Emulator Suite, Vite, `@playwright/test`, Vitest/Node test runner existente.

## Global Constraints

- La corrida solo podrá conectarse a `127.0.0.1` y a los emuladores definidos en `firebase.json`.
- No se leerán `.env`, `.env.local`, cuentas de servicio ni secretos productivos.
- No se ejecutarán `firebase deploy`, `gcloud`, Vercel CLI, Resend ni llamadas externas.
- Las credenciales de QA se generarán en runtime y no se escribirán en archivos versionados, reportes ni logs.
- La suite pública conservará su configuración y su `baseURL` actuales.
- La limpieza debe ejecutarse en éxito, fallo, interrupción y error de setup.
- Las pruebas usarán roles, labels y texto accesible antes que clases CSS o sleeps arbitrarios.
- No se modificarán reglas Firestore ni lógica de producción para hacer pasar la QA.
- No se crearán commits automáticos; el operador decidirá cuándo integrar los cambios.

---

## Mapa De Archivos

### Helpers y orquestación

- Crear `qa/local/processes.mjs`: espera de puertos, spawn de procesos y terminación de árboles de procesos.
- Crear `qa/local/processes.test.mjs`: pruebas unitarias de timeout, éxito de puerto y limpieza segura.
- Crear `qa/local/seed.mjs`: crea usuarios, claims, perfiles y reservas solo en emuladores.
- Crear `qa/local/seed.test.mjs`: pruebas unitarias de credenciales y fechas deterministas.
- Crear `qa/local/run.test.mjs`: prueba de composición y limpieza del orquestador con procesos falsos.
- Crear `qa/local/run.mjs`: compone build de Functions, emuladores, seeds, Vite y Playwright.

### Playwright

- Crear `qa/playwright.local.config.mjs`: configuración local separada, reporte `qa/reports/local` y `QA_BASE_URL` obligatorio.
- Crear `qa/tests/local-authenticated.spec.mjs`: casos E2E de autenticación, empleados, agenda, cancelación y reagendado.

### Proyecto y documentación

- Modificar `package.json`: agregar `qa:local` sin dependencias nuevas.
- Modificar `.gitignore`: ignorar reportes/artefactos locales del harness sin ocultar fuentes ni secretos.
- Modificar `docs/RUNBOOK.md`: documentar prerrequisitos, orden de ejecución, alcance y resultado real.
- Modificar `docs/STACK.md`: registrar que el harness local existe y qué gates externos no cubre.

---

### Task 1: Helpers De Procesos Con Pruebas Unitarias

**Files:**
- Create: `qa/local/processes.test.mjs`
- Create: `qa/local/processes.mjs`

**Interfaces:**
- Produce `waitForPort({ host, port, timeoutMs, intervalMs }) -> Promise<void>`.
- Produce `spawnProcess(command, args, { cwd, env, label }) -> ChildProcess`.
- Produce `stopProcessTree(child, { label }) -> Promise<void>`; debe tolerar procesos ya terminados.
- Produce `runCommand(command, args, options) -> Promise<{ exitCode, stdout, stderr }>`.

- [ ] **Step 1: Escribir la prueba que verifica un puerto disponible**

  Crear un servidor TCP efímero en el test, llamar `waitForPort` y comprobar que resuelve; cerrar
  el servidor en `finally`.

- [ ] **Step 2: Ejecutar la prueba y confirmar el estado rojo**

  Run: `node --test qa/local/processes.test.mjs`

  Expected: FAIL porque `qa/local/processes.mjs` todavía no existe.

- [ ] **Step 3: Escribir la prueba de timeout**

  Usar un puerto local libre y `timeoutMs` corto; comprobar rechazo con un mensaje que incluya el
  host y puerto, sin esperar más del timeout configurado.

- [ ] **Step 4: Implementar los helpers mínimos**

  Usar `net.createConnection` para `waitForPort`, `spawn` con `shell: false` para procesos y en
  Windows usar `taskkill /pid <pid> /T /F` para cerrar árboles; en otras plataformas usar
  `child.kill('SIGTERM')` y esperar `close`.

- [ ] **Step 5: Ejecutar las pruebas unitarias en verde**

  Run: `node --test qa/local/processes.test.mjs`

  Expected: todas las pruebas PASS, incluido el timeout esperado capturado como aserción.

---

### Task 2: Seed Determinista Exclusivo Del Emulator

**Files:**
- Create: `qa/local/seed.mjs`
- Create: `qa/local/seed.test.mjs`

**Interfaces:**
- Produce `createQaUsers({ projectId, runId }) -> Promise<{ admin, client }>`.
- Produce `seedQaBookings({ db, users, projectId, runId }) -> Promise<{ agendaDate, unassignedDate, rescheduleDate, employeeId }>`.
- Produce `buildQaDates(now = new Date()) -> { agendaDate, unassignedDate, rescheduleDate }`.
- Produce `buildQaCredentials(runId) -> { adminEmail, adminPassword, clientEmail, clientPassword }`.

- [ ] **Step 1: Escribir pruebas de credenciales y fechas locales**

  Verificar que `buildQaCredentials('abc')` genera emails `example.test`, passwords no vacíos y
  ningún valor contiene una ruta de archivo o una clave de servicio. Verificar que
  `buildQaDates(new Date('2026-08-06T12:00:00Z'))` devuelve fechas ISO `YYYY-MM-DD` dentro de los
  próximos 14 días y futuras respecto del día base.

- [ ] **Step 2: Ejecutar el test y confirmar el estado rojo**

  Run: `node --test qa/local/seed.test.mjs`

  Expected: FAIL porque `qa/local/seed.mjs` todavía no existe.

- [ ] **Step 3: Implementar la creación de usuarios emulados**

  Inicializar Firebase Admin con `projectId`, `FIREBASE_AUTH_EMULATOR_HOST` y
  `FIRESTORE_EMULATOR_HOST`; crear un usuario admin y uno cliente con passwords generadas,
  asignar claim `{ admin: true }` solo al admin y escribir perfiles `users/{uid}` con `role` y
  `displayName`. No aceptar rutas de service account en esta interfaz.

- [ ] **Step 4: Implementar la seed de reservas**

  Usar `buildQaDates` y crear reservas con `Timestamp.now()`, `status: 'pending'`, `createdBy: 'admin'`, datos del cliente
  y `notes` distintivas (`QA_AGENDA_ASSIGNED`, `QA_AGENDA_UNASSIGNED`, `QA_REAGENDADO`). Crear una
  reserva con `empleadoId: 'harold-salcedo'` y otra con `empleadoId: null` en la misma fecha de
  agenda; crear la de reagendado en un slot futuro libre. Mantener las fechas dentro de los
  próximos 14 días que el wizard de reserva muestra.

- [ ] **Step 5: Ejecutar las pruebas unitarias del seed**

  Run: `node --test qa/local/seed.test.mjs`

  Expected: PASS sin iniciar Firebase real ni escribir archivos.

---

### Task 3: Orquestador Y Configuración Playwright Local

**Files:**
- Create: `qa/local/run.mjs`
- Create: `qa/local/run.test.mjs`
- Create: `qa/playwright.local.config.mjs`
- Modify: `package.json` (script `qa:local`)
- Modify: `.gitignore`

**Interfaces:**
- `npm run qa:local` será la única orden pública del harness.
- El proceso Playwright recibirá `QA_BASE_URL`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`,
  `QA_CLIENT_EMAIL`, `QA_CLIENT_PASSWORD`, `QA_AGENDA_DATE`, `QA_UNASSIGNED_DATE` y
  `QA_RESCHEDULE_DATE` solo en su entorno de proceso.

- [ ] **Step 1: Escribir una prueba de composición con procesos falsos**

  Probar que el orquestador registra procesos iniciados y llama la limpieza cuando una fase
  falla, usando inyección de `runCommand`, `startProcess` y `stopProcessTree`; no arrancar
  emuladores reales en esta prueba.

- [ ] **Step 2: Ejecutar la prueba y confirmar el estado rojo**

  Run: `node --test qa/local/run.test.mjs`

  Expected: FAIL porque `qa/local/run.mjs` aún no exporta la composición testeable.

- [ ] **Step 3: Implementar el arranque seguro**

  En `run.mjs`, verificar que `process.env.FIREBASE_SERVICE_ACCOUNT` no esté siendo usado para la
  corrida local, construir el entorno dummy de Vite, ejecutar `npm --prefix functions run build`,
  arrancar `firebase emulators:start --only auth,firestore,functions --project hachi-greciaspa`,
  esperar `9099`, `8080` y `5001`, ejecutar `seed-services.mjs --emulator` y
  `seed-employees.mjs --emulator`, y luego llamar al seed de usuarios/reservas.

- [ ] **Step 4: Implementar Vite y Playwright**

  Arrancar `npm run dev -- --host 127.0.0.1`, esperar el puerto Vite asignado, ejecutar
  `npx playwright test --config=qa/playwright.local.config.mjs`, propagar el exit code y siempre
  detener Vite y los emuladores en `finally`. Reenviar a Playwright los argumentos posteriores a
  `--` para permitir corridas enfocadas como `npm run qa:local -- --grep login`.

- [ ] **Step 5: Configurar el proyecto Playwright local**

  Usar `testDir: './tests'`, `baseURL` desde `QA_BASE_URL` y fallar si falta esa variable; mantener
  un reporte HTML en `reports/local`, screenshots/videos/traces solo en fallos y `workers: 1` para
  que los casos compartan el emulador determinista.

- [ ] **Step 6: Ejecutar la prueba del orquestador**

  Run: `node --test qa/local/run.test.mjs`

  Expected: PASS, con limpieza comprobada cuando una fase simulada lanza un error.

---

### Task 4: Suite E2E Autenticada

**Files:**
- Create: `qa/tests/local-authenticated.spec.mjs`

**Interfaces:**
- Consumirá exclusivamente las variables de proceso entregadas por `qa/local/run.mjs`.
- No creará usuarios desde el navegador; el setup Admin SDK será la única autoridad de fixtures.

- [ ] **Step 1: Escribir el caso de login por rol**

  Añadir casos separados para admin y cliente: navegar a `/login?next=/dashboard`, llenar labels
  `Correo` y `Contraseña`, pulsar `Entrar`, comprobar URL `/dashboard` y el texto exacto
  `Administrador` o `Cliente`.

- [ ] **Step 2: Ejecutar el caso y confirmar el estado rojo**

  Run: `npm run qa:local -- --grep "login"`

  Expected: FAIL si el orquestador todavía no está operativo o si el caso no existe; la causa
  debe ser del harness, no un skip por credenciales.

- [ ] **Step 3: Añadir el caso CRUD de empleados**

  Desde `/dashboard/empleados`, crear `QA Terapeuta`, elegir un servicio y guardar; localizar la
  fila por texto, editar el nombre a `QA Terapeuta Editado`, recargar y verificar persistencia;
  desactivar aceptando el diálogo de confirmación y comprobar estado `Inactivo` después de otra
  recarga.

- [ ] **Step 4: Añadir el caso de agenda y filtros**

  Iniciar sesión como admin, abrir `/dashboard/agenda`, elegir `QA_AGENDA_DATE`, esperar que
  desaparezca `Cargando agenda...`, comprobar `Agenda diaria` y `Sin terapeuta asignado`; cambiar
  `Terapeuta` a `Sin terapeuta` y luego a `Harold Salcedo`, verificando que el resumen y la reserva
  visible cambian.

- [ ] **Step 5: Añadir el caso de creación y cancelación**

  Iniciar sesión como cliente, abrir `/reservar`, seleccionar `Spa Day`, una fecha de los próximos
  14 días y el primer slot disponible, avanzar hasta `Confirmación`, pulsar `Confirmar reserva`,
  ir al dashboard, aceptar el diálogo de `Cancelar reserva` y verificar estado `Cancelada`.

- [ ] **Step 6: Añadir el caso de reagendado**

  Iniciar sesión como cliente, localizar la tarjeta que contiene `QA_REAGENDADO`, pulsar
  `Reagendar`, llenar `Nueva fecha` con `QA_RESCHEDULE_DATE` y `Nuevo horario` con `16:00`,
  guardar y verificar que la tarjeta muestra la nueva fecha/hora sin error visible.

- [ ] **Step 7: Ejecutar la suite completa local**

  Run: `npm run qa:local`

  Expected: casos autenticados PASS, cero `test.skip` por credenciales, reporte en
  `qa/reports/local/index.html` y exit code `0`.

---

### Task 5: Documentación Y Limpieza De Artefactos

**Files:**
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/STACK.md`
- Modify: `.gitignore`

- [ ] **Step 1: Documentar el comando y prerrequisitos**

  Añadir `npm run qa:local`, JDK 21, puertos `9099/8080/5001` y el hecho de que el harness no lee
  secretos ni toca producción.

- [ ] **Step 2: Documentar el alcance honesto**

  Registrar qué flujos cubre la suite y conservar como pendientes los gates de producción, DNS,
  Secret Manager, Billing/Blaze, rollback y autorización.

- [ ] **Step 3: Ignorar solo artefactos regenerables**

  Ignorar `qa/reports/local/`, `qa/test-results-local/` y logs temporales del harness; no ignorar
  archivos fuente, fixtures o cualquier archivo `.env.example`.

- [ ] **Step 4: Revisar la documentación**

  Run: `git diff --check -- docs/RUNBOOK.md docs/STACK.md .gitignore`

  Expected: sin errores de whitespace y sin afirmar que QA de producción está completado.

---

### Task 6: Verificación Final Y Autocrítica

**Files:**
- Verify: `qa/local/*.mjs`, `qa/playwright.local.config.mjs`, `qa/tests/local-authenticated.spec.mjs`
- Verify: `docs/RUNBOOK.md`, `docs/STACK.md`, `package.json`, `.gitignore`

- [ ] **Step 1: Ejecutar pruebas unitarias del harness**

  Run: `node --test qa/local/*.test.mjs`

  Expected: PASS sin warnings de secretos o conexiones externas.

- [ ] **Step 2: Ejecutar browser QA local completo**

  Run: `npm run qa:local`

  Expected: todos los casos autenticados PASS y reporte HTML generado.

- [ ] **Step 3: Ejecutar regresión del proyecto**

  Run: `npm run test:client`
  Run: `npm run rules:test`
  Run: `npm --prefix functions test`
  Run: `npx tsc --noEmit`
  Run: `npm run build`
  Run: `npm --prefix functions run typecheck`
  Run: `npm --prefix functions run build`

  Expected: todos los comandos terminan con exit code `0`; Functions conserva los skips
  preexistentes documentados.

- [ ] **Step 4: Ejecutar revisión de seguridad del diff**

  Comprobar que no aparecen `.env.local`, service accounts, passwords de QA ni URLs externas en
  archivos rastreados; revisar `git diff --check` y `git status --short`.

- [ ] **Step 5: Actualizar evidencia sin cerrar gates externos**

  Registrar el resultado real de `npm run qa:local` en `docs/RUNBOOK.md` y mantener browser QA de
  producción, Resend, Billing/Blaze, rollback y autorización como pendientes.

## Verificación Del Plan Contra La Especificación

- Orquestación local: Tasks 1 y 3.
- Datos deterministas y credenciales efímeras: Task 2.
- Login, empleados, agenda, cancelación y reagendado: Task 4.
- Errores, limpieza y artefactos: Tasks 1, 3 y 5.
- Criterios de aceptación y evidencia honesta: Tasks 5 y 6.
- Fuera de alcance y seguridad: Global Constraints y Task 6.
