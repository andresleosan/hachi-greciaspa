import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { onCall, type CallableRequest } from 'firebase-functions/v2/https'

import { consumeBookingAttempt, type BookingQuotaState } from './bookingQuota.js'
import { reservationsOverlap, type AssignmentReservation } from './assignment.js'
import { bookingSlotGuardId } from './bookingSlotGuard.js'
import { normalizeReservation } from './employeeRepository.js'
import { formatInTimeZone, fromZonedTime } from './timeZone.js'

const TIME_ZONE = 'America/Mexico_City'
const MAX_NOTES_LENGTH = 1000
const ALLOWED_FIELDS = new Set(['serviceId', 'date', 'timeSlot', 'mascotaId', 'notes'])
const ACTIVE_STATUSES = ['pending', 'confirmed'] as const
const MAX_ACTIVE_RESERVATIONS = 10

export interface CreateReservaInput {
  serviceId: string
  date: string
  timeSlot: string
  mascotaId?: string | null
  notes?: string | null
}

export interface CreateReservaResult {
  reservaId: string
  date: string
  timeSlot: string
  status: 'pending'
}

export type CreateReservaInputParseResult =
  | { ok: true; input: CreateReservaInput }
  | { ok: false; error: HttpsError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidInput(): { ok: false; error: HttpsError } {
  return {
    ok: false,
    error: new HttpsError('invalid-argument', 'Invalid createReserva input'),
  }
}

export function parseCreateReservaInput(value: unknown): CreateReservaInputParseResult {
  if (!isRecord(value) || Object.keys(value).some((key) => !ALLOWED_FIELDS.has(key))) {
    return invalidInput()
  }

  const serviceId = value.serviceId
  const date = value.date
  const timeSlot = value.timeSlot

  if (typeof serviceId !== 'string' || typeof date !== 'string' || typeof timeSlot !== 'string') {
    return invalidInput()
  }

  const normalizedServiceId = serviceId.trim()
  const normalizedDate = date.trim()
  const normalizedTimeSlot = timeSlot.trim()

  if (
    !normalizedServiceId ||
    normalizedServiceId.includes('/') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizedTimeSlot)
  ) {
    return invalidInput()
  }

  const mascotaId = value.mascotaId
  let normalizedMascotaId: string | null | undefined
  if (mascotaId !== undefined && mascotaId !== null) {
    if (typeof mascotaId !== 'string') return invalidInput()
    normalizedMascotaId = mascotaId.trim()
    if (
      !normalizedMascotaId ||
      normalizedMascotaId.includes('/')
    ) {
      return invalidInput()
    }
  } else {
    normalizedMascotaId = mascotaId
  }

  const notes = value.notes
  let normalizedNotes: string | null | undefined
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string' || notes.length > MAX_NOTES_LENGTH) return invalidInput()
    normalizedNotes = notes.trim()
  } else {
    normalizedNotes = notes
  }

  const appointment = fromZonedTime(
    `${normalizedDate}T${normalizedTimeSlot}`,
    TIME_ZONE,
  )
  if (
    Number.isNaN(appointment.getTime()) ||
    formatInTimeZone(appointment, TIME_ZONE, 'yyyy-MM-dd') !== normalizedDate ||
    formatInTimeZone(appointment, TIME_ZONE, 'HH:mm') !== normalizedTimeSlot
  ) {
    return invalidInput()
  }

  const input: CreateReservaInput = {
    serviceId: normalizedServiceId,
    date: normalizedDate,
    timeSlot: normalizedTimeSlot,
  }
  if (normalizedMascotaId !== undefined) input.mascotaId = normalizedMascotaId
  if (normalizedNotes !== undefined) input.notes = normalizedNotes

  return { ok: true, input }
}

type TransactionOutcome =
  | { ok: true; result: CreateReservaResult }
  | { ok: false; error: HttpsError }

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (isRecord(value) && typeof value.toDate === 'function') {
    const converted = value.toDate()
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null
  }

  return null
}

function readBookingQuotaState(data: DocumentData | undefined): BookingQuotaState | null {
  if (!data) return null

  const windowStartedAt = toDate(data.windowStartedAt)
  if (!windowStartedAt) return null

  return {
    windowStartedAt,
    attempts: typeof data.attempts === 'number' ? data.attempts : Number.NaN,
  }
}

function snapshotText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function readUserName(
  profile: DocumentData | undefined,
  token: Record<string, unknown> | undefined,
): string | null {
  return snapshotText(profile?.displayName, 120)
    ?? snapshotText(token?.name, 120)
    ?? snapshotText(token?.displayName, 120)
}

function readUserEmail(
  profile: DocumentData | undefined,
  token: Record<string, unknown> | undefined,
): string | null {
  return snapshotText(token?.email, 320) ?? snapshotText(profile?.email, 320)
}

function failed(error: HttpsError): TransactionOutcome {
  return { ok: false, error }
}

function normalizedReservations(
  documents: Array<{ id: string; data: () => DocumentData }>,
): AssignmentReservation[] | null {
  const reservations: AssignmentReservation[] = []
  for (const document of documents) {
    const reservation = normalizeReservation(document.id, document.data())
    if (!reservation) return null
    reservations.push(reservation)
  }
  return reservations
}

export async function createReservaHandler(
  request: CallableRequest<CreateReservaInput>,
  db: Firestore,
  now: Date,
): Promise<CreateReservaResult> {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required')

  const parsed = parseCreateReservaInput(request.data)

  const outcome = await db.runTransaction<TransactionOutcome>(async (transaction) => {
    const guardReference = db.collection('bookingGuards').doc(uid)
    const guardSnapshot = await transaction.get(guardReference)
    const quota = consumeBookingAttempt(readBookingQuotaState(guardSnapshot.data()), now)
    const guardData = {
      uid,
      windowStartedAt: quota.state.windowStartedAt,
      attempts: quota.state.attempts,
      updatedAt: FieldValue.serverTimestamp(),
    }
    const persistFailure = (error: HttpsError): TransactionOutcome => {
      transaction.set(guardReference, guardData)
      return failed(error)
    }

    if (!quota.allowed) {
      return persistFailure(
        new HttpsError('resource-exhausted', 'Booking attempts limit reached'),
      )
    }

    if (!parsed.ok) return persistFailure(parsed.error)

    const input = parsed.input
    const appointment = fromZonedTime(`${input.date}T${input.timeSlot}`, TIME_ZONE)
    if (appointment.getTime() <= now.getTime()) {
      return persistFailure(
        new HttpsError('failed-precondition', 'The appointment must be in the future'),
      )
    }

    const slotGuardReference = db
      .collection('bookingSlotGuards')
      .doc(bookingSlotGuardId(input.serviceId, input.date))
    await transaction.get(slotGuardReference)

    const serviceSnapshot = await transaction.get(
      db.collection('servicios').doc(input.serviceId),
    )
    if (!serviceSnapshot.exists) {
      return persistFailure(new HttpsError('not-found', 'Service not found'))
    }

    const service = serviceSnapshot.data()
    if (service?.active !== true) {
      return persistFailure(new HttpsError('not-found', 'Service not found'))
    }

    const serviceName = typeof service.name === 'string' ? service.name : ''
    const durationMin = service.durationMin
    if (
      !serviceName.trim() ||
      !Number.isInteger(durationMin) ||
      durationMin <= 0 ||
      durationMin > 1440
    ) {
      return persistFailure(
        new HttpsError('failed-precondition', 'Service catalog data is invalid'),
      )
    }

    const profileReference = db.collection('users').doc(uid)
    const profileSnapshot = await transaction.get(profileReference)
    const profile = profileSnapshot.exists ? profileSnapshot.data() : undefined

    if (input.mascotaId !== undefined && input.mascotaId !== null) {
      const mascotaSnapshot = await transaction.get(
        db.collection('mascotas').doc(input.mascotaId),
      )
      const mascota = mascotaSnapshot.exists ? mascotaSnapshot.data() : undefined
      if (!mascotaSnapshot.exists || mascota?.userId !== uid) {
        return persistFailure(
          new HttpsError('permission-denied', 'The pet does not belong to the user'),
        )
      }
    }

    const activeUserReservationsSnapshot = await transaction.get(
      db
        .collection('reservas')
        .where('userId', '==', uid)
        .where('status', 'in', ACTIVE_STATUSES),
    )
    if (activeUserReservationsSnapshot.docs.length >= MAX_ACTIVE_RESERVATIONS) {
      return persistFailure(
        new HttpsError('resource-exhausted', 'Active reservation limit reached'),
      )
    }

    const availabilitySnapshot = await transaction.get(
      db
        .collection('reservas')
        .where('serviceId', '==', input.serviceId)
        .where('date', '==', input.date)
        .where('status', 'in', ACTIVE_STATUSES),
    )
    const existingReservations = normalizedReservations(availabilitySnapshot.docs)
    if (!existingReservations) {
      return persistFailure(
        new HttpsError('failed-precondition', 'Existing reservation data is invalid'),
      )
    }
    const newReservation: AssignmentReservation = {
      id: '',
      serviceId: input.serviceId,
      date: input.date,
      timeSlot: input.timeSlot,
      durationMin,
      status: 'pending',
    }
    if (existingReservations.some((reservation) => reservationsOverlap(reservation, newReservation))) {
      return persistFailure(
        new HttpsError('failed-precondition', 'The requested time slot is unavailable'),
      )
    }

    const reservationReference = db.collection('reservas').doc()
    const reservationData: DocumentData = {
      userId: uid,
      userName: readUserName(profile, request.auth?.token),
      userEmail: readUserEmail(profile, request.auth?.token),
      serviceId: input.serviceId,
      serviceName,
      price: null,
      date: input.date,
      timeSlot: input.timeSlot,
      durationMin,
      notes: input.notes ?? null,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'client',
    }
    if (input.mascotaId !== undefined) reservationData.mascotaId = input.mascotaId

    transaction.set(guardReference, guardData)
    transaction.set(slotGuardReference, {
      serviceId: input.serviceId,
      date: input.date,
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.create(reservationReference, reservationData)

    return {
      ok: true,
      result: {
        reservaId: reservationReference.id,
        date: input.date,
        timeSlot: input.timeSlot,
        status: 'pending',
      },
    }
  })

  if (!outcome.ok) throw outcome.error
  return outcome.result
}

export const createReserva = onCall<CreateReservaInput>(
  { enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' },
  async (request) => createReservaHandler(request, getFirestore(), new Date()),
)
