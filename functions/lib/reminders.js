import { fromZonedTime } from './timeZone.js';
const HOUR_MS = 60 * 60 * 1000;
const MAX_RETRY_DELAY_MS = HOUR_MS;
export function getAppointmentInstant(date, timeSlot, timeZone, _now) {
    return fromZonedTime(`${date}T${timeSlot}`, timeZone);
}
export function isReminderDue(appointment, now) {
    const hoursAhead = appointment.getTime() - now.getTime();
    return hoursAhead >= 23 * HOUR_MS && hoursAhead <= 25 * HOUR_MS;
}
export function reminderDocId(reservaId) {
    return `reminder-${encodeURIComponent(reservaId)}`;
}
export function canRetry(attempts) {
    return attempts >= 0 && attempts < 3;
}
export function getRetryDelayMs(attempts) {
    return Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempts);
}
