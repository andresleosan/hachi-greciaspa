import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { register } from '../services/auth'
import { canAttempt, getRemainingMs } from '../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const navigate = useNavigate()

  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 8
  const nameValid = displayName.trim().length >= 2
  const formValid = emailValid && passwordValid && nameValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formValid) {
      setError('Revisa los campos: nombre (mín. 2 caracteres), correo válido y contraseña (mín. 8 caracteres).')
      return
    }

    if (!canAttempt('register')) {
      const mins = Math.ceil(getRemainingMs('register') / 60000)
      setBlocked(true)
      setError(`Demasiados intentos. Intenta de nuevo en ${mins} min.`)
      return
    }

    try {
      await register(email, password, displayName)
      navigate('/login')
    } catch (err: any) {
      setError(err?.message || 'Error creando cuenta')
    }
  }

  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Crear cuenta</h2>
            <p className="section-copy">Regístrate para agendar y consultar tus reservas.</p>
          </div>
          <div className="card contact-card">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field">
                  <label htmlFor="register-name">Nombre</label>
                  <input
                    id="register-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    minLength={2}
                    aria-invalid={Boolean(displayName) && !nameValid}
                    aria-describedby={displayName && !nameValid ? 'register-name-error' : undefined}
                    required
                  />
                  {displayName && !nameValid && <small className="field-error field-hint" id="register-name-error">Mínimo 2 caracteres.</small>}
                </div>
                <div className="field">
                  <label htmlFor="register-email">Correo</label>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(email) && !emailValid}
                    aria-describedby={email && !emailValid ? 'register-email-error' : undefined}
                    required
                  />
                  {email && !emailValid && <small className="field-error field-hint" id="register-email-error">Correo no válido.</small>}
                </div>
                <div className="field">
                  <label htmlFor="register-password">Contraseña</label>
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    aria-invalid={Boolean(password) && !passwordValid}
                    aria-describedby={password && !passwordValid ? 'register-password-error' : undefined}
                    required
                  />
                  {password && !passwordValid && <small className="field-error field-hint" id="register-password-error">Mínimo 8 caracteres.</small>}
              </div>
              {error && <div className="field field-error">{error}</div>}
              <div className="field"><button className="btn btn-primary" disabled={blocked || !formValid}>Crear cuenta</button></div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
