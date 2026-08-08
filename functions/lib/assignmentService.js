import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getNoCandidateReason, getWeekday, selectFirstEligibleEmployee, } from './assignment.js';
import { activeEmployeesQuery, isAdminUser, normalizeReservation, pendingReservationsForDateQuery, readEmployees, readReservations, reservationsForDateQuery, } from './employeeRepository.js';
export { AssignmentDataOverflowError } from './employeeRepository.js';
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function parseDateInput(value) {
    if (!isRecord(value) || typeof value.date !== 'string' || getWeekday(value.date) === null) {
        throw new HttpsError('invalid-argument', 'Invalid assignment date');
    }
    return { date: value.date };
}
function hasAdminClaim(request) {
    return request.auth?.token?.admin === true;
}
function compareText(left, right) {
    if (left < right)
        return -1;
    if (left > right)
        return 1;
    return 0;
}
function sortReservations(left, right) {
    const timeOrder = compareText(left.timeSlot, right.timeSlot);
    return timeOrder || compareText(left.id, right.id);
}
function sanitizedReason(error) {
    const name = error instanceof Error
        ? error.name
        : typeof error === 'string'
            ? error
            : 'UnknownError';
    return name.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64) || 'UnknownError';
}
function sanitizedReservationId(value) {
    return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);
}
async function assignReservaWithOutcome(db, reservaId) {
    if (!reservaId.trim() || reservaId.includes('/'))
        return { status: 'skipped' };
    return db.runTransaction(async (transaction) => {
        const reservationReference = db.collection('reservas').doc(reservaId);
        const reservationSnapshot = await transaction.get(reservationReference);
        if (!reservationSnapshot.exists)
            return { status: 'skipped' };
        const reservation = normalizeReservation(reservaId, reservationSnapshot.data());
        if (!reservation)
            return { status: 'skipped' };
        if (reservation.status !== 'pending')
            return { status: 'skipped' };
        if (reservation.empleadoId !== null)
            return { status: 'already-assigned' };
        const employeesSnapshot = await transaction.get(activeEmployeesQuery(db));
        const reservationsSnapshot = await transaction.get(reservationsForDateQuery(db, reservation.date));
        const employees = readEmployees(employeesSnapshot);
        const existingReservations = readReservations(reservationsSnapshot).filter((item) => item.id !== reservaId);
        const candidate = selectFirstEligibleEmployee(employees, reservation, existingReservations);
        if (!candidate) {
            return {
                status: 'pending',
                reason: getNoCandidateReason(employees, reservation, existingReservations),
            };
        }
        transaction.update(reservationReference, { empleadoId: candidate.id });
        return { status: 'assigned', employeeId: candidate.id };
    });
}
export async function assignReservaIfNeeded(db, reservaId) {
    const outcome = await assignReservaWithOutcome(db, reservaId);
    return outcome.status === 'assigned' ? outcome.employeeId : null;
}
export async function assignPendingReservasForDateHandler(request, db) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Authentication is required');
    const input = parseDateInput(request.data);
    if (!hasAdminClaim(request) && !(await isAdminUser(db, uid))) {
        throw new HttpsError('permission-denied', 'Admin access is required');
    }
    const pendingReservations = readReservations(await pendingReservationsForDateQuery(db, input.date).get())
        .filter((reservation) => reservation.empleadoId === null)
        .sort(sortReservations);
    const assignedReservationIds = [];
    const pendingReservationIds = [];
    for (const reservation of pendingReservations) {
        const outcome = await assignReservaWithOutcome(db, reservation.id);
        if (outcome.status === 'assigned') {
            assignedReservationIds.push(reservation.id);
        }
        else if (outcome.status === 'pending') {
            pendingReservationIds.push(reservation.id);
        }
    }
    return { assignedReservationIds, pendingReservationIds };
}
export async function onReservaCreatedHandler(event, db) {
    const reservaId = event.params.reservaId;
    if (!event.data)
        return;
    try {
        const outcome = await assignReservaWithOutcome(db, reservaId);
        if (outcome.status === 'pending') {
            console.warn('Reservation assignment pending', {
                reservaId: sanitizedReservationId(reservaId),
                reason: sanitizedReason(outcome.reason),
            });
        }
    }
    catch (error) {
        console.error('Reservation assignment failed', {
            reservaId: sanitizedReservationId(reservaId),
            reason: sanitizedReason(error),
        });
        throw new Error('Reservation assignment failed');
    }
}
export const onReservaCreated = onDocumentCreated({ document: 'reservas/{reservaId}', retry: true }, async (event) => onReservaCreatedHandler(event, getFirestore()));
export const assignPendingReservasForDate = onCall(async (request) => assignPendingReservasForDateHandler(request, getFirestore()));
