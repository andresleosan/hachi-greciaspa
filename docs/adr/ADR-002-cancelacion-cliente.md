# ADR-002: Cancelación de reservas por cliente

Fecha: 2026-07-31
Estado: aceptada e implementada

## Contexto

T2.4 requiere que el cliente pueda **cancelar sus propias reservas** desde su dashboard. T3.3 agrega el reagendado de reservas propias `pending`. Ambas operaciones deben impedir que el cliente cambie identidad, servicio, precio, notas u otros campos de la reserva. Admin conserva la capacidad de editar cualquier reserva y solo admin puede eliminarla.

## Decisión

**Permitir al propietario únicamente la cancelación exacta en `reservas.update`; el reagendado del cliente es callable-only:**

```firestore
allow update: if isAdmin()
  || (
    request.auth != null
    && resource.data.userId == request.auth.uid
    && (resource.data.status == 'pending' || resource.data.status == 'confirmed')
    && request.resource.data.status == 'cancelled'
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
  );
```

La cancelación acepta únicamente `{ status: 'cancelled' }` y conserva el documento para auditoría. Las escrituras directas del cliente sobre `date` y `timeSlot` son denegadas y no constituyen un contrato de reagendado. El propietario no puede cambiar campos adicionales, incluidos `notes` y cualquier campo futuro.

`delete` sigue siendo solo admin (preserva historial — las canceladas quedan con `status='cancelled'` para reporting, no desaparecen).

El cliente cancela mediante `cancelMyReserva`, que envía solo `{ status: 'cancelled' }`. Para reagendar, `rescheduleMyReserva` llama exclusivamente a `rescheduleReserva`; no escribe `date` ni `timeSlot` directamente. La callable usa Admin SDK y es la autoridad para disponibilidad: valida fecha/hora futura en `America/Mexico_City`, ownership y estado, consulta el mismo servicio/fecha/hora dentro de una transacción, ignora únicamente conflictos `cancelled` y actualiza solo los dos campos de reagendado.

## Alternativas consideradas

### A. Cloud Function HTTP `cancelMyReserva(reservaId)` que verifica y actualiza
- **Pro:** más limpio server-side.
- **Con:** Blaze plan, infra extra, build de Functions. Over-engineering para un MVP. Mismo costo que ADR-001 alt A.

### B. Dejar cancelaciones como admin-only (el cliente llama por teléfono al spa)
- **Pro:** 0 código nuevo, 0 riesgo de abuso.
- **Con:** gap de UX mediocre. Los clientes esperan poder cancelar por la app. Aumenta fricción, valor del producto baja.

### C. (Elegida) Regla Firestore exacta para cancelación y callable autoritativa para reagendado.
- **Pro:** no agrega una vía directa de escritura de fecha/hora para el cliente, mantiene el estado trazable y permite que la disponibilidad se valide server-side dentro de una transacción.
- **Con:** la callable requiere Functions configuradas y desplegadas para que el reagendado opere fuera del entorno local.

## Consecuencias

- **Se gana:** cancelación con un contrato de mutación explícito; el reagendado es callable-only y la disponibilidad del nuevo slot no depende de una comprobación confiada al navegador.
- **Se sacrifica:** el reagendado depende de la callable y su configuración operativa; esta tarea no despliega Functions ni completa configuración de producción.
- **Tests:** `npm run rules:test` reporta `41 passed, 0 failed`; la suite de Functions reporta `46 passed, 2 skipped`. Las pruebas cubren ownership, estado, cancelación exacta, disponibilidad y actualización limitada a `date`/`timeSlot`.

## Rollback

- **Código:** retirar la exportación de `rescheduleReserva` y el botón/formulario de reagendado del dashboard. La cancelación puede conservarse porque es una mutación independiente.
- **Reglas:** conservar la denegación de escrituras directas de `date`/`timeSlot`; si se retira el flujo callable, repetir la suite de reglas antes de cualquier cambio adicional.
- **Datos:** no hay migración, colección ni campo nuevo. Las reservas ya reagendadas conservan su última fecha/hora y un rollback de código no revierte datos de forma destructiva ni automática.
- **Producción:** no desplegar ni aplicar cambios externos sin autorización explícita y backup reciente.

## Refs

- tasks.md T2.4 AC.
- `firestore.rules:37-60` (regla implementada de `reservas`).
- `src/services/reservas.ts` (cancelación directa mínima y llamada callable para reagendado).
- `functions/src/rescheduleReserva.ts` (validación y transacción autoritativa).
- `npm run rules:test` — suite de reglas de reservas.
- AUDITORIA.md N1 (precedente de whitelist de campos en regla de `users`).
