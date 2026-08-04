import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'

import {
  getWeekday,
  selectFirstEligibleEmployee,
  type AssignmentReservation,
} from './assignment.js'
import {
  activeEmployeesQuery,
  isAdminUser,
  normalizeReservation,
  pendingReservationsForDateQuery,
  readEmployees,
  readReservations,
  reservationsForDateQuery,
} from './employeeRepository.js'

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
  const name = error instanceof Error ? error.name : 'UnknownError'
  return name.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64) || 'UnknownError'
}

function sanitizedReservationId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128)
}

export async function assignReservaIfNeeded(
  db: Firestore,
  reservaId: string,
): Promise<string | null> {
  if (!reservaId.trim() || reservaId.includes('/')) return null

  return db.runTransaction(async (transaction) => {
    const reservationReference = db.collection('reservas').doc(reservaId)
    const reservationSnapshot = await transaction.get(reservationReference)
    if (!reservationSnapshot.exists) return null

    const reservation = normalizeReservation(reservaId, reservationSnapshot.data())
    if (!reservation || reservation.status !== 'pending' || reservation.empleadoId !== null) {
      return null
    }

    const employeesSnapshot = await transaction.get(activeEmployeesQuery(db))
    const reservationsSnapshot = await transaction.get(
      reservationsForDateQuery(db, reservation.date),
    )
    const candidate = selectFirstEligibleEmployee(
      readEmployees(employeesSnapshot),
      reservation,
      readReservations(reservationsSnapshot).filter((item) => item.id !== reservaId),
    )
    if (!candidate) return null

    transaction.update(reservationReference, { empleadoId: candidate.id })
    return candidate.id
  })
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
    const employeeId = await assignReservaIfNeeded(db, reservation.id)
    if (employeeId) {
      assignedReservationIds.push(reservation.id)
    } else {
      pendingReservationIds.push(reservation.id)
    }
  }

  return { assignedReservationIds, pendingReservationIds }
}

export const onReservaCreated = onDocumentCreated(
  'reservas/{reservaId}',
  async (event) => {
    const reservaId = event.params.reservaId
    if (!event.data) return

    try {
      await assignReservaIfNeeded(getFirestore(), reservaId)
    } catch (error) {
      console.error('Reservation assignment failed', {
        reservaId: sanitizedReservationId(reservaId),
        reason: sanitizedReason(error),
      })
      throw new Error('Reservation assignment failed')
    }
  },
)

export const assignPendingReservasForDate = onCall<AssignPendingReservasInput>(
  async (request) => assignPendingReservasForDateHandler(request, getFirestore()),
)
