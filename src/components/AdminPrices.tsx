import React, { useEffect, useState } from 'react'
import { firebaseDb } from '../services/firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  type DocumentData,
} from 'firebase/firestore'
import type { PriceItem } from '../types'
import {
  normalizePriceDraft,
  validatePriceDraft,
  type PriceDraft,
  type PriceValidationErrors,
} from '../services/priceValidation'

const EMPTY_DRAFT: PriceDraft = {
  name: '',
  price: '',
  priceHigh: '',
  unit: '',
  note: '',
}

function draftFromItem(item: PriceItem): PriceDraft {
  return {
    name: item.name,
    price: item.price == null ? '' : String(item.price),
    priceHigh: item.priceHigh == null ? '' : String(item.priceHigh),
    unit: item.unit ?? '',
    note: item.note ?? '',
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function PriceDraftFields({
  draft,
  idPrefix,
  errors,
  disabled,
  onChange,
}: {
  draft: PriceDraft
  idPrefix: string
  errors: PriceValidationErrors
  disabled: boolean
  onChange: (field: keyof PriceDraft, value: string) => void
}) {
  const describedBy = (field: keyof PriceDraft) => errors[field as keyof PriceValidationErrors]
    ? `${idPrefix}-${field}-error`
    : undefined

  return (
    <div className="field-grid admin-prices__fields">
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>Nombre del servicio</label>
        <input
          id={`${idPrefix}-name`}
          value={draft.name}
          onChange={(event) => onChange('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy('name')}
          disabled={disabled}
        />
        {errors.name && <span className="field-error" id={`${idPrefix}-name-error`}>{errors.name}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-price`}>Precio base</label>
        <input
          id={`${idPrefix}-price`}
          type="number"
          min="0"
          step="0.01"
          value={draft.price}
          onChange={(event) => onChange('price', event.target.value)}
          aria-invalid={Boolean(errors.price)}
          aria-describedby={describedBy('price')}
          disabled={disabled}
        />
        {errors.price && <span className="field-error" id={`${idPrefix}-price-error`}>{errors.price}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-price-high`}>Precio alto</label>
        <input
          id={`${idPrefix}-price-high`}
          type="number"
          min="0"
          step="0.01"
          value={draft.priceHigh}
          onChange={(event) => onChange('priceHigh', event.target.value)}
          aria-invalid={Boolean(errors.priceHigh)}
          aria-describedby={describedBy('priceHigh')}
          disabled={disabled}
        />
        {errors.priceHigh && <span className="field-error" id={`${idPrefix}-price-high-error`}>{errors.priceHigh}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-unit`}>Unidad</label>
        <input
          id={`${idPrefix}-unit`}
          value={draft.unit}
          onChange={(event) => onChange('unit', event.target.value)}
          placeholder="por servicio"
          aria-invalid={Boolean(errors.unit)}
          aria-describedby={describedBy('unit')}
          disabled={disabled}
        />
        {errors.unit && <span className="field-error" id={`${idPrefix}-unit-error`}>{errors.unit}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-note`}>Nota</label>
        <input
          id={`${idPrefix}-note`}
          value={draft.note}
          onChange={(event) => onChange('note', event.target.value)}
          placeholder="Incluye..."
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describedBy('note')}
          disabled={disabled}
        />
        {errors.note && <span className="field-error" id={`${idPrefix}-note-error`}>{errors.note}</span>}
      </div>
    </div>
  )
}

export default function AdminPrices() {
  const [items, setItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<PriceDraft>(EMPTY_DRAFT)
  const [newItemErrors, setNewItemErrors] = useState<PriceValidationErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<PriceDraft | null>(null)
  const [editErrors, setEditErrors] = useState<PriceValidationErrors>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const pricesQuery = query(collection(firebaseDb, 'precios'), orderBy('name', 'asc'))
        const snap = await getDocs(pricesQuery)
        if (!active) return
        setItems(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PriceItem, 'id'>) })))
      } catch (error) {
        if (active) setLoadError(errorMessage(error, 'No se pudieron cargar las tarifas.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  function updateNewItem(field: keyof PriceDraft, value: string) {
    setNewItem((current) => ({ ...current, [field]: value }))
    setNewItemErrors((current) => ({ ...current, [field]: undefined }))
    setActionError(null)
  }

  function updateEditDraft(field: keyof PriceDraft, value: string) {
    setEditDraft((current) => current ? { ...current, [field]: value } : current)
    setEditErrors((current) => ({ ...current, [field]: undefined }))
    setActionError(null)
  }

  function startEdit(item: PriceItem) {
    setEditingId(item.id ?? null)
    setEditDraft(draftFromItem(item))
    setEditErrors({})
    setActionError(null)
    setNotice(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(null)
    setEditErrors({})
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    const errors = validatePriceDraft(newItem)
    if (Object.keys(errors).length > 0) {
      setNewItemErrors(errors)
      return
    }

    setSavingId('new')
    setActionError(null)
    setNotice(null)
    try {
      const payload = normalizePriceDraft(newItem)
      const newDoc = await addDoc(collection(firebaseDb, 'precios'), payload as DocumentData)
      setItems((current) => [...current, { id: newDoc.id, ...payload }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewItem(EMPTY_DRAFT)
      setNewItemErrors({})
      setNotice('Tarifa agregada correctamente.')
    } catch (error) {
      setActionError(errorMessage(error, 'No se pudo agregar la tarifa.'))
    } finally {
      setSavingId(null)
    }
  }

  async function handleUpdate(itemId: string) {
    if (!editDraft) return
    const errors = validatePriceDraft(editDraft)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    setSavingId(itemId)
    setActionError(null)
    setNotice(null)
    try {
      const payload = normalizePriceDraft(editDraft)
      await updateDoc(doc(firebaseDb, 'precios', itemId), payload as DocumentData)
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...payload } : item))
      cancelEdit()
      setNotice('Tarifa guardada correctamente.')
    } catch (error) {
      setActionError(errorMessage(error, 'No se pudo guardar la tarifa.'))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(item: PriceItem) {
    if (!item.id || !window.confirm(`¿Eliminar la tarifa "${item.name}"?`)) return

    setDeletingId(item.id)
    setActionError(null)
    setNotice(null)
    try {
      await deleteDoc(doc(firebaseDb, 'precios', item.id))
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))
      if (editingId === item.id) cancelEdit()
      setNotice('Tarifa eliminada correctamente.')
    } catch (error) {
      setActionError(errorMessage(error, 'No se pudo eliminar la tarifa.'))
    } finally {
      setDeletingId(null)
    }
  }

  const busy = savingId !== null || deletingId !== null

  return (
    <section className="admin-prices card" aria-labelledby="admin-prices-title">
      <div className="admin-prices__header">
        <div>
          <h4 id="admin-prices-title">Administrar tarifas</h4>
          <p className="admin-prices__hint">Edita una tarifa y guarda los cambios cuando estén listos.</p>
        </div>
        <span className="admin-prices__count">{items.length} {items.length === 1 ? 'tarifa' : 'tarifas'}</span>
      </div>

      {notice && <p className="field-success admin-prices__feedback" role="status">{notice}</p>}
      {actionError && <p className="field-error admin-prices__feedback" role="alert">{actionError}</p>}
      {loading && <p className="admin-prices__state" role="status">Cargando tarifas...</p>}
      {!loading && loadError && <p className="field-error admin-prices__state" role="alert">{loadError}</p>}
      {!loading && !loadError && items.length === 0 && <p className="admin-prices__state">Aún no hay tarifas registradas.</p>}

      {!loading && !loadError && items.length > 0 && (
        <ul className="list admin-prices__list">
          {items.map((item) => {
            const isEditing = editingId === item.id && editDraft !== null
            const rowBusy = savingId === item.id || deletingId === item.id

            return (
              <li key={item.id} className="card admin-prices__item">
                {isEditing ? (
                  <form onSubmit={(event) => { event.preventDefault(); void handleUpdate(item.id!) }} noValidate>
                    <PriceDraftFields
                      draft={editDraft}
                      idPrefix={`price-edit-${item.id}`}
                      errors={editErrors}
                      disabled={rowBusy}
                      onChange={updateEditDraft}
                    />
                    <div className="admin-prices__actions">
                      <button className="btn btn-primary" type="submit" disabled={busy}>{rowBusy ? 'Guardando…' : 'Guardar'}</button>
                      <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={busy}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <div className="admin-prices__row">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="admin-prices__summary">
                        {item.price == null ? 'Sin precio' : `$${item.price}`}
                        {item.priceHigh != null ? ` – $${item.priceHigh}` : ''}
                        {item.unit ? ` · ${item.unit}` : ''}
                      </p>
                      {item.note && <small>{item.note}</small>}
                    </div>
                    <div className="admin-prices__actions">
                      <button className="btn btn-ghost" type="button" onClick={() => startEdit(item)} disabled={busy}>Editar</button>
                      <button className="btn btn-danger" type="button" onClick={() => void handleDelete(item)} disabled={busy}>
                        {deletingId === item.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="card admin-prices__new" noValidate>
        <h5>Agregar tarifa</h5>
        <PriceDraftFields
          draft={newItem}
          idPrefix="price-new"
          errors={newItemErrors}
          disabled={savingId === 'new'}
          onChange={updateNewItem}
        />
        <div className="admin-prices__actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{savingId === 'new' ? 'Agregando…' : 'Agregar tarifa'}</button>
        </div>
      </form>
    </section>
  )
}
