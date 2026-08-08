import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  callable: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  httpsCallable: vi.fn(),
  updateDoc: vi.fn(),
  db: { name: 'firestore' },
  functions: { name: 'functions' },
}))

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  updateDoc: mocks.updateDoc,
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: mocks.httpsCallable,
}))

vi.mock('./firebase', () => ({
  firebaseDb: mocks.db,
  firebaseFunctions: mocks.functions,
}))

import {
  assignPendingReservasForDate,
  countFutureReservationsByEmployee,
  createEmpleado,
  deactivateEmpleado,
  EmpleadoError,
  listEmpleados,
  updateEmpleado,
} from './empleados'
import type { EmpleadoInput } from '../types'

const employeeInput: EmpleadoInput = {
  name: 'Mariana Lopez',
  role: 'groomer',
  photoUrl: null,
  active: true,
  services: ['banio'],
  weeklyShifts: {
    monday: 'morning',
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: 'full',
    saturday: null,
    sunday: null,
  },
}

describe('empleados service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.collection.mockReturnValue('empleados-collection')
    mocks.doc.mockReturnValue('empleado-doc')
    mocks.httpsCallable.mockReturnValue(mocks.callable)
  })

  it('lists employees and maps each document id into the domain object', async () => {
    const firstEmployee = { ...employeeInput }
    const secondEmployee = { ...employeeInput, name: 'Sofia Garcia', active: false }
    mocks.getDocs.mockResolvedValue({
      docs: [
        { id: 'employee-1', data: () => firstEmployee },
        { id: 'employee-2', data: () => secondEmployee },
      ],
    })

    await expect(listEmpleados()).resolves.toEqual([
      { id: 'employee-1', ...firstEmployee },
      { id: 'employee-2', ...secondEmployee },
    ])
    expect(mocks.collection).toHaveBeenCalledWith(mocks.db, 'empleados')
  })

  it('does not let a stored id field overwrite the document id', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'employee-1', data: () => ({ ...employeeInput, id: 'stored-id' }) }],
    })

    await expect(listEmpleados()).resolves.toEqual([{ id: 'employee-1', ...employeeInput }])
  })

  it('creates an employee with the input fields unchanged', async () => {
    mocks.addDoc.mockResolvedValue({ id: 'employee-3' })

    await expect(createEmpleado(employeeInput)).resolves.toBe('employee-3')

    expect(mocks.addDoc).toHaveBeenCalledWith('empleados-collection', employeeInput)
  })

  it('updates an employee with the input fields unchanged', async () => {
    await updateEmpleado('employee-1', employeeInput)

    expect(mocks.doc).toHaveBeenCalledWith(mocks.db, 'empleados', 'employee-1')
    expect(mocks.updateDoc).toHaveBeenCalledWith('empleado-doc', employeeInput)
  })

  it('deactivates an employee with only the active field', async () => {
    await deactivateEmpleado('employee-1')

    expect(mocks.doc).toHaveBeenCalledWith(mocks.db, 'empleados', 'employee-1')
    expect(mocks.updateDoc).toHaveBeenCalledWith('empleado-doc', { active: false })
  })

  it('calls the assignment function with the date and returns its typed summary', async () => {
    const result = { assignedReservationIds: ['reservation-1'], pendingReservationIds: [] }
    mocks.callable.mockResolvedValue({ data: result })

    await expect(assignPendingReservasForDate('2026-08-04')).resolves.toEqual(result)

    expect(mocks.httpsCallable).toHaveBeenCalledWith(
      mocks.functions,
      'assignPendingReservasForDate',
    )
    expect(mocks.callable).toHaveBeenCalledWith({ date: '2026-08-04' })
  })

  it('maps callable failures to a safe employee error message', async () => {
    mocks.callable.mockRejectedValue({
      code: 'functions/permission-denied',
      message: 'token=secret server stack trace',
    })

    await expect(assignPendingReservasForDate('2026-08-04')).rejects.toMatchObject({
      name: 'EmpleadoError',
      message: 'No tenes permisos para administrar empleados.',
    })
    await expect(assignPendingReservasForDate('2026-08-04')).rejects.not.toThrow(
      'token=secret server stack trace',
    )
  })

  it('counts only assigned active reservations on or after the selected day', () => {
    expect(countFutureReservationsByEmployee([
      { empleadoId: 'employee-1', date: '2026-08-03', status: 'confirmed' },
      { empleadoId: 'employee-1', date: '2026-08-04', status: 'pending' },
      { empleadoId: 'employee-1', date: '2026-08-05', status: 'confirmed' },
      { empleadoId: 'employee-1', date: '2026-08-06', status: 'cancelled' },
      { empleadoId: null, date: '2026-08-05', status: 'confirmed' },
      { empleadoId: 'employee-2', date: '2026-08-05', status: 'completed' },
    ], '2026-08-04')).toEqual({
      'employee-1': 2,
    })
  })
})

describe('EmpleadoError', () => {
  it('is an Error with the employee domain name', () => {
    const error = new EmpleadoError('safe message')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('EmpleadoError')
    expect(error.message).toBe('safe message')
  })
})
