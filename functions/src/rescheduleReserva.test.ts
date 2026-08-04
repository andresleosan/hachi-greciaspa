import { describe, expect, it } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'
import type { Firestore } from 'firebase-admin/firestore'

import {
  rescheduleReservaHandler,
  type RescheduleReservaInput,
} from './rescheduleReserva.js'

const NOW = new Date('2026-08-04T16:00:00.000Z')

type Reservation = Record<string, unknown>

class TransactionFirestoreFake {
  readonly documents = new Map<string, Reservation>()
  readonly updates: Array<{ path: string; data: Reservation }> = []
  readonly queries: Array<Array<{ field: string; value: unknown }>> = []
  transactionCalls = 0

  collection(name: string) {
    return {
      doc: (id: string) => ({ path: `${name}/${id}`, kind: 'document' as const }),
      where: (field: string, _operator: '==', value: unknown) => ({
        filters: [{ field, value }],
        kind: 'query' as const,
        collection: name,
        where: (nextField: string, _nextOperator: '==', nextValue: unknown) => ({
          filters: [{ field, value }, { field: nextField, value: nextValue }],
          kind: 'query' as const,
          collection: name,
          where: (lastField: string, _lastOperator: '==', lastValue: unknown) => ({
            filters: [
              { field, value },
              { field: nextField, value: nextValue },
              { field: lastField, value: lastValue },
            ],
            kind: 'query' as const,
            collection: name,
          }),
        }),
      }),
    }
  }

  runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    this.transactionCalls += 1
    const transaction = {
      get: async (reference: {
        kind: 'document' | 'query'
        path?: string
        collection?: string
        filters?: Array<{ field: string; value: unknown }>
      }) => {
        if (reference.kind === 'document') {
          const data = reference.path ? this.documents.get(reference.path) : undefined
          return {
            exists: Boolean(data),
            data: () => data,
          }
        }

        const filters = reference.filters ?? []
        this.queries.push(filters)
        const docs = [...this.documents.entries()]
          .filter(([path, data]) => {
            if (!path.startsWith(`${reference.collection}/`)) return false
            return filters.every(({ field, value }) => data[field] === value)
          })
          .map(([path, data]) => ({
            id: path.slice(`${reference.collection}/`.length),
            data: () => data,
          }))
        return { docs }
      },
      update: (reference: { path: string }, data: Reservation) => {
        const current = this.documents.get(reference.path)
        if (!current) throw new Error('Missing document')
        this.documents.set(reference.path, { ...current, ...data })
        this.updates.push({ path: reference.path, data })
      },
    }

    return callback(transaction)
  }
}

function request(
  data: unknown,
  uid = 'user-1',
): CallableRequest<RescheduleReservaInput> {
  return {
    data,
    auth: uid ? { uid, token: {} } : undefined,
  } as unknown as CallableRequest<RescheduleReservaInput>
}

function input(overrides: Partial<RescheduleReservaInput> = {}): RescheduleReservaInput {
  return {
    reservaId: 'reserva-1',
    date: '2026-08-06',
    timeSlot: '12:00',
    ...overrides,
  }
}

function reservation(overrides: Reservation = {}): Reservation {
  return {
    userId: 'user-1',
    serviceId: 'service-1',
    status: 'pending',
    date: '2026-08-05',
    timeSlot: '11:00',
    ...overrides,
  }
}

function firestoreWithReservation(overrides: Reservation = {}): TransactionFirestoreFake {
  const firestore = new TransactionFirestoreFake()
  firestore.documents.set('reservas/reserva-1', reservation(overrides))
  return firestore
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code })
}

describe('rescheduleReservaHandler', () => {
  it('rejects malformed input', async () => {
    for (const malformed of [undefined, null, {}, { reservaId: 1, date: '2026-08-06', timeSlot: '12:00' }]) {
      await expectError(
        rescheduleReservaHandler(request(malformed), firestoreWithReservation() as unknown as Firestore, NOW),
        'invalid-argument',
      )
    }
  })

  it('rejects a reservation ID containing a slash before database access', async () => {
    const firestore = firestoreWithReservation()

    await expectError(
      rescheduleReservaHandler(
        request(input({ reservaId: 'reserva/1' })),
        firestore as unknown as Firestore,
        NOW,
      ),
      'invalid-argument',
    )
    expect(firestore.transactionCalls).toBe(0)
  })

  it('rejects invalid calendar dates', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input({ date: '2026-02-30' })),
        firestoreWithReservation() as unknown as Firestore,
        NOW,
      ),
      'invalid-argument',
    )
  })

  it('rejects invalid time slots', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input({ timeSlot: '25:00' })),
        firestoreWithReservation() as unknown as Firestore,
        NOW,
      ),
      'invalid-argument',
    )
  })

  it('rejects requests without authentication', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input(), ''),
        firestoreWithReservation() as unknown as Firestore,
        NOW,
      ),
      'unauthenticated',
    )
  })

  it('rejects an appointment that is not in the future', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input({ date: '2026-08-04', timeSlot: '09:00' })),
        firestoreWithReservation() as unknown as Firestore,
        NOW,
      ),
      'failed-precondition',
    )
  })

  it('accepts valid future input', async () => {
    const firestore = firestoreWithReservation()

    await expect(
      rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW),
    ).resolves.toEqual({ reservaId: 'reserva-1', date: '2026-08-06', timeSlot: '12:00' })
  })

  it('rejects a missing reservation', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input()),
        new TransactionFirestoreFake() as unknown as Firestore,
        NOW,
      ),
      'not-found',
    )
  })

  it('rejects a reservation owned by another user', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input(), 'other-user'),
        firestoreWithReservation() as unknown as Firestore,
        NOW,
      ),
      'permission-denied',
    )
  })

  it('rejects a reservation that is not pending', async () => {
    await expectError(
      rescheduleReservaHandler(
        request(input()),
        firestoreWithReservation({ status: 'confirmed' }) as unknown as Firestore,
        NOW,
      ),
      'permission-denied',
    )
  })

  it('rejects an active conflict for the requested service and slot', async () => {
    const firestore = firestoreWithReservation()
    firestore.documents.set(
      'reservas/conflict-1',
      reservation({ date: '2026-08-06', timeSlot: '12:00', status: 'confirmed' }),
    )

    await expectError(
      rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW),
      'failed-precondition',
    )
  })

  it('ignores a cancelled conflict', async () => {
    const firestore = firestoreWithReservation()
    firestore.documents.set(
      'reservas/conflict-1',
      reservation({ date: '2026-08-06', timeSlot: '12:00', status: 'cancelled' }),
    )

    await expect(
      rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW),
    ).resolves.toEqual({ reservaId: 'reserva-1', date: '2026-08-06', timeSlot: '12:00' })
  })

  it('updates only date and timeSlot after checking the transaction query', async () => {
    const firestore = firestoreWithReservation()

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.queries).toEqual([
      [
        { field: 'serviceId', value: 'service-1' },
        { field: 'date', value: '2026-08-06' },
        { field: 'timeSlot', value: '12:00' },
      ],
    ])
    expect(firestore.updates).toEqual([
      { path: 'reservas/reserva-1', data: { date: '2026-08-06', timeSlot: '12:00' } },
    ])
    expect(firestore.documents.get('reservas/reserva-1')).toMatchObject({
      userId: 'user-1',
      serviceId: 'service-1',
      status: 'pending',
      date: '2026-08-06',
      timeSlot: '12:00',
    })
  })
})
