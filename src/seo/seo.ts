export const SITE_URL = 'https://hachi-greciaspa.vercel.app'
export const SEO_IMAGE_URL = `${SITE_URL}/hachi-greciaspa.png`

export interface SeoConfig {
  title: string
  description: string
  canonicalPath: string
  indexable: boolean
}

const publicSeo: Record<string, Omit<SeoConfig, 'canonicalPath' | 'indexable'>> = {
  '/': {
    title: 'Hachi & Grecia Spa | Spa canino en CDMX',
    description: 'Baño, grooming, guardería, pensión y spa canino en Roma Norte, CDMX. Agenda una experiencia premium para tu perro.',
  },
  '/servicios': {
    title: 'Servicios de spa canino | Hachi & Grecia',
    description: 'Conoce nuestros servicios de baño, grooming, guardería, pensión y spa para perros en CDMX.',
  },
  '/precios': {
    title: 'Precios de grooming y spa canino | Hachi & Grecia',
    description: 'Consulta el tarifario de Spa Day, grooming, guardería, pensión y extras en Hachi & Grecia Spa, Roma Norte, CDMX. Pregunta por WhatsApp por precios variables.',
  },
  '/equipo': {
    title: 'Nuestro equipo | Hachi & Grecia Spa',
    description: 'Conoce al equipo que cuida a tu perro con experiencia, atención y productos premium.',
  },
  '/galeria': {
    title: 'Galería del spa canino | Hachi & Grecia',
    description: 'Descubre el espacio, los rituales y el cuidado que viven los perros en Hachi & Grecia Spa.',
  },
  '/contacto': {
    title: 'Contacto y horarios | Hachi & Grecia Spa',
    description: 'Encuentra Hachi & Grecia Spa en Roma Norte, CDMX. Consulta horarios y contáctanos por WhatsApp.',
  },
}

const privatePaths = ['/login', '/register', '/reservar', '/dashboard']

export function getSeoConfig(pathname: string): SeoConfig {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  const publicPage = publicSeo[normalizedPath]

  if (publicPage) {
    return { ...publicPage, canonicalPath: normalizedPath, indexable: true }
  }

  if (normalizedPath === '/inicio') {
    return {
      ...publicSeo['/'],
      canonicalPath: '/',
      indexable: false,
    }
  }

  const isPrivate = privatePaths.some((path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`))
  return {
    title: isPrivate ? 'Hachi & Grecia Spa' : 'Página no encontrada | Hachi & Grecia Spa',
    description: 'Hachi & Grecia Spa, cuidado premium para perros en CDMX.',
    canonicalPath: normalizedPath,
    indexable: false,
  }
}
