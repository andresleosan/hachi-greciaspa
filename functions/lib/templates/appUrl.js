const DEFAULT_APP_BASE_URL = 'https://hachi-greciaspa.vercel.app';
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
function isSafeAppUrl(value) {
    try {
        const parsed = new URL(value);
        return (ALLOWED_PROTOCOLS.has(parsed.protocol) &&
            parsed.hostname.length > 0 &&
            parsed.username.length === 0 &&
            parsed.password.length === 0);
    }
    catch {
        return false;
    }
}
export function getAppBaseUrl() {
    const configured = process.env.PUBLIC_APP_URL?.trim();
    if (!configured || !isSafeAppUrl(configured))
        return DEFAULT_APP_BASE_URL;
    return configured.replace(/\/+$/, '');
}
export function getDashboardUrl() {
    return `${getAppBaseUrl()}/dashboard`;
}
