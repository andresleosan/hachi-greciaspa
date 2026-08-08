import { firebaseDb, firebaseFunctions } from './firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { mapReservaError } from './reservaErrors'

export class ReservaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReservaError'
  }
}

export interface CreateReservaInput {
  serviceId: string
  date: string
  timeSlot: string
  mascotaId?: string | null
  notes?: string | null
}

export interface CreateReservaResult {
  reservaId: string
  date: string
  timeSlot: string
  status: 'pending'
}

export interface RescheduleReservaInput {
  reservaId: string
  date: string
  timeSlot: string
}

export interface RescheduleReservaResult extends RescheduleReservaInput {}

/**
 * Crea una reserva mediante la callable, que resuelve los datos canónicos
 * y aplica autenticación, disponibilidad y límites server-side.
 */
export async function createReserva(input: CreateReservaInput): Promise<string> {
  const callable = httpsCallable<CreateReservaInput, CreateReservaResult>(
    firebaseFunctions,
    'createReserva',
  )

  try {
    const response = await callable({
      serviceId: input.serviceId,
      date: input.date,
      timeSlot: input.timeSlot,
      mascotaId: input.mascotaId ?? null,
      notes: input.notes ?? null,
    })
    return response.data.reservaId
  } catch (error) {
    throw new ReservaError(mapReservaError(error))
  }
}

/**
 * Cancela una reserva propia. Per ADR-002, la regla firestore.rules permite
 * que el dueño únicamente haga status -> 'cancelled'. Cualquier intento de
 * modificar otros campos será denegado server-side.
 */
export async function cancelMyReserva(reservaId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, 'reservas', reservaId), { status: 'cancelled' })
}

export async function updateAdminReservaStatus(
  reservaId: string,
  status: 'confirmed' | 'cancelled' | 'completed',
): Promise<void> {
  await updateDoc(doc(firebaseDb, 'reservas', reservaId), { status })
}

export async function rescheduleMyReserva(
  reservaId: string,
  date: string,
  timeSlot: string,
): Promise<RescheduleReservaResult> {
  const callable = httpsCallable<RescheduleReservaInput, RescheduleReservaResult>(
    firebaseFunctions,
    'rescheduleReserva',
  )

  try {
    const response = await callable({ reservaId, date, timeSlot })
    return response.data
  } catch (error) {
    throw new ReservaError(mapReservaError(error))
  }
}
