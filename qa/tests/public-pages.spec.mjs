import { test, expect } from '@playwright/test'

const publicRoutes = [
  ['/', 'Hachi & Grecia'],
  ['/precios', 'Precios'],
  ['/equipo', 'Equipo'],
  ['/galeria', 'Galería'],
  ['/contacto', 'Contacto'],
]

test.describe('rutas públicas Luxe', () => {
  for (const [route, expectedText] of publicRoutes) {
    test(`${route} carga sin overflow horizontal`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toContainText(expectedText)
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '\\/$' : `${route}\\/?$`}`))

      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      expect(hasOverflow).toBe(false)
    })
  }
})

async function loginAndVerify(page, email, password, roleLabel) {
  await page.goto('/login?next=/dashboard', { waitUntil: 'networkidle' })
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard\/?$/)
  await expect(page.getByText(roleLabel, { exact: true })).toBeVisible({ timeout: 15_000 })
}

test('admin puede iniciar sesión y ver el rol administrativo', async ({ page }) => {
  const email = process.env.QA_ADMIN_EMAIL
  const password = process.env.QA_ADMIN_PASSWORD
  test.skip(!email || !password, 'QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD no configurados')
  await loginAndVerify(page, email, password, 'Administrador')
})

test('cliente puede iniciar sesión y ver el rol de cliente', async ({ page }) => {
  const email = process.env.QA_CLIENT_EMAIL
  const password = process.env.QA_CLIENT_PASSWORD
  test.skip(!email || !password, 'QA_CLIENT_EMAIL/QA_CLIENT_PASSWORD no configurados')
  await loginAndVerify(page, email, password, 'Cliente')
})
