import * as Sentry from '@sentry/react'
import type { ReactNode } from 'react'

function ErrorFallback() {
  return (
    <main className="container section" role="alert">
      Ocurrió un error inesperado.
    </main>
  )
}

export function ObservabilityBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      {children}
    </Sentry.ErrorBoundary>
  )
}
