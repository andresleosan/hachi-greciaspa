import { fromZonedTime } from 'date-fns-tz'

const HOUR_MS = 60 * 60 * 1000
const MAX_RETRY_DELAY_MS = HOUR_MS

export function getAppointmentInstant(
  date: string,
  timeSlot: string,
  timeZone: string,
  _now?: Date,
): Date {
  return fromZonedTime(`${date}T${timeSlot}`, timeZone)
}

export function isReminderDue(appointment: Date, now: Date): boolean {
  const hoursAhead = appointment.getTime() - now.getTime()

  return hoursAhead >= 23 * HOUR_MS && hoursAhead <= 25 * HOUR_MS
}

export function reminderDocId(reservaId: string): string {
  return `reminder-${encodeURIComponent(reservaId)}`
}

export function canRetry(attempts: number): boolean {
  return attempts >= 0 && attempts < 3
}

export function getRetryDelayMs(attempts: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempts)
}
