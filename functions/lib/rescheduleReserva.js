import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { isEmployeeEligible, reservationsOverlap } from './assignment.js';
import { bookingSlotGuardId } from './bookingSlotGuard.js';
import { normalizeEmployee, normalizeReservation, readReservations, reservationsForDateQuery, } from './employeeRepository.js';
import { formatInTimeZone, fromZonedTime } from './timeZone.js';
const TIME_ZONE = 'America/Mexico_City';
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function parseInput(value) {
    if (!isRecord(value))
        throw new HttpsError('invalid-argument', 'Invalid reschedule input');
    const { reservaId, date, timeSlot } = value;
    if (typeof reservaId !== 'string' ||
        !reservaId.trim() ||
        reservaId.includes('/') ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        typeof timeSlot !== 'string' ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeSlot)) {
        throw new HttpsError('invalid-argument', 'Invalid reschedule input');
    }
    const appointment = fromZonedTime(`${date}T${timeSlot}`, TIME_ZONE);
    if (Number.isNaN(appointment.getTime()) ||
        formatInTimeZone(appointment, TIME_ZONE, 'yyyy-MM-dd') !== date ||
        formatInTimeZone(appointment, TIME_ZONE, 'HH:mm') !== timeSlot) {
        throw new HttpsError('invalid-argument', 'Invalid reschedule input');
    }
    return { reservaId, date, timeSlot };
}
export async function rescheduleReservaHandler(request, db, now) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Authentication is required');
    const input = parseInput(request.data);
    const appointment = fromZonedTime(`${input.date}T${input.timeSlot}`, TIME_ZONE);
    if (appointment.getTime() <= now.getTime()) {
        throw new HttpsError('failed-precondition', 'The appointment must be in the future');
    }
    return db.runTransaction(async (transaction) => {
        const reservationReference = db.collection('reservas').doc(input.reservaId);
        const reservationSnapshot = await transaction.get(reservationReference);
        if (!reservationSnapshot.exists) {
            throw new HttpsError('not-found', 'Reservation not found');
        }
        const reservation = reservationSnapshot.data();
        if (reservation?.userId !== uid || reservation.status !== 'pending') {
            throw new HttpsError('permission-denied', 'Reservation cannot be rescheduled');
        }
        const slotGuardReference = db
            .collection('bookingSlotGuards')
            .doc(bookingSlotGuardId(reservation.serviceId, input.date));
        await transaction.get(slotGuardReference);
        const conflicts = await transaction.get(db
            .collection('reservas')
            .where('serviceId', '==', reservation.serviceId)
            .where('date', '==', input.date)
            .where('timeSlot', '==', input.timeSlot));
        for (const conflict of conflicts.docs) {
            if (conflict.id !== input.reservaId && conflict.data().status !== 'cancelled') {
                throw new HttpsError('failed-precondition', 'The requested time slot is unavailable');
            }
        }
        const update = {
            date: input.date,
            timeSlot: input.timeSlot,
        };
        const currentEmployeeId = reservation.empleadoId;
        if (currentEmployeeId !== undefined && currentEmployeeId !== null) {
            if (typeof currentEmployeeId !== 'string' ||
                !currentEmployeeId.trim() ||
                currentEmployeeId.includes('/')) {
                update.empleadoId = null;
            }
            else {
                const employeeReference = db.collection('empleados').doc(currentEmployeeId);
                const employeeSnapshot = await transaction.get(employeeReference);
                const employee = employeeSnapshot.exists
                    ? normalizeEmployee(currentEmployeeId, employeeSnapshot.data())
                    : null;
                const rescheduledReservation = normalizeReservation(input.reservaId, {
                    ...reservation,
                    date: input.date,
                    timeSlot: input.timeSlot,
                });
                let employeeIsAvailable = Boolean(employee &&
                    rescheduledReservation &&
                    isEmployeeEligible(employee, rescheduledReservation));
                if (employeeIsAvailable && rescheduledReservation) {
                    const reservationsSnapshot = await transaction.get(reservationsForDateQuery(db, input.date));
                    employeeIsAvailable = !readReservations(reservationsSnapshot).some((existingReservation) => existingReservation.id !== input.reservaId &&
                        existingReservation.empleadoId === currentEmployeeId &&
                        (existingReservation.status === 'pending' || existingReservation.status === 'confirmed') &&
                        reservationsOverlap(existingReservation, rescheduledReservation));
                }
                if (!employeeIsAvailable)
                    update.empleadoId = null;
            }
        }
        transaction.set(slotGuardReference, {
            serviceId: reservation.serviceId,
            date: input.date,
            updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(reservationReference, update);
        return {
            reservaId: input.reservaId,
            date: input.date,
            timeSlot: input.timeSlot,
        };
    });
}
export const rescheduleReserva = onCall(async (request) => rescheduleReservaHandler(request, getFirestore(), new Date()));
