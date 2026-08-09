import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/landing/HeaderGlass.tsx', import.meta.url), 'utf8')

describe('header branding', () => {
  it('keeps the official logo and adds the clean wordmark', () => {
    expect(source).toMatch(/BRAND_ASSETS\.logo/)
    expect(source).toMatch(/sl-brand-mark/)
    expect(source).toMatch(/sl-brand-wordmark/)
    expect(source).toMatch(/Hachi &amp; Grecia/)
    expect(source).toMatch(/className="sl-nav-link" to="\/"[^>]*>Inicio<\/Link>/)
    expect(source).toMatch(/scrollToTop/)
    expect(source).toMatch(/onClick=\{scrollToTop\}/)
    expect(source).not.toMatch(/BRAND_ASSETS\.favicon/)
    expect(source).not.toMatch(/sl-header-whatsapp/)
  })
})
