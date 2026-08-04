#!/usr/bin/env node

import fs from 'node:fs'

const BATCH_SIZE = 400
const DEFAULT_PROJECT_ID = 'hachi-greciaspa'

function usage() {
  return [
    'Usage:',
    '  node tools/backfill-empleado-id.mjs --emulator [--apply]',
    '  node tools/backfill-empleado-id.mjs --service-account /path/to/serviceAccount.json [--apply]',
  ].join('\n')
}

function parseArgs(argv) {
  const apply = argv.includes('--apply')
  const emulator = argv.includes('--emulator')
  const serviceAccountIndex = argv.indexOf('--service-account')
  const hasServiceAccount = serviceAccountIndex !== -1

  if (emulator === hasServiceAccount) {
    throw new Error(`Choose exactly one data source mode.\n${usage()}`)
  }

  if (hasServiceAccount) {
    const serviceAccountPath = argv[serviceAccountIndex + 1]
    if (!serviceAccountPath || serviceAccountPath.startsWith('--')) {
      throw new Error(`--service-account requires a JSON file path.\n${usage()}`)
    }
    const unexpected = argv.filter((arg, index) => (
      arg !== '--apply'
      && index !== serviceAccountIndex
      && index !== serviceAccountIndex + 1
    ))
    if (unexpected.length > 0) {
      throw new Error(`Unknown argument: ${unexpected[0]}\n${usage()}`)
    }
    return { apply, emulator: false, serviceAccountPath }
  }

  const unexpected = argv.filter((arg) => arg !== '--emulator' && arg !== '--apply')
  if (unexpected.length > 0) {
    throw new Error(`Unknown argument: ${unexpected[0]}\n${usage()}`)
  }

  return { apply, emulator: true, serviceAccountPath: null }
}

async function loadAdmin() {
  try {
    const admin = await import('firebase-admin')
    const firestore = await import('firebase-admin/firestore')
    return {
      cert: admin.cert,
      deleteApp: admin.deleteApp,
      getFirestore: firestore.getFirestore,
      initializeApp: admin.initializeApp,
    }
  } catch {
    throw new Error('firebase-admin is required to run this backfill.')
  }
}

function hasEmpleadoId(data) {
  return Object.prototype.hasOwnProperty.call(data, 'empleadoId')
}

async function backfillReservations(db, apply) {
  let lastDocument = null
  let missingCount = 0
  let writtenCount = 0

  while (true) {
    let query = db.collection('reservas').orderBy('__name__').limit(BATCH_SIZE)
    if (lastDocument) query = query.startAfter(lastDocument)

    const snapshot = await query.get()
    if (snapshot.empty) break

    const missingDocuments = snapshot.docs.filter((document) => !hasEmpleadoId(document.data()))
    missingCount += missingDocuments.length

    if (apply && missingDocuments.length > 0) {
      const writtenInBatch = await db.runTransaction(async (transaction) => {
        const currentDocuments = []
        for (const document of missingDocuments) {
          currentDocuments.push(await transaction.get(document.ref))
        }

        let count = 0
        currentDocuments.forEach((document) => {
          if (!document.exists || hasEmpleadoId(document.data())) return
          transaction.update(document.ref, { empleadoId: null })
          count++
        })
        return count
      })
      writtenCount += writtenInBatch
    }

    lastDocument = snapshot.docs[snapshot.docs.length - 1]
    if (snapshot.size < BATCH_SIZE) break
  }

  return { missingCount, writtenCount }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { cert, deleteApp, getFirestore, initializeApp } = await loadAdmin()

  let app
  if (options.emulator) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
    app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID })
    console.log(`Reading emulator reservations (${process.env.FIRESTORE_EMULATOR_HOST})...`)
  } else {
    const serviceAccount = JSON.parse(fs.readFileSync(options.serviceAccountPath, 'utf8'))
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    })
    console.log('Reading reservations with the supplied service account...')
  }

  try {
    const result = await backfillReservations(getFirestore(app), options.apply)
    if (options.apply) {
      console.log(`Backfill applied: ${result.writtenCount} reservation(s) updated with empleadoId: null.`)
    } else {
      console.log(`Dry run: ${result.missingCount} reservation(s) would receive empleadoId: null.`)
      console.log('No writes performed. Re-run with --apply to write only the missing field.')
    }
  } finally {
    await deleteApp(app)
  }
}

main().catch((error) => {
  console.error(`Backfill failed: ${error.message || error}`)
  process.exitCode = 1
})
