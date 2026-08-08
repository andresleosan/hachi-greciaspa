#!/usr/bin/env node
/**
 * Seed Firestore collections with real Hachi & Grecia Spa services.
 *
 * Populates:
 *   - servicios/{slug}    service catalog (read by Servicios page + Reservar flow)
 *   - precios/{slug}      price catalog (read by Precios page + PricesList / AdminPrices)
 *
 * Sources of truth: hardcoded values reflect the real services listed on the
 * landing page (src/pages/LandingNueva.tsx). Update this script when the spa
 * changes its services; rerun to upsert (idempotent by document id).
 *
 * Requires: firebase-admin (NOT a project dependency — keeps prod bundle clean).
 *   npm install -D firebase-admin
 *
 * Usage:
 *   # against local emulator (no service account needed, projectId is enough)
 *   npm install -D firebase-admin
 *   npm run seed:services -- --emulator
 *
 *   # against production (uses Admin SDK with service account)
 *   npm run seed:services -- /path/to/serviceAccount.json
 *   # or set FIREBASE_SERVICE_ACCOUNT env and run without args
 *   npm run seed:services
 *
 * Idempotent: docs use stable IDs (slug from name), runs overwrite the same docs.
 */

import fs from 'fs'
import process from 'process'

// ---------------------------------------------------------------------------
//  Seed data — real services of Hachi & Grecia Spa (spa canino)
// ---------------------------------------------------------------------------

const SERVICIOS = [
  {
    id: 'spa-day',
    name: 'Spa Day',
    description: 'Baño profesional, aromaterapia, secado, corte de uñas, limpieza de oídos, bálsamo en patitas, hidratación de nariz, masaje y fragancia de temporada. Productos libres de sulfatos y parabenos.',
    durationMin: 90,
    category: 'Spa',
    order: 1,
    active: true,
    icon: 'spa',
  },
  {
    id: 'grooming',
    name: 'Grooming',
    description: 'Corte y estilismo canino profesional (Spa + corte). Atendemos todas las razas desde Yorkies hasta Golden Retrievers.',
    durationMin: 120,
    category: 'Grooming',
    order: 2,
    active: true,
    icon: 'grooming',
  },
  {
    id: 'guarderia',
    name: 'Guardería',
    description: 'Tu peludo cuidado mientras trabajas. Plan mensual o eventual con alimentación, paseos y supervisión constante.',
    durationMin: 600,
    category: 'Estancia',
    order: 3,
    active: true,
    icon: 'guarderia',
  },
  {
    id: 'pension',
    name: 'Pensión',
    description: 'Alojamiento nocturno con todas las comodidades. Tu mascota como en casa.',
    durationMin: 1440,
    category: 'Estancia',
    order: 4,
    active: true,
    icon: 'pension',
  },
]

// Precios: cada doc usa name como id (slug). Sigue el schema de PriceItem
// (src/types/precios.ts) usado por PricesList / AdminPrices.
const PRECIOS = [
  // Spa Day — pelo corto (short)
  { id: 'spa-day-mini-corto', name: 'Spa Day Mini · Pelo corto', price: 240, unit: '≤5 kg', note: 'Pelo corto', category: 'Spa' },
  { id: 'spa-day-chica-corto', name: 'Spa Day Chica · Pelo corto', price: 280, unit: '≤10 kg', note: 'Pelo corto', category: 'Spa' },
  { id: 'spa-day-mediana-corto', name: 'Spa Day Mediana · Pelo corto', price: 340, unit: '≤15 kg', note: 'Pelo corto', category: 'Spa' },
  { id: 'spa-day-mediana-grande-corto', name: 'Spa Day Mediana/Grande · Pelo corto', price: 420, unit: '≤20 kg', note: 'Pelo corto', category: 'Spa' },
  { id: 'spa-day-grande-corto', name: 'Spa Day Grande · Pelo corto', price: 550, unit: '≤30 kg', note: 'Pelo corto', category: 'Spa' },
  // Spa Day — pelo largo (long)
  { id: 'spa-day-mini-largo', name: 'Spa Day Mini · Pelo largo', price: 280, unit: '≤5 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
  { id: 'spa-day-chica-largo', name: 'Spa Day Chica · Pelo largo', price: 300, unit: '≤10 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
  { id: 'spa-day-mediana-largo', name: 'Spa Day Mediana · Pelo largo', price: 390, unit: '≤15 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
  { id: 'spa-day-mediana-grande-largo', name: 'Spa Day Mediana/Grande · Pelo largo', price: 490, unit: '≤20 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
  { id: 'spa-day-grande-largo', name: 'Spa Day Grande · Pelo largo', price: 690, unit: '≤30 kg', note: 'Pelo largo sin nudos', category: 'Spa' },
  // Guardería / Pensión
  { id: 'guarderia-eventual', name: 'Guardería · Eventual', price: 250, unit: '/día', note: 'Lun – Vie · 08:00 – 18:00', category: 'Estancia' },
  { id: 'guarderia-mensual', name: 'Guardería · Plan mensual', price: 3500, unit: '/mes', note: 'Lun – Vie · 08:00 – 18:00', category: 'Estancia' },
  { id: 'pension-temporada-baja', name: 'Pensión · Temporada baja', price: 300, unit: '/noche', note: 'Alojamiento nocturno', category: 'Estancia' },
  { id: 'pension-temporada-alta', name: 'Pensión · Temporada alta', price: 380, unit: '/noche', note: 'Alojamiento nocturno', category: 'Estancia' },
  // Extras
  { id: 'extra-aromaterapia', name: 'Aromaterapia (aceites esenciales)', price: 140, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-mascarilla-restauracion', name: 'Mascarilla restauración/nutrición', price: 180, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-mascarilla-hidratacion', name: 'Mascarilla hidratación/brillo', price: 180, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-bano-antipulgas', name: 'Baño Prevención Bichos (Antipulgas)', price: 140, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-corte-unas', name: 'Corte de uñas', price: 70, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-limpieza-dientes', name: 'Limpieza de dientes', price: 100, unit: 'extra', note: null, category: 'Extra' },
  { id: 'extra-deslanado', name: 'Deslanado / Desanudar', price: null, priceHigh: null, unit: 'variable', note: 'Precio según condición del pelaje', category: 'Extra' },
  { id: 'extra-grooming-completo', name: 'Grooming (Spa + corte)', price: null, priceHigh: null, unit: 'variable', note: 'Precio según tamaño y tipo de pelo', category: 'Grooming' },
  { id: 'extra-pipica', name: 'Pipeta Antipulgas', price: null, priceHigh: null, unit: 'variable', note: 'Precio según peso', category: 'Extra' },
]

// ---------------------------------------------------------------------------
//  CLI entry
// ---------------------------------------------------------------------------

async function loadAdmin() {
  try {
    const mod = await import('firebase-admin')
    const fsMod = await import('firebase-admin/firestore')
    return {
      initializeApp: mod.initializeApp,
      deleteApp: mod.deleteApp,
      cert: mod.cert,
      getFirestore: fsMod.getFirestore,
    }
  } catch (_) {
    console.error('Error: firebase-admin is required to run this seed.')
    console.error('Install it on demand (keeps prod bundle clean):')
    console.error('  npm install -D firebase-admin')
    process.exit(2)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const useEmulator = argv.includes('--emulator')
  const projectId = process.env.FIREBASE_PROJECT_ID || 'hachi-greciaspa'
  const svcPath = argv.find((a) => !a.startsWith('--')) || process.env.FIREBASE_SERVICE_ACCOUNT

  if (!useEmulator && !svcPath) {
    console.error('Error: pass a service account path, set FIREBASE_SERVICE_ACCOUNT, or use --emulator.')
    console.error('Usage:')
    console.error('  node tools/seed-services.mjs --emulator')
    console.error('  node tools/seed-services.mjs /path/to/serviceAccount.json')
    process.exit(1)
  }

  const { initializeApp, getFirestore, cert, deleteApp } = await loadAdmin()

  let app
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
    // Emulator accepts a bare projectId — no credential needed.
    app = initializeApp({ projectId })
    console.log(`Seeding emulator (projectId=${projectId}, host=${process.env.FIRESTORE_EMULATOR_HOST})...`)
  } else {
    const key = JSON.parse(fs.readFileSync(svcPath, { encoding: 'utf8' }))
    app = initializeApp({
      credential: cert(key),
      projectId: projectId || key.project_id,
    })
    console.log(`Seeding production (projectId=${projectId}, serviceAccount=${svcPath})...`)
  }

  const db = getFirestore(app)
  let written = 0
  try {
    for (const s of SERVICIOS) {
      const { id, ...data } = s
      await db.doc(`servicios/${id}`).set(data, { merge: true })
      written++
      console.log(`  \x1b[32m✓\x1b[0m servicios/${id}`)
    }
    for (const p of PRECIOS) {
      const { id, ...data } = p
      await db.doc(`precios/${id}`).set(data, { merge: true })
      written++
      console.log(`  \x1b[32m✓\x1b[0m precios/${id}`)
    }
    console.log(`\n\x1b[32m✅ Done.\x1b[0m ${written} documents upserted.`)
    console.log(`   servicios: ${SERVICIOS.length} · precios: ${PRECIOS.length}`)
  } catch (e) {
    console.error('\n\x1b[31m❌ Seed failed:\x1b[0m', e.message || e)
    process.exit(1)
  } finally {
    await deleteApp(app)
  }
}

main()
