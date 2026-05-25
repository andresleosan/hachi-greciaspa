import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { register } from '../services/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await register(email, password, displayName, 'client')
      navigate('/dashboard')
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
              <div className="field"><label>Nombre</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
              <div className="field"><label>Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              {error && <div className="field field-error">{error}</div>}
              <div className="field"><button className="btn btn-primary">Crear cuenta</button></div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
