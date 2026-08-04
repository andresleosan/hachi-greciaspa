# Fase 2 — Backlog MVP funcional ✅ CERRADA

**Estado:** cerrada el 2026-07-31. El MVP quedó implementado y verificado; las casillas reflejan el soporte actual de código y pruebas (`41/41` reglas; Functions: `46 passed`, `2 skipped`).

**Siguiente:** ver [`Fase3.md`](./Fase3.md) para backlog post-MVP.

---

Creado por Cronos el 2026-07-31, después del cierre de Fase 1 (hardening + verificación: build, tsc y `npm run rules:test` verdes, 23/23 PASS; bug de escalación N1 resuelto).

---

## Objetivos de la fase

Convertir el sitio actual (landing + login + dashboard admin sin datos) en un **MVP funcional de reservas de spa**: un cliente puede entrar, ver servicios, agendar una cita y verla reflejada en su dashboard; un admin puede ver y gestionar todas las reservas.

## Definición de "Hecho" (Definition of Done)

Una tarea está completa solo cuando:
1. Código TypeStrict (pasa `npx tsc --noEmit` sin errores nuevos).
2. `npm run build` verde.
3. `npm run rules:test` sigue verde (o se agregan tests para nuevas reglas).
4. No introduce `style={{}}` inline (regla de AGENTS.md).
5. Resuelve los campos del AC listados en la tarea.

---

## Deuda residual

- **Race condition de doble reserva:** aceptada en ADR-001; la validación client-side es best-effort y dos clientes concurrentes todavía pueden escribir el mismo slot. El admin debe resolver el caso excepcional manualmente.
- **Cancelación y reagendado (T3.3):** `firestore.rules` permite al propietario cancelar solo con el cambio exacto de `status` a `cancelled`; las escrituras directas del cliente sobre `date`/`timeSlot` son denegadas. El cliente usa exclusivamente la callable `rescheduleReserva`, que usa Admin SDK y es la autoridad server-side para fecha/hora futura y disponibilidad del slot.
- **Enlaces `href="#"`:** permanecen en `Footer.tsx` y en algunas llamadas a la acción de `LandingNueva.tsx`; quedan para la operación de privacidad/términos y navegación de Fase 3.
- **Estilos inline:** permanecen en `LandingNueva.tsx`, `App.tsx`, `NotFound.tsx`, `Precios.tsx` y `Register.tsx`; la limpieza completa queda pendiente.

---

## Tareas priorizadas

### T2.1 — Schema y tipo `Reserva` (bloqueante)
**Por qué:** Nada puede construirse sobre `reservas` sin conocer su contrato. `DashboardPage.tsx` ya lee campos implícitos (`userId`, `serviceName`, `userName`, `date`, `createdAt`) — hay que formalizarlos.

**AC:**
- [x] Crear `src/types/reserva.ts` con interfaz `Reserva` (ver AC de schema abajo).
- [x] Crear `src/types/index.ts` barrel export (también mueve `PriceItem` allí para desduplicar el tipo duplicado en `PricesList.tsx:5` y `AdminPrices.tsx:14`).
- [x] Actualizar `DashboardPage.tsx` para consumir `Reserva` donde hoy usa `any`.
- [x] Documentar schema en `docs/SCHEMA.md` (colecciones: `reservas`, `users`, `servicios`, `precios`, `empleados`).

**Schema `Reserva` (consenso):**
```ts
interface Reserva {
  id: string                    // doc id
  userId: string               // auth.uid del cliente
  userName: string | null       // snapshot del displayName al crear
  userEmail: string | null      // snapshot del email
  serviceId: string             // FK a servicios/{doc}
  serviceName: string           // snapshot del nombre del servicio
  price: number | null          // snapshot del precio en el momento de reservar
  date: string                  // ISO date "YYYY-MM-DD"
  timeSlot: string              // "HH:mm" 24h
  durationMin: number           // duración estimada
  notes: string | null          // comentarios del cliente
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: Timestamp          // serverTimestamp()
  createdBy: 'client' | 'admin' // qué flujo originó la reserva
}
```

**Refs:** `firestore.rules:37-60` (regla `reservas`), `DashboardPage.tsx:34-58`, AUDITORIA.md M5 (índice compuesto userId+createdAt ya en `firestore.indexes.json`).

---

### T2.2 — Catálogo de servicios real (bloqueante)
**Por qué:** `Servicios.tsx` y `Precios.tsx` leen de Firestore (`servicios`, `precios`); el seed idempotente mantiene datos de catálogo para que el flujo de reserva tenga servicios que listar.

**AC:**
- [x] Crear `tools/seed-services.mjs` que, vía Admin SDK o emulador, pueble `servicios` con los servicios reales del spa (usar los textos que ya están en `LandingNueva` y seeds actuales).
- [x] Poblar `precios` con los mismos servicios (ya hay docs de `AdminPrices.tsx` definiendo el schema `PriceItem`).
- [x] Documentar en `docs/README-firebase.md` cómo correr el seed.
- [ ] Verificar: `npm run dev` con emulador → `/servicios` y `/precios` muestran datos.

**Refs:** `src/components/PricesList.tsx`, `src/components/AdminPrices.tsx`, `src/pages/Servicios.tsx`, `LandingNueva`.

---

### T2.3 — Flujo de reserva pública (feature central)
**Por qué:** Es el flujo central del MVP. `Reservar.tsx` crea reservas para clientes autenticados y `DashboardPage` las muestra según el rol.

**AC:**
- [x] Crear página `src/pages/Reservar.tsx` con flujo multi-paso:
  1. Selecciona servicio (lista desde `servicios`).
  2. Selecciona fecha (calendar día próximo) + slot horario.
  3. Confirma datos (nombre, email, notas).
  4. Submit → `addDoc(collection(db,'reservas'), payload)` con role cliente.
- [x] Proteger el submit: solo usuarios autenticados pueden reservar. Si no logueado, `ProtectedRoute` redirige a `/login?next=/reservar`.
- [x] Hook de validación: slot disponible (no doble-booking para mismo serviceId+date+timeSlot). **Decisión implementada (ADR-001):** validación client-only best-effort; la race condition queda aceptada para el MVP.
- [x] Hook `ServiceCard.tsx` "Reservar" → `<Link to="/reservar?service=ID">` en lugar de `href="#"`.
- [x] En `Header.tsx` agregado CTA "Reservar cita" que apunta a `/reservar`.
- [x] Ruta nueva en `App.tsx`.
- [x] Test de regla: cliente no puede reservar para otro `userId` (cubierto por `user cannot create reserva for another user` en la suite actual).

**Refs:** `src/components/ServiceCard.tsx`, `src/pages/Servicios.tsx`, `firestore.rules:37-60`, `src/services/firebase.ts` (firebaseDb).

---

### T2.4 — Perfil de usuario y mis reservas
**Por qué:** Tras reservar, el cliente no tiene dónde ver SUS reservas. Hoy `DashboardPage` mezcla todo; falta una vista "mis citas".

**AC:**
- [x] En `DashboardPage` (o nueva sub-ruta `/dashboard/citas`), mostrar listado de reservas del usuario filtradas por `userId == auth.uid`.
- [x] Estados visuales por `status` (pending=amarillo, confirmed=verde, cancelled=rojo).
- [x] Acción "Cancelar reserva" disponible para `status='pending'|'confirmed'` del propio usuario. **Decisión implementada (ADR-002/T3.3):** la cancelación solo permite el cambio exacto `status='cancelled'`; el reagendado de reservas `pending` solo permite `date` y `timeSlot` y delega la disponibilidad a la callable.
- [x] Hook de fetching con `useAuth().user.uid`.

**Refs:** `DashboardPage.tsx:34-58`, `firestore.rules:44-60`.

---

### T2.5 — Persistencia de mensajes de contacto
**Por qué:** `Contacto.tsx` hoy es `action="#"`, los mensajes se pierden. Gap de MVP si el spa usa el form para consultas.

**AC:**
- [x] Colección `mensajes` en Firestore.
- [x] Regla en `firestore.rules`: `allow create: if true` (cualquiera, sin login), deny read write a todos excepto admin.
- [x] `Contacto.tsx`: hook `onSubmit` → `addDoc(collection(db,'mensajes'), { name, email, message, createdAt: serverTimestamp() })`.
- [x] Feedback visual de éxito / error (sin `react-hot-toast` si fue removido por M6 — usar `.field-error` + texto inline).
- [x] Test de regla: guest puede crear `mensajes`, no puede leer ni escribir otros.

**Refs:** `src/pages/Contacto.tsx`, `AUDITORIA.md M6` (re razastreamiento).

---

### T2.6 — Correcciones de frontend-craft (no bloqueantes pero recomendadas)
Estas son las inconsistencias de la Fase 1 que conviene cerrar para evitar deuda visual.

**AC:**
- [ ] Quitar inline styles de `ServiceCard.tsx:15,27` e `Inicio.tsx:38` (`LandingNueva.tsx` también revisar). Pasar a `src/styles/maqueta.css`.
- [x] Agregar clases faltantes en `maqueta.css`: `.btn-danger` (referenciado en `AdminPrices.tsx:94`) y `.field-error` (referenciado en `Login.tsx:53`, `Register.tsx:73`, `DashboardPage.tsx:140`).
- [x] Eliminar `src/pages/Inicio.tsx` (no referenciado en `App.tsx` — la ruta `/inicio` redirige a `/`). Reducir confusión.
- [x] Decidir sobre el redirect de `Register.tsx:41` (`/register → /dashboard` contradice AGENTS.md) — alinear docs o revertir ese redirect (debería ir a `/login`).

**Refs:** AGENTS.md("Notable"), `Register.tsx:41`.

---

### T2.7 — Galería mínima funcional
**Por qué:** `Galeria.tsx` es una tile vacía. El spa tiene fotos reales (ver `tl.png`, `tr.png`, etc. en raíz, y `src/public/`).

**AC:**
- [x] Crear `galeria` seeds locales (emulador) o leer desde `firebaseStorage` (decisión ADR-003: Storage vs paths públicos).
- [x] Grid responsive con 6-8 imágenes.
- [x] Sin Storage: si ninguna página lo usa, considerar quitar el init de storage de `firebase.ts` y `firebase.json` (limpieza).

**Refs:** `src/pages/Galeria.tsx`, `firebase.ts:43,51`, `firebase.json` (storage port 9199 added en Fase 1).

---

### T2.8 — App Check (H4 server-side rate limiting)
**Por qué:** La integración de App Check reduce el abuso desde clientes no verificables; la activación y validación en Firebase Console siguen siendo pasos operativos.

**AC:**
- [ ] Configurar Firebase App Check con reCAPTCHA v3 en Firebase Console.
- [x] Integrar `initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true })` en `src/services/firebase.ts`.
- [x] Documentar keys en `.env.example`.
- [ ] Validar: con App Check habilitado, los writes anónimos no autorizados fallan.

**Refs:** `AUDITORIA.md H4`, `src/utils/rateLimit.ts`.

---

## Orden de ejecución recomendado

```
T2.1 (schema) ─┐
               ├─► T2.2 (seed servicios) ─┐
               │                            ├─► T2.3 (flujo reserva) ─┬─► T2.4 (mis citas)
               │                            │                          └─► T2.5 (mensajes contacto)
               └─► T2.6 (frontend cleanup) ┘
                                            Paralelos: T2.7 (galería), T2.8 (App Check) en cualquier momento
```

**Crítico-path:** T2.1 → T2.2 → T2.3 → T2.4.

## ADRs por crear (en `docs/`)

- `ADR-001-validacion-reservas.md` — T2.3: cómo evitar doble-booking.
- `ADR-002-cancelacion-cliente.md` — T2.4: relajar regla de update o Cloud Function.
- `ADR-003-storage-vs-paths-publicos.md` — T2.7: dónde viven las imágenes de galería.

## Fuera de alcance de Fase 2

- Recordatorios por email/SMS.
- Múltiples sucursales o terapeutas.
- Panel de empleados (`empleados` collection ya existe pero no UI).
- Roles intermedios (solo `client` y `admin`).
- Optimizaciones de performance y bundle splitting (dejar para Fase 3).
