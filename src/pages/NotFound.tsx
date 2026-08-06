import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function NotFound() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container not-found">
          <h1 className="not-found__title">404</h1>
          <p className="section-copy not-found__copy">La página que buscas no existe o fue movida.</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
