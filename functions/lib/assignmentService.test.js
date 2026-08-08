import { describe, expect, it, vi } from 'vitest';
import { assignPendingReservasForDateHandler, assignReservaIfNeeded, AssignmentDataOverflowError, onReservaCreatedHandler, } from './assignmentService.js';
class FirestoreFake {
    documents = new Map();
    updates = [];
    queries = [];
    transactionCalls = 0;
    conflictOnFirstTransaction = false;
    transactionFailure = null;
    collection(name) {
        return {
            doc: (id) => {
                const reference = {
                    kind: 'document',
                    path: `${name}/${id}`,
                    get: async () => {
                        const data = this.documents.get(`${name}/${id}`);
                        return { exists: Boolean(data), data: () => data };
                    },
                };
                return reference;
            },
            where: (field, _operator, value) => this.createQuery(name, [{ field, value }]),
        };
    }
    createQuery(collection, filters) {
        const query = {
            kind: 'query',
            collection,
            filters,
            where: (field, _operator, value) => this.createQuery(collection, [...filters, { field, value }]),
            limit: (value) => {
                Object.assign(query, { limitValue: value });
                return query;
            },
            get: async () => this.getQuerySnapshot(query),
        };
        return query;
    }
    getQuerySnapshot(query) {
        this.queries.push(query);
        const docs = [...this.documents.entries()]
            .filter(([path, data]) => {
            if (!path.startsWith(`${query.collection}/`))
                return false;
            return query.filters.every(({ field, value }) => {
                const actual = data[field];
                return value === null ? actual === null || actual === undefined : actual === value;
            });
        })
            .slice(0, query.limitValue ?? Number.POSITIVE_INFINITY)
            .map(([path, data]) => ({
            id: path.slice(`${query.collection}/`.length),
            data: () => data,
        }));
        return { docs };
    }
    async runTransaction(callback) {
        this.transactionCalls += 1;
        if (this.transactionFailure)
            throw this.transactionFailure;
        const stagedUpdates = [];
        const transaction = {
            get: async (reference) => {
                if (reference.kind === 'document') {
                    const data = this.documents.get(reference.path);
                    return {
                        exists: Boolean(data),
                        data: () => data,
                    };
                }
                return this.getQuerySnapshot(reference);
            },
            update: (reference, data) => {
                const current = this.documents.get(reference.path);
                if (!current)
                    throw new Error('Missing document');
                stagedUpdates.push({ path: reference.path, data });
            },
        };
        const result = await callback(transaction);
        if (this.conflictOnFirstTransaction && stagedUpdates.length && this.transactionCalls === 1) {
            this.conflictOnFirstTransaction = false;
            const reservation = this.documents.get(stagedUpdates[0].path);
            if (reservation)
                reservation.empleadoId = 'assigned-by-another-worker';
            return this.runTransaction(callback);
        }
        for (const update of stagedUpdates) {
            const current = this.documents.get(update.path);
            if (!current)
                throw new Error('Missing document');
            this.documents.set(update.path, { ...current, ...update.data });
            this.updates.push(update);
        }
        return result;
    }
}
function employee(overrides = {}) {
    return {
        name: 'Ana',
        active: true,
        services: ['service-1'],
        weeklyShifts: {
            monday: 'full',
            tuesday: 'full',
            wednesday: 'full',
            thursday: 'full',
            friday: 'full',
            saturday: 'full',
            sunday: 'full',
        },
        ...overrides,
    };
}
function reservation(overrides = {}) {
    return {
        serviceId: 'service-1',
        date: '2026-08-04',
        timeSlot: '10:00',
        durationMin: 60,
        status: 'pending',
        empleadoId: null,
        ...overrides,
    };
}
function request(data, options = {}) {
    const uid = options.uid ?? 'admin-1';
    return {
        data,
        auth: uid
            ? { uid, token: options.adminClaim ? { admin: true } : {} }
            : undefined,
    };
}
function addEmployee(db, id, overrides = {}) {
    db.documents.set(`empleados/${id}`, employee(overrides));
}
function addReservation(db, id, overrides = {}) {
    db.documents.set(`reservas/${id}`, reservation(overrides));
}
async function expectError(promise, code) {
    await expect(promise).rejects.toMatchObject({ code });
}
describe('assignReservaIfNeeded', () => {
    it('assigns the first eligible employee and updates only empleadoId', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1', { name: 'Ana' });
        addReservation(db, 'reserva-1');
        delete db.documents.get('reservas/reserva-1')?.empleadoId;
        await expect(assignReservaIfNeeded(db, 'reserva-1')).resolves.toBe('employee-1');
        expect(db.updates).toEqual([
            { path: 'reservas/reserva-1', data: { empleadoId: 'employee-1' } },
        ]);
        expect(db.documents.get('reservas/reserva-1')).toMatchObject({
            serviceId: 'service-1',
            status: 'pending',
            empleadoId: 'employee-1',
        });
    });
    it('leaves a pending reservation unchanged when no employee is eligible', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1', { active: false });
        addReservation(db, 'reserva-1', { notes: 'preserve me' });
        await expect(assignReservaIfNeeded(db, 'reserva-1')).resolves.toBeNull();
        expect(db.updates).toEqual([]);
        expect(db.documents.get('reservas/reserva-1')).toMatchObject({
            status: 'pending',
            notes: 'preserve me',
            empleadoId: null,
        });
    });
    it('skips an occupied first candidate and selects the next eligible employee', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1', { name: 'Ana' });
        addEmployee(db, 'employee-2', { name: 'Bea' });
        addReservation(db, 'occupied', { empleadoId: 'employee-1', timeSlot: '10:00' });
        addReservation(db, 'reserva-1', { timeSlot: '10:30' });
        await expect(assignReservaIfNeeded(db, 'reserva-1')).resolves.toBe('employee-2');
    });
    it('uses deterministic employee and reservation ordering', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-2', { name: 'Ana' });
        addEmployee(db, 'employee-1', { name: 'Ana' });
        addReservation(db, 'reserva-z', { timeSlot: '10:00' });
        addReservation(db, 'reserva-a', { timeSlot: '10:00' });
        const result = await assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { adminClaim: true }), db);
        expect(result).toEqual({
            assignedReservationIds: ['reserva-a', 'reserva-z'],
            pendingReservationIds: [],
        });
        expect(db.updates.map((update) => update.path)).toEqual([
            'reservas/reserva-a',
            'reservas/reserva-z',
        ]);
        expect(db.documents.get('reservas/reserva-a')?.empleadoId).toBe('employee-1');
        expect(db.documents.get('reservas/reserva-z')?.empleadoId).toBe('employee-2');
    });
    it('does not change an already-assigned reservation', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-1', { empleadoId: 'existing-employee' });
        await expect(assignReservaIfNeeded(db, 'reserva-1')).resolves.toBeNull();
        expect(db.updates).toEqual([]);
        expect(db.documents.get('reservas/reserva-1')?.empleadoId).toBe('existing-employee');
    });
    it('does not overwrite malformed non-null empleadoId values', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-number', { empleadoId: 42 });
        addReservation(db, 'reserva-blank', { empleadoId: ' ' });
        await expect(assignReservaIfNeeded(db, 'reserva-number')).resolves.toBeNull();
        await expect(assignReservaIfNeeded(db, 'reserva-blank')).resolves.toBeNull();
        expect(db.updates).toEqual([]);
        expect(db.documents.get('reservas/reserva-number')?.empleadoId).toBe(42);
        expect(db.documents.get('reservas/reserva-blank')?.empleadoId).toBe(' ');
    });
    it('fails closed when a malformed active reservation could hide an overlap', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-target');
        addReservation(db, 'malformed-active', {
            empleadoId: 'employee-1',
            timeSlot: 'not-a-time',
        });
        await expect(assignReservaIfNeeded(db, 'reserva-target')).rejects.toMatchObject({ name: 'AssignmentDataMalformedError' });
        expect(db.updates).toEqual([]);
        expect(db.documents.get('reservas/reserva-target')?.empleadoId).toBeNull();
    });
    it('rejects incomplete same-date snapshots instead of risking an overlap miss', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-target');
        for (let index = 0; index < 1000; index += 1) {
            addReservation(db, `reserva-${index}`);
        }
        await expect(assignReservaIfNeeded(db, 'reserva-target')).rejects.toBeInstanceOf(AssignmentDataOverflowError);
        expect(db.updates).toEqual([]);
        expect(db.documents.get('reservas/reserva-target')?.empleadoId).toBeNull();
    });
    it('retries a transaction conflict and omits a reservation assigned by another worker', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-1');
        db.conflictOnFirstTransaction = true;
        const result = await assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { adminClaim: true }), db);
        expect(result).toEqual({ assignedReservationIds: [], pendingReservationIds: [] });
        expect(db.transactionCalls).toBe(2);
        expect(db.documents.get('reservas/reserva-1')?.empleadoId).toBe('assigned-by-another-worker');
    });
});
describe('assignPendingReservasForDateHandler', () => {
    it('accepts an admin custom claim', async () => {
        const db = new FirestoreFake();
        addReservation(db, 'reserva-1');
        await expect(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { adminClaim: true }), db)).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: ['reserva-1'] });
    });
    it('accepts an admin role from the user document', async () => {
        const db = new FirestoreFake();
        db.documents.set('users/admin-1', { role: 'admin' });
        addReservation(db, 'reserva-1');
        await expect(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }), db)).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: ['reserva-1'] });
    });
    it('assigns a legacy reservation with an absent empleadoId', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'legacy-reserva');
        delete db.documents.get('reservas/legacy-reserva')?.empleadoId;
        await expect(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { adminClaim: true }), db)).resolves.toEqual({
            assignedReservationIds: ['legacy-reserva'],
            pendingReservationIds: [],
        });
    });
    it('orders callable work by timeSlot before reservation ID', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addEmployee(db, 'employee-2');
        addReservation(db, 'late', { timeSlot: '18:00' });
        addReservation(db, 'early', { timeSlot: '09:00' });
        await expect(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { adminClaim: true }), db)).resolves.toEqual({
            assignedReservationIds: ['early', 'late'],
            pendingReservationIds: [],
        });
        expect(db.updates.map((update) => update.path)).toEqual([
            'reservas/early',
            'reservas/late',
        ]);
    });
    it('rejects unauthenticated and non-admin requests', async () => {
        const db = new FirestoreFake();
        await expectError(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { uid: '' }), db), 'unauthenticated');
        await expectError(assignPendingReservasForDateHandler(request({ date: '2026-08-04' }, { uid: 'client-1' }), db), 'permission-denied');
    });
    it('rejects an invalid calendar date', async () => {
        const db = new FirestoreFake();
        await expectError(assignPendingReservasForDateHandler(request({ date: '2026-02-30' }, { adminClaim: true }), db), 'invalid-argument');
    });
    it('returns no additional changes when retrying after assignment', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1');
        addReservation(db, 'reserva-1');
        const adminRequest = request({ date: '2026-08-04' }, { adminClaim: true });
        await expect(assignPendingReservasForDateHandler(adminRequest, db)).resolves.toEqual({
            assignedReservationIds: ['reserva-1'],
            pendingReservationIds: [],
        });
        const updateCount = db.updates.length;
        await expect(assignPendingReservasForDateHandler(adminRequest, db)).resolves.toEqual({ assignedReservationIds: [], pendingReservationIds: [] });
        expect(db.updates).toHaveLength(updateCount);
    });
    it('logs a sanitized trigger failure, preserves the reservation, and rethrows generically', async () => {
        const db = new FirestoreFake();
        addReservation(db, 'reserva?1', { notes: 'preserve me' });
        db.transactionFailure = new Error('secret firestore internals');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await expect(onReservaCreatedHandler({ params: { reservaId: 'reserva?1' }, data: {} }, db)).rejects.toThrow('Reservation assignment failed');
        expect(errorSpy).toHaveBeenCalledWith('Reservation assignment failed', {
            reservaId: 'reserva_1',
            reason: 'Error',
        });
        expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('secret firestore internals');
        expect(db.documents.get('reservas/reserva?1')).toMatchObject({
            status: 'pending',
            notes: 'preserve me',
            empleadoId: null,
        });
        errorSpy.mockRestore();
    });
    it('logs a sanitized operational reason when no employee is eligible', async () => {
        const db = new FirestoreFake();
        addEmployee(db, 'employee-1', { active: false });
        addReservation(db, 'reserva-1', { userEmail: 'customer-secret@example.com' });
        const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(onReservaCreatedHandler({ params: { reservaId: 'reserva-1' }, data: {} }, db)).resolves.toBeUndefined();
        expect(warningSpy).toHaveBeenCalledWith('Reservation assignment pending', {
            reservaId: 'reserva-1',
            reason: 'no-eligible-service',
        });
        expect(warningSpy.mock.calls.flat().join(' ')).not.toContain('customer-secret@example.com');
        expect(db.documents.get('reservas/reserva-1')).toMatchObject({
            status: 'pending',
            empleadoId: null,
        });
        warningSpy.mockRestore();
    });
});
