import type { Timestamp } from 'firebase/firestore'

export interface Mascota {
  id?: string
  userId: string
  name: string
  breed: string
  weightKg: number | null
  birthDate: string | null
  notes: string | null
  photoUrl: string | null
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

export type MascotaInput = Pick<Mascota, 'name' | 'breed' | 'weightKg' | 'birthDate' | 'notes' | 'photoUrl'>
