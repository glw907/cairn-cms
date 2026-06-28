// The server-only login seam. signIn mints a session for an already-verified email with no
// verification of its own, so it is an account-takeover primitive that must never reach a client
// bundle. The `.server.` infix is SvelteKit's server-only convention: a client import of a
// `*.server.*` module is a build error, which is the enforcement. auth-routes.ts re-exports nothing
// of signIn; only the ./extend barrel (a server entry) re-exports it.
import { mintSession, requireDb } from './auth-routes.js';
import { log } from '../log/index.js';
import type { AuthTier } from '../auth/types.js';
import type { RequestContext } from './types.js';

/**
 * Mint a session for an already-verified email, the seam for any externally verified mechanism
 * (OAuth, SSO). Performs no verification and trusts the caller to have authenticated the email, so it
 * is server-only. The tier defaults to `member`; a prior session for the email is rotated.
 */
export async function signIn(
  event: RequestContext,
  verifiedEmail: string,
  opts: { tier?: AuthTier; redirectTo?: string } = {},
): Promise<void> {
  const db = requireDb(event.platform?.env ?? {});
  const email = verifiedEmail.trim().toLowerCase();
  const tier = opts.tier ?? 'member';
  await mintSession(event, db, email, tier);
  log.info('auth.signin', { email, tier });
}
