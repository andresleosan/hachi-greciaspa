export interface DashboardMetricBooking {
  date: string
  serviceName?: string | null
}

export interface DashboardMetrics {
  citasHoy: number
  serviciosHoy: number
}

export function calculateDashboardMetrics(
  bookings: DashboardMetricBooking[],
  today: string,
): DashboardMetrics {
  const todayBookings = bookings.filter((booking) => booking.date === today)
  const services = new Set(
    todayBookings
      .map((booking) => booking.serviceName?.trim())
      .filter((serviceName): serviceName is string => Boolean(serviceName)),
  )

  return {
    citasHoy: todayBookings.length,
    serviciosHoy: services.size,
  }
}
