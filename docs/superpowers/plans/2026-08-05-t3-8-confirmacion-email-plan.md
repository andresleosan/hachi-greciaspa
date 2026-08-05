# T3.8 Confirmación Inmediata De Cita Por Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar una confirmación inmediata por email al crear una reserva, manteniendo la reserva `pending` aunque el proveedor falle y evitando reenvíos por actualizaciones o ejecuciones duplicadas.

**Architecture:** Se conservará `onReservaCreated` para asignación automática y se agregará `onReservaConfirmationCreated` como trigger Firestore independiente sobre `reservas/{reservaId}`. El nuevo flujo persistirá su propia máquina de estados en `confirmaciones/{reservaId}`, reutilizará el adaptador Resend existente y usará el mismo lock transaccional, backoff acotado y clave de idempotencia externa que el flujo de recordatorios.

**Tech Stack:** Firebase Functions v2, Firebase Admin Firestore, TypeScript 6, Vitest 4, Resend, Firebase Rules Emulator.

## Global Constraints

- La reserva se crea con `status: 'pending'` y no cambia de estado por un fallo del email.
- `confirmaciones/{reservaId}` solo puede ser escrito por Functions mediante Admin SDK; guest/client no pueden leerlo ni escribirlo.
- La clave externa de Resend será `confirmation-${encodeURIComponent(reservaId)}`.
- Los fallos retryable son timeout, red, HTTP 429 y HTTP 5xx; el máximo operativo es de tres intentos con backoff acotado.
- Los fallos permanentes y los datos inválidos se registran como `failed` sin reintento ni modificación de la reserva.
- `RESEND_API_KEY` solo se obtiene mediante Firebase Secret Manager en la Function; no se agrega ninguna variable `VITE_*`.
- El email debe escapar todo valor dinámico y enlazar a `https://hachi-greciaspa.web.app/dashboard`.
- No se configuran dominio, DNS, Secret Manager, Billing/Blaze ni producción en este plan.
- No se ejecuta `npm audit fix --force`.

---

### Task 1: Agregar contrato de email y template de confirmación

**Files:**
- Create: `functions/src/templates/html.ts`
- Create: `functions/src/templates/confirmation.ts`
- Modify: `functions/src/templates/reminder.ts`
- Modify: `functions/src/types.ts`
- Modify: `functions/src/email/resend.ts`
- Test: `functions/src/email/resend.test.ts`

**Interfaces:**
- Consumes: `ReminderEmailInput`, `EmailProvider` y `renderReminderHtml` existentes.
- Produces: `ConfirmationEmailInput`, `ConfirmationEmailProvider`, `TransactionalEmailProvider` y `renderConfirmationHtml`.

- [ ] **Step 1: Escribir los tests de template y provider que inicialmente fallen**

Agregar a `functions/src/email/resend.test.ts` un input tipado:

```ts
const confirmationInput: ConfirmationEmailInput = {
  to: 'cliente@example.com',
  recipientName: 'Ana',
  serviceName: 'Baño y corte',
  date: '15 de enero de 2026',
  timeSlot: '10:30',
  idempotencyKey: 'confirmation-reservation-123',
}
```

Cubrir estos comportamientos concretos:

```ts
it('renders confirmation details and the dashboard destination', () => {
  const html = renderConfirmationHtml(confirmationInput)
  expect(html).toContain('Ana')
  expect(html).toContain('Baño y corte')
  expect(html).toContain('15 de enero de 2026')
  expect(html).toContain('10:30')
  expect(html).toContain('https://hachi-greciaspa.web.app/dashboard')
})

it('escapes confirmation values before rendering HTML', () => {
  const html = renderConfirmationHtml({
    ...confirmationInput,
    recipientName: '<img src=x onerror="alert(1)">',
    serviceName: '<script>alert(1)</script>',
  })
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<img')
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
})

it('sends confirmation email with the deterministic idempotency key', async () => {
  resendMocks.send.mockResolvedValue({ data: { id: 'confirmation-msg-1' }, error: null })
  const provider = createResendProvider('resend_test_secret')
  await expect(provider.sendConfirmationEmail(confirmationInput)).resolves.toEqual({
    providerMessageId: 'confirmation-msg-1',
  })
  expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({
    subject: 'Confirmación de tu cita en Hachi & Grecia Spa',
    headers: { 'Idempotency-Key': confirmationInput.idempotencyKey },
  }))
})
```

Reutilizar las pruebas existentes de timeout, 429/5xx, input inválido, secreto vacío y supresión de logs para `sendConfirmationEmail`, sin duplicar una segunda clasificación de errores.

- [ ] **Step 2: Ejecutar los tests para confirmar el estado rojo**

Run: `npm --prefix functions test -- src/email/resend.test.ts`

Expected: FAIL porque todavía no existen `ConfirmationEmailInput`, `renderConfirmationHtml` ni `sendConfirmationEmail`.

- [ ] **Step 3: Implementar el contrato y el template mínimo**

En `functions/src/types.ts`, agregar:

```ts
export interface ConfirmationEmailInput extends ReminderEmailInput {}

export interface ConfirmationEmailProvider {
  sendConfirmationEmail(
    input: ConfirmationEmailInput,
  ): Promise<{ providerMessageId?: string }>
}

export type TransactionalEmailProvider = EmailProvider & ConfirmationEmailProvider
```

Mover `escapeHtml` a `functions/src/templates/html.ts`, exportarlo y hacer que `reminder.ts` lo importe. Crear `renderConfirmationHtml(input)` con el mismo conjunto de variables y el enlace `/dashboard`, pero con subject/contenido de confirmación. En `resend.ts`, conservar la validación y clasificación de errores existentes, hacer que `createResendProvider` retorne `TransactionalEmailProvider` y añadir `sendConfirmationEmail` con `renderConfirmationHtml(input)`.

- [ ] **Step 4: Ejecutar los tests verdes del contrato**

Run: `npm --prefix functions test -- src/email/resend.test.ts`

Expected: PASS, incluyendo las pruebas preexistentes de recordatorios y las nuevas de confirmación.

- [ ] **Step 5: Commit**

```bash
git add functions/src/types.ts functions/src/templates/html.ts functions/src/templates/reminder.ts functions/src/templates/confirmation.ts functions/src/email/resend.ts functions/src/email/resend.test.ts
git commit -m "feat: add booking confirmation email contract"
```

---

### Task 2: Implementar estado e idempotencia de confirmaciones

**Files:**
- Create: `functions/src/confirmations.ts`
- Test: `functions/src/confirmations.test.ts`
- Modify: `functions/src/types.ts` si las interfaces de estado aún no están junto a los tipos compartidos.

**Interfaces:**
- Consumes: `ConfirmationEmailProvider`, `ConfirmationEmailInput`, `confirmationDocId` de esta tarea y `canRetry`/`getRetryDelayMs` de `functions/src/reminders.ts`.
- Produces: `ConfirmationRecord`, `ConfirmationStore`, `runConfirmationOrchestration` y `ConfirmationRunResult` para el trigger de la Task 3.

La interfaz del store será:

```ts
export interface AcquireConfirmationLockInput {
  reservaId: string
  now: Date
  lockUntil: Date
  nowTimestamp: Timestamp
  lockUntilTimestamp: Timestamp
}

export type ConfirmationLockResult =
  | { status: 'acquired'; processingToken: string; attempts: number }
  | { status: 'sent' }
  | { status: 'locked' }
  | { status: 'backoff'; nextAttemptAt: Timestamp }
  | { status: 'exhausted' }

export interface ConfirmationStore {
  acquireConfirmationLock(input: AcquireConfirmationLockInput): Promise<ConfirmationLockResult>
  updateConfirmation(
    id: string,
    patch: Partial<ConfirmationRecord>,
    processingToken: string,
  ): Promise<boolean>
}
```

- [ ] **Step 1: Escribir el store en memoria y tests rojos**

En `confirmations.test.ts`, crear una `MemoryConfirmationStore` con `records`, `updates`, locks y tokens, siguiendo el patrón de `MemoryReminderStore` en `scheduledSendReminders.test.ts`. Definir la reserva base:

```ts
const reservation = {
  id: 'reservation-1',
  status: 'pending' as const,
  userEmail: 'cliente@example.com',
  userName: 'Ana',
  serviceName: 'Baño y corte',
  date: '2026-08-20',
  timeSlot: '10:30',
}
```

Escribir tests para:

```ts
it('sends a valid confirmation and persists sent state', async () => {})
it('does not call the provider when the confirmation is already sent', async () => {})
it('does not call the provider while another lock or backoff is active', async () => {})
it('records a retryable provider failure with bounded nextAttemptAt', async () => {})
it('stops after three attempts and records a permanent failure', async () => {})
it('rejects invalid data without calling the provider or changing the reservation', async () => {})
it('escapes and forwards the exact reservation summary to the provider', async () => {})
```

Los tests deben verificar que el patch nunca contenga `undefined`, que `lastError` sea una categoría fija como `Email provider retryable failure` o `Invalid confirmation data`, y que la reserva de entrada no sea modificada.

- [ ] **Step 2: Ejecutar los tests rojos**

Run: `npm --prefix functions test -- src/confirmations.test.ts`

Expected: FAIL porque no existe el módulo de confirmaciones.

- [ ] **Step 3: Implementar el contrato y la máquina de estados**

Definir en `confirmations.ts`:

```ts
export function confirmationDocId(reservaId: string): string {
  return `confirmation-${encodeURIComponent(reservaId)}`
}

export type ConfirmationRunResult =
  | { status: 'sent' }
  | { status: 'failed' }
  | { status: 'retry'; nextAttemptAt: Date }
  | { status: 'skipped' }
```

Implementar `runConfirmationOrchestration({ store, secret, reservation, now, providerFactory })`. Debe validar `id`, email con el patrón existente, nombre/servicio no vacíos, fecha `YYYY-MM-DD` válida y hora `HH:mm` válida. Debe adquirir un lock con `attempts < 3`, enviar una sola vez con `confirmationDocId(reservation.id)` y persistir `sent` o `failed` conservando el token del lock.

En fallo retryable, persistir `failed`, `nextAttemptAt = now + getRetryDelayMs(attempts)` y devolver `{ status: 'retry' }`; en fallo permanente devolver `{ status: 'failed' }`. Al encontrar `sent`, lock, backoff o `exhausted`, devolver el estado correspondiente sin llamar a Resend. No lanzar errores con cuerpos de proveedor, emails, API keys o nombres de cliente.

- [ ] **Step 4: Ejecutar tests verdes y typecheck de Functions**

Run: `npm --prefix functions test -- src/confirmations.test.ts src/email/resend.test.ts`

Expected: PASS.

Run: `npm --prefix functions run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add functions/src/confirmations.ts functions/src/confirmations.test.ts functions/src/types.ts
git commit -m "feat: add idempotent booking confirmation state"
```

---

### Task 3: Conectar el trigger Firestore, reglas y documentación de datos

**Files:**
- Create: `functions/src/onReservaConfirmationCreated.ts`
- Test: `functions/src/onReservaConfirmationCreated.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/confirmations.ts`
- Modify: `firestore.rules`
- Modify: `tools/firestore-tests/run-rules-tests.mjs`
- Modify: `docs/SCHEMA.md`
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`

**Interfaces:**
- Consumes: `runConfirmationOrchestration`, `createResendProvider`, `ConfirmationStore` y `ConfirmationRecord`.
- Produces: export público `onReservaConfirmationCreated` y handler testeable `onReservaConfirmationCreatedHandler`.

- [ ] **Step 1: Escribir tests rojos del handler y del acceso Firestore**

En `onReservaConfirmationCreated.test.ts`, probar que el handler:

```ts
it('passes the created reservation snapshot to confirmation orchestration', async () => {})
it('returns without sending when the event has no data', async () => {})
it('does not affect assignment behavior', async () => {})
it('rethrows only a sanitized retry signal after a retryable delivery failure', async () => {})
```

En `tools/firestore-tests/run-rules-tests.mjs`, agregar casos junto a `recordatorios`:

```js
await test('guest cannot read confirmaciones', () => assertFails(guestDb.collection('confirmaciones').doc('confirmation-r1').get()))
await test('client cannot read confirmaciones', () => assertFails(aliceDb.collection('confirmaciones').doc('confirmation-r1').get()))
await test('client cannot write confirmaciones', () => assertFails(aliceDb.collection('confirmaciones').doc('confirmation-r1').set({ status: 'sent' })))
await test('admin can read confirmaciones', () => assertSucceeds(bobAdminDb.collection('confirmaciones').doc('confirmation-r1').get()))
```

- [ ] **Step 2: Ejecutar las pruebas rojas**

Run: `npm --prefix functions test -- src/onReservaConfirmationCreated.test.ts`

Expected: FAIL porque aún no existe el handler.

Run: `npm run rules:test`

Expected: FAIL solo por los nuevos casos hasta agregar la regla y la implementación.

- [ ] **Step 3: Implementar el trigger y el store Firestore**

Crear `onReservaConfirmationCreated.ts` con:

```ts
const resendApiKey = defineSecret('RESEND_API_KEY')

export const onReservaConfirmationCreated = onDocumentCreated(
  {
    document: 'reservas/{reservaId}',
    retry: true,
    secrets: [resendApiKey],
  },
  async (event) => {
    await onReservaConfirmationCreatedHandler(
      event,
      getFirestore(),
      resendApiKey.value(),
    )
  },
)
```

El handler debe ignorar eventos sin snapshot, normalizar `event.params.reservaId`, ejecutar `runConfirmationOrchestration` y lanzar solo un error genérico sanitizado cuando el resultado sea `retry`; los resultados `sent`, `failed`, `skipped` y `exhausted` deben completar la invocación sin propagar detalles del proveedor. El store Firestore debe crear el documento determinístico en `confirmaciones`, adquirir lock con transacción y aplicar patches solo si coincide `processingToken`, igual que `createFirestoreReminderStore`.

La firma testeable será:

```ts
export async function onReservaConfirmationCreatedHandler(
  event: { params: { reservaId: string }; data?: { data(): unknown } },
  db: Firestore,
  secret: string,
  providerFactory?: (secret: string) => ConfirmationEmailProvider,
): Promise<void>
```

Agregar en `index.ts`:

```ts
export { onReservaConfirmationCreated } from './onReservaConfirmationCreated.js'
```

Agregar a `firestore.rules`:

```text
match /confirmaciones/{confirmationId} {
  allow read: if isAdmin();
  allow write: if false;
}
```

No agregar índices: el acceso es por ID determinístico.

- [ ] **Step 4: Documentar el contrato operativo y de rollback**

En `docs/SCHEMA.md`, agregar `confirmaciones/{id}` con todos los campos, lifecycle, ownership y rollback aditivo. En `docs/STACK.md`, indicar que la confirmación inmediata comparte Resend/Secret Manager con recordatorios, no está configurada ni desplegada y mantiene el baseline de costo de 900 emails/mes. En `docs/RUNBOOK.md`, documentar que una falla de email no cancela la reserva y que la contención consiste en deshabilitar el trigger sin borrar `confirmaciones`.

- [ ] **Step 5: Ejecutar reglas, tests y build de Functions**

Run: `npm run rules:test`

Expected: 60 casos PASS, equivalentes a los 56 existentes más los cuatro casos de `confirmaciones`.

Run: `npm --prefix functions test`

Expected: todos los tests de Functions PASS, con los skips existentes sin aumentar.

Run: `npm --prefix functions run build`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add functions/src/index.ts functions/src/onReservaConfirmationCreated.ts functions/src/onReservaConfirmationCreated.test.ts functions/src/confirmations.ts firestore.rules tools/firestore-tests/run-rules-tests.mjs docs/SCHEMA.md docs/STACK.md docs/RUNBOOK.md
git commit -m "feat: send idempotent booking confirmations"
```

---

### Task 4: Cerrar verificación, documentación de fase y evidencia

**Files:**
- Modify: `docs/Fase3.md`
- Modify: `docs/release-preflight.md` (generado por el comando)

**Interfaces:**
- Consumes: la implementación y tests de Tasks 1-3.
- Produces: evidencia reproducible y estado T3.8 actualizado sin marcar como configurados los gates externos.

- [ ] **Step 1: Actualizar el AC local de T3.8**

Marcar como completos en `docs/Fase3.md` el trigger, email, idempotencia y variables del template. Mantener sin marcar cualquier casilla que requiera dominio, secreto, Billing/Blaze, despliegue o prueba de entrega externa. Añadir una nota de verificación local que enumere los comandos ejecutados y deje explícito que browser QA y producción siguen bloqueados.

- [ ] **Step 2: Ejecutar la matriz completa**

Run: `npm test`

Expected: 60 rules passed y todos los tests de Functions PASS, con los 2 skips existentes y sin fallos nuevos.

Run: `npm run test:client`

Expected: todos los tests cliente PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0.

Run: `npm run release:preflight`

Expected: `PASS_WITH_WARNINGS`; los únicos warnings aceptados son advisories documentados y gates operativos no autorizados.

- [ ] **Step 3: Ejecutar revisión de seguridad del diff**

Run: `git diff HEAD~3..HEAD --check`

Expected: sin errores.

Revisar manualmente que el diff no agregue secretos, llamadas a Resend desde `src/`, logs con emails o cuerpos del proveedor, reglas de cliente para escribir `confirmaciones`, ni reintentos sin límite.

- [ ] **Step 4: Versionar evidencia y push**

```bash
git add docs/Fase3.md docs/release-preflight.md
git commit -m "docs: close booking confirmation verification"
git push origin main
```

Verificar después del push:

```bash
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: working tree limpio y el hash local coincide con `origin/main`.
