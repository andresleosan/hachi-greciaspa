# Runbook Operativo — Fase 3

Proyecto: `hachi-greciaspa`
Estado al 2026-08-09: transición operativa; Blaze está confirmado, pero la cuenta de facturación, el budget y las notificaciones de Google Cloud Console permanecen pendientes.

## Alcance

Este runbook cubre el gate de costos, la operación segura de las Functions programadas para recordatorios y la operación local de empleados/asignación. No registra como completada ninguna configuración de Google Cloud Console, Firebase, Secret Manager, dominio o despliegue que el operador todavía no haya verificado.

## Preflight Local De Release

Ejecutar desde la raíz del repositorio:

```bash
npm run release:preflight
```

El comando ejecuta la matriz local de tests, rules, Functions, typechecks, builds, `git diff --check` y auditorías. `PASS` indica un comando sin errores; `WARN` conserva un advisory de auditoría; `BLOCKED` indica un fallo de un check requerido; `PASS_WITH_WARNINGS` significa que la evidencia local pasó, pero existen warnings o gates externos pendientes.

El reporte se escribe en `docs/release-preflight.md`. Un preflight local exitoso no autoriza producción, no configura proveedores externos y no ejecuta deploy. La salida nunca debe interpretarse como `production ready` mientras los gates de dominio, Resend, Secret Manager, cuenta de facturación, budget, browser QA, rollback y autorización continúen bloqueados.

El preflight no lee valores de `.env`, claves, tokens ni cuentas de servicio. No ejecutar `npm audit fix --force`; los advisories conocidos se conservan como evidencia para una decisión separada.

## Creación De Reservas Callable

### Contrato Y Controles Locales

El navegador envía únicamente `serviceId`, `date`, `timeSlot`, `mascotaId` y
`notes` a `createReserva` mediante `httpsCallable`. Functions crea la reserva
canónica dentro de una transacción y deriva identidad, servicio, duración,
snapshots, `price: null`, estado `pending` y `createdBy` desde fuentes
server-side. `firestore.rules` niega el `create` directo de `reservas`.

La callable valida Auth y App Check antes de entrar al handler. Una invocación
que supera ambas validaciones consume un intento: máximo 3 dentro de 15
minutos. También exige fecha futura en `America/Mexico_City`, servicio activo,
mascota propia, máximo 10 reservas `pending`/`confirmed` y ausencia de
solapamiento por `durationMin`. `cancelled` y `completed` no cuentan para el
límite activo.

`bookingGuards/{uid}` es privado para Functions/Admin SDK. App Check se omite
únicamente en el emulador: el cliente usa `VITE_USE_FIREBASE_EMULATOR` y la
callable usa `FUNCTIONS_EMULATOR`; no se debe convertir ese bypass en una
configuración de producción.

`bookingSlotGuards/{encodeURIComponent(serviceId)}__{date}` es el lock privado
de disponibilidad compartido por `createReserva` y `rescheduleReserva`. El
orden local verificado dentro de la transacción de creación es:
consumir el guard de cuota, validar la fecha futura, leer el lock del
servicio/día, leer catálogo y mascota si corresponde, consultar los activos del
usuario y todos los activos del servicio/día, y escribir el guard de cuota, el
lock y la reserva en el commit exitoso. `firestore.rules` deniega lectura y
escritura del lock a clientes. El lock se crea lazy, contiene
`serviceId`, `date` y `updatedAt`, y no se escribe cuando la reserva es
rechazada. En `rescheduleReserva`, el lock de destino se lee después de
validar ownership/estado y antes de la consulta de conflictos; se escribe en
el commit exitoso antes de actualizar la reserva. Ambas callables usan el
helper compartido `bookingSlotGuardId`, por lo que una creación y un
reagendado concurrentes del mismo servicio/día compiten por el mismo path.
La contención deliberada queda acotada al servicio/día para admitir duraciones
variables. La consulta de disponibilidad no tiene un límite de documentos
conocido; el lock no reemplaza una futura estrategia de particionamiento o
retención.

### Checks Locales

Ejecutar desde la raíz, sin cargar secretos ni cuentas productivas:

```bash
npm run test:client
npx tsc --noEmit
npm run build
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
npm run qa:local
```

`npm run rules:test` valida que el cliente no pueda crear `reservas` ni leer o
escribir `bookingGuards`/`bookingSlotGuards`. `npm --prefix functions test`
cubre cuota, límite activo, fecha futura, snapshots, mascota, solapamiento,
concurrencia create/create y concurrencia create/reschedule.
`npm run qa:local` ejecuta el flujo de creación/cancelación mediante callable
contra emuladores y no prueba App Check productivo.

Evidencia local fechada 2026-08-09: cliente `34 archivos / 156 passed`, rules
`74 passed, 0 failed`, Functions `159 passed, 2 skipped`, typecheck/build de
cliente verdes, seed `2 passed, 0 failed`, `npm audit --omit=dev` con `0
vulnerabilities` y `npm run qa:local` con `22 passed, 0 failed`. `firebase use`
devolvió `hachi-greciaspa`. Esta evidencia es local, no autoriza despliegue ni
declara production-ready.

### Gates Externos Antes De Producción

Los siguientes puntos no se consideran completados por los checks locales:

- [ ] Firebase Console: habilitar App Check con el proveedor aprobado y
  verificar rechazo de invocaciones sin token válido en el entorno desplegado.
- [ ] Billing: confirmar la cuenta de facturación requerida para Functions. La
  cuenta de facturación permanece no verificada.
- [x] Plan Blaze: confirmado el 2026-08-09. La confirmación no incluye la cuenta
  de facturación.
- [ ] Budget alert: crear y verificar la alerta aprobada, incluido su alcance y
  destinatarios. La consola mostró: `No se pudo configurar una alerta de presupuesto. Vuelve a intentarlo o, si el error persiste, visita Google Cloud Console.` El diagnóstico de permisos IAM o alcance del proyecto/cuenta queda pendiente; es una hipótesis, no una causa confirmada.
- [ ] Secret Manager/Resend: verificar dominio y configurar el secreto
  `RESEND_API_KEY` sin escribir su valor en repositorio, logs o frontend.
- [ ] Deploy/autorización: revisar Rules, Functions y cliente con el operador y
  obtener autorización explícita; este runbook no incluye un comando productivo
  ejecutable sin esa autorización.
- [ ] Rollback operativo: revisar el procedimiento, conservar reservas,
  guards y locks, y confirmar cómo deshabilitar la callable y retirar los
  índices nuevos sin borrar datos. No se borran documentos de
  `bookingSlotGuards` durante el rollback.
- [ ] Browser QA productivo: ejecutar el flujo autenticado de crear/cancelar y
  verificar App Check, cuota, fecha futura, límite y solapamiento en el entorno
  desplegado.

## Empleados Y Asignación Local

### Prerrequisitos del emulador

- Node instalado para el cliente y `functions`.
- JDK 21 para el emulador de Firestore.
- Iniciar únicamente servicios locales: `npx firebase emulators:start --only auth,firestore,functions`.
- Puertos esperados: Auth `9099`, Firestore `8080`, Functions `5001`.
- Para el navegador, configurar `VITE_USE_FIREBASE_EMULATOR=true` y valores dummy de `VITE_FIREBASE_*`; nunca cargar credenciales productivas para esta QA.

### Seed Y Backfill

El seed usa IDs estables y merge writes, por lo que es idempotente:

```bash
npm run seed:employees -- --emulator
```

Para normalizar reservas legacy, el modo por defecto es dry-run:

```bash
node tools/backfill-empleado-id.mjs --emulator --manifest /tmp/backfill-empleado-id-dry-run.json
node tools/backfill-empleado-id.mjs --emulator --apply --manifest /tmp/backfill-empleado-id-apply.json
```

El backfill solo agrega `empleadoId: null` cuando falta el campo. No elige empleados ni modifica otros campos. Cada corrida escribe un manifiesto JSON con los IDs que serían o fueron afectados; el modo apply incluye únicamente los IDs confirmados por la transacción. Conserva ese archivo para localizar exactamente los documentos si se autoriza un rollback posterior. La variante con cuenta de servicio requiere `--service-account /ruta/serviceAccount.json`; antes de una ejecución productiva futura debe existir un respaldo verificado. Esta tarea no ejecuta el backfill productivo.

### Semántica Operativa

- `weeklyShifts` contiene `monday` a `sunday`; `morning` es 08:00–14:00, `afternoon` 14:00–20:00 y `full` 08:00–20:00.
- Solo empleados `active: true` que incluyen el `serviceId` y tienen turno compatible son candidatos.
- `onReservaCreated` asigna nuevas reservas con retry y escribe únicamente `empleadoId` dentro de una transacción.
- `assignPendingReservasForDate` es callable solo para usuarios admin y reintenta reservas `pending` sin asignación al cargar/refrescar la agenda.
- El primer candidato se ordena por nombre normalizado y luego por ID. Las reservas `pending` y `confirmed` ocupan al empleado si se solapan; `cancelled` y `completed` no bloquean.
- Si no existe candidato, la reserva conserva `empleadoId: null` y aparece en "Sin terapeuta asignado".
- `rescheduleReserva` conserva el empleado cuando sigue elegible y libre; si el nuevo slot está ocupado o deja de cumplir el turno/servicio, limpia `empleadoId`. La siguiente carga de agenda puede reintentar la asignación.
- La asignación de `reservas.empleadoId` pertenece a Functions/Admin SDK. El cliente no puede escribirlo, cambiarlo ni quitarlo.

### Estado De Producción

No se ejecutó backfill productivo, no se desplegaron Functions, no se usaron credenciales productivas y no se modificaron datos productivos como parte de esta tarea.

## Gate De Costos Y Despliegue

Completar en el orden indicado antes de habilitar o desplegar una Function programada:

- [ ] **Cuenta de facturación:** confirmar que el proyecto `hachi-greciaspa` está asociado a la cuenta de facturación correcta. Estado actual: **no verificado**.
- [x] **Plan Blaze:** confirmado el 2026-08-09. La cuenta de facturación asociada no está marcada por falta de evidencia específica.
- [ ] **Budget:** crear un presupuesto de `$10/mes`, con alcance limitado al proyecto y a la cuenta de facturación correctos. Estado actual: **no verificado**; la consola mostró: `No se pudo configurar una alerta de presupuesto. Vuelve a intentarlo o, si el error persiste, visita Google Cloud Console.` El diagnóstico de permisos IAM o alcance del proyecto/cuenta está pendiente y no confirma la causa.
- [ ] **Notificaciones:** configurar alertas de gasto real y gasto pronosticado en `$1`, `$5` y `$10`. Estado actual: **no verificado**.
- **Registro operativo:** después de completar los pasos anteriores en consola, registrar los destinatarios de las notificaciones y la fecha de verificación. No completar esos campos de forma anticipada.

Google Cloud Budgets envía alertas, pero no impone un límite duro de facturación. La alerta de `$10` no evita cargos adicionales. Ante un gasto inesperado, ejecutar el procedimiento de emergencia de este documento.

Registro posterior a la verificación:

```text
Cuenta de facturación confirmada: [completar después de verificar]
Plan Blaze confirmado: sí (verificado 2026-08-09)
Budget de $10 creado y alcance confirmado: [pendiente; bloqueado por error de consola]
Alertas real/pronosticado en $1, $5 y $10: [completar después de verificar]
Destinatarios: [completar después de verificar]
Fecha de verificación: [completar después de verificar]
Operador: [completar después de verificar]
```

## Gate De Release

Autorizar producción solo cuando cada punto tenga evidencia y autorización explícita:

- [ ] Dominio propio del spa verificado en Resend, con SPF, DKIM y DMARC configurados según las instrucciones del proveedor; no usar un dominio compartido, personal o de prueba en producción.
- [ ] App Check habilitado y verificado en Firebase Console; el rechazo de una invocación sin App Check válido está probado en producción.
- [ ] Secret Manager configurado con el secreto exacto `RESEND_API_KEY`; no colocar su valor en el repositorio, logs o frontend.
- [ ] Cuenta de facturación y budget alert verificados en Google Cloud Console. Blaze está confirmado, pero este gate sigue pendiente.
- [x] Evidencia local de build y typecheck registrada abajo.
- [x] Evidencia local de las pruebas de reglas registrada abajo.
- [ ] Callable `createReserva` desplegada y autorizada; no usar el bypass del emulador fuera de local.
- [ ] Revisión de seguridad completada.
- [ ] QA de navegador productivo completado, separado de la QA local.
- [ ] Procedimiento de rollback operativo revisado y ensayado según autorización.
- [ ] Autorización explícita para producción registrada por el responsable.

El proveedor recomendado es Resend según ADR-004, pero la integración, el dominio, el secreto y el despliegue no están verificados en este runbook.

## Secuencia Futura De Dominio Y DNS

Esta secuencia requiere acción del operador y no forma parte del preflight local:

1. Adquirir un dominio propio y controlar sus nameservers.
2. Agregar en Cloudflare los registros web que indique Vercel para el apex y/o `www`.
3. Validar el sitio en Vercel antes de habilitar proxying opcional.
4. Agregar los registros SPF, DKIM y DMARC que entregue Resend, en modo DNS-only cuando corresponda.
5. Agregar el dominio propio a Firebase Auth `Authorized domains` y configurar App Check si aplica.
6. Confirmar cuenta de facturación, budget, Secret Manager, rollback, autorización y browser QA antes del deploy de Functions. Blaze ya está confirmado.

Los valores exactos de DNS deben copiarse de las instrucciones vigentes de Vercel, Cloudflare y Resend; nunca se inventan en el repositorio. `hachi-greciaspa.vercel.app` no es un dominio válido para verificar Resend porque el operador no controla su DNS.

Costos de planificación: Vercel Free `$0`, Firebase Blaze/pay-as-you-go con Functions `$0–3/mes` para el uso esperado, Resend `$0–3/mes`, Cloudflare DNS `$0`; la compra del dominio es independiente. Blaze está activo, el budget de `$10/mes` aún no está configurado y sus alertas no imponen un límite duro de facturación.

## Evidencia Local — 2026-08-09

Estos resultados pertenecen al repositorio local. No autorizan despliegue ni demuestran que los gates externos estén completados.

```text
npm run test:client                    34 archivos, 156 passed
npm test                                Rules 74 passed, 0 failed; Functions 159 passed, 2 skipped
npx tsc --noEmit                         PASS
npm run build                            PASS
npm run qa:local                         22 passed, 0 failed
node --test qa/local/seed.test.mjs       2 passed, 0 failed
npm audit --omit=dev                     0 vulnerabilities
firebase use                             hachi-greciaspa (read-only discovery)
git diff --check                         PASS
```

La matriz se ejecutó completa en el worktree actual. Las líneas de denegación que imprime la suite de rules son casos esperados; el proceso terminó con código `0` y reportó cero fallos.

## Browser QA Local — Emuladores

### Harness Automatizado

Ejecutar desde la raíz del repositorio:

```bash
npm run qa:local
```

El harness arranca Auth, Firestore, Functions Emulator y Vite en `127.0.0.1`, genera cuentas
efímeras `example.test`, siembra fixtures locales y ejecuta Playwright. Las credenciales solo
viven en el entorno de los procesos y se elimina el override temporal de `functions/.secret.local`
al finalizar. No se leen `.env`, cuentas de servicio ni secretos productivos.

Evidencia local del 2026-08-09: **22 passed, 0 failed**, con reporte HTML en
`qa/reports/local/index.html`. Cubre login admin/cliente, CRUD de empleados, agenda y filtros,
creación/cancelación de reserva, reagendado mediante callable con preservación/limpieza de
`empleadoId`, retry de asignación posterior a cancelación, catálogo público de precios/servicios y
contacto/WhatsApp.

Esta evidencia es exclusivamente contra emuladores. No cierra el gate de browser QA contra
producción ni autoriza despliegue.

Se intentó QA manual con Auth, Firestore y Functions emulator, datos sembrados localmente y cuentas de prueba creadas en el Auth emulator. Se verificaron: redirección de no-admin, CRUD admin de empleados, persistencia de servicios/turnos tras reload, primer empleado elegible, salto por conflicto, cola sin candidato, filtros todos/empleado/sin terapeuta y scroll horizontal móvil.

Limitaciones observadas:

- El browser QA local de preservación y limpieza por conflicto pasó de forma estable; esto no sustituye browser QA contra producción.
- Se observó un `404` de `/favicon.ico`, además de un error transitorio causado por un documento de fixture malformado creado y eliminado exclusivamente en el emulador. No se introdujo cambio de source para corregirlos en esta tarea.
- No se usaron credenciales, cuentas, servicios ni datos de producción.

## Backup Y Restauración Total De Firestore

### Alcance

El backup cubre toda la base Firestore del proyecto, no una colección aislada. Incluye `users`, `servicios`, `precios`, `reservas`, `mascotas`, `recordatorios`, `confirmaciones`, `empleados`, `mensajes` y cualquier colección futura que exista en la base al momento del export. No incluye Firebase Auth, Storage, secretos de Functions ni Cloudflare R2.

Bucket operativo previsto: `gs://hachi-greciaspa-backups/`. Debe tener lifecycle de 90 días, acceso restringido al proyecto y versionado/retención conforme a la política operativa aprobada.

### Export manual controlado

Ejecutar solo después de confirmar proyecto, cuenta, permisos y autorización
explícita del operador. No usar credenciales del repositorio. Este bloque es un
procedimiento futuro y no se ejecuta como parte de la verificación local:

Seleccionar el proyecto confirmado `<PROJECT_ID>` y solicitar una exportación
total de Firestore hacia `<BACKUP_URI>/firestore/<EXPORT_TIMESTAMP>` mediante
el mecanismo operativo aprobado. Verificar que la identidad usada tenga mínimo
privilegio y que no dependa de credenciales almacenadas en el repositorio.
Después, comprobar que la ruta contiene `export_metadata` y los archivos
generados, y que pertenece al proyecto confirmado. Registrar fecha, operador,
proyecto, ruta exacta y resultado. Este procedimiento es descriptivo y no
ejecuta una exportación productiva.

La carpeta debe conservar el `export_metadata` y los archivos generados por Firestore. Registrar fecha, operador, proyecto, ruta exacta y resultado. Un export no se considera verificado solo porque la operación terminó: hay que comprobar que existen los metadatos y que la ruta pertenece al proyecto correcto.

### Programación diaria

La automatización diaria debe ejecutar el mismo export total mediante un componente controlado por Cloud Scheduler, con una cuenta de servicio de mínimo privilegio y sin exponer credenciales en el repositorio. Antes de habilitarla se deben verificar la cuenta de facturación, permisos IAM, lifecycle de 90 días, alertas de presupuesto y una ejecución manual exitosa. Esta automatización no está configurada en el entorno actual.

### Restauración total

1. Declarar mantenimiento y detener temporalmente las escrituras de la aplicación para evitar divergencias.
2. Confirmar dos veces el proyecto destino, la base `(default)` y la ruta exacta del export verificado.
3. Restaurar el export completo:

Solicitar la importación del export verificado ubicado en
`<BACKUP_URI>/firestore/<EXPORT_TIMESTAMP>` hacia el proyecto confirmado
`<PROJECT_ID>` mediante el mecanismo operativo aprobado. Esperar el resultado,
revisar los logs de importación y conservar la evidencia de la operación. No
asumir que la importación borra documentos creados fuera del export.

4. Esperar a que termine la operación y revisar los logs de importación.
5. Verificar documentos representativos en `users`, `reservas`, `mascotas`, `recordatorios` y `confirmaciones`, además del conteo esperado por colección.
6. Reabrir escrituras solo después de confirmar que las reglas, índices y Functions son compatibles con el estado restaurado.

La importación restaura los documentos incluidos en el export y no debe asumirse como una operación de borrado total: documentos creados fuera del backup pueden permanecer. Borrar datos adicionales para forzar una réplica exacta requiere un procedimiento destructivo separado, backup verificado y autorización explícita.

### Rollback Y Contención

- Si el export falla, no se considera backup válido; conservar el último export verificado.
- Si la importación falla, mantener la aplicación en mantenimiento y preservar los logs de la operación.
- No borrar ni sobrescribir el bucket de backups durante una incidencia.
- Para revertir una restauración incorrecta, importar el último export conocido como bueno en un proyecto/base controlado y comparar antes de cambiar el destino operativo.
- Registrar operador, timestamps, rutas de export, comandos ejecutados y evidencia de verificación.

Estado actual: el procedimiento está documentado, pero no hay bucket, export diario, Scheduler ni primer export verificado configurados.

## Secuencia De Ejecución Externa

Esta secuencia es una instrucción operativa pendiente; no se ha ejecutado desde este repositorio:

1. Verificar el dominio propio del spa en Resend y sus registros SPF, DKIM y DMARC.
2. Crear `RESEND_API_KEY` en Firebase Secret Manager sin exponer su valor en el repositorio, logs o frontend.
3. Confirmar la cuenta de facturación y configurar el presupuesto de `$10/mes` con alertas de gasto real y pronosticado en `$1`, `$5` y `$10`. Blaze ya está activo.
4. Obtener autorización explícita para producción.
5. Desplegar solo después de que todos los gates de release estén en verde.
6. Ejecutar una prueba controlada y verificar la idempotencia.
7. Verificar el rollback deshabilitando la Function programada.

Google Cloud Budgets envía alertas, pero no impone un límite duro de facturación.

## Cuotas De Referencia Y Almacenamiento Futuro

Las siguientes cifras son el baseline operativo actual y deben verificarse en la consola y en la documentación de precios vigente antes de producción:

| Servicio | Cuota de referencia |
|---|---|
| Firebase Auth | 50,000 MAU; ~10,000 verificaciones telefónicas/mes |
| Firebase Firestore | 1 GiB; 50,000 lecturas/día; 20,000 escrituras/día; 20,000 borrados/día |
| Firebase Realtime Database | 1 GiB; 100 conexiones simultáneas; 10 GB de descarga/mes |
| Firebase Hosting | 10 GB de almacenamiento; 360 MB/día de transferencia (~10 GB/mes) |
| Firebase Cloud Functions | Requiere Blaze; ~2 millones de invocaciones gratuitas mensuales estimadas |

Cloudflare R2 es una opción futura, no un servicio activo. La galería actual usa paths estáticos y no requiere bucket. Si se evaluara una migración, el baseline sería 10 GB/mes de almacenamiento, 1,000,000 de operaciones Clase A, 10,000,000 de operaciones Clase B y egress gratuito. Fuera de cuota se documentan `$0.015/GB-mes`, `$4.50/millón` de operaciones Clase A y `$0.36/millón` de operaciones Clase B.

No ejecutar `gcloud`, no cambiar la configuración de Billing/Blaze, no crear buckets ni configurar lifecycle policies como parte de este runbook sin autorización explícita del operador.

## Emergencia

Ante gasto inesperado, errores repetidos o exposición de un secreto:

1. Deshabilitar la Function programada para detener nuevas ejecuciones.
2. Inspeccionar el uso y los logs para identificar el alcance y la causa.
3. Si el secreto del proveedor pudo quedar expuesto, revocarlo o rotarlo siguiendo el procedimiento del proveedor.
4. Preservar los documentos de `recordatorios` y `confirmaciones` para auditoría; no borrarlos como parte de la contención.
5. Registrar la hora, el operador, las acciones tomadas y la evidencia revisada.

## Rollback

El rollback debe ser reversible y no destructivo:

1. Deshabilitar o retirar la Function programada.
2. Mantener los documentos de `recordatorios` y `confirmaciones` para auditoría y eventual reprocesamiento controlado.
3. No aplicar migraciones destructivas ni borrar datos para resolver una incidencia.
4. Confirmar el estado de la Function y documentar la autorización para cualquier reactivación.
