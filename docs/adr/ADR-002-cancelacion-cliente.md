# ADR-002: Cancelación de reservas por cliente

Fecha: 2026-07-31
Estado: propuesta (pendiente de implementación en tasks.md T2.4)

## Contexto

T2.4 requiere que el cliente pueda **cancelar sus propias reservas** desde su dashboard. La regla actual de `firestore.rules`:39 (`allow update, delete: if isAdmin()`) bloquea esto — solo admin puede mutar una reserva ya creada. Esta regla fue fijada en la auditoría para evitar que un cliente borre el historial o cambie `serviceName`/`price` a su favor.

Pero cancelar (cambiar `status` a `'cancelled'`) es legítimo y no expone a manipulación sensible si la whitelist es estricta.

## Decisión

**Relajar la regla `reservas.update` con whitelist de campo + whitelist de valor:**

```firestore
allow update: if isAdmin()
  || (
    request.auth != null
    && resource.data.userId == request.auth.uid
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['userId', 'serviceId', 'serviceName', 'price', 'date', 'timeSlot', 'createdAt'])
    && request.resource.data.status == 'cancelled'
  );
```

El cliente puede tocar SOLO el campo `status`, y solo para cambiarlo a `'cancelled'`. Nada más: no userId, no fecha, no precio.

`delete` sigue siendo solo admin (preserva historial — las canceladas quedan con `status='cancelled'` para reporting, no desaparecen).

## Alternativas consideradas

### A. Cloud Function HTTP `cancelMyReserva(reservaId)` que verifica y actualiza
- **Pro:** más limpio server-side.
- **Con:** Blaze plan, infra extra, build de Functions. Over-engineering para un MVP. Mismo costo que ADR-001 alt A.

### B. Dejar cancelaciones como admin-only (el cliente llama por teléfono al spa)
- **Pro:** 0 código nuevo, 0 riesgo de abuso.
- **Con:** gap de UX mediocre. Los clientes esperan poder cancelar por la app. Aumenta fricción, valor del producto baja.

### C. (Elegida) Regla Firestore con whitelist estricta arriba.
- **Pro:** 0 infra nueva, sigue en Spark. La regla es declarativa y auditable (test de rules la valida). Estado final queda trazable.
- **Con:** Firestore rules pueden ser tricky si el schema cambia (hay que actualizar whitelist al añadir campos sensibles). Mitigación: el test debería cubrir `user cannot change price`, `user cannot change userId`, `user CAN cancel own`, `user cannot cancel other's`.

## Consecuencias

- **Se gana:** UX completa de cancelación, sin agregar infraestructura, costo $0.
- **Se sacrifica:** complejidad incremental de firestore.rules. Es tolerable porque rules es el sitio correcto para este tipo de lógica en Firebase.
- **Tests requeridos (en T2.4):** ampliar `run-rules-tests.mjs` con 4 casos:
  1. user can cancel own reserva (status → cancelled)
  2. user cannot cancel another user's reserva
  3. user cannot change price via "cancel"
  4. user cannot change timeSlot via "cancel"

## Refs

- tasks.md T2.4 AC.
- firestore.rules:39 (regla actual a modificar).
- AUDITORIA.md N1 (precedente de whitelist de campos en regla de `users`).
