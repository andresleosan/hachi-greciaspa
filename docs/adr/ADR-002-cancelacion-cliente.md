# ADR-002: Cancelación de reservas por cliente

Fecha: 2026-07-31
Estado: aceptada e implementada

## Contexto

T2.4 requiere que el cliente pueda **cancelar sus propias reservas** desde su dashboard. La regla de `firestore.rules` permite al dueño actualizar una reserva propia cuando el estado solicitado es `cancelled`, pero actualmente protege campos mediante una lista de campos prohibidos, no mediante una whitelist estricta de campos modificables. Admin conserva la capacidad de editar cualquier reserva y solo admin puede eliminarla.

Pero cancelar (cambiar `status` a `'cancelled'`) es legítimo y no expone a manipulación sensible si la whitelist es estricta.

## Decisión

**Relajar la regla `reservas.update` con una lista de campos sensibles protegidos y un valor de estado permitido:**

```firestore
allow update: if isAdmin()
  || (
    request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.status == 'cancelled'
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['userId', 'userName', 'userEmail', 'serviceId', 'serviceName',
                 'price', 'date', 'timeSlot', 'durationMin', 'createdAt', 'createdBy'])
  );
```

Con la regla actual, los campos sensibles protegidos son exactamente `userId`, `userName`, `userEmail`, `serviceId`, `serviceName`, `price`, `date`, `timeSlot`, `durationMin`, `createdAt` y `createdBy`. La regla no incluye `notes` ni otros campos no enumerados, por lo que esos campos podrían modificarse durante una cancelación. El cliente actual, en `cancelMyReserva`, solo envía `{ status: 'cancelled' }`; la protección server-side debe endurecerse para exigir explícitamente que el único campo afectado sea `status`.

`delete` sigue siendo solo admin (preserva historial — las canceladas quedan con `status='cancelled'` para reporting, no desaparecen).

La implementación está en `firestore.rules:37-55` y el flujo de cliente en `src/services/reservas.ts:104-110`. La suite actual `npm run rules:test` tiene 40 casos y verifica que el dueño puede cancelar, pero no puede cancelar la reserva de otro usuario ni alterar precio o `timeSlot` durante la cancelación.

## Alternativas consideradas

### A. Cloud Function HTTP `cancelMyReserva(reservaId)` que verifica y actualiza
- **Pro:** más limpio server-side.
- **Con:** Blaze plan, infra extra, build de Functions. Over-engineering para un MVP. Mismo costo que ADR-001 alt A.

### B. Dejar cancelaciones como admin-only (el cliente llama por teléfono al spa)
- **Pro:** 0 código nuevo, 0 riesgo de abuso.
- **Con:** gap de UX mediocre. Los clientes esperan poder cancelar por la app. Aumenta fricción, valor del producto baja.

### C. (Elegida) Regla Firestore con protección de campos sensibles.
- **Pro:** 0 infra nueva, sigue en Spark. La regla es declarativa y auditable (test de rules la valida). Estado final queda trazable.
- **Con:** la denylist actual puede dejar modificables campos nuevos o no enumerados si el schema cambia. Mitigación actual: la suite cubre `user cannot change price`, `user cannot change timeSlot`, `user can cancel own` y `user cannot cancel another user`; queda pendiente endurecerla a una allowlist explícita.

## Consecuencias

- **Se gana:** UX completa de cancelación, sin agregar infraestructura, costo $0.
- **Se sacrifica:** complejidad incremental de firestore.rules y, mientras no se endurezca, control completo sobre campos no enumerados. Es tolerable como deuda residual documentada, pero la regla debe migrar a una allowlist explícita de cambios permitidos (`status`) antes de ampliar el schema.
- **Tests actuales (`tools/firestore-tests/run-rules-tests.mjs`):** la suite de 40 casos incluye:
  1. user can cancel own reserva (status → cancelled)
  2. user cannot cancel another user's reserva
  3. user cannot change price via "cancel"
  4. user cannot change timeSlot via "cancel"

## Refs

- tasks.md T2.4 AC.
- firestore.rules:37-55 (regla implementada de `reservas`).
- `npm run rules:test` — suite actual de 40 casos.
- AUDITORIA.md N1 (precedente de whitelist de campos en regla de `users`).
