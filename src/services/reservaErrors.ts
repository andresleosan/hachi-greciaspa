function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined

  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') return undefined
  return code.split('/').pop()
}

export function mapReservaError(error: unknown): string {
  switch (errorCode(error)) {
    case 'failed-precondition':
      return 'La fecha y el horario ya no están disponibles. Elegí otro turno.'
    case 'permission-denied':
      return 'No podés reagendar esta reserva o su estado ya no lo permite.'
    case 'invalid-argument':
      return 'Revisá la fecha y el horario ingresados.'
    default:
      return 'No se pudo reagendar la reserva. Intentá nuevamente.'
  }
}
