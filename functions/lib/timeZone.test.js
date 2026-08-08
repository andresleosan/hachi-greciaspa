import { describe, expect, it } from 'vitest';
import { formatInTimeZone, fromZonedTime } from './timeZone.js';
describe('timezone helpers', () => {
    it('converts Mexico City local date-time to an instant', () => {
        expect(fromZonedTime('2026-01-15T10:30', 'America/Mexico_City').toISOString()).toBe('2026-01-15T16:30:00.000Z');
    });
    it('formats an instant in the requested timezone', () => {
        const instant = new Date('2026-01-15T16:30:00.000Z');
        expect(formatInTimeZone(instant, 'America/Mexico_City', 'yyyy-MM-dd')).toBe('2026-01-15');
        expect(formatInTimeZone(instant, 'America/Mexico_City', 'HH:mm')).toBe('10:30');
    });
    it('preserves milliseconds when converting a zoned date-time', () => {
        expect(fromZonedTime('2026-01-15T10:30:00.123', 'America/Mexico_City').toISOString()).toBe('2026-01-15T16:30:00.123Z');
    });
});
