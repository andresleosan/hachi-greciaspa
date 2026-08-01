import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { createReserva, SlotTakenError, ReservaError } from '../services/reservas'
import type { ReservaStatus } from '../types'

type Servicio = {
  id: string
  name: string
  description?: string
  durationMin?: number
  category?: string
  active?: boolean
}

const STATUS_LABELS: Record<ReservaStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

export default function Reservar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselect = searchParams.get('service')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; name: string; date: string; time: string } | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoadingCatalog(true)
      try {
        const q = query(
          collection(firebaseDb, 'servicios'),
          where('active', '==', true),
          orderBy('order', 'asc')
        )
        const snap = await getDocs(q)
        const arr: Servicio[] = []
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }))
        if (mounted) {
          setServicios(arr)
          if (preselect && arr.some((s) => s.id === preselect)) {
            setServiceId(preselect)
          } else if (arr.length > 0) {
            setServiceId(arr[0].id)
          }
        }
      } catch (e) {
        if (mounted) setServicios([])
      } finally {
        if (mounted) setLoadingCatalog(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [preselect])

  const minDate = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!user) {
      setError('Debes iniciar sesión para reservar.')
      return
    }
    if (!serviceId || !date || !timeSlot) {
      setError('Completa servicio, fecha y horario.')
      return
    }

    const servicio = servicios.find((s) => s.id === serviceId)
    if (!servicio) {
      setError('Servicio inválido.')
      return
    }

    setSubmitting(true)
    try {
      const id = await createReserva({
        userId: user.uid,
        userName: profile?.displayName || user.displayName || null,
        userEmail: user.email || null,
        serviceId: servicio.id,
        serviceName: servicio.name,
        price: null,
        date,
        timeSlot,
        durationMin: servicio.durationMin || 60,
        notes: notes.trim() || null,
      })
      setSuccess({ id, name: servicio.name, date, time: timeSlot })
    } catch (e: any) {
      if (e instanceof SlotTakenError) setError(e.message)
      else if (e instanceof ReservaError) setError(e.message)
      else setError(e?.message || 'No se pudo crear la reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute>
      <div>
        <Header />
        <main>
          <section className="section container">
            <div className="section-heading">
              <h2>Reservar cita</h2>
              <p className="section-copy">
                Elegí el servicio para tu peludo y un horario disponible.
                Te pediremos confirmación por correo.
              </p>
            </div>

            {success ? (
              <div className="card contact-card">
                <div className="field">
                  <h3>✅ Reserva registrada</h3>
                  <p>
                    <strong>{success.name}</strong> · {success.date} a las {success.time}
                  </p>
                  <p>
                    Estado: <em>{STATUS_LABELS.pending}</em>. Te contactaremos para confirmar.
                  </p>
                  <div className="field">
                    <Link className="btn btn-primary" to="/dashboard">Ver mis reservas</Link>
                    <Link className="btn btn-ghost" to="/reservar" onClick={() => setSuccess(null)}>Agendar otra</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card contact-card">
                {loadingCatalog && <p>Cargando servicios…</p>}
                {!loadingCatalog && servicios.length === 0 && (
                  <div className="field field-error">
                    No hay servicios publicados. Vuelve más tarde o contáctanos directamente.
                  </div>
                )}
                {servicios.length > 0 && (
                  <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="field">
                      <label htmlFor="svc">Servicio</label>
                      <select
                        id="svc"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        disabled={submitting}
                      >
                        {servicios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}{s.durationMin ? ` · ${s.durationMin} min` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-grid">
                      <div className="field">
                        <label htmlFor="date">Fecha</label>
                        <input
                          id="date"
                          type="date"
                          min={minDate}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="time">Horario</label>
                        <input
                          id="time"
                          type="time"
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="notes">Notas (opcional)</label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tamaño de tu perrito, alergias, observaciones…"
                        disabled={submitting}
                      />
                    </div>

                    {error && <div className="field field-error">{error}</div>}

                    <div className="field">
                      <button className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Enviando…' : 'Reservar cita'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  )
}
