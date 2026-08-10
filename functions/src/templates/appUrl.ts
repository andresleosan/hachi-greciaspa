const DEFAULT_APP_BASE_URL = 'https://hachi-greciaspa.vercel.app'

export function getAppBaseUrl(): string {
  const configured = process.env.PUBLIC_APP_URL?.trim()
  return (configured || DEFAULT_APP_BASE_URL).replace(/\/+$/, '')
}

export function getDashboardUrl(): string {
  return `${getAppBaseUrl()}/dashboard`
}
