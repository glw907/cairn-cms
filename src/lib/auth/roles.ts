// cairn-cms: the site-declared role vocabulary. A site maps its own role names onto the engine's
// three capability levels (owner, editor, none); this module owns the declaration, its
// construction-time validation, and the capability/home resolution the guard and routes read.
// The vocabulary is a plain declaration object so it stays git-committed config, and `defineRoles`
// const-captures the literal key set for the typed read-side (the `Role` derivation in ./types.ts).

/**
 * The three capability levels the engine understands. `owner` can manage the roster, `editor` can
 * edit content, `none` is an authenticated identity with no engine content access.
 */
export type Capability = 'owner' | 'editor' | 'none';

/**
 * One role's mapping. A bare capability is the common case; the object form additionally names a
 * `home`, the `/admin`-prefixed route the admin root sends that role to.
 */
export type RoleDeclaration = Capability | { capability: Capability; home?: string };

/** A site's whole vocabulary: role name to declaration. `owner` is the one reserved name. */
export type RolesDeclaration = Record<string, RoleDeclaration>;

/** The implicit vocabulary a site that declares no roles receives. */
export const DEFAULT_ROLES: { owner: 'owner'; editor: 'editor' } = { owner: 'owner', editor: 'editor' };

const CAPABILITIES: ReadonlySet<string> = new Set<Capability>(['owner', 'editor', 'none']);

/** The capability a declaration maps to, whether it is the bare or the object form. */
function declaredCapability(decl: RoleDeclaration): Capability {
  return typeof decl === 'string' ? decl : decl.capability;
}

/** Validate one declaration, throwing a descriptive error on any malformed entry. */
function validateDeclaration(name: string, decl: RoleDeclaration): void {
  if (typeof decl === 'string') {
    if (!CAPABILITIES.has(decl)) {
      throw new Error(`defineRoles: role '${name}' maps to unknown capability '${decl}'`);
    }
    return;
  }
  if (decl === null || typeof decl !== 'object') {
    throw new Error(`defineRoles: role '${name}' has a malformed declaration`);
  }
  if (!CAPABILITIES.has(decl.capability)) {
    throw new Error(`defineRoles: role '${name}' has an unknown or missing capability`);
  }
  if (decl.home !== undefined && (typeof decl.home !== 'string' || !decl.home.startsWith('/admin'))) {
    throw new Error(`defineRoles: role '${name}' home must be an absolute /admin-prefixed path`);
  }
}

/**
 * Declare a site's role vocabulary. Validates the declaration at construction so a misdeclared
 * vocabulary fails at build rather than at runtime, and const-captures the literal key set so the
 * public `Role` type can narrow to the declared names. Throws on an empty record, a missing or
 * misvalued `owner`, an empty role name, a malformed declaration, or a non-`/admin` home.
 */
export function defineRoles<const R extends RolesDeclaration>(roles: R): R {
  const names = Object.keys(roles);
  if (names.length === 0) {
    throw new Error('defineRoles: the vocabulary must declare at least one role');
  }
  for (const name of names) {
    if (name.trim() === '') {
      throw new Error('defineRoles: role names must be non-empty');
    }
    validateDeclaration(name, roles[name]);
  }
  if (!Object.hasOwn(roles, 'owner')) {
    throw new Error("defineRoles: the reserved 'owner' role must be declared");
  }
  if (declaredCapability(roles.owner) !== 'owner') {
    throw new Error("defineRoles: 'owner' must map to owner capability");
  }
  return roles;
}

/**
 * Resolve a role name to its capability against the given vocabulary. An `undefined` vocabulary
 * uses the default owner/editor pair. A name absent from the vocabulary resolves to `none`, so a
 * pruned config or a hand-edited row fails closed rather than locking the person out of sign-in.
 */
export function resolveCapability(roles: RolesDeclaration | undefined, role: string): Capability {
  const vocabulary: RolesDeclaration = roles ?? DEFAULT_ROLES;
  if (!Object.hasOwn(vocabulary, role)) {
    return 'none';
  }
  return declaredCapability(vocabulary[role]);
}

/**
 * The `/admin` landing route declared for a role, or `undefined` when the role declares none or is
 * absent from the vocabulary.
 */
export function roleHome(roles: RolesDeclaration | undefined, role: string): string | undefined {
  const vocabulary: RolesDeclaration = roles ?? DEFAULT_ROLES;
  if (!Object.hasOwn(vocabulary, role)) {
    return undefined;
  }
  const decl = vocabulary[role];
  return typeof decl === 'string' ? undefined : decl.home;
}

/**
 * The names in the vocabulary that carry owner capability. The last-owner guard counts rows across
 * this set rather than the literal `owner` string, so a site with two owner-level names is safe.
 */
export function ownerLevelRoles(roles: RolesDeclaration | undefined): string[] {
  const vocabulary: RolesDeclaration = roles ?? DEFAULT_ROLES;
  return Object.keys(vocabulary).filter((name) => declaredCapability(vocabulary[name]) === 'owner');
}
