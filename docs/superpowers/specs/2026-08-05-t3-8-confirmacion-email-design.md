# T3.8: Confirmacion inmediata de cita por email

## Estado

Diseño aprobado por el operador el 2026-08-05. La implementación queda pendiente de revisión de esta especificación.

## Objetivo

Enviar al cliente un resumen inmediato cuando se crea una reserva, sin hacer depender la creación de la reserva de la disponibilidad de Resend. La reserva conserva su estado operativo `pending` mientras espera asignación de empleado; el estado del email se registra por separado.

## Decisión de arquitectura

Se mantendrá intacta la Function existente `onReservaCreated`, que asigna empleados automáticamente. Se agregará un trigger Firestore independiente llamado `onReservaConfirmationCreated` para evitar mezclar asignación y email en una misma responsabilidad.

Se reutilizará el adaptador Resend existente. El frontend no conocerá ni invocará Resend y no se agregará una nueva credencial.

## Modelo de datos

La Function administra `confirmaciones/{reservaId}`. El documento tendrá un ID determinístico para que reintentos del trigger y ejecuciones duplicadas reutilicen el mismo estado.

| Campo | Tipo | Descripción |
|---|---|---|
| `reservaId` | string | Referencia a `reservas/{reservaId}` |
| `status` | `pending \| sent \| failed` | Estado del email |
| `attempts` | number | Intentos acumulados, máximo operativo de tres |
| `lastAttemptAt` | Timestamp \| null | Último intento |
| `sentAt` | Timestamp \| null | Envío exitoso |
| `lastError` | string \| null | Categoría sanitizada del último fallo |
| `processingLockUntil` | Timestamp \| null | Lock temporal del worker |
| `processingToken` | string \| null | Token del worker que obtuvo el lock |
| `nextAttemptAt` | Timestamp \| null | Próximo intento tras fallo retryable |
| `providerMessageId` | string \| null | ID devuelto por Resend |
| `createdAt` | Timestamp | Creación del registro |
| `updatedAt` | Timestamp | Última transición |

Las reglas Firestore permitirán lectura administrativa y denegarán lectura/escritura a guests y clients. Las escrituras de Functions usan Admin SDK y no dependen de las reglas de cliente.

## Flujo y contrato

1. El frontend crea `reservas/{reservaId}` con `status: 'pending'`.
2. `onReservaCreated` continúa intentando asignar un empleado; si no encuentra uno, la reserva queda pendiente de asignación.
3. `onReservaConfirmationCreated` valida el snapshot de la reserva: email válido, nombre/servicio no vacíos, fecha ISO válida y horario `HH:mm` válido.
4. La Function adquiere o crea `confirmaciones/{reservaId}` mediante una transacción y evita el envío si el estado ya es `sent`, si existe otro lock o si está activo el backoff.
5. Resend recibe el resumen con `Idempotency-Key: confirmation-${encodeURIComponent(reservaId)}`.
6. El email incluye nombre del cliente, servicio, fecha, hora y enlace a `/dashboard`.
7. En éxito, el documento pasa a `sent` y conserva el ID del proveedor.
8. En error retryable, se libera el lock, se registra una categoría sanitizada y se programa un backoff acotado.
9. En error permanente o datos inválidos, se marca `failed` sin modificar ni cancelar la reserva.
10. Las actualizaciones posteriores de la reserva no disparan otro email porque el trigger escucha únicamente creación y el documento de confirmación es idempotente.

## Integración y operación

- Se usará `RESEND_API_KEY` mediante Firebase Secret Manager cuando el operador configure producción; nunca se incluirá en el repositorio, frontend o logs.
- Se conserva `RESEND_FROM_EMAIL` como configuración no secreta del entorno Functions.
- Los fallos de Resend no bloquean la reserva ni se muestran como error de creación al cliente.
- El costo estimado se mantiene dentro del baseline documentado de 900 emails/mes; Firebase Functions/Blaze y los límites de Resend siguen siendo gates operativos pendientes.
- Rollback: deshabilitar o retirar el trigger, conservar `confirmaciones` para auditoría y no borrar documentos ni ejecutar migraciones destructivas.

## Verificación

La implementación deberá incluir tests unitarios y/o de integración de Functions para:

- envío de una confirmación válida;
- no reenvío cuando el registro está en `sent`;
- bloqueo concurrente y backoff;
- reintentos de red, HTTP 429 y HTTP 5xx;
- fallo permanente sin modificar la reserva;
- datos inválidos sin llamada a Resend;
- escape HTML de los valores dinámicos;
- enlace al dashboard;
- independencia del trigger de asignación.

También se actualizarán los tests de reglas para confirmar que guest/client no pueden leer ni escribir `confirmaciones` y que admin puede leerlas. Antes de marcar T3.8 como aprobada se ejecutarán tests cliente, tests de Functions, rules, typecheck, build, `release:preflight` y revisión de seguridad del diff.

## Fuera de alcance

- No se implementará cancelación por enlace firmado; el enlace apunta a `/dashboard` según el AC actual.
- No se configurarán Resend, dominio, DNS, Secret Manager, Billing/Blaze ni despliegue de producción en esta tarea.
- No se crearán reenvíos manuales desde el dashboard.
