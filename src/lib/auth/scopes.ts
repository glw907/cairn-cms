// src/lib/auth/scopes.ts
// The scope vocabulary and the role<->scope mapping. cairn's built-in scopes gate /admin; a
// developer declares any other scope by string. Matching is opaque exact-match: requireScope('member')
// matches a principal holding 'member', not 'member:gold'. See the extensibility spec, "The principal".
import type { Principal, Role } from './types.js';

/** The owner scope: full admin, including editor management. */
export const ADMIN_OWNER = 'admin:owner';
/** The editor scope: content management under /admin. Every owner also holds it. */
export const ADMIN_EDITOR = 'admin:editor';

/** The admin scopes an allowlist role grants. An owner holds both; an editor holds only the editor scope. */
export function rolesToScopes(role: Role): string[] {
  return role === 'owner' ? [ADMIN_OWNER, ADMIN_EDITOR] : [ADMIN_EDITOR];
}

/**
 * The editor role derived from a scope set, owner winning when both are held, or null when the
 * principal holds no admin scope. Gates owner-only editor management, so it is security-relevant.
 */
export function scopesToRole(scopes: string[]): Role | null {
  if (scopes.includes(ADMIN_OWNER)) return 'owner';
  if (scopes.includes(ADMIN_EDITOR)) return 'editor';
  return null;
}

/** Exact-match scope test. */
export function hasScope(principal: Principal, scope: string): boolean {
  return principal.scopes.includes(scope);
}

/** True when the principal holds any admin scope. */
export function hasAdminScope(principal: Principal): boolean {
  return principal.scopes.includes(ADMIN_OWNER) || principal.scopes.includes(ADMIN_EDITOR);
}
