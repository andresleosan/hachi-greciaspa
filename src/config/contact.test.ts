import { describe, expect, it } from 'vitest'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from './contact'

describe('WhatsApp contact contract', () => {
  it('exposes the real display number and QR URL', () => {
    expect(WHATSAPP_DISPLAY).toBe('+52 55 7887 5525')
    expect(WHATSAPP_URL).toBe('https://wa.me/525578875525?src=qr')
  })
})
