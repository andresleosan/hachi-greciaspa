export type EmpleadoRole = 'groomer' | 'bañador' | 'cuidador'

export type EmpleadoShift = 'morning' | 'afternoon' | 'full'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface WeeklyShifts {
  monday: EmpleadoShift | null
  tuesday: EmpleadoShift | null
  wednesday: EmpleadoShift | null
  thursday: EmpleadoShift | null
  friday: EmpleadoShift | null
  saturday: EmpleadoShift | null
  sunday: EmpleadoShift | null
}

export interface Empleado {
  id: string
  name: string
  role: EmpleadoRole
  photoUrl: string | null
  active: boolean
  services: string[]
  weeklyShifts: WeeklyShifts
}

export type EmpleadoInput = Omit<Empleado, 'id'>
