# T3.5 Gestion de empleados y autoasignacion

## Objetivo

Habilitar la operacion de terapeutas del spa sin asignacion manual de cada cita.
El admin podra gestionar empleados, servicios y turnos semanales. Las reservas
se asignaran automaticamente al primer empleado elegible por nombre, evitando
solapamientos. Las reservas que no puedan asignarse permaneceran en cola hasta
que una actualizacion de agenda encuentre disponibilidad.

Esta especificacion cubre T3.5 y no inicia la release operativa ni el Track B de
UX. Esas fases comenzaran despues de implementar, verificar y documentar T3.5.

## Decisiones aprobadas

- Se implementara con backend autoritativo: trigger de creacion mas callable de
  reintento desde la agenda.
- Al crear una reserva, `onReservaCreated` intentara asignar un empleado.
- Si no hay candidato, la reserva conservara `status: 'pending'` y
  `empleadoId: null`.
- Al abrir o cambiar la fecha de `/dashboard/agenda`, una callable reintentara
  las reservas pendientes sin empleado para ese dia.
- Los candidatos se ordenaran por nombre normalizado y despues por ID para
  garantizar un resultado estable.
- Solo se consideran libres los empleados sin reservas activas solapadas.
  Los estados activos para esta regla son `pending` y `confirmed`.
- Si todos los candidatos estan ocupados, la reserva permanece sin asignar.
- Al reagendar, se conserva el empleado si sigue siendo elegible y libre. Si
  queda ocupado, se limpia `empleadoId` y se reintenta al actualizar la agenda.
- Si un servicio no tiene empleados elegibles, la reserva no se rechaza.
- Los tres empleados iniciales son Harold Salcedo, Daniela Padilla y Alberto
  Gonzalez.
- Harold y Daniela pueden atender `spa-day`, `grooming`, `guarderia` y
  `pension`. Alberto puede atender `spa-day`, `guarderia` y `pension`.
- Los tres tienen turno `full` de lunes a sabado y ningun turno el domingo.
- Los turnos son `morning` (08:00-14:00), `afternoon` (14:00-20:00) y `full`
  (08:00-20:00).
- La baja de un empleado es una desactivacion logica con `active: false`.

## Modelo de datos

### `empleados/{empId}`

```ts
interface Empleado {
  id: string
  name: string
  role: 'groomer' | 'bañador' | 'cuidador'
  photoUrl: string | null
  active: boolean
  services: string[]
  weeklyShifts: {
    monday: 'morning' | 'afternoon' | 'full' | null
    tuesday: 'morning' | 'afternoon' | 'full' | null
    wednesday: 'morning' | 'afternoon' | 'full' | null
    thursday: 'morning' | 'afternoon' | 'full' | null
    friday: 'morning' | 'afternoon' | 'full' | null
    saturday: 'morning' | 'afternoon' | 'full' | null
    sunday: 'morning' | 'afternoon' | 'full' | null
  }
}
```

`services` contiene IDs de `servicios`, no nombres visibles. Un turno debe
cubrir el inicio y el final de la reserva; una cita que cruza el final del
turno no es elegible para ese empleado.

### `reservas/{reservaId}`

Se agrega un campo opcional:

```ts
empleadoId: string | null
```

Los documentos existentes que no tengan el campo se interpretan como
`empleadoId: null`. Se incluira un backfill idempotente que solo agrega `null`
cuando el campo falta; no reasigna reservas historicas ni se ejecuta contra
produccion desde esta tarea.

## Flujo de asignacion

### Creacion

1. El cliente crea la reserva con el flujo existente y no puede elegir
   `empleadoId`.
2. `onReservaCreated` recibe el documento creado.
3. La funcion descarta reservas que ya tengan `empleadoId` o no esten en
   `pending`.
4. Obtiene empleados activos que incluyan el `serviceId`.
5. Filtra el turno del dia y la duracion completa de la reserva.
6. Filtra reservas `pending` o `confirmed` que se solapen en la misma fecha.
7. Ordena candidatos por nombre normalizado y luego por ID.
8. Escribe unicamente `empleadoId` del primer candidato dentro de una
   transaccion segura.
9. Si no hay candidato, conserva la reserva sin asignar y registra una razon
   operativa sin datos sensibles.

### Reintento desde agenda

La callable `assignPendingReservasForDate` recibira una fecha ISO y requerira
usuario autenticado con rol admin. Procesara reservas `pending` de esa fecha
sin empleado, en orden de hora y ID, usando el mismo helper de asignacion que
el trigger. Solo escribira `empleadoId` y devolvera un resumen de asignadas y
pendientes.

La pagina `/dashboard/agenda` la invocara al cargar una fecha o cambiarla.
El filtro de terapeuta se aplicara sobre los datos recargados, y la vista
mostrara una seccion explicita para reservas sin asignar.

### Reagendado

`rescheduleReserva` reutilizara el helper de elegibilidad dentro de su flujo
server-side existente. Si el empleado actual sigue libre, se conserva. Si no,
la escritura deja `empleadoId: null`; no se asigna silenciosamente otro
empleado durante el reagendado. La siguiente carga de agenda reintentara la
reserva.

## Interfaz administrativa

Se agregara `/dashboard/empleados`, protegida con `ProtectedRoute` y
`requireRole="admin"`.

La lista mostrara nombre, rol, estado, servicios, turnos y reservas futuras.
El formulario de alta y edicion permitira modificar nombre, rol, foto, estado,
servicios y turno de cada dia. La desactivacion conservara el documento y no
alterara reservas historicas.

La agenda existente incorporara:

- filtro funcional por terapeuta;
- nombre del empleado en cada bloque asignado;
- contador o lista de reservas sin empleado;
- reintento de asignacion al cargar o cambiar fecha;
- estado de carga y error si falla la callable.

No habra asignacion manual en el drawer. El admin corrige la configuracion de
empleados y la agenda vuelve a intentar la cola.

## Seguridad y reglas

- `empleados` sera lectura y escritura exclusiva de admin.
- El create de reservas no permitira al cliente establecer un
  `empleadoId` distinto de `null` o ausente.
- Las actualizaciones del cliente no podran agregar, cambiar ni eliminar
  `empleadoId`.
- El trigger y la callable usaran Admin SDK, autenticacion de callable y la
  comprobacion de rol admin existente.
- Ningun secreto se agregara al repositorio.
- No se agregaran permisos para que clientes lean la coleccion completa de
  empleados.

## Errores, idempotencia y rollback

- El trigger no reasignara documentos que ya tengan empleado.
- Una repeticion de la callable no debe cambiar una asignacion valida.
- Un fallo de asignacion no debe cancelar ni borrar la reserva.
- Los errores visibles en agenda seran mensajes generales; los logs no
  incluiran email, tokens ni credenciales.
- El rollback de codigo consiste en retirar UI, callable y trigger, y revertir
  reglas despues de inspeccionar el diff. No se borraran empleados ni campos
  de reservas.
- El backfill sera reversible unicamente eliminando el campo `empleadoId` de
  los documentos tocados; no se ejecutara automaticamente en produccion.

## Pruebas y verificacion

Se agregaran pruebas para:

- tipos de empleado, servicios y turnos;
- cobertura de un turno sobre fecha, hora y duracion;
- orden estable por nombre e ID;
- exclusion de empleados inactivos o incompatibles;
- exclusion de reservas solapadas activas;
- cola cuando no existe candidato;
- asignacion despues de liberar disponibilidad;
- preservacion o limpieza durante reagendado;
- idempotencia del trigger y de la callable;
- autenticacion y autorizacion de callable;
- reglas de empleados y proteccion de `empleadoId`.

La matriz de verificacion sera:

```text
npx tsc --noEmit
npm run build
npm run test:client
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
```

Browser QA se ejecutara solo contra emulador o entorno de prueba, verificando
admin, filtro por terapeuta, alta/edicion/desactivacion, turnos, cola y
reintento. No se hara deploy ni se usaran datos de produccion.

## Fuera de alcance

- Balanceo por carga o rotacion.
- Asignacion manual por reserva.
- Excepciones de horario por fecha, vacaciones o bloqueos individuales.
- Notificaciones al cliente sobre la asignacion.
- Nuevos roles de autenticacion para empleados.
- Release operativa de Resend, billing, budget, despliegue o dominio.
- T3.6 mascotas y T3.7 re-booking.
