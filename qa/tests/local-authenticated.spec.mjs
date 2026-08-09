import { test, expect } from '@playwright/test'

const requiredEnvironment = [
  'QA_ADMIN_EMAIL',
  'QA_ADMIN_PASSWORD',
  'QA_CLIENT_EMAIL',
  'QA_CLIENT_PASSWORD',
  'QA_AGENDA_DATE',
  'QA_RESCHEDULE_DATE',
]

for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`${name} is required for local authenticated QA.`)
}

test.describe.configure({ mode: 'serial' })

async function login(page, email, password, roleLabel, {
  assertNavigationVisible = true,
  assertProfileVisible = true,
} = {}) {
  await page.goto('/login?next=/dashboard', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo').fill(email)
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/?$/)
  const profileRole = page.getByText(roleLabel, { exact: true })
  if (assertProfileVisible) await expect(profileRole).toBeVisible({ timeout: 15_000 })
  else await expect(profileRole).toBeAttached()
  await expect(page.locator('button[aria-label="Abrir menú"]')).toBeAttached()
  const navigation = page.getByRole('navigation', { name: 'Navegación del panel', exact: true })
  await expect(navigation).toBeAttached()
  if (assertNavigationVisible) await expect(navigation).toBeVisible()

  if (roleLabel === 'Administrador') {
    await expect(navigation.getByRole('link', { name: 'Empleados', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible()
  } else {
    await expect(navigation.getByRole('link', { name: 'Empleados', exact: true })).toHaveCount(0)
  }
}

async function readLocalReservations() {
  const response = await fetch('http://127.0.0.1:8080/v1/projects/hachi-greciaspa/databases/(default)/documents/reservas', {
    headers: { Authorization: 'Bearer owner' },
  })
  if (!response.ok) throw new Error(`Local Firestore snapshot failed with ${response.status}`)
  const body = await response.json()
  return (body.documents || []).map((document) => ({
    notes: document.fields?.notes?.stringValue,
    date: document.fields?.date?.stringValue,
    timeSlot: document.fields?.timeSlot?.stringValue,
    empleadoId: document.fields?.empleadoId?.stringValue || null,
  }))
}

test('admin login works with the local emulator account', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await expect(page.locator('button[aria-label="Abrir menú"]')).toBeAttached()
})

test('client login works with the local emulator account', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')
})

test('anonymous agenda access redirects to the AuthShell login', async ({ page }) => {
  await page.goto('/dashboard/agenda', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fagenda(?:&|$)/)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Hachi & Grecia Spa', exact: true })).toBeVisible()
})

test('admin can navigate the dashboard shell between its main routes', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Citas', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/agenda\/?$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda diaria', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Empleados', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/empleados\/?$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Empleados', exact: true })).toBeVisible()
})

test('admin can open and close the mobile navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador', {
    assertNavigationVisible: false,
    assertProfileVisible: false,
  })

  const menuToggle = page.getByRole('button', { name: 'Abrir menú', exact: true })
  await expect(menuToggle).toBeVisible()
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
  await menuToggle.click()
  await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#admin-sidebar').getByRole('button', { name: 'Cerrar menú', exact: true })).toBeVisible()

  await page.locator('#admin-sidebar').getByRole('button', { name: 'Cerrar menú', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toHaveAttribute('aria-expanded', 'false')
})

test('logout returns to login and protects a subsequent dashboard request', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard(?:&|$)/)
})

test('login and dashboard have no horizontal overflow on a 360px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador', {
    assertNavigationVisible: false,
    assertProfileVisible: false,
  })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('admin can create edit deactivate and reload an employee', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await page.goto('/dashboard/empleados', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Administrar empleados' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo empleado', exact: true }).click()
  await page.getByLabel('Nombre completo').fill('QA Terapeuta')
  await page.getByLabel('Spa Day').check()
  await page.getByRole('button', { name: 'Crear empleado', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Empleado creado.')

  const createdRow = page.locator('tr').filter({ hasText: 'QA Terapeuta' })
  await expect(createdRow).toContainText('Activo')
  await createdRow.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByLabel('Nombre completo').fill('QA Terapeuta Editado')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Empleado actualizado.')

  const editedRow = page.locator('tr').filter({ hasText: 'QA Terapeuta Editado' })
  page.once('dialog', (dialog) => dialog.accept())
  await editedRow.getByRole('button', { name: 'Desactivar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Empleado desactivado.')
  await expect(editedRow).toContainText('Inactivo')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('tr').filter({ hasText: 'QA Terapeuta Editado' })).toContainText('Inactivo')
})

test('admin can inspect agenda filters for assigned and unassigned bookings', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await page.goto('/dashboard/agenda', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Cargando agenda...')).toBeHidden({ timeout: 15_000 })
  await page.getByLabel('Fecha seleccionada').fill(process.env.QA_AGENDA_DATE)
  await expect(page.getByRole('heading', { name: 'Agenda diaria' })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Sin terapeuta asignado' })).toBeVisible({ timeout: 15_000 })
  const therapistFilter = page.getByLabel('Terapeuta', { exact: true })
  await therapistFilter.selectOption('unassigned')
  const timeline = page.getByRole('region', { name: 'Línea de tiempo de reservas' })
  await expect(timeline.getByRole('button', { name: /Ver Spa Day a las 12:00/ })).toBeVisible()

  await therapistFilter.selectOption('harold-salcedo')
  await expect(timeline.getByRole('button', { name: /Ver Spa Day a las 10:00/ })).toBeVisible()
  await expect(timeline.getByRole('button', { name: /Ver Spa Day a las 12:00/ })).toHaveCount(0)
})

test('client can create and cancel a reservation', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')
  await page.goto('/reservar', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Tu ritual, agendado.' })).toBeVisible()

  await page.getByRole('radio', { name: 'Spa Day' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const dateGroup = page.getByRole('radiogroup', { name: 'Fecha' })
  await expect(dateGroup).toBeVisible()
  await dateGroup.getByRole('radio').nth(3).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const timeGroup = page.getByRole('radiogroup', { name: 'Horario' })
  await expect(timeGroup).toBeVisible()
  await timeGroup.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Revisar', exact: true }).click()
  await page.getByLabel('Notas (opcional)').fill('QA_CANCELAR')
  await page.getByRole('button', { name: 'Confirmar reserva', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Ver mis reservas', exact: true }).click()
  const card = page.locator('li.reserva-card').filter({ hasText: 'QA_CANCELAR' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Pendiente')
  page.once('dialog', (dialog) => dialog.accept())
  await card.getByRole('button', { name: 'Cancelar reserva', exact: true }).click()
  await expect(card).toContainText('Cancelada')
})

test('client can reschedule the seeded pending reservation', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')
  const card = page.locator('li.reserva-card').filter({
    has: page.getByText('QA_REAGENDADO', { exact: true }),
  })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Reagendar', exact: true }).click()
  await page.getByLabel('Nueva fecha').fill(process.env.QA_RESCHEDULE_DATE)
  await page.getByLabel('Nuevo horario').fill('16:00')
  await page.getByRole('button', { name: 'Guardar cambio', exact: true }).click()
  await expect(card).toContainText(process.env.QA_RESCHEDULE_DATE, { timeout: 15_000 })
  await expect(card).toContainText('16:00', { timeout: 15_000 })
  await expect(card.getByRole('alert')).toHaveCount(0)
})

test('rescheduling preserves an assigned employee when the new slot is available', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')
  const card = page.locator('li.reserva-card').filter({ hasText: 'QA_REAGENDADO_PRESERVE' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Reagendar', exact: true }).click()
  await page.getByLabel('Nueva fecha').fill(process.env.QA_RESCHEDULE_DATE)
  await page.getByLabel('Nuevo horario').fill('17:00')
  await page.getByRole('button', { name: 'Guardar cambio', exact: true }).click()
  await expect(card).toContainText(process.env.QA_RESCHEDULE_DATE, { timeout: 15_000 })
  await expect(card).toContainText('17:00', { timeout: 15_000 })
  expect(await readLocalReservations()).toContainEqual(expect.objectContaining({
    notes: 'QA_REAGENDADO_PRESERVE',
    date: process.env.QA_RESCHEDULE_DATE,
    timeSlot: '17:00',
    empleadoId: 'harold-salcedo',
  }))
})

test('rescheduling clears an assigned employee when the new slot conflicts', async ({ page }) => {
  await login(page, process.env.QA_CLIENT_EMAIL, process.env.QA_CLIENT_PASSWORD, 'Cliente')
  const card = page.locator('li.reserva-card').filter({ hasText: 'QA_REAGENDADO_CLEANUP' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Reagendar', exact: true }).click()
  await page.getByLabel('Nueva fecha').fill(process.env.QA_RESCHEDULE_DATE)
  await page.getByLabel('Nuevo horario').fill('16:00')
  await page.getByRole('button', { name: 'Guardar cambio', exact: true }).click()
  await expect(card).toContainText(process.env.QA_RESCHEDULE_DATE, { timeout: 15_000 })
  await expect(card).toContainText('16:00', { timeout: 15_000 })
  expect(await readLocalReservations()).toContainEqual(expect.objectContaining({
    notes: 'QA_REAGENDADO_CLEANUP',
    date: process.env.QA_RESCHEDULE_DATE,
    timeSlot: '16:00',
    empleadoId: null,
  }))
})

test('admin retries assignment after cancelling the blocking reservation', async ({ page }) => {
  await login(page, process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, 'Administrador')
  await page.goto('/dashboard/agenda', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Cargando agenda...')).toBeHidden({ timeout: 15_000 })
  await page.getByLabel('Fecha seleccionada').fill(process.env.QA_RESCHEDULE_DATE)
  await expect(page.getByRole('heading', { name: 'Agenda diaria' })).toBeVisible()

  const timeline = page.getByRole('region', { name: 'Línea de tiempo de reservas' })
  const blockingReservation = timeline.getByRole('button', { name: /Ver Grooming a las 15:00/ })
  await expect(blockingReservation).toBeVisible({ timeout: 15_000 })
  await blockingReservation.click()

  const drawer = page.getByRole('dialog')
  await expect(drawer).toContainText('QA_REAGENDADO_BLOCKER')
  page.once('dialog', (dialog) => dialog.accept())
  await drawer.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(drawer).toBeHidden()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Cargando agenda...')).toBeHidden({ timeout: 15_000 })
  await page.getByLabel('Fecha seleccionada').fill(process.env.QA_RESCHEDULE_DATE)
  await expect.poll(
    async () => (await readLocalReservations()).find((reservation) => reservation.notes === 'QA_REAGENDADO_CLEANUP')?.empleadoId,
    { timeout: 15_000 },
  ).toBe('daniela-padilla')
  await expect(timeline.getByRole('button', { name: /Ver Grooming a las 16:00\.\s+Daniela/ })).toBeVisible({ timeout: 15_000 })
})
