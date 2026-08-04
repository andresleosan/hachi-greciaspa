import { firebaseDb, firebaseFunctions } from './firebase'
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { Reserva } from '../types'
import { mapReservaError } from './reservaErrors'

export class SlotTakenError extends Error {
  constructor() {
    super('Esa fecha y hora ya está reservada. Elegí otro slot.')
    this.name = 'SlotTakenError'
  }
}

export class ReservaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReservaError'
  }
}

export type NewReservaInput = Pick<
  Reserva,
  | 'userId'
  | 'userName'
  | 'userEmail'
  | 'serviceId'
  | 'serviceName'
  | 'price'
  | 'date'
  | 'timeSlot'
  | 'durationMin'
  | 'notes'
>

export interface RescheduleReservaInput {
  reservaId: string
  date: string
  timeSlot: string
}

export interface RescheduleReservaResult extends RescheduleReservaInput {}

/**
 * ADR-001: validación de doble-booking client-side best-effort.
 *
 * Query de reservas para el mismo serviceId+date+timeSlot. Si hay alguna
 * con status distinto de 'cancelled', lanzamos SlotTakenError.
 * Race condition tolerable a escala del spa (decenas de reservas/semana).
 * Ver docs/adr/ADR-001-validacion-reservas.md.
 *
 * Nota: el filtro por status se hace client-side para mantener la query
 * indexable con un índice simple (serviceId+date+timeSlot) en
 * firestore.indexes.json. Un `where('status','in',['pending','confirmed'])`
 * requeriría un índice adicional más complejo.
 */
async function assertSlotFree(serviceId: string, date: string, timeSlot: string) {
  const q = query(
    collection(firebaseDb, 'reservas'),
    where('serviceId', '==', serviceId),
    where('date', '==', date),
    where('timeSlot', '==', timeSlot)
  )
  const snap = await getDocs(q)
  const taken = snap.docs.some((d) => {
    const data = d.data()
    return data.status !== 'cancelled'
  })
  if (taken) throw new SlotTakenError()
}

/**
 * Crea una reserva en nombre del cliente autenticado.
 * La regla firestore.rules exige que data.userId == auth.uid; illicit
 * cualquier intento de crear reservas para otro usuario será denegado
 * server-side (segunda línea de defensa si esta función se bypassea).
 */
export async function createReserva(input: NewReservaInput): Promise<string> {
  if (!input.userId) throw new ReservaError('Falta uid del cliente.')
  if (!input.serviceId) throw new ReservaError('Falta servicio.')
  if (!input.date) throw new ReservaError('Falta fecha.')
  if (!input.timeSlot) throw new ReservaError('Falta horario.')

  await assertSlotFree(input.serviceId, input.date, input.timeSlot)

  const payload = {
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    price: input.price,
    date: input.date,
    timeSlot: input.timeSlot,
    durationMin: input.durationMin,
    notes: input.notes,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    createdBy: 'client' as const,
  }

  const ref = await addDoc(collection(firebaseDb, 'reservas'), payload)
  return ref.id
}

/**
 * Cancela una reserva propia. Per ADR-002, la regla firestore.rules permite
 * que el dueño únicamente haga status -> 'cancelled'. Cualquier intento de
 * modificar otros campos será denegado server-side.
 */
export async function cancelMyReserva(reservaId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, 'reservas', reservaId), { status: 'cancelled' })
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
