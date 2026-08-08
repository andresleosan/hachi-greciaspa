import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => ({ path: 'reservas' })),
  callable: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  httpsCallable: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  updateDoc: vi.fn(),
  where: vi.fn(),
  db: { name: 'firestore' },
  functions: { name: 'functions' },
}))

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
  where: mocks.where,
}))
vi.mock('firebase/functions', () => ({
  httpsCallable: mocks.httpsCallable,
}))
vi.mock('./firebase', () => ({
  firebaseDb: mocks.db,
  firebaseFunctions: mocks.functions,
}))

const { createReserva } = await import('./reservas')

describe('createReserva', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.httpsCallable.mockReturnValue(mocks.callable)
    mocks.callable.mockResolvedValue({
      data: {
        reservaId: 'reservation-id',
        date: '2026-08-09',
        timeSlot: '10:00',
        status: 'pending',
      },
    })
  })

  it('invokes the createReserva callable with only the approved input contract', async () => {
    const input = {
      serviceId: 'spa-day',
      mascotaId: null,
      date: '2026-08-09',
      timeSlot: '10:00',
      notes: 'local QA',
    }

    await expect(createReserva(input)).resolves.toBe('reservation-id')

    expect(mocks.httpsCallable).toHaveBeenCalledWith(
      mocks.functions,
      'createReserva',
    )
    expect(mocks.callable).toHaveBeenCalledWith(input)
    expect(mocks.addDoc).not.toHaveBeenCalled()
  })

  it('maps callable rejections to a safe ReservaError', async () => {
    mocks.callable.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'internal quota details',
    })

    await expect(createReserva({
      serviceId: 'spa-day',
      date: '2026-08-09',
      timeSlot: '10:00',
      mascotaId: null,
      notes: null,
    })).rejects.toMatchObject({
      name: 'ReservaError',
      message: expect.stringMatching(/límite|intentos|reservas/i),
    })
    await expect(createReserva({
      serviceId: 'spa-day',
      date: '2026-08-09',
      timeSlot: '10:00',
      mascotaId: null,
      notes: null,
    })).rejects.not.toThrow('internal quota details')
  })
})
