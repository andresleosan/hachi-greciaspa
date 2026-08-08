import { describe, expect, it, vi } from 'vitest'

vi.mock('../services/firebase', () => ({ firebaseDb: {} }))

import { formatPrice, groupPrices } from './PricesList'
import type { PriceItem } from '../types'

describe('PricesList price contract', () => {
  it('formats single prices, ranges, units and variable prices deterministically', () => {
    expect(formatPrice({ price: 240 })).toBe('$240')
    expect(formatPrice({ price: null, priceHigh: null })).toBe('Variable')
    expect(formatPrice({ price: 300, unit: '/noche' })).toBe('$300/noche')
    expect(formatPrice({ price: 300, priceHigh: 380, unit: '/noche' })).toBe('$300-$380/noche')
    expect(formatPrice({ price: 3500, unit: '/mes' })).toBe('$3,500/mes')
  })

  it('groups the catalog in commercial order and separates Spa Day coat variants', () => {
    const items: PriceItem[] = [
      { id: 'general', name: 'Documento administrado', price: 100 },
      { id: 'pension', name: 'Pensión', price: 300, priceHigh: 380, unit: '/noche', category: 'Estancia' },
      { id: 'extra', name: 'Corte de uñas', price: 70, category: 'Extra' },
      { id: 'long', name: 'Spa Day Grande · Pelo largo sin nudos', price: 690, unit: '≤30 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
      { id: 'short', name: 'Spa Day Mini · Pelo corto', price: 240, unit: '≤5 kg', note: 'Pelo corto', category: 'Spa' },
    ]

    const sections = groupPrices(items)

    expect(sections.map((section) => section.title)).toEqual([
      'Spa Day',
      'Extras',
      'Otros servicios',
      'General',
    ])
    expect(sections[0].subsections?.map((section) => section.title)).toEqual([
      'Pelo corto',
      'Pelo largo sin nudos',
    ])
    expect(sections[0].subsections?.[0].items.map((item) => item.name)).toEqual([
      'Spa Day Mini · Pelo corto',
    ])
    expect(sections[0].subsections?.[1].items.map((item) => item.name)).toEqual([
      'Spa Day Grande · Pelo largo sin nudos',
    ])
    expect(sections[1].items.map((item) => item.name)).toEqual(['Corte de uñas'])
    expect(sections[2].items.map((item) => item.name)).toEqual(['Pensión'])
    expect(sections[3].items.map((item) => item.name)).toEqual(['Documento administrado'])
  })
})
