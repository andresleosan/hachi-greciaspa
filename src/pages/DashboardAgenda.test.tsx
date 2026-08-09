// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const agenda = readFileSync(new URL('./DashboardAgenda.tsx', import.meta.url), 'utf8')
const luxeStyles = readFileSync(new URL('../styles/luxe.css', import.meta.url), 'utf8')

describe('DashboardAgenda AdminShell migration', () => {
  it('uses the shared shell while preserving agenda operations', () => {
    expect(agenda).toContain("from '../components/AdminShell'")
    expect(agenda).toContain('<AdminShell title="Agenda diaria" subtitle="Operación diaria de reservas y asignaciones.">')
    expect(agenda).toContain('agenda-date')
    expect(agenda).toContain('agenda-service')
    expect(agenda).toContain('agenda-therapist')
    expect(agenda).toContain('Reservas del día')
    expect(agenda).not.toContain('<h1>Agenda diaria</h1>')
    expect(agenda).toContain('<h2>Agenda diaria</h2>')
    expect(agenda).toContain('Sin terapeuta asignado')
    expect(agenda).toContain('role="dialog"')
    expect(agenda).toContain('aria-modal="true"')
    expect(agenda).toContain('assignmentLoadError instanceof EmpleadoError')
    expect(agenda).toContain('assignmentLoadError.message')
    expect(agenda).not.toContain('loadError instanceof Error ? loadError.message')
    expect(agenda).not.toContain('actionError instanceof Error ? actionError.message')
    expect(agenda).not.toContain('dashboard-sidebar')
    expect(agenda).not.toContain('dashboard-topbar')
    expect(agenda).not.toContain('sidebar-toggle')
  })

  it('keeps the agenda surface readable and accessible inside the shell', () => {
    expect(luxeStyles).toContain('.admin-shell .agenda-page')
    expect(luxeStyles).toContain('.admin-shell .agenda-drawer')
    expect(luxeStyles).toContain('.admin-shell .agenda-event')
    expect(luxeStyles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
