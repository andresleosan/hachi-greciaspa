import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a visible status while authentication is loading', () => {
    mockedUseAuth.mockReturnValue({ user: null, profile: null, loading: true, error: null })

    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute><div>Privado</div></ProtectedRoute>
      </MemoryRouter>,
    )

    expect(markup).toContain('role="status"')
    expect(markup).toContain('Cargando')
    expect(markup).not.toContain('<div></div>')
  })
})
