# Fase 3 — Backlog Post-MVP

> **Estado al 2026-08-04:** El proyecto está en transición operativa. La implementación local de recordatorios está en el código y Resend es el proveedor primario documentado; la configuración de producción sigue pendiente.
>
> **Evidencia local al 2026-08-06:** client `81 passed`; `tsc --noEmit` y build del cliente verdes; rules `62 passed, 0 failed`; Functions `99 passed, 2 skipped`; typecheck y build de Functions verdes. Esta evidencia no constituye verificación de producción.
>
> **Pendiente de verificación externa:** rollback, autorización de producción, dominio, `RESEND_API_KEY`, billing, budget alert, despliegue y browser QA.

Creado por Cronos el 2026-07-31, después del cierre de Fase 2 (MVP funcional completo, build y tests verdes).

---

## Objetivos de la fase

Convertir el MVP funcional en un producto **operable por el spa real**:
1. Reducir trabajo manual del administrador (automatizar recordatorios, gestión de agenda).
2. Abrir la operación a múltiples terapeutas y sucursales.
3. Mejorar UX del cliente (re-booking rápido, historial de mascotas, notificaciones).
4. Endurecer para producción (performance, observabilidad, backup, budget alerts).

## Definición de "Hecho" (igual que Fase 2)

1. `npx tsc --noEmit` sin errores nuevos.
2. `npm run build` verde.
3. `npm run rules:test` verde (o se agregan tests).
4. No introduce `style={{}}` inline.
5. Resuelve los campos del AC.
6. Documenta cambios en `docs/SCHEMA.md` o `docs/STACK.md` si aplica.

---

## Tracks

### Track A — Operación del spa (alto valor, bloqueante para producción)

#### T3.1 — Recordatorios por email (24h antes de la cita)
**Por qué:** Sin recordatorios, el índice de no-shows del spa sube. Es la única automatización que paga el MVP en el primer mes.

**AC:**
- [x] Colección `recordatorios/{id}` con estado (`pending`, `sent`, `failed`) y `reservaId` FK.
- [x] Cloud Function `scheduledSendReminders` (cron cada hora vía Cloud Scheduler) que:
  1. Lee reservas confirmadas con `date + timeSlot` entre 23h y 25h en el futuro.
  2. Genera email HTML mediante Resend; el proveedor primario está documentado en T3.2.
  3. Actualiza el estado de `recordatorios` a `sent` o `failed` con error.
- [x] Template de email en `functions/templates/reminder.html` con datos de la reserva.
- [ ] Documentar en `docs/adr/ADR-005-cron-recordatorios.md` la decisión de cron cada hora vs cron diario a las 18:00; este ADR de frecuencia queda pendiente hasta su creación.
- [ ] Configurar el secreto backend `RESEND_API_KEY` en Firebase Secret Manager.

**Refs:** `firestore.rules` (nueva colección), `docs/STACK.md` "Email transaccional — Fase 3".

---

#### T3.2 — Elegir proveedor de email transaccional (ADR-004) ✅ Decisión documentada
**Por qué:** Resend como proveedor primario, Postmark como fallback operativo y SendGrid como alternativa evaluada. La decisión precede la operación de T3.1.

**AC:**
- [x] ADR en `docs/adr/ADR-004-proveedor-email.md` con matriz: precio (hasta 100k emails/mes), deliverability, facilidad de integración con Firebase Functions, soporte de templates.
- [x] Decisión: Resend como proveedor primario y Postmark como fallback operativo; SendGrid no es preferido para este workload pequeño.
- [ ] Configurar la cuenta, verificar el dominio del spa y crear `RESEND_API_KEY` en Firebase Secret Manager.
- [x] Actualizar `docs/STACK.md` tabla de "Servicios externos".

**Refs:** `docs/STACK.md` líneas 78-92.

---

#### T3.3 — Cancelación libre del cliente + reagendado ✅ Implementado localmente
**Por qué:** El cliente necesita corregir una cita propia sin editar datos sensibles ni ocupar un slot ya reservado.

**AC implementados:**
- [x] Hardening de `firestore.rules`: el dueño solo puede cancelar con el cambio exacto `status -> 'cancelled'`; las escrituras directas del cliente sobre `date`/`timeSlot` están denegadas y no son una vía de reagendado.
- [x] Controles en `DashboardPage`: cancelar reservas propias `pending`/`confirmed` y mostrar reagendado solo para reservas propias `pending` con fecha futura.
- [x] Validación server-side en la callable `rescheduleReserva`: usa Admin SDK, autentica y valida ownership/estado, fecha y hora futuras en `America/Mexico_City`, y es la autoridad para rechazar slots activos ocupados dentro de una transacción.
- [x] Tests (evidencia local fechada 2026-08-06; no verificación de producción): reglas (`62 passed, 0 failed`), Functions (`99 passed, 2 skipped`) y cliente (`81 passed`) para ownership, estados, allowlists, conflictos de slot y mapeo de errores.

**Operación separada, no completada por esta tarea:** desplegar la callable, configurar producción y verificar el comportamiento en el entorno desplegado.

**Refs:** `docs/SCHEMA.md`, `docs/adr/ADR-002-cancelacion-cliente.md`, `firestore.rules:37-60`.

---

#### T3.4 — Vista "agenda del día" para admin
**Por qué:** El admin Harold hoy ve "todas las reservas" mezcladas. Para operar el spa necesita vista por día/semana con huecos libres.

**AC:**
- [x] Nueva sección en `DashboardPage` (o ruta `/dashboard/agenda`) con:
   1. Selector de fecha.
   2. Vista timeline horizontal (eje X = horas del día operativo 08:00–20:00).
   3. Bloques por reserva (color por status).
   4. Click en bloque → drawer con detalles + acciones (confirmar, cancelar, marcar completed).
- [x] Acción "Marcar completed" — solo admin, status `completed` después de la cita.
- [x] Filtros por servicio y por terapeuta (preparado para T3.5).

**Verificación de implementación:** `src/pages/DashboardAgenda.tsx` contiene la ruta operativa, timeline, drawer accesible y filtros. La validación visual E2E de navegador continúa pendiente como gate independiente de release.

**Refs:** `src/pages/DashboardPage.tsx`, `src/pages/DashboardAgenda.tsx`, `src/services/agenda.ts`, `docs/SCHEMA.md` `reservas`.

---

#### T3.5 — Gestión de terapeutas (colección `empleados`)
**Por qué:** La colección `empleados` ya existe en rules pero sin UI. El spa tiene al menos 3 personas (Harold, Daniela, Alberto en `/equipo`) que pueden ser groomers con agenda.

**AC:**
- [x] UI admin: lista, alta, baja lógica y edición de empleados (`/dashboard/empleados`).
- [x] Campos: `name`, `role` (groomer/bañador/cuidador), `photoUrl`, `active`, `services[]` y `weeklyShifts`.
- [x] Vincular `reservas.empleadoId` y documentar que solo Functions/Admin SDK puede asignarlo.
- [x] Seed idempotente de Harold, Daniela y Alberto mediante `npm run seed:employees -- --emulator`.
- [x] Turnos recurrentes: siete claves semanales; `morning` 08:00–14:00, `afternoon` 14:00–20:00 y `full` 08:00–20:00.
- [x] Asignación automática: `onReservaCreated` con retry y `assignPendingReservasForDate` para la cola; selecciona el primer empleado elegible y no pisa asignaciones existentes.
- [x] Filtrado de solapamientos: solo reservas `pending`/`confirmed` ocupan al empleado; `cancelled`/`completed` no bloquean.
- [x] Filtro "por terapeuta" en la agenda, incluyendo "Sin terapeuta".
- [x] Cola "Sin terapeuta asignado" para reservas sin candidato elegible.
- [ ] Backfill opcional e idempotente de legacy: el comando está documentado, pero esta tarea no lo ejecutó ni contra emulador ni contra producción.
- [ ] Browser QA completo del reagendado en emulador: la nueva tentativa de preservación y limpieza por conflicto quedó interrumpida cuando el proceso de emuladores terminó y el navegador recibió `ERR_CONNECTION_REFUSED`.
- [ ] Browser QA completo del retry posterior a cancelación: la repetición no alcanzó el flujo porque el mismo proceso de emuladores terminó; el gate permanece pendiente.
- [ ] Despliegue, backfill productivo, configuración productiva y browser QA contra producción.

**Verificación local fechada 2026-08-06:** client `81/81`; rules `62 passed, 0 failed`; Functions `99 passed, 2 skipped`; typecheck y builds verdes. La QA previa contra emuladores verificó autorización no-admin, CRUD admin, persistencia de servicios/turnos tras reload, asignación inicial, salto por conflicto, cola, filtros de agenda y scroll horizontal móvil. La repetición de esta ola para retry post-cancelación y reagendado no pudo ejecutarse hasta completar porque el proceso de emuladores terminó y el navegador recibió `ERR_CONNECTION_REFUSED`; ambos gates quedan pendientes.

**Refs:** `docs/SCHEMA.md` `empleados`, `firestore.rules` `empleados`.

---

### Track B — UX del cliente (medio valor, reduce fricción)

#### T3.6 — "Mis mascotas" — perfil por mascota con historial
**Por qué:** El cliente agenda para "Hachi" o "Grecia" (los perros del spa, según el nombre). Hoy no hay forma de decir "esta cita es para Hachi, raza Yorkshire, 4kg".

**AC:**
- [x] Nueva colección `mascotas/{id}` (user-owned: `userId == auth.uid`).
- [x] Schema: `name`, `breed`, `weightKg`, `birthDate` (opcional), `notes` (alergias, temperamento), `photoUrl` (opcional).
- [x] UI en `/dashboard/mascotas`: CRUD de mascotas del usuario autenticado.
- [x] Vincular `reservas.mascotaId` (nuevo campo, opcional — si null, reserva genérica).
- [x] Al reservar, paso previo: "¿para qué mascota?" + selector (si hay) o "agregar nueva".
- [x] Historial: en perfil de mascota, lista de reservas pasadas con servicio y fecha.

**Verificación local:** rules owner-only y vínculo de reserva cubiertos por `tools/firestore-tests/run-rules-tests.mjs`; validación de entrada y servicio cubiertos por `src/services/mascotas.test.ts`. Browser QA permanece pendiente como gate separado.

**Refs:** `docs/SCHEMA.md` (nueva colección).

---

#### T3.7 — Re-booking rápido ("reservar de nuevo")
**Por qué:** Después de la primera cita exitosa, el 60% de clientes repiten el mismo servicio. Hoy tienen que volver a elegir servicio+fecha+hora.

**AC:**
- [x] En `DashboardPage`, en cada reserva `status='completed'`, botón "Reservar de nuevo" que pre-rellena el formulario de `Reservar.tsx` con los datos.
- [x] Query param en URL: `/reservar?service=X&timeSlot=Y&date=Z` (R3.3 ya planificó algo similar).
- [ ] Tests E2E: cliente reserva, completa cita, re-reserva desde dashboard.

**Verificación local:** el parser seguro de query params está cubierto por `src/services/bookingPrefill.test.ts`; el E2E visual permanece pendiente por falta de Playwright habilitado en este entorno.

**Refs:** `src/pages/Reservar.tsx`, `DashboardPage.tsx`.

---

#### T3.8 — Confirmación de cita por email al cliente
**Por qué:** Complemento de T3.1 (recordatorio). Diferencia: T3.1 es 24h antes; este es inmediato al reservar.

**AC:**
- [x] Cloud Function `onReservaConfirmationCreated` trigger (`functions/src/onReservaConfirmationCreated.ts`), independiente del trigger de asignación `onReservaCreated`.
- [x] Envía email con resumen y enlace al dashboard `/dashboard`; la reserva no se cancela si el proveedor falla.
- [x] Idempotente: si la reserva se actualiza (no se crea nueva), no reenviar; usa `confirmaciones/{reservaId}` y clave determinística de Resend.
- [x] Variables de plantilla: nombre del cliente, servicio, fecha, hora y enlace al dashboard.

**Verificación local:** 62 casos de rules, 99 tests de Functions (2 skips existentes), 81 tests de cliente, typecheck y build pasan. La configuración de Resend, dominio, Secret Manager, Billing/Blaze, despliegue y browser QA permanecen pendientes como gates operativos.

**Refs:** T3.1 (mismo proveedor), T3.3 (link cancelación).

---

### Track C — Producción / escala (bajo valor inicial, alto cuando crece)

#### T3.9 — Bundle splitting + performance audit
**Por qué:** `dist/assets/firebase-P_3knSDz.js = 349 KB` (106 KB gzip). Firebase Auth+Firestore pesan. Code splitting ya está en landings pero no en admin.

**AC:**
- [x] Lazy load `firebase.ts` solo cuando se necesita: route splitting existente; Firebase no es import estático del entry público.
- [x] Auditoría de bundle y tree-shaking documentada en `docs/PERFORMANCE.md`.
- [ ] Medir con Lighthouse / WebPageTest antes y después — pendiente por falta de browser QA habilitado.
- [x] Verificar que los imports de `firebase/auth`, `firebase/firestore` y `firebase/functions` son modulares.
- [ ] Considerar migrar de `moduleResolution=node10` a `bundler` (warning TS 7.0).

**Verificación local:** el baseline muestra `index` en 235.99 kB (75.91 kB gzip), CSS global en 86.64 kB (16.71 kB gzip) y `firebase` en 359.01 kB (109.95 kB gzip). No se dividió adicionalmente `firebase.ts` porque la landing ya evita descargarlo y no existe medición de red por ruta que justifique mayor complejidad. FCP/LCP siguen pendientes de Lighthouse/WebPageTest.

**Refs:** `vite.config.ts`, `docs/STACK.md` línea 10, build output actual.

---

#### T3.10 — Budget alerts en Google Cloud Console (COST-1)
**Por qué:** STACK.md COST-1 documentó que no hay alerta de facturación. Sin esto, cualquier bug en Cloud Functions puede generar costos sin aviso.

**AC:**
- [ ] Crear budget en Google Cloud Console: alerta email a $1, $5, cap a $10.
- [ ] Documentar en `docs/STACK.md` que se configuró (link al budget).
- [ ] Si se migra a Blaze para Functions de T3.1, este paso es bloqueante, no opcional.

**Refs:** `docs/STACK.md` líneas 55-63 (COST-1).

---

#### T3.11 — Backups automáticos de Firestore
**Por qué:** Si Harold borra accidentalmente todas las reservas desde el dashboard, hoy no hay forma de recuperarlas. El proyecto es la fuente de verdad operacional del spa.

**AC:**
- [ ] Configurar export programado a Cloud Storage (GCS): `gcloud firestore export` diario vía Cloud Scheduler.
- [ ] Bucket `gs://hachi-greciaspa-backups/` con lifecycle de 90 días.
- [x] Documentar en `docs/RUNBOOK.md` cómo restaurar toda la base Firestore desde un backup (procedimiento, no script automático).
- [ ] Verificar primer export manual después de configurar.

**Verificación local:** el runbook documenta exportación y restauración total de Firestore, alcance, IAM/lifecycle, contención y rollback no destructivo. Bucket, Scheduler, Billing/Blaze y primer export siguen pendientes de configuración y evidencia externa.

**Refs:** operación, no código.

---

#### T3.12 — Observabilidad: logs de plataforma, sin proveedor externo
**Por qué:** Cloud Functions necesita diagnóstico operativo cuando se habilite en producción, pero el proyecto no debe incorporar un SDK de monitoreo externo sin aprobación de privacidad, costo y proveedor.

**AC:**
- [x] Decidir no integrar Sentry ni otro SDK externo en el frontend.
- [ ] Cloud Functions: revisar y normalizar logs estructurados a Cloud Logging antes del despliegue.
- [ ] Configurar alerta en Cloud Monitoring para errores de Functions > 5/min.
- [ ] Definir política de datos para logs sin emails, passwords, tokens ni payloads sensibles.

**Estado:** no hay observabilidad externa integrada ni credenciales nuevas. La configuración de Cloud Logging/Monitoring sigue siendo un gate operativo de producción.

---

### Track D — Mejoras regulatorias / a largo plazo

#### T3.13 — Política de privacidad y términos (RGPD / LFPDPPP México)
**Por qué:** México tiene Ley Federal de Protección de Datos Personales (LFPDPPP). Si el spa tiene clientes reales, necesita aviso de privacidad visible.

**AC:**
- [ ] Páginas `/privacidad` y `/terminos` con textos base (plantilla adaptable).
- [ ] Checkbox de aceptación en `Register.tsx` con link a ambos.
- [ ] Almacenar `acceptedAt` Timestamp en `users/{uid}` para evidencia.
- [ ] Link en footer (hoy apuntan a `#`).

**Refs:** `Register.tsx`, footer links.

---

#### T3.14 — Roles intermedios (groomer, bañador)
**Por qué:** Hoy solo hay `client` y `admin`. Un groomer necesita ver SU agenda pero no la de otros ni editar precios.

**AC:**
- [ ] Ampliar `users/{uid}.role` con `'groomer' | 'bañador'`.
- [ ] Reglas: groomer puede leer `reservas` filtradas por `empleadoId == self` (no las de otros).
- [ ] UI: dashboard específico para groomers con su agenda del día.
- [ ] Custom claims: `groomer: true` en el token, además del role en Firestore.

**Refs:** `docs/SCHEMA.md` `users`, `firestore.rules`.

---

#### T3.15 — Múltiples sucursales (multi-tenant)
**Por qué:** Solo si el spa abre una segunda ubicación. **Bajo** porque es especulativo.

**AC:**
- [ ] Evaluar primero si es realmente necesario (YAGNI).
- [ ] Si sí: colección `sucursales/{id}`, campo `sucursalId` en `reservas`, ruteo por subdominio o path.

**Refs:** — Speculative.

---

## Orden de ejecución recomendado

```
Track A (operación):
  T3.2 (proveedor email) ──► T3.1 (recordatorios)
  T3.3 (cancelación cliente) ──► T3.4 (agenda admin) ──► T3.5 (empleados)

Track B (UX cliente): T3.6 (mascotas), T3.7 (re-booking), T3.8 (confirmación email)
  └─ paralelo a Track A

Track C (producción): T3.10 (budget) ──► T3.12 (observabilidad) ──► T3.9 (perf) ──► T3.11 (backups)

Track D (largo plazo): T3.13 (privacidad) cuando se lance a usuarios reales
                        T3.14, T3.15 según necesidad
```

## ADRs por crear

- `ADR-004-proveedor-email.md` — T3.2.
- `ADR-005-cron-recordatorios.md` — T3.1 (frecuencia del job).
- `ADR-006-backups-firestore.md` — T3.11 (frecuencia y retención).

## Estimación de costo incremental

| Track | Costo mensual estimado |
|---|---|
| A (Resend + Functions) | $0 de email en el baseline de Resend; Functions requiere Blaze y su costo operativo sigue pendiente de verificación |
| B (sin nuevos servicios) | $0 |
| C (sin proveedor externo) | $0 incremental; backups < 1 GB = $0 |
| D | $0 |

**Si se migra a Blaze por uso de Cloud Functions**: budget de $10/mes configurado vía T3.10.

## Fuera de alcance de Fase 3

- App móvil nativa (PWA suficiente hasta 1k usuarios activos).
- Pasarela de pagos (decidido no incluir en el proyecto — sin T3.x de pagos).
- Marketplace de terceros / integraciones con veterinarias.
- Multi-idioma (solo español por ahora).
- Reportes avanzados / business intelligence (Metabase, Looker).
