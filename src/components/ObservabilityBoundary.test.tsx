// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObservabilityBoundary } from './ObservabilityBoundary'

function ThrowingComponent(): never {
  throw new Error('render failure')
}

describe('ObservabilityBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders an accessible fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ObservabilityBoundary>
        <ThrowingComponent />
      </ObservabilityBoundary>,
    )

    expect(screen.getByRole('alert').textContent).toContain('Ocurrió un error inesperado.')
  })
})
