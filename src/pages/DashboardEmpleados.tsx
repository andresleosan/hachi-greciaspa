import { useEffect, useState, type FormEvent } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'

import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import {
  createEmpleado,
  deactivateEmpleado,
  listEmpleados,
  updateEmpleado,
} from '../services/empleados'
import { firebaseDb } from '../services/firebase'
import type {
  Empleado,
  EmpleadoInput,
  EmpleadoRole,
  EmpleadoShift,
  Servicio,
  Weekday,
  WeeklyShifts,
} from '../types'

export const DEFAULT_WEEKLY_SHIFTS: WeeklyShifts = {
  monday: 'full',
  tuesday: 'full',
  wednesday: 'full',
  thursday: 'full',
  friday: 'full',
  saturday: 'full',
  sunday: null,
}

const WEEKDAYS: readonly { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

const ROLE_OPTIONS: readonly { value: EmpleadoRole; label: string }[] = [
  { value: 'groomer', label: 'Groomer' },
  { value: 'bañador', label: 'Bañador' },
  { value: 'cuidador', label: 'Cuidador' },
]

const SHIFT_OPTIONS: readonly { value: EmpleadoShift; label: string }[] = [
  { value: 'morning', label: 'Mañana (08:00–14:00)' },
  { value: 'afternoon', label: 'Tarde (14:00–20:00)' },
  { value: 'full', label: 'Día completo (08:00–20:00)' },
]

interface EmpleadoFormValues extends Omit<EmpleadoInput, 'photoUrl'> {
  photoUrl: string
}

interface FormErrors {
  name?: string
  services?: string
}

export function validateEmpleadoInput(input: Pick<EmpleadoInput, 'name' | 'services'>): FormErrors {
  const errors: FormErrors = {}
  if (!input.name.trim()) errors.name = 'Ingresa el nombre del empleado.'
  if (input.services.length === 0) errors.services = 'Selecciona al menos un servicio.'
  return errors
}

function createEmptyForm(): EmpleadoFormValues {
  return {
    name: '',
    role: 'groomer',
    photoUrl: '',
    active: true,
    services: [],
    weeklyShifts: { ...DEFAULT_WEEKLY_SHIFTS },
  }
}

function toFormValues(employee: Empleado): EmpleadoFormValues {
  return {
    name: employee.name,
    role: employee.role,
    photoUrl: employee.photoUrl || '',
    active: employee.active,
    services: [...employee.services],
    weeklyShifts: { ...employee.weeklyShifts },
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E'
}

export default function DashboardEmpleados() {
  const { user, profile } = useAuth()
  const [showSidebar, setShowSidebar] = useState(false)
  const [employees, setEmployees] = useState<Empleado[]>([])
  const [services, setServices] = useState<Servicio[]>([])
  const [form, setForm] = useState<EmpleadoFormValues>(() => createEmptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [readError, setReadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setReadError(null)

      try {
        const [employeeData, serviceSnapshot] = await Promise.all([
          listEmpleados(),
          getDocs(query(
            collection(firebaseDb, 'servicios'),
            where('active', '==', true),
            orderBy('order', 'asc'),
          )),
        ])

        if (!mounted) return
        const serviceData: Servicio[] = []
        serviceSnapshot.forEach((document) => {
          serviceData.push({ id: document.id, ...(document.data() as Omit<Servicio, 'id'>) })
        })
        setEmployees(employeeData)
        setServices(serviceData)
      } catch {
        if (mounted) setReadError('No se pudieron cargar los empleados y servicios. Intenta nuevamente.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  async function refreshEmployees() {
    try {
      const employeeData = await listEmpleados()
      setEmployees(employeeData)
      setReadError(null)
      return true
    } catch {
      setReadError('No se pudo actualizar la lista de empleados. Intenta nuevamente.')
      return false
    }
  }

  function resetForm() {
    setForm(createEmptyForm())
    setEditingId(null)
    setFormErrors({})
  }

  function startCreate() {
    resetForm()
    setActionError(null)
    setNotice(null)
  }

  function startEdit(employee: Empleado) {
    setForm(toFormValues(employee))
    setEditingId(employee.id)
    setFormErrors({})
    setActionError(null)
    setNotice(null)
  }

  function updateShift(weekday: Weekday, value: string) {
    setForm((current) => ({
      ...current,
      weeklyShifts: {
        ...current.weeklyShifts,
        [weekday]: value ? value as EmpleadoShift : null,
      },
    }))
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(serviceId)
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId],
    }))
    setFormErrors((current) => ({ ...current, services: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateEmpleadoInput(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0 || saving) return

    setSaving(true)
    setActionError(null)
    setNotice(null)
    const input: EmpleadoInput = {
      ...form,
      name: form.name.trim(),
      photoUrl: form.photoUrl.trim() || null,
    }

    try {
      if (editingId) {
        await updateEmpleado(editingId, input)
        await refreshEmployees()
        resetForm()
        setNotice('Empleado actualizado.')
      } else {
        await createEmpleado(input)
        await refreshEmployees()
        resetForm()
        setNotice('Empleado creado.')
      }
    } catch {
      setActionError('No se pudo guardar el empleado. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(employee: Empleado) {
    if (!window.confirm(`¿Desactivar a ${employee.name}? Sus reservas existentes se conservarán.`)) return

    setDeactivatingId(employee.id)
    setActionError(null)
    setNotice(null)
    try {
      await deactivateEmpleado(employee.id)
      await refreshEmployees()
      if (editingId === employee.id) resetForm()
      setNotice('Empleado desactivado. Sus reservas existentes no fueron modificadas.')
    } catch {
      setActionError('No se pudo desactivar el empleado. Intenta nuevamente.')
    } finally {
      setDeactivatingId(null)
    }
  }

  function serviceName(serviceId: string) {
    return services.find((service) => service.id === serviceId)?.name || serviceId
  }

  const isBusy = saving || deactivatingId !== null

  return (
    <ProtectedRoute requireRole="admin">
      <div className="dashboard-layout">
        <aside className={`dashboard-sidebar${showSidebar ? ' is-open' : ''}`}>
          <div className="sidebar-brand">
            <div className="sidebar-brand__mark">HG</div>
            <div className="sidebar-brand__copy"><strong>Hachi &amp; Grecia</strong><small>Admin</small></div>
          </div>
          <nav className="sidebar-nav" aria-label="Navegación del panel">
            <Link className="sidebar-link" to="/dashboard"><span className="sidebar-link__icon">D</span> Dashboard</Link>
            <Link className="sidebar-link" to="/dashboard/agenda"><span className="sidebar-link__icon">C</span> Citas</Link>
            <Link className="sidebar-link is-active" to="/dashboard/empleados"><span className="sidebar-link__icon">E</span> Empleados</Link>
            <Link className="sidebar-link" to="/servicios"><span className="sidebar-link__icon">S</span> Servicios</Link>
            <span className="sidebar-link is-disabled" aria-disabled="true"><span className="sidebar-link__icon">U</span> Clientes <small className="sidebar-link__badge">próxim.</small></span>
            <span className="sidebar-link is-disabled" aria-disabled="true"><span className="sidebar-link__icon">R</span> Reportes <small className="sidebar-link__badge">próxim.</small></span>
          </nav>
          <div className="sidebar-footer">
            <div>{profile?.displayName || user?.email}<br /><small>Administrador</small></div>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <button className="btn btn-ghost sidebar-toggle" onClick={() => setShowSidebar((current) => !current)} aria-label="Mostrar navegación">☰</button>
            <div className="dashboard-topbar__banner">
              <img src="/dashboard_header_zoom.png" alt="Administración del spa" />
            </div>
            <div className="dashboard-title"><strong>Empleados</strong><span>Equipo, servicios y horarios</span></div>
          </header>

          <section className="container empleados-page">
            <div className="empleados-intro">
              <div>
                <span className="eyebrow eyebrow--coral">Operación del spa</span>
                <h1>Administrar empleados</h1>
                <p className="section-copy">Define quién puede atender cada servicio y en qué turnos está disponible para la asignación automática.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={startCreate} disabled={isBusy}>Nuevo empleado</button>
            </div>

            {notice && <p className="empleados-notice" role="status">{notice}</p>}
            {actionError && <p className="field-error empleados-alert" role="alert">{actionError}</p>}

            <div className="empleados-layout">
              <section className="card empleados-panel empleados-list-panel" aria-labelledby="empleados-list-title">
                <div className="empleados-panel__head">
                  <div>
                    <h2 id="empleados-list-title">Equipo registrado</h2>
                    <p>Los empleados inactivos no se ofrecen para nuevas asignaciones.</p>
                  </div>
                  <span className="empleados-count">{employees.length} {employees.length === 1 ? 'persona' : 'personas'}</span>
                </div>

                {loading && <p className="empleados-state">Cargando empleados y servicios…</p>}
                {!loading && readError && <p className="field-error empleados-state" role="alert">{readError}</p>}
                {!loading && !readError && employees.length === 0 && (
                  <div className="empleados-empty">
                    <strong>Aún no hay empleados registrados</strong>
                    <p>Crea el primer perfil para habilitar la asignación automática.</p>
                    <button className="btn btn-secondary" type="button" onClick={startCreate}>Crear empleado</button>
                  </div>
                )}
                {!loading && !readError && employees.length > 0 && (
                  <div className="empleados-table-wrap">
                    <table className="empleados-table">
                      <thead>
                        <tr>
                          <th scope="col">Empleado</th>
                          <th scope="col">Rol</th>
                          <th scope="col">Servicios</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id}>
                            <td data-label="Empleado">
                              <div className="empleados-person">
                                <span className="empleados-avatar" aria-hidden="true">{getInitials(employee.name)}</span>
                                <span><strong>{employee.name}</strong><small>{employee.photoUrl ? 'Foto configurada' : 'Sin foto'}</small></span>
                              </div>
                            </td>
                            <td data-label="Rol">{ROLE_OPTIONS.find((option) => option.value === employee.role)?.label || employee.role}</td>
                            <td data-label="Servicios">
                              <div className="empleados-service-tags">
                                {employee.services.map((serviceId) => <span key={serviceId}>{serviceName(serviceId)}</span>)}
                              </div>
                            </td>
                            <td data-label="Estado">
                              <span className={`empleados-status empleados-status--${employee.active ? 'active' : 'inactive'}`}>
                                {employee.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td data-label="Acciones">
                              <div className="empleados-actions">
                                <button className="btn btn-ghost btn-pill" type="button" onClick={() => startEdit(employee)} disabled={isBusy}>Editar</button>
                                {employee.active && (
                                  <button className="btn btn-danger btn-pill" type="button" onClick={() => void handleDeactivate(employee)} disabled={isBusy}>
                                    {deactivatingId === employee.id ? 'Desactivando…' : 'Desactivar'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="card empleados-panel empleados-form-panel" aria-labelledby="empleados-form-title">
                <div className="empleados-panel__head">
                  <div>
                    <h2 id="empleados-form-title">{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2>
                    <p>{editingId ? 'Actualiza el perfil sin afectar sus reservas existentes.' : 'Completa el perfil para habilitarlo en la agenda.'}</p>
                  </div>
                  {editingId && <button className="btn btn-ghost btn-pill" type="button" onClick={resetForm} disabled={isBusy}>Cancelar</button>}
                </div>

                <form className="empleados-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
                  <div className="empleados-form-section">
                    <h3>Perfil</h3>
                    <div className="field-grid empleados-field-grid">
                      <div className="field">
                        <label htmlFor="empleado-name">Nombre completo</label>
                        <input
                          id="empleado-name"
                          value={form.name}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, name: event.target.value }))
                            setFormErrors((current) => ({ ...current, name: undefined }))
                          }}
                          aria-invalid={Boolean(formErrors.name)}
                          aria-describedby={formErrors.name ? 'empleado-name-error' : undefined}
                          autoComplete="name"
                        />
                        {formErrors.name && <span className="field-error" id="empleado-name-error">{formErrors.name}</span>}
                      </div>
                      <div className="field">
                        <label htmlFor="empleado-role">Rol</label>
                        <select id="empleado-role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as EmpleadoRole }))}>
                          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="empleado-photo">URL de foto <span>(opcional)</span></label>
                      <input id="empleado-photo" type="url" value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} placeholder="https://…" autoComplete="url" />
                    </div>
                    <label className="empleados-checkbox empleados-checkbox--status">
                      <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
                      <span><strong>Empleado activo</strong><small>Puede recibir nuevas asignaciones.</small></span>
                    </label>
                  </div>

                  <fieldset className="empleados-form-section empleados-fieldset">
                    <legend>Servicios que puede atender</legend>
                    {services.length === 0 && <p className="empleados-hint">No hay servicios activos disponibles.</p>}
                    <div className="empleados-service-list">
                      {services.map((service) => service.id && (
                        <label className="empleados-checkbox" key={service.id}>
                          <input type="checkbox" checked={form.services.includes(service.id)} onChange={() => toggleService(service.id!)} />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                    {formErrors.services && <span className="field-error" id="empleado-services-error">{formErrors.services}</span>}
                  </fieldset>

                  <fieldset className="empleados-form-section empleados-fieldset">
                    <legend>Disponibilidad semanal</legend>
                    <p className="empleados-hint">El horario se usa para buscar candidatos compatibles con cada reserva.</p>
                    <div className="empleados-shift-grid">
                      {WEEKDAYS.map((weekday) => (
                        <div className="field" key={weekday.key}>
                          <label htmlFor={`empleado-shift-${weekday.key}`}>{weekday.label}</label>
                          <select id={`empleado-shift-${weekday.key}`} value={form.weeklyShifts[weekday.key] || ''} onChange={(event) => updateShift(weekday.key, event.target.value)}>
                            <option value="">Sin turno</option>
                            {SHIFT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  <div className="empleados-form-actions">
                    <button className="btn btn-primary" type="submit" disabled={isBusy}>
                      {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear empleado'}
                    </button>
                    {!editingId && <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={isBusy}>Limpiar</button>}
                  </div>
                </form>
              </section>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
