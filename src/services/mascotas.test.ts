import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  db: { name: 'firestore' },
}))

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  deleteDoc: mocks.deleteDoc,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
  where: mocks.where,
}))

vi.mock('./firebase', () => ({ firebaseDb: mocks.db }))

import {
  createMascota,
  deleteMascota,
  listMyMascotaHistory,
  listMyMascotas,
  MascotaError,
  normalizeMascotaInput,
  updateMascota,
} from './mascotas'

const input = { name: 'Hachi', breed: 'Yorkshire', weightKg: 4.2, birthDate: null, notes: 'Tranquilo', photoUrl: null }

describe('mascotas service validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.collection.mockReturnValue('mascotas-collection')
    mocks.query.mockReturnValue('mascotas-query')
    mocks.where.mockImplementation((...args) => args)
    mocks.doc.mockReturnValue('mascota-doc')
    mocks.serverTimestamp.mockReturnValue('timestamp')
  })

  it('trims text fields and normalizes optional blanks to null', () => {
    expect(normalizeMascotaInput({
      name: ' Hachi ',
      breed: ' Yorkshire ',
      weightKg: 4.2,
      birthDate: '',
      notes: '  Tranquilo  ',
      photoUrl: '  ',
    })).toEqual({
      name: 'Hachi',
      breed: 'Yorkshire',
      weightKg: 4.2,
      birthDate: null,
      notes: 'Tranquilo',
      photoUrl: null,
    })
  })

  it('rejects invalid name, weight and date input', () => {
    expect(() => normalizeMascotaInput({ name: ' ', breed: '', weightKg: 2, birthDate: null, notes: null, photoUrl: null })).toThrow(MascotaError)
    expect(() => normalizeMascotaInput({ name: 'Hachi', breed: '', weightKg: -1, birthDate: null, notes: null, photoUrl: null })).toThrow('peso')
    expect(() => normalizeMascotaInput({ name: 'Hachi', breed: '', weightKg: null, birthDate: '2024-99-99', notes: null, photoUrl: null })).toThrow('fecha')
  })

  it('rejects oversized notes and photo URLs', () => {
    expect(() => normalizeMascotaInput({ name: 'Hachi', breed: '', weightKg: null, birthDate: null, notes: 'x'.repeat(501), photoUrl: null })).toThrow('notas')
    expect(() => normalizeMascotaInput({ name: 'Hachi', breed: '', weightKg: null, birthDate: null, notes: null, photoUrl: 'x'.repeat(501) })).toThrow('foto')
    expect(() => normalizeMascotaInput({ name: 'Hachi', breed: '', weightKg: null, birthDate: null, notes: null, photoUrl: 'javascript:alert(1)' })).toThrow('foto')
  })

  it('lists only the current user pets and sorts them by name', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [
      { id: 'm-2', data: () => ({ ...input, name: 'Grecia', userId: 'alice' }) },
      { id: 'm-1', data: () => ({ ...input, name: 'Hachi', userId: 'alice' }) },
    ] })

    await expect(listMyMascotas('alice')).resolves.toMatchObject([{ id: 'm-2', name: 'Grecia' }, { id: 'm-1', name: 'Hachi' }])
    expect(mocks.where).toHaveBeenCalledWith('userId', '==', 'alice')
  })

  it('creates, updates and deletes a pet through its owner-scoped document', async () => {
    mocks.addDoc.mockResolvedValue({ id: 'm-new' })

    await expect(createMascota('alice', input)).resolves.toBe('m-new')
    expect(mocks.addDoc).toHaveBeenCalledWith('mascotas-collection', { ...input, userId: 'alice', createdAt: 'timestamp', updatedAt: 'timestamp' })

    await expect(updateMascota('alice', 'm-new', input)).resolves.toBeUndefined()
    expect(mocks.updateDoc).toHaveBeenCalledWith('mascota-doc', { ...input, updatedAt: 'timestamp' })

    await expect(deleteMascota('alice', 'm-new')).resolves.toBeUndefined()
    expect(mocks.deleteDoc).toHaveBeenCalledWith('mascota-doc')
  })

  it('lists reservation history for one owner pet', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [{ id: 'r-1', data: () => ({ userId: 'alice', mascotaId: 'm-1', date: '2026-08-01', timeSlot: '10:00', serviceName: 'Spa Day' }) }] })

    await expect(listMyMascotaHistory('alice', 'm-1')).resolves.toEqual([{ id: 'r-1', userId: 'alice', mascotaId: 'm-1', date: '2026-08-01', timeSlot: '10:00', serviceName: 'Spa Day' }])
    expect(mocks.where).toHaveBeenNthCalledWith(1, 'userId', '==', 'alice')
    expect(mocks.where).toHaveBeenNthCalledWith(2, 'mascotaId', '==', 'm-1')
  })
})
