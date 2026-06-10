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
import { buildMagicLinkMessage, cloudflareSend, emailSendFailure, errorCode, type AuthBranding, type SendMagicLink } from '../email.js';
import { issueCsrfToken } from './csrf.js';
import { log } from '../log/index.js';
import type { RequestContext } from './types.js';

export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
}

/**
 * The request-action result. `status` is the discriminant; `sent` is kept for a site rendering its
 * own form against `form.sent`, so the field is additive. The neutral and send-ok paths return the
 * identical `{ status: 'sent', sent: true }`, so the common case never leaks allowlist membership.
 */
export type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };

export function createAuthRoutes(config: AuthRoutesConfig) {
  const send = config.send ?? cloudflareSend;

  /**
   * POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token,
   * emails the confirmation link, and awaits the send so the status reflects its outcome. The
   * neutral and send-ok responses are identical, so the common case never leaks membership.
   */
  async function requestAction(event: RequestContext): Promise<RequestResult> {
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
    // Non-editor: byte-identical to the editor send-ok path, so the response never leaks membership.
    if (!editor) return { status: 'sent', sent: true };

    const now = Date.now();
    // Per-email cooldown: an editor who requested within the window gets the throttled signal rather
    // than a second email. This reveals editor membership, the deliberate relaxed-non-leak posture.
    if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {
      return { status: 'throttled', sent: false };
    }

    const token = generateToken();
    await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);
    log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
    const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
    // The token row is the security-critical write the email depends on, so it is awaited first.
    // The send is now awaited too (no waitUntil backgrounding), so its outcome drives the response:
    // confirm the link went out before telling an editor to check their inbox. The cost is one
    // email-API round trip on the login POST, the right trade for a login flow.
    try {
      await send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link }));
    } catch (err) {
      // Map the binding failure to its registered condition (carried as a CairnError with the
      // original as cause), and log the greppable code plus the conditionId so the next onboarding
      // gap reads straight to its fix. The editor sees only a generic message, never this detail.
      const failure = emailSendFailure(err);
      log.error('auth.link.send_failed', { email, error: String(err), code: errorCode(err), conditionId: failure.conditionId });
      return { status: 'send_error', sent: false };
    }
    return { status: 'sent', sent: true };
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
