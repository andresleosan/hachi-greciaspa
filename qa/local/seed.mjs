import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { addDays, format, startOfDay } from 'date-fns'

function requireEmulatorEnvironment(env = process.env) {
  const required = ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']
  const missing = required.filter((name) => !env[name])
  if (missing.length > 0) {
    throw new Error(`QA seed requires emulator environment: ${missing.join(', ')}`)
  }
}

function safeRunId(runId) {
  return String(runId || 'run')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'run'
}

export function buildQaCredentials(runId) {
  const id = safeRunId(runId)
  const suffix = randomBytes(12).toString('base64url')
  return {
    adminEmail: `qa-admin-${id}@example.test`,
    adminPassword: `QA-admin-${suffix}!`,
    clientEmail: `qa-client-${id}@example.test`,
    clientPassword: `QA-client-${suffix}!`,
  }
}

export function buildQaDates(now = new Date()) {
  const base = startOfDay(now)
  const day = base.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  const agenda = addDays(base, daysUntilSunday)
  const reschedule = addDays(agenda, 1)

  return {
    agendaDate: format(agenda, 'yyyy-MM-dd'),
    unassignedDate: format(agenda, 'yyyy-MM-dd'),
    rescheduleDate: format(reschedule, 'yyyy-MM-dd'),
  }
}

async function loadAdmin() {
  const [{ deleteApp, initializeApp }, admin, { getAuth }, { getFirestore, Timestamp }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin'),
    import('firebase-admin/auth'),
    import('firebase-admin/firestore'),
  ])
  return { cert: admin.cert, deleteApp, initializeApp, getAuth, getFirestore, Timestamp }
}

export async function createQaUsers({ projectId = 'hachi-greciaspa', runId = 'run', env = process.env } = {}) {
  requireEmulatorEnvironment(env)
  const { cert, deleteApp, initializeApp, getAuth, getFirestore, Timestamp } = await loadAdmin()
  const credentials = buildQaCredentials(runId)
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail: `qa-${safeRunId(runId)}@invalid.test`,
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    }),
    projectId,
  }, `qa-${safeRunId(runId)}`)
  const previousEnvironment = {
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  }
  process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST
  process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST

  try {
    const auth = getAuth(app)
    const db = getFirestore(app)

    const adminUser = await auth.createUser({
      email: credentials.adminEmail,
      password: credentials.adminPassword,
      displayName: 'QA Administrador',
    })
    const clientUser = await auth.createUser({
      email: credentials.clientEmail,
      password: credentials.clientPassword,
      displayName: 'QA Cliente',
    })

    await auth.setCustomUserClaims(adminUser.uid, { admin: true })
    const createdAt = Timestamp.now()
    await Promise.all([
      db.doc(`users/${adminUser.uid}`).set({
        email: credentials.adminEmail,
        displayName: 'QA Administrador',
        role: 'admin',
        createdAt,
      }),
      db.doc(`users/${clientUser.uid}`).set({
        email: credentials.clientEmail,
        displayName: 'QA Cliente',
        role: 'client',
        createdAt,
      }),
    ])

    return {
      admin: { uid: adminUser.uid, email: credentials.adminEmail, password: credentials.adminPassword },
      client: { uid: clientUser.uid, email: credentials.clientEmail, password: credentials.clientPassword },
      app,
      db,
      deleteApp,
    }
  } finally {
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

export async function seedQaBookings({ db, users, projectId = 'hachi-greciaspa', runId = 'run' } = {}) {
  if (!db || !users?.client?.uid) throw new Error('QA booking seed requires an initialized client user and database')

  const { Timestamp } = await loadAdmin()
  const dates = buildQaDates()
  const base = {
    userId: users.client.uid,
    userName: users.client.email,
    userEmail: users.client.email,
    serviceId: 'spa-day',
    serviceName: 'Spa Day',
    price: null,
    durationMin: 90,
    status: 'pending',
    createdBy: 'admin',
    createdAt: Timestamp.now(),
  }
  const reservations = [
    {
      id: `qa-agenda-assigned-${safeRunId(runId)}`,
      date: dates.agendaDate,
      timeSlot: '10:00',
      notes: 'QA_AGENDA_ASSIGNED',
      empleadoId: 'harold-salcedo',
    },
    {
      id: `qa-agenda-unassigned-${safeRunId(runId)}`,
      date: dates.unassignedDate,
      timeSlot: '12:00',
      notes: 'QA_AGENDA_UNASSIGNED',
      empleadoId: null,
    },
    {
      id: `qa-reschedule-${safeRunId(runId)}`,
      date: dates.rescheduleDate,
      timeSlot: '11:00',
      notes: 'QA_REAGENDADO',
      empleadoId: null,
    },
    {
      id: `qa-reschedule-preserve-${safeRunId(runId)}`,
      date: dates.agendaDate,
      timeSlot: '14:00',
      notes: 'QA_REAGENDADO_PRESERVE',
      empleadoId: 'harold-salcedo',
    },
    {
      id: `qa-reschedule-cleanup-${safeRunId(runId)}`,
      serviceId: 'grooming',
      serviceName: 'Grooming',
      date: dates.agendaDate,
      timeSlot: '14:00',
      notes: 'QA_REAGENDADO_CLEANUP',
      empleadoId: 'harold-salcedo',
    },
    {
      id: `qa-reschedule-blocker-${safeRunId(runId)}`,
      serviceId: 'grooming',
      serviceName: 'Grooming',
      date: dates.rescheduleDate,
      timeSlot: '15:00',
      notes: 'QA_REAGENDADO_BLOCKER',
      status: 'confirmed',
      empleadoId: 'harold-salcedo',
    },
  ]

  await Promise.all(reservations.map(({ id, ...reservation }) => (
    db.doc(`reservas/${id}`).set({ ...base, ...reservation })
  )))

  return { ...dates, employeeId: 'harold-salcedo', projectId }
}
