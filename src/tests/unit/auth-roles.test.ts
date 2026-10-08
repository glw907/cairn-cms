import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  defineRoles,
  resolveCapability,
  roleHome,
  resolveOwnerLevelRoles,
  DEFAULT_ROLES,
} from '../../lib/auth/roles.js';
import type { Editor } from '../../lib/auth/types.js';

describe('defineRoles validation', () => {
  it('returns the vocabulary unchanged for a valid declaration', () => {
    const roles = defineRoles({ owner: 'owner', editor: 'editor' });
    expect(roles).toEqual({ owner: 'owner', editor: 'editor' });
  });

  it('accepts an custom role vocabulary with the object form and a home', () => {
    const roles = defineRoles({
      owner: 'owner',
      'webmaster': 'editor',
      staff: { capability: 'none', home: '/admin/staff' },
    });
    expect(roles.staff).toEqual({ capability: 'none', home: '/admin/staff' });
  });

  it('throws on an empty record', () => {
    expect(() => defineRoles({})).toThrow();
  });

  it('throws when the reserved owner key is missing', () => {
    expect(() => defineRoles({ editor: 'editor' })).toThrow(/owner/);
  });

  it('throws when owner maps to a non-owner capability', () => {
    expect(() => defineRoles({ owner: 'editor' })).toThrow(/owner/);
    expect(() => defineRoles({ owner: { capability: 'none' } })).toThrow(/owner/);
  });

  it('throws on an empty role name', () => {
    expect(() => defineRoles({ owner: 'owner', '': 'editor' })).toThrow();
  });

  it('throws on a malformed declaration object', () => {
    // A capability string outside the vocabulary.
    expect(() => defineRoles({ owner: 'owner', bad: 'admin' as never })).toThrow(); // idioms-allow: as-never  feeds the runtime guard a capability string outside the vocabulary
    // An object missing a valid capability.
    expect(() => defineRoles({ owner: 'owner', bad: {} as never })).toThrow(); // idioms-allow: as-never  feeds the runtime guard an object missing a valid capability
    // A non-string, non-object value.
    expect(() => defineRoles({ owner: 'owner', bad: 3 as never })).toThrow(); // idioms-allow: as-never  feeds the runtime guard a non-string, non-object value
  });

  it('throws when a home is not an absolute /admin-prefixed path', () => {
    expect(() => defineRoles({ owner: 'owner', x: { capability: 'editor', home: 'classes' } })).toThrow();
    expect(() => defineRoles({ owner: 'owner', x: { capability: 'editor', home: '/dashboard' } })).toThrow();
  });
});

describe('resolveCapability', () => {
  const custom = defineRoles({
    owner: 'owner',
    'webmaster': 'editor',
    staff: { capability: 'none', home: '/admin/staff' },
  });

  it('resolves a bare capability declaration', () => {
    expect(resolveCapability(custom, 'webmaster')).toBe('editor');
  });

  it('resolves an object-form declaration', () => {
    expect(resolveCapability(custom, 'staff')).toBe('none');
    expect(resolveCapability(custom, 'owner')).toBe('owner');
  });

  it('fails closed to none for a role outside the vocabulary', () => {
    expect(resolveCapability(custom, 'ghost')).toBe('none');
  });

  it('treats an undefined vocabulary as the default owner/editor pair', () => {
    expect(resolveCapability(undefined, 'owner')).toBe('owner');
    expect(resolveCapability(undefined, 'editor')).toBe('editor');
    expect(resolveCapability(undefined, 'webmaster')).toBe('none');
  });

  it('does not treat inherited object keys as roles', () => {
    expect(resolveCapability(custom, 'toString')).toBe('none');
  });
});

describe('roleHome', () => {
  const custom = defineRoles({
    owner: 'owner',
    staff: { capability: 'none', home: '/admin/staff' },
  });

  it('returns the declared home for an object-form role', () => {
    expect(roleHome(custom, 'staff')).toBe('/admin/staff');
  });

  it('returns undefined for a bare-capability role and an unknown role', () => {
    expect(roleHome(custom, 'owner')).toBeUndefined();
    expect(roleHome(custom, 'ghost')).toBeUndefined();
  });
});

describe('resolveOwnerLevelRoles', () => {
  it('lists every owner-capability name over a two-owner vocabulary', () => {
    const roles = defineRoles({
      owner: 'owner',
      commodore: { capability: 'owner', home: '/admin/roster' },
      'webmaster': 'editor',
    });
    expect(resolveOwnerLevelRoles(roles).sort()).toEqual(['commodore', 'owner']);
  });

  it('lists only owner over the default vocabulary', () => {
    expect(resolveOwnerLevelRoles(undefined)).toEqual(['owner']);
    expect(DEFAULT_ROLES).toEqual({ owner: 'owner', editor: 'editor' });
  });
});

describe('role vocabulary and Editor types', () => {
  it('pins defineRoles: it const-captures the declared literal key set', () => {
    const custom = defineRoles({
      owner: 'owner',
      'webmaster': 'editor',
      staff: { capability: 'none', home: '/admin/staff' },
    });
    expectTypeOf<Extract<keyof typeof custom, string>>().toEqualTypeOf<'owner' | 'webmaster' | 'staff'>();
  });

  it('carries capability alongside an open (string) role on Editor', () => {
    expectTypeOf<Editor>().toHaveProperty('capability');
    expectTypeOf<Editor['role']>().toEqualTypeOf<string>();
    const ed: Editor = { email: 'e@x.test', displayName: 'E', role: 'owner', capability: 'owner' };
    expect(ed.capability).toBe('owner');
  });
});
