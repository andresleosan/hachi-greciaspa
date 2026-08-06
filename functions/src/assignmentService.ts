import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'

import {
  getNoCandidateReason,
  getWeekday,
  selectFirstEligibleEmployee,
  type NoCandidateReason,
  type AssignmentReservation,
} from './assignment.js'
import {
  activeEmployeesQuery,
  AssignmentDataOverflowError,
  isAdminUser,
  normalizeReservation,
  pendingReservationsForDateQuery,
  readEmployees,
  readReservations,
  reservationsForDateQuery,
} from './employeeRepository.js'
import { captureFunctionException } from './observability/sentry.js'

export { AssignmentDataOverflowError } from './employeeRepository.js'

export interface AssignPendingReservasInput {
  date: string
}

export interface AssignPendingReservasResult {
  assignedReservationIds: string[]
  pendingReservationIds: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDateInput(value: unknown): AssignPendingReservasInput {
  if (!isRecord(value) || typeof value.date !== 'string' || getWeekday(value.date) === null) {
    throw new HttpsError('invalid-argument', 'Invalid assignment date')
  }
  return { date: value.date }
}

function hasAdminClaim(request: CallableRequest<unknown>): boolean {
  return request.auth?.token?.admin === true
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortReservations(left: AssignmentReservation, right: AssignmentReservation): number {
  const timeOrder = compareText(left.timeSlot, right.timeSlot)
  return timeOrder || compareText(left.id, right.id)
}

function sanitizedReason(error: unknown): string {
  const name = error instanceof Error
    ? error.name
    : typeof error === 'string'
      ? error
      : 'UnknownError'
  return name.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64) || 'UnknownError'
}

function sanitizedReservationId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128)
}

type AssignmentOutcome =
  | { status: 'assigned'; employeeId: string }
  | { status: 'already-assigned' }
  | { status: 'pending'; reason: NoCandidateReason }
  | { status: 'skipped' }

async function assignReservaWithOutcome(
  db: Firestore,
  reservaId: string,
): Promise<AssignmentOutcome> {
  if (!reservaId.trim() || reservaId.includes('/')) return { status: 'skipped' }

  return db.runTransaction(async (transaction) => {
    const reservationReference = db.collection('reservas').doc(reservaId)
    const reservationSnapshot = await transaction.get(reservationReference)
    if (!reservationSnapshot.exists) return { status: 'skipped' }

    const reservation = normalizeReservation(reservaId, reservationSnapshot.data())
    if (!reservation) return { status: 'skipped' }
    if (reservation.status !== 'pending') return { status: 'skipped' }
    if (reservation.empleadoId !== null) return { status: 'already-assigned' }

    const employeesSnapshot = await transaction.get(activeEmployeesQuery(db))
    const reservationsSnapshot = await transaction.get(
      reservationsForDateQuery(db, reservation.date),
    )
    const employees = readEmployees(employeesSnapshot)
    const existingReservations = readReservations(reservationsSnapshot).filter((item) => item.id !== reservaId)
    const candidate = selectFirstEligibleEmployee(employees, reservation, existingReservations)
    if (!candidate) {
      return {
        status: 'pending',
        reason: getNoCandidateReason(employees, reservation, existingReservations),
      }
    }

    transaction.update(reservationReference, { empleadoId: candidate.id })
    return { status: 'assigned', employeeId: candidate.id }
  })
}

export async function assignReservaIfNeeded(
  db: Firestore,
  reservaId: string,
): Promise<string | null> {
  const outcome = await assignReservaWithOutcome(db, reservaId)
  return outcome.status === 'assigned' ? outcome.employeeId : null
}

export async function assignPendingReservasForDateHandler(
  request: CallableRequest<AssignPendingReservasInput>,
  db: Firestore,
): Promise<AssignPendingReservasResult> {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required')

  const input = parseDateInput(request.data)
  if (!hasAdminClaim(request) && !(await isAdminUser(db, uid))) {
    throw new HttpsError('permission-denied', 'Admin access is required')
  }

  const pendingReservations = readReservations(
    await pendingReservationsForDateQuery(db, input.date).get(),
  )
    .filter((reservation) => reservation.empleadoId === null)
    .sort(sortReservations)

  const assignedReservationIds: string[] = []
  const pendingReservationIds: string[] = []
  for (const reservation of pendingReservations) {
    const outcome = await assignReservaWithOutcome(db, reservation.id)
    if (outcome.status === 'assigned') {
      assignedReservationIds.push(reservation.id)
    } else if (outcome.status === 'pending') {
      pendingReservationIds.push(reservation.id)
    }
  }

  return { assignedReservationIds, pendingReservationIds }
}

export async function onReservaCreatedHandler(
  event: { params: { reservaId: string }; data?: unknown },
  db: Firestore,
): Promise<void> {
  const reservaId = event.params.reservaId
  if (!event.data) return

  try {
    const outcome = await assignReservaWithOutcome(db, reservaId)
    if (outcome.status === 'pending') {
      console.warn('Reservation assignment pending', {
        reservaId: sanitizedReservationId(reservaId),
        reason: sanitizedReason(outcome.reason),
      })
    }
  } catch (error) {
    captureFunctionException(error, { operation: 'assign-reserva' })
    console.error('Reservation assignment failed', {
      reservaId: sanitizedReservationId(reservaId),
      reason: sanitizedReason(error),
    })
    throw new Error('Reservation assignment failed')
  }
}

export const onReservaCreated = onDocumentCreated(
  { document: 'reservas/{reservaId}', retry: true },
  async (event) => onReservaCreatedHandler(event, getFirestore()),
)

export const assignPendingReservasForDate = onCall<AssignPendingReservasInput>(
  async (request) => assignPendingReservasForDateHandler(request, getFirestore()),
)
