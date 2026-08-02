import { describe, it, expect, vi } from 'vitest';
import {
  requireOwner,
  requireEditor,
  requireSession,
  requireAccess,
  isPublicAdminPath,
} from '../../lib/sveltekit/guard.js';
import type { Role } from '../../lib/auth/types.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
const editor = { email: 'e@x.test', displayName: 'E', role: 'editor' as const, capability: 'editor' as const };
// Role narrows to 'owner' | 'editor' in this unaugmented test file; a site that declares a wider
// vocabulary widens it via the CairnRolesRegister augmentation (see auth-roles.test.ts). The
// double cast stands in for that augmentation so this fixture can name an out-of-vocabulary role,
// the shape the guard produces (capability already resolved to 'none') for a row outside a site's
// declared vocabulary.
const unknownRole = { email: 'u@x.test', displayName: 'U', role: 'club-admin' as unknown as Role, capability: 'none' as const };
const noneCapability = { email: 'n@x.test', displayName: 'N', role: 'instructor' as unknown as Role, capability: 'none' as const };

// Same double-cast stand-in as auth-access.test.ts: this file names roles outside the
// unaugmented owner/editor vocabulary, so an AccessMap value needs the same helper.
function r(...names: string[]): Role[] {
  return names as unknown as Role[];
}

/** Build a full CairnEvent from just the locals under test, so each fixture states only what
 *  makes it different; `url` defaults to a plausible admin path, overridden where a test's own
 *  URL drives `requireAccess`'s target resolution. */
function event(locals: CairnEvent['locals'], url = new URL('https://x.test/admin/money')): CairnEvent {
  return {
    url,
    request: new Request(url),
    params: {},
    route: { id: '/admin/[...path]' },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    setHeaders: () => {},
    locals,
  };
}

describe('requireOwner', () => {
  it('requireOwner accepts a minimal event and returns an owner', () => {
    expect(requireOwner(event({ editor: owner }))).toBe(owner);
  });
  it('requireOwner rejects a non-owner with 403', () => {
    // error() throws an HttpError object (status + body.message), not an Error instance.
    expect(() => requireOwner(event({ editor }))).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Owner access required' } }),
    );
  });
  it('requireOwner redirects when no editor', () => {
    expect(() => requireOwner(event({ editor: null }))).toThrow();
  });
  it('requireOwner rejects a none-capability editor with 403', () => {
    expect(() => requireOwner(event({ editor: noneCapability }))).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe('requireEditor', () => {
  it('accepts an owner-capability editor', () => {
    expect(requireEditor(event({ editor: owner }))).toBe(owner);
  });
  it('accepts an editor-capability editor', () => {
    expect(requireEditor(event({ editor }))).toBe(editor);
  });
  it('rejects a none-capability editor with 403', () => {
    expect(() => requireEditor(event({ editor: noneCapability }))).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Editor access required' } }),
    );
  });
  it('rejects an unknown-role editor resolved to none with 403', () => {
    expect(() => requireEditor(event({ editor: unknownRole }))).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
  it('redirects when no editor', () => {
    expect(() => requireEditor(event({ editor: null }))).toThrow();
  });
});

describe('requireSession admits any authenticated identity, including none capability', () => {
  it('admits owner, editor, and none-capability editors alike', () => {
    expect(requireSession(event({ editor: owner }))).toBe(owner);
    expect(requireSession(event({ editor }))).toBe(editor);
    expect(requireSession(event({ editor: noneCapability }))).toBe(noneCapability);
  });
  it('redirects when no editor', () => {
    expect(() => requireSession(event({ editor: null }))).toThrow();
  });
});

describe('requireAccess', () => {
  const publisher = { email: 'p@x.test', displayName: 'P', role: 'publisher' as unknown as Role, capability: 'editor' as const };
  const webmaster = { email: 'w@x.test', displayName: 'W', role: 'webmaster' as unknown as Role, capability: 'editor' as const };
  const access: AccessMap = { '/admin/money': r('publisher') };

  it('redirects when there is no session', () => {
    expect(() => requireAccess(event({ editor: null }, new URL('https://x.test/admin/money')))).toThrow();
  });

  it('returns the editor when the map admits the resolved target', () => {
    const fixture = event({ editor: publisher, cairnAccess: access }, new URL('https://x.test/admin/money'));
    expect(requireAccess(fixture)).toBe(publisher);
  });

  it('403s and emits auth.access.denied when the map denies the target', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = event({ editor: webmaster, cairnAccess: access }, new URL('https://x.test/admin/money'));
    expect(() => requireAccess(fixture)).toThrowError(expect.objectContaining({ status: 403 }));
    const records = warnSpy.mock.calls.map(
      (c) => c[0] as { event?: string; email?: string; role?: string; target?: string },
    );
    expect(
      records.some(
        (r) =>
          r.event === 'auth.access.denied' &&
          r.email === 'w@x.test' &&
          r.role === 'webmaster' &&
          r.target === '/admin/money',
      ),
    ).toBe(true);
    vi.restoreAllMocks();
  });

  it('403s an unmatched path for every session, editor and owner alike, and emits the event', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
    const unmatchedUrl = new URL('https://x.test/admin/unmapped');
    expect(() =>
      requireAccess(event({ editor: publisher, cairnAccess: access }, unmatchedUrl)),
    ).toThrowError(expect.objectContaining({ status: 403 }));
    expect(() =>
      requireAccess(event({ editor: owner, cairnAccess: access }, unmatchedUrl)),
    ).toThrowError(expect.objectContaining({ status: 403 }));
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events.filter((e) => e === 'auth.access.denied')).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it('lets an explicit target argument override the URL pathname', () => {
    const fixture = event({ editor: publisher, cairnAccess: access }, new URL('https://x.test/admin/unmapped'));
    expect(requireAccess(fixture, '/admin/money')).toBe(publisher);
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
