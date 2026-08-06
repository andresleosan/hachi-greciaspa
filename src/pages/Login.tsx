import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { signIn } from '../services/auth'
import { canAttempt, getRemainingMs } from '../utils/rateLimit'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canAttempt('login')) {
      const mins = Math.ceil(getRemainingMs('login') / 60000)
      setBlocked(true)
      setError(`Demasiados intentos. Intenta de nuevo en ${mins} min.`)
      return
    }

    try {
      await signIn(email, password)
      navigate(nextPath)
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión')
    }
  }

  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Iniciar sesión</h2>
            <p className="section-copy">Accede con tu cuenta para gestionar reservas y clientes.</p>
          </div>
          <div className="card contact-card">
            <form className="contact-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="login-email">Correo</label>
                  <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="login-password">Contraseña</label>
                  <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <div className="field field-error">{error}</div>}
              <div className="field">
                <button className="btn btn-primary" disabled={blocked}>Entrar</button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
