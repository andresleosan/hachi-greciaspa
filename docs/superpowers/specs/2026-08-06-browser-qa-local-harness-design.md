# Harness Local De Browser QA

**Fecha:** 2026-08-06
**Estado:** diseño aprobado por el operador
**Alcance:** QA E2E local de autenticación, agenda, empleados y reagendado

## Objetivo

Crear una corrida reproducible de Playwright que valide los flujos autenticados de Fase 3
contra Firebase Emulator Suite, sin credenciales productivas, servicios externos ni cambios en
producción. La corrida debe poder iniciarse desde la raíz del repositorio con una única orden y
debe dejar un reporte HTML de Playwright.

## Contexto actual

- `qa/tests/public-pages.spec.mjs` cubre las rutas públicas y actualmente omite los casos de
  login cuando no existen credenciales de QA.
- `qa/playwright.config.mjs` apunta por defecto a la aplicación pública.
- `firebase.json` configura Auth Emulator en `9099` y Firestore Emulator en `8080`; Functions
  Emulator se usará en `5001` cuando la instalación local lo soporte.
- `docs/RUNBOOK.md` exige variables dummy y prohíbe credenciales productivas para QA local.
- El código de la aplicación ya soporta `VITE_USE_FIREBASE_EMULATOR=true`.

## Diseño

### Orquestación

Un script Node de QA será el único punto de entrada. Su responsabilidad será:

1. Comprobar prerrequisitos locales sin leer archivos `.env` ni secretos.
2. Arrancar Auth, Firestore y Functions Emulator en procesos hijos.
3. Esperar los puertos de los emuladores antes de continuar.
4. Crear cuentas y datos de prueba mediante Admin SDK conectado al emulador.
5. Ejecutar Playwright contra un servidor Vite local con variables Firebase dummy.
6. Propagar el código de salida de Playwright.
7. Cerrar Vite y los emuladores incluso si la suite falla.

La orden de QA no ejecutará `firebase deploy`, `gcloud`, Vercel CLI ni llamadas a servicios
externos. Los puertos y procesos se mantendrán locales (`127.0.0.1`).

### Datos de prueba

El setup generará datos deterministas dentro del emulador:

- Un usuario admin con perfil `role: 'admin'` y custom claim admin cuando el flujo actual lo
  requiera.
- Un usuario cliente con perfil `role: 'client'`.
- Servicios y precios mínimos mediante el seed existente.
- Empleados activos con servicios y turnos compatibles.
- Reservas futuras controladas para probar agenda, conflicto y reagendado.

Las credenciales serán efímeras, estarán disponibles solo como variables del proceso de la
corrida y no se escribirán en archivos versionados, reportes ni logs. El setup deberá limpiar los
datos al apagar los emuladores, por lo que no necesita migración ni rollback de datos reales.

### Cobertura E2E

La suite incorporará casos separados y legibles:

- **Autenticación por rol:** admin y cliente pueden iniciar sesión en el entorno emulado y llegan
  a su dashboard correspondiente.
- **Empleados:** admin crea un empleado, edita sus datos y ejecuta la baja lógica; la suite
  verifica persistencia después de recargar.
- **Agenda:** admin abre la agenda, selecciona fecha y verifica filtros por empleado y por
  reservas sin terapeuta asignado.
- **Reserva y cancelación:** cliente crea una reserva futura y cancela únicamente su propia
  reserva cuando el estado lo permite.
- **Reagendado:** cliente mueve una reserva `pending` a un slot futuro libre y la suite verifica
  el resultado visible y la conservación o limpieza de `empleadoId` según la disponibilidad.

Los casos no usarán selectores frágiles basados en clases visuales cuando existan roles, labels,
texto semántico o atributos accesibles equivalentes.

### Configuración de Playwright

La configuración local será separable de la corrida pública actual:

- La suite pública conservará su `baseURL` por defecto.
- La corrida local usará `QA_BASE_URL` para apuntar a Vite en `127.0.0.1`.
- Los datos de login se inyectarán desde el setup de la corrida, no desde `.env.local`.
- El reporte HTML seguirá en `qa/reports/` y los artefactos de fallo serán temporales e
  ignorados por Git.

### Errores y limpieza

- Si un emulador no inicia o un puerto está ocupado, la corrida fallará con un mensaje accionable
  y no intentará conectarse a producción.
- Si el setup de datos falla, Playwright no comenzará y el orquestador terminará todos los
  procesos iniciados.
- Si una prueba falla, se conservarán screenshot, video o trace según la configuración existente.
- El proceso de limpieza será idempotente y tolerará que un proceso hijo ya haya terminado.

## Criterios de aceptación

1. Una orden documentada ejecuta emuladores, Vite, setup y Playwright sin intervención manual.
2. La corrida usa exclusivamente Auth/Firestore/Functions Emulator y valores Firebase dummy.
3. Los casos de admin, cliente, empleados, agenda, cancelación y reagendado son ejecutables sin
   `test.skip` por falta de credenciales.
4. Una falla de un caso produce código de salida distinto de cero y reporte HTML.
5. La suite termina sus procesos hijos en éxito y en fallo.
6. No se agregan secretos, cuentas productivas, migraciones ni cambios de reglas para hacer pasar
   la QA.
7. La evidencia documenta explícitamente qué cubre la corrida y qué gates externos siguen
   pendientes.

## Fuera de alcance

- QA contra producción o Vercel.
- Configuración de Billing/Blaze, Resend, DNS, Secret Manager o App Check en consola.
- Backfill productivo.
- Pruebas de carga, regresión visual o auditoría de accesibilidad completa.
- Sustituir la suite de rules o los tests unitarios existentes.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Emuladores lentos o con puertos ocupados | Health checks con timeout y diagnóstico del puerto/proceso |
| Diferencias entre datos emulados y producción | Mantener reglas y Functions reales; limitar el alcance a flujos funcionales |
| Credenciales filtradas en artefactos | Generarlas en runtime y sanitizar salida del orquestador |
| Flakiness por animaciones | Desactivar o esperar estados accesibles; no usar sleeps arbitrarios |
| Reagendado dependiente del reloj | Usar fechas calculadas en la zona horaria del negocio y slots claramente futuros |
