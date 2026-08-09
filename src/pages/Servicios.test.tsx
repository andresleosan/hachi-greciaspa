import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Servicios from './Servicios'

describe('Servicios', () => {
  it('renderiza el catálogo real sin depender de Firestore', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Servicios />
      </MemoryRouter>,
    )

    expect(markup).toContain('Spa Day')
    expect(markup).toContain('Desde $240')
    expect(markup).toContain('$240')
    expect(markup).toContain('$690')
    expect(markup).toContain('Aromaterapia (shampoo de aceites esenciales)')
    expect(markup).toContain('$250/día · $3,500/mes')
    expect(markup).toContain('Precios sujetos a cambio sin previo aviso')
    expect(markup).not.toContain('Cargando tarifas')
    expect(markup).not.toContain('No hay servicios publicados')
  })

  it('mantiene acciones públicas para reservar y consultar', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Servicios />
      </MemoryRouter>,
    )

    expect(markup).toContain('href="/reservar"')
    expect(markup).toContain('href="https://wa.me/')
  })
})
