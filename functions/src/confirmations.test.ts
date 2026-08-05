import { describe, expect, it } from 'vitest'
import { EmailProviderError } from './email/resend.js'
import type {
  AcquireConfirmationLockInput,
  ConfirmationStore,
  ReservationForConfirmation,
} from './confirmations.js'
import type { ConfirmationRecord } from './types.js'
import { runConfirmationOrchestration } from './confirmations.js'

const NOW = new Date('2026-08-05T18:00:00.000Z')

function reservation(
  overrides: Partial<ReservationForConfirmation> = {},
): ReservationForConfirmation {
  return {
    id: 'reservation-1',
    status: 'pending',
    userEmail: 'cliente@example.com',
    userName: 'Ana',
    serviceName: 'Baño y corte',
    date: '2026-08-20',
    timeSlot: '10:30',
    ...overrides,
  }
}

class MemoryConfirmationStore implements ConfirmationStore {
  records = new Map<string, ConfirmationRecord>()
  updates: Array<{ id: string; patch: Partial<ConfirmationRecord> }> = []
  tokenSequence = 0

  async acquireConfirmationLock(input: AcquireConfirmationLockInput) {
    const existing = this.records.get(input.reservaId)
    if (existing?.status === 'sent') return { status: 'sent' as const }
    if (
      existing?.processingLockUntil &&
      existing.processingLockUntil.toMillis() > input.now.getTime()
    ) {
      return { status: 'locked' as const }
    }
    if (
      existing?.nextAttemptAt &&
      existing.nextAttemptAt.toMillis() > input.now.getTime()
    ) {
      return { status: 'backoff' as const, nextAttemptAt: existing.nextAttemptAt }
    }
    if ((existing?.attempts ?? 0) >= 3) return { status: 'exhausted' as const }

    const processingToken = `token-${++this.tokenSequence}`
    const nowTimestamp = input.nowTimestamp
    this.records.set(input.reservaId, {
      ...(existing ?? {
        reservaId: input.reservaId,
        status: 'pending',
        attempts: 0,
        sentAt: null,
        lastAttemptAt: null,
        lastError: null,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: null,
        providerMessageId: null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      }),
      status: 'pending',
      attempts: (existing?.attempts ?? 0) + 1,
      lastAttemptAt: nowTimestamp,
      processingLockUntil: input.lockUntilTimestamp,
      processingToken,
      nextAttemptAt: null,
      updatedAt: nowTimestamp,
    })
    return {
      status: 'acquired' as const,
      processingToken,
      attempts: (existing?.attempts ?? 0) + 1,
    }
  }

  async updateConfirmation(
    id: string,
    patch: Partial<ConfirmationRecord>,
    processingToken: string,
  ) {
    const current = this.records.get(id)
    if (current?.processingToken !== processingToken) return false
    this.records.set(id, { ...current, ...patch } as ConfirmationRecord)
    this.updates.push({ id, patch })
    return true
  }
}

describe('booking confirmation orchestration', () => {
  it('sends a valid confirmation and persists sent state', async () => {
    const store = new MemoryConfirmationStore()
    let sends = 0

    const result = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory: () => ({
        sendConfirmationEmail: async (input) => {
          sends += 1
          expect(input.idempotencyKey).toBe('confirmation-reservation-1')
          return { providerMessageId: 'provider-1' }
        },
      }),
    })

    expect(result).toEqual({ status: 'sent' })
    expect(sends).toBe(1)
    expect(store.records.get('reservation-1')).toMatchObject({
      status: 'sent',
      attempts: 1,
      providerMessageId: 'provider-1',
      processingLockUntil: null,
      processingToken: null,
    })
  })

  it('does not call the provider when the confirmation is already sent', async () => {
    const store = new MemoryConfirmationStore()
    const first = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory: () => ({ sendConfirmationEmail: async () => ({}) }),
    })
    let sends = 0

    const second = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: new Date(NOW.getTime() + 60_000),
      providerFactory: () => ({
        sendConfirmationEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(first).toEqual({ status: 'sent' })
    expect(second).toEqual({ status: 'skipped' })
    expect(sends).toBe(0)
  })

  it('does not call the provider while another lock or backoff is active', async () => {
    const store = new MemoryConfirmationStore()
    const first = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory: () => ({
        sendConfirmationEmail: async () => {
          throw new EmailProviderError('temporary', true)
        },
      }),
    })
    let sends = 0

    const second = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: new Date(NOW.getTime() + 500),
      providerFactory: () => ({
        sendConfirmationEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(first.status).toBe('retry')
    expect(second.status).toBe('retry')
    expect(sends).toBe(0)
  })

  it('records a retryable provider failure with bounded nextAttemptAt', async () => {
    const store = new MemoryConfirmationStore()

    const result = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory: () => ({
        sendConfirmationEmail: async () => {
          throw new EmailProviderError('temporary', true)
        },
      }),
    })

    const record = store.records.get('reservation-1')
    expect(result.status).toBe('retry')
    expect(record).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Email provider retryable failure',
      processingLockUntil: null,
      processingToken: null,
    })
    expect(record?.nextAttemptAt?.toMillis()).toBe(NOW.getTime() + 2_000)
  })

  it('stops after three attempts and records a permanent failure', async () => {
    const store = new MemoryConfirmationStore()
    const providerFactory = () => ({
      sendConfirmationEmail: async () => {
        throw new EmailProviderError('temporary', true)
      },
    })

    const first = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory,
    })
    const second = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: new Date(NOW.getTime() + 2_000),
      providerFactory,
    })
    const third = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: new Date(NOW.getTime() + 6_000),
      providerFactory,
    })

    expect(first.status).toBe('retry')
    expect(second.status).toBe('retry')
    expect(third.status).toBe('failed')
    expect(store.records.get('reservation-1')).toMatchObject({
      status: 'failed',
      attempts: 3,
      lastError: 'Email provider retryable failure',
      nextAttemptAt: null,
    })
  })

  it('rejects invalid data without calling the provider or changing the reservation', async () => {
    const store = new MemoryConfirmationStore()
    let sends = 0
    const invalidReservation = reservation({ userEmail: 'not-an-email' })

    const result = await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: invalidReservation,
      now: NOW,
      providerFactory: () => ({
        sendConfirmationEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(result).toEqual({ status: 'failed' })
    expect(sends).toBe(0)
    expect(invalidReservation.status).toBe('pending')
    expect(store.records.get('reservation-1')).toMatchObject({
      status: 'failed',
      lastError: 'Invalid confirmation data',
    })
  })

  it('forwards the exact reservation summary to the provider', async () => {
    const store = new MemoryConfirmationStore()
    let received: unknown

    await runConfirmationOrchestration({
      store,
      secret: 'resend-test-secret',
      reservation: reservation(),
      now: NOW,
      providerFactory: () => ({
        sendConfirmationEmail: async (input) => {
          received = input
          return {}
        },
      }),
    })

    expect(received).toEqual({
      to: 'cliente@example.com',
      recipientName: 'Ana',
      serviceName: 'Baño y corte',
      date: '2026-08-20',
      timeSlot: '10:30',
      idempotencyKey: 'confirmation-reservation-1',
    })
  })
})
