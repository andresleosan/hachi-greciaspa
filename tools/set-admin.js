#!/usr/bin/env node
/**
 * Simple helper to set/unset the `admin` custom claim for a Firebase user
 * Usage:
 *   node tools/set-admin.js /path/to/serviceAccount.json UID true
 * or set env FIREBASE_SERVICE_ACCOUNT and TARGET_UID and run:
 *   node tools/set-admin.js
 */

import fs from 'fs'
import path from 'path'
import process from 'process'
import admin from 'firebase-admin'

function usage() {
  console.log('Usage: node tools/set-admin.js /path/to/serviceAccount.json UID [true|false]')
}

const svcPath = process.argv[2] || process.env.FIREBASE_SERVICE_ACCOUNT
const uid = process.argv[3] || process.env.TARGET_UID
const flagArg = process.argv[4] || process.env.ADMIN || 'true'
const isAdmin = flagArg === 'true' || flagArg === '1'

if (!svcPath || !uid) {
  usage()
  process.exit(1)
}

const fullPath = path.resolve(svcPath)
if (!fs.existsSync(fullPath)) {
  console.error('Service account file not found:', fullPath)
  process.exit(1)
}

const key = JSON.parse(fs.readFileSync(fullPath, { encoding: 'utf8' }))

admin.initializeApp({ credential: admin.credential.cert(key) })

admin.auth().setCustomUserClaims(uid, { admin: isAdmin })
  .then(() => {
    console.log(`Custom claim set: uid=${uid} admin=${isAdmin}`)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error setting custom claim:', err)
    process.exit(2)
  })
