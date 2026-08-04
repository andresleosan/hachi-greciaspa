import { describe, expect, it } from 'vitest'

import {
  getShiftWindow,
  getWeekday,
  isEmployeeEligible,
  parseAssignmentTime,
  reservationsOverlap,
  selectFirstEligibleEmployee,
  type AssignmentEmployee,
  type AssignmentReservation,
  type WeeklyShifts,
} from './assignment.js'

const fullWeek: WeeklyShifts = {
  monday: 'full',
  tuesday: 'full',
  wednesday: 'full',
  thursday: 'full',
  friday: 'full',
  saturday: 'full',
  sunday: 'full',
}

function employee(overrides: Partial<AssignmentEmployee> = {}): AssignmentEmployee {
  return {
    id: 'employee-1',
    name: 'Ana',
    active: true,
    services: ['service-1'],
    weeklyShifts: fullWeek,
    ...overrides,
  }
}

function reservation(overrides: Partial<AssignmentReservation> = {}): AssignmentReservation {
  return {
    id: 'reservation-1',
    serviceId: 'service-1',
    date: '2026-08-04',
    timeSlot: '10:00',
    durationMin: 60,
    status: 'pending',
    ...overrides,
  }
}

describe('assignment domain helpers', () => {
  it('parses only strict 24-hour HH:mm times', () => {
    expect(parseAssignmentTime('08:00')).toBe(480)
    expect(parseAssignmentTime('8:00')).toBeNull()
    expect(parseAssignmentTime('24:00')).toBeNull()
    expect(parseAssignmentTime('12:60')).toBeNull()
  })

  it('gets the weekday from a valid UTC calendar date', () => {
    expect(getWeekday('2026-08-04')).toBe('tuesday')
    expect(getWeekday('2026-02-30')).toBeNull()
    expect(getWeekday('2026/08/04')).toBeNull()
  })

  it('returns the configured shift windows in integer minutes', () => {
    expect(getShiftWindow('morning')).toEqual({ startMinutes: 480, endMinutes: 840 })
    expect(getShiftWindow('afternoon')).toEqual({ startMinutes: 840, endMinutes: 1200 })
    expect(getShiftWindow('full')).toEqual({ startMinutes: 480, endMinutes: 1200 })
    expect(getShiftWindow(null)).toBeNull()
  })

  it('requires a reservation to fit completely inside the employee shift', () => {
    const morningEmployee = employee({
      weeklyShifts: { ...fullWeek, tuesday: 'morning' },
    })

    expect(isEmployeeEligible(morningEmployee, reservation({ timeSlot: '13:00', durationMin: 60 }))).toBe(true)
    expect(isEmployeeEligible(morningEmployee, reservation({ timeSlot: '13:30', durationMin: 60 }))).toBe(false)
    expect(isEmployeeEligible(morningEmployee, reservation({ timeSlot: '14:00', durationMin: 1 }))).toBe(false)
  })

  it('allows a full-day reservation only within the full shift window', () => {
    const fullShiftEmployee = employee()

    expect(isEmployeeEligible(fullShiftEmployee, reservation({ timeSlot: '08:00', durationMin: 720 }))).toBe(true)
    expect(isEmployeeEligible(fullShiftEmployee, reservation({ timeSlot: '08:01', durationMin: 720 }))).toBe(false)
  })

  it('rejects inactive employees, unsupported services, invalid dates, and non-positive durations', () => {
    expect(isEmployeeEligible(employee({ active: false }), reservation())).toBe(false)
    expect(isEmployeeEligible(employee({ services: [] }), reservation())).toBe(false)
    expect(isEmployeeEligible(employee(), reservation({ serviceId: '' }))).toBe(false)
    expect(isEmployeeEligible(employee(), reservation({ date: '2026-02-30' }))).toBe(false)
    expect(isEmployeeEligible(employee(), reservation({ timeSlot: '9:00' }))).toBe(false)
    expect(isEmployeeEligible(employee(), reservation({ durationMin: 0 }))).toBe(false)
    expect(isEmployeeEligible(employee(), reservation({ durationMin: -30 }))).toBe(false)
  })

  it('blocks an employee only for active overlapping reservations assigned to that employee', () => {
    const candidate = reservation({ timeSlot: '10:30' })

    expect(
      selectFirstEligibleEmployee(
        [employee()],
        candidate,
        [reservation({ empleadoId: 'employee-1', timeSlot: '10:00' })],
      ),
    ).toBeNull()
    expect(
      selectFirstEligibleEmployee(
        [employee()],
        candidate,
        [reservation({ empleadoId: 'employee-2', timeSlot: '10:00' })],
      )?.id,
    ).toBe('employee-1')
    expect(
      selectFirstEligibleEmployee(
        [employee()],
        candidate,
        [reservation({ empleadoId: 'employee-1', status: 'cancelled', timeSlot: '10:00' })],
      )?.id,
    ).toBe('employee-1')
    expect(
      selectFirstEligibleEmployee(
        [employee()],
        candidate,
        [reservation({ empleadoId: 'employee-1', status: 'completed', timeSlot: '10:00' })],
      )?.id,
    ).toBe('employee-1')
  })

  it('detects same-start and nested overlaps but not adjacent or different-date bookings', () => {
    const left = reservation({ timeSlot: '10:00', durationMin: 60 })

    expect(reservationsOverlap(left, reservation({ timeSlot: '10:00', durationMin: 30 }))).toBe(true)
    expect(reservationsOverlap(left, reservation({ timeSlot: '10:30', durationMin: 15 }))).toBe(true)
    expect(reservationsOverlap(left, reservation({ timeSlot: '11:00', durationMin: 60 }))).toBe(false)
    expect(reservationsOverlap(left, reservation({ date: '2026-08-05', timeSlot: '10:00' }))).toBe(false)
    expect(reservationsOverlap(left, reservation({ durationMin: 0 }))).toBe(false)
  })

  it('selects the eligible employee by normalized name and then ID', () => {
    const reservationToAssign = reservation()
    const selected = selectFirstEligibleEmployee(
      [
        employee({ id: 'zeta', name: ' Zoë ' }),
        employee({ id: 'ana-2', name: 'ANA' }),
        employee({ id: 'ana-1', name: 'Ána' }),
        employee({ id: 'inactive', name: 'Aardvark', active: false }),
      ],
      reservationToAssign,
      [],
    )

    expect(selected?.id).toBe('ana-1')
  })

  it('returns null when no employee is eligible', () => {
    expect(
      selectFirstEligibleEmployee(
        [employee({ active: false }), employee({ services: [] })],
        reservation(),
        [],
      ),
    ).toBeNull()
  })
})
