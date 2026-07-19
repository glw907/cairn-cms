// cairn-cms: the access map, the single per-site declaration that gates its own admin screens and
// custom routes by role. defineAccess validates shape and role vocabulary at construction time;
// canReach is the one authority function the guard, the engine routes, and the nav resolver all
// read, so route enforcement and sidebar visibility can never drift apart. Concept-id existence and
// engine-route collision are not checked here: they need the real concept list and engine-route
// table, which only composition (createCairnAdmin) has, so that check lands with the composition
// task. hasAccessRule backs requireAccess's fail-closed contract: a target the map has no key for
// route-gates as a misconfiguration, distinct from canReach's own unmapped-target reading used for
// nav visibility.
import type { RolesDeclaration } from './roles.js';
import type { Editor, Role } from './types.js';

/**
 * A site's whole access declaration: a target (an engine screen id, or an `/admin`-prefixed route
 * path) to the role names admitted to it. A target absent from the map keeps today's behavior (any
 * editor-capability session reaches it); see {@link canReach}.
 */
export type AccessMap = Record<string, Role[]>;

/** True when a key or target names a route path rather than a screen id. */
function isHrefKey(key: string): boolean {
  return key.startsWith('/');
}

/** Validate one map key's shape, throwing on anything that is neither a screen id nor a route. */
function validateKeyShape(key: string): void {
  if (isHrefKey(key)) {
    if (!key.startsWith('/admin')) {
      throw new Error(`defineAccess: key '${key}' must be an /admin-prefixed path`);
    }
    if (key === '/admin') {
      throw new Error("defineAccess: key '/admin' may not name the admin root itself");
    }
    if (key.includes('?') || key.includes('#')) {
      throw new Error(`defineAccess: key '${key}' may not carry a query or hash`);
    }
    if (key.endsWith('/')) {
      throw new Error(`defineAccess: key '${key}' may not carry a trailing slash`);
    }
    return;
  }
  if (key.length === 0) {
    throw new Error('defineAccess: a screen-id key must be non-empty');
  }
  if (key.includes('/')) {
    throw new Error(`defineAccess: key '${key}' is neither a screen id nor an /admin-prefixed path`);
  }
}

/**
 * Declare a site's access map. Validates at construction so a misdeclared map fails at build
 * rather than at runtime: an empty map, a role name outside the given vocabulary, an empty role
 * list (owner-only must be written explicitly as `['owner']`), and a key that is neither a
 * plausible screen id (non-empty, no `/`) nor a well-formed `/admin`-prefixed path (no query, hash,
 * trailing slash, or the bare `/admin` root) all throw an actionable `defineAccess:`-prefixed
 * error. Concept-id existence and engine-route collision are validated later, at composition, once
 * the real concept list and engine-route table are available.
 */
export function defineAccess<const A extends AccessMap>(roles: RolesDeclaration, map: A): A {
  const keys = Object.keys(map);
  if (keys.length === 0) {
    throw new Error('defineAccess: the map must declare at least one entry');
  }
  const vocabulary = new Set(Object.keys(roles));
  for (const key of keys) {
    validateKeyShape(key);
    const admitted = map[key];
    if (!Array.isArray(admitted) || admitted.length === 0) {
      throw new Error(`defineAccess: '${key}' must list at least one role (owner-only: ['owner'])`);
    }
    for (const role of admitted) {
      if (!vocabulary.has(role)) {
        throw new Error(`defineAccess: '${key}' names role '${role}', outside the given vocabulary`);
      }
    }
  }
  return map;
}

/** The map key that governs `target`, by deepest path-segment prefix, or `undefined` if none match. */
function matchHrefKey(access: AccessMap, target: string): string | undefined {
  let best: string | undefined;
  for (const key of Object.keys(access)) {
    if (!isHrefKey(key)) continue;
    if (target === key || target.startsWith(`${key}/`)) {
      if (best === undefined || key.length > best.length) {
        best = key;
      }
    }
  }
  return best;
}

/**
 * The one authority function every enforcement and visibility point reads: `requireAccess`, the
 * engine route gates, and the nav resolver. `none` capability reaches nothing, mapped or unmapped.
 * Owner capability reaches every target, including a target with no rule, except the `editors`
 * screen id, which stays owner-only regardless of what the map says (the roster screen's existing
 * floor, restated here so the one authority function covers it too). A screen-id target absent from
 * the map admits any editor-capability session; present, it admits only the named roles. An
 * href target matches the deepest path-segment-prefix key in the map (`/admin/money` covers
 * `/admin/money/refunds` unless the deeper key is separately mapped; `/admin/moneyx` never matches
 * `/admin/money`); an href with no matching key admits any editor-capability session, the nav
 * semantics a site relies on for `navFilter`-free visibility. Fail-closed route enforcement for an
 * unmatched target is `requireAccess`'s job, via {@link hasAccessRule}, not this function's.
 */
export function canReach(access: AccessMap | undefined, editor: Editor, target: string): boolean {
  if (editor.capability === 'none') {
    return false;
  }
  if (editor.capability === 'owner') {
    return true;
  }
  if (target === 'editors') {
    return false;
  }
  if (!access) {
    return true;
  }
  if (isHrefKey(target)) {
    const key = matchHrefKey(access, target);
    return key === undefined ? true : access[key].includes(editor.role);
  }
  const admitted = access[target];
  return admitted === undefined ? true : admitted.includes(editor.role);
}

/**
 * Whether the map carries any rule for `target`, exact match for a screen id, deepest-prefix match
 * for an href. Backs `requireAccess`'s fail-closed contract: a route that opts into the helper 403s
 * every session, owner included, when the map has no opinion on its path at all.
 */
export function hasAccessRule(access: AccessMap | undefined, target: string): boolean {
  if (!access) {
    return false;
  }
  if (isHrefKey(target)) {
    return matchHrefKey(access, target) !== undefined;
  }
  return Object.hasOwn(access, target);
}
