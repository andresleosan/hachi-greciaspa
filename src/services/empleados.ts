import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

import type { Empleado, EmpleadoInput } from '../types'
import { firebaseDb, firebaseFunctions } from './firebase'

export interface AssignPendingReservasInput {
  date: string
}

export interface AssignPendingReservasResult {
  assignedReservationIds: string[]
  pendingReservationIds: string[]
}

export class EmpleadoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmpleadoError'
  }
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined

  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') return undefined
  return code.split('/').pop()
}

function mapCallableError(error: unknown): string {
  switch (errorCode(error)) {
    case 'permission-denied':
      return 'No tenes permisos para administrar empleados.'
    case 'unauthenticated':
      return 'Inicia sesion como administrador.'
    case 'invalid-argument':
      return 'Revisa la fecha seleccionada.'
    default:
      return 'No se pudo completar la asignacion automatica. Intenta nuevamente.'
  }
}

export async function listEmpleados(): Promise<Empleado[]> {
  const snapshot = await getDocs(collection(firebaseDb, 'empleados'))
  return snapshot.docs.map((employee) => ({ ...employee.data(), id: employee.id }) as Empleado)
}

export async function createEmpleado(input: EmpleadoInput): Promise<string> {
  const reference = await addDoc(collection(firebaseDb, 'empleados'), input)
  return reference.id
}

export async function updateEmpleado(empleadoId: string, input: EmpleadoInput): Promise<void> {
  await updateDoc(doc(firebaseDb, 'empleados', empleadoId), input)
}

export async function deactivateEmpleado(empleadoId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, 'empleados', empleadoId), { active: false })
}

export async function assignPendingReservasForDate(
  date: string,
): Promise<AssignPendingReservasResult> {
  const callable = httpsCallable<AssignPendingReservasInput, AssignPendingReservasResult>(
    firebaseFunctions,
    'assignPendingReservasForDate',
  )

  try {
    const response = await callable({ date })
    return response.data
  } catch (error) {
    throw new EmpleadoError(mapCallableError(error))
  }
}
