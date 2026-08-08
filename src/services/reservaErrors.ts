function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined

  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') return undefined
  return code.split('/').pop()
}

export function mapReservaError(error: unknown): string {
  switch (errorCode(error)) {
    case 'resource-exhausted':
      return 'Se alcanzó el límite de intentos o de reservas activas. Intentá nuevamente más tarde.'
    case 'failed-precondition':
      return 'La fecha y el horario ya no están disponibles. Elegí otro turno.'
    case 'unauthenticated':
      return 'Tu sesión no es válida o expiró. Iniciá sesión para continuar.'
    case 'permission-denied':
      return 'No pudimos validar los permisos para completar esta reserva.'
    case 'invalid-argument':
      return 'Revisá los datos de la reserva e intentá nuevamente.'
    default:
      return 'No se pudo completar la reserva o el reagendado. Intentá nuevamente.'
  }
}
