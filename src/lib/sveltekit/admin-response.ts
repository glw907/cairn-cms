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
  /**
   * Send no Strict-Transport-Security header at all. For a response that cannot know the site's
   *  opt-in, which is every rejection page, since sending the weaker header would not be a weaker
   *  default but a policy write: RFC 6797 section 8.1 has a UA REPLACE its cached policy whenever a
   *  received header conveys different information, so a `max-age`-only header from the same host
   *  clears an `includeSubDomains` assertion the guarded path had made. Omitting the header writes
   *  nothing, since the RFC acts only on receipt.
   */
  omitHsts?: boolean;
}

/**
 * Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 * design. frame-ancestors is the modern clickjacking control and the one CSP directive included.
 * Strict-Transport-Security carries `max-age` and, when `opts.includeSubDomains` is set, the
 * subdomain directive; `opts.omitHsts` drops the header entirely.
 */
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  if (!opts.omitHsts) {
    headers.set(
      'Strict-Transport-Security',
      opts.includeSubDomains ? 'max-age=63072000; includeSubDomains' : 'max-age=63072000'
    );
  }
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/**
 * A branded full-document admin page, hardened with the baseline headers and never cached. Used for
 * the rejection pages (a CSRF failure, an https-required help page, a bindings-missing fault), which
 * send no Strict-Transport-Security at all.
 *
 * That omission is deliberate and load-bearing. These pages do not receive the site's
 * `includeSubDomains` opt-in, and a `max-age`-only header would replace a pinned policy rather than
 * merely restate a weaker one (see {@link SecurityHeaderOptions.omitHsts}). The CSRF rejection is
 * reachable by any cross-site POST with no session, so a site that opted in would otherwise hand any
 * page on the web a repeatable way to unpin its sibling subdomains. The guard's own resolve path
 * still sends the header on every response it returns, which is what keeps the admin host pinned.
 * The https-required page is served over http, where RFC 6797 forbids the header anyway.
 */
export function brandedAdminPage(status: number, body: string): Response {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  applySecurityHeaders(headers, { omitHsts: true });
  return new Response(body, { status, headers });
}
