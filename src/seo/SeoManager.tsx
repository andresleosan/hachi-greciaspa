import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSeoConfig, SEO_IMAGE_URL, SITE_URL } from './seo'

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  element.href = href
}

export default function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const config = getSeoConfig(pathname)
    const canonicalUrl = `${SITE_URL}${config.canonicalPath}`

    document.title = config.title
    upsertMeta('description', config.description)
    upsertMeta('robots', config.indexable ? 'index, follow' : 'noindex, nofollow')
    upsertMeta('og:title', config.title, 'property')
    upsertMeta('og:description', config.description, 'property')
    upsertMeta('og:type', 'website', 'property')
    upsertMeta('og:url', canonicalUrl, 'property')
    upsertMeta('og:image', SEO_IMAGE_URL, 'property')
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', config.title)
    upsertMeta('twitter:description', config.description)
    upsertMeta('twitter:image', SEO_IMAGE_URL)
    upsertCanonical(canonicalUrl)
  }, [pathname])

  return null
}
