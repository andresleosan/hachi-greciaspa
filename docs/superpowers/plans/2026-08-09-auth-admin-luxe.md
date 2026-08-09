# Login y Administración Luxe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar login, registro y la consola privada para compartir una experiencia Luxe coherente, conservando las funciones, rutas, permisos y contratos de datos actuales.

**Architecture:** Crear `AuthShell` para login/registro y `AdminShell` para las cuatro rutas privadas. Los shells se ocupan exclusivamente de composición, navegación y estados visuales; `ProtectedRoute`, `useAuth`, Firestore Rules y Functions continúan siendo las autoridades de autenticación, autorización y datos. Migrar las páginas existentes de forma incremental para mantener cada bloque verificable.

**Tech Stack:** React 19.2, TypeScript 6 strict, React Router 7, Firebase Auth/Firestore, CSS existente en `src/styles/maqueta.css` y `src/styles/luxe.css`, Vitest, Playwright local.

## Global Constraints

- Conservar `/login`, `/register`, `/dashboard`, `/dashboard/agenda`, `/dashboard/empleados` y `/dashboard/mascotas`.
- No modificar Firestore Rules, claims, callable Functions, contratos de reservas ni permisos server-side.
- `ProtectedRoute` continúa protegiendo rutas privadas; `requireRole="admin"` continúa protegiendo agenda y empleados.
- El registro siempre crea `role: 'client'`; no habrá selector de roles en el frontend.
- Usar `signOut` existente; no crear otra estrategia de sesión.
- No introducir dependencias nuevas ni estilos inline.
- No usar emojis ni letras decorativas como iconos; usar SVG accesibles.
- Mantener foco visible, `aria-*` asociados, responsive mobile/desktop y `prefers-reduced-motion`.
- No mostrar credenciales, tokens, trazas ni detalles internos de Firebase en mensajes de usuario.
- No implementar Clientes, Reportes, configuración, recuperación de contraseña, MFA ni proveedores sociales.
- No realizar commit, despliegue ni cambios productivos como parte de este plan.

---

## File Map

- Create: `src/components/AuthShell.tsx` — composición compartida de login y registro.
- Create: `src/components/AdminShell.tsx` — sidebar, drawer, topbar, perfil y logout de la consola.
- Create: `src/components/AuthShell.test.tsx` — contrato de composición pública de autenticación.
- Create: `src/components/AdminShell.test.tsx` — navegación, rol, logout y drawer del panel.
- Create: `src/pages/Login.test.tsx` — contenido y accesibilidad mínima de login.
- Create: `src/pages/Register.test.tsx` — contenido y accesibilidad mínima de registro.
- Modify: `src/pages/Login.tsx` — usar `AuthShell`, estados de carga/error y controles accesibles.
- Modify: `src/pages/Register.tsx` — usar `AuthShell`, estados de carga/error y controles accesibles.
- Modify: `src/pages/DashboardPage.tsx` — migrar a `AdminShell` sin cambiar consultas ni acciones.
- Modify: `src/pages/DashboardAgenda.tsx` — migrar a `AdminShell` sin cambiar agenda ni mutaciones.
- Modify: `src/pages/DashboardEmpleados.tsx` — migrar a `AdminShell` sin cambiar CRUD ni reglas.
- Modify: `src/pages/DashboardMascotas.tsx` — migrar a `AdminShell` sin cambiar CRUD ni ownership.
- Modify: `src/styles/luxe.css` — tokens y composición Auth/Admin, focus states y reduced motion.
- Modify: `src/styles/maqueta.css` — retirar conflictos visuales de dashboard y reglas responsive heredadas solo donde sean incompatibles.
- Modify: `package.json` — incluir los nuevos tests en `test:client` si el script explícito los omite.
- Modify: `qa/tests/local-authenticated.spec.mjs` — cubrir logout y navegación del shell sin cambiar fixtures de autenticación.
- Modify: `qa/tests/local-public.spec.mjs` — añadir verificación pública de login/registro solo si no duplica los casos autenticados.

---

### Task 1: AuthShell, login y registro

**Files:**
- Create: `src/components/AuthShell.tsx`
- Create: `src/components/AuthShell.test.tsx`
- Create: `src/pages/Login.test.tsx`
- Create: `src/pages/Register.test.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Register.tsx`
- Modify: `src/styles/luxe.css`
- Modify: `package.json`

**Interfaces:**
- `AuthShell({ children, eyebrow, title, description, alternateAction })` recibe contenido de formulario y no ejecuta autenticación.
- `Login` conserva `signIn(email, password)` y navega a `nextPath` después de éxito.
- `Register` conserva `register(email, password, displayName)` y navega a `/login` después de éxito.

- [ ] **Step 1: Write the failing shell and page tests**

Agregar asserts que demuestren el contrato deseado:

```tsx
expect(markup).toContain('class="auth-shell"')
expect(markup).toContain('Iniciar sesión')
expect(markup).toContain('Crear una cuenta')
expect(markup).toContain('aria-label="Mostrar contraseña"')
expect(markup).not.toContain('site-header')
expect(markup).not.toContain('site-footer')
```

Los tests de página deben verificar `Correo`, `Contraseña`, `Entrar`, `Crear cuenta`, `required`, `autoComplete="email"` y el enlace entre login/registro.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm run test:client -- --run src/components/AuthShell.test.tsx src/pages/Login.test.tsx src/pages/Register.test.tsx
```

Expected: FAIL porque las páginas todavía renderizan `Header`/`Footer` legacy y no existe `AuthShell`.

- [ ] **Step 3: Implement the minimal AuthShell**

Crear un shell sin lógica de sesión:

```tsx
type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  alternateAction: ReactNode
  children: ReactNode
}
```

El markup debe incluir logo oficial mediante `publicAsset(BRAND_ASSETS.logo)`, una zona editorial y una zona de formulario. No incluir navegación administrativa ni llamadas directas a Firebase.

- [ ] **Step 4: Migrate Login and Register**

En `Login.tsx` y `Register.tsx`:

- Eliminar imports de `Header` y `Footer`.
- Envolver el formulario en `AuthShell`.
- Añadir `autoComplete="email"`, `autoComplete="current-password"`, `autoComplete="name"` y `autoComplete="new-password"`.
- Añadir estado `submitting` y deshabilitar campos/acción solo durante la llamada actual.
- Añadir control de mostrar/ocultar contraseña con `<button type="button">`, `aria-label`, `aria-pressed` y un SVG inline sin emoji.
- Mantener `canAttempt`, `getRemainingMs`, `next` y los mensajes actuales de rate limit.
- Renderizar errores con `role="alert"` y éxito/estado de carga con `role="status"` cuando corresponda.

- [ ] **Step 5: Add AuthShell responsive styles**

Agregar clases específicas en `luxe.css` para:

- Desktop dividido entre marca y formulario.
- Mobile de una columna con formulario primero o inmediatamente visible.
- Inputs y botones con foco visible y contraste mínimo 4.5:1.
- Estados `:hover`, `:focus-visible`, `:disabled`.
- `@media (prefers-reduced-motion: reduce)` sin transiciones decorativas.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm run test:client -- --run src/components/AuthShell.test.tsx src/pages/Login.test.tsx src/pages/Register.test.tsx
npx tsc --noEmit
```

Expected: tests PASS and TypeScript exits with code 0.

---

### Task 2: AdminShell compartido y seguridad de navegación

**Files:**
- Create: `src/components/AdminShell.tsx`
- Create: `src/components/AdminShell.test.tsx`
- Modify: `src/styles/luxe.css`
- Modify: `src/styles/maqueta.css`

**Interfaces:**
- `AdminShell({ title, subtitle, action, children })` recibe el contenido privado y contexto de la página.
- `AdminShell` consume `useAuth()`, `useLocation()`, `useNavigate()` y `signOut()` para presentación y logout.
- `AdminShell` nunca reemplaza a `ProtectedRoute` ni decide permisos de datos.

- [ ] **Step 1: Write failing AdminShell tests**

Cubrir:

- Renderiza marca oficial, `Dashboard`, `Citas`, `Mis mascotas`, `Servicios` y `Cerrar sesión`.
- Muestra `Empleados` solo cuando el perfil es admin.
- Muestra `Clientes` y `Reportes` como deshabilitados con `Próximamente` sin `href`.
- Marca el enlace activo según `location.pathname`.
- El botón mobile expone `aria-expanded` y `aria-controls`.
- Expone una acción de logout con `type="button"`, texto `Cerrar sesión` y el contrato de `signOut()` seguido de navegación a `/login`.

Para el test, renderizar el markup con `renderToStaticMarkup` y mockear únicamente `useAuth`, `useLocation`, `useNavigate` y `signOut`, porque el shell depende de sesión y router. Verificar el markup real; la ejecución de click/logout se cubrirá en browser QA, no con un assert de llamada aislado.

- [ ] **Step 2: Run focused test to verify RED**

Run:

```bash
npm run test:client -- --run src/components/AdminShell.test.tsx
```

Expected: FAIL porque `AdminShell` no existe.

- [ ] **Step 3: Implement AdminShell**

Crear una estructura con:

- `<aside id="admin-sidebar">` y navegación con `aria-label="Navegación del panel"`.
- Logo oficial y texto `Hachi & Grecia Spa`.
- Íconos SVG pequeños con `aria-hidden="true"` y texto visible.
- Botón de menú mobile con `aria-expanded`, `aria-controls` y `aria-label` que indique abrir/cerrar.
- Topbar con `title`, `subtitle` y `action` opcional.
- Pie de sidebar con email/nombre, rol legible y botón `Cerrar sesión`.
- Efecto de cierre del drawer al activar una navegación.

El componente debe limpiar el estado del drawer al cambiar `location.pathname` y no debe registrar información sensible.

- [ ] **Step 4: Add AdminShell styles**

Definir clases en `luxe.css` o una sección aislada de `maqueta.css` para:

- Sidebar desktop persistente.
- Drawer mobile con overlay, foco visible y `z-index` consistente.
- Topbar, breadcrumbs/contexto y acción principal.
- Estado activo, hover, disabled y badges “Próximamente”.
- Superficies de alta legibilidad para tablas y formularios.

Eliminar o sobrescribir solo las reglas heredadas que produzcan conflicto con el shell; no borrar estilos de componentes aún no migrados.

- [ ] **Step 5: Run AdminShell tests and typecheck**

Run:

```bash
npm run test:client -- --run src/components/AdminShell.test.tsx
npx tsc --noEmit
```

Expected: PASS y TypeScript sin errores.

---

### Task 3: Migrar DashboardPage sin cambiar datos ni acciones

**Files:**
- Create: `src/pages/DashboardPage.test.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/styles/luxe.css` — asegurar contraste de contenido heredado dentro de tarjetas claras del dashboard.
- Modify: `src/components/AdminShell.test.tsx` si se agrega un contrato de integración mínimo.
- Modify: `package.json` si el test no está incluido en `test:client`.

**Interfaces:**
- Las consultas actuales a `reservas` y `users` permanecen sin cambios.
- `AdminPrices` continúa montándose solo cuando `profile?.role === 'admin'`.
- `DashboardPage` pasa `title="Dashboard"`, `subtitle="Resumen y actividad"` y su acción primaria a `AdminShell`.

- [ ] **Step 1: Write failing DashboardPage render tests**

Usar el patrón de contrato estructural de `tools/PublicPages.test.ts` para leer `DashboardPage.tsx` y verificar que contiene `AdminShell`, `Dashboard`, `Reservas recientes` y las cuatro métricas esperadas, y que no contiene la estructura de sidebar duplicada localmente.

- [ ] **Step 2: Run focused test to verify RED**

Run:

```bash
npm run test:client -- --run src/pages/DashboardPage.test.tsx
```

Expected: FAIL por la ausencia del shell compartido y la estructura todavía embebida en la página.

- [ ] **Step 3: Migrate markup only**

Envolver el contenido actual en `ProtectedRoute` y `AdminShell`, retirar el `<aside>` y `<header className="dashboard-topbar">` locales, conservar el contenido de métricas, reservas, feedback, cancelación, reagendado y `AdminPrices`.

No cambiar:

- `getDocs`, `getCountFromServer`, queries, `limit` ni filtros.
- `cancelMyReserva`, `rescheduleMyReserva` ni sus guards.
- Condiciones de rol.
- Texto de estado de reservas salvo ajustes visuales no funcionales.

- [ ] **Step 4: Add dashboard panel styles and verify**

Adaptar métricas, lista de reservas y acciones a las superficies Luxe. Ejecutar:

```bash
npm run test:client -- --run src/pages/DashboardPage.test.tsx src/components/AdminShell.test.tsx
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Migrar Agenda, Empleados y Mascotas

**Files:**
- Create: `src/pages/DashboardAgenda.test.tsx`
- Create: `src/pages/DashboardEmpleados.test.tsx`
- Create: `src/pages/DashboardMascotas.test.tsx`
- Modify: `src/pages/DashboardAgenda.tsx`
- Modify: `src/pages/DashboardEmpleados.tsx`
- Modify: `src/pages/DashboardMascotas.tsx`
- Modify: `src/styles/luxe.css`
- Modify: `src/styles/maqueta.css`

**Interfaces:**
- Agenda mantiene `ProtectedRoute requireRole="admin"` y todos sus servicios/acciones.
- Empleados mantiene `ProtectedRoute requireRole="admin"` y su CRUD de Firestore.
- Mascotas mantiene `ProtectedRoute` y ownership del usuario actual.
- Las tres páginas usan `AdminShell` con título, subtítulo y acción contextual.

- [ ] **Step 1: Write failing page-contract tests**

Verificar por página:

- Agenda: fecha, filtros, “Reservas del día”, “Sin terapeuta asignado” y drawer.
- Empleados: “Administrar empleados”, “Nuevo empleado”, tabla, formulario y “Desactivar”.
- Mascotas: CRUD, formularios y historial de reservas.
- Cada página se verifica con el patrón de contrato estructural de `tools/PublicPages.test.ts`: contiene el import de `AdminShell` y no contiene `sidebar-brand` ni `dashboard-topbar` propios.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
npm run test:client -- --run src/pages/DashboardAgenda.test.tsx src/pages/DashboardEmpleados.test.tsx src/pages/DashboardMascotas.test.tsx
```

Expected: FAIL por no usar todavía el shell compartido.

- [ ] **Step 3: Migrate each page incrementally**

Para cada página:

1. Mantener el `ProtectedRoute` actual.
2. Retirar sidebar/topbar duplicados.
3. Envolver el contenido en `AdminShell`.
4. Pasar título, subtítulo y acción de la página.
5. Conservar estados, queries, handlers, formularios, drawer, tablas y mensajes.
6. No convertir acciones de Firestore en acciones visuales ni añadir permisos al cliente.

- [ ] **Step 4: Style agenda, employees and pets**

Agregar reglas específicas para:

- Timeline con contraste suficiente y scroll horizontal controlado.
- Drawer con overlay y foco.
- Tabla de empleados legible en mobile mediante `data-label` existente.
- Formularios agrupados con fieldsets, estados y acciones.
- Mascotas e historial usando las mismas superficies y badges.
- Estados no dependientes únicamente de color.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
npm run test:client -- --run src/pages/DashboardAgenda.test.tsx src/pages/DashboardEmpleados.test.tsx src/pages/DashboardMascotas.test.tsx src/services/agenda.test.ts src/services/empleados.test.ts src/services/mascotas.test.ts
npx tsc --noEmit
```

Expected: PASS y TypeScript sin errores.

---

### Task 5: Consolidar accesibilidad, responsive y contratos de rutas

**Files:**
- Modify: `tools/PublicPages.test.ts` para contratos estructurales de los nuevos shells y rutas privadas.
- Modify: `package.json` para incluir los tests nuevos en el comando explícito `test:client`.
- Modify: tests de AuthShell/AdminShell y páginas para cubrir keyboard/focus markup.
- Modify: `src/styles/luxe.css` y `src/styles/maqueta.css`.

- [ ] **Step 1: Add failing structural/accessibility assertions**

Cubrir:

- Todos los botones de menú tienen `type="button"` y etiqueta.
- Controles de contraseña tienen `aria-pressed`.
- Errores tienen `role="alert"`.
- Estados de carga/éxito tienen `role="status"`.
- Drawer tiene `aria-controls`, overlay etiquetado y `aria-modal` cuando sea diálogo.
- No quedan emojis en los shells ni en la navegación privada.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
npm run test:client -- --run src/components/AuthShell.test.tsx src/components/AdminShell.test.tsx tools/PublicPages.test.ts
```

Expected: cualquier contrato nuevo falla antes de su corrección; los fallos deben corresponder al markup faltante, no a errores de entorno.

- [ ] **Step 3: Fix responsive and accessibility gaps**

Verificar manualmente por CSS que:

- A 360px no haya overflow horizontal del shell.
- El drawer no tape el botón que lo abre sin forma de cerrarlo.
- Los estados de foco sean visibles en fondo oscuro y claro.
- Las tablas mantengan encabezados y labels móviles.
- `prefers-reduced-motion` elimine transformaciones y transiciones decorativas.

- [ ] **Step 4: Run full client checks**

Run:

```bash
npm run test:client
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev
```

Expected: todos los comandos terminan con código 0; audit reporta `0 vulnerabilities` para dependencias runtime.

---

### Task 6: Browser QA autenticado y cierre de evidencia

**Files:**
- Modify: `qa/tests/local-authenticated.spec.mjs`
- Modify: `qa/tests/local-public.spec.mjs` solo para login/registro públicos si el caso no queda cubierto por la suite autenticada.
- Generated, not versioned: `qa/reports/local/` y artefactos Playwright.

- [ ] **Step 1: Add failing browser assertions**

Agregar casos que verifiquen:

- Login admin y cliente muestran el shell correcto.
- Usuario anónimo que visita `/dashboard/agenda` vuelve a `/login?next=...`.
- Admin navega Dashboard → Citas → Empleados y ve el contexto correcto.
- Cliente ve Dashboard → Mis mascotas y no ve Empleados.
- Logout vuelve a `/login` y una navegación posterior a `/dashboard` vuelve a protegerse.
- CRUD de empleados existente sigue funcionando.

- [ ] **Step 2: Run the local browser suite and inspect failures**

Run:

```bash
npm run qa:local
```

Expected: primero puede fallar por los contratos aún no migrados; cada fallo debe señalar una aserción concreta y generar evidencia Playwright.

- [ ] **Step 3: Implement only the failing browser contract**

Corregir el markup/navegación de la página afectada sin cambiar fixtures, permisos ni datos para hacer pasar el test.

- [ ] **Step 4: Re-run browser QA**

Run:

```bash
npm run qa:local
```

Expected: `12 passed` o el total vigente de casos después de agregar los nuevos casos, con `0 failed` y reporte HTML en `qa/reports/local/`.

- [ ] **Step 5: Perform the self-critique evidence pass**

Revisar el diff con foco en:

- No exposición de secretos o datos fuera del alcance de cada rol.
- Ninguna ruta privada sin `ProtectedRoute`.
- Ningún `role` controlable desde registro o UI cliente.
- Ninguna escritura Firestore nueva desde los shells.
- Ningún error visible con tokens, credenciales o trazas.

Repetir los comandos completos de Task 5 y conservar sus salidas como evidencia final. No desplegar ni modificar producción.

---

## Plan Self-Review

- [x] Cobertura de login y registro.
- [x] Cobertura de shell admin y logout.
- [x] Cobertura de dashboard, agenda, empleados y mascotas.
- [x] Preservación de roles, `ProtectedRoute`, Rules y Functions.
- [x] Responsive, accesibilidad y reduced motion.
- [x] Tests unitarios, typecheck, lint, build, audit y browser QA.
- [x] Sin placeholders de implementación ni módulos fuera de alcance.
- [x] Sin commits automáticos: el operador decide la integración del trabajo.
