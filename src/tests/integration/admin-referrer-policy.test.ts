import { describe, it, expect } from 'vitest';
import { applySecurityHeaders } from '../../lib/sveltekit/admin-response.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { makeRecordingCookies } from './_auth-harness.js';
import { testEvent } from '../helpers/test-event.js';

// strict-origin keeps the Origin header on a same-origin form POST, which Kit's own origin check
// reads on every admin POST. no-referrer would send `Origin: null` and lock an editor out.
describe('admin Referrer-Policy', () => {
  it('applySecurityHeaders serves strict-origin', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get('Referrer-Policy')).toBe('strict-origin');
  });

  it("confirmLoad's response headers carry strict-origin", () => {
    const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'a@b.c' } });
    const sent: Record<string, string> = {};
    routes.confirmLoad(
      testEvent({
        url: 'https://test.dev/admin/auth/confirm?token=ml',
        cookies: makeRecordingCookies(),
        setHeaders: (h) => Object.assign(sent, h),
      }),
    );
    expect(sent['Referrer-Policy']).toBe('strict-origin');
  });
});
