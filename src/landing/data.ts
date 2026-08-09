/** Datos reales del spa — fuente única para la experiencia luxe. */

import { GALLERY_ASSETS, publicAsset } from './assets'

export const PRICING_SPA = {
  short: [
    { size: 'Mini', weight: '≤5 kg', price: '$240' },
    { size: 'Chica', weight: '≤10 kg', price: '$280' },
    { size: 'Mediana', weight: '≤15 kg', price: '$340' },
    { size: 'Mediana/Grande', weight: '≤20 kg', price: '$420' },
    { size: 'Grande', weight: '≤30 kg', price: '$550' },
  ],
  long: [
    { size: 'Mini', weight: '≤5 kg', price: '$280' },
    { size: 'Chica', weight: '≤10 kg', price: '$300' },
    { size: 'Mediana', weight: '≤15 kg', price: '$390' },
    { size: 'Mediana/Grande', weight: '≤20 kg', price: '$490' },
    { size: 'Grande', weight: '≤30 kg', price: '$690' },
  ],
}

export const EXTRAS_LIST = [
  { name: 'Aromaterapia (shampoo de aceites esenciales)', price: '$140' },
  { name: 'Mascarilla restauración crecimiento saludable y nutrición capilar', price: '$180' },
  { name: 'Mascarilla hidratación, pelaje brillante y fácil de peinar', price: '$180' },
  { name: 'Baño Prevención Bichos (Antipulgas)', price: '$140' },
  { name: 'Corte de uñas', price: '$70' },
  { name: 'Limpieza de dientes', price: '$100' },
  { name: 'Deslanado/Desanudar', price: 'Variable' },
  { name: 'Grooming (Spa + corte)', price: 'Variable' },
  { name: 'Pipeta Antipulgas', price: 'Variable' },
]

export const COMMERCIAL_NOTES = [
  'Nuestros productos son libres de sulfatos y parabenos, hipoalergénicos y cruelty free.',
  'Espacio libre de jaulas.',
  'Precios sujetos a cambio sin previo aviso, consulta términos y condiciones al agendar.',
  'Afiliados Hexalud obtienen 10% de descuento en cualquier servicio.',
]

export const SERVICE_PRICE_LABELS: Record<string, string> = {
  'spa-day': 'Desde $240',
  grooming: 'Variable',
  guarderia: '$250/día · $3,500/mes',
  pension: '$300-$380/noche',
}

export const SERVICES = [
  {
    icon: '🛁',
    title: 'Spa Day',
    desc: 'Baño profesional, aromaterapia, secado, corte de uñas, limpieza de oídos, bálsamo en patitas, hidratación de nariz, masaje y fragancia de temporada. Productos libres de sulfatos y parabenos.',
    note: 'Pelo corto · Pelo largo sin nudos',
    pricing: PRICING_SPA,
  },
  {
    icon: '✂️',
    title: 'Grooming',
    desc: 'Corte y estilismo canino profesional (Spa + corte). Atendemos todas las razas, desde Yorkies hasta Golden Retrievers.',
    note: 'Precio variable según tamaño y tipo de pelo',
    price: 'Variable',
  },
  {
    icon: '🏠',
    title: 'Guardería',
    desc: 'Tu peludo cuidado mientras trabajas. Plan mensual o eventual con alimentación, paseos y supervisión constante.',
    price: SERVICE_PRICE_LABELS.guarderia,
    note: 'Eventual: $250/día · Lun – Vie · 08:00 am – 06:00 pm',
  },
  {
    icon: '🌙',
    title: 'Pensión',
    desc: 'Alojamiento nocturno con todas las comodidades. Tu mascota como en casa.',
    price: SERVICE_PRICE_LABELS.pension,
    note: 'Temporada baja · Temporada alta: $380/noche',
  },
  {
    icon: '✨',
    title: 'Rituales Extra',
    desc: 'Completa la experiencia con tratamientos adicionales para el bienestar de tu peludo.',
    extras: EXTRAS_LIST,
  },
]

export const SCHEDULE = [
  { label: 'Guardería', days: 'Lun – Vie', hours: '08:00 am – 06:00 pm' },
  { label: 'Pensión Check-in', days: 'Lun – Dom', hours: '11:00 am' },
  { label: 'Pensión Check-out', days: 'Lun – Dom', hours: '09:00 am' },
  { label: 'Spa', days: 'Lun – Vie', hours: '09:00 am – 06:30 pm' },
  { label: 'Spa', days: 'Sáb', hours: '09:00 am – 05:00 pm' },
  { label: 'Spa', days: 'Dom', hours: '10:00 am – 04:00 pm' },
  { label: 'Apertura general', days: 'Lun – Dom', hours: '08:00 am – 07:00 pm' },
]

export const TEAM = [
  { name: 'Harold Salcedo', role: 'Fundador · Groomer · Cuidador', initials: 'HS' },
  { name: 'Daniela Padilla', role: 'Groomer · Cuidadora', initials: 'DP' },
  { name: 'Alberto González', role: 'Bañador · Cuidador', initials: 'AG' },
]

export const FAQS: [string, string][] = [
  [
    '¿Con cuánto tiempo debo agendar una cita?',
    'Recomendamos agendar con al menos 24 horas de anticipación para garantizar disponibilidad.',
  ],
  [
    '¿Qué incluye el baño profesional?',
    'Incluye baño con productos premium, secado, cepillado, corte de uñas y limpieza de oídos.',
  ],
  [
    '¿Cómo funciona la guardería?',
    'Plan mensual de lunes a viernes hábiles de 08:00 am a 06:00 pm. Incluye alimentación, paseos y supervisión constante.',
  ],
  [
    '¿Qué razas atienden en grooming?',
    'Atendemos todas las razas, desde pequeñas como Yorkies hasta grandes como Golden Retrievers. El precio varía según tamaño y tipo de pelo.',
  ],
  [
    '¿Qué debe traer mi mascota para la pensión?',
    'Debe traer su comida habitual, medicamentos si requiere, y su cama o manta favorita para que se sienta como en casa.',
  ],
  [
    '¿Tienen promociones o paquetes?',
    'Sí. Consulta por nuestros paquetes de baños múltiples y descuentos por fidelidad.',
  ],
]

const GALLERY_LAYOUT: ReadonlyArray<{ span: 'lg' | 'sm' | 'wide'; offset?: boolean }> = [
  { span: 'lg' },
  { span: 'sm', offset: true },
  { span: 'sm' },
  { span: 'lg', offset: true },
  { span: 'wide' },
  { span: 'lg' },
  { span: 'sm', offset: true },
  { span: 'sm' },
  { span: 'lg', offset: true },
  { span: 'wide' },
] as const

export const GALLERY = GALLERY_ASSETS.map((asset, index) => ({
  src: publicAsset(asset.file),
  alt: `${asset.label} en Hachi y Grecia Spa`,
  caption: asset.label,
  ...GALLERY_LAYOUT[index],
}))

export const TESTIMONIALS = [
  {
    quote: 'Llevo a Lola cada mes y sale transformada. Es la primera vez que un spa canino se siente realmente como un spa.',
    name: 'Mariana R.',
    detail: 'Cliente de Spa Day',
  },
  {
    quote: 'El cuidado de Harold con los detalles del baño es otro nivel. Mi yorkie vuelve feliz y reluciente.',
    name: 'Carlos M.',
    detail: 'Cliente de Grooming',
  },
  {
    quote: 'La guardería me da paz. Sé que mi perro está supervisado, paseado y alimentado mientras trabajo.',
    name: 'Fernanda L.',
    detail: 'Plan de Guardería',
  },
  {
    quote: 'Dejamos a Toby una semana en pensión y volvió más tranquilo que cuando se quedaba en casa.',
    name: 'Andrés G.',
    detail: 'Pensión',
  },
]
