#!/usr/bin/env node
/**
 * Seed Firestore with the initial Hachi & Grecia Spa employees.
 *
 * Employees use stable IDs and merge writes so rerunning this script is
 * idempotent and does not touch unrelated employee documents.
 *
 * Usage:
 *   npm run seed:employees -- --emulator
 *   npm run seed:employees -- /path/to/serviceAccount.json
 *   FIREBASE_SERVICE_ACCOUNT=/path/to/serviceAccount.json npm run seed:employees
 */

import fs from 'fs'
import process from 'process'

const FULL_WEEK = {
  monday: 'full',
  tuesday: 'full',
  wednesday: 'full',
  thursday: 'full',
  friday: 'full',
  saturday: 'full',
  sunday: null,
}

const EMPLEADOS = [
  {
    id: 'harold-salcedo',
    name: 'Harold Salcedo',
    role: 'groomer',
    photoUrl: null,
    active: true,
    services: ['spa-day', 'grooming', 'guarderia', 'pension'],
    weeklyShifts: FULL_WEEK,
  },
  {
    id: 'daniela-padilla',
    name: 'Daniela Padilla',
    role: 'groomer',
    photoUrl: null,
    active: true,
    services: ['spa-day', 'grooming', 'guarderia', 'pension'],
    weeklyShifts: FULL_WEEK,
  },
  {
    id: 'alberto-gonzalez',
    name: 'Alberto González',
    role: 'bañador',
    photoUrl: null,
    active: true,
    services: ['spa-day', 'guarderia', 'pension'],
    weeklyShifts: FULL_WEEK,
  },
]

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
    console.error('  node tools/seed-employees.mjs --emulator')
    console.error('  node tools/seed-employees.mjs /path/to/serviceAccount.json')
    process.exit(1)
  }

  const { initializeApp, getFirestore, cert, deleteApp } = await loadAdmin()

  let app
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
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
    for (const employee of EMPLEADOS) {
      const { id, ...data } = employee
      await db.doc(`empleados/${id}`).set(data, { merge: true })
      written++
      console.log(`  \x1b[32m✓\x1b[0m empleados/${id}`)
    }
    console.log(`\n\x1b[32m✅ Done.\x1b[0m ${written} documents upserted.`)
  } catch (e) {
    console.error('\n\x1b[31m❌ Seed failed:\x1b[0m', e.message || e)
    process.exit(1)
  } finally {
    await deleteApp(app)
  }
}

main()
