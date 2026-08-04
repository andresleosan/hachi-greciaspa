# STACK — Hachi & Grecia Spa

Última actualización: 2026-08-03 (MVP verificado; transición a Fase 3 operativa).

## Stack técnico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Framework UI | React | 19.2 | con Suspense + lazy routes |
| Lenguaje | TypeScript | 6.0 | strict (warn de moduleResolution=node10, migrar a bundler en Fase 3) |
| Build | Vite | 8.2 | bundle 107 KB Firebase + 74 KB app gzip |
| Routing | react-router-dom | 7.18.2 | |
| Styling | Tailwind CSS | 4.3 | layered sobre tokens custom en `src/styles/maqueta.css` |
| Estado | (sin store global) | — | Zustand removido en Fase 1 (M6) por no usado |
| Formularios | (sin lib) | — | react-hook-form removido en Fase 1 (M6) por no usado |
| Fechas | date-fns | 4.3 | usado en `DashboardPage.tsx` |
| Backend | Firebase | 12.13 | Auth + Firestore + App Check opcional; Storage no usado |
| Tests reglas | `@firebase/rules-unit-testing` | 5.0 | 41 passed, 0 failed; JDK 21 requerido |

## Evaluación de seguridad: React Router

El `npm audit` actual reporta el advisory de modo RSC para `react-router-dom@7.18.2`. La aplicación usa únicamente `BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useNavigate` y `useSearchParams`; no se encontraron APIs RSC ni de server actions. Por la arquitectura SPA actual, el advisory no es alcanzable a través del código desplegado. Debe revisitarse cuando se publique una versión parcheada; el audit no se suprime ni se considera limpio.

## Estado de entrega

### MVP verificado

- Los clientes autenticados pueden leer el catálogo, crear sus propias reservas, verlas en el dashboard y cancelarlas. Firestore permite la cancelación únicamente con el cambio exacto de `status` a `cancelled`; las escrituras directas del cliente sobre `date`/`timeSlot` son denegadas.
- El cliente solicita el reagendado exclusivamente mediante la callable `rescheduleReserva`, que usa Admin SDK y es la autoridad para disponibilidad. Valida ownership, estado, fecha/hora futura en `America/Mexico_City` y conflictos de slots activos dentro de una transacción. El código está implementado localmente; el despliegue y la configuración de producción siguen pendientes.
- La validación de slots está implementada en `src/services/reservas.ts` como best-effort client-side; el tradeoff de concurrencia aceptado está documentado en ADR-001.
- Los mensajes de contacto persisten en `mensajes`, con creación anónima y lectura/eliminación solo para admin.
- La galería se sirve mediante seis paths públicos estáticos y no depende de Cloud Storage.
- `firestore.rules` está cubierta por la suite actual: `41 passed, 0 failed`, incluidos ownership de reservas, cancelación exacta, protección de precios, mensajes de contacto y acceso admin. Functions reporta `46 passed, 2 skipped`.
- La inicialización de App Check está presente cuando se configura `VITE_FIREBASE_APP_CHECK_SITE_KEY` y se omite en el emulador.

### Brechas de Fase 3

- La integración de email transaccional y recordatorios está implementada en `functions/`, pero no está configurada ni desplegada; el proveedor elegido está documentado en ADR-004 y no se usa ninguna credencial desde el frontend.
- Las alertas de presupuesto no están configuradas en Google Cloud Console. Sigue siendo COST-1/T3.10 y no debe considerarse completado.
- La activación de App Check en consola y la comprobación de rechazo de writes no autorizados en producción siguen pendientes; la suite del emulador de rules no prueba esa configuración de despliegue.
- La prevención server-side fuerte de doble reserva, la agenda operativa, terapeutas, backups y observabilidad siguen siendo trabajo de Fase 3.

## Servicios de pago: Firebase

Proyecto Firebase: `hachi-greciaspa` (ver `.firebaserc`). Plan actual: **Spark (free)**.

### Estimación mensual (plan Spark, sin costos)

| Servicio | Free tier | Uso estimado MVP | Costo |
|---|---|---|---|
| **Authentication** | 10k verificaciones/día, 50k SMS/mes (no usado) | ~50-200 usuarios activos | $0 |
| **Cloud Firestore** | 50k lecturas/día, 20k escrituras/día, 1 GiB almacenamiento | landing + dashboard + reservas: ~5k lecturas/día, ~100 writes/día | $0 |
| **Cloud Storage** | 5 GiB almacenamiento, 1 GB/día egress | no usado (declarado en firebase.ts pero sin callers) | $0 |
| **Hosting** | 10 GB almacenamiento, 360 MB egress/día | build estático < 5 MB | $0 |

**Costo mensual estimado MVP verificado: $0** — todo dentro del Spark free tier con amplio margen; no hay alertas de presupuesto configuradas todavía.

### Cuándo se excede el free tier (proyección)

| Servicio | Umbral | Cuándo se superaría |
|---|---|---|
| Firestore lecturas | 50k/día | ~500 usuarios activos/día cada uno viendo 100 docs |
| Firestore escrituras | 20k/día | solo si se meten writes masivos (analytics, logs) — no en scope |
| Firestore almacenamiento | 1 GiB | ~500k reservas acumuladas (cada doc ~2 KB) — años |
| Auth | 50k SMS/mes | solo si se habilita phone auth (no en scope) |

Conclusión: el proyecto puede operar en free tier **varias años** a su ritmo actual. Único riesgo real sería una viralidad inesperada o logs mal diseñados.

### Migración a Blaze (pay-as-you-go)

Si se supera el free tier:
- Firestore: $0.036 por 100k lecturas, $0.108 por 100k escrituras, $0.108/GB-mes.
- Auth: SMS Authenticate $0.01 por usuario (solo si phone auth).
- Estimación post-pago: **$1-5/mes** para 5k usuarios activos.

No hay plan de precio fijo wildcard — puro pay-as-you-go.

## Email transaccional Fase 3

Proveedor recomendado: **Resend**. Fallback operativo: **Postmark**. Estado: integración implementada en `functions/`; cuenta, secreto, dominio y despliegue todavía no están configurados/verificados.

Baseline de planificación: **900 recordatorios/mes**. El costo del proveedor de email se mantiene separado del costo de Firebase Functions/Blaze:

| Proveedor | Plan y costo de email en 900/mes | Functions/Blaze separado | Total de planificación |
|---|---:|---:|---:|
| Resend | Free: $0 (3,000/mes; 100/día) | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $0-3 |
| Postmark | Basic: $15/mes (10,000 incluidos) | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $15-18 |
| SendGrid | Essentials desde $19.95/mes | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $19.95-22.95 |

Para 900 ejecuciones mensuales, Functions queda dentro de las cuotas sin costo publicadas en Blaze. Blaze es obligatorio para desplegar Functions aunque el uso medido estimado sea $0. **Budget alert: not verified** hasta que el operador confirme Google Cloud Console.

El contrato de implementación está en ADR-004: `RESEND_API_KEY` en Firebase Secret Manager, caller exclusivo en Firebase Functions, máximo tres retries con backoff acotado y registro sanitizado de fallas permanentes. El código de integración está implementado; todavía no hay credenciales, dominio ni despliegue configurados.

## Hallazgo de costo

### COST-1 — Sin configurar budget alert en Firebase (severidad BAJA)

**Qué:** No se configuró alerta de facturación ni budget cap en Google Cloud Console para el proyecto `hachi-greciaspa`.

**Impacto si no se corrige:** En free tier el saldo nunca sube, pero si el proyecto migra a Blaze (Fase 3 o interacción con Cloud Functions para ADR-001/002), un evento imprevisto (loop infinito de un Cloud Function, query sin límite disparado por un bot, abuso del storage) puede generar facturación sin aviso. Sin alerta, el operador se entera por el recibo.

**Corrección:** No bloqueante para Fase 2 (estamos en free tier sin riesgo). **Acción recomendada desde Fase 3 onboarding:** crear un budget de $10 en Google Cloud Console ("Facturación → Presupuestos"), con notificaciones de gasto real y pronosticado a $1, $5 y $10. Las alertas notifican, pero no imponen un límite duro de facturación.

## Servicios externos

| Servicio | Estado | Cuándo se consideraría |
|---|---|---|
| Email transaccional (Resend; Postmark fallback) | Código implementado en `functions/`; no configurado/desplegado | Verificación de dominio, secreto y despliegue de recordatorios |
| reCAPTCHA v3 | Código integrado; activación de producción pendiente | Habilitar y verificar en Firebase Console |

## Limpieza de servicios sin uso

Tras Fase 1 (M6) + Fase 2 (T2.7):
- ✅ Removidos: axios, react-calendar, zustand, react-hook-form, react-hot-toast — ninguno importado en código.
- ✅ Removido: `firebaseStorage` init de `firebase.ts` y storage emulator de `firebase.json` (ADR-003: galería usa paths estáticos).

## Pendientes técnicos conocidos (cross-ref tasks.md)

- `tasks.md` T2.1-T2.8 — cierre documentado con deuda residual y sub-items pendientes.
- `AUDITORIA.md` H4 — integración App Check implementada; activación/verificación de producción pendiente.
- `AUDITORIA.md` M2 — dashboard con datos reales implementado para reservas y métricas básicas.
- H1 (npm audit): 19 vulns restantes en devDeps (firebase-tools), no afectan prod bundle.
