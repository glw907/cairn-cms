// cairn-cms: the access map, the single per-site declaration that gates its own admin screens and
// custom routes by role. defineAccess validates shape and role vocabulary at construction time;
// canReach is the one authority function the guard, the engine routes, and the nav resolver all
// read, so route enforcement and sidebar visibility can never drift apart. Concept-id existence and
// engine-route collision are not checked here: they need the real concept list and engine-route
// table, which only composition (createCairnAdmin) has, so that check lands with the composition
// task. hasAccessRule backs requireAccess's fail-closed contract: a target the map has no key for
// route-gates as a misconfiguration, distinct from canReach's own unmapped-target reading used for
// nav visibility. targetFromRouteId is the shared default-target derivation both authorization call
// sites use, requireAccess (guard.ts) and createSectionAction (section-action.ts), so the load and
// action halves of one route's authorization story never disagree on what they are checking.
import { DEFAULT_ROLES, type RolesDeclaration } from './roles.js';
import type { Editor } from './types.js';

/**
 * A site's whole access declaration: a target (an engine screen id, or an `/admin`-prefixed route
 * path) to the role names admitted to it. A target absent from the map keeps today's behavior (any
 * editor-capability session reaches it); see {@link canReach}.
 */
export type AccessMap = Record<string, string[]>;

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
  if (key.includes('(') || key.includes(')')) {
    // Closes off UNRESOLVED_ROUTE_TARGET's own shape (below) at the first gate: a screen-id key
    // must never spell a parenthesized sentinel, so a site cannot accidentally (or deliberately)
    // grant a role the fail-closed target a null or all-groups route id resolves to.
    throw new Error(`defineAccess: key '${key}' may not contain '(' or ')'`);
  }
}

/**
 * Declare a site's access map. Validates at construction so a misdeclared map fails at build
 * rather than at runtime: an empty map, a role name outside the given vocabulary, an empty role
 * list (owner-only must be written explicitly as `['owner']`), and a key that is neither a
 * plausible screen id (non-empty, no `/`) nor a well-formed `/admin`-prefixed path (no query, hash,
 * trailing slash, or the bare `/admin` root) all throw an actionable `defineAccess:`-prefixed
 * error. `roles` may be `undefined`, resolving the map's role names against the same implicit
 * owner/editor vocabulary `resolveCapability`, `roleHome`, and `resolveOwnerLevelRoles` fall back
 * to for a site that declares none of its own. Concept-id existence and engine-route collision are
 * validated later, at composition, once the real concept list and engine-route table are
 * available.
 */
export function defineAccess<const A extends AccessMap>(roles: RolesDeclaration | undefined, map: A): A {
  const keys = Object.keys(map);
  if (keys.length === 0) {
    throw new Error('defineAccess: the map must declare at least one entry');
  }
  const vocabulary = new Set(Object.keys(roles ?? DEFAULT_ROLES));
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

/**
 * The map key that governs `target`, by deepest path-segment prefix, or `undefined` if none match
 * or the match is ambiguous.
 *
 * A route id's dynamic segment (`[id]`, `[...rest]`) is a literal string, never a resolved value,
 * so it can never equal a deeper map key's own literal next segment (`/admin/money/payroll` can
 * never prefix-match `/admin/money/[report]`, whatever report a request actually names). Falling
 * back to the shallower key in that case would silently make the deeper rule dead code: a site
 * that keys both `/admin/money` and `/admin/money/payroll`, meaning the second stricter than the
 * first, would see every request the dynamic segment serves resolve against the shallower,
 * more permissive rule instead, with no error and no signal that the deeper rule never applies.
 * So when the matched prefix's very next target segment is dynamic and the map holds any key
 * strictly deeper than that prefix, the match refuses outright (`undefined`) rather than falling
 * back: the site must declare an explicit `target` for a route this ambiguous, the same way
 * `SectionActionOptions.target`'s own doc already asks for a route with a rest parameter.
 */
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
  if (best !== undefined && best !== target) {
    const nextSegment = target.slice(best.length + 1).split('/', 1)[0];
    if (nextSegment?.startsWith('[')) {
      const shadowed = Object.keys(access).some(
        (key) => isHrefKey(key) && key !== best && key.startsWith(`${best}/`),
      );
      if (shadowed) return undefined;
    }
  }
  return best;
}

/**
 * The one authority function every enforcement and visibility point reads: `requireAccess`, the
 * engine route gates, and the nav resolver. `none` capability reaches nothing, mapped or unmapped.
 * Owner capability reaches every target, including the `editors` screen id and any target with no
 * rule. Every other capability's reach stops at `editors`, which stays owner-only no matter what
 * the map says (the roster screen's existing floor, restated here so the one authority function
 * covers it too). In practice a site cannot even declare a rule for `editors` and have it
 * silently ignored: composition-time validation (`validateAccessComposition`) admits only a
 * declared concept id or one of the fixed engine screens as a map key, and throws an actionable
 * error at server start on anything else. A screen-id target absent from the map admits any
 * editor-capability session; present, it admits only the named roles. An href target matches the
 * deepest path-segment-prefix key in the map (`/admin/money` covers `/admin/money/refunds` unless
 * the deeper key is separately mapped; `/admin/moneyx` never matches `/admin/money`); an href with
 * no matching key admits any editor-capability session, the nav semantics a site relies on for
 * `navFilter`-free visibility. When the matched prefix's next segment is a route id's dynamic
 * parameter (`[id]`, `[...rest]`) and the map holds a key deeper than that prefix, the deeper key
 * can never be reached (a dynamic segment's literal text never equals a concrete key's own), so
 * the match refuses rather than falling back to the shallower rule ({@link matchHrefKey}); here
 * that reads as an unmatched target, the same permissive admit as no rule at all, since this
 * function's own unmatched-target floor is nav visibility, not enforcement. Fail-closed route
 * enforcement for an unmatched or ambiguous target is `requireAccess`'s job, via
 * {@link hasAccessRule}, not this function's.
 *
 * Posture: permissive by default. A target the map never names stays reachable, because this one
 * reading gates both an engine screen's own route enforcement and that screen's nav visibility,
 * and every route relies on the zero-config any-editor floor an unmapped target admits.
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

// Guaranteed to equal no real route id or pathname (both always start with `/`), so a null
// `event.route.id` fails the authorization check closed instead of falling back to the
// attacker-chosen `url.pathname` R9 removed: an access map never declares a rule for this key,
// so `hasAccessRule` always refuses it.
const UNRESOLVED_ROUTE_TARGET = '(unresolved route)';
// One whole route-group segment: a path segment that opens with `(` and closes with `)` right
// before the next separator or the end. Anchored on both boundaries so a segment that merely
// contains parentheses (`/(a)b`) is left alone.
const ROUTE_GROUP_SEGMENT = /\/\([^/]+\)(?=\/|$)/g;

/**
 * Derive the authorization target from a route id: SvelteKit's route-group segments stripped, so
 * the target matches the URL shape an access map is keyed by. A group is organizational only and
 * never appears in a URL, so `/admin/(app)/roster` and `/admin/roster` are the same door, while
 * `hasAccessRule`'s path-segment-prefix matching would refuse the group form against a map keyed
 * `/admin/roster` and fail-close every session, owner included. The group name comes from the
 * site's own directory layout, never from the request, so stripping it reintroduces nothing
 * attacker-chosen; every surviving segment, a `[id]` parameter included, stays the compile-time
 * literal the route id carries. A null id, and an id that is nothing but groups, both resolve to
 * the fixed non-matching sentinel rather than the request path or an empty string.
 *
 * Shared by `createSectionAction` (section-action.ts) and `requireAccess` (guard.ts), the two
 * halves of one authorization story (C2 R9 and C2b): both derive their default target this way,
 * never from `event.url.pathname`, so a load and its own POST agree on what a session is allowed
 * to reach. It stays internal to the engine, never re-exported from a package subpath: a site
 * declares its own target through `SectionActionOptions.target` or `requireAccess`'s own
 * parameter, never by importing this helper directly.
 */
export function targetFromRouteId(routeId: string | null): string {
  if (routeId === null) return UNRESOLVED_ROUTE_TARGET;
  const stripped = routeId.replace(ROUTE_GROUP_SEGMENT, '');
  return stripped === '' ? UNRESOLVED_ROUTE_TARGET : stripped;
}
