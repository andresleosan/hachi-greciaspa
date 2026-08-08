import { describe, expect, it } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'
import type { Firestore } from 'firebase-admin/firestore'
import type { AssignmentEmployee } from './assignment.js'

import {
  rescheduleReservaHandler,
  type RescheduleReservaInput,
} from './rescheduleReserva.js'

const NOW = new Date('2026-08-04T16:00:00.000Z')

type Reservation = Record<string, unknown>
type EmployeeDocument = Omit<AssignmentEmployee, 'id'>

class TransactionFirestoreFake {
  readonly documents = new Map<string, Reservation>()
  readonly updates: Array<{ path: string; data: Reservation }> = []
  readonly sets: Array<{ path: string; data: Reservation }> = []
  readonly queries: Array<Array<{ field: string; value: unknown }>> = []
  transactionCalls = 0

  collection(name: string) {
    return {
      doc: (id: string) => ({ path: `${name}/${id}`, kind: 'document' as const }),
      where: (field: string, _operator: '==', value: unknown) => ({
        filters: [{ field, value }],
        kind: 'query' as const,
        collection: name,
        limit: (_value: number) => ({
          filters: [{ field, value }],
          kind: 'query' as const,
          collection: name,
        }),
        where: (nextField: string, _nextOperator: '==', nextValue: unknown) => ({
          filters: [{ field, value }, { field: nextField, value: nextValue }],
          kind: 'query' as const,
          collection: name,
          limit: (_value: number) => ({
            filters: [{ field, value }, { field: nextField, value: nextValue }],
            kind: 'query' as const,
            collection: name,
          }),
          where: (lastField: string, _lastOperator: '==', lastValue: unknown) => ({
            filters: [
              { field, value },
              { field: nextField, value: nextValue },
              { field: lastField, value: lastValue },
            ],
            kind: 'query' as const,
            collection: name,
            limit: (_value: number) => ({
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
      set: (reference: { path: string }, data: Reservation) => {
        this.documents.set(reference.path, { ...data })
        this.sets.push({ path: reference.path, data })
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

function employee(overrides: Partial<EmployeeDocument> = {}): EmployeeDocument {
  return {
    name: 'Ana',
    active: true,
    services: ['service-1'],
    weeklyShifts: {
      monday: 'full',
      tuesday: 'full',
      wednesday: 'full',
      thursday: 'full',
      friday: 'full',
      saturday: 'full',
      sunday: 'full',
    },
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

  it('preserves an assigned employee who is eligible and free at the new slot', async () => {
    const firestore = firestoreWithReservation({ empleadoId: 'employee-1', durationMin: 60 })
    firestore.documents.set('empleados/employee-1', employee())

    await expect(
      rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW),
    ).resolves.toEqual({ reservaId: 'reserva-1', date: '2026-08-06', timeSlot: '12:00' })

    expect(firestore.documents.get('reservas/reserva-1')).toMatchObject({
      date: '2026-08-06',
      timeSlot: '12:00',
      empleadoId: 'employee-1',
    })
    expect(firestore.updates).toEqual([
      { path: 'reservas/reserva-1', data: { date: '2026-08-06', timeSlot: '12:00' } },
    ])
  })

  it('clears an assigned employee who overlaps an active reservation at the new slot', async () => {
    const firestore = firestoreWithReservation({ empleadoId: 'employee-1', durationMin: 60 })
    firestore.documents.set('empleados/employee-1', employee())
    firestore.documents.set(
      'reservas/occupied',
      reservation({
        date: '2026-08-06',
        timeSlot: '12:30',
        durationMin: 60,
        status: 'confirmed',
        empleadoId: 'employee-1',
      }),
    )

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.updates).toEqual([
      {
        path: 'reservas/reserva-1',
        data: { date: '2026-08-06', timeSlot: '12:00', empleadoId: null },
      },
    ])
    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
  })

  it('clears an assigned employee who is inactive', async () => {
    const firestore = firestoreWithReservation({ empleadoId: 'employee-1', durationMin: 60 })
    firestore.documents.set('empleados/employee-1', employee({ active: false }))

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
    expect(firestore.updates).toEqual([
      {
        path: 'reservas/reserva-1',
        data: { date: '2026-08-06', timeSlot: '12:00', empleadoId: null },
      },
    ])
  })

  it('clears an assigned employee who no longer serves the reservation service', async () => {
    const firestore = firestoreWithReservation({ empleadoId: 'employee-1', durationMin: 60 })
    firestore.documents.set('empleados/employee-1', employee({ services: ['service-2'] }))

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
    expect(firestore.updates).toEqual([
      {
        path: 'reservas/reserva-1',
        data: { date: '2026-08-06', timeSlot: '12:00', empleadoId: null },
      },
    ])
  })

  it('leaves an unassigned reservation unassigned during rescheduling', async () => {
    const firestore = firestoreWithReservation({ empleadoId: null, durationMin: 60 })

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
    expect(firestore.updates).toEqual([
      { path: 'reservas/reserva-1', data: { date: '2026-08-06', timeSlot: '12:00' } },
    ])
  })

  it('clears a malformed non-null employee assignment', async () => {
    const firestore = firestoreWithReservation({ empleadoId: ' ', durationMin: 60 })

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
    expect(firestore.updates).toEqual([
      {
        path: 'reservas/reserva-1',
        data: { date: '2026-08-06', timeSlot: '12:00', empleadoId: null },
      },
    ])
  })

  it('does not treat the reservation being moved as an employee conflict', async () => {
    const firestore = firestoreWithReservation({
      empleadoId: 'employee-1',
      durationMin: 60,
      date: '2026-08-06',
      timeSlot: '12:00',
    })
    firestore.documents.set('empleados/employee-1', employee())

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBe('employee-1')
    expect(firestore.updates).toEqual([
      { path: 'reservas/reserva-1', data: { date: '2026-08-06', timeSlot: '12:00' } },
    ])
  })

  it('clears an assigned employee when the new appointment is outside their shift', async () => {
    const firestore = firestoreWithReservation({
      empleadoId: 'employee-1',
      durationMin: 60,
    })
    firestore.documents.set(
      'empleados/employee-1',
      employee({
        weeklyShifts: {
          monday: 'full',
          tuesday: 'full',
          wednesday: 'full',
          thursday: 'morning',
          friday: 'full',
          saturday: 'full',
          sunday: 'full',
        },
      }),
    )

    await rescheduleReservaHandler(
      request(input({ timeSlot: '13:30' })),
      firestore as unknown as Firestore,
      NOW,
    )

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
  })

  it('clears an assigned employee when the appointment duration exceeds their shift', async () => {
    const firestore = firestoreWithReservation({
      empleadoId: 'employee-1',
      durationMin: 120,
    })
    firestore.documents.set(
      'empleados/employee-1',
      employee({
        weeklyShifts: {
          monday: 'full',
          tuesday: 'full',
          wednesday: 'full',
          thursday: 'morning',
          friday: 'full',
          saturday: 'full',
          sunday: 'full',
        },
      }),
    )

    await rescheduleReservaHandler(
      request(input({ timeSlot: '13:00' })),
      firestore as unknown as Firestore,
      NOW,
    )

    expect(firestore.documents.get('reservas/reserva-1')?.empleadoId).toBeNull()
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

  it('writes the destination service/day availability lock with the reservation update', async () => {
    const firestore = firestoreWithReservation()

    await rescheduleReservaHandler(request(input()), firestore as unknown as Firestore, NOW)

    expect(firestore.sets).toEqual([
      {
        path: 'bookingSlotGuards/service-1__2026-08-06',
        data: expect.objectContaining({
          serviceId: 'service-1',
          date: '2026-08-06',
          updatedAt: expect.anything(),
        }),
      },
    ])
  })
})
