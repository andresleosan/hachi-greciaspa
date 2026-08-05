import type { Timestamp } from 'firebase-admin/firestore'

export interface ReservationForReminder {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  userEmail: string | null
  userName: string | null
  serviceName: string
  date: string
  timeSlot: string
}

export type ReminderStatus = 'pending' | 'sent' | 'failed'

export interface ReminderRecord {
  reservaId: string
  status: ReminderStatus
  attempts: number
  scheduledFor: Timestamp
  sentAt: Timestamp | null
  lastAttemptAt: Timestamp | null
  lastError: string | null
  processingLockUntil: Timestamp | null
  processingToken: string | null
  nextAttemptAt: Timestamp | null
  providerMessageId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ReminderEmailInput {
  to: string
  recipientName: string
  serviceName: string
  date: string
  timeSlot: string
  idempotencyKey: string
}

export interface ConfirmationEmailInput extends ReminderEmailInput {}

export interface EmailProvider {
  sendReminderEmail(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId?: string }>
}

export interface ConfirmationEmailProvider {
  sendConfirmationEmail(
    input: ConfirmationEmailInput,
  ): Promise<{ providerMessageId?: string }>
}

export type TransactionalEmailProvider = EmailProvider & ConfirmationEmailProvider
