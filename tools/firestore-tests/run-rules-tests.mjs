import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteField } from 'firebase/firestore'
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

    // --- Mascotas (owner-only, optional link from reservas) ---
    await test('client can create own mascota', () => assertSucceeds(aliceDb.collection('mascotas').doc('m-alice').set({
      userId: 'alice', name: 'Hachi', breed: 'Yorkshire', weightKg: 4.2, birthDate: null, notes: 'Tranquilo', photoUrl: null,
    })))
    await test('client cannot create mascota for another user', () => assertFails(aliceDb.collection('mascotas').doc('m-bob').set({
      userId: 'bob', name: 'Grecia', breed: 'Poodle', weightKg: 6, birthDate: null, notes: null, photoUrl: null,
    })))
    await test('client can read and update own mascota', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('mascotas').doc('m-alice-read').set({ userId: 'alice', name: 'Hachi', breed: '', weightKg: null, birthDate: null, notes: null, photoUrl: null })
      })
      await assertSucceeds(aliceDb.collection('mascotas').doc('m-alice-read').get())
      return assertSucceeds(aliceDb.collection('mascotas').doc('m-alice-read').update({ notes: 'Actualizado' }))
    })
    await test('client cannot read another user mascota', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('mascotas').doc('m-bob-read').set({ userId: 'bob', name: 'Grecia' })
      })
      return assertFails(aliceDb.collection('mascotas').doc('m-bob-read').get())
    })
    await test('client can delete own mascota', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('mascotas').doc('m-alice-delete').set({ userId: 'alice', name: 'Hachi' })
      })
      return assertSucceeds(aliceDb.collection('mascotas').doc('m-alice-delete').delete())
    })
    await test('admin can read any mascota', () => assertSucceeds(bobAdminDb.collection('mascotas').doc('m-alice').get()))

      // --- Reservas (owner create/read, admin update/delete) ---
      await test('user can create own reserva', () => assertSucceeds(aliceDb.collection('reservas').doc('r1').set({ userId: 'alice', serviceName: 'Spa', createdAt: new Date() })))
      await test('client can create own reserva with empleadoId null', () => assertSucceeds(aliceDb.collection('reservas').doc('r-with-null-employee').set({ userId: 'alice', serviceName: 'Spa', empleadoId: null })))
      await test('client can create own reserva with own mascota', () => assertSucceeds(aliceDb.collection('reservas').doc('r-with-mascota').set({ userId: 'alice', serviceName: 'Spa', mascotaId: 'm-alice' })))
      await test('client cannot create reserva with another user mascota', () => assertFails(aliceDb.collection('reservas').doc('r-with-other-mascota').set({ userId: 'alice', serviceName: 'Spa', mascotaId: 'm-bob-read' })))
      await test('user cannot create reserva for another user', () => assertFails(aliceDb.collection('reservas').doc('r2').set({ userId: 'bob', serviceName: 'Spa' })))
    await test('client cannot create reserva with another empleado', () => assertFails(aliceDb.collection('reservas').doc('r-with-employee').set({ userId: 'alice', serviceName: 'Spa', empleadoId: 'employee-2' })))
    await test('user can read own reserva', async () => {
      // seed own reserva then read
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice').set({ userId: 'alice' })
      })
      return assertSucceeds(aliceDb.collection('reservas').doc('r-alice').get())
    })
    await test('owner cannot directly reschedule own pending reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-reschedule').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', price: 300, notes: 'Quiet room', createdAt: new Date(), createdBy: 'staff', date: '2099-01-01', timeSlot: '10:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-reschedule').update({ date: '2099-01-02', timeSlot: '11:00' }))
    })
    await test('owner cannot reschedule confirmed reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-confirmed').set({ userId: 'alice', serviceId: 'spa-day', date: '2099-01-01', timeSlot: '10:00', status: 'confirmed' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-confirmed').update({ date: '2099-01-02', timeSlot: '11:00' }))
    })
    await test('owner cannot reschedule another user reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-bob-reschedule').set({ userId: 'bob', serviceId: 'spa-day', date: '2099-01-01', timeSlot: '10:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-bob-reschedule').update({ date: '2099-01-02', timeSlot: '11:00' }))
    })
    await test('owner cannot combine rescheduling with price, serviceId, notes, or status', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-reschedule-fields').set({ userId: 'alice', serviceId: 'spa-day', price: 300, notes: 'Quiet room', date: '2099-01-01', timeSlot: '10:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-reschedule-fields').update({ date: '2099-01-02', timeSlot: '11:00', price: 1, serviceId: 'other-service', notes: 'Changed', status: 'confirmed' }))
    })
    await test('owner can cancel own reserva with only status', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-cancel').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '10:00', status: 'confirmed' })
      })
      return assertSucceeds(aliceDb.collection('reservas').doc('r-alice-cancel').update({ status: 'cancelled' }))
    })
    await test('owner cannot cancel while changing notes', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-cancel-notes').set({ userId: 'alice', serviceId: 'spa-day', notes: 'Original', date: '2099-01-01', timeSlot: '11:00', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-cancel-notes').update({ status: 'cancelled', notes: 'Changed' }))
    })
    await test('client cannot add empleadoId to existing reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-add-employee').set({ userId: 'alice', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-add-employee').update({ empleadoId: 'employee-1' }))
    })
    await test('client cannot change empleadoId on existing reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-change-employee').set({ userId: 'alice', empleadoId: 'employee-1', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-change-employee').update({ empleadoId: 'employee-2' }))
    })
    await test('client cannot remove empleadoId from existing reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-alice-remove-employee').set({ userId: 'alice', empleadoId: 'employee-1', status: 'pending' })
      })
      return assertFails(aliceDb.collection('reservas').doc('r-alice-remove-employee').update({ status: 'cancelled', empleadoId: deleteField() }))
    })
    await test('admin can update any reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-admin').set({ userId: 'alice', serviceId: 'spa-day', serviceName: 'Spa Day', date: '2099-01-01', timeSlot: '14:00', status: 'pending' })
      })
      return assertSucceeds(bobAdminDb.collection('reservas').doc('r-admin').set({ status: 'confirmed' }, { merge: true }))
    })
    await test('admin can update empleadoId on a reserva', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('reservas').doc('r-admin-employee').set({ userId: 'alice', status: 'pending', empleadoId: null })
      })
      return assertSucceeds(bobAdminDb.collection('reservas').doc('r-admin-employee').set({ empleadoId: 'employee-1' }, { merge: true }))
    })

    // --- Recordatorios (Functions-owned, admin read-only) ---
    await test('guest cannot read recordatorios', () => assertFails(guestDb.collection('recordatorios').doc('reminder-1').get()))
    await test('guest cannot write recordatorios', () => assertFails(guestDb.collection('recordatorios').doc('reminder-1').set({ status: 'pending' })))
    await test('client cannot read recordatorios', () => assertFails(aliceDb.collection('recordatorios').doc('reminder-1').get()))
    await test('client cannot write recordatorios', () => assertFails(aliceDb.collection('recordatorios').doc('reminder-1').set({ status: 'pending' })))
    await test('admin can read recordatorios', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('recordatorios').doc('reminder-admin').set({ status: 'pending' })
      })
      return assertSucceeds(bobAdminDb.collection('recordatorios').doc('reminder-admin').get())
    })

    // --- Booking confirmations: Functions-only delivery state ---
    await test('guest cannot read confirmaciones', () => assertFails(guestDb.collection('confirmaciones').doc('confirmation-r1').get()))
    await test('client cannot read confirmaciones', () => assertFails(aliceDb.collection('confirmaciones').doc('confirmation-r1').get()))
    await test('client cannot write confirmaciones', () => assertFails(aliceDb.collection('confirmaciones').doc('confirmation-r1').set({ status: 'sent' })))
    await test('admin can read confirmaciones', () => assertSucceeds(bobAdminDb.collection('confirmaciones').doc('confirmation-r1').get()))

    // --- Admin-only collections (empleados, config) ---
    await test('guest cannot read empleados', () => assertFails(guestDb.collection('empleados').doc('e1').get()))
    await test('client cannot read empleados', () => assertFails(aliceDb.collection('empleados').doc('e1').get()))
    await test('admin can read empleados', () => assertSucceeds(bobAdminDb.collection('empleados').doc('e1').get()))
    await test('admin can create and update empleados', async () => {
      const employee = { name: 'Employee One', role: 'groomer', photoUrl: null, active: true, services: ['spa-day'], weeklyShifts: { monday: 'full', tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null } }
      await assertSucceeds(bobAdminDb.collection('empleados').doc('e-admin').set(employee))
      return assertSucceeds(bobAdminDb.collection('empleados').doc('e-admin').update({ active: false }))
    })

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
