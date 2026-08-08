# ADR-001: Validación de doble-booking en reservas

Fecha: 2026-07-31
Estado: aceptada e implementada

## Contexto

T2.3 (flujo de reserva) requiere impedir que dos clientes reserven el mismo `serviceId` en el mismo `date` + `timeSlot`. Sin validación, dos usuarios podrían escribir docs de `reservas` con campos idénticos y el spa se encontraría con doble reserva.

El proyecto está en Firebase Spark (sin Cloud Functions, no hay backend propio). Firestore rules son síncronas y no soportan queries cross-document en la regla (no se puede "contar docs con X campos").

## Decisión

**Sin Cloud Functions, aceptar validación client-side best-effort + timestamp server-side.** La race condition residual es un tradeoff aceptado para el MVP: la solución reduce duplicados en el flujo normal, pero no ofrece garantía atómica bajo concurrencia.

La validación client-side cross-user no es compatible con las reglas owner-only: una query global de `reservas` sería rechazada por Firestore y además expondría metadatos de otros clientes. Por eso el flujo de creación escribe directamente después de validar los campos propios; la concurrencia y la disponibilidad global siguen siendo una deuda explícita hasta incorporar una autoridad server-side.

La implementación de creación está en `src/services/reservas.ts` (`createReserva`). `firestore.rules` solo refuerza la propiedad de la reserva al crearla: exige que el usuario esté autenticado y que `request.resource.data.userId == request.auth.uid`. Las rules no consultan otras reservas ni impiden que dos clientes escriban el mismo slot; por tanto, no son una segunda defensa contra esta race condition. La suite local de reglas tiene 41 casos según la evidencia fechada 2026-08-04 y cubre la restricción de ownership; esto no constituye verificación de producción.

## Alternativas consideradas

### A. Cloud Function `onCreate` que cancela duplicados (server-side fuerte)
- **Pro:** veraz post-escritura, sin race conditions.
- **Con:** requiere Blaze plan (no Spark). Implica mantener Functions en TypeScript en `functions/`, deploy con `firebase deploy --only functions`, y manejar "rollback" notificando al usuario que su reserva se canceló. **Costo**: pasa a $0-3/mes Blaze aunque no se use. **Complejidad**: alto para MVP.

### B. Transacción Firestore `runTransaction` que lee count y escribe
- **Pro:** server-side atómico, sin Functions.
- **Con:** Firestore transactions NO soportan queries；necesitan conocer los doc IDs por adelantado. Para detectar duplicados en una colección con IDs autogenerados, no hay docId a priori. **No viable** salvo que inventemos ID determinista (` reservaId = serviceId_date_timeSlot`), lo cual choca con querer permitir futuras repeticiones o cancelaciones que liberen un slot.

### C. Regla Firestore con `get()` comprobando un doc "lock"
- Estructura: `slots/{serviceId_date_timeSlot}` con `reservaId` opcional. La reserva en `reservas` solo se permite si `get(slots/X).data.reservaId == request.resource.data.id` o no existe. Esto mueve el modelo a "primero se locka un slot". Complejidad alta en el schema, prolijo pero over-engineering para un MVP de spa pequeño.

### D. (Elegida) Escritura directa client-side
- **Pro:** 0 costo, 0 infra adicional, usa solo el SDK. Adecuado al ritmo del spa (decenas de reservas por semana, no miles por hora).
- **Con:** sin una query cross-user autorizable, la race condition es explícita: dos clientes pueden escribir el mismo slot. Probabilidad baja en escala de spa. Mitigación: en la confirmación manual del admin, decidir cuál cancelar. El campo `status` ya contempla `pending` para este efecto.

## Consecuencias

- **Se gana:** MVP funcional sin salir de Spark, sin infra extra, sin surface de deploy nueva.
- **Se sacrifica:** garantía estricta de no-duplicación. Asumimos que a baja concurrencia es tolerable y el admin mitiga casos raros vía cancelación manual (T2.4). Esta deuda queda aceptada explícitamente hasta que el crecimiento justifique una solución server-side.
- **Trigger para revisar:** si ocurren >3 dobles reservas reportadas en un mes, o si se agregan >10k reservas/mes, escalar a A o C.

## Refs

- tasks.md T2.3 (AC del flujo de reserva).
- firestore.rules:55-82 (reglas actuales de `reservas` y su lock privado).
- `npm run rules:test` — suite local de 41 casos, evidencia fechada 2026-08-04; no constituye verificación de producción.
- STACK.md (plan Spark free tier).
