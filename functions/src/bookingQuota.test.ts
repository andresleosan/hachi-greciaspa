import { describe, expect, it } from 'vitest'

import { consumeBookingAttempt } from './bookingQuota.js'

describe('consumeBookingAttempt', () => {
  const now = new Date('2026-08-07T12:00:00.000Z')

  it('allows the first attempt when there is no current state', () => {
    expect(consumeBookingAttempt(null, now)).toEqual({
      allowed: true,
      state: { windowStartedAt: now, attempts: 1 },
    })
  })

  it('increments attempts while the window is active', () => {
    expect(
      consumeBookingAttempt(
        { windowStartedAt: now, attempts: 2 },
        new Date(now.getTime() + 1_000),
      ),
    ).toEqual({
      allowed: true,
      state: { windowStartedAt: now, attempts: 3 },
    })
  })

  it('blocks the fourth attempt in an active window', () => {
    expect(
      consumeBookingAttempt(
        { windowStartedAt: now, attempts: 3 },
        new Date(now.getTime() + 1_000),
      ).allowed,
    ).toBe(false)
  })

  it('starts a new window after fifteen minutes', () => {
    expect(
      consumeBookingAttempt(
        { windowStartedAt: now, attempts: 3 },
        new Date(now.getTime() + 15 * 60 * 1000),
      ),
    ).toEqual({
      allowed: true,
      state: {
        windowStartedAt: new Date(now.getTime() + 15 * 60 * 1000),
        attempts: 1,
      },
    })
  })

  it.each([-1, 4])('resets corrupt attempt count %s', (attempts) => {
    const current = { windowStartedAt: now, attempts }

    expect(consumeBookingAttempt(current, new Date(now.getTime() + 1_000))).toEqual({
      allowed: true,
      state: {
        windowStartedAt: new Date(now.getTime() + 1_000),
        attempts: 1,
      },
    })
  })
})
