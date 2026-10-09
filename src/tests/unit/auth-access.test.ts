import { describe, it, expect } from 'vitest';
import { defineAccess, canReach, hasAccessRule, noRuleReason, type AccessMap } from '../../lib/auth/access.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { Editor } from '../../lib/auth/types.js';

const roles = defineRoles({
  owner: 'owner',
  webmaster: 'editor',
  publisher: 'editor',
  'manager': 'editor',
  staff: { capability: 'none', home: '/admin/staff' },
});

function editor(role: string, capability: Editor['capability'] = 'editor'): Editor {
  return { email: 'e@x.test', displayName: 'E', role, capability };
}

describe('defineAccess validation', () => {
  it('returns the map unchanged for a valid declaration', () => {
    const access = defineAccess(roles, { pages: ['webmaster'] });
    expect(access).toEqual({ pages: ['webmaster'] });
  });

  it('throws on an empty map', () => {
    expect(() => defineAccess(roles, {})).toThrow(/defineAccess/);
  });

  it('throws on a role name outside the given vocabulary', () => {
    expect(() => defineAccess(roles, { pages: ['ghost'] })).toThrow(/defineAccess/);
  });

  it('throws on an empty role list', () => {
    expect(() => defineAccess(roles, { pages: [] })).toThrow(/defineAccess/);
  });

  it('accepts an explicit owner-only role list', () => {
    const access = defineAccess(roles, { pages: ['owner'] });
    expect(access.pages).toEqual(['owner']);
  });

  it('validates against the default owner/editor vocabulary when roles is undefined', () => {
    const access = defineAccess(undefined, { pages: ['editor'] });
    expect(access.pages).toEqual(['editor']);
    expect(() => defineAccess(undefined, { pages: ['ghost'] })).toThrow(/defineAccess/);
  });

  it('still throws on an empty role list under the default vocabulary (owner-only stays explicit)', () => {
    expect(() => defineAccess(undefined, { pages: [] })).toThrow(/defineAccess/);
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

  it("throws on a screen-id key containing '(' or ')', the shape targetFromRouteId's fail-closed sentinel takes", () => {
    // '(unresolved route)' is what a null or all-groups route id resolves to (auth/access.ts); a
    // site that could spell this key would turn that fail-closed sentinel into an open door.
    expect(() => defineAccess(roles, { '(unresolved route)': ['owner'] })).toThrow(/defineAccess/);
    expect(() => defineAccess(roles, { 'foo(bar)': ['owner'] })).toThrow(/defineAccess/);
  });
});

describe('canReach: capability floors and owner bypass', () => {
  const access = defineAccess(roles, { pages: ['webmaster'], '/admin/money': ['manager'] });

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

describe('canReach: none capability', () => {
  const access = defineAccess(roles, {
    // A screen-id rule that names the none role: still refused, a none session reaches a screen id never.
    pages: ['webmaster', 'staff'],
    editors: ['owner', 'staff'],
    '/admin/money': ['manager'],
    '/admin/staff': ['staff'],
    '/admin/shop': ['staff'],
    '/admin/shop/refunds/audit': ['owner'],
  });
  const none = editor('staff', 'none');

  const rows: Array<{ name: string; target: string; withMap?: boolean; admitted: boolean }> = [
    { name: 'a screen id whose rule names the role', target: 'pages', admitted: false },
    { name: 'the editors screen id, even with a rule naming the role', target: 'editors', admitted: false },
    { name: 'an unmapped screen id', target: 'unmapped-screen', admitted: false },
    { name: 'a mapped href naming the role', target: '/admin/staff', admitted: true },
    { name: 'a descendant of a mapped href naming the role', target: '/admin/staff/roster', admitted: true },
    { name: 'a dynamic route under a mapped href with nothing deeper to shadow it', target: '/admin/staff/[id]', admitted: true },
    { name: 'a mapped href naming a different role', target: '/admin/money', admitted: false },
    { name: 'an unmapped href', target: '/admin/committees', admitted: false },
    { name: 'a dynamic route a deeper key shadows', target: '/admin/shop/[id]', admitted: false },
    { name: 'a mapped href with no map at all', target: '/admin/staff', withMap: false, admitted: false },
  ];

  it.each(rows)('$name: admitted is $admitted', ({ target, withMap = true, admitted }) => {
    expect(canReach(withMap ? access : undefined, none, target, roles)).toBe(admitted);
  });
});

describe('canReach: a none session whose role the vocabulary does not declare', () => {
  // The map still names 'staff', the shape a site leaves behind when it drops the role from
  // defineRoles but not from its access rules.
  const access: AccessMap = { '/admin/staff': ['staff'] };
  const staff = editor('staff', 'none');
  const pruned = defineRoles({ owner: 'owner', webmaster: 'editor' });

  it('refuses the session on an href rule naming its role when the vocabulary drops the role', () => {
    expect(canReach(access, staff, '/admin/staff', pruned)).toBe(false);
  });

  it('refuses the session against the default owner/editor pair when no vocabulary is given', () => {
    expect(canReach(access, staff, '/admin/staff')).toBe(false);
  });

  it('still admits a declared none role on the same rule', () => {
    expect(canReach(access, staff, '/admin/staff', roles)).toBe(true);
  });
});

describe('canReach: mapped and unmapped screen ids', () => {
  const access = defineAccess(roles, { pages: ['webmaster'] });

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
    '/admin/money': ['manager'],
    '/admin/money/refunds': ['owner'],
  });

  it('a shallower key covers its own descendants', () => {
    expect(canReach(access, editor('manager'), '/admin/money/tabs')).toBe(true);
    expect(canReach(access, editor('publisher'), '/admin/money/tabs')).toBe(false);
  });

  it('the deeper key wins when both match', () => {
    expect(canReach(access, editor('manager'), '/admin/money/refunds')).toBe(false);
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
    pages: ['webmaster'],
    '/admin/money': ['manager'],
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

describe('noRuleReason', () => {
  const access = defineAccess(roles, {
    pages: ['webmaster'],
    '/admin/x': ['manager'],
    '/admin/x/y/z': ['owner'],
  });

  it.each([
    { name: 'a screen id with no rule', target: 'settings', reason: 'no_rule' },
    { name: 'an href no key prefixes', target: '/admin/committees', reason: 'no_rule' },
    { name: 'a dynamic segment a deeper key shadows', target: '/admin/x/[id]', reason: 'shadowed' },
    { name: 'a dynamic segment with no deeper key beside it', target: '/admin/z/[id]', reason: 'no_rule' },
  ])('$name reads $reason', ({ target, reason }) => {
    expect(noRuleReason(access, target)).toBe(reason);
  });

  it('reads no_rule for an absent map', () => {
    expect(noRuleReason(undefined, '/admin/x')).toBe('no_rule');
  });
});
