import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Login, { getSafeNextPath, submitLogin } from './Login'

describe('Login', () => {
  it('renders the accessible login form and registration link', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    )

    expect(markup).toContain('Correo')
    expect(markup).toContain('Contraseña')
    expect(markup).toContain('Entrar')
    expect(markup).toContain('required=""')
    expect(markup).toContain('autoComplete="email"')
    expect(markup).toContain('autoComplete="current-password"')
    expect(markup).toContain('aria-label="Mostrar contraseña"')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('type="button"')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('id="login-error"')
    expect(markup).toContain('aria-describedby="login-error"')
    expect(markup).toContain('aria-invalid="false"')
    expect(markup).toContain('href="/register"')
    expect(markup).not.toContain('site-header')
    expect(markup).not.toContain('site-footer')
  })

  it.each([
    ['/dashboard/agenda', '/dashboard/agenda'],
    ['/dashboard/agenda?date=2026-08-09', '/dashboard/agenda?date=2026-08-09'],
    ['https://example.com/account', '/dashboard'],
    ['//example.com/account', '/dashboard'],
    ['dashboard/agenda', '/dashboard'],
    ['/\\\\example.com', '/dashboard'],
  ])('accepts only safe internal next paths: %s', (value, expected) => {
    expect(getSafeNextPath(value)).toBe(expected)
  })

  it('signs in, preserves next, and reports request state around the real submit flow', async () => {
    const calls: string[] = []
    const result = await submitLogin(
      { email: 'ana@example.com', password: 'secreto', nextPath: '/dashboard?tab=reservas' },
      {
        canAttemptFn: () => true,
        signInFn: async (email, password) => {
          calls.push(`signIn:${email}:${password}`)
          return {} as Awaited<ReturnType<typeof import('../services/auth').signIn>>
        },
        navigateFn: (path) => calls.push(`navigate:${path}`),
        onRequestStart: () => calls.push('start'),
        onRequestEnd: () => calls.push('end'),
      },
    )

    expect(result).toEqual({ ok: true })
    expect(calls).toEqual([
      'start',
      'signIn:ana@example.com:secreto',
      'navigate:/dashboard?tab=reservas',
      'end',
    ])
  })

  it('does not call authentication when the login rate limit blocks the request', async () => {
    const calls: string[] = []
    const result = await submitLogin(
      { email: 'ana@example.com', password: 'secreto', nextPath: '/dashboard' },
      {
        canAttemptFn: () => false,
        getRemainingMsFn: () => 120000,
        signInFn: async () => {
          calls.push('signIn')
          return {} as Awaited<ReturnType<typeof import('../services/auth').signIn>>
        },
        navigateFn: () => calls.push('navigate'),
        onRequestStart: () => calls.push('start'),
        onRequestEnd: () => calls.push('end'),
      },
    )

    expect(result).toEqual({ ok: false, message: 'Demasiados intentos. Intenta de nuevo en 2 min.' })
    expect(calls).toEqual([])
  })

  it('replaces authentication errors with safe feedback and always ends submitting', async () => {
    const calls: string[] = []
    const result = await submitLogin(
      { email: 'ana@example.com', password: 'secreto', nextPath: '/dashboard' },
      {
        canAttemptFn: () => true,
        signInFn: async () => {
          throw new Error('Firebase token and internal stack trace')
        },
        navigateFn: () => calls.push('navigate'),
        onRequestStart: () => calls.push('start'),
        onRequestEnd: () => calls.push('end'),
      },
    )

    expect(result).toEqual({
      ok: false,
      message: 'No pudimos iniciar sesión. Verifica tu correo y contraseña e inténtalo de nuevo.',
    })
    expect(result.message).not.toContain('Firebase')
    expect(result.message).not.toContain('stack trace')
    expect(calls).toEqual(['start', 'end'])
  })
})
