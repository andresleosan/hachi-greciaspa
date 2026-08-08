import * as Sentry from '@sentry/node';
const sensitiveKeyPattern = /^(email|password|token|authorization|cookie|secret|apiKey|accessToken|refreshToken)$/i;
let sentryEnabled = false;
function sanitizeValue(value, key) {
    if (key && sensitiveKeyPattern.test(key))
        return undefined;
    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeValue(item))
            .filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object') {
        return sanitizeRecord(value);
    }
    return value;
}
function sanitizeRecord(record) {
    return Object.fromEntries(Object.entries(record)
        .map(([key, value]) => [key, sanitizeValue(value, key)])
        .filter(([, value]) => value !== undefined));
}
export function sanitizeFunctionsEvent(event) {
    const sanitized = { ...event };
    delete sanitized.request;
    delete sanitized.user;
    delete sanitized.breadcrumbs;
    delete sanitized.message;
    delete sanitized.exception;
    delete sanitized.logentry;
    if (sanitized.extra) {
        sanitized.extra = sanitizeRecord(sanitized.extra);
    }
    if (sanitized.contexts) {
        sanitized.contexts = sanitizeRecord(sanitized.contexts);
    }
    if (sanitized.tags) {
        sanitized.tags = sanitizeRecord(sanitized.tags);
    }
    return sanitized;
}
export function initFunctionsSentry() {
    if (sentryEnabled)
        return true;
    const dsn = process.env.SENTRY_DSN;
    if (!dsn)
        return false;
    try {
        Sentry.init({
            dsn,
            sendDefaultPii: false,
            tracesSampleRate: 0,
            beforeSend: sanitizeFunctionsEvent,
        });
        sentryEnabled = true;
        return true;
    }
    catch {
        return false;
    }
}
export function captureFunctionException(error, context) {
    const safeError = new Error(error instanceof Error ? error.name : 'Unhandled function error');
    try {
        if (!sentryEnabled)
            return;
        Sentry.captureException(safeError, {
            tags: { operation: context.operation },
        });
    }
    catch {
        // Observability must never alter the business function outcome.
    }
}
