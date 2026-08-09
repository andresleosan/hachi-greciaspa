import { describe, expect, it } from 'vitest'

import dashboard from './DashboardPage.tsx?raw'

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
    expect(dashboard).not.toContain('dashboard-sidebar')
    expect(dashboard).not.toContain('dashboard-topbar')
  })
})
