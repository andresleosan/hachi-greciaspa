import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { register } from '../services/auth'
import { canAttempt, getRemainingMs } from '../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RegisterSubmitInput = {
  email: string
  password: string
  displayName: string
}

type RegisterSubmitDependencies = {
  registerFn?: typeof register
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

export async function submitRegister(
  { email, password, displayName }: RegisterSubmitInput,
  {
    registerFn = register,
    canAttemptFn = canAttempt,
    getRemainingMsFn = getRemainingMs,
    navigateFn,
    onRequestStart,
    onRequestEnd,
  }: RegisterSubmitDependencies,
): Promise<SubmitResult> {
  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 8
  const nameValid = displayName.trim().length >= 2

  if (!(emailValid && passwordValid && nameValid)) {
    return { ok: false, message: 'Revisa los campos: nombre (mín. 2 caracteres), correo válido y contraseña (mín. 8 caracteres).' }
  }

  if (!canAttemptFn('register')) {
    const mins = Math.ceil(getRemainingMsFn('register') / 60000)
    return { ok: false, message: `Demasiados intentos. Intenta de nuevo en ${mins} min.` }
  }

  onRequestStart?.()
  try {
    await registerFn(email, password, displayName)
    navigateFn('/login')
    return { ok: true }
  } catch {
    return { ok: false, message: 'No pudimos crear tu cuenta. Verifica tus datos e inténtalo de nuevo.' }
  } finally {
    onRequestEnd?.()
  }
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 8
  const nameValid = displayName.trim().length >= 2

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = await submitRegister(
      { email, password, displayName },
      {
        navigateFn: navigate,
        onRequestStart: () => setSubmitting(true),
        onRequestEnd: () => setSubmitting(false),
      },
    )
    if (!result.ok) {
      setError(result.message || 'No pudimos crear tu cuenta. Inténtalo de nuevo.')
    }
  }

  return (
    <AuthShell
      eyebrow="Tu espacio de cuidado"
      title="Crear una cuenta"
      description="Regístrate para agendar y consultar tus reservas."
      alternateAction={
        <p>
          ¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form__field">
          <label htmlFor="register-name">Nombre</label>
          <input
            id="register-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            aria-invalid={Boolean(displayName) && !nameValid}
            aria-describedby={displayName && !nameValid ? 'register-name-error' : undefined}
            autoComplete="name"
            disabled={submitting}
            required
          />
          {displayName && !nameValid && <small className="auth-form__hint" id="register-name-error">Mínimo 2 caracteres.</small>}
        </div>
        <div className="auth-form__field">
          <label htmlFor="register-email">Correo</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(email) && !emailValid}
            aria-describedby={email && !emailValid ? 'register-email-error' : undefined}
            autoComplete="email"
            disabled={submitting}
            required
          />
          {email && !emailValid && <small className="auth-form__hint" id="register-email-error">Correo no válido.</small>}
        </div>
        <div className="auth-form__field">
          <label htmlFor="register-password">Contraseña</label>
          <div className="auth-form__password">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              aria-invalid={Boolean(password) && !passwordValid}
              aria-describedby={password && !passwordValid ? 'register-password-error' : undefined}
              autoComplete="new-password"
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
          {password && !passwordValid && <small className="auth-form__hint" id="register-password-error">Mínimo 8 caracteres.</small>}
        </div>
        <p className="auth-form__error" role="alert" aria-live="assertive" hidden={!error}>{error}</p>
        <p className="auth-form__status" role="status" aria-live="polite" hidden={!submitting}>{submitting ? 'Creando tu cuenta…' : null}</p>
        <button className="auth-form__submit sl-btn sl-btn--primary" type="submit" disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}
