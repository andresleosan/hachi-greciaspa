// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const empleados = readFileSync(new URL('./DashboardEmpleados.tsx', import.meta.url), 'utf8')
const luxeStyles = readFileSync(new URL('../styles/luxe.css', import.meta.url), 'utf8')

describe('DashboardEmpleados AdminShell migration', () => {
  it('uses the shared shell while preserving employee administration', () => {
    expect(empleados).toContain("from '../components/AdminShell'")
    expect(empleados).toContain('<AdminShell title="Empleados" subtitle="Equipo, servicios y horarios">')
    expect(empleados).not.toContain('<h1>Administrar empleados</h1>')
    expect(empleados).toContain('<h2>Administrar empleados</h2>')
    expect(empleados).toContain('Administrar empleados')
    expect(empleados).toContain('Nuevo empleado')
    expect(empleados).toContain('<table className="empleados-table">')
    expect(empleados).toContain('Desactivar')
    expect(empleados).toContain('role="alert"')
    expect(empleados).toContain('role="status"')
    expect(empleados).not.toContain('dashboard-layout')
    expect(empleados).not.toContain('dashboard-sidebar')
    expect(empleados).not.toContain('dashboard-topbar')
    expect(empleados).not.toContain('sidebar-toggle')
  })

  it('keeps employee panels and mobile table styling scoped to the shell', () => {
    expect(luxeStyles).toContain('.admin-shell .empleados-page')
    expect(luxeStyles).toContain('.admin-shell .empleados-table-wrap')
    expect(luxeStyles).toContain('.admin-shell .empleados-status--active')
    expect(luxeStyles).toContain('.admin-shell .empleados-status--inactive')
  })
})
