import React, { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { firebaseDb } from '../services/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function Contacto() {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!nombre.trim() || !correo.trim() || !mensaje.trim()) {
      setError('Completa nombre, correo y mensaje.')
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(firebaseDb, 'mensajes'), {
        name: nombre.trim(),
        email: correo.trim(),
        phone: telefono.trim() || null,
        message: mensaje.trim(),
        createdAt: serverTimestamp(),
        read: false,
      })
      setSuccess(true)
      setNombre('')
      setTelefono('')
      setCorreo('')
      setMensaje('')
    } catch (e: any) {
      setError(e?.message || 'No se pudo enviar el mensaje. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Contacto</h2>
            <p className="section-copy">Escríbenos para agendar o solicitar más información.</p>
          </div>

          <div className="contact-layout">
            <form className="contact-card contact-form card" onSubmit={handleSubmit}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="nombre">Nombre</label>
                  <input id="nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={submitting} />
                </div>
                <div className="field">
                  <label htmlFor="telefono">Teléfono</label>
                  <input id="telefono" name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={submitting} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="correo">Correo</label>
                <input id="correo" name="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={submitting} />
              </div>
              <div className="field">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea id="mensaje" name="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={submitting} />
              </div>

              {success && <div className="field"><p className="field-success">Mensaje enviado correctamente. Te contactaremos pronto.</p></div>}
              {error && <div className="field field-error">{error}</div>}

              <div className="field">
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Enviando…' : 'Enviar mensaje'}
                </button>
              </div>
            </form>

            <aside className="map-card card" id="ubicacion">
              <div className="map-canvas">
                <div className="map-pin"></div>
              </div>
              <p className="map-caption">Estamos en Roma Norte, CDMX</p>

              <div className="contact-info" id="horarios">
                <h4>Horarios</h4>
                <ul>
                  <li>Apertura: 08:00 — 19:00</li>
                  <li>Guardería: Lun–Vie 08:00 — 18:00</li>
                  <li>Spa: Lun–Vie 09:00 — 18:30; Sáb 09:00 — 17:00; Dom 10:00 — 16:00</li>
                  <li>Pensión: Check-in 11:00 am — Check-out 09:00 am</li>
                  <li>Tiempo por cita: entre 1 y 2 horas</li>
                </ul>

                <h4>Tarifas principales</h4>
                <ul>
                  <li>Guardería mensual (Lun–Vie 08:00–18:00): <strong>$3,500 MXN</strong></li>
                  <li>Pensión: <strong>$300 MXN</strong> (temporada baja) / <strong>$380 MXN</strong> (temporada alta)</li>
                  <li>Baños y Grooming: precio variable por peso y tipo de pelo (ver lista de precios)</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
