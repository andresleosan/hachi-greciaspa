import * as Sentry from '@sentry/react'

export interface SentryInitOptions {
  dsn?: string
  useEmulator?: boolean
}

const sensitiveKeyPattern = /^(email|password|token|authorization|cookie|secret|apiKey|accessToken|refreshToken)$/i
const urlKeyPattern = /(url|href)$/i

let sentryEnabled = false

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && sensitiveKeyPattern.test(key)) return undefined

  if (typeof value === 'string') {
    if (key && urlKeyPattern.test(key)) return value.split('?')[0]
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    return sanitizeRecord(value as Record<string, unknown>)
  }

  return value
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [key, sanitizeValue(value, key)] as const)
      .filter(([, value]) => value !== undefined),
  )
}

export function sanitizeSentryEvent(event: Sentry.Event): Sentry.Event {
  const sanitized = { ...event }

  delete sanitized.request
  delete sanitized.user
  delete sanitized.breadcrumbs
  delete sanitized.message
  delete sanitized.exception
  delete sanitized.logentry

  if (sanitized.extra) {
    sanitized.extra = sanitizeRecord(sanitized.extra as Record<string, unknown>)
  }

  if (sanitized.contexts) {
    sanitized.contexts = sanitizeRecord(sanitized.contexts as Record<string, unknown>) as typeof sanitized.contexts
  }

  if (sanitized.tags) {
    sanitized.tags = sanitizeRecord(sanitized.tags as Record<string, unknown>) as Record<string, string>
  }

  return sanitized
}

export function initSentry(options: SentryInitOptions = {}): boolean {
  if (sentryEnabled) return true

  const dsn = options.dsn ?? import.meta.env.VITE_SENTRY_DSN
  const useEmulator = options.useEmulator ?? import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

  if (!dsn || useEmulator) return false

  try {
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: (event) => sanitizeSentryEvent(event) as typeof event,
    })
    sentryEnabled = true
    return true
  } catch {
    return false
  }
}

export function isSentryEnabled(): boolean {
  return sentryEnabled
}

export function captureException(error: unknown, context: Record<string, unknown> = {}): void {
  const safeError = new Error(error instanceof Error ? error.name : 'Unhandled frontend error')
  const safeContext = sanitizeRecord(context)

  try {
    if (!sentryEnabled) {
      console.error('[observability]', safeContext)
      return
    }

    Sentry.captureException(safeError, { extra: safeContext })
  } catch {
    console.error('[observability]', safeContext)
  }
}
