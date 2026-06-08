// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims.
// The factory takes per-site branding and an injected send, so tests run the real handlers
// against a sink. The confirm-load, confirm, and logout handlers arrive in Task 6.
import { redirect } from '@sveltejs/kit';
import { requireOrigin, requireDb } from '../env.js';
import {
  generateToken,
  generateSessionId,
  hashToken,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
  SEND_COOLDOWN_MS,
  sessionCookieName,
} from '../auth/crypto.js';
import { findEditor, issueToken, consumeToken, createSession, deleteSession, recentlyIssued } from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, type AuthBranding, type SendMagicLink } from '../email.js';
import { issueCsrfToken } from './csrf.js';
import { log } from '../log/index.js';
import type { RequestContext } from './types.js';

export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
}

export function createAuthRoutes(config: AuthRoutesConfig) {
  const send = config.send ?? cloudflareSend;

  /**
   * POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token
   * and emails the confirmation link. The response is identical whether or not the email is
   * allow-listed, so the endpoint never leaks membership.
   */
  async function requestAction(event: RequestContext): Promise<{ sent: true }> {
    const env = event.platform?.env ?? {};
    const origin = requireOrigin(env);
    const db = requireDb(env);
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    // `email` here is unvalidated request input logged before the allowlist check, so bound the
    // logged value to the RFC 5321 maximum to cap an abusive record's size. A real editor's address
    // fits well under this; only a junk payload is truncated.
    log.info('auth.link.requested', { email: email.slice(0, 320) });

    const editor = email ? await findEditor(db, email) : null;
    if (editor) {
      const now = Date.now();
      // Per-email cooldown: skip the reissue and send when a token for this email was issued within
      // the window, so the endpoint cannot flood an editor's inbox. The response is unchanged, so
      // the non-leak property holds.
      if (!(await recentlyIssued(db, email, now - SEND_COOLDOWN_MS))) {
        const token = generateToken();
        await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);
        log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
        const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
        // The token row is the security-critical write the email depends on, so it is awaited. The
        // send is a post-response side effect, handed to waitUntil so a slow email provider does not
        // hold the response. An absent waitUntil (local dev, tests) falls back to await. A send
        // failure is logged so observability survives a backgrounded send.
        const sending = send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link })).catch(
          (err) => log.error('auth.link.send_failed', { email, error: String(err) }),
        );
        // adapter-cloudflare exposes the ExecutionContext as platform.ctx; platform.context is a
        // deprecated alias kept as a fallback so an adapter that drops it keeps backgrounding.
        const ctx = event.platform?.ctx ?? event.platform?.context;
        if (ctx?.waitUntil) ctx.waitUntil(sending);
        else await sending;
      }
    }
    return { sent: true };
  }

  /** GET /admin/login. Public. Carries the site name, an optional `?error`, and the CSRF token. */
  function loginLoad(event: RequestContext): { siteName: string; error: string | null; csrf: string } {
    return {
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer, and
   * issues the CSRF token so the confirm form can render the hidden field.
   */
  function confirmLoad(
    event: RequestContext,
  ): { token: string; siteName: string; error: string | null; csrf: string } {
    event.setHeaders({ 'Referrer-Policy': 'no-referrer' });
    return {
      token: event.url.searchParams.get('token') ?? '',
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }

  /**
   * POST /admin/auth/confirm. Hashes the submitted token and consumes it atomically. A valid
   * token yields the email; the handler creates a session, sets the cookie, and redirects to
   * /admin. An invalid, replayed, or expired token redirects to the login page.
   */
  async function confirmAction(event: RequestContext): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) throw redirect(303, '/admin/login?error=expired');

    const now = Date.now();
    const email = await consumeToken(db, await hashToken(token), now);
    if (!email) throw redirect(303, '/admin/login?error=expired');
    log.info('auth.token.confirmed', { email });

    const id = generateSessionId();
    await createSession(db, id, email, now + SESSION_TTL_MS, now);
    log.info('auth.session.created', { email });
    const secure = event.url.protocol === 'https:';
    event.cookies.set(sessionCookieName(secure), id, {
      path: '/',
      httpOnly: true,
      // __Host- needs Secure unconditionally on https; local http dev drops the prefix and Secure.
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    throw redirect(303, '/admin');
  }

  /** POST /admin/auth/logout. Deletes the session row and clears the cookie. */
  async function logoutAction(event: RequestContext): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    const name = sessionCookieName(event.url.protocol === 'https:');
    const id = event.cookies.get(name);
    if (id) {
      await deleteSession(db, id);
      log.info('auth.session.destroyed');
    }
    event.cookies.delete(name, { path: '/' });
    throw redirect(303, '/admin/login');
  }

  return { loginLoad, requestAction, confirmLoad, confirmAction, logoutAction };
}
