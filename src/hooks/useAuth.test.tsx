// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const useAuthSource = readFileSync(new URL('./useAuth.tsx', import.meta.url), 'utf8')

describe('useAuth safe feedback contract', () => {
  it('uses a generic profile error without exposing SDK exception text', () => {
    expect(useAuthSource).not.toContain('e?.message')
    expect(useAuthSource).not.toContain('error.message')
    expect(useAuthSource).toContain('No se pudo cargar el perfil de usuario.')
  })
})
