import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'

const TIME_ZONE = 'America/Mexico_City'

export interface RescheduleReservaInput {
  reservaId: string
  date: string
  timeSlot: string
}

export interface RescheduleReservaResult {
  reservaId: string
  date: string
  timeSlot: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseInput(value: unknown): RescheduleReservaInput {
  if (!isRecord(value)) throw new HttpsError('invalid-argument', 'Invalid reschedule input')

  const { reservaId, date, timeSlot } = value
  if (
    typeof reservaId !== 'string' ||
    !reservaId.trim() ||
    reservaId.includes('/') ||
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof timeSlot !== 'string' ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeSlot)
  ) {
    throw new HttpsError('invalid-argument', 'Invalid reschedule input')
  }

  const appointment = fromZonedTime(`${date}T${timeSlot}`, TIME_ZONE)
  if (
    Number.isNaN(appointment.getTime()) ||
    formatInTimeZone(appointment, TIME_ZONE, 'yyyy-MM-dd') !== date ||
    formatInTimeZone(appointment, TIME_ZONE, 'HH:mm') !== timeSlot
  ) {
    throw new HttpsError('invalid-argument', 'Invalid reschedule input')
  }

  return { reservaId, date, timeSlot }
}

export async function rescheduleReservaHandler(
  request: CallableRequest<RescheduleReservaInput>,
  db: Firestore,
  now: Date,
): Promise<RescheduleReservaResult> {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required')

  const input = parseInput(request.data)
  const appointment = fromZonedTime(`${input.date}T${input.timeSlot}`, TIME_ZONE)
  if (appointment.getTime() <= now.getTime()) {
    throw new HttpsError('failed-precondition', 'The appointment must be in the future')
  }

  return db.runTransaction(async (transaction) => {
    const reservationReference = db.collection('reservas').doc(input.reservaId)
    const reservationSnapshot = await transaction.get(reservationReference)
    if (!reservationSnapshot.exists) {
      throw new HttpsError('not-found', 'Reservation not found')
    }

    const reservation = reservationSnapshot.data()
    if (reservation?.userId !== uid || reservation.status !== 'pending') {
      throw new HttpsError('permission-denied', 'Reservation cannot be rescheduled')
    }

    const conflicts = await transaction.get(
      db
        .collection('reservas')
        .where('serviceId', '==', reservation.serviceId)
        .where('date', '==', input.date)
        .where('timeSlot', '==', input.timeSlot),
    )

    for (const conflict of conflicts.docs) {
      if (conflict.id !== input.reservaId && conflict.data().status !== 'cancelled') {
        throw new HttpsError('failed-precondition', 'The requested time slot is unavailable')
      }
    }

    transaction.update(reservationReference, {
      date: input.date,
      timeSlot: input.timeSlot,
    })

    return {
      reservaId: input.reservaId,
      date: input.date,
      timeSlot: input.timeSlot,
    }
  })
}

export const rescheduleReserva = onCall<RescheduleReservaInput>(
  async (request) => rescheduleReservaHandler(request, getFirestore(), new Date()),
)
