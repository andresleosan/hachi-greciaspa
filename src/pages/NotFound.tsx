import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function NotFound() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container" style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
          <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>404</h1>
          <p className="section-copy" style={{ marginBottom: '1.5rem' }}>La página que buscas no existe o fue movida.</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
