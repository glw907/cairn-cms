import { describe, it, expect, vi } from 'vitest';
import {
  requireOwner,
  requireEditor,
  requireSession,
  requireAccess,
  isPublicAdminPath,
} from '../../lib/sveltekit/guard.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
const editor = { email: 'e@x.test', displayName: 'E', role: 'editor' as const, capability: 'editor' as const };
// Role names are open (`string`), so a fixture can name any out-of-vocabulary role directly, the
// shape the guard produces (capability already resolved to 'none') for a row outside a site's
// declared vocabulary.
const unknownRole = { email: 'u@x.test', displayName: 'U', role: 'club-admin', capability: 'none' as const };
const noneCapability = { email: 'n@x.test', displayName: 'N', role: 'instructor', capability: 'none' as const };

/** Build a full CairnEvent from just the locals under test, so each fixture states only what
 *  makes it different; `url` defaults to a plausible admin path. `routeId` defaults to the URL's
 *  own pathname, so a test that doesn't care about the route-id/pathname split (most of this
 *  file) reads exactly as before; `requireAccess`'s target resolution is driven by `routeId`,
 *  never by `url.pathname`, so a test asserting that split passes them independently. */
function event(
  locals: CairnEvent['locals'],
  url = new URL('https://x.test/admin/money'),
  routeId: string | null = url.pathname,
): CairnEvent {
  return {
    url,
    request: new Request(url),
    params: {},
    route: { id: routeId },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    setHeaders: () => {},
    locals,
  };
}

describe('requireOwner', () => {
  it('requireOwner accepts a minimal event and returns an owner', () => {
    expect(requireOwner(event({ cairnEditor: owner }))).toBe(owner);
  });
  it('requireOwner rejects a non-owner with 403', () => {
    // error() throws an HttpError object (status + body.message), not an Error instance.
    expect(() => requireOwner(event({ cairnEditor: editor }))).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Owner access required' } }),
    );
  });
  it('requireOwner redirects when no editor', () => {
    expect(() => requireOwner(event({ cairnEditor: null }))).toThrow();
  });
  it('requireOwner rejects a none-capability editor with 403', () => {
    expect(() => requireOwner(event({ cairnEditor: noneCapability }))).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe('requireEditor', () => {
  it('accepts an owner-capability editor', () => {
    expect(requireEditor(event({ cairnEditor: owner }))).toBe(owner);
  });
  it('accepts an editor-capability editor', () => {
    expect(requireEditor(event({ cairnEditor: editor }))).toBe(editor);
  });
  it('rejects a none-capability editor with 403', () => {
    expect(() => requireEditor(event({ cairnEditor: noneCapability }))).toThrowError(
      expect.objectContaining({ status: 403, body: { message: 'Editor access required' } }),
    );
  });
  it('rejects an unknown-role editor resolved to none with 403', () => {
    expect(() => requireEditor(event({ cairnEditor: unknownRole }))).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
  });
  it('redirects when no editor', () => {
    expect(() => requireEditor(event({ cairnEditor: null }))).toThrow();
  });
});

describe('requireSession admits any authenticated identity, including none capability', () => {
  it('admits owner, editor, and none-capability editors alike', () => {
    expect(requireSession(event({ cairnEditor: owner }))).toBe(owner);
    expect(requireSession(event({ cairnEditor: editor }))).toBe(editor);
    expect(requireSession(event({ cairnEditor: noneCapability }))).toBe(noneCapability);
  });
  it('redirects when no editor', () => {
    expect(() => requireSession(event({ cairnEditor: null }))).toThrow();
  });
});

describe('requireAccess', () => {
  const publisher = { email: 'p@x.test', displayName: 'P', role: 'publisher', capability: 'editor' as const };
  const webmaster = { email: 'w@x.test', displayName: 'W', role: 'webmaster', capability: 'editor' as const };
  const access: AccessMap = { '/admin/money': ['publisher'] };

  it('redirects when there is no session', () => {
    expect(() => requireAccess(event({ cairnEditor: null }, new URL('https://x.test/admin/money')))).toThrow();
  });

  it('returns the editor when the map admits the resolved route-id target', () => {
    const fixture = event({ cairnEditor: publisher, cairnAccess: access }, new URL('https://x.test/admin/money'));
    expect(requireAccess(fixture)).toBe(publisher);
  });

  it('403s and emits auth.access.denied when the map denies the route-id target', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = event({ cairnEditor: webmaster, cairnAccess: access }, new URL('https://x.test/admin/money'));
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

  it('403s an unmatched route id for every session, editor and owner alike, and emits the event', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
    const unmatchedUrl = new URL('https://x.test/admin/unmapped');
    expect(() =>
      requireAccess(event({ cairnEditor: publisher, cairnAccess: access }, unmatchedUrl)),
    ).toThrowError(expect.objectContaining({ status: 403 }));
    expect(() =>
      requireAccess(event({ cairnEditor: owner, cairnAccess: access }, unmatchedUrl)),
    ).toThrowError(expect.objectContaining({ status: 403 }));
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events.filter((e) => e === 'auth.access.denied')).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it('lets an explicit target argument override the derived route-id target', () => {
    const fixture = event(
      { cairnEditor: publisher, cairnAccess: access },
      new URL('https://x.test/admin/unmapped'),
      '/admin/unmapped',
    );
    expect(requireAccess(fixture, '/admin/money')).toBe(publisher);
  });

  it('admits a route-group route id against a map keyed by the stripped path (the 2aa3ae99 regression)', () => {
    // A non-owner role, deliberately: an owner would pass regardless, via canReach's own
    // owner bypass, and would never exercise hasAccessRule's fail-closed prefix match at all.
    const rosterAccess: AccessMap = { '/admin/roster': ['webmaster'] };
    const fixture = event(
      { cairnEditor: webmaster, cairnAccess: rosterAccess },
      new URL('https://x.test/admin/roster'),
      '/admin/(app)/roster',
    );
    expect(requireAccess(fixture)).toBe(webmaster);
  });

  it('denies when the pathname would admit but the route id does not (pathname is never consulted)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // url.pathname is the mapped, permissive path; route.id is a different, unmapped one. If the
    // default fell back to url.pathname, this would wrongly admit.
    const fixture = event(
      { cairnEditor: publisher, cairnAccess: access },
      new URL('https://x.test/admin/money'),
      '/admin/other',
    );
    expect(() => requireAccess(fixture)).toThrowError(expect.objectContaining({ status: 403 }));
    vi.restoreAllMocks();
  });

  it('fails closed for a null route id, even for an owner', () => {
    const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const, capability: 'owner' as const };
    const fixture = event(
      { cairnEditor: owner, cairnAccess: access },
      new URL('https://x.test/admin/money'),
      null,
    );
    expect(() => requireAccess(fixture)).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it('resolves a parameterized route id verbatim, so a map keyed by its prefix still matches', () => {
    const postsAccess: AccessMap = { '/admin/posts': ['publisher'] };
    const fixture = event(
      { cairnEditor: publisher, cairnAccess: postsAccess },
      new URL('https://x.test/admin/posts/hello-world'),
      '/admin/posts/[id]',
    );
    expect(requireAccess(fixture)).toBe(publisher);
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
