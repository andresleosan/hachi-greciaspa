import * as Sentry from '@sentry/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  captureException,
  initSentry,
  isSentryEnabled,
  sanitizeSentryEvent,
} from './sentry'

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}))

describe('frontend Sentry observability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes PII and credentials from an event before transport', () => {
    const sanitized = sanitizeSentryEvent({
      request: {
        url: 'https://spa.test/reservar?email=cliente@example.com&token=secret',
        headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
      },
      user: { email: 'cliente@example.com', id: 'uid-123' },
      extra: {
        password: 'secret',
        token: 'secret',
        safeOperation: 'booking-submit',
      },
      breadcrumbs: [{ data: { email: 'cliente@example.com', token: 'secret' } }],
    } as Sentry.Event)

    expect(sanitized.request).toBeUndefined()
    expect(sanitized.user).toBeUndefined()
    expect(sanitized.extra).toEqual({ safeOperation: 'booking-submit' })
    expect(sanitized.breadcrumbs).toBeUndefined()
  })

  it('does not transport exception messages or values', () => {
    const sanitized = sanitizeSentryEvent({
      message: 'Failed for cliente@example.com',
      exception: {
        values: [{ type: 'Error', value: 'token=secret cliente@example.com' }],
      },
    } as Sentry.Event)

    expect(sanitized.message).toBeUndefined()
    expect(sanitized.exception).toBeUndefined()
  })

  it('stays disabled without a DSN or when the emulator is enabled', () => {
    expect(isSentryEnabled()).toBe(false)
    expect(initSentry({ dsn: '', useEmulator: false })).toBe(false)
    expect(initSentry({ dsn: 'https://public@example.ingest.sentry.io/1', useEmulator: true })).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('initializes once when a DSN is available', () => {
    expect(initSentry({ dsn: 'https://public@example.ingest.sentry.io/1', useEmulator: false })).toBe(true)
    expect(initSentry({ dsn: 'https://public@example.ingest.sentry.io/1', useEmulator: false })).toBe(true)
    expect(Sentry.init).toHaveBeenCalledTimes(1)
    expect(isSentryEnabled()).toBe(true)
  })

  it('captures an explicit exception without propagating SDK errors', () => {
    vi.mocked(Sentry.captureException).mockImplementation(() => {
      throw new Error('transport failure')
    })

    expect(() => captureException(new Error('expected test error'), { operation: 'test' })).not.toThrow()
  })
})
