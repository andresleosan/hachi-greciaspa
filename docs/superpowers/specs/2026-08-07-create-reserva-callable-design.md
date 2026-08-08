# Diseno: creacion de reservas mediante callable

Fecha: 2026-08-07
Estado: en revision del operador

## Contexto

La app crea reservas con un `addDoc` directo desde el navegador. Aunque las
rules ya limitan ownership y snapshots basicos, el cliente aun puede provocar
muchas reservas propias, controlar parte del snapshot y competir por un mismo
slot. El trigger de email tambien depende de esos documentos.

La correccion debe preservar el flujo visual actual, cerrar la autoridad de
creacion en backend y no ejecutar ningun cambio en produccion durante esta
tarea.

## Objetivos

- Crear reservas solamente mediante una callable autenticada.
- Exigir App Check en produccion y omitirlo solo en emuladores.
- Limitar a 3 intentos por usuario en una ventana de 15 minutos.
- Contar como intento toda invocacion que pase Auth y App Check, incluso si el
  payload es invalido o excede otra cuota.
- Limitar a 10 reservas activas por usuario. Solo `pending` y `confirmed`
  cuentan; `cancelled` y `completed` no.
- Resolver catalogo, duracion, identidad y estado en backend.
- Rechazar solapamientos de citas dentro de una transaccion.
- Serializar operaciones concurrentes de `createReserva` y `rescheduleReserva`
  del mismo servicio y dia con un lock determinista server-only compartido.
- Mantener rollback no destructivo y sin migracion de datos existente.

## Fuera de alcance

- Configurar Firebase Console, App Check productivo, Billing/Blaze, Resend o
  Secret Manager.
- Desplegar Functions, rules o frontend.
- Migrar o reescribir reservas existentes.
- Crear un proveedor externo de rate limiting.

## Arquitectura

### Callable

Se agregara `createReserva` en `functions/src/createReserva.ts` y se exportara
desde `functions/src/index.ts`.

La configuracion usara `onCall` con App Check obligatorio fuera del emulador.
El frontend solo enviara:

```ts
type CreateReservaInput = {
  serviceId: string
  date: string
  timeSlot: string
  mascotaId?: string | null
  notes?: string | null
}
```

La respuesta sera:

```ts
type CreateReservaResult = {
  reservaId: string
  date: string
  timeSlot: string
  status: 'pending'
}
```

No se aceptaran desde el cliente `userId`, `userName`, `userEmail`, `price`,
`durationMin`, `status` ni `createdBy`.

### Guard de cuota

Functions administrara `bookingGuards/{uid}` con:

| Campo | Tipo | Uso |
|---|---|---|
| `uid` | string | propietario del guard |
| `windowStartedAt` | Timestamp | inicio de ventana de 15 minutos |
| `attempts` | number | intentos consumidos en la ventana |
| `updatedAt` | Timestamp | ultima actualizacion |

El documento no sera legible ni escribible por clientes. La transaccion del
guard serializa invocaciones concurrentes del mismo usuario. Si la ventana
expira, se reinicia en la misma transaccion. Desde el cuarto intento dentro de
la ventana se devuelve `resource-exhausted`.

### Lock de disponibilidad compartido

Functions administrara bajo demanda
`bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}`. El
identificador sera determinista y seguro para document IDs. El documento solo
contendra metadatos operativos, como `updatedAt`, y no sera legible ni
escribible por clientes.

El lock se leera y actualizara dentro de la misma transaccion que crea o
reagenda una reserva. `createReserva` lo lee antes de consultar disponibilidad
y lo escribe junto con la nueva reserva. `rescheduleReserva` lee el lock del
servicio/dia de destino antes de consultar conflictos y lo escribe junto con la
actualizacion de la reserva. Todas las operaciones del mismo servicio y dia
comparten el documento, por lo que una transaccion concurrente debe reintentarse
antes de volver a evaluar la disponibilidad. No se ejecutara backfill: los
locks se crean solo cuando se solicitan operaciones validas.

Ambas callables usan el helper compartido `bookingSlotGuardId(serviceId, date)`
para conservar exactamente el path
`bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}`.

### Transaccion de creacion

La callable validara autenticacion y App Check antes de entrar al flujo. Un
rechazo de Auth o App Check no consume intento porque no llega al handler. Toda
invocacion que supera esas verificaciones consume intento aunque falle por
payload, cuota activa, mascota o disponibilidad; por eso un payload invalido no
debe salir temprano antes de actualizar el guard.

Dentro de la transaccion se hara lo siguiente:

1. Leer `bookingGuards/{uid}` y determinar si el intento esta permitido.
2. Leer `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` para
   serializar disponibilidad de la creacion.
3. Leer el servicio `servicios/{serviceId}` y exigir `active == true`.
4. Leer la mascota si se envio `mascotaId` y exigir `userId == auth.uid`.
5. Validar fecha calendario, horario y futuro en `America/Mexico_City`.
6. Consultar reservas del usuario con estado `pending` o `confirmed` y
   rechazar si ya existen 10.
7. Consultar reservas activas del mismo servicio y fecha.
8. Calcular intervalos con `durationMin` y rechazar cualquier solapamiento.
9. Actualizar ambos guards y crear la reserva canonica en la misma
   transaccion.

La reserva creada tendra `userId` del token, email del token, nombre del token
o perfil, `serviceName` y `durationMin` del catalogo, `price: null`, `status:
'pending'`, `createdBy: 'client'` y `createdAt` server-side. Nunca recibira
`empleadoId` desde el cliente.

`rescheduleReserva` conserva ownership, estado `pending`, empleado, conflictos
y fecha futura en `America/Mexico_City`; dentro de su transaccion lee el lock de
destino antes de la query de conflictos y escribe el mismo lock antes de
actualizar `date`/`timeSlot`.

La consulta de disponibilidad puede requerir un indice compuesto adicional
para `serviceId + date + status`. Si se agrega, sera aditivo y tendra rollback
documentado retirando solo ese bloque del archivo de indices.

## Rules

- `reservas` dejara de permitir `create` desde clientes.
- `bookingGuards` tendra `allow read, write: if false`.
- `bookingSlotGuards` tendra `allow read, write: if false`.
- Lectura propia, cancelacion exacta y operaciones admin existentes se
  conservaran.
- Admin SDK seguira pudiendo crear y actualizar porque bypassa rules.

## Integracion del cliente

`src/services/reservas.ts` conservara `createReserva()` como frontera publica,
pero usara `httpsCallable` en vez de `addDoc`. `Reservar.tsx` mantendra su
wizard y solo actualizara el mapeo de errores:

- `resource-exhausted`: limite temporal o maximo de reservas activas.
- `failed-precondition`: fecha futura o slot no disponible.
- `invalid-argument`: datos invalidos.
- `permission-denied` / `unauthenticated`: sesion o App Check no validos.

Los mensajes no expondran detalles internos de Firestore o Functions.

## Pruebas

- Unit tests de la callable para ventana de cuota, cuarto intento, reinicio,
  limite activo, catalogo, mascota, fecha, solapamiento y snapshots.
- Tests de concurrencia con dos intentos para el mismo usuario y slot.
- Tests de concurrencia con dos usuarios distintos para el mismo servicio,
  dia y slot solapado; exactamente una reserva debe crearse.
- Test de concurrencia cross-call entre creacion y reagendado de usuarios
  distintos; exactamente una operacion debe confirmar el destino.
- Test de `rescheduleReserva` que prueba la escritura del lock de destino.
- Tests del lock ausente y existente, y del fake transaccional sin serializar
  artificialmente todas las transacciones.
- Rules tests: cliente no puede crear `reservas` ni tocar `bookingGuards` o
  `bookingSlotGuards`.
- Tests del servicio frontend para el contrato de `httpsCallable` y errores.
- QA local con emuladores para crear, cancelar y reagendar.
- Browser QA conserva los 12 casos existentes y agrega la ruta de creacion
  mediante callable.
- Typecheck, builds, audit y `git diff --check` deben pasar.

## Operacion, costo y rollback

- El cambio agrega lecturas y escrituras de Firestore, pero ningun proveedor
  de pago nuevo.
- Cada reserva valida agrega una lectura y una escritura de
  `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}`; la contencion queda acotada al servicio
  y dia, no a todo el catalogo. La misma lectura/escritura aplica al reagendado
  valido de `rescheduleReserva`.
- El budget alert de `$10/mes` sigue siendo requisito antes de habilitar
  Functions productivas.
- Orden productivo futuro: configurar App Check, desplegar callable, publicar
  frontend, aplicar rules restrictivas y ejecutar browser QA.
- Rollback: restaurar frontend y rules compatibles, deshabilitar la callable si
  corresponde y conservar `bookingGuards` para auditoria. Si se restaura
  temporalmente el `create` directo, sera una medida de emergencia acotada y
   debera volver a bloquearse antes de retomar produccion. No se borran
   reservas ni guards. Los `bookingSlotGuards` se conservan; no requieren
   backfill ni limpieza destructiva para deshabilitar la callable.
- La implementacion local no autoriza deployment ni configuracion de consola.

## Criterio de aceptacion

El frontend ya no puede crear reservas directamente; una invocacion valida
crea una reserva canonica, una cuarta invocacion dentro de 15 minutos es
rechazada, el usuario no supera 10 reservas activas, dos reservas solapadas no
pueden confirmarse concurrentemente incluso entre usuarios distintos, tampoco
cuando una operacion es `rescheduleReserva`, y el comportamiento existente de
cancelacion/reagendado permanece verde en QA local.
