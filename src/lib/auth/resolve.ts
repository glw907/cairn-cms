// src/lib/auth/resolve.ts
// Resolve a session id to a Principal: built-in admin scopes (admin tier + allowlist role) plus the
// site's custom scopes (the authorize callback, fail-closed). The display name falls back to the email
// for a member with no editor row. See the extensibility spec, "Scope resolution".
import type { D1Database } from '@cloudflare/workers-types';
import { resolvePrincipalRow } from './store.js';
import { rolesToScopes } from './scopes.js';
import { runAuthorize, type Authorize } from './authorize.js';
import type { Principal } from './types.js';

/** What `resolvePrincipal` needs: the auth store binding, the optional site authorize callback, and the platform. */
export interface ResolveDeps {
  db: D1Database;
  authorize?: Authorize;
  platform: unknown;
  deadlineMs?: number;
}

/** Resolve a session id to a Principal, or null when the session is absent or expired. */
export async function resolvePrincipal(deps: ResolveDeps, id: string, now: number): Promise<Principal | null> {
  const row = await resolvePrincipalRow(deps.db, id, now);
  if (!row) return null;
  const adminScopes = row.tier === 'admin' && row.role ? rolesToScopes(row.role) : [];
  const customScopes = await runAuthorize(deps.authorize, { email: row.email, platform: deps.platform }, deps.deadlineMs);
  return {
    email: row.email,
    displayName: row.displayName ?? row.email,
    scopes: [...adminScopes, ...customScopes],
    tier: row.tier,
  };
}
