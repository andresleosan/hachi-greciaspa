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
  category?: string | null
}

export default function PricesList() {
  const [items, setItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('Todos')
  const [q, setQ] = useState<string>('')

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
  const categories = Array.from(new Set(items.map((it) => it.category || 'General')))
  const filtered = items.filter((it) => {
    if (category !== 'Todos' && (it.category || 'General') !== category) return false
    if (!q) return true
    const text = `${it.name} ${it.note || ''}`.toLowerCase()
    return text.includes(q.toLowerCase())
  })

  return (
    <div className="prices-list">
      <div className="prices-toolbar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Todos">Todos</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          placeholder="Buscar precio o nota..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <ul className="list">
        {filtered.map((it) => (
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
