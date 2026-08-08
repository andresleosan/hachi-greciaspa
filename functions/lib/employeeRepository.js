import { getWeekday, parseAssignmentTime } from './assignment.js';
export const MAX_ASSIGNMENT_DOCUMENTS = 1000;
export class AssignmentDataOverflowError extends Error {
    constructor(collection) {
        super(`Assignment data exceeds the ${MAX_ASSIGNMENT_DOCUMENTS}-document limit for ${collection}`);
        this.name = 'AssignmentDataOverflowError';
    }
}
export class AssignmentDataMalformedError extends Error {
    constructor(reservationId) {
        super(`Malformed reservation data: ${reservationId}`);
        this.name = 'AssignmentDataMalformedError';
    }
}
const WEEKDAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];
const SHIFTS = ['morning', 'afternoon', 'full'];
const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isShift(value) {
    return typeof value === 'string' && SHIFTS.includes(value);
}
function normalizeWeeklyShifts(value) {
    if (!isRecord(value))
        return null;
    const weeklyShifts = {};
    for (const weekday of WEEKDAYS) {
        const shift = value[weekday];
        weeklyShifts[weekday] = shift === null || shift === undefined
            ? null
            : isShift(shift)
                ? shift
                : null;
    }
    return weeklyShifts;
}
export function normalizeEmployee(id, value) {
    if (!isRecord(value))
        return null;
    if (typeof value.name !== 'string' || typeof value.active !== 'boolean')
        return null;
    if (!Array.isArray(value.services) || !value.services.every((service) => typeof service === 'string')) {
        return null;
    }
    const weeklyShifts = normalizeWeeklyShifts(value.weeklyShifts);
    if (!weeklyShifts)
        return null;
    return {
        id,
        name: value.name,
        active: value.active,
        services: value.services,
        weeklyShifts,
    };
}
export function normalizeReservation(id, value) {
    if (!isRecord(value))
        return null;
    if (typeof value.serviceId !== 'string' ||
        typeof value.date !== 'string' ||
        getWeekday(value.date) === null ||
        typeof value.timeSlot !== 'string' ||
        parseAssignmentTime(value.timeSlot) === null ||
        typeof value.durationMin !== 'number' ||
        !Number.isInteger(value.durationMin) ||
        value.durationMin <= 0 ||
        !RESERVATION_STATUSES.includes(value.status) ||
        (value.empleadoId !== undefined &&
            value.empleadoId !== null &&
            (typeof value.empleadoId !== 'string' || !value.empleadoId.trim()))) {
        return null;
    }
    return {
        id,
        serviceId: value.serviceId,
        date: value.date,
        timeSlot: value.timeSlot,
        durationMin: value.durationMin,
        status: value.status,
        empleadoId: value.empleadoId === undefined || value.empleadoId === null
            ? null
            : value.empleadoId,
    };
}
export function activeEmployeesQuery(db) {
    return db
        .collection('empleados')
        .where('active', '==', true)
        .limit(MAX_ASSIGNMENT_DOCUMENTS + 1);
}
export function reservationsForDateQuery(db, date) {
    return db
        .collection('reservas')
        .where('date', '==', date)
        .limit(MAX_ASSIGNMENT_DOCUMENTS + 1);
}
export function pendingReservationsForDateQuery(db, date) {
    return db
        .collection('reservas')
        .where('status', '==', 'pending')
        .where('date', '==', date)
        .limit(MAX_ASSIGNMENT_DOCUMENTS + 1);
}
export function readEmployees(snapshot) {
    if (snapshot.docs.length > MAX_ASSIGNMENT_DOCUMENTS) {
        throw new AssignmentDataOverflowError('empleados');
    }
    return snapshot.docs.flatMap((document) => {
        const employee = normalizeEmployee(document.id, document.data());
        return employee?.active ? [employee] : [];
    });
}
export function readReservations(snapshot) {
    if (snapshot.docs.length > MAX_ASSIGNMENT_DOCUMENTS) {
        throw new AssignmentDataOverflowError('reservas');
    }
    return snapshot.docs.map((document) => {
        const reservation = normalizeReservation(document.id, document.data());
        if (!reservation)
            throw new AssignmentDataMalformedError(document.id);
        return reservation;
    });
}
export async function getActiveEmployees(db) {
    return readEmployees(await activeEmployeesQuery(db).get());
}
export async function getReservationsForDate(db, date) {
    return readReservations(await reservationsForDateQuery(db, date).get());
}
export async function getPendingReservationsForDate(db, date) {
    return readReservations(await pendingReservationsForDateQuery(db, date).get());
}
export async function isAdminUser(db, uid) {
    const snapshot = await db.collection('users').doc(uid).get();
    return snapshot.exists && snapshot.data()?.role === 'admin';
}
