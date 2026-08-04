# Runbook Operativo — Fase 3

Proyecto: `hachi-greciaspa`
Estado: transición operativa; las verificaciones de Google Cloud Console permanecen pendientes.

## Alcance

Este runbook cubre el gate de costos y la operación segura de las Functions programadas para recordatorios. No registra como completada ninguna configuración de Google Cloud Console, Firebase, Secret Manager, dominio o despliegue que el operador todavía no haya verificado.

## Gate De Costos Y Despliegue

Completar en el orden indicado antes de habilitar o desplegar una Function programada:

1. **Cuenta de facturación:** confirmar que el proyecto `hachi-greciaspa` está asociado a la cuenta de facturación correcta. Estado actual: **no verificado**.
2. **Plan Blaze:** confirmar y registrar la activación del plan Blaze antes de desplegar Functions programadas. Estado actual: **no verificado**.
3. **Budget:** crear un presupuesto de `$10/mes`, con alcance limitado al proyecto y a la cuenta de facturación correctos. Estado actual: **no verificado**.
4. **Notificaciones:** configurar alertas de gasto real y gasto pronosticado en `$1`, `$5` y `$10`. Estado actual: **no verificado**.
5. **Registro operativo:** después de completar los pasos anteriores en consola, registrar los destinatarios de las notificaciones y la fecha de verificación. No completar esos campos de forma anticipada.

Google Cloud Budgets envía alertas, pero no impone un límite duro de facturación. La alerta de `$10` no evita cargos adicionales. Ante un gasto inesperado, ejecutar el procedimiento de emergencia de este documento.

Registro posterior a la verificación:

```text
Cuenta de facturación confirmada: [completar después de verificar]
Plan Blaze confirmado: [completar después de verificar]
Budget de $10 creado y alcance confirmado: [completar después de verificar]
Alertas real/pronosticado en $1, $5 y $10: [completar después de verificar]
Destinatarios: [completar después de verificar]
Fecha de verificación: [completar después de verificar]
Operador: [completar después de verificar]
```

## Gate De Release

Autorizar producción solo cuando cada punto tenga evidencia y autorización explícita:

- [ ] Dominio del proveedor de email verificado.
- [ ] Secret Manager configurado para el secreto del proveedor; no colocar el valor del secreto en el repositorio, logs o frontend.
- [ ] Evidencia de build y typecheck.
- [ ] Evidencia de las pruebas de reglas.
- [ ] Revisión de seguridad completada.
- [ ] QA de navegador completado.
- [ ] Procedimiento de rollback revisado.
- [ ] Autorización explícita para producción registrada por el responsable.

El proveedor recomendado es Resend según ADR-004, pero la integración, el dominio, el secreto y el despliegue no están verificados en este runbook.

## Emergencia

Ante gasto inesperado, errores repetidos o exposición de un secreto:

1. Deshabilitar la Function programada para detener nuevas ejecuciones.
2. Inspeccionar el uso y los logs para identificar el alcance y la causa.
3. Si el secreto del proveedor pudo quedar expuesto, revocarlo o rotarlo siguiendo el procedimiento del proveedor.
4. Preservar los documentos de `recordatorios` para auditoría; no borrarlos como parte de la contención.
5. Registrar la hora, el operador, las acciones tomadas y la evidencia revisada.

## Rollback

El rollback debe ser reversible y no destructivo:

1. Deshabilitar o retirar la Function programada.
2. Mantener los documentos de `recordatorios` para auditoría y eventual reprocesamiento controlado.
3. No aplicar migraciones destructivas ni borrar datos para resolver una incidencia.
4. Confirmar el estado de la Function y documentar la autorización para cualquier reactivación.
