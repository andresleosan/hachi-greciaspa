import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/landing/CinematicHero.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles/luxe.css', import.meta.url), 'utf8')

describe('cinematic hero timeline', () => {
  it('keeps the final CTA scene visible through the end of the pin', () => {
    expect(source).not.toMatch(/tl\.to\(last,\s*\{\s*clipPath:\s*'inset\(0 0 100% 0\)'/)
    expect(source).not.toMatch(/tl\.to\(last\.querySelector\('\.sl-scene-inner'\)/)
  })

  it('uses the shortened pin distance for scene transitions', () => {
    expect(source).toMatch(/end:\s*'\+=260%'/)
  })

  it('activates and removes the animated hero layout with the motion runtime', () => {
    expect(source).toMatch(/root\.current\.classList\.add\('sl-hero--animated'\)/)
    expect(source).toMatch(/root\.current\?\.classList\.remove\('sl-hero--animated'\)/)
  })

  it('overlaps scenes only in the animated layout and keeps the default flow', () => {
    expect(styles).toMatch(/\.sl-hero--animated\s*\{[\s\S]*?height:\s*100svh/)
    expect(styles).toMatch(/\.sl-hero--animated \.sl-scene\s*\{[\s\S]*?position:\s*absolute/)
    expect(styles).toMatch(/\.sl-scene\s*\{[\s\S]*?position:\s*relative/)
  })
})
