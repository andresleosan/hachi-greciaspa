import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { signIn } from '../services/auth'
import { canAttempt, getRemainingMs } from '../utils/rateLimit'

type LoginSubmitInput = {
  email: string
  password: string
  nextPath: string
}

type LoginSubmitDependencies = {
  signInFn?: typeof signIn
  canAttemptFn?: typeof canAttempt
  getRemainingMsFn?: typeof getRemainingMs
  navigateFn: (path: string) => void
  onRequestStart?: () => void
  onRequestEnd?: () => void
}

type SubmitResult = {
  ok: boolean
  message?: string
}

export async function submitLogin(
  { email, password, nextPath }: LoginSubmitInput,
  {
    signInFn = signIn,
    canAttemptFn = canAttempt,
    getRemainingMsFn = getRemainingMs,
    navigateFn,
    onRequestStart,
    onRequestEnd,
  }: LoginSubmitDependencies,
): Promise<SubmitResult> {
  if (!canAttemptFn('login')) {
    const mins = Math.ceil(getRemainingMsFn('login') / 60000)
    return { ok: false, message: `Demasiados intentos. Intenta de nuevo en ${mins} min.` }
  }

  onRequestStart?.()
  try {
    await signInFn(email, password)
    navigateFn(nextPath)
    return { ok: true }
  } catch {
    return { ok: false, message: 'No pudimos iniciar sesión. Verifica tu correo y contraseña e inténtalo de nuevo.' }
  } finally {
    onRequestEnd?.()
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = await submitLogin(
      { email, password, nextPath },
      {
        navigateFn: navigate,
        onRequestStart: () => setSubmitting(true),
        onRequestEnd: () => setSubmitting(false),
      },
    )
    if (!result.ok) {
      setError(result.message || 'No pudimos iniciar sesión. Inténtalo de nuevo.')
    }
  }

  return (
    <AuthShell
      eyebrow="Área privada"
      title="Iniciar sesión"
      description="Accede con tu cuenta para gestionar reservas y clientes."
      alternateAction={
        <p>
          ¿Primera vez aquí? <Link to="/register">Crear una cuenta</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form__field">
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={submitting}
            required
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="login-password">Contraseña</label>
          <div className="auth-form__password">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />
            <button
              className="auth-form__password-toggle"
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              disabled={submitting}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
        <p className="auth-form__error" role="alert" aria-live="assertive" hidden={!error}>{error}</p>
        <p className="auth-form__status" role="status" aria-live="polite" hidden={!submitting}>{submitting ? 'Entrando…' : null}</p>
        <button className="auth-form__submit sl-btn sl-btn--primary" type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}
