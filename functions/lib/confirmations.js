import { Timestamp } from 'firebase-admin/firestore';
import { createResendProvider } from './email/resend.js';
import { canRetry, getRetryDelayMs } from './reminders.js';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_SLOT = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const LOCK_DURATION_MS = 10 * 60 * 1000;
export class ConfirmationStatePersistenceError extends Error {
    constructor(message = 'Confirmation state persistence failed: lease lost') {
        super(message);
        this.name = 'ConfirmationStatePersistenceError';
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isValidIsoDate(value) {
    if (!ISO_DATE.test(value))
        return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()))
        return false;
    const [year, month, day] = value.split('-').map(Number);
    return (parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day);
}
function isValidReservation(value) {
    if (!isRecord(value))
        return false;
    return (typeof value.id === 'string' &&
        Boolean(value.id.trim()) &&
        typeof value.userId === 'string' &&
        Boolean(value.userId.trim()) &&
        value.status === 'pending' &&
        value.createdBy === 'client' &&
        typeof value.userEmail === 'string' &&
        EMAIL_PATTERN.test(value.userEmail) &&
        typeof value.userName === 'string' &&
        Boolean(value.userName.trim()) &&
        typeof value.serviceName === 'string' &&
        Boolean(value.serviceName.trim()) &&
        typeof value.date === 'string' &&
        isValidIsoDate(value.date) &&
        typeof value.timeSlot === 'string' &&
        TIME_SLOT.test(value.timeSlot));
}
function candidateId(value) {
    return isRecord(value) && typeof value.id === 'string' ? value.id.trim() : '';
}
function timestamp(date) {
    return Timestamp.fromDate(date);
}
async function persistConfirmationState(store, id, patch, processingToken) {
    const persisted = await store.updateConfirmation(id, patch, processingToken);
    if (!persisted)
        throw new ConfirmationStatePersistenceError();
}
function lockInput(reservaId, now) {
    const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    return {
        reservaId,
        now,
        lockUntil,
        nowTimestamp: timestamp(now),
        lockUntilTimestamp: timestamp(lockUntil),
    };
}
async function markInvalidReservation(store, reservaId, now) {
    const lockResult = await store.acquireConfirmationLock(lockInput(reservaId, now));
    if (lockResult.status === 'backoff') {
        return { status: 'retry', nextAttemptAt: lockResult.nextAttemptAt.toDate() };
    }
    if (lockResult.status === 'exhausted')
        return { status: 'failed' };
    if (lockResult.status !== 'acquired')
        return { status: 'skipped' };
    const nowTimestamp = timestamp(now);
    await persistConfirmationState(store, reservaId, {
        status: 'failed',
        lastError: 'Invalid confirmation data',
        sentAt: null,
        nextAttemptAt: null,
        processingLockUntil: null,
        processingToken: null,
        updatedAt: nowTimestamp,
    }, lockResult.processingToken);
    return { status: 'failed' };
}
export function confirmationDocId(reservaId) {
    return `confirmation-${encodeURIComponent(reservaId)}`;
}
export async function runConfirmationOrchestration({ store, secret, reservation, now = new Date(), providerFactory = createResendProvider, }) {
    const reservaId = candidateId(reservation);
    if (!reservaId)
        return { status: 'skipped' };
    if (!isValidReservation(reservation)) {
        return markInvalidReservation(store, reservaId, now);
    }
    const lockResult = await store.acquireConfirmationLock(lockInput(reservaId, now));
    if (lockResult.status === 'backoff') {
        return { status: 'retry', nextAttemptAt: lockResult.nextAttemptAt.toDate() };
    }
    if (lockResult.status === 'exhausted')
        return { status: 'failed' };
    if (lockResult.status !== 'acquired')
        return { status: 'skipped' };
    const nowTimestamp = timestamp(now);
    const emailInput = {
        to: reservation.userEmail,
        recipientName: reservation.userName.trim(),
        serviceName: reservation.serviceName.trim(),
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        idempotencyKey: confirmationDocId(reservaId),
    };
    try {
        const provider = providerFactory(secret);
        const delivery = await provider.sendConfirmationEmail(emailInput);
        await persistConfirmationState(store, reservaId, {
            status: 'sent',
            sentAt: nowTimestamp,
            updatedAt: nowTimestamp,
            lastError: null,
            processingLockUntil: null,
            processingToken: null,
            nextAttemptAt: null,
            providerMessageId: delivery.providerMessageId ?? null,
        }, lockResult.processingToken);
        return { status: 'sent' };
    }
    catch (error) {
        const retryable = isRecord(error) && error.retryable === true;
        const shouldRetry = retryable && canRetry(lockResult.attempts);
        const nextAttemptAt = shouldRetry
            ? new Date(now.getTime() + getRetryDelayMs(lockResult.attempts))
            : null;
        await persistConfirmationState(store, reservaId, {
            status: 'failed',
            lastError: retryable
                ? 'Email provider retryable failure'
                : 'Email provider permanent failure',
            updatedAt: nowTimestamp,
            processingLockUntil: null,
            processingToken: null,
            nextAttemptAt: nextAttemptAt ? timestamp(nextAttemptAt) : null,
        }, lockResult.processingToken);
        if (nextAttemptAt)
            return { status: 'retry', nextAttemptAt };
        return { status: 'failed' };
    }
}
