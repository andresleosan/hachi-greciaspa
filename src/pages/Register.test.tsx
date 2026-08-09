import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Register, { submitRegister } from './Register'

describe('Register', () => {
  it('renders the accessible registration form and login link', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/register']}>
        <Register />
      </MemoryRouter>,
    )

    expect(markup).toContain('Crear cuenta')
    expect(markup).toContain('Nombre')
    expect(markup).toContain('Correo')
    expect(markup).toContain('Contraseña')
    expect(markup).toContain('required=""')
    expect(markup).toContain('autoComplete="name"')
    expect(markup).toContain('autoComplete="email"')
    expect(markup).toContain('autoComplete="new-password"')
    expect(markup).toContain('aria-label="Mostrar contraseña"')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('type="button"')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('href="/login"')
    expect(markup).not.toContain('site-header')
    expect(markup).not.toContain('site-footer')
  })

  it('validates registration before calling the real registration flow', async () => {
    const calls: string[] = []
    const result = await submitRegister(
      { email: 'invalid', password: 'short', displayName: 'A' },
      {
        canAttemptFn: () => {
          calls.push('rate-limit')
          return true
        },
        registerFn: async () => {
          calls.push('register')
          return {} as Awaited<ReturnType<typeof import('../services/auth').register>>
        },
        navigateFn: () => calls.push('navigate'),
      },
    )

    expect(result).toEqual({
      ok: false,
      message: 'Revisa los campos: nombre (mín. 2 caracteres), correo válido y contraseña (mín. 8 caracteres).',
    })
    expect(calls).toEqual([])
  })

  it('registers with the fixed client flow and navigates to login', async () => {
    const calls: string[] = []
    const result = await submitRegister(
      { email: 'ana@example.com', password: 'secreto-largo', displayName: 'Ana' },
      {
        canAttemptFn: () => true,
        registerFn: async (email, password, displayName) => {
          calls.push(`register:${email}:${password}:${displayName}`)
          return {} as Awaited<ReturnType<typeof import('../services/auth').register>>
        },
        navigateFn: (path) => calls.push(`navigate:${path}`),
        onRequestStart: () => calls.push('start'),
        onRequestEnd: () => calls.push('end'),
      },
    )

    expect(result).toEqual({ ok: true })
    expect(calls).toEqual([
      'start',
      'register:ana@example.com:secreto-largo:Ana',
      'navigate:/login',
      'end',
    ])
  })

  it('does not register when the registration rate limit blocks the request', async () => {
    const calls: string[] = []
    const result = await submitRegister(
      { email: 'ana@example.com', password: 'secreto-largo', displayName: 'Ana' },
      {
        canAttemptFn: () => false,
        getRemainingMsFn: () => 180000,
        registerFn: async () => {
          calls.push('register')
          return {} as Awaited<ReturnType<typeof import('../services/auth').register>>
        },
        navigateFn: () => calls.push('navigate'),
      },
    )

    expect(result).toEqual({ ok: false, message: 'Demasiados intentos. Intenta de nuevo en 3 min.' })
    expect(calls).toEqual([])
  })

  it('replaces registration errors with safe feedback and ends submitting', async () => {
    const calls: string[] = []
    const result = await submitRegister(
      { email: 'ana@example.com', password: 'secreto-largo', displayName: 'Ana' },
      {
        canAttemptFn: () => true,
        registerFn: async () => {
          throw new Error('Firebase credential and internal stack trace')
        },
        navigateFn: () => calls.push('navigate'),
        onRequestStart: () => calls.push('start'),
        onRequestEnd: () => calls.push('end'),
      },
    )

    expect(result).toEqual({
      ok: false,
      message: 'No pudimos crear tu cuenta. Verifica tus datos e inténtalo de nuevo.',
    })
    expect(result.message).not.toContain('Firebase')
    expect(result.message).not.toContain('stack trace')
    expect(calls).toEqual(['start', 'end'])
  })
})
