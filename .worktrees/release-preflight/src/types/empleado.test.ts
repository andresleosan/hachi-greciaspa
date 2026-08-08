import { describe, expect, it } from 'vitest'
import type {
  Empleado,
  EmpleadoInput,
  Reserva,
} from './index'
import './empleado'

const employee: EmpleadoInput = {
  name: 'Mariana López',
  role: 'groomer',
  photoUrl: null,
  active: true,
  services: ['spa-day', 'grooming'],
  weeklyShifts: {
    monday: 'full',
    tuesday: 'full',
    wednesday: null,
    thursday: 'morning',
    friday: 'afternoon',
    saturday: null,
    sunday: null,
  },
}

const reserva: Reserva = {
  id: 'reserva-1',
  userId: 'user-1',
  userName: 'Ana Pérez',
  userEmail: 'ana@example.com',
  serviceId: 'spa-day',
  serviceName: 'Spa Day',
  price: 240,
  date: '2026-08-04',
  timeSlot: '10:00',
  durationMin: 90,
  notes: null,
  status: 'pending',
  createdAt: null,
  createdBy: 'client',
  empleadoId: null,
}

describe('employee and reservation type contracts', () => {
  it('accepts an employee input and an optionally unassigned reservation', () => {
    const persistedEmployee: Empleado = { id: 'mariana-lopez', ...employee }

    expect(persistedEmployee.weeklyShifts.sunday).toBeNull()
    expect(reserva.empleadoId).toBeNull()
  })
})
