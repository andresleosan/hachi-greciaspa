#!/usr/bin/env node

import fs from 'node:fs'

const BATCH_SIZE = 400
const DEFAULT_PROJECT_ID = 'hachi-greciaspa'

function usage() {
  return [
    'Usage:',
    '  node tools/backfill-empleado-id.mjs --emulator [--apply] [--manifest path]',
    '  node tools/backfill-empleado-id.mjs --service-account /path/to/serviceAccount.json [--apply] [--manifest path]',
  ].join('\n')
}

function parseArgs(argv) {
  let apply = false
  let emulator = false
  let serviceAccountPath = null
  let manifestPath = 'backfill-empleado-id-manifest.json'

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--apply') {
      apply = true
    } else if (argument === '--emulator') {
      emulator = true
    } else if (argument === '--service-account') {
      serviceAccountPath = argv[index + 1]
      if (!serviceAccountPath || serviceAccountPath.startsWith('--')) {
        throw new Error(`--service-account requires a JSON file path.\n${usage()}`)
      }
      index += 1
    } else if (argument === '--manifest') {
      manifestPath = argv[index + 1]
      if (!manifestPath || manifestPath.startsWith('--')) {
        throw new Error(`--manifest requires an output file path.\n${usage()}`)
      }
      index += 1
    } else {
      throw new Error(`Unknown argument: ${argument}\n${usage()}`)
    }
  }

  if (emulator === Boolean(serviceAccountPath)) {
    throw new Error(`Choose exactly one data source mode.\n${usage()}`)
  }

  return { apply, emulator, serviceAccountPath, manifestPath }
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
  const affectedReservationIds = []

  while (true) {
    let query = db.collection('reservas').orderBy('__name__').limit(BATCH_SIZE)
    if (lastDocument) query = query.startAfter(lastDocument)

    const snapshot = await query.get()
    if (snapshot.empty) break

    const missingDocuments = snapshot.docs.filter((document) => !hasEmpleadoId(document.data()))
    missingCount += missingDocuments.length
    if (!apply) affectedReservationIds.push(...missingDocuments.map((document) => document.id))

    if (apply && missingDocuments.length > 0) {
      const writtenInBatch = await db.runTransaction(async (transaction) => {
        const currentDocuments = []
        for (const document of missingDocuments) {
          currentDocuments.push(await transaction.get(document.ref))
        }

        const writtenIds = []
        currentDocuments.forEach((document) => {
          if (!document.exists || hasEmpleadoId(document.data())) return
          transaction.update(document.ref, { empleadoId: null })
          writtenIds.push(document.id)
        })
        return writtenIds
      })
      writtenCount += writtenInBatch.length
      affectedReservationIds.push(...writtenInBatch)
    }

    lastDocument = snapshot.docs[snapshot.docs.length - 1]
    if (snapshot.size < BATCH_SIZE) break
  }

  return { missingCount, writtenCount, affectedReservationIds }
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
    const manifest = {
      generatedAt: new Date().toISOString(),
      collection: 'reservas',
      field: 'empleadoId',
      value: null,
      mode: options.apply ? 'apply' : 'dry-run',
      reservationIds: result.affectedReservationIds,
      count: result.affectedReservationIds.length,
    }
    fs.writeFileSync(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    if (options.apply) {
      console.log(`Backfill applied: ${result.writtenCount} reservation(s) updated with empleadoId: null.`)
    } else {
      console.log(`Dry run: ${result.missingCount} reservation(s) would receive empleadoId: null.`)
      console.log('No writes performed. Re-run with --apply to write only the missing field.')
    }
    console.log(`Manifest written: ${options.manifestPath} (${manifest.count} reservation ID(s)).`)
  } finally {
    await deleteApp(app)
  }
}

main().catch((error) => {
  console.error(`Backfill failed: ${error.message || error}`)
  process.exitCode = 1
})
