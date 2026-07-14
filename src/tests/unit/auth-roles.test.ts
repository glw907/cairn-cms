import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  defineRoles,
  resolveCapability,
  roleHome,
  ownerLevelRoles,
  DEFAULT_ROLES,
} from '../../lib/auth/roles.js';
import type { Role, Editor } from '../../lib/auth/types.js';

describe('defineRoles validation', () => {
  it('returns the vocabulary unchanged for a valid declaration', () => {
    const roles = defineRoles({ owner: 'owner', editor: 'editor' });
    expect(roles).toEqual({ owner: 'owner', editor: 'editor' });
  });

  it('accepts an ASC-shaped vocabulary with the object form and a home', () => {
    const roles = defineRoles({
      owner: 'owner',
      'club-admin': 'editor',
      instructor: { capability: 'none', home: '/admin/classes' },
    });
    expect(roles.instructor).toEqual({ capability: 'none', home: '/admin/classes' });
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
    expect(() => defineRoles({ owner: 'owner', bad: 'admin' as never })).toThrow();
    // An object missing a valid capability.
    expect(() => defineRoles({ owner: 'owner', bad: {} as never })).toThrow();
    // A non-string, non-object value.
    expect(() => defineRoles({ owner: 'owner', bad: 3 as never })).toThrow();
  });

  it('throws when a home is not an absolute /admin-prefixed path', () => {
    expect(() => defineRoles({ owner: 'owner', x: { capability: 'editor', home: 'classes' } })).toThrow();
    expect(() => defineRoles({ owner: 'owner', x: { capability: 'editor', home: '/dashboard' } })).toThrow();
  });
});

describe('resolveCapability', () => {
  const asc = defineRoles({
    owner: 'owner',
    'club-admin': 'editor',
    instructor: { capability: 'none', home: '/admin/classes' },
  });

  it('resolves a bare capability declaration', () => {
    expect(resolveCapability(asc, 'club-admin')).toBe('editor');
  });

  it('resolves an object-form declaration', () => {
    expect(resolveCapability(asc, 'instructor')).toBe('none');
    expect(resolveCapability(asc, 'owner')).toBe('owner');
  });

  it('fails closed to none for a role outside the vocabulary', () => {
    expect(resolveCapability(asc, 'ghost')).toBe('none');
  });

  it('treats an undefined vocabulary as the default owner/editor pair', () => {
    expect(resolveCapability(undefined, 'owner')).toBe('owner');
    expect(resolveCapability(undefined, 'editor')).toBe('editor');
    expect(resolveCapability(undefined, 'club-admin')).toBe('none');
  });

  it('does not treat inherited object keys as roles', () => {
    expect(resolveCapability(asc, 'toString')).toBe('none');
  });
});

describe('roleHome', () => {
  const asc = defineRoles({
    owner: 'owner',
    instructor: { capability: 'none', home: '/admin/classes' },
  });

  it('returns the declared home for an object-form role', () => {
    expect(roleHome(asc, 'instructor')).toBe('/admin/classes');
  });

  it('returns undefined for a bare-capability role and an unknown role', () => {
    expect(roleHome(asc, 'owner')).toBeUndefined();
    expect(roleHome(asc, 'ghost')).toBeUndefined();
  });
});

describe('ownerLevelRoles', () => {
  it('lists every owner-capability name over a two-owner vocabulary', () => {
    const roles = defineRoles({
      owner: 'owner',
      commodore: { capability: 'owner', home: '/admin/roster' },
      'club-admin': 'editor',
    });
    expect(ownerLevelRoles(roles).sort()).toEqual(['commodore', 'owner']);
  });

  it('lists only owner over the default vocabulary', () => {
    expect(ownerLevelRoles(undefined)).toEqual(['owner']);
    expect(DEFAULT_ROLES).toEqual({ owner: 'owner', editor: 'editor' });
  });
});

describe('Role and Editor types', () => {
  it('pins the unaugmented Role to the owner/editor default', () => {
    // The live, unaugmented registry keeps today's union exactly, so zero-config sites are unchanged.
    expectTypeOf<Role>().toEqualTypeOf<'owner' | 'editor'>();
  });

  it('pins the augmented narrowing: defineRoles const-captures the declared names', () => {
    // The registry-augmented branch of `Role` reads `keyof CairnRolesRegister['roles']`; a global
    // module augmentation cannot be tested alongside the default in one program, so this pins the
    // substrate the augmented branch consumes: `defineRoles` preserves the literal key set.
    const asc = defineRoles({
      owner: 'owner',
      'club-admin': 'editor',
      instructor: { capability: 'none', home: '/admin/classes' },
    });
    expectTypeOf<Extract<keyof typeof asc, string>>().toEqualTypeOf<'owner' | 'club-admin' | 'instructor'>();
  });

  it('carries capability alongside role on Editor', () => {
    expectTypeOf<Editor>().toHaveProperty('capability');
    const ed: Editor = { email: 'e@x.test', displayName: 'E', role: 'owner', capability: 'owner' };
    expect(ed.capability).toBe('owner');
  });
});
