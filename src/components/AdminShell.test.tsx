import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../hooks/useAuth'
import AdminShell, { logoutAndRedirect } from './AdminShell'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../services/auth', () => ({
  signOut: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useLocation: vi.fn(),
    useNavigate: vi.fn(),
  }
})

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseLocation = vi.mocked(useLocation)
const mockedUseNavigate = vi.mocked(useNavigate)

function renderShell(pathname = '/dashboard', role: 'admin' | 'client' = 'client') {
  mockedUseAuth.mockReturnValue({
    user: { email: 'cliente@example.com' } as ReturnType<typeof useAuth>['user'],
    profile: { displayName: 'Cliente de prueba', role },
    loading: false,
    error: null,
  })
  mockedUseLocation.mockReturnValue({ pathname, search: '', hash: '', state: null, key: 'test' })
  mockedUseNavigate.mockReturnValue(vi.fn())

  return renderToStaticMarkup(
    <MemoryRouter>
      <AdminShell title="Dashboard" subtitle="Resumen y actividad" action={<button type="button">Nueva cita</button>}>
        <p>Contenido privado</p>
      </AdminShell>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the official brand, base navigation and disabled upcoming links', () => {
    const markup = renderShell()

    expect(markup).toContain('/img/Logo.png')
    expect(markup).toContain('Hachi &amp; Grecia Spa')
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Citas')
    expect(markup).toContain('Mis mascotas')
    expect(markup).toContain('Servicios')
    expect(markup).toContain('Clientes')
    expect(markup).toContain('Reportes')
    expect(markup).toContain('Próximamente')
    expect(markup).not.toContain('href="/dashboard/clientes"')
    expect(markup).not.toContain('href="/reportes"')
    expect(markup).toContain('Cerrar sesión')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('shows Empleados only for admin profiles', () => {
    expect(renderShell('/dashboard', 'client')).not.toContain('Empleados')
    expect(renderShell('/dashboard', 'admin')).toContain('Empleados')
    expect(renderShell('/dashboard', 'admin')).toContain('href="/dashboard/empleados"')
  })

  it('derives the active navigation item from the current pathname', () => {
    const markup = renderShell('/dashboard/agenda')

    expect(markup).toMatch(/class="admin-shell__nav-link is-active" aria-current="page" href="\/dashboard\/agenda"/)
    expect(markup).not.toContain('class="admin-shell__nav-link is-active" aria-current="page" href="/dashboard"')
  })

  it('exposes an accessible mobile drawer control and an explicit close control', () => {
    const markup = renderShell()

    expect(markup).toContain('id="admin-sidebar"')
    expect(markup).toContain('aria-label="Navegación del panel"')
    expect(markup).toContain('type="button"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('aria-controls="admin-sidebar"')
    expect(markup).toContain('aria-label="Abrir menú"')
    expect(markup).toContain('aria-label="Cerrar menú"')
    expect(AdminShell.toString()).toContain('admin-shell__overlay')
    expect(AdminShell.toString()).toContain('Cerrar navegación')
  })

  it('renders the logout action as a button with the private profile context', () => {
    const markup = renderShell('/dashboard', 'admin')

    expect(markup).toContain('Cliente de prueba')
    expect(markup).toContain('Administrador')
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*>.*Cerrar sesión/s)
  })

  it('waits for signOut before navigating to login', async () => {
    const events: string[] = []
    let resolveSignOut!: () => void
    const signOutFn = () => new Promise<void>((resolve) => {
      events.push('signOut:start')
      resolveSignOut = () => {
        events.push('signOut:done')
        resolve()
      }
    })
    const navigateFn = (path: string) => events.push(`navigate:${path}`)

    const logoutPromise = logoutAndRedirect(signOutFn, navigateFn)
    await Promise.resolve()

    expect(events).toEqual(['signOut:start'])

    resolveSignOut()
    await logoutPromise

    expect(events).toEqual(['signOut:start', 'signOut:done', 'navigate:/login'])
  })
})
