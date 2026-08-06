import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PublicLuxeShell from './PublicLuxeShell'

describe('PublicLuxeShell', () => {
  it('renders the shared Luxe shell and custom main class', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PublicLuxeShell mainClassName="sl-page-main">
          <p>Contenido público</p>
        </PublicLuxeShell>
      </MemoryRouter>,
    )

    expect(markup).toContain('class="luxe sl-page-shell"')
    expect(markup).toContain('class="sl-header"')
    expect(markup).toContain('class="sl-footer"')
    expect(markup).toContain('class="sl-page-main"')
    expect(markup).toContain('Contenido público')
  })
})
