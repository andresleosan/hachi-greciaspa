// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboard = readFileSync(new URL('./DashboardPage.tsx', import.meta.url), 'utf8')
const luxeStyles = readFileSync(new URL('../styles/luxe.css', import.meta.url), 'utf8')

describe('DashboardPage AdminShell migration', () => {
  it('uses the shared shell while preserving dashboard content contracts', () => {
    expect(dashboard).toContain("from '../components/AdminShell'")
    expect(dashboard).toContain('<AdminShell title="Dashboard" subtitle="Resumen y actividad">')
    expect(dashboard).toContain('Reservas recientes')
    expect(dashboard).toContain('Citas Hoy')
    expect(dashboard).toContain('Servicios Hoy')
    expect(dashboard).toContain('Reservas Recientes')
    expect(dashboard).toContain('Clientes Totales')
    expect(dashboard).toContain('AdminPrices')
    expect(dashboard).toContain('profileError && <p className="field-error" role="alert">')
    expect(dashboard).toContain('loading && <p role="status">Cargando...</p>')
    expect(dashboard).toContain('cancelError && <div className="field-error" role="alert">')
    expect(dashboard).not.toContain('e?.message')
    expect(dashboard).not.toContain('error?.message')
    expect(dashboard).toContain('error instanceof ReservaError')
    expect(dashboard).toContain('error.message')
    expect(dashboard).not.toContain('dashboard-sidebar')
    expect(dashboard).not.toContain('dashboard-topbar')
  })

  it('keeps light dashboard cards readable inside the admin shell', () => {
    expect(luxeStyles).toMatch(/\.admin-shell\s*\{[\s\S]*--admin-surface:\s*#ffffff;/)
    for (const selector of [
      '.admin-shell .reserva-card',
      '.admin-shell .reserva-card strong',
      '.admin-shell .reserva-card__when',
      '.admin-shell .reserva-card__meta',
      '.admin-shell .reserva-card__notes',
      '.admin-shell .reserva-card__status',
      '.admin-shell .container > h3',
      '.admin-shell .admin-prices',
      '.admin-shell .admin-prices h4',
      '.admin-shell .admin-prices h5',
      '.admin-shell .admin-prices__row strong',
      '.admin-shell .admin-prices__summary',
      '.admin-shell .admin-prices__hint',
      '.admin-shell .admin-prices__state',
      '.admin-shell .admin-prices__item small',
      '.admin-shell .field-hint',
      '.admin-shell .admin-prices .field label',
      '.admin-shell .admin-prices .field input',
      '.admin-shell .reserva-card .field label',
      '.admin-shell .reserva-card .field input',
      '.admin-shell .field-error',
      '.admin-shell .field-success',
    ]) {
      expect(luxeStyles).toContain(selector)
    }
    expect(luxeStyles).toContain('background: var(--admin-surface);')
    expect(luxeStyles).toContain('color: var(--admin-surface-ink);')
    expect(luxeStyles).toContain('color: var(--admin-surface-muted);')
    expect(luxeStyles).not.toContain('.admin-shell .metric-card')
    expect(luxeStyles).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.auth-shell__logo:hover,\s*\.auth-shell__logo:focus-visible\s*\{[\s\S]*?transform:\s*none !important;/)
  })
})
