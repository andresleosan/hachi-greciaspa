import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SCHEDULE, TEAM, FAQS } from './data'
import Reveal from './Reveal'

export function ScheduleSectionLuxe() {
  return (
    <section className="sl-schedule" aria-labelledby="horarios-luxe-title">
      <div className="sl-schedule-inner">
        <Reveal>
          <p className="sl-eyebrow">Horarios</p>
          <h2 id="horarios-luxe-title">Estamos aquí para tu peludo.</h2>
          <p className="sl-schedule-sub">
            Cada momento del día tiene su ritual. Elige el tuyo y reserva con anticipación.
          </p>
        </Reveal>
        <div>
          {SCHEDULE.map((row, i) => (
            <Reveal as="div" key={row.label + i} delay={i * 40} className="sl-schedule-row">
              <strong>{row.label}</strong>
              <span>{row.days}</span>
              <em>{row.hours}</em>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TeamSectionLuxe() {
  return (
    <section className="sl-team" aria-labelledby="equipo-luxe-title">
      <div className="sl-team-inner">
        <Reveal>
          <p className="sl-eyebrow">El equipo</p>
          <h2 id="equipo-luxe-title">Manos que saben.</h2>
        </Reveal>
        <div className="sl-team-list">
          {TEAM.map((member, i) => (
            <Reveal as="div" key={member.name} delay={i * 60} className="sl-team-row">
              <span className="sl-team-name">{member.name}</span>
              <span className="sl-team-role">{member.role}</span>
              <span className="sl-team-arrow" aria-hidden="true">
                →
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FAQSectionLuxe() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="sl-faq" aria-labelledby="faq-luxe-title">
      <div className="sl-faq-inner">
        <Reveal>
          <p className="sl-eyebrow">Preguntas frecuentes</p>
          <h2 id="faq-luxe-title">Antes de tu visita.</h2>
        </Reveal>
        <div>
          {FAQS.map(([q, a], i) => (
            <Reveal as="div" key={q} delay={i * 40} className="sl-faq-item">
              <div data-open={open === i}>
                <button
                  type="button"
                  className="sl-faq-q"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {q}
                  <span aria-hidden="true">+</span>
                </button>
                <div className="sl-faq-a">
                  <div>
                    <p>{a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTASectionLuxe() {
  return (
    <section className="sl-cta" aria-labelledby="cta-luxe-title">
      <div className="sl-cta-inner">
        <p className="sl-eyebrow">Tu próxima visita</p>
        <h2 id="cta-luxe-title">El ritual comienza con una reserva.</h2>
        <p>
          Baños · Grooming · Guardería · Pensión · Spa. Respuesta en menos de una hora,
          todos los días de 08:00 am a 07:00 pm.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link className="sl-btn sl-btn--primary" to="/reservar">
            Agendar cita ahora
          </Link>
          <Link className="sl-btn" to="/contacto">
            Escribirnos
          </Link>
        </div>
        <p className="sl-cta-meta">Lun – Dom · 08:00 am – 07:00 pm</p>
      </div>
    </section>
  )
}
