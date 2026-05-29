// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims.
// The factory takes per-site branding and an injected send, so tests run the real handlers
// against a sink. The confirm-load, confirm, and logout handlers arrive in Task 6.
import { requireOrigin } from '../env.js';
import { generateToken, hashToken, TOKEN_TTL_MS } from '../auth/crypto.js';
import { findEditor, issueToken } from '../auth/store.js';
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

  return { requestAction };
}
