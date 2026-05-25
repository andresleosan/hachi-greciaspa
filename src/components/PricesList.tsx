import React, { useEffect, useState } from 'react'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

type PriceItem = {
  id?: string
  name: string
  price?: number | null
  priceHigh?: number | null
  unit?: string | null
  note?: string | null
}

export default function PricesList() {
  const [items, setItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const q = query(collection(firebaseDb, 'precios'), orderBy('name', 'asc'))
      try {
        const snap = await getDocs(q)
        const arr: PriceItem[] = []
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }))
        if (mounted) setItems(arr)
      } catch (e) {
        if (mounted) setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <p>Cargando tarifas...</p>
  if (!loading && items.length === 0) return <p>No hay tarifas publicadas.</p>

  return (
    <div className="prices-list">
      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className="card">
            <div className="price-row">
              <div className="price-name"><strong>{it.name}</strong>{it.unit ? ` · ${it.unit}` : ''}</div>
              <div className="price-values">
                {it.price != null && <span className="price">${it.price}</span>}
                {it.priceHigh != null && <span className="price-high"> / ${it.priceHigh}</span>}
              </div>
            </div>
            {it.note && <div className="price-note">{it.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
