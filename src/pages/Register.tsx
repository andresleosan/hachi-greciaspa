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
                <label>Nombre</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} required />
                {displayName && !nameValid && <small style={{ color: 'var(--color-danger, #c0392b)' }}>Mínimo 2 caracteres.</small>}
              </div>
              <div className="field">
                <label>Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                {email && !emailValid && <small style={{ color: 'var(--color-danger, #c0392b)' }}>Correo no válido.</small>}
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                {password && !passwordValid && <small style={{ color: 'var(--color-danger, #c0392b)' }}>Mínimo 8 caracteres.</small>}
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
