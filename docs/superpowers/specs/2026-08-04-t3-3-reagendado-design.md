# T3.3: Cancelación Y Reagendado De Reservas

## Objetivo

Permitir que un cliente cancele su reserva o reagende una reserva propia en estado `pending`, manteniendo la autorización server-side y evitando reagendar hacia un slot ocupado.

## Contexto actual

- La cancelación ya existe en `src/services/reservas.ts` y `DashboardPage.tsx`.
- `firestore.rules` permite actualmente cancelación mediante una denylist de campos sensibles.
- La denylist deja abiertos `notes` y campos futuros no enumerados.
- El backend de Firebase Functions ya existe en `functions/` y usa TypeScript, Firebase Admin SDK y Functions v2.
- Las reservas usan `serviceId`, `date`, `timeSlot`, `status` y `userId`.

## Decisión

Implementar una callable Function `rescheduleReserva` como única vía para reagendar desde el cliente. La Function validará autenticación, ownership, estado, fecha futura, formato de entrada y disponibilidad del slot dentro de una transacción de Admin SDK.

No se agregan campos ni colecciones. El cambio de datos existente se limita a `date` y `timeSlot`.

## Contrato

### Entrada

```ts
{
  reservaId: string
  date: string       // YYYY-MM-DD
  timeSlot: string   // HH:mm
}
```

### Resultado

Éxito:

```ts
{ reservaId: string, date: string, timeSlot: string }
```

Errores de negocio:

- `unauthenticated`: no existe usuario autenticado.
- `invalid-argument`: ID, fecha u horario inválido.
- `permission-denied`: la reserva no pertenece al usuario o no está `pending`.
- `failed-precondition`: la fecha ya pasó o el slot está ocupado.
- `not-found`: la reserva no existe.

No se incluyen datos sensibles en errores ni logs.

## Flujo server-side

1. Rechazar llamadas sin `context.auth`.
2. Validar tipos, fecha ISO, horario de 24 horas y fecha futura usando `America/Mexico_City`.
3. Abrir una transacción Firestore.
4. Leer la reserva indicada.
5. Exigir `resource.userId === auth.uid` y `status === 'pending'`.
6. Consultar dentro de la transacción reservas del mismo `serviceId`, `date` y `timeSlot`.
7. Ignorar únicamente reservas `cancelled`; cualquier otra reserva bloquea el slot.
8. Actualizar solo `date` y `timeSlot`.
9. Devolver el nuevo horario.

La validación mantiene la estrategia de doble reserva aceptada en ADR-001 para creación, pero el reagendado se valida dentro de una transacción backend. No se ejecuta ninguna migración destructiva.

## Reglas de Firestore

- Admin conserva permiso de edición completa.
- El cliente puede cancelar únicamente su propia reserva y el único campo afectado debe ser `status`, con valor `cancelled`.
- El cliente no puede actualizar directamente `date` ni `timeSlot` desde Firestore; el reagendado pasa exclusivamente por la callable Function.
- El cliente no puede modificar `userId`, `serviceId`, `price`, `notes`, `createdAt`, `createdBy` ni campos futuros.
- La Function usa Admin SDK y es la única vía de reagendado; no depende de permisos de escritura del cliente.

## Cliente

- `DashboardPage` muestra `Reagendar` solo para reservas `pending` con fecha futura.
- El formulario reutiliza fecha y horarios del flujo actual de reserva.
- `rescheduleMyReserva` llama a la callable y actualiza el booking local solo tras éxito.
- Se muestran mensajes distintos para slot ocupado, permisos, fecha inválida y errores inesperados.
- Si la Function no está desplegada, el cliente muestra un error operativo sin modificar la reserva.

## Pruebas

- Rules: cancelación solo con `status`, reagendado solo con `date` y `timeSlot`, ownership, estado `pending`, protección de campos sensibles y permisos admin.
- Functions: llamada autenticada válida, usuario no autenticado, reserva inexistente, reserva ajena, estado no pendiente, fecha pasada, formato inválido, slot ocupado y actualización válida.
- Regresión: `npm test`, `npx tsc --noEmit`, `npm run build`, Functions typecheck y Functions build.

## Rollback

- Código: retirar la exportación de la callable y quitar el botón/formulario de reagendado.
- Reglas: restaurar la condición anterior solo si se conserva el respaldo del archivo y se repite la suite de reglas.
- Datos: no hay migración ni colección nueva; las reservas modificadas conservan el historial implícito de la última fecha y hora, por lo que un rollback de código no revierte cambios de datos automáticamente.
- Producción: no desplegar ni aplicar rollback externo sin autorización explícita y backup reciente.
