import { initializeApp } from 'firebase-admin/app'

initializeApp()

export { scheduledSendReminders } from './scheduledSendReminders.js'
export { rescheduleReserva } from './rescheduleReserva.js'
