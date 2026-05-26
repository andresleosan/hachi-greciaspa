import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import fs from 'fs'
import path from 'path'

async function main() {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8')

  const testEnv = await initializeTestEnvironment({
    projectId: 'hachi-greciaspa-test',
    firestore: { rules }
  })

  // Unauthenticated app
  const unauth = testEnv.unauthenticatedContext()
  const guestDb = unauth.firestore()

  // Authenticated user (alice)
  const alice = testEnv.authenticatedContext('alice', { uid: 'alice' })
  const aliceDb = alice.firestore()

  try {
    console.log('Running basic rules tests...')

    // Public read should succeed
    await assertSucceeds(guestDb.collection('servicios').doc('s1').get())

    // Public write should fail
    await assertFails(guestDb.collection('servicios').doc('s1').set({ name: 'x' }))

    // User can create their own profile
    await assertSucceeds(aliceDb.collection('users').doc('alice').set({ displayName: 'Alice' }))

    // User should not read other user's profile (unless admin)
    await assertFails(aliceDb.collection('users').doc('bob').get())

    console.log('Basic rules tests completed. If you see no failures, rules behave as expected for these scenarios.')
  } finally {
    await testEnv.cleanup()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
