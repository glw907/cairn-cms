// src/tests/unit/auth-scopes.test.ts
import { describe, it, expect } from 'vitest';
import { ADMIN_OWNER, ADMIN_EDITOR, rolesToScopes, scopesToRole, hasScope, hasAdminScope } from '../../lib/auth/scopes.js';
import type { Principal } from '../../lib/auth/types.js';

const p = (scopes: string[], tier: 'admin' | 'member' = 'admin'): Principal => ({
  email: 'a@b.c', displayName: 'A', scopes, tier,
});

describe('scopes', () => {
  it('maps roles to admin scopes', () => {
    expect(rolesToScopes('owner')).toEqual([ADMIN_OWNER, ADMIN_EDITOR]);
    expect(rolesToScopes('editor')).toEqual([ADMIN_EDITOR]);
  });
  it('derives the role from scopes, owner winning', () => {
    expect(scopesToRole([ADMIN_OWNER, ADMIN_EDITOR])).toBe('owner');
    expect(scopesToRole([ADMIN_EDITOR])).toBe('editor');
    expect(scopesToRole(['member'])).toBe(null);
  });
  it('matches scopes exactly, not hierarchically', () => {
    expect(hasScope(p(['member', 'member:gold']), 'member')).toBe(true);
    expect(hasScope(p(['member:gold']), 'member')).toBe(false);
    expect(hasScope(p([ADMIN_EDITOR]), 'admin')).toBe(false);
  });
  it('detects any admin scope', () => {
    expect(hasAdminScope(p([ADMIN_EDITOR]))).toBe(true);
    expect(hasAdminScope(p(['member']))).toBe(false);
  });
});
