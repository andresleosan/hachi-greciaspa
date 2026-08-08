import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { randomUUID } from 'node:crypto';
import { confirmationDocId, runConfirmationOrchestration, } from './confirmations.js';
import { createResendProvider } from './email/resend.js';
const resendApiKey = defineSecret('RESEND_API_KEY');
function confirmationStore(db) {
    return {
        async acquireConfirmationLock(input) {
            const reference = db.collection('confirmaciones').doc(confirmationDocId(input.reservaId));
            await db.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(reference);
                if (snapshot.exists)
                    return;
                transaction.create(reference, {
                    reservaId: input.reservaId,
                    status: 'pending',
                    attempts: 0,
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
                const current = snapshot.data();
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
                if (attempts >= 3)
                    return { status: 'exhausted' };
                const processingToken = randomUUID();
                transaction.set(reference, {
                    reservaId: input.reservaId,
                    status: 'pending',
                    attempts: attempts + 1,
                    sentAt: current?.sentAt ?? null,
                    lastAttemptAt: input.nowTimestamp,
                    lastError: current?.lastError ?? null,
                    processingLockUntil: input.lockUntilTimestamp,
                    processingToken,
                    nextAttemptAt: null,
                    providerMessageId: current?.providerMessageId ?? null,
                    createdAt: current?.createdAt ?? input.nowTimestamp,
                    updatedAt: input.nowTimestamp,
                }, { merge: true });
                return { status: 'acquired', processingToken, attempts: attempts + 1 };
            });
        },
        async updateConfirmation(id, patch, processingToken) {
            return db.runTransaction(async (transaction) => {
                const reference = db.collection('confirmaciones').doc(confirmationDocId(id));
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
export async function onReservaConfirmationCreatedHandler(event, db, secret, providerFactory = createResendProvider) {
    if (!event.data)
        return;
    const rawReservation = event.data.data();
    const reservation = {
        ...(typeof rawReservation === 'object' && rawReservation !== null ? rawReservation : {}),
        id: event.params.reservaId,
    };
    const result = await runConfirmationOrchestration({
        store: confirmationStore(db),
        secret,
        reservation,
        providerFactory,
    });
    if (result.status === 'retry') {
        throw new Error('Reservation confirmation delivery retry requested');
    }
}
export const onReservaConfirmationCreated = onDocumentCreated({
    document: 'reservas/{reservaId}',
    retry: true,
    secrets: [resendApiKey],
}, async (event) => {
    await onReservaConfirmationCreatedHandler(event, getFirestore(), resendApiKey.value());
});
