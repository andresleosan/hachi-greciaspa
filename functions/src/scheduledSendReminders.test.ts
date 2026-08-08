import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

import type {
  EmailProvider,
  ReminderRecord,
  ReservationForReminder,
} from './types.js'
import {
  createFirestoreReminderStore,
  ReminderStatePersistenceError,
  runReminderOrchestration,
  type AcquireReminderLockInput,
  type ReminderStore,
} from './scheduledSendReminders.js'

const NOW = new Date('2026-08-03T16:00:00.000Z')
const REMINDER_IDEMPOTENCY_KEY = 'reminder-reservation-1'

function reservation(
  overrides: Partial<ReservationForReminder> = {},
): ReservationForReminder {
  return {
    id: 'reservation-1',
    status: 'confirmed',
    userEmail: 'cliente@example.com',
    userName: 'Cliente',
    serviceName: 'Masaje relajante',
    date: '2026-08-04',
    timeSlot: '10:00',
    ...overrides,
  }
}

class MemoryReminderStore implements ReminderStore {
  reservations: unknown[] = []
  currentReservation: unknown = undefined
  records = new Map<string, ReminderRecord>()
  updates: Array<{ id: string; patch: Partial<ReminderRecord> }> = []
  queriedDates: readonly string[] = []
  tokenSequence = 0
  failSuccessUpdate = false

  async findConfirmedReservations(dates: readonly string[]) {
    this.queriedDates = dates
    return this.reservations
  }

  async getConfirmedReservation(id: string) {
    if (this.currentReservation !== undefined) return this.currentReservation
    return this.reservations.find(
      (candidate) =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'id' in candidate &&
        candidate.id === id,
    ) ?? null
  }

  async acquireReminderLock(input: Parameters<ReminderStore['acquireReminderLock']>[0]) {
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
      return { status: 'backoff' } as never
    }
    if ((existing?.attempts ?? 0) >= 3) return { status: 'exhausted' } as const

    const processingToken = `token-${++this.tokenSequence}`
    this.records.set(input.reservaId, {
      ...(existing ?? {
        reservaId: input.reservaId,
        status: 'pending',
        attempts: 0,
        scheduledFor: input.scheduledForTimestamp,
        sentAt: null,
        lastAttemptAt: null,
        lastError: null,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: null,
        providerMessageId: null,
        createdAt: input.nowTimestamp,
        updatedAt: input.nowTimestamp,
      }),
      status: 'pending',
      attempts: (existing?.attempts ?? 0) + 1,
      lastAttemptAt: input.nowTimestamp,
      processingLockUntil: input.lockUntilTimestamp,
      processingToken,
      nextAttemptAt: null,
      updatedAt: input.nowTimestamp,
    })
    return {
      status: 'acquired',
      processingToken,
      attempts: (existing?.attempts ?? 0) + 1,
    } as const
  }

  async updateReminder(
    id: string,
    patch: Partial<ReminderRecord>,
    processingToken: string,
  ) {
    if (Object.values(patch).some((value) => value === undefined)) {
      throw new Error('Firestore rejects undefined field values')
    }
    if (this.failSuccessUpdate && patch.status === 'sent') {
      throw new Error('state persistence failed')
    }
    const current = this.records.get(id)
    if (current?.processingToken !== processingToken) return false
    if (current) this.records.set(id, { ...current, ...patch })
    this.updates.push({ id, patch })
    return true
  }

  replaceLease(id: string, processingToken: string) {
    const current = this.records.get(id)
    if (!current) throw new Error('Missing reminder record')
    this.records.set(id, {
      ...current,
      status: 'pending',
      processingToken,
      processingLockUntil: Timestamp.fromDate(new Date(NOW.getTime() + 10 * 60 * 1000)),
    })
  }
}

class TransactionFirestoreFake {
  readonly documents = new Map<string, Record<string, unknown>>()
  readonly created = new Map<string, Record<string, unknown>>()
  private queue = Promise.resolve()

  collection(name: string) {
    return {
      doc: (id: string) => ({ path: `${name}/${id}` }),
    }
  }

  runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      const transaction = {
        get: async (reference: { path: string }) => {
          const data = this.documents.get(reference.path)
          return {
            exists: Boolean(data),
            data: () => data,
          }
        },
        create: (reference: { path: string }, data: Record<string, unknown>) => {
          if (this.documents.has(reference.path)) throw new Error('already exists')
          this.documents.set(reference.path, { ...data })
          this.created.set(reference.path, { ...data })
        },
        set: (
          reference: { path: string },
          data: Record<string, unknown>,
        ) => {
          this.documents.set(reference.path, {
            ...(this.documents.get(reference.path) ?? {}),
            ...data,
          })
        },
        update: (
          reference: { path: string },
          data: Record<string, unknown>,
        ) => {
          this.documents.set(reference.path, {
            ...(this.documents.get(reference.path) ?? {}),
            ...data,
          })
        },
      }
      return callback(transaction)
    })
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }
}

function providerThatSends(): EmailProvider {
  return { sendReminderEmail: async () => ({ providerMessageId: 'provider-1' }) }
}

describe('scheduled reminder orchestration', () => {
  it('sends one confirmed due reservation and queries the next three local dates', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    let sends = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => ({
        sendReminderEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(sends).toBe(1)
    expect(store.queriedDates).toEqual(['2026-08-03', '2026-08-04', '2026-08-05'])
  })

  it('sends a 25-hour appointment at 23:00 from the third local date', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [
      reservation({ date: '2026-08-04', timeSlot: '00:00' }),
    ]
    let sends = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: new Date('2026-08-03T05:00:00.000Z'),
      providerFactory: () => ({
        sendReminderEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(sends).toBe(1)
    expect(store.queriedDates).toEqual(['2026-08-02', '2026-08-03', '2026-08-04'])
  })

  it('skips cancelled, non-confirmed, and non-due reservations', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [
      reservation({ id: 'cancelled', status: 'cancelled' }),
      reservation({ id: 'pending', status: 'pending' }),
      reservation({ id: 'completed', status: 'completed' }),
      reservation({ id: 'not-due', date: '2026-08-05' }),
    ]
    let sends = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => ({
        sendReminderEmail: async () => {
          sends += 1
          return {}
        },
      }),
    })

    expect(sends).toBe(0)
    expect(store.records.size).toBe(0)
  })

  it('rechecks the reservation after locking and skips stale or rescheduled data', async () => {
    for (const currentReservation of [
      reservation({ status: 'cancelled' }),
      reservation({ date: '2026-08-05' }),
    ]) {
      const store = new MemoryReminderStore()
      store.reservations = [reservation()]
      store.currentReservation = currentReservation
      let sends = 0

      await runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async () => {
            sends += 1
            return {}
          },
        }),
      })

      expect(sends).toBe(0)
      expect(store.records.get('reservation-1')).toMatchObject({
        status: 'pending',
        attempts: 0,
        processingLockUntil: null,
        processingToken: null,
      })
    }
  })

  it('rejects missing email and service data before calling the provider', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [
      reservation({ id: 'missing-email', userEmail: null }),
      reservation({ id: 'missing-service', serviceName: '' }),
    ]
    let providerCalls = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => {
        providerCalls += 1
        return providerThatSends()
      },
    })

    expect(providerCalls).toBe(0)
    expect(store.updates).toHaveLength(2)
    expect(store.updates.every(({ patch }) => patch.status === 'failed')).toBe(true)
  })

  it('skips a reminder that has already been sent', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    store.records.set('reservation-1', {
      reservaId: 'reservation-1',
      status: 'sent',
      attempts: 1,
      scheduledFor: null as never,
      sentAt: null,
      lastAttemptAt: null,
      lastError: null,
      processingLockUntil: null,
      processingToken: null,
      nextAttemptAt: null,
      providerMessageId: null,
      createdAt: null as never,
      updatedAt: null as never,
    })
    let providerCalls = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => {
        providerCalls += 1
        return providerThatSends()
      },
    })

    expect(providerCalls).toBe(0)
    expect(store.updates).toHaveLength(0)
  })

  it('allows attempts zero, one, and two, but rejects attempt three', async () => {
    const sendsByAttempt: number[] = []

    for (const initialAttempts of [0, 1, 2, 3]) {
      const store = new MemoryReminderStore()
      store.reservations = [reservation({ id: `reservation-${initialAttempts}` })]
      if (initialAttempts > 0) {
        store.records.set(`reservation-${initialAttempts}`, {
          ...store.records.get(`reservation-${initialAttempts}`),
          reservaId: `reservation-${initialAttempts}`,
          status: 'failed',
          attempts: initialAttempts,
          processingToken: null,
        } as ReminderRecord)
      }
      let sends = 0

      await runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async () => {
            sends += 1
            return {}
          },
        }),
      })
      sendsByAttempt.push(sends)
    }

    expect(sendsByAttempt).toEqual([1, 1, 1, 0])
  })

  it('marks a retryable provider failure failed and retries it on a later run', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    let providerCalls = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => ({
        sendReminderEmail: async () => {
          providerCalls += 1
          throw { retryable: true, message: 'provider body must not be persisted' }
        },
      }),
    })

    expect(store.records.get('reservation-1')?.status).toBe('failed')
    expect(store.records.get('reservation-1')?.processingLockUntil).toBe(null)

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
      providerFactory: () => ({
        sendReminderEmail: async () => {
          providerCalls += 1
          return {}
        },
      }),
    })

    expect(providerCalls).toBe(2)
    expect(store.records.get('reservation-1')?.status).toBe('sent')
  })

  it('allows only one concurrent invocation to acquire the active lock', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    let sends = 0

    const run = () =>
      runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async () => {
            sends += 1
            await new Promise((resolve) => setTimeout(resolve, 5))
            return {}
          },
        }),
      })

    await Promise.all([run(), run()])

    expect(sends).toBe(1)
    expect(store.records.get('reservation-1')?.attempts).toBe(1)
  })

  it('clears the lock and previous error fields after success', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    store.records.set('reservation-1', {
      reservaId: 'reservation-1',
      status: 'failed',
      attempts: 1,
      scheduledFor: null as never,
      sentAt: null,
      lastAttemptAt: null,
      lastError: 'temporary provider failure',
      processingLockUntil: null,
      processingToken: null,
      nextAttemptAt: null,
      providerMessageId: null,
      createdAt: null as never,
      updatedAt: null as never,
    })

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => providerThatSends(),
    })

    const record = store.records.get('reservation-1')
    expect(record?.status).toBe('sent')
    expect(record?.lastError).toBe(null)
    expect(record?.processingLockUntil).toBe(null)
    expect(record?.processingToken).toBe(null)
    expect(record?.sentAt).not.toBe(null)
    expect(record?.providerMessageId).toBe('provider-1')
    expect(record?.nextAttemptAt).toBe(null)
  })

  it('does not convert a successful provider call into a provider failure when state persistence fails', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    store.failSuccessUpdate = true
    let providerCalls = 0

    await expect(
      runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async () => {
            providerCalls += 1
            return {}
          },
        }),
      }),
    ).rejects.toThrow('state persistence failed')

    expect(providerCalls).toBe(1)
    expect(store.records.get('reservation-1')?.status).toBe('pending')
    expect(store.updates.some(({ patch }) => patch.status === 'failed')).toBe(false)
  })

  it('reuses the deterministic idempotency key after success persistence failure', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    store.failSuccessUpdate = true
    const idempotencyKeys: Array<string | undefined> = []

    await expect(
      runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async (input) => {
            idempotencyKeys.push(input.idempotencyKey)
            return { providerMessageId: 'provider-first' }
          },
        }),
      }),
    ).rejects.toThrow('state persistence failed')

    store.failSuccessUpdate = false
    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: new Date(NOW.getTime() + 11 * 60 * 1000),
      providerFactory: () => ({
        sendReminderEmail: async (input) => {
          idempotencyKeys.push(input.idempotencyKey)
          return { providerMessageId: 'provider-retry' }
        },
      }),
    })

    expect(idempotencyKeys).toEqual([
      REMINDER_IDEMPOTENCY_KEY,
      REMINDER_IDEMPOTENCY_KEY,
    ])
    expect(store.records.get('reservation-1')?.providerMessageId).toBe('provider-retry')
  })

  it('rejects a retry before backoff and allows it after nextAttemptAt', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    let providerCalls = 0

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => ({
        sendReminderEmail: async () => {
          providerCalls += 1
          throw { retryable: true }
        },
      }),
    })

    const firstFailure = store.records.get('reservation-1')
    expect(firstFailure?.nextAttemptAt?.toMillis()).toBe(NOW.getTime() + 2_000)

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: new Date(NOW.getTime() + 1_000),
      providerFactory: () => ({
        sendReminderEmail: async () => {
          providerCalls += 1
          return { providerMessageId: 'provider-too-early' }
        },
      }),
    })

    expect(providerCalls).toBe(1)
    expect(store.records.get('reservation-1')?.nextAttemptAt?.toMillis()).toBe(
      NOW.getTime() + 2_000,
    )

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: new Date(NOW.getTime() + 2_000),
      providerFactory: () => ({
        sendReminderEmail: async () => {
          providerCalls += 1
          return { providerMessageId: 'provider-after-backoff' }
        },
      }),
    })

    expect(providerCalls).toBe(2)
    expect(store.records.get('reservation-1')?.status).toBe('sent')
    expect(store.records.get('reservation-1')?.nextAttemptAt).toBe(null)
  })

  it('acquires a fresh token after an expired lock', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]
    store.records.set('reservation-1', {
      reservaId: 'reservation-1',
      status: 'pending',
      attempts: 1,
      scheduledFor: Timestamp.fromDate(new Date(NOW.getTime() + 24 * 60 * 60 * 1000)),
      sentAt: null,
      lastAttemptAt: Timestamp.fromDate(new Date(NOW.getTime() - 20 * 60 * 1000)),
      lastError: null,
      processingLockUntil: Timestamp.fromDate(new Date(NOW.getTime() - 1)),
      processingToken: 'expired-token',
      nextAttemptAt: null,
      providerMessageId: null,
      createdAt: Timestamp.fromDate(NOW),
      updatedAt: Timestamp.fromDate(NOW),
    })

    await runReminderOrchestration({
      store,
      secret: 'resend-test-secret',
      now: NOW,
      providerFactory: () => providerThatSends(),
    })

    expect(store.records.get('reservation-1')?.status).toBe('sent')
    expect(store.records.get('reservation-1')?.processingToken).toBe(null)
  })

  it('does not apply a stale final update after the lease token is replaced', async () => {
    const store = new MemoryReminderStore()
    store.reservations = [reservation()]

    await expect(
      runReminderOrchestration({
        store,
        secret: 'resend-test-secret',
        now: NOW,
        providerFactory: () => ({
          sendReminderEmail: async () => {
            store.replaceLease('reservation-1', 'replacement-token')
            return {}
          },
        }),
      }),
    ).rejects.toBeInstanceOf(ReminderStatePersistenceError)

    const record = store.records.get('reservation-1')
    expect(record?.status).toBe('pending')
    expect(record?.processingToken).toBe('replacement-token')
    expect(store.updates).toHaveLength(0)
  })

  it('uses the Firestore transaction seam to create zero-attempt state and acquire one lock', async () => {
    const fake = new TransactionFirestoreFake()
    const store = createFirestoreReminderStore(fake as unknown as Firestore)
    const input: AcquireReminderLockInput = {
      reservaId: 'reservation-1',
      scheduledFor: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
      now: NOW,
      lockUntil: new Date(NOW.getTime() + 10 * 60 * 1000),
      scheduledForTimestamp: Timestamp.fromDate(
        new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
      ),
      nowTimestamp: Timestamp.fromDate(NOW),
      lockUntilTimestamp: Timestamp.fromDate(new Date(NOW.getTime() + 10 * 60 * 1000)),
    }

    const results = await Promise.all([
      store.acquireReminderLock(input),
      store.acquireReminderLock(input),
    ])
    const acquired = results.filter((result) => result.status === 'acquired')
    const record = fake.documents.get('recordatorios/reminder-reservation-1')

    expect(acquired).toHaveLength(1)
    expect(fake.created.get('recordatorios/reminder-reservation-1')).toMatchObject({
      attempts: 0,
      processingToken: null,
      nextAttemptAt: null,
      providerMessageId: null,
    })
    expect(record?.attempts).toBe(1)
    expect(typeof record?.processingToken).toBe('string')
  })
})
