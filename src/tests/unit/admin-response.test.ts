import { describe, it, expect } from 'vitest';
import { applySecurityHeaders, brandedAdminPage } from '../../lib/sveltekit/admin-response.js';

describe('admin-response helpers', () => {
  it('applies the baseline security headers, HSTS without includeSubDomains by default', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000');
    expect(headers.get('Strict-Transport-Security')).not.toContain('includeSubDomains');
  });

  it('restores includeSubDomains when the site opts in', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { includeSubDomains: true });
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });

  it('opting out explicitly matches the default', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { includeSubDomains: false });
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000');
  });

  it('builds a branded html response, no-store and hardened', () => {
    const res = brandedAdminPage(400, '<!doctype html><p>hi</p>');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
