import { describe, expect, it } from 'vitest'
import { calculateDashboardMetrics } from './dashboardMetrics'

describe('dashboard metrics', () => {
  it('counts appointments by appointment date, not creation date', () => {
    const metrics = calculateDashboardMetrics(
      [
        { date: '2026-08-05', serviceName: 'Banho' },
        { date: '2026-08-05', serviceName: 'Banho' },
        { date: '2026-08-06', serviceName: 'Tosa' },
      ],
      '2026-08-05',
    )

    expect(metrics).toEqual({ citasHoy: 2, serviciosHoy: 1 })
  })

  it('ignores empty service names when counting distinct services', () => {
    const metrics = calculateDashboardMetrics(
      [
        { date: '2026-08-05', serviceName: '' },
        { date: '2026-08-05', serviceName: '  Baño  ' },
        { date: '2026-08-05', serviceName: 'Baño' },
      ],
      '2026-08-05',
    )

    expect(metrics).toEqual({ citasHoy: 3, serviciosHoy: 1 })
  })
})
