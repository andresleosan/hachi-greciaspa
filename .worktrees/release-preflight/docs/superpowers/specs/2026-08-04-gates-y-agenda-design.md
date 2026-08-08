# Fase 3: Gates Operativos Y Agenda Diaria

## Objetivo

Continuar el proyecto en dos etapas secuenciales:

1. Cerrar los gates operativos verificables localmente y documentar con honestidad los gates externos pendientes.
2. Implementar `T3.4`, una agenda diaria para administradores con timeline, filtros y acciones sobre reservas.

No se ejecutarán despliegues ni cambios en Firebase Console, Google Cloud o Resend sin autorización explícita.

## Estado Actual

- `T3.3` está implementado localmente: cancelación endurecida y reagendado mediante callable server-side.
- Las Functions de recordatorios, el adaptador Resend, el modelo Firestore y las reglas existen en el repositorio.
- Dominio, `RESEND_API_KEY`, billing, budget alert, despliegue y browser QA externo deben permanecer como no verificados hasta contar con evidencia del operador.
- Al iniciar esta especificación, el worktree estaba limpio y la rama actual era `main`.

## Etapa 1: Gates Operativos

### Alcance

Reconciliar `docs/tasks.md`, `docs/Fase3.md`, `docs/RUNBOOK.md`, `docs/STACK.md` y el plan histórico para distinguir:

- código y pruebas verificadas localmente;
- configuración externa todavía pendiente;
- criterios que no deben marcarse como completos sin evidencia de consola u operador.

Revisar la dependencia de `react-router-dom` y ejecutar `npm audit --omit=dev`. No se ejecutará `npm audit fix --force` ni se actualizarán dependencias no relacionadas sin justificación.

### Verificación

La matriz local será:

```text
npx tsc --noEmit
npm run build
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
```

La documentación debe conservar como pendientes, cuando no haya evidencia externa:

- verificación SPF, DKIM y DMARC del dominio;
- creación y configuración de `RESEND_API_KEY` en Secret Manager;
- budget alert y cuenta de billing;
- browser QA en entorno operativo;
- autorización y despliegue de producción.

### Seguridad Y Límites

- No se agregan secretos al repositorio.
- No se ejecuta `firebase deploy`.
- No se realiza migración destructiva.
- Se preservan cambios existentes no relacionados.
- El resultado de la etapa es un estado de release honesto y un runbook accionable, no una afirmación de disponibilidad productiva.

## Etapa 2: T3.4 Agenda Diaria

### Ruta Y Acceso

Crear `/dashboard/agenda` y protegerla con `ProtectedRoute` usando `requireRole="admin"`. Añadir un enlace real desde el dashboard actual. Los usuarios autenticados sin rol admin serán redirigidos a `/dashboard` por el guard existente.

La agenda se implementará como una página separada para no aumentar las responsabilidades de `DashboardPage.tsx` ni mezclar la vista de resumen con la operación diaria.

### Consulta Y Estado

La página mantendrá:

- fecha seleccionada, inicializada al día local actual;
- reservas del día;
- servicio seleccionado;
- reserva seleccionada para el drawer;
- estado de carga y error de lectura;
- estado de acción por reserva.

La consulta admin será `where('date', '==', fecha)` sobre `reservas`. Los resultados se ordenarán por `timeSlot` en memoria para evitar introducir un índice compuesto innecesario. El filtro por servicio se derivará de los servicios presentes en el resultado.

No se añadirán campos a `reservas` ni se modificarán datos durante la carga.

### Timeline

El timeline cubrirá el horario operativo `08:00`–`20:00` en intervalos de 30 minutos. Cada reserva se ubicará según `timeSlot` y ocupará una longitud proporcional a `durationMin`.

La presentación usará clases y reglas en `src/styles/maqueta.css`; no se usará `style={{}}`. En viewport estrecho, la grilla tendrá desplazamiento horizontal controlado para conservar legibilidad.

Las reservas fuera del horario operativo no se perderán: se mostrarán en una sección de incidencias del día con su hora real y podrán abrirse en el mismo drawer.

### Filtros Y T3.5

- El filtro por servicio será funcional en `T3.4`.
- El filtro por terapeuta quedará preparado visualmente, pero deshabilitado con una indicación de que requiere `empleadoId` y la gestión de empleados de `T3.5`.
- No se inventarán empleados, nombres ni asignaciones que no existan en el schema actual.

### Drawer Y Acciones

Al seleccionar un bloque se abrirá un drawer accesible con:

- servicio y cliente;
- fecha, hora y duración;
- notas disponibles;
- estado actual;
- acciones permitidas.

Las transiciones de la UI serán:

| Estado | Acciones |
|---|---|
| `pending` | Confirmar, cancelar |
| `confirmed` | Marcar completada después de la cita, cancelar |
| `cancelled` | Ninguna |
| `completed` | Ninguna |

Cada acción actualizará únicamente `status` mediante un servicio cliente. Las reglas actuales ya reservan la escritura completa a admin. La UI mostrará confirmación para cancelar, deshabilitará acciones durante la petición y conservará el estado anterior si la escritura falla.

### Pruebas

- Tests unitarios de helpers puros para convertir `HH:mm` y `durationMin` en posición/longitud del timeline.
- Tests unitarios de filtrado por servicio y de la matriz de acciones por estado.
- Verificación de que el acceso no admin a la ruta no expone la agenda.
- Regresión de reglas Firestore para lectura y actualización admin.
- `npx tsc --noEmit`, `npm run build`, `npm run rules:test` y QA navegador con emulador o entorno de prueba, nunca con datos de producción.

## Fuera De Alcance

- Despliegue de Functions, Hosting o reglas.
- Configuración de dominio, Resend, Secret Manager, billing o budget alert.
- Gestión de empleados y filtro de terapeuta funcional (`T3.5`).
- Cambios de schema o migraciones de reservas.
- Re-booking, mascotas, sucursales y pagos.
- Rediseño general del dashboard fuera de lo necesario para enlazar y mostrar la agenda.

## Rollback

La etapa 1 se revierte solo en documentación o dependencia, inspeccionando el diff antes de cualquier reversión.

La etapa 2 se revierte retirando la ruta, el enlace y la página de agenda. No requiere migración porque no agrega campos ni colecciones. Las reservas modificadas por acciones admin conservan su nuevo estado y no se revierten automáticamente.
