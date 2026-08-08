# ADR-008: Creación de reservas mediante callable transaccional

Fecha: 2026-08-07
Estado: aceptada para la decisión local; no production-ready

## Contexto

La creación anterior usaba `addDoc` desde el navegador. Ese flujo podía
validar ownership y parte del schema con Firestore Rules, pero no podía
serializar la disponibilidad global, limitar los intentos por usuario ni
garantizar que los snapshots provinieran del catálogo y de la identidad
autenticada. La decisión local debía cerrar esa autoridad sin reescribir las
reservas existentes ni ejecutar cambios productivos.

La implementación fue verificada contra el código y los emuladores locales.
La activación de App Check en Firebase Console, Billing/Blaze, budget alert,
Secret Manager/Resend, deploy, rollback operativo y browser QA contra
producción siguen pendientes.

## Decisión

La creación de reservas del cliente se realiza mediante la callable
`createReserva`, configurada con `onCall` y `enforceAppCheck` fuera del
emulador. El reagendado del cliente se realiza mediante la callable
`rescheduleReserva`. `firestore.rules` niega `create` directo en `reservas`;
Functions mediante Admin SDK es la autoridad de escritura para ambas
mutaciones.

El contrato mínimo que sale del cliente es:

```ts
type CreateReservaInput = {
  serviceId: string
  date: string
  timeSlot: string
  mascotaId?: string | null
  notes?: string | null
}
```

La respuesta devuelve únicamente `reservaId`, `date`, `timeSlot` y
`status: 'pending'`. El cliente no puede enviar `userId`, `userName`,
`userEmail`, `serviceName`, `price`, `durationMin`, `status`, `createdBy` ni
`empleadoId`.

Después de Auth y App Check, una transacción de Firestore:

1. Lee y actualiza `bookingGuards/{uid}` con una cuota de 3 intentos por
   ventana de 15 minutos. El cuarto intento dentro de la ventana se rechaza
   con `resource-exhausted`; los intentos que superan Auth y App Check cuentan
   aunque el payload sea inválido o falle otra regla de negocio.
2. Valida la fecha futura en `America/Mexico_City`, el servicio activo, la
   mascota perteneciente al usuario y el límite de 10 reservas activas.
   Solamente `pending` y `confirmed` cuentan; `cancelled` y `completed` no.
3. Lee el lock determinista server-only
   `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` antes de
   consultar disponibilidad. El documento se crea lazy en la primera reserva
   exitosa del servicio y día; contiene `serviceId`, `date` y `updatedAt`.
   Todas las solicitudes del mismo servicio/día comparten ese documento, por
   lo que la contención deliberada queda acotada a ese servicio y día. Es el
   trade-off elegido para soportar intervalos de duración variable.
4. Consulta todas las reservas activas del mismo servicio y fecha, calcula los
   intervalos usando `durationMin` del catálogo y rechaza cualquier
   solapamiento dentro de la misma transacción. La consulta no tiene hoy un
   límite de documentos conocido; el lock evita carreras, pero no sustituye
   una futura estrategia de particionamiento o retención.
5. Actualiza el lock y escribe una reserva canónica con identidad del
   token/perfil, nombre y
   duración del catálogo, `price: null`, fecha/hora normalizadas,
   `status: 'pending'`, `createdBy: 'client'` y `createdAt` server-side. No
   acepta `empleadoId` del cliente. El lock solo se escribe en el commit
   exitoso; los rechazos no crean locks.

`rescheduleReserva` usa el mismo helper y el mismo documento de lock para el
servicio/dia destino. Despues de validar ownership y estado `pending`, lee el
lock antes de su query de conflictos y lo escribe en el commit exitoso antes de
actualizar `date`/`timeSlot`. Por tanto, una creacion y un reagendado
concurrentes del mismo servicio/dia compiten por el mismo path y una
transaccion debe reintentarse antes de volver a evaluar disponibilidad.

App Check se omite únicamente cuando el entorno de Functions es el emulador.
`bookingGuards/{uid}` queda privado para Functions/Admin SDK mediante
`allow read, write: if false`.

Esta ADR reemplaza la decisión de creación directa de ADR-001 únicamente para
el flujo local documentado aquí; no cambia la política de cancelación de
ADR-002.

## Alternativas consideradas

- **Mantener `addDoc` desde el cliente** - descartada porque no puede imponer
  una cuota server-side, derivar snapshots canónicos de forma confiable ni
  serializar el límite de reservas activas y la disponibilidad entre usuarios.
- **Trigger `onCreate` posterior a la escritura** - descartada porque la
  reserva ya existiría antes de resolver el solapamiento, la cuota o el límite
  activo; cancelar después no ofrece la misma garantía transaccional.
- **Callable HTTP pública** - descartada porque agrega una superficie HTTP
  más amplia sin necesidad para este contrato y no mejora el modelo frente a
  `onCall` con Auth y App Check.
- **Particionar la disponibilidad con slots fijos** - descartado porque los
  servicios tienen intervalos de duración variable y un slot fijo no
  representa por sí solo la disponibilidad. La decisión aprobada usa un único
  lock por servicio y día para serializar la evaluación de intervalos sin
  migrar reservas.

## Consecuencias

- Se gana una única autoridad server-side para crear reservas, snapshots
  canónicos, cuota de 3/15 minutos, límite de 10 activas, fecha futura y
  disponibilidad transaccional.
- Se conservan los documentos existentes: no hay migración ni backfill de
  `reservas`; `bookingSlotGuards` también se crea lazy y no requiere backfill.
  La cancelación propia y la semántica existente de ownership, estado,
  empleado, conflictos y fecha futura de `rescheduleReserva` permanecen.
- Cada invocación que supera Auth y App Check agrega, como mínimo, una lectura
  y una escritura de `bookingGuards`. El flujo válido también lee el servicio,
  el perfil, la mascota si fue indicada y los resultados de las consultas de
  reservas activas del usuario y del servicio/fecha; escribe el guard y la
  nueva reserva. Una falla de negocio conserva el guard y no crea la reserva.
  Reintentos de la transacción pueden repetir lecturas y escrituras.
- Cada creación o reagendado exitoso agrega una lectura y una escritura de
  `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}`. Una falla de
  negocio puede leer el lock, pero no lo escribe; los reintentos pueden
  repetir esas operaciones. La contención es por servicio/día, no global, y
  ambas callables comparten el mismo documento.
- La consulta de disponibilidad sigue devolviendo todos los activos del
  servicio y día, sin un límite de documentos conocido actualmente. El lock
  resuelve la carrera entre usuarios, pero deja pendiente una futura
  estrategia de particionamiento o retención si crece el volumen.
- Los índices compuestos `userId + status` y `serviceId + date + status`
  permiten las consultas de límite y disponibilidad, pero agregan mantenimiento
  de índices y almacenamiento de Firestore. No se introduce un proveedor de
  rate limiting ni otro servicio pago; Cloud Functions seguirá requiriendo
  Billing/Blaze para producción y su budget alert aún no está verificado.
- El costo exacto depende del volumen de invocaciones, documentos devueltos,
  reintentos y precios vigentes de Firestore/Functions. La evidencia local no
  constituye una proyección ni una autorización de facturación.

## Rollback

El rollback es no destructivo y no requiere migrar documentos existentes:

1. Detener la publicación del cliente que llama `createReserva` y retirar o
   deshabilitar la callable mediante el procedimiento operativo autorizado.
2. Mantener `reservas`, `bookingGuards` y `bookingSlotGuards` para auditoría;
   no borrar reservas, guards, locks ni snapshots.
3. Retirar solamente los dos bloques nuevos de
   `firestore.indexes.json` cuando ninguna versión activa consulte esos
   índices. No aplicar una migración destructiva.
4. No restaurar `create` directo como estado permanente. Si una emergencia
   exige compatibilidad temporal, requiere autorización explícita, revisión
   de Rules y un plan para volver a bloquear la escritura directa antes de
   producción.

La decisión está aceptada para la implementación local verificada. No declara
el sistema listo para producción.

## Evidencia local y gates pendientes

La callable, sus tests de cuota/concurrencia/snapshots y lock, Rules, cliente y
browser QA contra emuladores fueron verificados localmente. Permanecen como
gates independientes: App Check Console y rechazo productivo, Rules y lock
privado en el despliegue, Billing/Blaze, budget alert, Secret Manager/Resend,
deploy con autorización explícita, rollback operativo probado y browser QA
productivo. La decisión sigue aceptada solo para el entorno local verificado;
no declara producción lista.
