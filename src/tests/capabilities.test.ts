import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { can, requireCapability } from '../lib/auth/capabilities';
import type { CairnUser } from '../lib/auth/guard';

const owner: CairnUser = { id: '1', email: 'o@x', name: 'O', role: 'owner' };
const editor: CairnUser = { id: '2', email: 'e@x', name: 'E', role: 'editor' };

describe('can', () => {
  it('grants an owner every capability', () => {
    for (const cap of ['story:create', 'story:edit', 'page:edit', 'page:create', 'nav:manage', 'user:manage'] as const) {
      expect(can(owner, cap)).toBe(true);
    }
  });

  it('grants an editor only the content subset', () => {
    expect(can(editor, 'story:create')).toBe(true);
    expect(can(editor, 'story:edit')).toBe(true);
    expect(can(editor, 'page:edit')).toBe(true);
    expect(can(editor, 'page:create')).toBe(false);
    expect(can(editor, 'nav:manage')).toBe(false);
    expect(can(editor, 'user:manage')).toBe(false);
  });

  it('denies a null (signed-out) user everything', () => {
    expect(can(null, 'story:edit')).toBe(false);
  });
});

describe('requireCapability', () => {
  it('returns the user when allowed', () => {
    expect(requireCapability(owner, 'nav:manage')).toBe(owner);
  });

  it('throws 401 when signed out', () => {
    try {
      requireCapability(null, 'story:edit');
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(401);
    }
  });

  it('throws 403 when the role lacks the capability', () => {
    try {
      requireCapability(editor, 'nav:manage');
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });
});
