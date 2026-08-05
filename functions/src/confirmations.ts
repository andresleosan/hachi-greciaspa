import { Timestamp } from 'firebase-admin/firestore'

import { createResendProvider } from './email/resend.js'
import { canRetry, getRetryDelayMs } from './reminders.js'
import type {
  ConfirmationEmailProvider,
  ConfirmationEmailInput,
  ConfirmationRecord,
} from './types.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const LOCK_DURATION_MS = 10 * 60 * 1000

export interface ReservationForConfirmation {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  userEmail: string | null
  userName: string | null
  serviceName: string
  date: string
  timeSlot: string
}

type ValidReservation = Omit<ReservationForConfirmation, 'userEmail' | 'userName'> & {
  userEmail: string
  userName: string
}

export interface AcquireConfirmationLockInput {
  reservaId: string
  now: Date
  lockUntil: Date
  nowTimestamp: Timestamp
  lockUntilTimestamp: Timestamp
}

export type ConfirmationLockResult =
  | { status: 'acquired'; processingToken: string; attempts: number }
  | { status: 'sent' }
  | { status: 'locked' }
  | { status: 'backoff'; nextAttemptAt: Timestamp }
  | { status: 'exhausted' }

export interface ConfirmationStore {
  acquireConfirmationLock(input: AcquireConfirmationLockInput): Promise<ConfirmationLockResult>
  updateConfirmation(
    id: string,
    patch: Partial<ConfirmationRecord>,
    processingToken: string,
  ): Promise<boolean>
}

export type ConfirmationRunResult =
  | { status: 'sent' }
  | { status: 'failed' }
  | { status: 'retry'; nextAttemptAt: Date }
  | { status: 'skipped' }

export interface ConfirmationOrchestrationInput {
  store: ConfirmationStore
  secret: string
  reservation: unknown
  now?: Date
  providerFactory?: (secret: string) => ConfirmationEmailProvider
}

export class ConfirmationStatePersistenceError extends Error {
  constructor(message = 'Confirmation state persistence failed: lease lost') {
    super(message)
    this.name = 'ConfirmationStatePersistenceError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return false
  const [year, month, day] = value.split('-').map(Number)
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function isValidReservation(value: unknown): value is ValidReservation {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    Boolean(value.id.trim()) &&
    typeof value.userEmail === 'string' &&
    EMAIL_PATTERN.test(value.userEmail) &&
    typeof value.userName === 'string' &&
    Boolean(value.userName.trim()) &&
    typeof value.serviceName === 'string' &&
    Boolean(value.serviceName.trim()) &&
    typeof value.date === 'string' &&
    isValidIsoDate(value.date) &&
    typeof value.timeSlot === 'string' &&
    TIME_SLOT.test(value.timeSlot)
  )
}

function candidateId(value: unknown): string {
  return isRecord(value) && typeof value.id === 'string' ? value.id.trim() : ''
}

function timestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

async function persistConfirmationState(
  store: ConfirmationStore,
  id: string,
  patch: Partial<ConfirmationRecord>,
  processingToken: string,
): Promise<void> {
  const persisted = await store.updateConfirmation(id, patch, processingToken)
  if (!persisted) throw new ConfirmationStatePersistenceError()
}

function lockInput(reservaId: string, now: Date): AcquireConfirmationLockInput {
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)
  return {
    reservaId,
    now,
    lockUntil,
    nowTimestamp: timestamp(now),
    lockUntilTimestamp: timestamp(lockUntil),
  }
}

async function markInvalidReservation(
  store: ConfirmationStore,
  reservaId: string,
  now: Date,
): Promise<ConfirmationRunResult> {
  const lockResult = await store.acquireConfirmationLock(lockInput(reservaId, now))
  if (lockResult.status !== 'acquired') return { status: 'skipped' }

  const nowTimestamp = timestamp(now)
  await persistConfirmationState(
    store,
    reservaId,
    {
      status: 'failed',
      lastError: 'Invalid confirmation data',
      sentAt: null,
      nextAttemptAt: null,
      processingLockUntil: null,
      processingToken: null,
      updatedAt: nowTimestamp,
    },
    lockResult.processingToken,
  )
  return { status: 'failed' }
}

export function confirmationDocId(reservaId: string): string {
  return `confirmation-${encodeURIComponent(reservaId)}`
}

export async function runConfirmationOrchestration({
  store,
  secret,
  reservation,
  now = new Date(),
  providerFactory = createResendProvider,
}: ConfirmationOrchestrationInput): Promise<ConfirmationRunResult> {
  const reservaId = candidateId(reservation)
  if (!reservaId) return { status: 'skipped' }
  if (!isValidReservation(reservation)) {
    return markInvalidReservation(store, reservaId, now)
  }

  const lockResult = await store.acquireConfirmationLock(lockInput(reservaId, now))
  if (lockResult.status !== 'acquired') return { status: 'skipped' }

  const nowTimestamp = timestamp(now)
  const emailInput: ConfirmationEmailInput = {
    to: reservation.userEmail,
    recipientName: reservation.userName.trim(),
    serviceName: reservation.serviceName.trim(),
    date: reservation.date,
    timeSlot: reservation.timeSlot,
    idempotencyKey: confirmationDocId(reservaId),
  }

  try {
    const provider = providerFactory(secret)
    const delivery = await provider.sendConfirmationEmail(emailInput)
    await persistConfirmationState(
      store,
      reservaId,
      {
        status: 'sent',
        sentAt: nowTimestamp,
        updatedAt: nowTimestamp,
        lastError: null,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: null,
        providerMessageId: delivery.providerMessageId ?? null,
      },
      lockResult.processingToken,
    )
    return { status: 'sent' }
  } catch (error) {
    const retryable = isRecord(error) && error.retryable === true
    const shouldRetry = retryable && canRetry(lockResult.attempts)
    const nextAttemptAt = shouldRetry
      ? new Date(now.getTime() + getRetryDelayMs(lockResult.attempts))
      : null
    await persistConfirmationState(
      store,
      reservaId,
      {
        status: 'failed',
        lastError: retryable
          ? 'Email provider retryable failure'
          : 'Email provider permanent failure',
        updatedAt: nowTimestamp,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: nextAttemptAt ? timestamp(nextAttemptAt) : null,
      },
      lockResult.processingToken,
    )
    if (nextAttemptAt) return { status: 'retry', nextAttemptAt }
    return { status: 'failed' }
  }
}
