import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import HeaderGlass from '../landing/HeaderGlass'
import FooterGlass from '../landing/FooterGlass'
import AuroraBackground from '../landing/AuroraBackground'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { createReserva, SlotTakenError, ReservaError } from '../services/reservas'
import { format, addDays, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

type Servicio = {
  id: string
  name: string
  description?: string
  durationMin?: number
  category?: string
  active?: boolean
}

const STEPS = ['Servicio', 'Fecha', 'Hora', 'Confirmación'] as const

function buildSlots(date: string): string[] {
  const d = parseISO(date)
  const weekday = d.getDay()
  const startHour = weekday === 0 ? 10 : 9
  const endHour = weekday === 0 ? 16 : weekday === 6 ? 17 : 18
  const slots: string[] = []
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      if (h === endHour && m > 0) continue
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

function nextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(new Date(), i))
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="mb-10">
      <div className="sl-booking-stepbar">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`sl-booking-step-line${i <= step ? ' is-complete' : ''}`} />
            <span className={`sl-booking-step-label${i <= step ? ' is-complete' : ''}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="sl-eyebrow">
        Paso {step + 1} de {STEPS.length}
      </p>
    </div>
  )
}

function WizardPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sl-booking-panel">
      {children}
    </div>
  )
}

export default function Reservar() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const preselect = searchParams.get('service')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; name: string; date: string; time: string } | null>(null)

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

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
    return () => {
      mounted = false
    }
  }, [preselect])

  const days = useMemo(() => nextDays(14), [])
  const slots = useMemo(() => (date ? buildSlots(date) : []), [date])

  const selectedService = servicios.find((s) => s.id === serviceId)

  function goNext() {
    setError(null)
    if (step === 0 && !serviceId) {
      setError('Elige un servicio para continuar.')
      return
    }
    if (step === 1 && !date) {
      setError('Elige una fecha para continuar.')
      return
    }
    if (step === 2 && !timeSlot) {
      setError('Elige un horario para continuar.')
      return
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

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

  const fade = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 26, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -18, filter: 'blur(6px)' } }
  const fadeDur = reduceMotion ? 0 : 0.5

  return (
    <ProtectedRoute>
      <div className="luxe sl-page-shell">
        <AuroraBackground />
        <HeaderGlass />
        <main className="sl-booking-main">
          <div className="sl-booking-heading">
            <p className="sl-eyebrow">Reserva</p>
            <h1 className="sl-booking-title">
              Tu ritual, agendado.
            </h1>
            <p className="sl-booking-subtitle">
              Cuatro pasos y tu mejor amigo tiene su cita.
            </p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {success ? (
              <motion.div key="success" {...fade} transition={{ duration: fadeDur, ease: [0.22, 1, 0.36, 1] }}>
                <WizardPanel>
                  <div className="sl-booking-success">
                    <div className="sl-booking-success-mark" aria-hidden="true">
                      ✓
                    </div>
                    <h2 className="sl-booking-success-title">
                      Reserva registrada
                    </h2>
                    <p className="sl-booking-success-copy">
                      <strong>{success.name}</strong>
                      <br />
                      {format(parseISO(success.date), "EEEE d 'de' MMMM", { locale: es })} a las {success.time}
                    </p>
                    <p className="sl-booking-success-status">
                      Estado: <em>Pendiente</em>. Te contactaremos para confirmar.
                    </p>
                    <div className="sl-booking-success-actions">
                      <Link className="sl-btn sl-btn--primary" to="/dashboard">
                        Ver mis reservas
                      </Link>
                      <button
                        type="button"
                        className="sl-btn"
                        onClick={() => {
                          setSuccess(null)
                          setStep(0)
                          setTimeSlot('')
                        }}
                      >
                        Agendar otra
                      </button>
                    </div>
                  </div>
                </WizardPanel>
              </motion.div>
            ) : (
              <motion.div key={`step-${step}`} {...fade} transition={{ duration: fadeDur, ease: [0.22, 1, 0.36, 1] }}>
                <WizardPanel>
                  <StepHeader step={step} />

                  {loadingCatalog && (
                    <p className="sl-booking-loading">Cargando servicios…</p>
                  )}
                  {!loadingCatalog && servicios.length === 0 && (
                    <p className="sl-booking-error">
                      No hay servicios publicados. Vuelve más tarde o contáctanos directamente.
                    </p>
                  )}

                  {servicios.length > 0 && step === 0 && (
                    <div role="radiogroup" aria-label="Servicio">
                      <div className="sl-booking-options">
                        {servicios.map((s) => {
                          const active = s.id === serviceId
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                setServiceId(s.id)
                                setError(null)
                              }}
                              className={`sl-booking-option${active ? ' is-active' : ''}`}
                            >
                              <span>
                                <strong>{s.name}</strong>
                              </span>
                              {s.durationMin ? (
                                <span className="sl-booking-option-meta">
                                  {s.durationMin} min
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {servicios.length > 0 && step === 1 && (
                    <div role="radiogroup" aria-label="Fecha">
                      <p className="sl-booking-kicker">
                        Próximos 14 días
                      </p>
                      <div className="sl-booking-date-grid">
                        {days.map((d) => {
                          const iso = format(d, 'yyyy-MM-dd')
                          const active = iso === date
                          return (
                            <button
                              key={iso}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                setDate(iso)
                                setTimeSlot('')
                                setError(null)
                              }}
                              className={`sl-booking-date-option${active ? ' is-active' : ''}`}
                            >
                              <span className="sl-booking-date-weekday">
                                {isToday(d) ? 'Hoy' : format(d, 'EEE', { locale: es })}
                              </span>
                              <strong className="sl-booking-date-number">
                                {format(d, 'd')}
                              </strong>
                              <span className="sl-booking-date-month">
                                {format(d, 'MMM', { locale: es })}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {servicios.length > 0 && step === 2 && (
                    <div role="radiogroup" aria-label="Horario">
                      <p className="sl-booking-kicker">
                        {date ? format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }) : 'Elige un horario'}
                      </p>
                      {!date ? (
                        <p className="sl-booking-error">Primero elige la fecha.</p>
                      ) : (
                        <div className="sl-booking-slot-grid">
                          {slots.map((slot) => {
                            const active = slot === timeSlot
                            return (
                              <button
                                key={slot}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  setTimeSlot(slot)
                                  setError(null)
                                }}
                                className={`sl-booking-slot${active ? ' is-active' : ''}`}
                              >
                                {slot}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {servicios.length > 0 && step === 3 && (
                    <form onSubmit={handleSubmit}>
                      <div className="sl-booking-summary">
                        {[
                          ['Servicio', selectedService?.name ?? '—'],
                          ['Fecha', date ? format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es }) : '—'],
                          ['Horario', timeSlot || '—'],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="sl-booking-summary-row"
                          >
                            <span className="sl-booking-summary-label">
                              {label}
                            </span>
                            <strong className="sl-booking-summary-value">{value}</strong>
                          </div>
                        ))}
                      </div>

                      <label
                        htmlFor="notes"
                        className="sl-booking-label"
                      >
                        Notas (opcional)
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tamaño de tu perrito, alergias, observaciones…"
                        disabled={submitting}
                        rows={3}
                        className="sl-booking-textarea"
                      />

                      {error && (
                        <p className="sl-booking-error sl-booking-error--spaced">{error}</p>
                      )}

                      <div className="sl-booking-submit">
                        <button type="submit" className="sl-btn sl-btn--primary sl-booking-submit-button" disabled={submitting}>
                          {submitting ? 'Reservando…' : 'Confirmar reserva'}
                        </button>
                      </div>
                    </form>
                  )}

                  {error && step < 3 && (
                    <p className="sl-booking-error sl-booking-error--spaced">{error}</p>
                  )}

                  {servicios.length > 0 && step < 3 && (
                    <div className="sl-booking-navigation">
                      <button type="button" className={`sl-btn${step === 0 ? ' is-disabled' : ''}`} onClick={goBack} disabled={step === 0}>
                        Atrás
                      </button>
                      <button type="button" className="sl-btn sl-btn--primary" onClick={goNext}>
                        {step === 2 ? 'Revisar' : 'Continuar'}
                      </button>
                    </div>
                  )}
                </WizardPanel>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="sl-booking-footnote">
            ¿Ya tienes cuenta? <Link className="sl-booking-link" to="/login">Inicia sesión</Link> para ver tus citas
          </p>
        </main>
        <FooterGlass />
      </div>
    </ProtectedRoute>
  )
}
