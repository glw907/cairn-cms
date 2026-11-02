// Shared response helpers for cairn's admin pages: the baseline security headers and a branded
// full-document response. Extracted from guard.ts so the guard's resolve path and the condition
// renderer share one definition.

/** Options for {@link applySecurityHeaders}. */
export interface SecurityHeaderOptions {
  /**
   * Send no Strict-Transport-Security header at all, for a rejection page. Such a page states no
   *  policy: RFC 6797 section 8.1 has a UA replace its cached policy whenever a received header
   *  conveys different information, so a header from a page any cross-site request can reach
   *  would rewrite what the guarded path pinned. The https-required page is served over http,
   *  where the RFC forbids the header outright.
   */
  omitHsts?: boolean;
}

/**
 * Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 * design. frame-ancestors is the modern clickjacking control and the one CSP directive included.
 * Referrer-Policy is `strict-origin`. A same-origin form POST keeps its real `Origin` header, which
 * SvelteKit's origin check reads; `no-referrer` would send `Origin: null` and refuse the
 * editor's submit. The policy still sends no path, so the magic-link token in the confirm
 * page's query string never reaches a referrer. Each admin view also emits a matching referrer
 * `meta` tag: a site's outer handle or a zone rule that sets `no-referrer` site-wide would
 * otherwise lock every editor out, and the browser takes the last-processed meta. Only an
 * `app.html` meta placed after `%sveltekit.head%` overrides cairn's.
 * Strict-Transport-Security carries `max-age` alone, so the engine pins no subdomains;
 * `opts.omitHsts` drops the header entirely. The `Cache-Control` header
 * (the same `private, no-store` spelling `preview.ts` already uses) is unconditional: every
 * admin response this runs against embeds the CSRF token and the signed-in editor's identity,
 * and a shared cache must never hold either. `X-Robots-Tag: noindex, nofollow` is likewise
 * unconditional, so the admin shell and every admin response keep crawlers out.
 */
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'strict-origin');
  if (!opts.omitHsts) {
    headers.set('Strict-Transport-Security', 'max-age=63072000');
  }
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
}

/**
 * A branded full-document admin page, hardened with the baseline headers and never cached. Used for
 * the rejection pages (a CSRF failure, an https-required help page, a bindings-missing fault), which
 * send no Strict-Transport-Security at all.
 *
 * That omission is deliberate and load-bearing. A header here would replace a browser's cached
 * policy rather than restate it (see {@link SecurityHeaderOptions.omitHsts}). The CSRF rejection is
 * reachable by any cross-site POST with no session, so a header there would hand any page on the web
 * a repeatable way to rewrite that policy. The guard's resolve path
 * still sends the header on every response it returns, which is what keeps the admin host pinned.
 * The https-required page is served over http, where RFC 6797 forbids the header anyway.
 */
export function brandedAdminPage(status: number, body: string): Response {
  // Cache-Control is left to applySecurityHeaders below, which sets it unconditionally. Setting it
  // here as well would make the value that actually ships depend on which of the two writers ran
  // last, silently.
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  applySecurityHeaders(headers, { omitHsts: true });
  return new Response(body, { status, headers });
}
