import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firebaseDb } from './firebase'
import type { Mascota, MascotaInput, Reserva } from '../types'

export class MascotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MascotaError'
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function optionalText(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function assertDate(value: string | null): void {
  if (value === null) return
  if (!DATE_PATTERN.test(value)) throw new MascotaError('La fecha de nacimiento no es válida.')
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new MascotaError('La fecha de nacimiento no es válida.')
  }
}

export function normalizeMascotaInput(input: MascotaInput): MascotaInput {
  const name = input.name.trim()
  const breed = input.breed.trim()
  const birthDate = optionalText(input.birthDate)
  const notes = optionalText(input.notes)
  const photoUrl = optionalText(input.photoUrl)

  if (!name || name.length > 80) throw new MascotaError('El nombre debe tener entre 1 y 80 caracteres.')
  if (breed.length > 80) throw new MascotaError('La raza no puede superar 80 caracteres.')
  if (input.weightKg !== null && (!Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > 150)) {
    throw new MascotaError('El peso debe estar entre 0 y 150 kg.')
  }
  if (notes && notes.length > 500) throw new MascotaError('Las notas no pueden superar 500 caracteres.')
  if (photoUrl && photoUrl.length > 500) throw new MascotaError('La URL de foto no puede superar 500 caracteres.')
  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) throw new MascotaError('La URL de foto debe comenzar con http:// o https://.')
  assertDate(birthDate)

  return { name, breed, weightKg: input.weightKg ?? null, birthDate, notes, photoUrl }
}

function assertUserId(userId: string): void {
  if (!userId.trim()) throw new MascotaError('Falta el usuario de la mascota.')
}

function mapMascota(id: string, data: Record<string, unknown>): Mascota {
  return {
    id,
    userId: String(data.userId ?? ''),
    name: String(data.name ?? ''),
    breed: String(data.breed ?? ''),
    weightKg: typeof data.weightKg === 'number' ? data.weightKg : null,
    birthDate: typeof data.birthDate === 'string' ? data.birthDate : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    createdAt: (data.createdAt as Mascota['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Mascota['updatedAt']) ?? null,
  }
}

export async function listMyMascotas(userId: string): Promise<Mascota[]> {
  assertUserId(userId)
  const snapshot = await getDocs(query(collection(firebaseDb, 'mascotas'), where('userId', '==', userId)))
  return snapshot.docs
    .map((item) => mapMascota(item.id, item.data() as Record<string, unknown>))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
}

export async function createMascota(userId: string, input: MascotaInput): Promise<string> {
  assertUserId(userId)
  const data = normalizeMascotaInput(input)
  const result = await addDoc(collection(firebaseDb, 'mascotas'), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return result.id
}

export async function updateMascota(userId: string, mascotaId: string, input: MascotaInput): Promise<void> {
  assertUserId(userId)
  if (!mascotaId.trim()) throw new MascotaError('Falta la mascota.')
  const data = normalizeMascotaInput(input)
  await updateDoc(doc(firebaseDb, 'mascotas', mascotaId), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteMascota(userId: string, mascotaId: string): Promise<void> {
  assertUserId(userId)
  if (!mascotaId.trim()) throw new MascotaError('Falta la mascota.')
  await deleteDoc(doc(firebaseDb, 'mascotas', mascotaId))
}

export async function listMyMascotaHistory(userId: string, mascotaId: string): Promise<Reserva[]> {
  assertUserId(userId)
  if (!mascotaId.trim()) throw new MascotaError('Falta la mascota.')
  const snapshot = await getDocs(query(
    collection(firebaseDb, 'reservas'),
    where('userId', '==', userId),
    where('mascotaId', '==', mascotaId),
  ))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Reserva)
    .sort((left, right) => `${right.date} ${right.timeSlot}`.localeCompare(`${left.date} ${left.timeSlot}`))
}
