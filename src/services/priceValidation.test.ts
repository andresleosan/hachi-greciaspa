import { describe, expect, it } from 'vitest'
import { normalizePriceDraft, validatePriceDraft, type PriceDraft } from './priceValidation'

const validDraft: PriceDraft = {
  name: ' Baño premium ',
  price: '350',
  priceHigh: '500',
  unit: 'por servicio',
  note: 'Incluye secado',
}

describe('price validation', () => {
  it('rejects an empty name and malformed prices', () => {
    const errors = validatePriceDraft({ ...validDraft, name: ' ', price: 'abc', priceHigh: '-2' })

    expect(errors).toEqual({
      name: 'El nombre es obligatorio.',
      price: 'Ingresa un precio válido mayor o igual a cero.',
      priceHigh: 'Ingresa un precio válido mayor o igual a cero.',
    })
  })

  it('rejects a maximum price below the base price', () => {
    expect(validatePriceDraft({ ...validDraft, price: '500', priceHigh: '350' })).toEqual({
      priceHigh: 'El precio alto debe ser mayor o igual al precio base.',
    })
  })

  it('normalizes a valid draft into a Firestore-safe payload', () => {
    expect(normalizePriceDraft(validDraft)).toEqual({
      name: 'Baño premium',
      price: 350,
      priceHigh: 500,
      unit: 'por servicio',
      note: 'Incluye secado',
    })
  })

  it('rejects text fields that exceed the Firestore price schema limits', () => {
    const errors = validatePriceDraft({
      ...validDraft,
      name: 'x'.repeat(121),
      unit: 'x'.repeat(81),
      note: 'x'.repeat(241),
    })

    expect(errors).toEqual({
      name: 'El nombre no puede superar 120 caracteres.',
      unit: 'La unidad no puede superar 80 caracteres.',
      note: 'La nota no puede superar 240 caracteres.',
    })
  })
})
