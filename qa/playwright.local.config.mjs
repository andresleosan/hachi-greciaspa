import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.QA_BASE_URL
if (!baseURL || !baseURL.startsWith('http://127.0.0.1:')) {
  throw new Error('QA_BASE_URL must point to the local Vite server (http://127.0.0.1:<port>).')
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['local-authenticated.spec.mjs', 'local-public.spec.mjs'],
  timeout: 45_000,
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  reporter: [['html', { outputFolder: 'reports/local', open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
})
