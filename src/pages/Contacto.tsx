import React, { useState } from 'react'
import PublicLuxeShell from '../components/PublicLuxeShell'
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
    <PublicLuxeShell>
      <section className="sl-contact sl-page-section" aria-labelledby="contacto-title">
        <header className="sl-contact-head">
          <p className="sl-eyebrow">Contacto</p>
          <h1 id="contacto-title">Hablemos del próximo ritual.</h1>
          <p>Escríbenos para agendar o solicitar más información.</p>
        </header>

        <div className="sl-contact-grid">
          <form className="sl-contact-card" onSubmit={handleSubmit}>
            <div className="sl-contact-fields">
              <label className="sl-contact-field" htmlFor="nombre">Nombre
                <input id="nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={submitting} />
              </label>
              <label className="sl-contact-field" htmlFor="telefono">Teléfono
                <input id="telefono" name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={submitting} />
              </label>
            </div>
            <label className="sl-contact-field" htmlFor="correo">Correo
              <input id="correo" name="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={submitting} />
            </label>
            <label className="sl-contact-field" htmlFor="mensaje">Mensaje
              <textarea id="mensaje" name="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={submitting} />
            </label>

            {success && <p className="field-success" aria-live="polite">Mensaje enviado correctamente. Te contactaremos pronto.</p>}
            {error && <p className="field-error" role="alert">{error}</p>}

            <button className="sl-btn sl-btn--primary" type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>

          <aside className="sl-contact-card sl-contact-info" id="ubicacion">
            <div className="sl-contact-map" aria-hidden="true">
              <div className="map-pin"></div>
            </div>
            <p>Estamos en Roma Norte, CDMX</p>

            <div id="horarios">
              <h2>Horarios</h2>
              <ul>
                <li>Apertura: 08:00 — 19:00</li>
                <li>Guardería: Lun–Vie 08:00 — 18:00</li>
                <li>Spa: Lun–Vie 09:00 — 18:30; Sáb 09:00 — 17:00; Dom 10:00 — 16:00</li>
                <li>Pensión: Check-in 11:00 am — Check-out 09:00 am</li>
                <li>Tiempo por cita: entre 1 y 2 horas</li>
              </ul>

              <h2>Tarifas principales</h2>
              <ul>
                <li>Guardería mensual (Lun–Vie 08:00–18:00): <strong>$3,500 MXN</strong></li>
                <li>Pensión: <strong>$300 MXN</strong> (temporada baja) / <strong>$380 MXN</strong> (temporada alta)</li>
                <li>Baños y Grooming: precio variable por peso y tipo de pelo (ver lista de precios)</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </PublicLuxeShell>
  )
}
