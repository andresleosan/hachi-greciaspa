import { describe, expect, it } from 'vitest'
import { getSeoConfig } from './seo'

describe('SEO route metadata', () => {
  it('returns indexable metadata and root canonical for the landing', () => {
    expect(getSeoConfig('/')).toMatchObject({
      title: 'Hachi & Grecia Spa | Spa canino en CDMX',
      canonicalPath: '/',
      indexable: true,
    })
  })

  it('keeps private routes out of search indexes', () => {
    expect(getSeoConfig('/dashboard/agenda')).toMatchObject({
      indexable: false,
      canonicalPath: '/dashboard/agenda',
    })
    expect(getSeoConfig('/login').indexable).toBe(false)
    expect(getSeoConfig('/reservar').indexable).toBe(false)
  })

  it('canonicalizes the legacy inicio route to the landing', () => {
    expect(getSeoConfig('/inicio')).toMatchObject({
      canonicalPath: '/',
      indexable: false,
    })
  })

  it('describes the public pricing and WhatsApp contact channels', () => {
    expect(getSeoConfig('/precios').description).toBe(
      'Consulta el tarifario de Spa Day, grooming, guardería, pensión y extras en Hachi & Grecia Spa, Roma Norte, CDMX. Pregunta por WhatsApp por precios variables.',
    )
    expect(getSeoConfig('/contacto').description).toBe(
      'Encuentra Hachi & Grecia Spa en Roma Norte, CDMX. Consulta horarios y contáctanos por WhatsApp.',
    )
  })
})
