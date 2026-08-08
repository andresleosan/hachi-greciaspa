import { describe, expect, it } from 'vitest';
import { canRetry, getAppointmentInstant, getRetryDelayMs, isReminderDue, reminderDocId, } from './reminders.js';
describe('reminder domain helpers', () => {
    it('interprets an appointment in the supplied timezone', () => {
        const appointment = getAppointmentInstant('2026-01-15', '10:30', 'America/Mexico_City');
        expect(appointment.toISOString()).toBe('2026-01-15T16:30:00.000Z');
    });
    it('includes appointments exactly 23, 24, and 25 hours ahead', () => {
        const now = new Date('2026-01-15T12:00:00.000Z');
        const hour = 60 * 60 * 1000;
        expect(isReminderDue(new Date(now.getTime() + 23 * hour), now)).toBe(true);
        expect(isReminderDue(new Date(now.getTime() + 24 * hour), now)).toBe(true);
        expect(isReminderDue(new Date(now.getTime() + 25 * hour), now)).toBe(true);
    });
    it('excludes appointments just outside the reminder window', () => {
        const now = new Date('2026-01-15T12:00:00.000Z');
        const hour = 60 * 60 * 1000;
        expect(isReminderDue(new Date(now.getTime() + 23 * hour - 1), now)).toBe(false);
        expect(isReminderDue(new Date(now.getTime() + 25 * hour + 1), now)).toBe(false);
    });
    it('creates a deterministic Firestore-safe reminder document ID', () => {
        const first = reminderDocId('reservation/abc');
        expect(first).toBe(reminderDocId('reservation/abc'));
        expect(first).toMatch(/^[^/]+$/);
    });
    it('allows the first three attempts only', () => {
        expect(canRetry(0)).toBe(true);
        expect(canRetry(1)).toBe(true);
        expect(canRetry(2)).toBe(true);
        expect(canRetry(3)).toBe(false);
    });
    it('increases retry delays without exceeding the bound', () => {
        const delays = [0, 1, 2, 3, 10].map(getRetryDelayMs);
        expect(delays[0]).toBeLessThan(delays[1]);
        expect(delays[1]).toBeLessThan(delays[2]);
        expect(delays[2]).toBeLessThanOrEqual(delays[3]);
        expect(delays[3]).toBeLessThanOrEqual(delays[4]);
        expect(delays[4]).toBeLessThanOrEqual(60 * 60 * 1000);
    });
});
