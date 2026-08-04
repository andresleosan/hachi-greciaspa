# Fase 3: Gates operativos y dependencias

## Objetivo

Reconciliar la documentación con la implementación real, dejar documentados los gates externos de producción y corregir la vulnerabilidad de la dependencia de `react-router` sin ejecutar cambios destructivos ni despliegues.

## Alcance aprobado

- Se pueden modificar archivos del repositorio.
- No se ejecutarán cambios externos en Firebase Console, Google Cloud, Resend o producción.
- No se ejecutará `firebase deploy`.
- No se ejecutará `npm audit fix --force`.
- Se preservarán los cambios locales existentes del worktree.

## Diseño

### 1. Reconciliación documental

Actualizar `docs/tasks.md`, `docs/Fase3.md` y `docs/RUNBOOK.md` únicamente con evidencia verificable:

- Marcar como implementado solo el código y las pruebas que existen.
- Separar implementación local de configuración y despliegue externos.
- Registrar la evidencia reciente de TypeScript, build, reglas y Functions.
- Mantener pendientes los gates de dominio, secreto, budget alert, QA de navegador y autorización de producción.

No se marcarán como completos los AC que requieren una acción operativa todavía no verificada.

### 2. Gates operativos

El repositorio documentará el procedimiento y el estado actual de:

- Verificación DNS del dominio propio del spa con SPF, DKIM y DMARC.
- Creación de `RESEND_API_KEY` en Firebase Secret Manager.
- Configuración de budget alert de `$10` con notificaciones en `$1`, `$5` y `$10`.
- Verificación de rollback y deshabilitación de la Function programada.
- Evidencia local de typecheck, build, reglas, Functions y revisión de seguridad.

La documentación dirá explícitamente `no verificado` cuando la evidencia dependa de una consola externa.

### 3. Dependencia vulnerable

Fijar `react-router-dom` en la última versión estable publicada y verificable, actualmente `7.18.2`, mediante instalación normal. Esta versión es la mejor opción disponible para el proyecto SPA. Si `npm audit` conserva un advisory exclusivo de RSC, documentar su alcance residual porque la aplicación no usa RSC ni server actions; no suprimir el advisory.

No se aceptará una actualización forzada que cambie Firebase Tools u otras dependencias no relacionadas. Las vulnerabilidades restantes de `devDependencies` se reportarán separadas de las dependencias de producción.

## Verificación

Cada bloque tendrá una verificación independiente:

1. `git diff --check` sobre la documentación.
2. Validación de que los gates externos permanecen sin afirmar como completados.
3. `npm audit --omit=dev`, `npx tsc --noEmit`, `npm run build`, `npm run rules:test`, `npm --prefix functions test`, `npm --prefix functions run typecheck` y `npm --prefix functions run build`.

## Resultado esperado

El proyecto quedará documentado como MVP verificado en transición operativa a Fase 3, con recordatorios implementados localmente pero no habilitados en producción, `react-router-dom@7.18.2` como versión estable actual y cualquier advisory residual de RSC explícitamente evaluado y no oculto.
