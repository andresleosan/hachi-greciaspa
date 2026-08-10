# Billing y Budget Gate Design

**Fecha:** 2026-08-09  
**Estado:** aprobado para planificación

## Objetivo

Preparar y ejecutar de forma controlada el gate operativo de facturación para `hachi-greciaspa` antes de habilitar o desplegar Cloud Functions en producción.

## Evidencia actual

- Firebase CLI `15.25.1` está disponible y el proyecto activo es `hachi-greciaspa`.
- La consulta read-only de Firebase lista `hachi-greciaspa` como proyecto `ACTIVE`.
- `gcloud` no está instalado en este entorno; la consola oficial de Google Cloud será la ruta externa para Billing y Budgets.
- No se ha confirmado una cuenta de facturación asociada ni se ha creado un budget.
- La estimación existente documenta Blaze/Functions en `$0–3/mes` para el volumen previsto y Resend en `$0–3/mes`.
- El presupuesto objetivo es `$10/mes`, con alertas de gasto real y pronosticado en `$1`, `$5` y `$10`.

## Alcance de esta entrega

### Incluido

- Actualizar `docs/RUNBOOK.md`, `docs/Fase3.md` y `docs/STACK.md` con evidencia local actual y el procedimiento Billing/Budget.
- Mantener un checklist manual que diferencie cuenta de facturación, activación de Blaze, budget, destinatarios y fecha de verificación.
- Confirmar en Google Cloud Console la cuenta de facturación correcta, si el operador proporciona la sesión manual.
- Configurar el budget con alcance exclusivo al proyecto y cuenta correctos, si el operador confirma la cuenta antes de guardar.
- Registrar evidencia no sensible: IDs/nombres de recursos, alcance, umbrales, destinatarios parcialmente redactados y timestamp.

### Excluido

- No copiar ni solicitar credenciales, API keys, cookies, tokens o archivos secretos.
- No configurar Resend, App Check, backups, observabilidad ni deploy en este subproyecto.
- No ejecutar comandos productivos ni migraciones.
- No tratar un budget como límite duro: Google Cloud Budgets solo notifica.
- No marcar Blaze o budget como verificados sin evidencia visible de la consola.

## Secuencia operativa

1. Abrir Google Cloud Console en el proyecto `hachi-greciaspa` y revisar Billing.
2. Confirmar que la cuenta de facturación pertenece al operador y es la cuenta correcta para este proyecto.
3. Confirmar o activar Blaze únicamente después de revisar el costo estimado y el método de pago mostrado por la consola.
4. Crear un budget de `$10/mes` con alcance limitado al proyecto `hachi-greciaspa`.
5. Configurar alertas de gasto real y pronosticado en `$1`, `$5` y `$10`.
6. Añadir solo destinatarios aprobados para alertas; no registrar correos completos en el repositorio.
7. Capturar evidencia redactada de la configuración y actualizar los tres documentos de estado.

## Seguridad, costo y rollback

- Activar Blaze puede habilitar facturación por uso; el rango local estimado es `$0–3/mes`, pero no es un tope.
- El budget de `$10` no bloquea cargos adicionales; ante un gasto inesperado se debe deshabilitar la Function programada, inspeccionar uso/logs y revisar el estado de Billing.
- No se cambia ningún secreto ni se expone información de pago en Git, logs o chat.
- El rollback de este gate es no destructivo: retirar o editar el budget y, si corresponde, deshabilitar Functions; no borrar reservas, locks, documentos de auditoría ni datos de Firestore.
- Si la consola muestra una cuenta o proyecto distinto de `hachi-greciaspa`, se detiene la operación antes de guardar cambios.

## Criterio de completitud

El gate solo pasa cuando existe evidencia externa verificable de:

- Cuenta de facturación correcta asociada al proyecto.
- Blaze confirmado, si Functions lo requiere.
- Budget de `$10/mes` limitado al proyecto correcto.
- Alertas real/pronosticado configuradas en `$1`, `$5` y `$10`.
- Destinatarios y fecha de verificación registrados sin datos sensibles.

La configuración de Resend, App Check, backups, observabilidad, deploy y browser QA productivo permanece pendiente para los siguientes subproyectos.
