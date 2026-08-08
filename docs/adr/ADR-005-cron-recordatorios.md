# ADR-005: Frecuencia del cron de recordatorios

Fecha: 2026-08-07
Estado: aceptada

## Contexto

La Function `scheduledSendReminders` debe revisar reservas confirmadas cuyo
horario esté aproximadamente 24 horas en el futuro. La implementación usa una
ventana móvil de 23 a 25 horas y conserva estado, locks e idempotencia en
`recordatorios/{id}`.

## Decisión

Ejecutar `scheduledSendReminders` cada hora con `0 * * * *` en la zona horaria
`America/Mexico_City`.

## Alternativas consideradas

- Cron diario a las 18:00 - descartado porque una única ejecución fija puede
  alejar el envío de la ventana de 24 horas y deja más tiempo hasta la próxima
  oportunidad ante fallos o nuevas reservas.
- Cron cada 15 minutos - descartado porque añade ejecuciones sin mejorar de
  forma relevante la precisión para recordatorios de 24 horas; la ventana
  horaria ya tolera una ejecución por hora.

## Consecuencias

- La ejecución horaria mantiene el envío cerca de 24 horas antes y simplifica
  la recuperación mediante el estado persistido y el backoff existente.
- La Function realiza más invocaciones que un cron diario, pero el volumen
  previsto del spa es bajo y cada ejecución filtra antes de enviar.
- Cambiar la frecuencia requiere revisar la ventana de `isReminderDue`, los
  locks y la operación de reintentos antes del despliegue.
