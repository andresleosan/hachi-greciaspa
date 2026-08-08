import * as Sentry from '@sentry/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureFunctionException, initFunctionsSentry } from './sentry.js';
vi.mock('@sentry/node', () => ({
    captureException: vi.fn(),
    init: vi.fn(),
}));
describe('Functions Sentry observability', () => {
    const originalDsn = process.env.SENTRY_DSN;
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.SENTRY_DSN;
    });
    afterEach(() => {
        if (originalDsn === undefined)
            delete process.env.SENTRY_DSN;
        else
            process.env.SENTRY_DSN = originalDsn;
    });
    it('does not initialize when SENTRY_DSN is absent', () => {
        expect(initFunctionsSentry()).toBe(false);
        expect(Sentry.init).not.toHaveBeenCalled();
    });
    it('initializes once when SENTRY_DSN is available', () => {
        process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
        expect(initFunctionsSentry()).toBe(true);
        expect(initFunctionsSentry()).toBe(true);
        expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
    it('captures only stable operation context and never throws', () => {
        process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
        initFunctionsSentry();
        vi.mocked(Sentry.captureException).mockImplementation(() => {
            throw new Error('transport failure');
        });
        expect(() => captureFunctionException(new Error('email=cliente@example.com'), {
            operation: 'send-confirmation-email',
        })).not.toThrow();
    });
    it('removes exception text before transport', async () => {
        const { sanitizeFunctionsEvent } = await import('./sentry.js');
        const sanitized = sanitizeFunctionsEvent({
            message: 'Failed for cliente@example.com',
            exception: {
                values: [{ type: 'Error', value: 'token=secret cliente@example.com' }],
            },
        });
        expect(sanitized.message).toBeUndefined();
        expect(sanitized.exception).toBeUndefined();
    });
});
