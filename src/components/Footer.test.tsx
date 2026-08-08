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

  it('renders the real WhatsApp contact link and number', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )

    expect(markup).toContain('href="https://wa.me/525578875525?src=qr"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noreferrer"')
    expect(markup).toContain('+52 55 7887 5525')
  })
})
