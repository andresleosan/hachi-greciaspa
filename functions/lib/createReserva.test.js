import { describe, expect, it } from 'vitest';
import { createReservaHandler, parseCreateReservaInput, } from './createReserva.js';
import { rescheduleReservaHandler, } from './rescheduleReserva.js';
const validInput = {
    serviceId: 'service-1',
    date: '2026-08-10',
    timeSlot: '12:30',
};
const NOW = new Date('2026-08-07T16:00:00.000Z');
class TransactionConflictError extends Error {
    constructor() {
        super('Transaction conflict');
        this.name = 'TransactionConflictError';
    }
}
class TransactionFirestoreFake {
    documents = new Map();
    created = [];
    sets = [];
    updates = [];
    queries = [];
    transactionCalls = 0;
    beforeCommit;
    nextReservationId = 1;
    versions = new Map();
    collection(name) {
        return {
            doc: (id) => {
                const resolvedId = id ?? `reservation-${this.nextReservationId++}`;
                return { kind: 'document', id: resolvedId, path: `${name}/${resolvedId}` };
            },
            where: (field, operator, value) => this.query(name, [{ field, operator, value }]),
        };
    }
    query(collection, filters) {
        return {
            kind: 'query',
            collection,
            filters,
            where: (field, operator, value) => this.query(collection, [...filters, { field, operator, value }]),
        };
    }
    seed(path, data) {
        this.documents.set(path, { ...data });
        this.versions.set(path, (this.versions.get(path) ?? 0) + 1);
    }
    async runTransaction(callback) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            this.transactionCalls += 1;
            const readVersions = new Map();
            const stagedWrites = [];
            const readDocument = (path) => {
                if (!readVersions.has(path)) {
                    readVersions.set(path, this.versions.get(path) ?? 0);
                }
                return this.documents.get(path);
            };
            const transaction = {
                get: async (reference) => {
                    if (reference.kind === 'document') {
                        const data = readDocument(reference.path);
                        return {
                            exists: Boolean(data),
                            data: () => data,
                        };
                    }
                    this.queries.push(reference.filters);
                    const docs = [...this.documents.entries()]
                        .filter(([path, data]) => {
                        if (!path.startsWith(`${reference.collection}/`))
                            return false;
                        return reference.filters.every(({ field, operator, value }) => {
                            if (operator === 'in') {
                                return Array.isArray(value) && value.includes(data[field]);
                            }
                            return data[field] === value;
                        });
                    })
                        .map(([path, data]) => {
                        readDocument(path);
                        return {
                            id: path.slice(`${reference.collection}/`.length),
                            data: () => data,
                        };
                    });
                    return { docs };
                },
                set: (reference, data) => {
                    stagedWrites.push({ kind: 'set', path: reference.path, data: { ...data } });
                },
                create: (reference, data) => {
                    stagedWrites.push({ kind: 'create', path: reference.path, data: { ...data } });
                },
                update: (reference, data) => {
                    stagedWrites.push({ kind: 'update', path: reference.path, data: { ...data } });
                },
            };
            try {
                const result = await callback(transaction);
                if (this.beforeCommit)
                    await this.beforeCommit();
                for (const [path, version] of readVersions) {
                    if ((this.versions.get(path) ?? 0) !== version) {
                        throw new TransactionConflictError();
                    }
                }
                for (const write of stagedWrites) {
                    if (write.kind === 'create' && this.documents.has(write.path)) {
                        throw new Error('Document already exists');
                    }
                }
                for (const write of stagedWrites) {
                    const current = this.documents.get(write.path);
                    this.documents.set(write.path, write.kind === 'update' ? { ...current, ...write.data } : { ...write.data });
                    this.versions.set(write.path, (this.versions.get(write.path) ?? 0) + 1);
                    if (write.kind === 'create') {
                        this.created.push({ path: write.path, data: write.data });
                    }
                    else if (write.kind === 'set') {
                        this.sets.push({ path: write.path, data: write.data });
                    }
                    else {
                        this.updates.push({ path: write.path, data: write.data });
                    }
                }
                return result;
            }
            catch (error) {
                if (!(error instanceof TransactionConflictError) || attempt === 4)
                    throw error;
            }
        }
        throw new Error('Transaction retry limit exceeded');
    }
}
describe('TransactionFirestoreFake', () => {
    it('preserves the first version observed when a document is read twice', async () => {
        const firestore = new TransactionFirestoreFake();
        const sharedReference = firestore.collection('locks').doc('shared');
        const outputReference = firestore.collection('outputs').doc('retry');
        firestore.seed(sharedReference.path, { version: 1 });
        let attempts = 0;
        await expect(firestore.runTransaction(async (transaction) => {
            const directTransaction = transaction;
            attempts += 1;
            await directTransaction.get(sharedReference);
            if (attempts === 1)
                firestore.seed(sharedReference.path, { version: 2 });
            await directTransaction.get(sharedReference);
            directTransaction.set(outputReference, { attempt: attempts });
            return attempts;
        })).resolves.toBe(2);
        expect(firestore.documents.get(outputReference.path)).toEqual({ attempt: 2 });
        expect(firestore.sets).toEqual([
            { path: outputReference.path, data: { attempt: 2 } },
        ]);
    });
    it('discards staged writes from a transaction attempt that loses a conflict', async () => {
        const firestore = new TransactionFirestoreFake();
        const sharedReference = firestore.collection('locks').doc('shared');
        firestore.seed(sharedReference.path, { version: 1 });
        let firstAttemptReady;
        const firstAttemptReadyPromise = new Promise((resolve) => {
            firstAttemptReady = resolve;
        });
        let releaseFirstAttempt;
        const releaseFirstAttemptPromise = new Promise((resolve) => {
            releaseFirstAttempt = resolve;
        });
        let attempts = 0;
        const losingTransaction = firestore.runTransaction(async (transaction) => {
            const directTransaction = transaction;
            attempts += 1;
            await directTransaction.get(sharedReference);
            const setReference = firestore.collection('sets').doc(`attempt-${attempts}`);
            const createReference = firestore.collection('creates').doc(`attempt-${attempts}`);
            directTransaction.set(setReference, { attempt: attempts });
            directTransaction.create(createReference, { attempt: attempts });
            if (attempts === 1) {
                firstAttemptReady();
                await releaseFirstAttemptPromise;
            }
            return attempts;
        });
        await firstAttemptReadyPromise;
        await firestore.runTransaction(async (transaction) => {
            const directTransaction = transaction;
            await directTransaction.get(sharedReference);
            directTransaction.set(sharedReference, { version: 2 });
        });
        releaseFirstAttempt();
        await expect(losingTransaction).resolves.toBe(2);
        expect(firestore.documents.has('sets/attempt-1')).toBe(false);
        expect(firestore.documents.has('creates/attempt-1')).toBe(false);
        expect(firestore.created.some(({ path }) => path === 'creates/attempt-1')).toBe(false);
        expect(firestore.sets.some(({ path }) => path === 'sets/attempt-1')).toBe(false);
        expect(firestore.documents.get('sets/attempt-2')).toEqual({ attempt: 2 });
        expect(firestore.documents.get('creates/attempt-2')).toEqual({ attempt: 2 });
    });
});
function request(data, uid = 'user-1', token = { email: 'token@example.com', name: 'Token Name' }) {
    return {
        data,
        auth: uid ? { uid, token } : undefined,
    };
}
function rescheduleRequest(data, uid = 'user-2') {
    return request(data, uid);
}
function readyFirestore() {
    const firestore = new TransactionFirestoreFake();
    firestore.seed('servicios/service-1', {
        name: 'Spa Day',
        active: true,
        durationMin: 90,
    });
    firestore.seed('users/user-1', {
        displayName: 'Profile Name',
        email: 'profile@example.com',
    });
    firestore.seed('mascotas/pet-1', {
        userId: 'user-1',
        name: 'Hachi',
    });
    return firestore;
}
function seedReservation(firestore, id, overrides = {}) {
    firestore.seed(`reservas/${id}`, {
        userId: 'user-1',
        serviceId: 'service-1',
        serviceName: 'Spa Day',
        date: '2026-08-10',
        timeSlot: '12:30',
        durationMin: 90,
        status: 'pending',
        ...overrides,
    });
}
function expectBookingGuard(firestore, attempts, windowStartedAt) {
    const guard = firestore.documents.get('bookingGuards/user-1');
    expect(guard).toMatchObject({
        uid: 'user-1',
        windowStartedAt,
        attempts,
    });
    expect(guard?.updatedAt).toBeDefined();
}
function expectInvalid(value) {
    const result = parseCreateReservaInput(value);
    expect(result.ok).toBe(false);
    if (result.ok)
        throw new Error('Expected invalid input');
    expect(result.error.code).toBe('invalid-argument');
}
describe('parseCreateReservaInput', () => {
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['a non-object value', 'input'],
        ['a non-string serviceId', { ...validInput, serviceId: 1 }],
        ['a non-string date', { ...validInput, date: 20260810 }],
        ['a non-string timeSlot', { ...validInput, timeSlot: 1230 }],
        ['a non-string mascotaId', { ...validInput, mascotaId: 7 }],
        ['a non-string notes', { ...validInput, notes: 7 }],
    ])('rejects %s', (_description, value) => {
        expectInvalid(value);
    });
    it.each([
        ['userId', { userId: 'user-1' }],
        ['userName', { userName: 'Ada' }],
        ['userEmail', { userEmail: 'ada@example.com' }],
        ['price', { price: 100 }],
        ['durationMin', { durationMin: 60 }],
        ['status', { status: 'pending' }],
        ['createdBy', { createdBy: 'client' }],
        ['empleadoId', { empleadoId: 'employee-1' }],
    ])('rejects the unknown %s field', (_field, extraField) => {
        expectInvalid({ ...validInput, ...extraField });
    });
    it('rejects an empty serviceId', () => {
        expectInvalid({ ...validInput, serviceId: '   ' });
    });
    it('rejects an invalid calendar date', () => {
        expectInvalid({ ...validInput, date: '2026-02-30' });
    });
    it('rejects an invalid time slot', () => {
        expectInvalid({ ...validInput, timeSlot: '25:00' });
    });
    it('rejects notes longer than 1000 characters', () => {
        expectInvalid({ ...validInput, notes: 'x'.repeat(1001) });
    });
    it('rejects a mascotaId containing a slash', () => {
        expectInvalid({ ...validInput, mascotaId: 'mascotas/pet-1' });
    });
    it('accepts non-empty IDs without an arbitrary length limit', () => {
        const result = parseCreateReservaInput({
            ...validInput,
            serviceId: 's'.repeat(129),
            mascotaId: 'p'.repeat(129),
        });
        expect(result).toEqual({
            ok: true,
            input: {
                ...validInput,
                serviceId: 's'.repeat(129),
                mascotaId: 'p'.repeat(129),
            },
        });
    });
    it('preserves null optional fields', () => {
        const result = parseCreateReservaInput({ ...validInput, mascotaId: null, notes: null });
        expect(result).toEqual({
            ok: true,
            input: { ...validInput, mascotaId: null, notes: null },
        });
    });
    it('normalizes surrounding spaces in accepted fields', () => {
        const result = parseCreateReservaInput({
            serviceId: ' service-1 ',
            date: ' 2026-08-10 ',
            timeSlot: ' 12:30 ',
            mascotaId: 'pet-1',
            notes: ' local QA ',
        });
        expect(result).toEqual({
            ok: true,
            input: {
                serviceId: 'service-1',
                date: '2026-08-10',
                timeSlot: '12:30',
                mascotaId: 'pet-1',
                notes: 'local QA',
            },
        });
    });
});
describe('createReservaHandler authentication and catalog', () => {
    it('rejects unauthenticated requests before opening a transaction', async () => {
        const firestore = new TransactionFirestoreFake();
        await expect(createReservaHandler(request(validInput, ''), firestore, NOW)).rejects.toMatchObject({ code: 'unauthenticated' });
        expect(firestore.transactionCalls).toBe(0);
        expect(firestore.created).toHaveLength(0);
    });
    it('consumes an attempt but does not create a reservation when the service is missing', async () => {
        const firestore = new TransactionFirestoreFake();
        await expect(createReservaHandler(request(validInput), firestore, NOW)).rejects.toMatchObject({ code: 'not-found' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('rejects an inactive service without creating a reservation', async () => {
        const firestore = readyFirestore();
        firestore.seed('servicios/service-1', {
            name: 'Spa Day',
            active: false,
            durationMin: 90,
        });
        await expect(createReservaHandler(request(validInput), firestore, NOW)).rejects.toMatchObject({ code: 'not-found' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
});
describe('createReservaHandler canonical snapshot', () => {
    it('creates a canonical snapshot from auth, profile, pet, and active catalog data', async () => {
        const firestore = readyFirestore();
        await expect(createReservaHandler(request({ ...validInput, mascotaId: 'pet-1', notes: ' Leave by noon ' }), firestore, NOW)).resolves.toEqual({
            reservaId: 'reservation-1',
            date: '2026-08-10',
            timeSlot: '12:30',
            status: 'pending',
        });
        const created = firestore.created[0]?.data;
        expect(created).toMatchObject({
            userId: 'user-1',
            userEmail: 'token@example.com',
            userName: 'Profile Name',
            serviceId: 'service-1',
            serviceName: 'Spa Day',
            durationMin: 90,
            price: null,
            date: '2026-08-10',
            timeSlot: '12:30',
            mascotaId: 'pet-1',
            notes: 'Leave by noon',
            status: 'pending',
            createdBy: 'client',
        });
        expect(created).not.toHaveProperty('empleadoId');
        expect(created?.createdAt).toBeDefined();
        expect(created?.createdAt).not.toBe(NOW);
        expectBookingGuard(firestore, 1, NOW);
        expect(firestore.documents.get('bookingSlotGuards/service-1__2026-08-10')).toMatchObject({
            serviceId: 'service-1',
            date: '2026-08-10',
        });
    });
});
describe('createReservaHandler ownership and quota', () => {
    it('rejects a pet owned by another user and persists the consumed attempt', async () => {
        const firestore = readyFirestore();
        firestore.seed('mascotas/pet-foreign', { userId: 'other-user', name: 'Grecia' });
        await expect(createReservaHandler(request({ ...validInput, mascotaId: 'pet-foreign' }), firestore, NOW)).rejects.toMatchObject({ code: 'permission-denied' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('returns resource-exhausted on the fourth attempt without creating a reservation', async () => {
        const firestore = readyFirestore();
        firestore.seed('bookingGuards/user-1', { windowStartedAt: NOW, attempts: 3 });
        await expect(createReservaHandler(request(validInput), firestore, NOW)).rejects.toMatchObject({ code: 'resource-exhausted' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 3, NOW);
    });
    it('persists an attempt when the input is invalid', async () => {
        const firestore = readyFirestore();
        await expect(createReservaHandler(request({ ...validInput, date: '2026-02-30' }), firestore, NOW)).rejects.toMatchObject({ code: 'invalid-argument' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('resets the quota after fifteen minutes', async () => {
        const firestore = readyFirestore();
        firestore.seed('bookingGuards/user-1', {
            windowStartedAt: NOW,
            attempts: 3,
        });
        await expect(createReservaHandler(request(validInput), firestore, new Date(NOW.getTime() + 15 * 60 * 1000))).resolves.toMatchObject({ status: 'pending' });
        expectBookingGuard(firestore, 1, new Date(NOW.getTime() + 15 * 60 * 1000));
        expect(firestore.created).toHaveLength(1);
    });
    it('rejects the eleventh active reservation and still persists the attempt', async () => {
        const firestore = readyFirestore();
        for (let index = 0; index < 10; index += 1) {
            seedReservation(firestore, `active-${index}`, {
                date: `2026-08-${String(11 + index).padStart(2, '0')}`,
                status: index % 2 === 0 ? 'pending' : 'confirmed',
            });
        }
        await expect(createReservaHandler(request(validInput), firestore, NOW)).rejects.toMatchObject({ code: 'resource-exhausted' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('does not count cancelled or completed reservations toward the active limit', async () => {
        const firestore = readyFirestore();
        for (let index = 0; index < 10; index += 1) {
            seedReservation(firestore, `inactive-${index}`, {
                date: `2026-08-${String(11 + index).padStart(2, '0')}`,
                status: index % 2 === 0 ? 'cancelled' : 'completed',
            });
        }
        await expect(createReservaHandler(request(validInput), firestore, NOW)).resolves.toMatchObject({ status: 'pending' });
        expect(firestore.created).toHaveLength(1);
        expectBookingGuard(firestore, 1, NOW);
    });
});
describe('createReservaHandler availability and concurrency', () => {
    it('rejects an active overlapping reservation for the same service and date', async () => {
        const firestore = readyFirestore();
        seedReservation(firestore, 'conflict-1');
        await expect(createReservaHandler(request({ ...validInput, timeSlot: '13:30' }), firestore, NOW)).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('fails closed when an active availability snapshot is malformed', async () => {
        const firestore = readyFirestore();
        seedReservation(firestore, 'malformed-1', { durationMin: 'ninety' });
        await expect(createReservaHandler(request(validInput), firestore, NOW)).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('allows a slot that starts after the existing interval ends', async () => {
        const firestore = readyFirestore();
        seedReservation(firestore, 'finished-1', {
            timeSlot: '10:00',
            durationMin: 60,
        });
        await expect(createReservaHandler(request(validInput), firestore, NOW)).resolves.toMatchObject({ status: 'pending' });
        expect(firestore.created).toHaveLength(1);
    });
    it('uses the active-user and active-service/date query filters', async () => {
        const firestore = readyFirestore();
        await createReservaHandler(request(validInput), firestore, NOW);
        expect(firestore.queries).toEqual([
            [
                { field: 'userId', operator: '==', value: 'user-1' },
                { field: 'status', operator: 'in', value: ['pending', 'confirmed'] },
            ],
            [
                { field: 'serviceId', operator: '==', value: 'service-1' },
                { field: 'date', operator: '==', value: '2026-08-10' },
                { field: 'status', operator: 'in', value: ['pending', 'confirmed'] },
            ],
        ]);
    });
    it('rejects a same-day slot that is already in the past in Mexico City', async () => {
        const firestore = readyFirestore();
        await expect(createReservaHandler(request({ ...validInput, date: '2026-08-07', timeSlot: '09:59' }), firestore, NOW)).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(firestore.created).toHaveLength(0);
        expectBookingGuard(firestore, 1, NOW);
    });
    it('serializes concurrent attempts for the same user and slot', async () => {
        const firestore = readyFirestore();
        const first = createReservaHandler(request(validInput), firestore, NOW);
        const second = createReservaHandler(request(validInput), firestore, NOW);
        const results = await Promise.allSettled([first, second]);
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        const rejected = results.find((result) => result.status === 'rejected');
        expect(rejected).toMatchObject({
            status: 'rejected',
            reason: { code: 'failed-precondition' },
        });
        expect(firestore.created).toHaveLength(1);
        expectBookingGuard(firestore, 2, NOW);
    });
    it('serializes overlapping attempts from different users for the same service and date', async () => {
        const firestore = readyFirestore();
        const first = createReservaHandler(request(validInput, 'user-1'), firestore, NOW);
        const second = createReservaHandler(request(validInput, 'user-2', { email: 'second@example.com', name: 'Second User' }), firestore, NOW);
        const results = await Promise.allSettled([first, second]);
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect(results.find((result) => result.status === 'rejected')).toMatchObject({
            status: 'rejected',
            reason: { code: 'failed-precondition' },
        });
        expect(firestore.created).toHaveLength(1);
        expect(firestore.documents.get('bookingSlotGuards/service-1__2026-08-10')).toMatchObject({
            serviceId: 'service-1',
            date: '2026-08-10',
        });
    });
    it('serializes a create and reschedule overlap for different users', async () => {
        const firestore = readyFirestore();
        firestore.seed('reservas/reschedule-1', {
            userId: 'user-2',
            serviceId: 'service-1',
            date: '2026-08-09',
            timeSlot: '10:00',
            durationMin: 90,
            status: 'pending',
        });
        let arrivals = 0;
        let release;
        const bothTransactionsReady = new Promise((resolve) => {
            release = resolve;
        });
        firestore.beforeCommit = async () => {
            arrivals += 1;
            if (arrivals === 2)
                release();
            if (arrivals <= 2)
                await bothTransactionsReady;
        };
        const first = createReservaHandler(request(validInput, 'user-1'), firestore, NOW);
        const second = rescheduleReservaHandler(rescheduleRequest({
            reservaId: 'reschedule-1',
            date: validInput.date,
            timeSlot: validInput.timeSlot,
        }), firestore, NOW);
        const results = await Promise.allSettled([first, second]);
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect(results.find((result) => result.status === 'rejected')).toMatchObject({
            status: 'rejected',
            reason: { code: 'failed-precondition' },
        });
        expect([...firestore.documents.values()].filter((document) => document.serviceId === 'service-1' &&
            document.date === '2026-08-10' &&
            (document.status === 'pending' || document.status === 'confirmed'))).toHaveLength(1);
    });
});
