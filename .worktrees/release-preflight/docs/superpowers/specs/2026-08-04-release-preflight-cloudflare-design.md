# Preflight de Release y Conexion Futura con Cloudflare

## Objetivo

Crear un preflight local reproducible para la release operativa de Hachi &
Grecia Spa y documentar la arquitectura gratuita que se usara cuando el
operador adquiera un dominio propio.

El preflight verifica el codigo y la evidencia local, pero no convierte esa
evidencia en autorizacion de produccion. No activa Billing/Blaze, no configura
Resend, no crea secretos, no modifica DNS, no ejecuta backfill productivo y no
despliega Firebase.

## Estado actual y decisiones aprobadas

- El frontend continuara en Vercel Free.
- Firebase Auth y Firestore continuaran en Spark mientras el uso lo permita.
- Cloud Functions y recordatorios no se desplegaran hasta confirmar Billing y
  Blaze.
- El dominio `hachi-greciaspa.vercel.app` no se usara para verificar Resend
  porque el operador no controla su DNS.
- El dominio propio se adquirira mas adelante.
- Cloudflare se usara como DNS gratuito del dominio propio, no como reemplazo
  inmediato de Vercel.
- Resend se configurara solo despues de tener dominio propio y sus registros
  SPF, DKIM y DMARC disponibles.
- `RESEND_API_KEY` permanecera exclusivamente en Firebase Secret Manager y
  nunca llegara al frontend, repositorio o logs.
- El correo destinatario del budget y la configuracion de Billing quedan para
  una operacion posterior; no se usara un destinatario temporal.

## Preflight local

Se agregara el comando `npm run release:preflight`. Debe ejecutar, en orden y
detenerse ante errores de comandos base:

```text
npm run test:client
npm test
npx tsc --noEmit
npm run build
npm --prefix functions run typecheck
npm --prefix functions run build
git diff --check
npm audit --omit=dev
npm audit --prefix functions --audit-level=high
```

El comando no debe leer valores de `.env`, imprimir secretos ni ejecutar
`firebase deploy`. Los checks de audit deben conservar su salida y clasificar
los advisories conocidos como warning, no ocultarlos ni aplicar
`npm audit fix --force`.

El resultado se clasificara asi:

- `PASS`: comando local ejecutado con exit code 0.
- `WARN`: advisory conocido, QA de navegador incompleto o limitacion externa
  que no invalida el codigo local.
- `BLOCKED`: falta de dominio, credencial, Billing/Blaze, autorizacion,
  rollback o evidencia requerida para produccion.

El preflight producira un resumen legible en stdout y un reporte fechado en
`docs/release-preflight.md`. El reporte incluira commit, fecha, comandos,
resultado, advertencias conocidas y gates externos pendientes.

## Criterios de cierre local

El preflight local se considera completado cuando:

1. Tests cliente, rules, Functions, typechecks y builds pasan.
2. `git diff --check` pasa.
3. Los dos `npm audit` se ejecutan y su salida se conserva aunque reporten
   advisories.
4. El reporte diferencia evidencia local de verificacion de produccion.
5. El reporte deja como pendientes dominio propio, Resend, Secret Manager,
   Billing/Blaze, budget, QA browser completo, autorizacion, rollback y deploy.

El resultado global puede ser `PASS_WITH_WARNINGS` y nunca debe llamarse
`production ready` mientras exista un gate externo pendiente.

## Arquitectura futura de dominio

Cuando exista el dominio propio:

1. Registrar el dominio en Cloudflare y mantener sus nameservers bajo control
   del operador.
2. Crear los registros web indicados por Vercel para el apex y/o `www`.
3. Validar el sitio en Vercel antes de activar cualquier proxy adicional.
4. Agregar en Cloudflare los registros SPF, DKIM y DMARC que entregue Resend.
5. Mantener los registros de verificacion de email en modo DNS-only cuando el
   proveedor lo requiera.
6. Agregar el dominio propio a Firebase Auth `Authorized domains`.
7. Configurar App Check para el dominio autorizado si corresponde.
8. Solo despues verificar dominio, Billing, budget, secreto, rollback y QA,
   autorizar el despliegue de Functions.

Los valores exactos de DNS no se inventaran en el repositorio: se copiaran de
las instrucciones actuales de Vercel, Cloudflare y Resend durante la operacion
posterior.

## Costos y limites

- Vercel Free: costo esperado `$0` para el frontend actual.
- Firebase Spark: costo esperado `$0` mientras el uso permanezca en cuotas.
- Blaze/Functions: estimacion operativa de `$0–3/mes` para el baseline actual,
  pero requiere billing y puede generar cargos.
- Resend: estimacion de `$0–3/mes` para el volumen documentado, sujeto a
  verificacion del dominio y limites del proveedor.
- Cloudflare DNS Free: costo esperado `$0`; el dominio registrado tiene costo
  independiente y aun no fue adquirido.
- Budget alert de `$10/mes`: no esta configurado; las alertas no imponen un
  limite duro de facturacion.

## Rollback y seguridad

- El rollback del preflight consiste en retirar el script y el reporte; no hay
  migracion ni cambio de datos.
- Si una operacion futura expone un secreto, se debe revocar/rotar antes de
  continuar y preservar evidencia del incidente.
- Ningun check del preflight debe usar credenciales productivas.
- Ningun resultado local autoriza deploy por inercia.
- El despliegue futuro requerira security baseline sin hallazgos criticos,
  suite verde, rollback documentado, autorizacion explicita y browser QA
  reciente sin hallazgos abiertos.

## Fuera de alcance

- Comprar o transferir el dominio.
- Cambiar nameservers o registros DNS ahora.
- Configurar Resend, Secret Manager, Billing o budget ahora.
- Activar Blaze o desplegar Functions/Hosting.
- Ejecutar backfill productivo.
- Migrar de Vercel a Cloudflare Pages.
- Implementar T3.6 “Mis mascotas”.
