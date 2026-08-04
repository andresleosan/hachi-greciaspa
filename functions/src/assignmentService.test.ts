import { describe, expect, it } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'
import type { CallableRequest } from 'firebase-functions/v2/https'

import {
  assignPendingReservasForDateHandler,
  assignReservaIfNeeded,
  type AssignPendingReservasInput,
} from './assignmentService.js'

type DocumentData = Record<string, unknown>

type QueryReference = {
  kind: 'query'
  collection: string
  filters: Array<{ field: string; value: unknown }>
  limitValue?: number
}

type FakeQuery = QueryReference & {
  where: (field: string, operator: '==', value: unknown) => FakeQuery
  limit: (value: number) => FakeQuery
  get: () => Promise<{ docs: Array<{ id: string; data: () => DocumentData }> }>
}

type DocumentReference = { kind: 'document'; path: string }

class FirestoreFake {
  readonly documents = new Map<string, DocumentData>()
  readonly updates: Array<{ path: string; data: DocumentData }> = []
  readonly queries: QueryReference[] = []
  transactionCalls = 0

  collection(name: string) {
    return {
      doc: (id: string) => {
        const reference: DocumentReference & {
          get: () => Promise<{ exists: boolean; data: () => DocumentData | undefined }>
        } = {
          kind: 'document',
          path: `${name}/${id}`,
          get: async () => {
            const data = this.documents.get(`${name}/${id}`)
            return { exists: Boolean(data), data: () => data }
          },
        }
        return reference
      },
      where: (field: string, _operator: '==', value: unknown) =>
        this.createQuery(name, [{ field, value }]),
    }
  }

  private createQuery(collection: string, filters: Array<{ field: string; value: unknown }>): FakeQuery {
    const query = {
      kind: 'query' as const,
      collection,
      filters,
      where: (field: string, _operator: '==', value: unknown) =>
        this.createQuery(collection, [...filters, { field, value }]),
      limit: (value: number) => {
        Object.assign(query, { limitValue: value })
        return query
      },
      get: async () => this.getQuerySnapshot(query),
    } as FakeQuery
    return query
  }

  private getQuerySnapshot(query: QueryReference) {
    this.queries.push(query)
    const docs = [...this.documents.entries()]
      .filter(([path, data]) => {
        if (!path.startsWith(`${query.collection}/`)) return false
        return query.filters.every(({ field, value }) => {
          const actual = data[field]
          return value === null ? actual === null || actual === undefined : actual === value
        })
      })
      .slice(0, query.limitValue ?? Number.POSITIVE_INFINITY)
      .map(([path, data]) => ({
        id: path.slice(`${query.collection}/`.length),
        data: () => data,
      }))

    return { docs }
  }

  async runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    this.transactionCalls += 1
    const transaction = {
      get: async (reference: DocumentReference | QueryReference) => {
        if (reference.kind === 'document') {
          const data = this.documents.get(reference.path)
          return {
            exists: Boolean(data),
            data: () => data,
          }
        }

        return this.getQuerySnapshot(reference)
      },
      update: (reference: DocumentReference, data: DocumentData) => {
        const current = this.documents.get(reference.path)
        if (!current) throw new Error('Missing document')
        this.documents.set(reference.path, { ...current, ...data })
        this.updates.push({ path: reference.path, data })
      },
    }

    return callback(transaction)
  }
}

function employee(overrides: DocumentData = {}): DocumentData {
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

function reservation(overrides: DocumentData = {}): DocumentData {
  return {
    serviceId: 'service-1',
    date: '2026-08-04',
    timeSlot: '10:00',
    durationMin: 60,
    status: 'pending',
    empleadoId: null,
    ...overrides,
  }
}

function request(
  data: unknown,
  options: { uid?: string; adminClaim?: boolean } = {},
): CallableRequest<AssignPendingReservasInput> {
  const uid = options.uid ?? 'admin-1'
  return {
    data,
    auth: uid
      ? { uid, token: options.adminClaim ? { admin: true } : {} }
      : undefined,
  } as unknown as CallableRequest<AssignPendingReservasInput>
}

function addEmployee(db: FirestoreFake, id: string, overrides: DocumentData = {}) {
  db.documents.set(`empleados/${id}`, employee(overrides))
}

function addReservation(db: FirestoreFake, id: string, overrides: DocumentData = {}) {
  db.documents.set(`reservas/${id}`, reservation(overrides))
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code })
}

describe('assignReservaIfNeeded', () => {
  it('assigns the first eligible employee and updates only empleadoId', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-1', { name: 'Ana' })
    addReservation(db, 'reserva-1')
    delete db.documents.get('reservas/reserva-1')?.empleadoId

    await expect(assignReservaIfNeeded(db as unknown as Firestore, 'reserva-1')).resolves.toBe(
      'employee-1',
    )

    expect(db.updates).toEqual([
      { path: 'reservas/reserva-1', data: { empleadoId: 'employee-1' } },
    ])
    expect(db.documents.get('reservas/reserva-1')).toMatchObject({
      serviceId: 'service-1',
      status: 'pending',
      empleadoId: 'employee-1',
    })
  })

  it('leaves a pending reservation unchanged when no employee is eligible', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-1', { active: false })
    addReservation(db, 'reserva-1', { notes: 'preserve me' })

    await expect(assignReservaIfNeeded(db as unknown as Firestore, 'reserva-1')).resolves.toBeNull()

    expect(db.updates).toEqual([])
    expect(db.documents.get('reservas/reserva-1')).toMatchObject({
      status: 'pending',
      notes: 'preserve me',
      empleadoId: null,
    })
  })

  it('skips an occupied first candidate and selects the next eligible employee', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-1', { name: 'Ana' })
    addEmployee(db, 'employee-2', { name: 'Bea' })
    addReservation(db, 'occupied', { empleadoId: 'employee-1', timeSlot: '10:00' })
    addReservation(db, 'reserva-1', { timeSlot: '10:30' })

    await expect(assignReservaIfNeeded(db as unknown as Firestore, 'reserva-1')).resolves.toBe(
      'employee-2',
    )
  })

  it('uses deterministic employee and reservation ordering', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-2', { name: 'Ana' })
    addEmployee(db, 'employee-1', { name: 'Ana' })
    addReservation(db, 'reserva-z', { timeSlot: '10:00' })
    addReservation(db, 'reserva-a', { timeSlot: '10:00' })

    const result = await assignPendingReservasForDateHandler(
      request({ date: '2026-08-04' }, { adminClaim: true }),
      db as unknown as Firestore,
    )

    expect(result).toEqual({
      assignedReservationIds: ['reserva-a', 'reserva-z'],
      pendingReservationIds: [],
    })
    expect(db.updates.map((update) => update.path)).toEqual([
      'reservas/reserva-a',
      'reservas/reserva-z',
    ])
    expect(db.documents.get('reservas/reserva-a')?.empleadoId).toBe('employee-1')
    expect(db.documents.get('reservas/reserva-z')?.empleadoId).toBe('employee-2')
  })

  it('does not change an already-assigned reservation', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-1')
    addReservation(db, 'reserva-1', { empleadoId: 'existing-employee' })

    await expect(assignReservaIfNeeded(db as unknown as Firestore, 'reserva-1')).resolves.toBeNull()

    expect(db.updates).toEqual([])
    expect(db.documents.get('reservas/reserva-1')?.empleadoId).toBe('existing-employee')
  })
})

describe('assignPendingReservasForDateHandler', () => {
  it('accepts an admin custom claim', async () => {
    const db = new FirestoreFake()
    addReservation(db, 'reserva-1')

    await expect(
      assignPendingReservasForDateHandler(
        request({ date: '2026-08-04' }, { adminClaim: true }),
        db as unknown as Firestore,
      ),
    ).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: ['reserva-1'] })
  })

  it('accepts an admin role from the user document', async () => {
    const db = new FirestoreFake()
    db.documents.set('users/admin-1', { role: 'admin' })
    addReservation(db, 'reserva-1')

    await expect(
      assignPendingReservasForDateHandler(
        request({ date: '2026-08-04' }),
        db as unknown as Firestore,
      ),
    ).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: ['reserva-1'] })
  })

  it('rejects unauthenticated and non-admin requests', async () => {
    const db = new FirestoreFake()

    await expectError(
      assignPendingReservasForDateHandler(
        request({ date: '2026-08-04' }, { uid: '' }),
        db as unknown as Firestore,
      ),
      'unauthenticated',
    )
    await expectError(
      assignPendingReservasForDateHandler(
        request({ date: '2026-08-04' }, { uid: 'client-1' }),
        db as unknown as Firestore,
      ),
      'permission-denied',
    )
  })

  it('rejects an invalid calendar date', async () => {
    const db = new FirestoreFake()

    await expectError(
      assignPendingReservasForDateHandler(
        request({ date: '2026-02-30' }, { adminClaim: true }),
        db as unknown as Firestore,
      ),
      'invalid-argument',
    )
  })

  it('returns no additional changes when retrying after assignment', async () => {
    const db = new FirestoreFake()
    addEmployee(db, 'employee-1')
    addReservation(db, 'reserva-1')
    const adminRequest = request({ date: '2026-08-04' }, { adminClaim: true })

    await expect(
      assignPendingReservasForDateHandler(adminRequest, db as unknown as Firestore),
    ).resolves.toEqual({
      assignedReservationIds: ['reserva-1'],
      pendingReservationIds: [],
    })
    const updateCount = db.updates.length

    await expect(
      assignPendingReservasForDateHandler(adminRequest, db as unknown as Firestore),
    ).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: [] })
    expect(db.updates).toHaveLength(updateCount)
  })
})
