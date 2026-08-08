import { createHash } from 'node:crypto'
import type { Resend } from 'resend'

import type {
  ConfirmationEmailInput,
  ReminderEmailInput,
  TransactionalEmailProvider,
} from '../types.js'
import { renderConfirmationHtml } from '../templates/confirmation.js'
import { renderReminderHtml } from '../templates/reminder.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_REQUEST_TIMEOUT_MS = 15_000

export class EmailProviderError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message)
    this.name = 'EmailProviderError'
  }
}

function validateInput(input: ReminderEmailInput): void {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof input.to !== 'string' ||
    typeof input.recipientName !== 'string' ||
    typeof input.serviceName !== 'string' ||
    typeof input.date !== 'string' ||
    typeof input.timeSlot !== 'string' ||
    typeof input.idempotencyKey !== 'string' ||
    !input.to ||
    !EMAIL_PATTERN.test(input.to) ||
    !input.recipientName.trim() ||
    !input.serviceName.trim() ||
    !input.date.trim() ||
    !input.timeSlot.trim() ||
    !input.idempotencyKey.trim()
  ) {
    throw new EmailProviderError('Invalid reminder email input', false)
  }
}

function statusCodeOf(error: unknown): number | null | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return undefined
  }

  const statusCode = error.statusCode
  return typeof statusCode === 'number' || statusCode === null ? statusCode : undefined
}

function isTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const name = 'name' in error && typeof error.name === 'string' ? error.name : ''
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''

  return (
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    name === 'TimeoutError' ||
    /timeout/i.test(message)
  )
}

function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const name = 'name' in error && typeof error.name === 'string' ? error.name : ''
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''

  return (
    [
      'ECONNABORTED',
      'ECONNREFUSED',
      'ECONNRESET',
      'EAI_AGAIN',
      'ENETUNREACH',
      'ENOTFOUND',
      'UND_ERR_SOCKET',
    ].includes(code) ||
    /(?:abort|connection|fetch|network|resolve|socket|unreachable)/i.test(
      `${name} ${message}`,
    )
  )
}

function providerFailure(
  statusCode: number | null | undefined,
  error?: unknown,
): EmailProviderError {
  const errorName =
    typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
      ? error.name
      : ''
  const retryable =
    statusCode === null ||
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500) ||
    (statusCode === 409 && errorName === 'concurrent_idempotent_requests') ||
    (statusCode === undefined && (isTimeout(error) || isNetworkError(error)))

  return new EmailProviderError(
    typeof statusCode !== 'number'
      ? 'Email provider request failed'
      : `Email provider request failed with status ${statusCode}`,
    retryable,
  )
}

function normalizeIdempotencyKey(value: string): string {
  const normalized = value.trim()
  if (normalized.length <= 256) return normalized
  return createHash('sha256').update(normalized).digest('hex')
}

async function withRequestTimeout<T>(request: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutRequest = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(Object.assign(new Error('Email provider request timed out'), { code: 'ETIMEDOUT' }))
    }, EMAIL_REQUEST_TIMEOUT_MS)
  })

  try {
    return await Promise.race([request, timeoutRequest])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

function suppressResendErrorLogging(resend: Resend): void {
  // Resend logs raw provider errors through this instance outside production.
  Object.defineProperty(resend, 'logError', {
    configurable: true,
    value: () => undefined,
  })
}

export function createResendProvider(secret: string): TransactionalEmailProvider {
  if (typeof secret !== 'string' || !secret.trim()) {
    throw new EmailProviderError('Email provider secret is required', false)
  }

  let resendPromise: Promise<Resend> | undefined

  async function getResend(): Promise<Resend> {
    resendPromise ??= import('resend').then(({ Resend: ResendClient }) => {
      const resend = new ResendClient(secret)
      suppressResendErrorLogging(resend)
      return resend
    })
    return resendPromise
  }

  async function sendEmail(
    input: ReminderEmailInput,
    subject: string,
    render: (value: ReminderEmailInput) => string,
  ): Promise<{ providerMessageId?: string }> {
    validateInput(input)
    const resend = await getResend()

    try {
      const result = await withRequestTimeout(
        resend.emails.send(
          {
            from: process.env.RESEND_FROM_EMAIL ?? 'reservas@hachi-greciaspa.com',
            to: input.to,
            subject,
            html: render(input),
          },
          { idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey) },
        ),
      )

      if (result.error) {
        throw providerFailure(statusCodeOf(result.error), result.error)
      }

      if (!result.data?.id) {
        throw new EmailProviderError('Email provider returned no message id', true)
      }

      return { providerMessageId: result.data.id }
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error
      }

      throw providerFailure(statusCodeOf(error), error)
    }
  }

  return {
    sendReminderEmail: (input: ReminderEmailInput) =>
      sendEmail(
        input,
        'Recordatorio de tu cita en Hachi & Grecia Spa',
        renderReminderHtml,
      ),
    sendConfirmationEmail: (input: ConfirmationEmailInput) =>
      sendEmail(
        input,
        'Confirmación de tu cita en Hachi & Grecia Spa',
        renderConfirmationHtml,
      ),
  }
}
