import { describe, expect, it } from 'vitest'

import {
  BRAND_ASSETS,
  GALLERY_ASSETS,
  SERVICE_ASSETS,
  STORY_ASSETS,
  publicAsset,
} from './assets'

const LEGACY_ASSET_NAMES = ['tl.png', 'tr.png', 'bl.png', 'br.png', 'hachi-greciaspa.png']

describe('manifiesto de assets oficiales', () => {
  it('expone las cuatro escenas de storytelling', () => {
    expect(STORY_ASSETS).toHaveLength(4)
  })

  it('expone los cinco servicios oficiales', () => {
    expect(SERVICE_ASSETS).toHaveLength(5)
  })

  it('expone diez entradas de galería sin assets legacy', () => {
    expect(GALLERY_ASSETS).toHaveLength(10)
    const serializedAssets = JSON.stringify({ STORY_ASSETS, SERVICE_ASSETS, GALLERY_ASSETS })

    for (const legacyName of LEGACY_ASSET_NAMES) {
      expect(serializedAssets).not.toContain(legacyName)
    }
  })

  it('incluye logo y favicon en el grupo de marca', () => {
    expect(BRAND_ASSETS.logo).toBe('Logo.png')
    expect(BRAND_ASSETS.favicon).toBe('FavIcon.png')
  })

  it('construye una ruta pública codificada y rechaza rutas inseguras', () => {
    expect(publicAsset('01 · El punto de partida.png')).toBe(
      '/img/01%20%C2%B7%20El%20punto%20de%20partida.png',
    )
    expect(() => publicAsset('../secreto.png')).toThrow()
    expect(() => publicAsset('/externo.png')).toThrow()
    expect(() => publicAsset('https://example.com/logo.png')).toThrow()
  })
})
