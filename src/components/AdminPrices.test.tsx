// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const adminPrices = readFileSync(new URL('./AdminPrices.tsx', import.meta.url), 'utf8')

describe('AdminPrices safe feedback contract', () => {
  it('does not expose SDK exception messages in the admin console', () => {
    expect(adminPrices).not.toContain('error.message')
    expect(adminPrices).not.toContain('error?.message')
    expect(adminPrices).toContain('No se pudieron cargar las tarifas.')
    expect(adminPrices).toContain('No se pudo agregar la tarifa.')
    expect(adminPrices).toContain('No se pudo guardar la tarifa.')
    expect(adminPrices).toContain('No se pudo eliminar la tarifa.')
  })
})
