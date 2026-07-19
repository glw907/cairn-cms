import { describe, it, expect } from 'vitest';
import { defineAccess, canReach, hasAccessRule } from '../../lib/auth/access.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { Editor, Role } from '../../lib/auth/types.js';

const roles = defineRoles({
  owner: 'owner',
  webmaster: 'editor',
  publisher: 'editor',
  'club-admin': 'editor',
});

function editor(role: string, capability: Editor['capability'] = 'editor'): Editor {
  return { email: 'e@x.test', displayName: 'E', role: role as Editor['role'], capability };
}

// This test file exercises a custom vocabulary against the default, unaugmented `Role` type
// ('owner' | 'editor'), so a map value naming a site's own role needs the same double-cast the
// rest of the suite uses for a custom role (see guard.test.ts); a real site's `CairnRolesRegister`
// augmentation narrows `Role` to its declared names and needs no such cast.
function r(...names: string[]): Role[] {
  return names as unknown as Role[];
}

describe('defineAccess validation', () => {
  it('returns the map unchanged for a valid declaration', () => {
    const access = defineAccess(roles, { pages: r('webmaster') });
    expect(access).toEqual({ pages: r('webmaster') });
  });

  it('throws on an empty map', () => {
    expect(() => defineAccess(roles, {})).toThrow(/defineAccess/);
  });

  it('throws on a role name outside the given vocabulary', () => {
    expect(() => defineAccess(roles, { pages: r('ghost') })).toThrow(/defineAccess/);
  });

  it('throws on an empty role list', () => {
    expect(() => defineAccess(roles, { pages: [] })).toThrow(/defineAccess/);
  });

  it('accepts an explicit owner-only role list', () => {
    const access = defineAccess(roles, { pages: ['owner'] });
    expect(access.pages).toEqual(['owner']);
  });

  it('throws on a key that is neither a plausible screen id nor an /admin path', () => {
    expect(() => defineAccess(roles, { 'foo/bar': ['owner'] })).toThrow(/defineAccess/);
  });

  it('throws on an empty-string key', () => {
    expect(() => defineAccess(roles, { '': ['owner'] })).toThrow(/defineAccess/);
  });

  it('throws on an href key equal to /admin itself', () => {
    expect(() => defineAccess(roles, { '/admin': ['owner'] })).toThrow(/defineAccess/);
  });

  it('throws on an href key carrying a query, hash, or trailing slash', () => {
    expect(() => defineAccess(roles, { '/admin/money?x=1': ['owner'] })).toThrow(/defineAccess/);
    expect(() => defineAccess(roles, { '/admin/money#top': ['owner'] })).toThrow(/defineAccess/);
    expect(() => defineAccess(roles, { '/admin/money/': ['owner'] })).toThrow(/defineAccess/);
  });

  it('throws on an href key not prefixed with /admin', () => {
    expect(() => defineAccess(roles, { '/money': ['owner'] })).toThrow(/defineAccess/);
  });
});

describe('canReach: capability floors and owner bypass', () => {
  const access = defineAccess(roles, { pages: r('webmaster'), '/admin/money': r('club-admin') });

  it('none capability reaches nothing, mapped or unmapped', () => {
    expect(canReach(access, editor('ghost', 'none'), 'pages')).toBe(false);
    expect(canReach(access, editor('ghost', 'none'), 'unmapped-screen')).toBe(false);
    expect(canReach(access, editor('ghost', 'none'), '/admin/money')).toBe(false);
  });

  it('owner capability reaches every mapped and unmapped target', () => {
    expect(canReach(access, editor('owner', 'owner'), 'pages')).toBe(true);
    expect(canReach(access, editor('owner', 'owner'), '/admin/money')).toBe(true);
    expect(canReach(access, editor('owner', 'owner'), 'unmapped-screen')).toBe(true);
  });

  it('editors keeps its owner floor regardless of the map', () => {
    expect(canReach(access, editor('webmaster'), 'editors')).toBe(false);
    expect(canReach(access, editor('owner', 'owner'), 'editors')).toBe(true);
  });
});

describe('canReach: mapped and unmapped screen ids', () => {
  const access = defineAccess(roles, { pages: r('webmaster') });

  it('admits only the named role for a mapped screen', () => {
    expect(canReach(access, editor('webmaster'), 'pages')).toBe(true);
    expect(canReach(access, editor('publisher'), 'pages')).toBe(false);
  });

  it('admits any editor capability for an unmapped screen', () => {
    expect(canReach(access, editor('publisher'), 'settings')).toBe(true);
  });

  it('admits any editor capability when no map is given at all', () => {
    expect(canReach(undefined, editor('publisher'), 'pages')).toBe(true);
  });
});

describe('canReach: href prefix matching', () => {
  const access = defineAccess(roles, {
    '/admin/money': r('club-admin'),
    '/admin/money/refunds': ['owner'],
  });

  it('a shallower key covers its own descendants', () => {
    expect(canReach(access, editor('club-admin'), '/admin/money/tabs')).toBe(true);
    expect(canReach(access, editor('publisher'), '/admin/money/tabs')).toBe(false);
  });

  it('the deeper key wins when both match', () => {
    expect(canReach(access, editor('club-admin'), '/admin/money/refunds')).toBe(false);
    expect(canReach(access, editor('owner', 'owner'), '/admin/money/refunds')).toBe(true);
  });

  it('a segment-boundary near-miss never matches', () => {
    expect(canReach(access, editor('publisher'), '/admin/moneyx')).toBe(true);
  });

  it('an unmatched href admits any editor capability', () => {
    expect(canReach(access, editor('publisher'), '/admin/committees')).toBe(true);
  });
});

describe('hasAccessRule', () => {
  const access = defineAccess(roles, {
    pages: r('webmaster'),
    '/admin/money': r('club-admin'),
  });

  it('reports true for a mapped screen id, false for an unmapped one', () => {
    expect(hasAccessRule(access, 'pages')).toBe(true);
    expect(hasAccessRule(access, 'settings')).toBe(false);
  });

  it('reports true for a mapped href and its descendants, false for an unrelated one', () => {
    expect(hasAccessRule(access, '/admin/money')).toBe(true);
    expect(hasAccessRule(access, '/admin/money/refunds')).toBe(true);
    expect(hasAccessRule(access, '/admin/committees')).toBe(false);
  });

  it('reports false for every target when no map is given', () => {
    expect(hasAccessRule(undefined, 'pages')).toBe(false);
    expect(hasAccessRule(undefined, '/admin/money')).toBe(false);
  });
});
