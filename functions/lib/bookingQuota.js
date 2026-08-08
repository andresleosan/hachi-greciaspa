export const BOOKING_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_BOOKING_ATTEMPTS = 3;
export function consumeBookingAttempt(current, now) {
    const windowExpired = current === null ||
        now.getTime() - current.windowStartedAt.getTime() >= BOOKING_ATTEMPT_WINDOW_MS;
    const corruptState = current !== null &&
        (!Number.isInteger(current.attempts) ||
            current.attempts < 0 ||
            current.attempts > MAX_BOOKING_ATTEMPTS);
    if (windowExpired || corruptState) {
        return {
            allowed: true,
            state: { windowStartedAt: now, attempts: 1 },
        };
    }
    if (current.attempts === MAX_BOOKING_ATTEMPTS) {
        return { allowed: false, state: current };
    }
    return {
        allowed: true,
        state: {
            windowStartedAt: current.windowStartedAt,
            attempts: current.attempts + 1,
        },
    };
}
