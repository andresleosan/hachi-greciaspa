import { afterEach, describe, expect, it } from 'vitest';
import { getAppBaseUrl, getDashboardUrl } from './appUrl.js';
const originalValue = process.env.PUBLIC_APP_URL;
afterEach(() => {
    if (originalValue === undefined)
        delete process.env.PUBLIC_APP_URL;
    else
        process.env.PUBLIC_APP_URL = originalValue;
});
describe('application URL', () => {
    it('uses the temporary Vercel URL when configuration is absent', () => {
        delete process.env.PUBLIC_APP_URL;
        expect(getAppBaseUrl()).toBe('https://hachi-greciaspa.vercel.app');
        expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard');
    });
    it('uses configured URL and removes trailing slashes', () => {
        process.env.PUBLIC_APP_URL = 'https://spa.example///';
        expect(getAppBaseUrl()).toBe('https://spa.example');
        expect(getDashboardUrl()).toBe('https://spa.example/dashboard');
    });
    it('uses the fallback when configuration is only whitespace', () => {
        process.env.PUBLIC_APP_URL = '   ';
        expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard');
    });
    it('uses the fallback when configuration is empty', () => {
        process.env.PUBLIC_APP_URL = '';
        expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard');
    });
    it('uses the fallback when configuration has an invalid scheme', () => {
        process.env.PUBLIC_APP_URL = 'javascript:alert(1)';
        expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard');
    });
    it('uses the fallback when configuration is malformed or contains credentials', () => {
        process.env.PUBLIC_APP_URL = 'https://user:password@spa.example';
        expect(getAppBaseUrl()).toBe('https://hachi-greciaspa.vercel.app');
        process.env.PUBLIC_APP_URL = 'https://spa.example invalid';
        expect(getAppBaseUrl()).toBe('https://hachi-greciaspa.vercel.app');
    });
    it('accepts a local HTTP URL', () => {
        process.env.PUBLIC_APP_URL = 'http://localhost:3000/';
        expect(getDashboardUrl()).toBe('http://localhost:3000/dashboard');
    });
});
