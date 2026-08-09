# T3.7 Re-booking E2E Design

**Fecha:** 2026-08-09  
**Estado:** aprobado para planificación

## Objetivo

Cerrar la cobertura pendiente de T3.7 verificando en navegador que un cliente puede usar **Reservar de nuevo** desde una reserva completada y llegar al wizard de reservas con servicio, fecha y horario prellenados de forma segura.

## Contexto actual

- `DashboardPage` ya muestra la acción solo para clientes con `status === 'completed'` y `serviceId` válido.
- El enlace genera `/reservar?service=...&timeSlot=...&date=...` usando `encodeURIComponent`.
- `Reservar` ya consume `readBookingPrefill`, valida el identificador del servicio, la fecha ISO y el horario, y descarta fechas u horarios inválidos para el wizard.
- `bookingPrefill.test.ts` cubre valores válidos y parámetros malformados.
- La suite local de Playwright ya autentica un cliente y usa fixtures creados en `qa/local/seed.mjs`.

## Alcance

### Incluido

- Agregar al seed local una reserva completada, determinista por `runId`, para el usuario cliente.
- Agregar un caso E2E autenticado que pulse **Reservar de nuevo** y verifique el destino y los controles preseleccionados.
- Mantener la cobertura unitaria existente del parser de query params.
- Actualizar la evidencia de Fase 3 con el resultado real de la suite.

### Excluido

- Cambios en `DashboardPage`, `Reservar`, Functions, Firestore Rules, índices o contratos productivos.
- Cambios en el flujo que marca una reserva como `completed`; el fixture representa el estado previo requerido para probar re-booking.
- Configuración de Firebase Console, App Check, Resend, Billing, producción o despliegue.
- Creación de una nueva dependencia.

## Diseño técnico

### Fixture

`seedQaBookings` añadirá una reserva con:

- `serviceId: 'spa-day'` y `serviceName: 'Spa Day'`.
- `status: 'completed'`.
- `date: dates.agendaDate`, que es una fecha futura válida para el parser del wizard.
- `timeSlot: '10:00'`, un horario generado por el wizard.
- `notes: 'QA_REBOOK'` para identificar la tarjeta sin depender de su posición.
- El mismo `userId`, `userEmail`, `durationMin` y `createdAt` del fixture base.


### Prueba browser

El caso se agregará a `qa/tests/local-authenticated.spec.mjs` y correrá en la suite serial existente:

1. Iniciar sesión como cliente con el helper `login`.
2. Localizar la tarjeta que contiene `QA_REBOOK`.
3. Verificar que el botón **Reservar de nuevo** está visible.
4. Activar el botón y verificar la URL con `service=spa-day`, `timeSlot=10:00` y `date=<QA_AGENDA_DATE>`.
5. Verificar que el wizard de `/reservar` muestra el servicio `Spa Day` seleccionado.
6. Verificar que el grupo de fecha tiene seleccionada la fecha fixture.
7. Avanzar hasta el paso de horario y verificar que `10:00` está seleccionado.

La prueba validará el contrato público del flujo mediante roles y labels visibles, no mediante clases CSS internas ni acceso directo a Firestore desde Playwright.

## Seguridad y límites

- El seed se ejecuta únicamente dentro de emuladores aislados por `qa/local/run.mjs`.
- Los parámetros siguen entrando por `readBookingPrefill`; el E2E no debe omitir esa validación.
- La reserva completada no habilita acciones de cancelación o reagendado, porque esas acciones se restringen a estados activos.
- No se introducirán credenciales, tokens ni datos de producción.

## Verificación

La entrega se considera completa únicamente si pasan:

- `npm run qa:local`, con el nuevo total de casos y cero fallos.
- `npm run test:client`.
- `npm test`.
- `npx tsc --noEmit`.
- `npm run build`.
- `git diff --check`.

La evidencia será local y no constituirá verificación de producción.
