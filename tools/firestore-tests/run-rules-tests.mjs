import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import fs from 'fs'
import path from 'path'

const PROJECT_ID = 'hachi-greciaspa-test'

async function main() {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8')

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  })

  // Contexts
  const guestDb = testEnv.unauthenticatedContext().firestore()
  // Alice: regular client (no admin claim, no admin role doc)
  const aliceDb = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore()
  // Bob: admin via custom claim (token.admin = true)
  const bobAdminDb = testEnv.authenticatedContext('bob', { sub: 'bob', admin: true }).firestore()

  let passed = 0
  let failed = 0
  const results = []

  async function test(name, fn) {
    try {
      await fn()
      passed++
      results.push(`  PASS  ${name}`)
    } catch (e) {
      failed++
      results.push(`  FAIL  ${name}\n        ${e.message.split('\n')[0]}`)
    }
  }

  // Seed: only bob (admin via role doc) — alice and others are created by the tests themselves.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection('users').doc('bob').set({ displayName: 'Bob', email: 'bob@x.com', role: 'admin' })
  })

  try {
    console.log('\nFirestore rules test suite\n--------------------------')

    // --- Public marketing collections (servicios, galeria, equipo) ---
    await test('guest can read servicios', () => assertSucceeds(guestDb.collection('servicios').doc('s1').get()))
    await test('guest cannot write servicios', () => assertFails(guestDb.collection('servicios').doc('s1').set({ n: 'x' })))
    await test('client cannot write servicios', () => assertFails(aliceDb.collection('servicios').doc('s1').set({ n: 'x' })))

    // --- Precios (C1): public read, admin write ---
    await test('guest can read precios (C1)', () => assertSucceeds(guestDb.collection('precios').doc('p1').get()))
    await test('client cannot write precios (C1)', () => assertFails(aliceDb.collection('precios').doc('p1').set({ price: 100 })))
    await test('admin (claim) can write precios (C1)', () => assertSucceeds(bobAdminDb.collection('precios').doc('p1').set({ price: 100 })))

    // --- Users (own profile) ---
    // create uses the auth uid; rule enforces 'role == client' default
    await test('user can create own profile (role:client default)', () => assertSucceeds(aliceDb.collection('users').doc('alice').set({ displayName: 'Alice', email: 'alice@x.com', role: 'client' })))
    await test('user cannot set own role to admin (escalation)', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('users').doc('alice').set({ displayName: 'Alice', email: 'alice@x.com', role: 'client' })
      })
      return assertFails(aliceDb.collection('users').doc('alice').update({ role: 'admin' }))
    })
    await test('user can update own displayName but keep role', async () => {
      // re-seed alice as a clean client profile (auth uid == doc id == 'alice')
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('users').doc('alice').set({ displayName: 'Alice', email: 'alice@x.com', role: 'client' })
      })
      return assertSucceeds(aliceDb.collection('users').doc('alice').update({ displayName: 'Alice Renamed' }))
    })
    await test('user cannot create someone else profile', () => assertFails(aliceDb.collection('users').doc('eve').set({ displayName: 'Eve' })))
    await test('user cannot read other user profile', () => assertFails(aliceDb.collection('users').doc('bob').get()))
    await test('admin can read any user profile', () => assertSucceeds(bobAdminDb.collection('users').doc('alice').get()))
    await test('admin can delete any user', () => assertSucceeds(bobAdminDb.collection('users').doc('alice').delete()))

    // --- Reservas (owner create/read, admin update/delete) ---
    await test('user can create own reserva', () => assertSucceeds(aliceDb.collection('reservas').doc('r1').set({ userId: 'alice', serviceName: 'Spa', createdAt: new Date() })))
    await test('user cannot create reserva for another user', () => assertFails(aliceDb.collection('reservas').doc('r2').set({ userId: 'bob', serviceName: 'Spa' })))
    await test('user can read own reserva', async () => {
      // seed own reserva then read
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice').set({ userId: 'alice' })
      })
      return assertSucceeds(aliceDb.collection('reservas').doc('r-alice').get())
    })
    // ADR-002: user may cancel own reserva (status -> 'cancelled') but NOT modify
    // any other field. Replaces the older "user cannot update own reserva (admin only)"
    // which assumed a stricter rule.
    await test('user can cancel own reserva (status -> cancelled)', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-cancel').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '10:00', status: 'pending' })
      })
      return assertSucceeds(aliceDb.collection('reservas').doc('r-alice-cancel').update({ status: 'cancelled' }))
    })
    await test('user cannot change own reserva price (whitelist)', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-price').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', price: 300, date: '2099-01-01', timeSlot: '11:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-price').update({ status: 'cancelled', price: 1 }))
    })
    await test('user cannot change own reserva timeSlot via cancel', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-slot').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '11:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-slot').update({ status: 'cancelled', timeSlot: '15:00' }))
    })
    await test('user cannot cancel another user reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-bob').set({ userId: 'bob', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '12:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-bob').update({ status: 'cancelled' }))
    })
    await test('user cannot set status to anything other than cancelled', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-conf').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '13:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-conf').update({ status: 'confirmed' }))
    })
    await test('admin can update any reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-admin').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '14:00', status: 'pending' })
      })
      return assertSucceeds(bobAdminDb.collection('reservas').doc('r-admin').set({ status: 'confirmed' }, { merge: true }))
    })

    // --- Admin-only collections (empleados, config) ---
    await test('guest cannot read empleados', () => assertFails(guestDb.collection('empleados').doc('e1').get()))
    await test('client cannot read empleados', () => assertFails(aliceDb.collection('empleados').doc('e1').get()))
    await test('admin can read empleados', () => assertSucceeds(bobAdminDb.collection('empleados').doc('e1').get()))

    // --- Mensajes (contact form): guest can create, admin can read/delete ---
    await test('guest can create mensaje', () => assertSucceeds(guestDb.collection('mensajes').doc('m1').set({ name: 'Test', email: 'test@x.com', message: 'Hola', createdAt: new Date(), read: false })))
    await test('client can create mensaje', () => assertSucceeds(aliceDb.collection('mensajes').doc('m2').set({ name: 'Alice', email: 'alice@x.com', message: 'Hola', createdAt: new Date(), read: false })))
    await test('guest cannot read mensajes', () => assertFails(guestDb.collection('mensajes').doc('m1').get()))
    await test('client cannot read mensajes', () => assertFails(aliceDb.collection('mensajes').doc('m1').get()))
    await test('admin can read mensajes', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('mensajes').doc('m-admin').set({ name: 'Admin test', email: 'a@x.com', message: 'Read me', createdAt: new Date(), read: false })
      })
      return assertSucceeds(bobAdminDb.collection('mensajes').doc('m-admin').get())
    })
    await test('guest cannot update mensajes', () => assertFails(guestDb.collection('mensajes').doc('m1').update({ read: true })))
    await test('client cannot delete mensajes', () => assertFails(aliceDb.collection('mensajes').doc('m1').delete()))
    await test('admin can delete mensajes', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('mensajes').doc('m-del').set({ name: 'Del', email: 'd@x.com', message: 'Delete me', createdAt: new Date(), read: false })
      })
      return assertSucceeds(bobAdminDb.collection('mensajes').doc('m-del').delete())
    })

    // --- Catch-all fallback ---
    await test('guest cannot read unknown collection', () => assertFails(guestDb.collection('unknown').doc('x').get()))
    await test('client cannot read unknown collection', () => assertFails(aliceDb.collection('unknown').doc('x').get()))

    console.log(results.join('\n'))
    console.log(`\n${passed} passed, ${failed} failed`)
    if (failed > 0) process.exitCode = 1
  } finally {
    await testEnv.cleanup()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
