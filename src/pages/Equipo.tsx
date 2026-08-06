import React from 'react'
import PublicLuxeShell from '../components/PublicLuxeShell'
import { TEAM } from '../landing/data'

export default function Equipo() {
  return (
    <PublicLuxeShell>
      <section className="sl-team sl-page-section" aria-labelledby="equipo-title">
        <div className="sl-team-inner">
          <p className="sl-eyebrow">El equipo</p>
          <h1 id="equipo-title">Manos que saben.</h1>
          <p className="sl-page-lede">Profesionales certificados que cuidan a tu mascota con amor.</p>
          <div className="sl-team-list">
            {TEAM.map((member) => (
              <article className="sl-team-row" key={member.name}>
                <span className="sl-team-name">{member.name}</span>
                <span className="sl-team-role">{member.role}</span>
                <span className="sl-team-arrow" aria-hidden="true">→</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLuxeShell>
  )
}
