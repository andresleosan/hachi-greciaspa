# Login y Administración Luxe — Especificación de Diseño

**Fecha:** 2026-08-09  
**Estado:** Diseño aprobado para documentación; pendiente de revisión del archivo por el operador.

## Objetivo

Rediseñar visualmente iniciar sesión, registro y toda la consola privada de Hachi & Grecia Spa para que compartan una experiencia Luxe coherente con el home, conservando las funciones, rutas, permisos y contratos de datos existentes.

Esta fase no agrega módulos nuevos de clientes, reportes o configuración. Es una evolución de interfaz y estructura compartida sobre el flujo autenticado actual.

## Alcance

### Incluido

- `/login`.
- `/register`.
- `/dashboard`.
- `/dashboard/agenda`.
- `/dashboard/empleados`.
- `/dashboard/mascotas`.
- Shell compartido de administración.
- Navegación, estados, formularios, tablas, métricas y feedback visual.
- Responsive desktop/mobile y accesibilidad básica.

### Fuera de alcance

- Nuevos módulos funcionales de clientes, reportes o configuración.
- Cambios de roles, claims, Firestore Rules o permisos server-side.
- Cambios en callable Functions, reservas, disponibilidad o contratos de datos.
- Recuperación de contraseña, MFA o proveedores sociales, salvo que una tarea posterior los defina.
- Despliegue a producción.

## Principios de Seguridad

- `ProtectedRoute` continúa protegiendo todas las rutas privadas.
- `requireRole="admin"` continúa protegiendo agenda y empleados.
- La ocultación de enlaces nunca reemplaza la autorización real.
- El registro siempre crea perfiles con `role: 'client'`; el usuario no puede elegir su rol.
- El cierre de sesión usa el `signOut` existente.
- Los errores visibles no mostrarán credenciales, tokens, trazas ni detalles internos de Firebase.
- No se modifican reglas Firestore ni claims en esta fase.

## Dirección Visual

La consola usará la dirección ya establecida para el rediseño Luxe, adaptada a una herramienta de operación diaria:

- **Concepto:** una consola silenciosa y precisa, más operacional que promocional.
- **Fondo:** tinta verdosa profunda y superficies claras/esmeriladas donde se necesite alta densidad de información.
- **Acentos:** bronce para acciones y foco; sage para estados tranquilos; coral solo para advertencias o acciones destructivas heredadas.
- **Tipografía:** Fraunces para títulos editoriales y Manrope para navegación, datos, formularios y estados.
- **Firma:** marca oficial, navegación lateral con ritmo editorial y estados de reservas claramente diferenciados.
- **Iconografía:** SVG sin emojis ni letras decorativas como iconos.
- **Movimiento:** transiciones cortas; `prefers-reduced-motion` desactiva transformaciones no esenciales.

La pantalla de login tendrá una composición más contenida que el home: identidad de marca en un panel y formulario enfocado en el otro. La administración priorizará lectura, operación y densidad controlada sobre efectos decorativos.

## Arquitectura de Interfaz

### `AuthShell`

Componente compartido para login y registro.

Responsabilidades:

- Aplicar el fondo y la composición de autenticación.
- Mostrar logo, mensaje contextual y formulario proporcionado por la página.
- Mantener navegación pública mínima y enlaces entre login/registro.
- Proporcionar estados visuales coherentes para carga y error.

No ejecuta autenticación ni conoce roles.

### `AdminShell`

Componente compartido para las cuatro páginas privadas.

Responsabilidades:

- Renderizar sidebar desktop y drawer mobile.
- Mostrar la marca oficial y el perfil activo.
- Renderizar navegación según la información de rol recibida.
- Proporcionar topbar, contexto de sección y área principal.
- Ejecutar `signOut` únicamente desde la acción explícita de cerrar sesión.

No autoriza por sí mismo: las páginas siguen envueltas por `ProtectedRoute` y las operaciones siguen protegidas por Firestore/Functions.

### Login

Conservará:

- Lectura de `next` desde la query string.
- `signIn(email, password)`.
- Rate limit local de intentos.
- Redirección a `next` o `/dashboard`.

Mejorará:

- `autoComplete` correcto para email y contraseña.
- `required` y estados de carga.
- Botón mostrar/ocultar contraseña accesible.
- Mensajes con `role="alert"`.
- Enlace visible a registro.

### Registro

Conservará:

- Validaciones actuales de nombre, correo y contraseña.
- Rate limit local.
- `register(email, password, displayName)`.
- Redirección a `/login`.

Mejorará:

- Indicaciones de validación próximas al campo.
- Estados de carga y errores consistentes con login.
- `autoComplete` de nombre, email y nueva contraseña.
- Enlace visible a login.

## Navegación Privada

La navegación base será:

- Dashboard: `/dashboard`.
- Citas: `/dashboard/agenda`.
- Empleados: `/dashboard/empleados`, solo admin.
- Mis mascotas: `/dashboard/mascotas`.
- Servicios: `/servicios`.
- Clientes: elemento deshabilitado con “Próximamente”, sin ruta falsa.
- Reportes: elemento deshabilitado con “Próximamente”, sin ruta falsa.

El perfil del sidebar mostrará nombre o email, rol legible y la acción “Cerrar sesión”. El estado activo se determina por la ruta actual, no por una clase fija duplicada en cada página.

## Dashboard

Se conservarán las consultas y métricas actuales:

- Citas de hoy.
- Servicios de hoy.
- Reservas recientes.
- Clientes totales para administradores.

La presentación se reorganizará en:

1. Encabezado de contexto y acción primaria.
2. Banda de métricas.
3. Panel de reservas recientes.
4. Bloque de administración de precios únicamente para admin.

Las acciones existentes no cambian:

- Cliente: cancelar, reagendar y reservar de nuevo.
- Admin: consultar y editar precios desde `AdminPrices`.

## Agenda

Se conservarán:

- Selección de fecha.
- Filtros de servicio y terapeuta.
- Resumen de cantidad.
- Cola “Sin terapeuta asignado”.
- Timeline de reservas.
- Incidencias.
- Drawer de detalle.
- Acciones de estado existentes.

El rediseño se enfocará en jerarquía visual, legibilidad de eventos, estados y comportamiento del drawer en mobile.

## Empleados

Se conservarán:

- Alta.
- Edición.
- Desactivación lógica.
- Servicios atendidos.
- Turnos semanales.
- Conteo de reservas futuras.

La tabla y el formulario compartirán componentes visuales de panel, estados y feedback. La información de empleados inactivos seguirá visible con estado explícito.

## Mascotas

Se conservarán:

- CRUD de mascotas del usuario autenticado.
- Historial de reservas.
- Acceso solo a mascotas propias mediante las consultas y reglas existentes.

La página adoptará `AdminShell` aunque el módulo sea de cliente, con navegación y perfil consistentes.

## Responsive y Accesibilidad

- Sidebar como drawer con botón etiquetado y `aria-expanded`.
- Foco visible en enlaces, botones, inputs, selects y drawer.
- Cierre del drawer al cambiar de ruta o activar la acción de cierre.
- Tablas con encabezados semánticos y transformación legible en pantallas pequeñas.
- Formularios con `label`, `aria-invalid`, `aria-describedby` y mensajes asociados.
- No depender únicamente de color para distinguir estados.
- `prefers-reduced-motion` respetado.
- Contraste mínimo 4.5:1 para texto normal en superficies claras.

## Manejo de Errores y Estados

- Carga: skeleton o estado textual contextual, nunca un contenedor vacío ambiguo.
- Error de perfil: mensaje claro y acción de salida o reintento cuando corresponda.
- Error de consulta: conservar feedback actual y no presentar datos parcialmente como completos.
- Error de mutación: mensaje junto a la acción afectada; bloquear solo la operación en curso.
- Éxito: mensajes de estado con `role="status"`.
- Cierre de sesión: limpiar navegación privada y volver a `/login` o al home según el flujo existente.

## Pruebas y Criterios de Aceptación

### Unitarias y de render

- Login renderiza campos, acción, enlace a registro y estados accesibles.
- Registro renderiza validaciones y enlace a login.
- `AuthShell` no expone navegación administrativa.
- `AdminShell` renderiza navegación, perfil, rol y cierre de sesión.
- La navegación admin no muestra Empleados a perfiles no admin.
- `next` se conserva durante la redirección de una ruta privada al login.

### Reglas de negocio

- Los tests existentes de servicios, reservas y roles permanecen verdes.
- No se crean nuevas vías de escritura directa para reservas, usuarios o empleados.
- No se modifica la suite de reglas para hacer pasar una prueba visual.

### Browser QA local

- Login admin con usuario dedicado de emulador.
- Login cliente con usuario dedicado de emulador.
- Redirección de usuario anónimo a login y regreso a `next`.
- Logout y bloqueo de regreso a rutas privadas.
- Navegación por dashboard, agenda, empleados y mascotas.
- CRUD de empleados y estados existentes.
- Verificación responsive en desktop y mobile.

### Verificaciones finales

- `npm run test:client`.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.
- `npm audit --omit=dev`.
- `npm run qa:local`.

## Riesgos y Decisiones

- **Riesgo:** consolidar cuatro páginas en un shell compartido puede revelar pequeñas diferencias de markup y estilos.
  - **Mitigación:** migración incremental por página, con pruebas de render y browser QA después de cada bloque.
- **Riesgo:** ocultar enlaces admin puede confundirse con autorización.
  - **Mitigación:** mantener `ProtectedRoute`, `requireRole` y reglas Firebase sin cambios.
- **Decisión:** no implementar módulos “Clientes” o “Reportes” todavía.
  - **Motivo:** fueron marcados como próximos en el producto actual y no tienen contrato funcional aprobado.
