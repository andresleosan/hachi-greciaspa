export type ShiftName = 'morning' | 'afternoon' | 'full'

export type EmployeeRole = 'groomer' | 'bañador' | 'cuidador'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface WeeklyShifts {
  monday: ShiftName | null
  tuesday: ShiftName | null
  wednesday: ShiftName | null
  thursday: ShiftName | null
  friday: ShiftName | null
  saturday: ShiftName | null
  sunday: ShiftName | null
}

export interface AssignmentEmployee {
  id: string
  name: string
  active: boolean
  services: string[]
  weeklyShifts: WeeklyShifts
}

export interface AssignmentReservation {
  id: string
  serviceId: string
  date: string
  timeSlot: string
  durationMin: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  empleadoId?: string | null
}

export type NoCandidateReason = 'no-eligible-service' | 'shift-unavailable' | 'overlap'

const WEEKDAYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export function parseAssignmentTime(timeSlot: string): number | null {
  if (typeof timeSlot !== 'string') return null

  const match = /^(\d{2}):(\d{2})$/.exec(timeSlot)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return hours * 60 + minutes
}

export function getWeekday(date: string): Weekday | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null

  const [year, month, day] = date.split('-').map(Number)
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return WEEKDAYS[parsed.getUTCDay()]
}

export function getShiftWindow(
  shift: ShiftName | null,
): { startMinutes: number; endMinutes: number } | null {
  if (shift === 'morning') return { startMinutes: 480, endMinutes: 840 }
  if (shift === 'afternoon') return { startMinutes: 840, endMinutes: 1200 }
  if (shift === 'full') return { startMinutes: 480, endMinutes: 1200 }
  return null
}

function hasValidDuration(durationMin: number): boolean {
  return Number.isInteger(durationMin) && durationMin > 0
}

function reservationInterval(
  reservation: AssignmentReservation,
): { startMinutes: number; endMinutes: number } | null {
  if (getWeekday(reservation.date) === null) return null

  const startMinutes = parseAssignmentTime(reservation.timeSlot)
  if (startMinutes === null || !hasValidDuration(reservation.durationMin)) return null

  return {
    startMinutes,
    endMinutes: startMinutes + reservation.durationMin,
  }
}

export function isEmployeeEligible(
  employee: AssignmentEmployee,
  reservation: AssignmentReservation,
): boolean {
  if (!employee.active || !employee.services.includes(reservation.serviceId)) return false

  const weekday = getWeekday(reservation.date)
  const interval = reservationInterval(reservation)
  if (!weekday || !interval) return false

  const shiftWindow = getShiftWindow(employee.weeklyShifts[weekday])
  return Boolean(
    shiftWindow &&
      interval.startMinutes >= shiftWindow.startMinutes &&
      interval.endMinutes <= shiftWindow.endMinutes,
  )
}

export function reservationsOverlap(
  left: AssignmentReservation,
  right: AssignmentReservation,
): boolean {
  if (left.date !== right.date || getWeekday(left.date) === null) return false

  const leftInterval = reservationInterval(left)
  const rightInterval = reservationInterval(right)
  if (!leftInterval || !rightInterval) return false

  return (
    leftInterval.startMinutes < rightInterval.endMinutes &&
    rightInterval.startMinutes < leftInterval.endMinutes
  )
}

function normalizedName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function selectFirstEligibleEmployee(
  employees: AssignmentEmployee[],
  reservation: AssignmentReservation,
  existingReservations: AssignmentReservation[],
): AssignmentEmployee | null {
  const eligible = employees.filter((employee) => {
    if (!isEmployeeEligible(employee, reservation)) return false

    return !existingReservations.some(
      (existingReservation) =>
        existingReservation.empleadoId === employee.id &&
        (existingReservation.status === 'pending' || existingReservation.status === 'confirmed') &&
        reservationsOverlap(existingReservation, reservation),
    )
  })

  eligible.sort((left, right) => {
    const leftName = normalizedName(left.name)
    const rightName = normalizedName(right.name)
    if (leftName < rightName) return -1
    if (leftName > rightName) return 1
    if (left.id < right.id) return -1
    if (left.id > right.id) return 1
    return 0
  })

  return eligible[0] ?? null
}

export function getNoCandidateReason(
  employees: AssignmentEmployee[],
  reservation: AssignmentReservation,
  existingReservations: AssignmentReservation[],
): NoCandidateReason {
  const serviceEligible = employees.filter(
    (employee) => employee.active && employee.services.includes(reservation.serviceId),
  )
  if (serviceEligible.length === 0) return 'no-eligible-service'

  const shiftEligible = serviceEligible.filter((employee) => isEmployeeEligible(employee, reservation))
  if (shiftEligible.length === 0) return 'shift-unavailable'

  return shiftEligible.every((employee) => existingReservations.some(
    (existingReservation) =>
      existingReservation.empleadoId === employee.id &&
      (existingReservation.status === 'pending' || existingReservation.status === 'confirmed') &&
      reservationsOverlap(existingReservation, reservation),
  )) ? 'overlap' : 'shift-unavailable'
}
