import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import {
  createMascota,
  deleteMascota,
  listMyMascotaHistory,
  listMyMascotas,
  MascotaError,
  updateMascota,
} from '../services/mascotas'
import type { Mascota, MascotaInput, Reserva } from '../types'

const EMPTY_FORM: MascotaInput = {
  name: '',
  breed: '',
  weightKg: null,
  birthDate: null,
  notes: null,
  photoUrl: null,
}

function toInput(mascota: Mascota): MascotaInput {
  return {
    name: mascota.name,
    breed: mascota.breed,
    weightKg: mascota.weightKg,
    birthDate: mascota.birthDate,
    notes: mascota.notes,
    photoUrl: mascota.photoUrl,
  }
}

function historyLabel(reserva: Reserva): string {
  return `${reserva.serviceName} · ${reserva.date} · ${reserva.timeSlot}`
}

export default function DashboardMascotas() {
  const { user } = useAuth()
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Reserva[]>([])
  const [form, setForm] = useState<MascotaInput>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function loadMascotas() {
    if (!user) return
    setLoading(true)
    try {
      setMascotas(await listMyMascotas(user.uid))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus mascotas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMascotas()
  }, [user])

  async function selectMascota(mascota: Mascota) {
    if (!mascota.id || !user) return
    setSelectedId(mascota.id)
    setHistoryLoading(true)
    try {
      setHistory(await listMyMascotaHistory(user.uid, mascota.id))
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'No se pudo cargar el historial.')
    } finally {
      setHistoryLoading(false)
    }
  }

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setNotice(null)
    setError(null)
  }

  function startEdit(mascota: Mascota) {
    setEditingId(mascota.id ?? null)
    setForm(toInput(mascota))
    setNotice(null)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (editingId) {
        await updateMascota(user.uid, editingId, form)
        setNotice('Mascota actualizada.')
      } else {
        const id = await createMascota(user.uid, form)
        setSelectedId(id)
        setNotice('Mascota agregada.')
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadMascotas()
    } catch (saveError) {
      setError(saveError instanceof MascotaError ? saveError.message : 'No se pudo guardar la mascota.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(mascota: Mascota) {
    if (!user || !mascota.id) return
    if (!confirm(`¿Eliminar a ${mascota.name}? Sus reservas históricas se conservarán.`)) return
    setError(null)
    try {
      await deleteMascota(user.uid, mascota.id)
      if (selectedId === mascota.id) {
        setSelectedId(null)
        setHistory([])
      }
      if (editingId === mascota.id) startCreate()
      setNotice('Mascota eliminada.')
      await loadMascotas()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la mascota.')
    }
  }

  const selectedMascota = mascotas.find((mascota) => mascota.id === selectedId)

  return (
    <ProtectedRoute>
      <main className="mascotas-page">
        <div className="container">
          <header className="mascotas-intro">
            <div>
              <Link className="agenda-back-link" to="/dashboard">Volver al dashboard</Link>
              <p className="eyebrow eyebrow--coral">Perfil de bienestar</p>
              <h1>Mis mascotas</h1>
              <p className="section-copy">Guarda sus datos y consulta cada visita en un solo lugar.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={startCreate}>Agregar mascota</button>
          </header>

          {error && <p className="mascotas-alert" role="alert">{error}</p>}
          {notice && <p className="mascotas-notice" role="status">{notice}</p>}

          <div className="mascotas-layout">
            <section className="card mascotas-panel" aria-labelledby="mascotas-list-title">
              <div className="mascotas-panel__head">
                <div>
                  <h2 id="mascotas-list-title">Tus peluditos</h2>
                  <p>Selecciona uno para ver su historial.</p>
                </div>
                <span className="mascotas-count">{mascotas.length}</span>
              </div>
              {loading ? <p className="mascotas-state">Cargando mascotas...</p> : null}
              {!loading && mascotas.length === 0 ? (
                <div className="mascotas-empty">
                  <strong>Aún no tienes mascotas guardadas.</strong>
                  <span>Agrega una para reservar con su historial.</span>
                </div>
              ) : null}
              <div className="mascotas-list">
                {mascotas.map((mascota) => (
                  <article key={mascota.id} className={`mascota-item${selectedId === mascota.id ? ' is-selected' : ''}`}>
                    <button type="button" className="mascota-item__select" onClick={() => void selectMascota(mascota)}>
                      {mascota.photoUrl ? <img src={mascota.photoUrl} alt="" /> : <span className="mascota-item__avatar">{mascota.name.charAt(0)}</span>}
                      <span>
                        <strong>{mascota.name}</strong>
                        <small>{mascota.breed || 'Raza no especificada'}{mascota.weightKg !== null ? ` · ${mascota.weightKg} kg` : ''}</small>
                      </span>
                    </button>
                    <div className="mascota-item__actions">
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(mascota)}>Editar</button>
                      <button type="button" className="btn btn-danger" onClick={() => void handleDelete(mascota)}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card mascotas-panel" aria-labelledby="mascotas-form-title">
              <div className="mascotas-panel__head">
                <div>
                  <h2 id="mascotas-form-title">{editingId ? 'Editar mascota' : 'Nueva mascota'}</h2>
                  <p>Estos datos ayudan a preparar mejor cada visita.</p>
                </div>
              </div>
              <form className="mascotas-form" onSubmit={handleSubmit}>
                <div className="mascotas-field-grid">
                  <div className="field">
                    <label htmlFor="mascota-name">Nombre</label>
                    <input id="mascota-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={80} required />
                  </div>
                  <div className="field">
                    <label htmlFor="mascota-breed">Raza</label>
                    <input id="mascota-breed" value={form.breed} onChange={(event) => setForm((current) => ({ ...current, breed: event.target.value }))} maxLength={80} />
                  </div>
                  <div className="field">
                    <label htmlFor="mascota-weight">Peso (kg)</label>
                    <input id="mascota-weight" type="number" min="0" max="150" step="0.1" value={form.weightKg ?? ''} onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value ? Number(event.target.value) : null }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="mascota-birth">Fecha de nacimiento</label>
                    <input id="mascota-birth" type="date" value={form.birthDate ?? ''} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value || null }))} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="mascota-notes">Notas de cuidado</label>
                  <textarea id="mascota-notes" rows={4} maxLength={500} value={form.notes ?? ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value || null }))} placeholder="Alergias, temperamento, cuidados especiales..." />
                </div>
                <div className="field">
                  <label htmlFor="mascota-photo">URL de foto (opcional)</label>
                  <input id="mascota-photo" type="url" maxLength={500} value={form.photoUrl ?? ''} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value || null }))} placeholder="https://..." />
                </div>
                <div className="mascotas-form-actions">
                  {editingId ? <button type="button" className="btn btn-ghost" onClick={startCreate}>Cancelar</button> : null}
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar mascota'}</button>
                </div>
              </form>
            </section>

            <section className="card mascotas-panel mascotas-history" aria-labelledby="mascotas-history-title">
              <div className="mascotas-panel__head">
                <div>
                  <h2 id="mascotas-history-title">Historial</h2>
                  <p>{selectedMascota ? `Citas de ${selectedMascota.name}` : 'Selecciona una mascota'}</p>
                </div>
              </div>
              {historyLoading ? <p className="mascotas-state">Cargando historial...</p> : null}
              {!historyLoading && selectedMascota && history.length === 0 ? <p className="mascotas-state">Aún no hay citas vinculadas.</p> : null}
              <ul className="mascotas-history-list">
                {history.map((reserva) => <li key={reserva.id}><strong>{historyLabel(reserva)}</strong><span>{reserva.status}</span></li>)}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
