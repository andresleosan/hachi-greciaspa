import * as Sentry from '@sentry/node'
import type { ErrorEvent } from '@sentry/node'

const sensitiveKeyPattern = /^(email|password|token|authorization|cookie|secret|apiKey|accessToken|refreshToken)$/i

let sentryEnabled = false

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && sensitiveKeyPattern.test(key)) return undefined

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

export function sanitizeFunctionsEvent(event: ErrorEvent): ErrorEvent {
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

export function initFunctionsSentry(): boolean {
  if (sentryEnabled) return true

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return false

  try {
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: sanitizeFunctionsEvent,
    })
    sentryEnabled = true
    return true
  } catch {
    return false
  }
}

export function captureFunctionException(error: unknown, context: { operation: string }): void {
  const safeError = new Error(error instanceof Error ? error.name : 'Unhandled function error')

  try {
    if (!sentryEnabled) return

    Sentry.captureException(safeError, {
      tags: { operation: context.operation },
    })
  } catch {
    // Observability must never alter the business function outcome.
  }
}
