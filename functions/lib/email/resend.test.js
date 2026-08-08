import { beforeEach, describe, expect, it, vi } from 'vitest';
const resendMocks = vi.hoisted(() => ({
    constructor: vi.fn(),
    send: vi.fn(),
    sdkLogError: vi.fn(),
}));
vi.mock('resend', () => ({
    Resend: resendMocks.constructor,
}));
import { createResendProvider, EmailProviderError, } from './resend.js';
import { renderConfirmationHtml } from '../templates/confirmation.js';
import { renderReminderHtml } from '../templates/reminder.js';
let resendClient;
const input = {
    to: 'cliente@example.com',
    recipientName: 'Ana',
    serviceName: 'Baño y corte',
    date: '15 de enero de 2026',
    timeSlot: '10:30',
    idempotencyKey: 'reminder-reservation-123',
};
const confirmationInput = {
    to: 'cliente@example.com',
    recipientName: 'Ana',
    serviceName: 'Baño y corte',
    date: '15 de enero de 2026',
    timeSlot: '10:30',
    idempotencyKey: 'confirmation-reservation-123',
};
describe('reminder email rendering', () => {
    it('renders reminder details and the dashboard destination', () => {
        const html = renderReminderHtml(input);
        expect(html).toContain('Ana');
        expect(html).toContain('Baño y corte');
        expect(html).toContain('15 de enero de 2026');
        expect(html).toContain('10:30');
        expect(html).toContain('https://hachi-greciaspa.web.app/dashboard');
    });
    it('escapes every interpolated reminder value before rendering HTML', () => {
        const html = renderReminderHtml({
            ...input,
            recipientName: '<img src=x onerror="alert(1)"> & Ana',
            serviceName: "Corte <script>alert('x')</script>",
            date: '2026-01-15"><b>',
            timeSlot: "10:30 & 'especial'",
        });
        expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; Ana');
        expect(html).toContain('Corte &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;');
        expect(html).toContain('2026-01-15&quot;&gt;&lt;b&gt;');
        expect(html).toContain('10:30 &amp; &#39;especial&#39;');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img');
    });
});
describe('confirmation email rendering', () => {
    it('renders confirmation details and the dashboard destination', () => {
        const html = renderConfirmationHtml(confirmationInput);
        expect(html).toContain('Ana');
        expect(html).toContain('Baño y corte');
        expect(html).toContain('15 de enero de 2026');
        expect(html).toContain('10:30');
        expect(html).toContain('https://hachi-greciaspa.web.app/dashboard');
    });
    it('escapes confirmation values before rendering HTML', () => {
        const html = renderConfirmationHtml({
            ...confirmationInput,
            recipientName: '<img src=x onerror="alert(1)">',
            serviceName: '<script>alert(1)</script>',
        });
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
});
describe('Resend reminder provider', () => {
    beforeEach(() => {
        resendMocks.constructor.mockReset();
        resendMocks.send.mockReset();
        resendMocks.sdkLogError.mockReset();
        resendMocks.sdkLogError.mockImplementation((...args) => {
            console.error(...args);
        });
        resendMocks.constructor.mockImplementation(function () {
            resendClient = {
                logError: resendMocks.sdkLogError,
                emails: { send: (...args) => resendMocks.send(...args) },
            };
            return resendClient;
        });
    });
    it('creates the Resend client in the provider factory and returns its message id', async () => {
        resendMocks.send.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
        expect(resendMocks.constructor).not.toHaveBeenCalled();
        const provider = createResendProvider('resend_test_secret');
        expect(resendMocks.constructor).not.toHaveBeenCalled();
        await expect(provider.sendReminderEmail(input)).resolves.toEqual({
            providerMessageId: 'msg_123',
        });
        expect(resendMocks.constructor).toHaveBeenCalledWith('resend_test_secret');
        expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({
            to: input.to,
            html: expect.stringContaining('Ana'),
        }), { idempotencyKey: input.idempotencyKey });
    });
    it('marks timeout and server failures as retryable without exposing provider details', async () => {
        resendMocks.send.mockRejectedValueOnce(Object.assign(new Error('request timed out with resend_test_secret'), {
            code: 'ETIMEDOUT',
        }));
        const provider = createResendProvider('resend_test_secret');
        const timeoutError = await provider.sendReminderEmail(input).catch((error) => error);
        expect(timeoutError).toBeInstanceOf(EmailProviderError);
        expect(timeoutError.retryable).toBe(true);
        expect(timeoutError.message).not.toContain('resend_test_secret');
        resendMocks.send.mockResolvedValueOnce({
            data: null,
            error: { statusCode: 503, message: 'private provider response body' },
        });
        const serverError = await provider.sendReminderEmail(input).catch((error) => error);
        expect(serverError).toBeInstanceOf(EmailProviderError);
        expect(serverError.retryable).toBe(true);
        expect(serverError.message).not.toContain('private provider response body');
    });
    it('classifies the SDK fetch failure shape with a null status as retryable', async () => {
        resendMocks.send.mockResolvedValue({
            data: null,
            error: {
                name: 'application_error',
                statusCode: null,
                message: 'Unable to fetch data. The request could not be resolved.',
            },
            headers: null,
        });
        const provider = createResendProvider('resend_test_secret');
        const error = await provider.sendReminderEmail(input).catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(true);
        expect(resendMocks.send).toHaveBeenCalledTimes(1);
    });
    it('passes a bounded idempotency key through the SDK request options', async () => {
        resendMocks.send.mockResolvedValue({ data: { id: 'msg-long-key' }, error: null });
        const provider = createResendProvider('resend_test_secret');
        await provider.sendReminderEmail({ ...input, idempotencyKey: 'x'.repeat(300) });
        expect(resendMocks.send).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/) });
    });
    it('marks concurrent idempotent requests as retryable', async () => {
        resendMocks.send.mockResolvedValue({
            data: null,
            error: {
                name: 'concurrent_idempotent_requests',
                statusCode: 409,
                message: 'request is still processing',
            },
        });
        const provider = createResendProvider('resend_test_secret');
        const error = await provider.sendReminderEmail(input).catch((caught) => caught);
        expect(error.retryable).toBe(true);
    });
    it('does not accept a successful provider response without a message id', async () => {
        resendMocks.send.mockResolvedValue({ data: null, error: null });
        const provider = createResendProvider('resend_test_secret');
        const error = await provider.sendReminderEmail(input).catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(true);
    });
    it('turns a provider request that never settles into a retryable failure', async () => {
        vi.useFakeTimers();
        try {
            resendMocks.send.mockImplementation(() => new Promise(() => undefined));
            const provider = createResendProvider('resend_test_secret');
            const pending = provider.sendReminderEmail(input).then(() => 'sent', () => 'error');
            await vi.advanceTimersByTimeAsync(15_000);
            const result = await Promise.race([pending, Promise.resolve('still-pending')]);
            expect(result).toBe('error');
        }
        finally {
            vi.useRealTimers();
        }
    });
    it('suppresses SDK error logging at the Resend instance boundary', async () => {
        resendMocks.send.mockImplementation(async () => {
            resendClient.logError({
                message: 'provider body with cliente@example.com and resend_test_secret',
            }, '/emails', 500);
            return {
                data: null,
                error: { statusCode: 500, message: 'private provider response body' },
            };
        });
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const provider = createResendProvider('resend_test_secret');
            await expect(provider.sendReminderEmail(input)).rejects.toBeInstanceOf(EmailProviderError);
            expect(consoleError).not.toHaveBeenCalled();
            expect(resendMocks.sdkLogError).not.toHaveBeenCalled();
        }
        finally {
            consoleError.mockRestore();
        }
    });
    it('rejects an empty secret without constructing a client', () => {
        expect(() => createResendProvider(' \t')).toThrow(EmailProviderError);
        expect(resendMocks.constructor).not.toHaveBeenCalled();
    });
    it('marks malformed and permanent client failures as non-retryable', async () => {
        resendMocks.send.mockResolvedValue({
            data: null,
            error: {
                statusCode: 400,
                message: 'network request failed: private malformed payload details',
            },
        });
        const provider = createResendProvider('resend_test_secret');
        const error = await provider.sendReminderEmail(input).catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(false);
        expect(error.message).not.toContain('private malformed payload details');
        expect(resendMocks.send).toHaveBeenCalledTimes(1);
    });
    it('rejects malformed input without calling Resend', async () => {
        const provider = createResendProvider('resend_test_secret');
        const error = await provider
            .sendReminderEmail({ ...input, to: 'not-an-email' })
            .catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(false);
        expect(resendMocks.send).not.toHaveBeenCalled();
    });
    it('rejects a missing idempotency key without calling Resend', async () => {
        const provider = createResendProvider('resend_test_secret');
        const error = await provider
            .sendReminderEmail({ ...input, idempotencyKey: ' ' })
            .catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(false);
        expect(resendMocks.send).not.toHaveBeenCalled();
    });
    it('sends confirmation email with the deterministic idempotency key', async () => {
        resendMocks.send.mockResolvedValue({ data: { id: 'confirmation-msg-1' }, error: null });
        const provider = createResendProvider('resend_test_secret');
        await expect(provider.sendConfirmationEmail(confirmationInput)).resolves.toEqual({
            providerMessageId: 'confirmation-msg-1',
        });
        expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Confirmación de tu cita en Hachi & Grecia Spa' }), { idempotencyKey: confirmationInput.idempotencyKey });
    });
    it('rejects malformed confirmation input without calling Resend', async () => {
        const provider = createResendProvider('resend_test_secret');
        const error = await provider
            .sendConfirmationEmail({ ...confirmationInput, to: 'not-an-email' })
            .catch((caught) => caught);
        expect(error).toBeInstanceOf(EmailProviderError);
        expect(error.retryable).toBe(false);
        expect(resendMocks.send).not.toHaveBeenCalled();
    });
});
