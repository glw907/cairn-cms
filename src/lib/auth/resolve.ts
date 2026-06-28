// src/lib/auth/resolve.ts
// Resolve a session id to a Principal: built-in admin scopes (admin tier + allowlist role) plus the
// site's custom scopes (the authorize callback, fail-closed). The display name falls back to the email
// for a member with no editor row. See the extensibility spec, "Scope resolution".
import type { D1Database } from '@cloudflare/workers-types';
import { resolvePrincipalRow } from './store.js';
import { rolesToScopes } from './scopes.js';
import { runAuthorize, type Authorize } from './authorize.js';
import { log } from '../log/index.js';
import type { Principal } from './types.js';

/** The engine-reserved scope namespace a site authorize callback may not grant. */
const RESERVED_SCOPE_PREFIX = 'admin:';

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
  // A site authorize callback grants only its own custom scopes; the admin:* namespace is engine
  // reserved, gated by the editor allowlist and the trust tier. Strip any reserved scope a callback
  // returns (a bug or a compromised data source) so it can never mint admin, and log the drop.
  const granted = await runAuthorize(deps.authorize, { email: row.email, platform: deps.platform }, deps.deadlineMs);
  const reserved = granted.filter((s) => s.startsWith(RESERVED_SCOPE_PREFIX));
  if (reserved.length) log.warn('auth.scope.reserved', { email: row.email, scopes: reserved.join(',') });
  const customScopes = granted.filter((s) => !s.startsWith(RESERVED_SCOPE_PREFIX));
  return {
    email: row.email,
    displayName: row.displayName ?? row.email,
    scopes: [...adminScopes, ...customScopes],
    tier: row.tier,
  };
}
