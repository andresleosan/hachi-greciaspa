import { describe, expect, it } from 'vitest'

import {
  COMMERCIAL_NOTES,
  EXTRAS_LIST,
  GALLERY,
  PRICING_SPA,
  SERVICE_PRICE_LABELS,
} from './data'

describe('catalogo comercial', () => {
  it('conserva los importes de Spa Day del tarifario', () => {
    expect(PRICING_SPA.short.find((item) => item.size === 'Grande')?.price).toBe('$550')
    expect(PRICING_SPA.long.find((item) => item.size === 'Grande')?.price).toBe('$690')
  })

  it('conserva los extras y servicios variables', () => {
    expect(EXTRAS_LIST).toContainEqual({ name: 'Corte de uñas', price: '$70' })
    expect(EXTRAS_LIST.filter((item) => item.price === 'Variable')).toHaveLength(3)
  })

  it('expone las etiquetas comerciales por ID estable de Firestore', () => {
    expect(SERVICE_PRICE_LABELS['spa-day']).toBe('Desde $240')
    expect(SERVICE_PRICE_LABELS['grooming']).toBe('Variable')
    expect(SERVICE_PRICE_LABELS['guarderia']).toBe('$250/día · $3,500/mes')
    expect(SERVICE_PRICE_LABELS['pension']).toBe('$300-$380/noche')
  })

  it('expone las condiciones comerciales aprobadas', () => {
    expect(COMMERCIAL_NOTES).toContain('Afiliados Hexalud obtienen 10% de descuento en cualquier servicio.')
    expect(COMMERCIAL_NOTES).toContain('Precios sujetos a cambio sin previo aviso, consulta términos y condiciones al agendar.')
    expect(COMMERCIAL_NOTES).toContain('Nuestros productos son libres de sulfatos y parabenos, hipoalergénicos y cruelty free.')
    expect(COMMERCIAL_NOTES).toContain('Espacio libre de jaulas.')
  })

  it('expone diez entradas editoriales de galería sin rutas antiguas', () => {
    expect(GALLERY).toHaveLength(10)
    expect(GALLERY.every((item) => !/\/(tl|tr|bl|br|hachi-greciaspa)\.png$/.test(item.src))).toBe(true)
  })
})
