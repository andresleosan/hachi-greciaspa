# STACK — Hachi & Grecia Spa

Última actualización: 2026-08-09 (MVP, catálogo público, harness de browser QA local y código/tests de T3.5 verificados localmente; cuenta de facturación, Blaze y budget confirmados por el operador; modo de notificación y destinatarios pendientes).

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
| Backend | Firebase | 12.13 | Auth + Firestore + Functions v2; App Check obligatorio fuera del emulador; Storage no usado |
| Reservas cliente | `createReserva` y `rescheduleReserva` callable | Functions v2 | transacciones server-side, cuota 3/15 minutos para creación, máximo 10 activas, lock lazy server-only compartido por servicio/día y solapamiento por duración |
| Tests reglas | `@firebase/rules-unit-testing` | 5.0 | 74 passed, 0 failed; evidencia local fechada 2026-08-09; no verificacion de produccion; JDK 21 requerido |

## Identidad visual — Rediseño luxe

- **Dirección:** "lujo silencioso": experiencia inmersiva de spa nocturno, con tinta profunda verdosa, luz ambiental difusa y vidrio esmerilado. No se usan grids de tarjetas como lenguaje principal.
- **Paleta:** `#0C0E0B` como fondo, `#F2EDE1` para texto, `#C9A96A` como acción/bronce silencioso y `#93A58C` para calma/aurora.
- **Tipografía:** Fraunces para titulares editoriales y Manrope para interfaz, datos y cuerpo.
- **Firma:** la "puerta de luz": escenas de scroll que se abren con `clip-path`, escala y capas de opacidad; parallax multicapa solo en imágenes de contenido.
- **Motion:** GSAP + ScrollTrigger + Lenis se cargan de forma diferida en la landing; el hero usa un chunk R3F/Three diferido con fallback PNG; Motion se carga en el wizard de reserva. `prefers-reduced-motion` desactiva el runtime y deja el contenido en flujo normal.
- **Assets oficiales:** `public/img/` contiene los PNG de `F:\Proyectos\hachi-greciaspa\Img`; `src/landing/asset-manifest.json` es la fuente única de rutas para storytelling, servicios, galería, logo y favicon.
- **Defaults evitados:** fondo crema con terracota y serif genérica, negro con neón, bento grids decorativos y animaciones de partículas.

## Evaluación de seguridad: React Router

La reevaluación de `npm audit --omit=dev` al 2026-08-09 reporta `0 vulnerabilities` con `react-router-dom@7.18.2`. La aplicación es una SPA y usa únicamente `BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useNavigate` y `useSearchParams`; no se encontraron APIs RSC ni server actions. ADR-007 conserva el contexto de la alerta anterior y la decisión de no ejecutar `npm audit fix --force`; la dependencia permanece fijada en `7.18.2` y el audit debe repetirse antes de producción.

## Estado de entrega

### MVP verificado

- Los clientes autenticados pueden leer el catálogo, solicitar sus propias reservas mediante la callable `createReserva`, verlas en el dashboard y cancelarlas. Firestore niega el `create` directo de `reservas`; la cancelación solo permite el cambio exacto de `status` a `cancelled` y las escrituras directas del cliente sobre `date`/`timeSlot` son denegadas.
- El cliente solicita el reagendado exclusivamente mediante la callable `rescheduleReserva`, que usa Admin SDK y es la autoridad para disponibilidad. Valida ownership, estado, fecha/hora futura en `America/Mexico_City` y conflictos de slots activos dentro de una transacción. El código está implementado localmente; el despliegue y la configuración de producción siguen pendientes.
- `createReserva` acepta solo `serviceId`, `date`, `timeSlot`, `mascotaId` y `notes`; Functions deriva identidad, servicio, duración, snapshots, `price: null`, `status: 'pending'` y `createdBy`. La transacción exige fecha futura en `America/Mexico_City`, servicio activo, mascota propia, máximo 10 reservas `pending`/`confirmed` y ausencia de solapamiento por duración.
- Los mensajes de contacto persisten en `mensajes`, con creación anónima y lectura/eliminación solo para admin.
- La galería se sirve mediante seis paths públicos estáticos y no depende de Cloud Storage.
- `firestore.rules` está cubierta por la suite actual: `74 passed, 0 failed`, con evidencia de que el cliente no puede crear directamente `reservas`, leer/escribir `bookingGuards` ni `bookingSlotGuards`, ni saltarse ownership, lectura propia, cancelación exacta o permisos admin. La validación del input, catálogo activo, email de identidad, snapshots, cuota, límite activo y disponibilidad pertenece a Functions; su suite reporta `159 passed, 2 skipped`, incluidos creación callable, solapamientos, reagendado, recordatorios obsoletos, confirmación por estado y pruebas de zona horaria. Esta es evidencia local fechada 2026-08-09 y no constituye verificación de producción.
- La inicialización de App Check está presente cuando se configura `VITE_FIREBASE_APP_CHECK_SITE_KEY` y se omite únicamente con `VITE_USE_FIREBASE_EMULATOR`; en Functions `enforceAppCheck` es obligatorio fuera de `FUNCTIONS_EMULATOR`. La configuración y el bypass exclusivo del emulador fueron verificados localmente; App Check Console fue confirmado por el operador el 2026-08-09, pero el rechazo productivo aún no está probado.

### Brechas de Fase 3

### Hardening local de creación de reservas — ADR-008

- `createReserva` está exportada desde Functions y el cliente la invoca mediante `httpsCallable`; no queda una segunda vía HTTP ni un `addDoc` de cliente para crear reservas.
- La transacción actualiza `bookingGuards/{uid}` con 3 intentos por ventana de 15 minutos. Auth/App Check se validan antes del handler; todo intento que llega al handler consume cuota, incluso si falla la validación del payload, el límite activo o la disponibilidad.
- El límite es de 10 reservas activas por usuario; solo `pending` y `confirmed` cuentan. Antes de consultar disponibilidad, `createReserva` lee `bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` y lo actualiza solo al crear la reserva. `rescheduleReserva` lee el mismo lock de destino antes de su consulta de conflictos y lo actualiza antes de aplicar el reagendado. El documento es server-only, determinista y se crea lazy.
- `rescheduleReserva` conserva `empleadoId` si el empleado sigue elegible y libre; lo limpia si el nuevo slot entra en conflicto. Usa el mismo helper y el mismo lock de destino que `createReserva`, antes de consultar conflictos y antes de actualizar la reserva.
- La disponibilidad consulta todos los activos del mismo `serviceId` y `date`, usa `durationMin` del catálogo y rechaza solapamientos. No existe un límite de documentos conocido para esa consulta; el lock serializa la carrera, pero no sustituye una futura estrategia de particionamiento o retención.
- La contención deliberada del lock queda acotada al servicio/día, como trade-off para soportar intervalos de duración variable sin imponer una migración de reservas existentes.
- La evidencia local cubre callable, cuota, límite activo, fecha futura, snapshots canónicos, ownership de mascota y concurrencia; no constituye evidencia de producción.
- **Gates productivos pendientes:** habilitar/verificar App Check en Firebase Console, configurar dominio y `RESEND_API_KEY` en Secret Manager para Resend, verificar el modo de notificación real/pronosticado y los destinatarios aprobados, configurar backups, observabilidad, desplegar con autorización explícita, revisar/probar rollback operativo y ejecutar browser QA contra producción. Cuenta de facturación, Blaze y budget están confirmados el 2026-08-09; los umbrales `10%/50%/100%` son visibles/confirmados; hora no informada por el operador; fuente: confirmación/captura del operador.

### T3.5 — Empleados y autoasignación local

- Ruta admin: `/dashboard/empleados`; agenda admin: `/dashboard/agenda`.
- `empleados/{id}` contiene `name`, `role`, `photoUrl`, `active`, `services[]` y `weeklyShifts`. La baja es lógica (`active: false`); no se borran empleados.
- `weeklyShifts` usa las claves `monday` a `sunday`. `morning` cubre 08:00–14:00, `afternoon` 14:00–20:00 y `full` 08:00–20:00.
- Seed local idempotente: `npm run seed:employees -- --emulator`. Requiere Auth/Firestore emulator y no usa cuenta de servicio en ese modo.
- Backfill dry-run local: `node tools/backfill-empleado-id.mjs --emulator`. Aplicación local: `node tools/backfill-empleado-id.mjs --emulator --apply`. El backfill solo agrega `empleadoId: null` a documentos legacy y nunca asigna empleados.
- `onReservaCreated` intenta asignar una reserva nueva y está configurada con retry. `assignPendingReservasForDate` permite a un admin reintentar la cola al cargar la agenda. `rescheduleReserva` conserva `empleadoId` si el empleado sigue elegible y libre; lo limpia si el nuevo slot entra en conflicto.
- La selección usa empleados activos que atienden el servicio, tienen turno compatible y no están ocupados por una reserva `pending` o `confirmed` solapada. `cancelled` y `completed` no bloquean. Sin candidato, `empleadoId` permanece `null` y la agenda muestra "Sin terapeuta asignado".
- Browser QA local verificó login, CRUD de empleados, agenda/filtros, creación/cancelación, reagendado con preservación/limpieza de `empleadoId`, retry de asignación posterior a cancelación y las rutas públicas de catálogo/contacto: `22 passed, 0 failed` contra emuladores; no se usaron credenciales ni datos productivos.
- No se ejecutó backfill productivo, no se desplegaron Functions y no se cambió configuración de producción en esta tarea.

- La integración de email transaccional, confirmación inmediata y recordatorios está implementada en `functions/`, pero no está configurada ni desplegada; el proveedor elegido está documentado en ADR-004 y no se usa ninguna credencial desde el frontend.
- La implementación local de creación callable ya aplica cuota, fecha futura y disponibilidad transaccional; el rechazo productivo de App Check, Secret Manager/Resend, modo de notificación real/pronosticado, destinatarios aprobados, deploy, rollback operativo y browser QA productivo siguen siendo gates antes de producción. La habilitación de App Check en Console fue confirmada por el operador el 2026-08-09; cuenta de facturación, Blaze y budget también están confirmados; hora no informada; fuente: confirmación del operador.
- El budget mensual de `$10` está confirmado para el proyecto `hachi-greciaspa`, con gasto observado `$0.00/$10.00` y umbrales visibles/confirmados en `10% ($1)`, `50% ($5)` y `100% ($10)`. La captura no demuestra el modo real/pronosticado ni los destinatarios aprobados. El budget es alert-only y no constituye un hard cap.
- La habilitación de App Check en Console está confirmada; la comprobación de rechazo de writes no autorizados en producción sigue pendiente. La suite del emulador de rules no prueba esa configuración de despliegue.
- La agenda y terapeutas tienen implementación local; la corrida estable de browser QA en emuladores ya pasó y permanecen pendientes el despliegue, la configuración operativa y el browser QA contra producción. Backups y observabilidad siguen siendo trabajo de Fase 3.
- `npm run qa:local` ejecuta browser QA autenticado y público contra emuladores con 22 casos: login por rol, CRUD de empleados, agenda/filtros, creación/cancelación, reagendado, retry de asignación posterior a cancelación, re-booking, catálogo de precios/servicios y contacto/WhatsApp. La última corrida registró `22 passed, 0 failed`; la corrida local no valida producción.
- La creación del navegador durante esa QA usa la callable real contra el Functions Emulator. El bypass de App Check es exclusivo del emulador y no prueba el rechazo de tokens ausentes o inválidos en producción.

## Servicios de pago: Firebase

Proyecto Firebase: `hachi-greciaspa` (ver `.firebaserc`). Plan documentado actualmente: **Blaze (pay-as-you-go), confirmado el 2026-08-09; hora no informada por el operador; fuente: confirmación/captura del operador**; la cuenta de facturación `Pago de Firebase` también está confirmada por el operador, sin registrar ID ni datos de pago.

### Estimación mensual (Blaze/pay-as-you-go)

| Servicio | Free tier | Uso estimado MVP | Costo |
|---|---|---|---|
| **Authentication** | 10k verificaciones/día, 50k SMS/mes (no usado) | ~50-200 usuarios activos | $0 |
| **Cloud Firestore** | 50k lecturas/día, 20k escrituras/día, 1 GiB almacenamiento | landing + dashboard + reservas: ~5k lecturas/día, ~100 writes/día | $0 |
| **Cloud Storage** | 5 GiB almacenamiento, 1 GB/día egress | no usado (declarado en firebase.ts pero sin callers) | $0 |
| **Hosting** | 10 GB almacenamiento, 360 MB egress/día | build estático < 5 MB | $0 |

**Costo mensual estimado del uso esperado en Blaze: `$0–3/mes`** — la evidencia local no genera consumo productivo. El uso medido esperado sigue siendo bajo, pero las lecturas/escrituras de cuota, snapshots, consultas de reservas e índices agregan consumo variable de Firestore. El budget mensual confirmado muestra `$0.00/$10.00`; sus umbrales son visibles/confirmados, el modo real/pronosticado y los destinatarios siguen pendientes, y no existe hard cap de facturación.

### Cuándo se excede el free tier (proyección)

| Servicio | Umbral | Cuándo se superaría |
|---|---|---|
| Firestore lecturas | 50k/día | ~500 usuarios activos/día cada uno viendo 100 docs |
| Firestore escrituras | 20k/día | solo si se meten writes masivos (analytics, logs) — no en scope |
| Firestore almacenamiento | 1 GiB | ~500k reservas acumuladas (cada doc ~2 KB) — años |
| Auth | 50k SMS/mes | solo si se habilita phone auth (no en scope) |

Conclusión: Authentication, Firestore, Storage y Hosting sin Functions pueden
permanecer dentro de sus cuotas Spark al ritmo estimado. La callable y cualquier
otra Cloud Function requieren una cuenta de facturación asociada y Blaze para producción, por lo que el
producto completo no puede considerarse Spark-only. El riesgo adicional es una
viralidad inesperada o logs mal diseñados; existe una alerta de budget, pero no es un hard cap.

### Costos en Blaze (pay-as-you-go)

Si se supera el free tier:
- Firestore: $0.036 por 100k lecturas, $0.108 por 100k escrituras, $0.108/GB-mes.
- Auth: SMS Authenticate $0.01 por usuario (solo si phone auth).
- Estimación post-pago del uso MVP esperado: **$0–3/mes**. Escenarios de mayor escala pueden superar esta cifra.

No hay plan de precio fijo wildcard — puro pay-as-you-go.

### Cuotas de referencia

Firebase Spark:

| Servicio | Cuota de referencia |
|---|---|
| Auth | 50,000 MAU; ~10,000 verificaciones telefónicas/mes |
| Firestore | 1 GiB; 50,000 lecturas/día; 20,000 escrituras/día; 20,000 borrados/día |
| Realtime Database | 1 GiB; 100 conexiones simultáneas; 10 GB de descarga/mes |
| Hosting | 10 GB de almacenamiento; 360 MB/día de transferencia (~10 GB/mes) |

Cloud Functions requiere una cuenta de facturación asociada y Blaze para producción; la cuota gratuita estimada es de ~2 millones de invocaciones/mes y no elimina el requisito de Billing. Estas cuotas son un baseline operativo y deben verificarse contra la consola y precios vigentes antes de producción.

La creación callable no agrega un proveedor de rate limiting. Por invocación que
supera Auth y App Check, Firestore puede leer/escribir `bookingGuards/{uid}` y,
si continúa el flujo, leer catálogo, perfil, mascota opcional y reservas activas
antes de escribir la reserva canónica. Los índices `userId + status` y
`serviceId + date + status` también tienen costo de almacenamiento y
mantenimiento. El rango final depende de volumen y reintentos; no está verificado
en producción.

Cada creación o reagendado valido agrega una lectura y una escritura de
`bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}`. Las fallas de
negocio pueden leer el lock sin escribirlo; las transacciones reintentadas
pueden repetir lecturas y escrituras. El costo adicional es variable y no
constituye una proyección ni una autorización de facturación.

### Cloudflare R2 — opción futura

R2 no está integrado actualmente; la galería usa paths estáticos. Si se migra a almacenamiento de objetos:

| Concepto | Cuota de referencia |
|---|---:|
| Almacenamiento | 10 GB/mes |
| Operaciones Clase A | 1,000,000/mes |
| Operaciones Clase B | 10,000,000/mes |
| Egress | $0 |

Fuera de cuota: `$0.015/GB-mes` de storage, `$4.50/millón` de operaciones Clase A y `$0.36/millón` de operaciones Clase B. La migración requiere decisión, configuración de credenciales y revisión de costos antes de implementarse.

## Email transaccional Fase 3

Proveedor recomendado: **Resend**. Fallback operativo: **Postmark**. Estado: integración implementada en `functions/`; cuenta, secreto, dominio, backups, observabilidad y despliegue todavía no están configurados/verificados. Cuenta de facturación, Blaze y budget están confirmados el 2026-08-09; umbrales visibles/confirmados en `10%/50%/100%`; modo real/pronosticado y destinatarios pendientes; hora no informada por el operador; fuente: confirmación/captura del operador.

Baseline de planificación: **900 recordatorios/mes**. El costo del proveedor de email se mantiene separado del costo de Firebase Functions/Blaze:

| Proveedor | Plan y costo de email en 900/mes | Functions/Blaze separado | Total de planificación |
|---|---:|---:|---:|
| Resend | Free: $0 (3,000/mes; 100/día) | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $0-3 |
| Postmark | Basic: $15/mes (10,000 incluidos) | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $15-18 |
| SendGrid | Essentials desde $19.95/mes | $0 de uso medido estimado; Blaze requerido; reserva incidental $0-3 | $19.95-22.95 |

Para 900 ejecuciones mensuales, Functions queda dentro de las cuotas sin costo publicadas en Blaze. Blaze está activo y es obligatorio para desplegar Functions aunque el uso medido estimado sea bajo. **Umbrales de budget: visibles/confirmados** para `hachi-greciaspa` en `10%`, `50%` y `100%`; el modo real/pronosticado y los destinatarios aprobados siguen pendientes. Las alertas no imponen un límite duro de facturación.

El contrato de implementación está en ADR-004: `RESEND_API_KEY` en Firebase Secret Manager, caller exclusivo en Firebase Functions, máximo tres retries con backoff acotado y registro sanitizado de fallas permanentes. Recordatorios y confirmaciones usan estados separados (`recordatorios` y `confirmaciones`) y no modifican reservas cuando el proveedor falla. El código de integración está implementado; todavía no hay credenciales, dominio ni despliegue configurados.

## Hallazgo de costo

### COST-1 — Budget y umbrales visibles, verificación de notificaciones pendiente (severidad BAJA)

**Qué:** El operador confirmó en Google Cloud Console un budget mensual de `$10` para el proyecto `hachi-greciaspa`, con gasto observado `$0.00/$10.00`, alcance de proyecto y alertas `10% ($1)`, `50% ($5)` y `100% ($10)`. La cuenta `Pago de Firebase` y Blaze también fueron confirmados, sin registrar IDs ni datos de pago.

**Impacto residual:** Con Blaze activo, un evento imprevisto (loop infinito de un Cloud Function, query sin límite disparada por un bot, abuso del storage) puede generar facturación variable. Los umbrales visibles no demuestran por sí solos el modo de notificación ni los destinatarios; las alertas, cuando estén verificadas, nunca serán un hard cap ni evitarán cargos adicionales.

**Estado:** budget y umbrales visibles confirmados por el operador el 2026-08-09; hora no informada por el operador; fuente: confirmación/captura del operador. Pendiente verificar el modo de gasto real/pronosticado y los destinatarios aprobados. El budget es alert-only: las alertas notifican, pero no imponen un límite duro de facturación.

## Servicios externos

| Servicio | Estado | Cuándo se consideraría |
|---|---|---|
| Email transaccional (Resend; Postmark fallback) | Código implementado en `functions/`; no configurado/desplegado | Verificación de dominio, secreto y despliegue de recordatorios/confirmaciones |
| App Check con reCAPTCHA v3 | Código integrado; Console confirmada por el operador; rechazo/enforcement productivo pendiente | Probar rechazo de invocaciones sin token válido |

## Limpieza de servicios sin uso

Tras Fase 1 (M6) + Fase 2 (T2.7):
- ✅ Removidos: axios, react-calendar, zustand, react-hook-form, react-hot-toast — ninguno importado en código.
- ✅ Removido: `firebaseStorage` init de `firebase.ts` y storage emulator de `firebase.json` (ADR-003: galería usa paths estáticos).

## Pendientes técnicos conocidos (cross-ref tasks.md)

- `tasks.md` T2.1-T2.8 — cierre documentado con deuda residual y sub-items pendientes.
- `AUDITORIA.md` H4 — integración App Check y Console confirmadas; rechazo/verificación productiva pendiente.
- `AUDITORIA.md` M2 — dashboard con datos reales implementado para reservas y métricas básicas.
- H1 (npm audit): las tres auditorías fueron ejecutadas el `2026-08-07` y tienen alcances distintos: full client `npm audit --audit-level=high`: 15 vulnerabilidades (`11 moderate`, `4 high`); client `npm audit --omit=dev`: `0 vulnerabilities`; Functions `npm --prefix functions audit --omit=dev`: `7 moderate`. Estas cifras conservan sus comandos y alcances originales.
