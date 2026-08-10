import type { ReminderEmailInput } from '../types.js'
import { getDashboardUrl } from './appUrl.js'
import { escapeHtml } from './html.js'

const REMINDER_TEMPLATE = `<!doctype html>
<html lang="es">
  <body>
    <p>Hola {{recipientName}},</p>
    <p>Te recordamos tu cita en Hachi &amp; Grecia Spa:</p>
    <ul>
      <li>Servicio: <strong>{{serviceName}}</strong></li>
      <li>Fecha: <strong>{{date}}</strong></li>
      <li>Hora: <strong>{{timeSlot}}</strong></li>
    </ul>
    <p><a href="{{dashboardUrl}}">Ver mis reservas en el dashboard</a></p>
  </body>
</html>`

export function renderReminderHtml(input: ReminderEmailInput): string {
  return REMINDER_TEMPLATE.replaceAll('{{recipientName}}', escapeHtml(input.recipientName))
    .replaceAll('{{serviceName}}', escapeHtml(input.serviceName))
    .replaceAll('{{date}}', escapeHtml(input.date))
    .replaceAll('{{timeSlot}}', escapeHtml(input.timeSlot))
    .replaceAll('{{dashboardUrl}}', escapeHtml(getDashboardUrl()))
}
