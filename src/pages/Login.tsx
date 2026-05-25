import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Login() {
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
            <form className="contact-form">
              <div className="field"><label>Correo</label><input type="email" /></div>
              <div className="field"><label>Contraseña</label><input type="password" /></div>
              <div className="field"><button className="btn btn-primary">Entrar</button></div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
