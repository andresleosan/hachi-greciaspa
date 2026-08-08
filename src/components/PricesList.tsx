import React, { useEffect, useState } from 'react'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import type { PriceItem } from '../types'

const SECTION_ORDER = ['Spa Day', 'Extras', 'Otros servicios', 'General'] as const
const SPA_VARIANT_ORDER = ['Pelo corto', 'Pelo largo sin nudos'] as const
const SPA_SIZE_ORDER = ['Mini', 'Chica', 'Mediana', 'Mediana/Grande', 'Grande']

export type PriceSubsection = {
  title: (typeof SPA_VARIANT_ORDER)[number]
  items: PriceItem[]
}

export type PriceSection = {
  title: (typeof SECTION_ORDER)[number]
  items: PriceItem[]
  subsections?: PriceSubsection[]
}

function formatAmount(value: number): string {
  return `$${new Intl.NumberFormat('en-US').format(value)}`
}

export function formatPrice(item: Pick<PriceItem, 'price' | 'priceHigh' | 'unit'>): string {
  const { price, priceHigh, unit } = item

  if (price == null && priceHigh == null) return 'Variable'

  const amount = price != null && priceHigh != null
    ? `${formatAmount(price)}-${formatAmount(priceHigh)}`
    : formatAmount(price ?? priceHigh as number)
  const rateUnit = unit?.trim().startsWith('/') ? unit.trim() : ''

  return `${amount}${rateUnit}`
}

function sortItems(items: PriceItem[]): PriceItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }))
}

function sortSpaItems(items: PriceItem[]): PriceItem[] {
  return [...items].sort((a, b) => {
    const aSize = SPA_SIZE_ORDER.findIndex((size) => a.name.includes(` ${size} ·`))
    const bSize = SPA_SIZE_ORDER.findIndex((size) => b.name.includes(` ${size} ·`))
    if (aSize !== bSize) return (aSize < 0 ? SPA_SIZE_ORDER.length : aSize) - (bSize < 0 ? SPA_SIZE_ORDER.length : bSize)
    return a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' })
  })
}

function sectionTitle(item: PriceItem): PriceSection['title'] {
  const category = item.category?.trim()
  if (!category) return 'General'
  if (category === 'Spa') return 'Spa Day'
  if (category === 'Extra') return 'Extras'
  return 'Otros servicios'
}

export function groupPrices(items: PriceItem[]): PriceSection[] {
  const grouped = new Map<PriceSection['title'], PriceItem[]>()

  for (const item of items) {
    const title = sectionTitle(item)
    const sectionItems = grouped.get(title) || []
    sectionItems.push(item)
    grouped.set(title, sectionItems)
  }

  return SECTION_ORDER.flatMap((title): PriceSection[] => {
    const sectionItems = grouped.get(title)
    if (!sectionItems?.length) return []

    if (title !== 'Spa Day') return [{ title, items: sortItems(sectionItems) }]

    const subsections = SPA_VARIANT_ORDER.flatMap((variant) => {
      const variantItems = sortSpaItems(sectionItems.filter((item) => item.note?.trim() === variant))
      return variantItems.length ? [{ title: variant, items: variantItems }] : []
    })
    const unclassified = sortSpaItems(sectionItems.filter((item) => !SPA_VARIANT_ORDER.includes(item.note?.trim() as (typeof SPA_VARIANT_ORDER)[number])))

    return [{ title, items: unclassified, subsections }]
  })
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
  const sections = groupPrices(filtered)

  const renderItems = (sectionItems: PriceItem[]) => (
    <ul className="sl-catalog-items">
      {sectionItems.map((it) => (
        <li key={it.id || it.name} className="sl-catalog-item">
          <div className="sl-catalog-item__row">
            <div className="sl-catalog-item__name">
              <strong>{it.name}</strong>
              {it.unit && !it.unit.trim().startsWith('/') ? ` · ${it.unit}` : ''}
            </div>
            <div className="sl-catalog-item__price">{formatPrice(it)}</div>
          </div>
          {it.note && <div className="sl-catalog-item__note">{it.note}</div>}
        </li>
      ))}
    </ul>
  )

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

      {sections.length === 0 && <p>No se encontraron tarifas para esta búsqueda.</p>}
      {sections.map((section) => (
        <section key={section.title} className="sl-catalog-group" aria-labelledby={`price-group-${section.title.toLowerCase().replaceAll(' ', '-')}`}>
          <h2 id={`price-group-${section.title.toLowerCase().replaceAll(' ', '-')}`} className="sl-catalog-group__title">{section.title}</h2>
          {section.subsections?.map((subsection) => (
            <div key={subsection.title} className="sl-catalog-subgroup">
              <h3 className="sl-catalog-subgroup__title">{subsection.title}</h3>
              {renderItems(subsection.items)}
            </div>
          ))}
          {section.items.length > 0 && renderItems(section.items)}
        </section>
      ))}
    </div>
  )
}
