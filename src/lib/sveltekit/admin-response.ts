// Shared response helpers for cairn's admin pages: the baseline security headers and a branded
// full-document response. Extracted from guard.ts so the guard's resolve path and the condition
// renderer share one definition.

/** Options for {@link applySecurityHeaders}. */
export interface SecurityHeaderOptions {
  /**
   * Pin every sibling subdomain to HTTPS along with the admin host itself; omitted or false, the
   * emitted header carries only `max-age`. The admin surface has standing to insist on HTTPS for
   * itself, but pinning subdomains the engine knows nothing about is a decision that belongs to
   * whoever owns the domain, so this stays off unless a site opts in.
   */
  includeSubDomains?: boolean;
}

/**
 * Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 * design. frame-ancestors is the modern clickjacking control and the one CSP directive included.
 * `max-age` on Strict-Transport-Security is always set; `includeSubDomains` is added only when
 * `opts.includeSubDomains` is true.
 */
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set(
    'Strict-Transport-Security',
    opts.includeSubDomains ? 'max-age=63072000; includeSubDomains' : 'max-age=63072000'
  );
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/**
 * A branded full-document admin page, hardened with the baseline headers and never cached. Every
 * caller of this function is a rejection response built before the guard's composed runtime is in
 * scope (a CSRF or origin mismatch, an https-required page, a bindings-missing fault), so there is
 * no `AuthGuardOptions` to read an `includeSubDomains` opt-in from; it always renders with the
 * safe default rather than growing its own configuration channel for one header.
 */
export function brandedAdminPage(status: number, body: string): Response {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  applySecurityHeaders(headers);
  return new Response(body, { status, headers });
}
