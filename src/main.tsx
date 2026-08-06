import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ObservabilityBoundary } from './components/ObservabilityBoundary'
import { initSentry } from './observability/sentry'
import './styles/index.css'

initSentry()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ObservabilityBoundary>
      <App />
    </ObservabilityBoundary>
  </React.StrictMode>,
)
