const DEFAULT_APP_BASE_URL = 'https://hachi-greciaspa.vercel.app';
export function getAppBaseUrl() {
    const configured = process.env.PUBLIC_APP_URL?.trim();
    return (configured || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
}
export function getDashboardUrl() {
    return `${getAppBaseUrl()}/dashboard`;
}
