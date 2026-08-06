import React, { useEffect, useState } from 'react'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import type { PriceItem } from '../types'

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
    <div className="sl-catalog-list">
      <div className="sl-catalog-toolbar">
        <label className="sr-only" htmlFor="price-category">Filtrar por categoría</label>
        <select id="price-category" className="sl-catalog-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Todos">Todos</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          className="sl-catalog-search"
          aria-label="Buscar precio o nota"
          placeholder="Buscar precio o nota..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <ul className="sl-catalog-items">
        {filtered.map((it) => (
          <li key={it.id} className="sl-catalog-item">
            <div className="sl-catalog-item__row">
              <div className="sl-catalog-item__name"><strong>{it.name}</strong>{it.unit ? ` · ${it.unit}` : ''}</div>
              <div className="sl-catalog-item__price">
                {it.price != null && <span>${it.price}</span>}
                {it.priceHigh != null && <span> / ${it.priceHigh}</span>}
              </div>
            </div>
            {it.note && <div className="sl-catalog-item__note">{it.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
