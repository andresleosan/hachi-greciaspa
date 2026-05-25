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
} from 'firebase/firestore'

type PriceItem = {
  id?: string
  name: string
  price?: number
  priceHigh?: number
  unit?: string
  note?: string
}

export default function AdminPrices() {
  const [items, setItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState<PriceItem>({ name: '', price: 0 })

  async function load() {
    setLoading(true)
    const q = query(collection(firebaseDb, 'precios'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    const data: PriceItem[] = []
    snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }))
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.name) return
    await addDoc(collection(firebaseDb, 'precios'), {
      name: newItem.name,
      price: newItem.price || null,
      priceHigh: newItem.priceHigh || null,
      unit: newItem.unit || null,
      note: newItem.note || null,
    })
    setNewItem({ name: '', price: 0 })
    load()
  }

  async function handleUpdate(id: string, partial: Partial<PriceItem>) {
    const ref = doc(firebaseDb, 'precios', id)
    await updateDoc(ref, partial as any)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar tarifa?')) return
    await deleteDoc(doc(firebaseDb, 'precios', id))
    load()
  }

  return (
    <section className="admin-prices card">
      <h4>Administrar tarifas</h4>
      {loading && <p>Cargando tarifas...</p>}

      {!loading && (
        <div>
          <ul className="list">
            {items.map((it) => (
              <li key={it.id} className="card">
                <div className="field-grid">
                  <div className="field">
                    <input defaultValue={it.name} onBlur={(e) => handleUpdate(it.id!, { name: e.currentTarget.value })} />
                  </div>
                  <div className="field">
                    <input type="number" defaultValue={it.price as any} onBlur={(e) => handleUpdate(it.id!, { price: Number(e.currentTarget.value) || null })} placeholder="Precio" />
                  </div>
                  <div className="field">
                    <input type="number" defaultValue={it.priceHigh as any} onBlur={(e) => handleUpdate(it.id!, { priceHigh: Number(e.currentTarget.value) || null })} placeholder="Precio alto" />
                  </div>
                  <div className="field">
                    <input defaultValue={it.unit} onBlur={(e) => handleUpdate(it.id!, { unit: e.currentTarget.value })} placeholder="unidad" />
                  </div>
                  <div className="field">
                    <input defaultValue={it.note} onBlur={(e) => handleUpdate(it.id!, { note: e.currentTarget.value })} placeholder="nota" />
                  </div>
                  <div className="field"><button className="btn btn-danger" onClick={() => handleDelete(it.id!)}>Eliminar</button></div>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="card">
            <h5>Agregar tarifa</h5>
            <div className="field-grid">
              <div className="field"><input value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} placeholder="Nombre del servicio" /></div>
              <div className="field"><input type="number" value={newItem.price as any} onChange={(e) => setNewItem((s) => ({ ...s, price: Number(e.target.value) }))} placeholder="Precio" /></div>
              <div className="field"><input type="number" value={newItem.priceHigh as any} onChange={(e) => setNewItem((s) => ({ ...s, priceHigh: Number(e.target.value) }))} placeholder="Precio alto" /></div>
              <div className="field"><input value={newItem.unit || ''} onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))} placeholder="unidad" /></div>
            </div>
            <div className="field"><input value={newItem.note || ''} onChange={(e) => setNewItem((s) => ({ ...s, note: e.target.value }))} placeholder="nota" /></div>
            <div className="field"><button className="btn btn-primary">Agregar</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
