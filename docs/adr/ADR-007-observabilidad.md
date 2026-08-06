# ADR-007: Observabilidad con Sentry y Cloud Logging

Fecha: 2026-08-05
Estado: aceptada; código local implementado; cuenta, DSN y alertas externas pendientes

## Contexto

El frontend y las Cloud Functions no tenían captura centralizada de errores no manejados. Los logs de Functions ya llegan a Cloud Logging por la plataforma, pero no existe diagnóstico equivalente para errores JavaScript del navegador ni agrupación de excepciones.

La integración debe proteger datos de clientes y funcionar sin bloquear la aplicación cuando no exista una cuenta Sentry o cuando el transporte externo falle.

## Alternativas

| Alternativa | Ventaja | Desventaja | Decisión |
|---|---|---|---|
| Sentry frontend + Functions | Agrupa excepciones, permite alertas y cubre navegador y backend | Agrega un proveedor externo y requiere revisión de privacidad | Elegida |
| Solo Cloud Logging | Sin nuevo proveedor ni SDK de navegador | No captura errores JS del frontend de forma útil | Descartada |
| Sentry solo frontend | Cubre la superficie visible al cliente | Deja Functions sin contexto agrupado | Descartada |

## Decisión

Usar `@sentry/react` en el frontend y `@sentry/node` en Functions, ambos opcionales por DSN. El frontend usa `VITE_SENTRY_DSN`; Functions usa `SENTRY_DSN`. Cloud Logging continúa siendo el destino principal de logs operativos.

La configuración inicial usa `sendDefaultPii: false`, no identifica usuarios y aplica una sanitización central antes de transportar eventos. No se habilitan Session Replay, tracing ni profiling en esta etapa.

Los errores de Sentry no se propagan al flujo de negocio. En Functions no cambian los retries, estados de Firestore ni la idempotencia de los emails. Si falta el DSN, la aplicación continúa sin transporte Sentry.

## Privacidad

No se envían emails, contraseñas, tokens Firebase, cookies, headers de autorización, payloads de formularios, documentos Firestore ni query strings. La implementación elimina `request`, `user` y breadcrumbs, y filtra claves sensibles en contexto, extras y tags.

El DSN frontend es configuración pública del SDK y no se trata como secreto privado, pero no se hardcodea. `RESEND_API_KEY` y cualquier secreto backend nunca se colocan en variables `VITE_*`, código, eventos ni logs.

## Costo

La página oficial de precios consultada el 2026-08-05 indica que el plan Developer cuesta USD 0 e incluye 5.000 errores, 5 GB de logs y 5 millones de spans. El plan Team parte de USD 26/mes con facturación anual y 50.000 errores incluidos.

La primera implementación desactiva funciones de alto volumen. Estimación inicial: USD 0/mes mientras el uso permanezca dentro del plan Developer. No hay todavía alerta de presupuesto de Sentry ni alerta de Cloud Monitoring configuradas.

## Consecuencias

- Se gana captura agrupada de errores frontend y excepciones relevantes de Functions.
- Se conserva Cloud Logging para operación y auditoría de Functions.
- Se agrega dependencia de un proveedor externo y un gate de configuración operativa.
- La activación real requiere crear el proyecto Sentry, proporcionar DSN, enviar un evento controlado, revisar ausencia de PII y configurar la alerta de Functions mayor a 5 errores/minuto.

## Referencias

- `src/observability/sentry.ts`
- `functions/src/observability/sentry.ts`
- `docs/Fase3.md`, T3.12
- `docs/RUNBOOK.md`, sección de observabilidad
- https://sentry.io/pricing/
