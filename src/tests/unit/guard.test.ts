import { describe, it, expect } from 'vitest';
import { requireOwner, requireEditor, requireSession, isPublicAdminPath } from '../../lib/sveltekit/guard.js';
import type { Role } from '../../lib/auth/types.js';

const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
const editor = { email: 'e@x.test', displayName: 'E', role: 'editor' as const, capability: 'editor' as const };
// Role narrows to 'owner' | 'editor' in this unaugmented test file; a site that declares a wider
// vocabulary widens it via the CairnRolesRegister augmentation (see auth-roles.test.ts). The
// double cast stands in for that augmentation so this fixture can name an out-of-vocabulary role,
// the shape the guard produces (capability already resolved to 'none') for a row outside a site's
// declared vocabulary.
const unknownRole = { email: 'u@x.test', displayName: 'U', role: 'club-admin' as unknown as Role, capability: 'none' as const };
const noneCapability = { email: 'n@x.test', displayName: 'N', role: 'instructor' as unknown as Role, capability: 'none' as const };

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
  it('requireOwner rejects a none-capability editor with 403', () => {
    expect(() => requireOwner({ locals: { editor: noneCapability } })).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe('requireEditor', () => {
  it('accepts an owner-capability editor', () => {
    expect(requireEditor({ locals: { editor: owner } })).toBe(owner);
  });
  it('accepts an editor-capability editor', () => {
    expect(requireEditor({ locals: { editor } })).toBe(editor);
  });
  it('rejects a none-capability editor with 403', () => {
    expect(() => requireEditor({ locals: { editor: noneCapability } })).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Editor access required' } }),
    );
  });
  it('rejects an unknown-role editor resolved to none with 403', () => {
    expect(() => requireEditor({ locals: { editor: unknownRole } })).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
  it('redirects when no editor', () => {
    expect(() => requireEditor({ locals: { editor: null } })).toThrow();
  });
});

describe('requireSession admits any authenticated identity, including none capability', () => {
  it('admits owner, editor, and none-capability editors alike', () => {
    expect(requireSession({ locals: { editor: owner } })).toBe(owner);
    expect(requireSession({ locals: { editor } })).toBe(editor);
    expect(requireSession({ locals: { editor: noneCapability } })).toBe(noneCapability);
  });
  it('redirects when no editor', () => {
    expect(() => requireSession({ locals: { editor: null } })).toThrow();
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
