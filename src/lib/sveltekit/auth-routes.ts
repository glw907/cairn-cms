// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims.
// The factory takes per-site branding and an injected send, so tests run the real handlers
// against a sink. The confirm-load, confirm, and logout handlers arrive in Task 6.
import { redirect } from '@sveltejs/kit';
import { requireOrigin } from '../env.js';
import {
  generateToken,
  generateSessionId,
  hashToken,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
  COOKIE_NAME,
} from '../auth/crypto.js';
import { findEditor, issueToken, consumeToken, createSession, deleteSession } from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, type AuthBranding, type SendMagicLink } from '../email.js';
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
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();

    const editor = email ? await findEditor(env.AUTH_DB!, email) : null;
    if (editor) {
      const token = generateToken();
      const now = Date.now();
      await issueToken(env.AUTH_DB!, email, await hashToken(token), now + TOKEN_TTL_MS, now);
      const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
      await send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link }));
    }
    return { sent: true };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer.
   */
  async function confirmLoad(event: RequestContext): Promise<{ token: string }> {
    event.setHeaders?.({ 'Referrer-Policy': 'no-referrer' });
    return { token: event.url.searchParams.get('token') ?? '' };
  }

  /**
   * POST /admin/auth/confirm. Hashes the submitted token and consumes it atomically. A valid
   * token yields the email; the handler creates a session, sets the cookie, and redirects to
   * /admin. An invalid, replayed, or expired token redirects to the login page.
   */
  async function confirmAction(event: RequestContext): Promise<never> {
    const env = event.platform?.env ?? {};
    const form = await event.request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) throw redirect(303, '/admin/login?error=expired');

    const email = await consumeToken(env.AUTH_DB!, await hashToken(token), Date.now());
    if (!email) throw redirect(303, '/admin/login?error=expired');

    const id = generateSessionId();
    const now = Date.now();
    await createSession(env.AUTH_DB!, id, email, now + SESSION_TTL_MS, now);
    event.cookies.set(COOKIE_NAME, id, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    throw redirect(303, '/admin');
  }

  /** POST /admin/auth/logout. Deletes the session row and clears the cookie. */
  async function logoutAction(event: RequestContext): Promise<never> {
    const env = event.platform?.env ?? {};
    const id = event.cookies.get(COOKIE_NAME);
    if (id) await deleteSession(env.AUTH_DB!, id);
    event.cookies.delete(COOKIE_NAME, { path: '/' });
    throw redirect(303, '/admin/login');
  }

  return { requestAction, confirmLoad, confirmAction, logoutAction };
}
