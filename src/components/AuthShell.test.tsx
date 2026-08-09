import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthShell from './AuthShell'

describe('AuthShell', () => {
  it('renders the Luxe brand and focused form panels without the site chrome', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AuthShell
          eyebrow="Área privada"
          title="Iniciar sesión"
          description="Accede a tu espacio de cuidado."
          alternateAction={<a href="/register">Crear una cuenta</a>}
        >
          <div>Contenido del formulario</div>
        </AuthShell>
      </MemoryRouter>,
    )

    expect(markup).toContain('class="auth-shell"')
    expect(markup).toContain('Iniciar sesión')
    expect(markup).toContain('Crear una cuenta')
    expect(markup).toContain('/img/Logo.png')
    expect(markup).toContain('auth-shell__brand-panel')
    expect(markup).toContain('auth-shell__form-panel')
    expect(markup).toContain('aria-labelledby="auth-shell-title"')
    expect(markup).not.toContain('site-header')
    expect(markup).not.toContain('site-footer')
  })
})
