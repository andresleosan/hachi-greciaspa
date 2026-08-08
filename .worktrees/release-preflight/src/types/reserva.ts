import type { Timestamp } from 'firebase/firestore'

export type ReservaStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type ReservaCreatedBy = 'client' | 'admin'

export interface Reserva {
  id?: string
  userId: string
  userName: string | null
  userEmail: string | null
  serviceId: string
  empleadoId?: string | null
  serviceName: string
  price: number | null
  date: string
  timeSlot: string
  durationMin: number
  notes: string | null
  status: ReservaStatus
  createdAt: Timestamp | null
  createdBy: ReservaCreatedBy
}

export const RESERVA_STATUS_LABELS: Record<ReservaStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}
