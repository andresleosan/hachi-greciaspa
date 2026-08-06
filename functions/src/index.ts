import { initializeApp } from 'firebase-admin/app'

import { initFunctionsSentry } from './observability/sentry.js'

initializeApp()
initFunctionsSentry()

export { scheduledSendReminders } from './scheduledSendReminders.js'
export { rescheduleReserva } from './rescheduleReserva.js'
export { assignPendingReservasForDate, onReservaCreated } from './assignmentService.js'
export { onReservaConfirmationCreated } from './onReservaConfirmationCreated.js'
