import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PricesList from '../components/PricesList'
import ServiceCard from '../components/ServiceCard'
import { firebaseDb } from '../services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import type { Servicio } from '../types'

const ICON_BY_CATEGORY: Record<string, string> = {
  Spa: '🛁',
  Grooming: '✂️',
  Estancia: '🏠',
  Extra: '✨',
}

const IMG_BY_SLUG: Record<string, string> = {
  'spa-day': '/tl.png',
  'grooming': '/tr.png',
  'guarderia': '/bl.png',
  'pension': '/br.png',
}

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const q = query(
          collection(firebaseDb, 'servicios'),
          where('active', '==', true),
          orderBy('order', 'asc')
        )
        const snap = await getDocs(q)
        const arr: Servicio[] = []
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }))
        if (mounted) setServicios(arr)
      } catch (e) {
        if (mounted) setServicios([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Servicios</h2>
            <p className="section-copy">Nuestro catálogo de servicios pensado para el bienestar de tu mascota. Los precios de baño y grooming varían según peso, tipo de pelo y condición.</p>
          </div>

          <PricesList />

          <h3>Categorías</h3>
          {loading && <p>Cargando servicios…</p>}
          {!loading && servicios.length === 0 && (
            <p className="field-error">No hay servicios publicados. Vuelve más tarde.</p>
          )}
          {!loading && servicios.length > 0 && (
            <div className="card-grid card-grid--services">
              {servicios.map((s) => (
                <ServiceCard
                  key={s.id}
                  title={`${ICON_BY_CATEGORY[s.category] || '🐶'} ${s.name}`}
                  description={s.description}
                  price={s.durationMin ? `${s.durationMin} min` : undefined}
                  unit={s.category}
                  img={s.id ? IMG_BY_SLUG[s.id] : undefined}
                  serviceId={s.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
