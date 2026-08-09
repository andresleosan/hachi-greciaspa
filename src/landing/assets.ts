import manifest from './asset-manifest.json'

export type AssetEntry = {
  file: string
  label: string
}

export const BRAND_ASSETS = {
  logo: manifest.brand.logo,
  favicon: manifest.brand.favicon,
} as const

export const STORY_ASSETS: AssetEntry[] = manifest.story
export const SERVICE_ASSETS: AssetEntry[] = manifest.services
export const GALLERY_ASSETS: AssetEntry[] = manifest.gallery

const EXTERNAL_SCHEME = /^[a-z][a-z\d+.-]*:/i

export function publicAsset(file: string): string {
  if (
    typeof file !== 'string' ||
    file.length === 0 ||
    file.startsWith('/') ||
    file.startsWith('\\') ||
    file.includes('..') ||
    file.includes('\\') ||
    EXTERNAL_SCHEME.test(file)
  ) {
    throw new Error('Asset filenames must be local, relative, and traversal-safe.')
  }

  return `/img/${encodeURI(file)}`
}
