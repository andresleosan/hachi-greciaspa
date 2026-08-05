import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/landing/CinematicHero.tsx', import.meta.url), 'utf8')

describe('cinematic hero timeline', () => {
  it('keeps the final CTA scene visible through the end of the pin', () => {
    expect(source).not.toMatch(/tl\.to\(last,\s*\{\s*clipPath:\s*'inset\(0 0 100% 0\)'/)
    expect(source).not.toMatch(/tl\.to\(last\.querySelector\('\.sl-scene-inner'\)/)
  })
})
