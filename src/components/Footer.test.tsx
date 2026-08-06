import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Footer from './Footer'

describe('Footer navigation', () => {
  it('does not render dead placeholder links', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )

    expect(markup).not.toContain('href="#"')
    expect(markup).toContain('href="/servicios"')
    expect(markup).toContain('href="/equipo"')
    expect(markup).toContain('href="/contacto#ubicacion"')
    expect(markup).toContain('href="/contacto#horarios"')
    expect(markup).toContain('aria-disabled="true"')
  })
})
