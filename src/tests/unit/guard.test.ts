import { describe, it, expect } from 'vitest';
import { requireOwner, isPublicAdminPath } from '../../lib/sveltekit/guard.js';

const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const };
const editor = { email: 'e@x.test', displayName: 'E', role: 'editor' as const };

describe('requireOwner', () => {
  it('requireOwner accepts a minimal { locals: { editor } } and returns an owner', () => {
    expect(requireOwner({ locals: { editor: owner } })).toBe(owner);
  });
  it('requireOwner rejects a non-owner with 403', () => {
    // error() throws an HttpError object (status + body.message), not an Error instance.
    expect(() => requireOwner({ locals: { editor } })).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Owner access required' } }),
    );
  });
  it('requireOwner redirects when no editor', () => {
    expect(() => requireOwner({ locals: { editor: null } })).toThrow();
  });
});

describe('isPublicAdminPath', () => {
  it('treats the login page and auth endpoints as public', () => {
    expect(isPublicAdminPath('/admin/login')).toBe(true);
    expect(isPublicAdminPath('/admin/auth/confirm')).toBe(true);
  });
  it('treats every other admin path as gated', () => {
    expect(isPublicAdminPath('/admin')).toBe(false);
    expect(isPublicAdminPath('/admin/posts')).toBe(false);
  });
});
