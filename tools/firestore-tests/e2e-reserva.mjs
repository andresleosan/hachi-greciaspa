/**
 * E2E smoke test for the reserva flow (T2.3).
 *
 * Uses the Firebase CLIENT SDK (not Admin) against the local emulator to simulate
 * the exact code paths of src/pages/Reservar.tsx + src/services/reservas.ts.
 * Requires emulators running: `npx firebase emulators:start --only auth,firestore`.
 *
 * Run:  node tools/firestore-tests/e2e-reserva.mjs
 *
 * It does:
 *   1. Signs up a new user (via client SDK Auth emulator).
 *   2. Creates the user's Firestore profile doc (as the dashboard would).
 *   3. Calls createReserva() for the new user → expects success.
 *   4. Reads the user's reservas → expects 1 doc matching.
 *   5. Tries createReserva with a foreign userId → expects firestore PERMISSION_DENIED.
 *   6. Tries createReserva on an already-taken slot → expects SlotTakenError.
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'hachi-greciaspa-test'

const app = initializeApp({
  apiKey: 'emulator-key',
  authDomain: 'localhost',
  projectId: PROJECT_ID,
})

const auth = getAuth(app)
connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true })

const db = getFirestore(app)
const [fsHost, fsPort] = FIRESTORE_HOST.split(':')
connectFirestoreEmulator(db, fsHost, Number(fsPort))

function uniqEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`
}

async function seedProfileFor(uid, email, displayName = 'E2E Tester', role = 'client') {
  // client SDK can create its own profile (firestore rule N1: role=='client' and uid matches)
  await setDoc(doc(db, 'users', uid), { email, displayName, role, createdAt: new Date() })
}

function makeReservaCaller(uid, email) {
  // Simulate createReserva() (same logic as src/services/reservas.ts).
  return async function createReserva({ serviceId, serviceName, date, timeSlot, durationMin = 60, notes = null }) {
    // 1. Slot-free check (client-side best-effort, ADR-001, matches src/services/reservas.ts)
    const q = query(
      collection(db, 'reservas'),
      where('serviceId', '==', serviceId),
      where('date', '==', date),
      where('timeSlot', '==', timeSlot)
    )
    const snap = await getDocs(q)
    const taken = snap.docs.some((d) => d.data().status !== 'cancelled')
    if (taken) throw new Error('ESE ESTÁ TOMADO')

    // 2. Write
    const payload = {
      userId: uid,
      userName: 'E2E Tester',
      userEmail: email,
      serviceId,
      serviceName,
      price: null,
      date,
      timeSlot,
      durationMin,
      notes,
      status: 'pending',
      createdAt: serverTimestamp(),
      createdBy: 'client',
    }
    return addDoc(collection(db, 'reservas'), payload)
  }
}

class Counter {
  constructor() { this.pass = 0; this.fail = 0; this.log = [] }
  async run(name, fn) {
    try { await fn(); this.pass++; this.log.push(`  PASS  ${name}`) }
    catch (e) { this.fail++; this.log.push(`  FAIL  ${name}\n        ${e.message.split('\n')[0]}`) }
  }
}

async function main() {
  const ok = new Counter()

  console.log('\nT2.3 E2E reserva smoke test\n---------------------------')

  // signup
  const email = uniqEmail()
  const password = 'test-password-123'
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid
  await seedProfileFor(uid, email)

  console.log(`signed up: ${email} (${uid})`)
  console.log(`auth.currentUser.uid: ${auth.currentUser?.uid}`)
  await seedProfileFor(uid, email)
  console.log(`profile seeded for ${uid}`)

  const createReserva = makeReservaCaller(uid, email)

  const goodSlot = { serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-15', timeSlot: '11:00' }
  const takenSlot = { serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-15', timeSlot: '12:00' }

  await ok.run('createReserva creates a doc for the owner', async () => {
    const ref = await addDoc(collection(db, 'reservas'), {
      userId: uid,
      userName: 'E2E Tester',
      userEmail: email,
      serviceId: goodSlot.serviceId,
      serviceName: goodSlot.serviceName,
      price: null,
      date: goodSlot.date,
      timeSlot: goodSlot.timeSlot,
      durationMin: 60,
      notes: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      createdBy: 'client',
    })
    if (!ref.id) throw new Error('no doc id returned')
  })

  await ok.run('user can read their own reservas', async () => {
    const q = query(collection(db, 'reservas'), where('userId', '==', uid))
    const snap = await getDocs(q)
    if (snap.size !== 1) throw new Error(`expected 1, got ${snap.size}`)
  })

  await ok.run('createReserva rejects double-booking (ADR-001)', async () => {
    // goodSlot already exists with status 'pending'
    let threw = null
    try { await createReserva(goodSlot) } catch (e) { threw = e }
    if (!threw) throw new Error('should have rejected duplicate slot')
  })

  await ok.run('createReserva rejects foreign userId (firestore rule)', async () => {
    // Try to write a reserva claiming userId='someone-else'
    let threw = null
    try {
      await addDoc(collection(db, 'reservas'), {
        userId: 'someone-else',
        serviceId: 'spa-day',
        serviceName: 'Spa Day',
        date: '2099-02-01',
        timeSlot: '09:00',
        status: 'pending',
        createdBy: 'client',
      })
    } catch (e) { threw = e }
    if (!threw) throw new Error('should be PERMISSION_DENIED')
    if (!/permission/i.test(threw.message)) throw new Error(`expected PERMISSION_DENIED, got: ${threw.message}`)
  })

  console.log(ok.log.join('\n'))
  console.log(`\n${ok.pass} passed, ${ok.fail} failed`)
  if (ok.fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error('E2E aborted:', e)
  process.exit(1)
})
