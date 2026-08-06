export interface PriceDraft {
  name: string
  price: string
  priceHigh: string
  unit: string
  note: string
}

export interface PriceValidationErrors {
  name?: string
  price?: string
  priceHigh?: string
  unit?: string
  note?: string
}

export interface NormalizedPricePayload {
  name: string
  price: number | null
  priceHigh: number | null
  unit: string | null
  note: string | null
}

function parseOptionalPrice(value: string): number | null | undefined {
  const normalized = value.trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function validatePriceDraft(draft: PriceDraft): PriceValidationErrors {
  const errors: PriceValidationErrors = {}
  const price = parseOptionalPrice(draft.price)
  const priceHigh = parseOptionalPrice(draft.priceHigh)

  if (!draft.name.trim()) errors.name = 'El nombre es obligatorio.'
  else if (draft.name.trim().length > 120) errors.name = 'El nombre no puede superar 120 caracteres.'
  if (price === undefined) errors.price = 'Ingresa un precio válido mayor o igual a cero.'
  if (priceHigh === undefined) errors.priceHigh = 'Ingresa un precio válido mayor o igual a cero.'
  if (price !== undefined && price !== null && priceHigh !== undefined && priceHigh !== null && priceHigh < price) {
    errors.priceHigh = 'El precio alto debe ser mayor o igual al precio base.'
  }
  if (draft.unit.trim().length > 80) errors.unit = 'La unidad no puede superar 80 caracteres.'
  if (draft.note.trim().length > 240) errors.note = 'La nota no puede superar 240 caracteres.'

  return errors
}

export function normalizePriceDraft(draft: PriceDraft): NormalizedPricePayload {
  return {
    name: draft.name.trim(),
    price: parseOptionalPrice(draft.price) ?? null,
    priceHigh: parseOptionalPrice(draft.priceHigh) ?? null,
    unit: draft.unit.trim() || null,
    note: draft.note.trim() || null,
  }
}
