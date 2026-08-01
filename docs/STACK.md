# STACK — Hachi & Grecia Spa

Última actualización: 2026-07-31 (Cronos, inicio Fase 2).

## Stack técnico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Framework UI | React | 19.2 | con Suspense + lazy routes |
| Lenguaje | TypeScript | 6.0 | strict (warn de moduleResolution=node10, migrar a bundler en Fase 3) |
| Build | Vite | 8.2 | bundle 107 KB Firebase + 74 KB app gzip |
| Routing | react-router-dom | 7.15 | |
| Styling | Tailwind CSS | 4.3 | layered sobre tokens custom en `src/styles/maqueta.css` |
| Estado | (sin store global) | — | Zustand removido en Fase 1 (M6) por no usado |
| Formularios | (sin lib) | — | react-hook-form removido en Fase 1 (M6) por no usado |
| Fechas | date-fns | 4.3 | usado en `DashboardPage.tsx` |
| Backend | Firebase | 12.13 | Auth + Firestore + Storage(declarado, no usado) |
| Tests reglas | `@firebase/rules-unit-testing` | 5.0 | 23 casos, JDK 21 requerido |

## Servicios de pago: Firebase

Proyecto Firebase: `hachi-greciaspa` (ver `.firebaserc`). Plan actual: **Spark (free)**.

### Estimación mensual (plan Spark, sin costos)

| Servicio | Free tier | Uso estimado MVP | Costo |
|---|---|---|---|
| **Authentication** | 10k verificaciones/día, 50k SMS/mes (no usado) | ~50-200 usuarios activos | $0 |
| **Cloud Firestore** | 50k lecturas/día, 20k escrituras/día, 1 GiB almacenamiento | landing + dashboard + reservas: ~5k lecturas/día, ~100 writes/día | $0 |
| **Cloud Storage** | 5 GiB almacenamiento, 1 GB/día egress | no usado (declarado en firebase.ts pero sin callers) | $0 |
| **Hosting** | 10 GB almacenamiento, 360 MB egress/día | build estático < 5 MB | $0 |

**Costo mensual estimado Fase 2 (MVP): $0** — todo dentro del Spark free tier con amplio margen.

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

## Hallazgo de costo

### COST-1 — Sin configurar budget alert en Firebase (severidad BAJA)

**Qué:** No se configuró alerta de facturación ni budget cap en Google Cloud Console para el proyecto `hachi-greciaspa`.

**Impacto si no se corrige:** En free tier el saldo nunca sube, pero si el proyecto migra a Blaze (Fase 3 o interacción con Cloud Functions para ADR-001/002), un evento imprevisto (loop infinito de un Cloud Function, query sin límite disparado por un bot, abuso del storage) puede generar facturación sin aviso. Sin alerta, el operador se entera por el recibo.

**Corrección:** No bloqueante para Fase 2 (estamos en free tier sin riesgo). **Acción recomendada desde Fase 3 onboarding:** crear un budget en Google Cloud Console ("Facturación → Presupuestos") con alertas a $1 y $5, y un cap a $10 — blindado para escalar sin susto.

## Servicios externos: ninguno por ahora

| Servicio | Estado | Cuándo se consideraría |
|---|---|---|
| Email transaccional (SendGrid, Postmark) | No integrado | Fase 3 para recordatorios de cita |
| reCAPTCHA v3 | Integrado (T2.8) | Habilitar en Firebase Console cuando se despliegue |

## Limpieza de servicios sin uso

Tras Fase 1 (M6) + Fase 2 (T2.7):
- ✅ Removidos: axios, react-calendar, zustand, react-hook-form, react-hot-toast — ninguno importado en código.
- ✅ Removido: `firebaseStorage` init de `firebase.ts` y storage emulator de `firebase.json` (ADR-003: galería usa paths estáticos).

## Pendientes técnicos conocidos (cross-ref tasks.md)

- `tasks.md` T2.1-T2.8 — backlog MVP.
- `AUDITORIA.md` H4 — App Check pendiente (→ T2.8).
- `AUDITORIA.md` M2 — dashboard con datos reales: parcialmente corregido, se completa con T2.3.
- H1 (npm audit): 19 vulns restantes en devDeps (firebase-tools), no afectan prod bundle.
