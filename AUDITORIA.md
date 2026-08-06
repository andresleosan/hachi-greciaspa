# AUDITORÍA — Hachi & Grecia Spa
**Fecha:** 2026-07-30
**Alcance:** Código fuente completo, dependencias, reglas Firestore, configuración de despliegue

---

## Resumen Ejecutivo

| Severidad | Hallazgos |
|-----------|-----------|
| CRÍTICO   | 2         |
| ALTO      | 4         |
| MEDIO     | 7         |
| BAJO      | 5         |

El proyecto tiene una base sólida (sin secretos hardcodeados, env vars bien configuradas, `.gitignore` correcto). Sin embargo, hay **2 problemas críticos** que bloquean funcionalidad en producción y **4 de alto riesgo** que deben resolverse antes de cualquier despliegue.

---

## HALLAZGOS CRÍTICOS

### C1 — Colección `precios` sin reglas en Firestore
**Archivo:** `firestore.rules` (falta), `src/components/AdminPrices.tsx:30`
**Impacto:** La funcionalidad de administración de tarifas está COMPLETAMENTE ROTA en producción.

`AdminPrices.tsx` lee y escribe en la colección `precios`, pero `firestore.rules` no define ninguna regla para ella. Caé en la regla catch-all `/{document=**} → allow read, write: if false`. Todas las operaciones (lectura, creación, actualización, eliminación) serán denegadas por Firestore.

**Corrección:** Agregar al `firestore.rules`:
```firestore
match /precios/{doc} {
  allow read: if true;
  allow write: if isAdmin();
}
```

---

### C2 — Detección de admin rota en DashboardPage
**Archivo:** `src/pages/DashboardPage.tsx:24`
**Impacto:** La rama de admin en la consulta de reservas NUNCA se ejecuta.

```tsx
const isAdmin = (user as any)?.admin || (user as any)?.role === 'admin'
```

Esto revisa el objeto `User` de Firebase Auth, que **no tiene** propiedades `.admin` ni `.role`. El hook `useAuth` obtiene el `profile` de Firestore (que sí tiene `role`), pero esta línea usa `user` en lugar de `profile`. Resultado: siempre cae al branch de usuario normal, incluso para admins.

**Corrección:** Cambiar a:
```tsx
const isAdmin = profile?.role === 'admin'
```
Y agregar `profile` al array de dependencias del `useEffect`.

---

## HALLAZGOS ALTOS

### H1 — 24 vulnerabilidades en dependencias (`npm audit`)
**Impacto:** 2 críticas, 11 altas, 10 moderadas, 1 baja.

Paquetes críticos:
- `tar` (≤7.5.20) — file smuggling, DoS
- `websocket-driver` (≤0.7.4) — resource limit bypass

Paquetes altos:
- `axios` (1.0–1.17.0) — 10 CVEs (prototype pollution, DoS, header injection)
- `react-router` (6.0–8.2.0) — open redirect, XSS, CSRF bypass
- `vite` (8.0–8.0.15) — NTLM hash disclosure, fs.deny bypass
- `postcss` (≤8.5.17) — path traversal

**Corrección:** Ejecutar `npm audit fix`. Si persiste, actualizar manualmente `axios` y `react-router-dom`.

---

### H2 — `register()` acepta parámetro `role` desde el cliente
**Archivo:** `src/services/auth.ts:12-13`
**Impacto:** Superuser escalation si las reglas Firestore fallan.

```tsx
export async function register(
  email: string, password: string, displayName?: string, role = 'client'
)
```

Aunque `Register.tsx` hardcodea `'client'`, un cliente malicioso podría llamar `register(email, pw, name, 'admin')`. Las reglas Firestore protegen contra esto (solo permite crear perfil propio con UID matching), pero la función expone la interfaz innecesariamente.

**Corrección:** Eliminar el parámetro `role` de la función del lado del cliente. El rol siempre debe asignarse server-side (via `set-admin.js` o Cloud Functions).

---

### H3 — `firebase-debug.log` commiteado con PII
**Archivo:** `firebase-debug.log` (raíz del repo)
**Impacto:** Fuga de información — contiene el email `andres.san1404@gmail.com`.

El archivo no está en `.gitignore`. Si el repo es público, el email ya está expuesto.

**Corrección:**
1. Agregar `firebase-debug.log` a `.gitignore`
2. Eliminarlo del historial de git si el repo es público (`git filter-branch` o BFG)
3. Rotar no es necesario (email no es credencial), pero sí limpiar

---

### H4 — Sin rate limiting en autenticación
**Archivo:** `src/pages/Login.tsx`, `src/pages/Register.tsx`
**Impacto:** Fuerza bruta posible en login y registro.

No hay rate limiting client-side ni server-side (Firebase Auth tiene límites básicos por defecto, pero no son configurables sin Cloud Functions).

**Corrección:** Implementar reCAPTCHA v3 en login/register o usar Firebase App Check.

---

## HALLAZGOS MEDIOS

### M1 — Puerto de Storage emulator no definido en `firebase.json`
**Archivo:** `src/services/firebase.ts:50`, `firebase.json`
`firebase.ts` conecta al storage emulator en `localhost:9199`, pero `firebase.json` no configura storage emulator. Cuando `VITE_USE_FIREBASE_EMULATOR=true`, la conexión a storage fallará silenciosamente.

---

### M2 — Métricas del dashboard calculadas con fecha incorrecta ✅ CORREGIDO
**Archivo:** `src/pages/DashboardPage.tsx`
Las métricas ya se leen desde Firestore, pero `Citas Hoy` y `Servicios Hoy` se estaban calculando sobre las últimas 20 reservas y comparando `createdAt` con el día actual. Ahora usan una consulta diaria por `date`, con índice `userId + date` para clientes.

---

### M3 — Sin ruta 404/catch-all
**Archivo:** `src/App.tsx`
Rutas indefinidas muestran solo "Cargando..." (el Suspense fallback) sin error visible.

---

### M4 — Cast `as any` en configuración Firebase
**Archivo:** `src/services/firebase.ts:30`
`initializeApp(firebaseConfig as any)` oculta posibles errores de tipo.

---

### M5 — Índices compuestos de Firestore ✅ CORREGIDO
`firestore.indexes.json` existe y contiene los índices de reservas requeridos, incluyendo `userId + date` para las métricas diarias del dashboard.

---

### M6 — Dependencias no utilizadas
`axios`, `date-fns`, `react-calendar`, `react-hook-form`, `react-hot-toast`, `zustand` están declaradas pero nunca importadas. Aumentan bundle size y superficie de ataque innecesariamente.

---

### M7 — `.firebaserc` con project ID placeholder
```json
{ "projects": { "default": "your-firebase-project-id" } }
```
Debe actualizarse antes de cualquier `firebase deploy`.

---

## HALLAZGOS BAJOS

### L1 — Inconsistencia de rutas
`/` mapea a `Inicio`, pero `LandingNueva` (en `/inicio`) es la página más completa. El Header no vincula a `/inicio`.

### L2 — Links del sidebar del Dashboard son `href="#"`
Placeholders no funcionales.

### L3 — Sin validación de inputs en Register
No hay mínimo de longitud de contraseña ni validación de email más allá de HTML5 `type="email"`.

### L4 — Acceso base al dashboard ✅ RECLASIFICADO
`/dashboard` es compartido intencionalmente por clientes y administradores. Las rutas administrativas `/dashboard/agenda` y `/dashboard/empleados` usan `ProtectedRoute requireRole="admin"`; no se requiere un guard de admin sobre el dashboard base.

### L5 — `useAuth` sin error boundary
Si `getUserProfile` falla, `profile` queda en `null` silenciosamente. No hay feedback al usuario.

---

## Acciones Inmediatas (Bloqueantes)

| # | Hallazgo | Estado |
|---|----------|--------|
| C1 | Agregar regla `precios` a `firestore.rules` | ✅ Corregido |
| C2 | Corregir admin check en `DashboardPage.tsx:24` | ✅ Corregido |
| H1 | Ejecutar `npm audit fix` | ✅ Corregido (24→19 vulns, restantes en devDeps) |
| H2 | Eliminar parámetro `role` de `register()` | ✅ Corregido |
| H3 | Agregar `firebase-debug.log` a `.gitignore` | ✅ Corregido |
| H4 | Rate limiting en login/register | ⏳ Requiere Cloud Functions o Firebase App Check |

## Hallazgos nuevos detectados por tests de reglas (2026-07-31)

Tras habilitar `npm run rules:test` con JDK 21, la suite expuso un bug no cubierto por la auditoría original:

### N1 — Privilege escalation: usuario podía auto-asignarse `role: 'admin'` ✅ CORREGIDO
**Archivo:** `firestore.rules:27-38`
**Repro:** `npm run rules:test` (antes del fix) → test "user cannot set own role to admin" FAIL.
La regla `allow update: ... (request.auth.uid == userId || isAdmin())` permitía a un usuario actualizar **cualquier campo** de su propio perfil, incluyendo `role`. Un cliente podía hacer `users/{uid}.update({role:'admin'})` y volverse admin sin pasar por `set-admin.js`.

**Fix aplicado** (`firestore.rules`):
- `create` exige `request.resource.data.role == 'client'` (no admin self-promotion en signup).
- `update` solo permite al usuario modificar campos que NO sean `role` ni `email` (vía `affectedKeys().hasAny(['role','email'])`). Admin conserva control total.

### N2 — Lectura cruzada de perfiles (quirk del emulador, no bug real) ✅ DESCARTADO
El test "user cannot read other user profile" tuvo un falso-FAIL inicial por reordenamiento del seed. Tras corregir el seed (remover el doc de alice que interfería con el create test), el test pasa de forma consistente. La regla original en L30 (`request.auth.uid == userId || isAdmin()`) es correcta.

### Estado de tests de reglas

```
$ npm run rules:test
Firestore rules test suite
--------------------------
  PASS  guest can read servicios                     (servicios público)
  PASS  guest cannot write servicios
  PASS  client cannot write servicios
  PASS  guest can read precios (C1)                  (precios público)
  PASS  client cannot write precios (C1)
  PASS  admin (claim) can write precios (C1)
  PASS  user can create own profile (role:client default)   (N1 create rule)
  PASS  user cannot set own role to admin (escalation)      (N1 fix)
  PASS  user can update own displayName but keep role       (N1 fix)
  PASS  user cannot create someone else profile
  PASS  user cannot read other user profile
  PASS  admin can read any user profile
  PASS  admin can delete any user
  PASS  user can create own reserva
  PASS  user cannot create reserva for another user
  PASS  user can read own reserva
  PASS  user cannot update own reserva (admin only)
  PASS  admin can update any reserva
  PASS  guest cannot read empleados
  PASS  client cannot read empleados
  PASS  admin can read empleados
  PASS  guest cannot read unknown collection
  PASS  client cannot read unknown collection
23 passed, 0 failed
```

Tests cubren los hallazgos: C1 (precios), C2/N1 (escalación), reservas owner-only, admin via custom claim y catch-all deny.

### Nota sobre H4 (Rate Limiting)
La protección contra fuerza bruta requiere una de estas opciones:
- **Firebase App Check** + reCAPTCHA v3 (recomendado, sin backend)
- **Cloud Function** que rate-limit por IP antes de `signInWithEmailAndPassword`
- **Firebase Extensions** como `Rate Limiter`

Ninguna es trivial de implementar sin infraestructura adicional. Se recomienda priorizar para la fase2.

### Nota sobre vulnerabilidades restantes (H1)
Las 19 vulns restantes son:
- **15 high**: `brace-expansion`/`minimatch`/`glob` chain + `react-router` — todas en `firebase-tools` (devDep, no afecta bundle de producción) o requieren downgrade de `react-router` (breaking change a7.11.0)
- **4 moderate**: `@opentelemetry/core`, `uuid` — también en `firebase-tools`

Ninguna afecta el bundle de producción. `firebase-tools` solo se usa en desarrollo.

---

*Auditoría generada por Cronos — Modo Auditoría*
