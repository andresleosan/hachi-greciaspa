export interface Servicio {
  id?: string
  name: string
  description: string
  durationMin: number
  category: string
  order: number
  active: boolean
  icon?: string | null
}
