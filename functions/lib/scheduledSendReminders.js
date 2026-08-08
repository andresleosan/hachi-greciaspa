import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { randomUUID } from 'node:crypto';
import { createResendProvider } from './email/resend.js';
import { canRetry, getAppointmentInstant, getRetryDelayMs, isReminderDue, reminderDocId, } from './reminders.js';
import { formatInTimeZone } from './timeZone.js';
const TIME_ZONE = 'America/Mexico_City';
const LOCK_DURATION_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resendApiKey = defineSecret('RESEND_API_KEY');
export class ReminderStatePersistenceError extends Error {
    constructor(message = 'Reminder state persistence failed: lease lost') {
        super(message);
        this.name = 'ReminderStatePersistenceError';
    }
}
function localDateValues(now) {
    const today = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    const tomorrow = formatInTimeZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    const dayAfterTomorrow = formatInTimeZone(new Date(now.getTime() + 48 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    return [today, tomorrow, dayAfterTomorrow];
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isValidReservation(value) {
    if (!isRecord(value))
        return false;
    if (typeof value.id !== 'string' || !value.id.trim())
        return false;
    if (value.status !== 'confirmed')
        return false;
    if (typeof value.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
        typeof value.timeSlot !== 'string' ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.timeSlot)) {
        return false;
    }
    const appointment = getAppointmentInstant(value.date, value.timeSlot, TIME_ZONE);
    if (Number.isNaN(appointment.getTime()) ||
        formatInTimeZone(appointment, TIME_ZONE, 'yyyy-MM-dd') !== value.date ||
        formatInTimeZone(appointment, TIME_ZONE, 'HH:mm') !== value.timeSlot) {
        return false;
    }
    if (typeof value.serviceName !== 'string' || !value.serviceName.trim())
        return false;
    if (typeof value.userEmail !== 'string' ||
        !value.userEmail.trim() ||
        !EMAIL_PATTERN.test(value.userEmail)) {
        return false;
    }
    return value.userName === undefined || typeof value.userName === 'string' || value.userName === null;
}
function hasConfirmedStatus(value) {
    return isRecord(value) && value.status === 'confirmed';
}
function timestamp(date) {
    return Timestamp.fromDate(date);
}
async function persistReminderState(store, id, patch, processingToken) {
    const persisted = await store.updateReminder(id, patch, processingToken);
    if (!persisted)
        throw new ReminderStatePersistenceError();
}
async function releaseReminderLock(store, reservaId, scheduledFor, now, processingToken, attempts) {
    await persistReminderState(store, reservaId, {
        status: 'pending',
        attempts: Math.max(0, attempts - 1),
        scheduledFor: timestamp(scheduledFor),
        lastAttemptAt: null,
        lastError: null,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: null,
        updatedAt: timestamp(now),
    }, processingToken);
}
async function markFailed(store, reservaId, scheduledFor, now, error, permanent) {
    const nowTimestamp = timestamp(now);
    const lockResult = await store.acquireReminderLock({
        reservaId,
        scheduledFor,
        now,
        lockUntil: new Date(now.getTime() + LOCK_DURATION_MS),
        scheduledForTimestamp: timestamp(scheduledFor),
        nowTimestamp,
        lockUntilTimestamp: timestamp(new Date(now.getTime() + LOCK_DURATION_MS)),
    });
    if (lockResult.status !== 'acquired')
        return;
    const patch = {
        status: 'failed',
        lastError: error,
        updatedAt: nowTimestamp,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: null,
    };
    if (permanent)
        patch.attempts = 3;
    await store.updateReminder(reservaId, patch, lockResult.processingToken);
}
export async function runReminderOrchestration({ store, secret, now = new Date(), providerFactory = createResendProvider, }) {
    if (typeof secret !== 'string' || !secret.trim())
        return;
    const reservations = await store.findConfirmedReservations(localDateValues(now));
    for (const candidate of reservations) {
        if (!hasConfirmedStatus(candidate))
            continue;
        const candidateId = isRecord(candidate) && typeof candidate.id === 'string' ? candidate.id : '';
        if (!candidateId.trim())
            continue;
        if (!isValidReservation(candidate)) {
            await markFailed(store, candidateId, now, now, 'Invalid reminder data', true);
            continue;
        }
        const appointment = getAppointmentInstant(candidate.date, candidate.timeSlot, TIME_ZONE, now);
        if (Number.isNaN(appointment.getTime()) || !isReminderDue(appointment, now))
            continue;
        const nowTimestamp = timestamp(now);
        const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS);
        const lockResult = await store.acquireReminderLock({
            reservaId: candidate.id,
            scheduledFor: appointment,
            now,
            lockUntil,
            scheduledForTimestamp: timestamp(appointment),
            nowTimestamp,
            lockUntilTimestamp: timestamp(lockUntil),
        });
        if (lockResult.status !== 'acquired')
            continue;
        const currentReservation = await store.getConfirmedReservation(candidate.id);
        if (!isValidReservation(currentReservation)) {
            await releaseReminderLock(store, candidate.id, appointment, now, lockResult.processingToken, lockResult.attempts);
            continue;
        }
        const currentAppointment = getAppointmentInstant(currentReservation.date, currentReservation.timeSlot, TIME_ZONE);
        if (Number.isNaN(currentAppointment.getTime()) || !isReminderDue(currentAppointment, now)) {
            await releaseReminderLock(store, candidate.id, currentAppointment, now, lockResult.processingToken, lockResult.attempts);
            continue;
        }
        const emailInput = {
            to: currentReservation.userEmail,
            recipientName: currentReservation.userName?.trim() || 'Cliente',
            serviceName: currentReservation.serviceName.trim(),
            date: currentReservation.date,
            timeSlot: currentReservation.timeSlot,
            idempotencyKey: reminderDocId(currentReservation.id),
        };
        let providerMessageId;
        try {
            const provider = providerFactory(secret);
            const delivery = await provider.sendReminderEmail(emailInput);
            providerMessageId = delivery.providerMessageId ?? null;
        }
        catch (error) {
            const retryable = isRecord(error) && error.retryable === true;
            const patch = {
                status: 'failed',
                lastError: retryable
                    ? 'Email provider retryable failure'
                    : 'Email provider permanent failure',
                updatedAt: nowTimestamp,
                processingLockUntil: null,
                processingToken: null,
                nextAttemptAt: retryable
                    ? timestamp(new Date(now.getTime() + getRetryDelayMs(lockResult.attempts)))
                    : null,
            };
            if (!retryable)
                patch.attempts = 3;
            await persistReminderState(store, currentReservation.id, patch, lockResult.processingToken);
            continue;
        }
        await persistReminderState(store, currentReservation.id, {
            status: 'sent',
            sentAt: nowTimestamp,
            updatedAt: nowTimestamp,
            lastError: null,
            processingLockUntil: null,
            processingToken: null,
            nextAttemptAt: null,
            providerMessageId,
        }, lockResult.processingToken);
    }
}
function firestoreReminderStore(db) {
    return {
        async findConfirmedReservations(dates) {
            const snapshot = await db
                .collection('reservas')
                .where('status', '==', 'confirmed')
                .where('date', 'in', [...dates])
                .get();
            return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
        },
        async getConfirmedReservation(reservaId) {
            const snapshot = await db.collection('reservas').doc(reservaId).get();
            if (!snapshot.exists || snapshot.data()?.status !== 'confirmed')
                return null;
            return { ...snapshot.data(), id: snapshot.id };
        },
        async acquireReminderLock(input) {
            const reference = db.collection('recordatorios').doc(reminderDocId(input.reservaId));
            await db.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(reference);
                if (snapshot.exists)
                    return;
                transaction.create(reference, {
                    reservaId: input.reservaId,
                    status: 'pending',
                    attempts: 0,
                    scheduledFor: input.scheduledForTimestamp,
                    sentAt: null,
                    lastAttemptAt: null,
                    lastError: null,
                    processingLockUntil: null,
                    processingToken: null,
                    nextAttemptAt: null,
                    providerMessageId: null,
                    createdAt: input.nowTimestamp,
                    updatedAt: input.nowTimestamp,
                });
            });
            return db.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(reference);
                const current = snapshot.exists ? snapshot.data() : null;
                const lockUntil = current?.processingLockUntil;
                if (current?.status === 'sent')
                    return { status: 'sent' };
                if (lockUntil instanceof Timestamp && lockUntil.toMillis() > input.now.getTime()) {
                    return { status: 'locked' };
                }
                const nextAttemptAt = current?.nextAttemptAt;
                if (nextAttemptAt instanceof Timestamp && nextAttemptAt.toMillis() > input.now.getTime()) {
                    return { status: 'backoff', nextAttemptAt };
                }
                const attempts = typeof current?.attempts === 'number' ? current.attempts : 0;
                if (!canRetry(attempts))
                    return { status: 'exhausted' };
                const nowTimestamp = input.nowTimestamp;
                const processingToken = randomUUID();
                transaction.set(reference, {
                    reservaId: input.reservaId,
                    status: 'pending',
                    attempts: attempts + 1,
                    scheduledFor: current?.scheduledFor ?? input.scheduledForTimestamp,
                    sentAt: current?.sentAt ?? null,
                    lastAttemptAt: nowTimestamp,
                    lastError: current?.lastError ?? null,
                    processingLockUntil: input.lockUntilTimestamp,
                    processingToken,
                    nextAttemptAt: null,
                    providerMessageId: current?.providerMessageId ?? null,
                    createdAt: current?.createdAt ?? nowTimestamp,
                    updatedAt: nowTimestamp,
                }, { merge: true });
                return { status: 'acquired', processingToken, attempts: attempts + 1 };
            });
        },
        async updateReminder(id, patch, processingToken) {
            return db.runTransaction(async (transaction) => {
                const reference = db.collection('recordatorios').doc(reminderDocId(id));
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists || snapshot.data()?.processingToken !== processingToken) {
                    return false;
                }
                transaction.update(reference, patch);
                return true;
            });
        },
    };
}
export function createFirestoreReminderStore(db = getFirestore()) {
    return firestoreReminderStore(db);
}
export const scheduledSendReminders = onSchedule({
    schedule: '0 * * * *',
    timeZone: TIME_ZONE,
    secrets: [resendApiKey],
}, async () => {
    await runReminderOrchestration({
        store: createFirestoreReminderStore(),
        secret: resendApiKey.value(),
    });
});
