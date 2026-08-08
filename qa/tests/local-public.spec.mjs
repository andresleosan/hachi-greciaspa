import { test, expect } from '@playwright/test'

test('public prices show real catalog and WhatsApp', async ({ page }) => {
  await page.goto('/precios')
  await expect(page.getByText('Spa Day Mini · Pelo corto', { exact: true })).toBeVisible()
  await expect(page.getByText('Spa Day Mini · Pelo largo sin nudos', { exact: true })).toBeVisible()
  await expect(page.getByText('$240', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Consultar por WhatsApp/i })).toHaveAttribute('href', 'https://wa.me/525578875525?src=qr')
})

test('public services show commercial prices', async ({ page }) => {
  await page.goto('/servicios')
  await expect(page.getByText('Desde $240', { exact: true })).toBeVisible()
  await expect(page.getByText('$250/día · $3,500/mes', { exact: true })).toBeVisible()
})

test('contact page exposes the real WhatsApp', async ({ page }) => {
  await page.goto('/contacto')
  await expect(page.getByRole('link', { name: /Contactar por WhatsApp/i })).toHaveAttribute('href', 'https://wa.me/525578875525?src=qr')
  await expect(page.locator('body')).not.toContainText('+52 55 1234 5678')
})
