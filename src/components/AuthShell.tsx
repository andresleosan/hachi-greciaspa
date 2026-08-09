import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_ASSETS, publicAsset } from '../landing/assets'

type AuthShellProps = {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
  alternateAction: ReactNode
}

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  alternateAction,
}: AuthShellProps) {
  return (
    <div className="auth-shell">
      <main className="auth-shell__layout">
        <aside className="auth-shell__brand-panel" aria-label="Hachi & Grecia Spa">
          <div>
            <Link className="auth-shell__logo" to="/" aria-label="Hachi & Grecia Spa — inicio">
              <img src={publicAsset(BRAND_ASSETS.logo)} alt="Hachi & Grecia Spa" />
            </Link>
            <p className="auth-shell__brand-kicker">Hachi &amp; Grecia · Spa canino</p>
          </div>
          <div className="auth-shell__brand-copy">
            <p className="auth-shell__eyebrow">Cuidado con intención</p>
            <h1>Un espacio para volver a lo esencial.</h1>
            <p>Gestiona cada visita con la misma calma y atención que ponemos en cada ritual.</p>
          </div>
          <span className="auth-shell__brand-mark" aria-hidden="true">HG</span>
        </aside>

        <section className="auth-shell__form-panel" aria-labelledby="auth-shell-title">
          <div className="auth-shell__form-heading">
            <p className="auth-shell__eyebrow">{eyebrow}</p>
            <h2 id="auth-shell-title">{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-shell__alternate">{alternateAction}</div>
        </section>
      </main>
    </div>
  )
}
