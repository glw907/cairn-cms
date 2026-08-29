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

  // Under Lax the cookie is re-set far less often (issueCsrfToken re-anchors Max-Age on a present
  // cookie rather than a fresh Set-Cookie), which removed an accidental Set-Cookie cache
  // suppressor on admin HTML that embeds the CSRF token and the editor's identity.
  it('marks the admin response private and never cached', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('omits Strict-Transport-Security entirely when asked, keeping the other headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { omitHsts: true });
    expect(headers.get('Strict-Transport-Security')).toBeNull();
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('builds a branded html response, private/no-store and hardened', () => {
    const res = brandedAdminPage(400, '<!doctype html><p>hi</p>');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  // RFC 6797 section 8.1 makes a received STS header REPLACE the cached policy, so a rejection page
  // sending max-age without includeSubDomains would unpin the subdomains an opted-in site's guarded
  // responses pinned. The CSRF rejection is reachable by any cross-site POST with no session, so
  // that would be a repeatable downgrade any page on the web could trigger. Omitting writes nothing.
  it('sends no Strict-Transport-Security on a rejection page, so it cannot downgrade a pinned policy', () => {
    const res = brandedAdminPage(403, '<!doctype html><p>denied</p>');
    expect(res.headers.get('Strict-Transport-Security')).toBeNull();
  });
});
