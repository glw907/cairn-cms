import { describe, it, expect, vi } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { createSectionAction, type RateLimitLike, type SectionActionContext } from '../../lib/sveltekit/section-action.js';
import type { AdminActionEvent, AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { Editor } from '../../lib/auth/types.js';
import type { Action, RequestEvent } from '@sveltejs/kit';

const owner: Editor = { email: 'owner@x.test', displayName: 'Owner', role: 'owner', capability: 'owner' };
const staff: Editor = { email: 'staff@x.test', displayName: 'Staff', role: 'editor', capability: 'editor' };

/** The synthetic platform env every test event carries; a fixed shape for a fixed factory. */
interface TestEnv {
  SECTION_DB?: FakeDb;
}

/** A distinguishable object identity, never a real binding, so a test can assert `ctx.db` is exactly this. */
interface FakeDb {
  marker: true;
}

const fakeDb: FakeDb = { marker: true };

function jar(initial: Record<string, string> = {}): CookieJar {
  const store = new Map(Object.entries(initial));
  return {
    get: (name) => store.get(name),
    set: (name: string, value: string, _opts: CookieSetOptions) => void store.set(name, value),
    delete: (name) => void store.delete(name),
  };
}

function makeEvent(opts: {
  cookie?: string;
  csrfField?: string;
  editor?: Editor | null;
  cairnAccess?: AccessMap;
  env?: TestEnv;
  auditSink?: (record: AdminActionAuditRecord) => void;
}): AdminActionEvent<TestEnv> {
  const body = new URLSearchParams();
  if (opts.csrfField !== undefined) body.set('csrf', opts.csrfField);
  const request = new Request('https://x.dev/admin/club/events', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return {
    url: new URL('https://x.dev/admin/club/events'),
    request,
    cookies: jar(opts.cookie !== undefined ? { '__Host-cairn_csrf': opts.cookie } : {}),
    locals: {
      editor: opts.editor === undefined ? owner : opts.editor,
      cairnAccess: opts.cairnAccess,
      auditSink: opts.auditSink,
    },
    platform: opts.env === undefined ? undefined : { env: opts.env },
  };
}

const mappedTarget = '/admin/club/events';
const mappedAccess: AccessMap = { [mappedTarget]: ['editor'] };

/** A ready-to-admit event: a verified CSRF pair, an editor-capability session, and a mapped path. */
function readyEvent(overrides: Parameters<typeof makeEvent>[0] = {}): AdminActionEvent<TestEnv> {
  return makeEvent({
    cookie: 'MATCH',
    csrfField: 'MATCH',
    editor: staff,
    cairnAccess: mappedAccess,
    env: { SECTION_DB: fakeDb },
    ...overrides,
  });
}

function auditsOf(sink: ReturnType<typeof vi.fn>): AdminActionAuditRecord[] {
  return sink.mock.calls.map((call) => call[0] as AdminActionAuditRecord);
}

function okHandler() {
  return vi.fn(async ({ ctx }: { ctx: SectionActionContext<FakeDb> }) => {
    ctx.audit({ action: 'test', entity: 'test' });
    return { ok: true, db: ctx.db };
  });
}

describe('createSectionAction: no rate limit configured', () => {
  it('runs the handler given a matching CSRF pair, a valid editor, and a mapped path', async () => {
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
  });
});

describe('createSectionAction: rate limit degrade-to-open', () => {
  it('runs the handler when rateLimit.resolve returns undefined, and audits nothing for it', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({
      resolveDb: (env) => env?.SECTION_DB,
      rateLimit: { resolve: () => undefined, key: () => 'k' },
    });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ action: 'test', entity: 'test' })]);
  });

  it('runs the handler when limit() throws', async () => {
    const limiter: RateLimitLike = { limit: async () => Promise.reject(new Error('binding unreachable')) };
    const wrap = createSectionAction<TestEnv, FakeDb>({
      resolveDb: (env) => env?.SECTION_DB,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
  });
});

describe('createSectionAction: rate limit enforcement', () => {
  it('returns 429 over the limit, never calls the handler, and audits nothing', async () => {
    const sink = vi.fn();
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const wrap = createSectionAction<TestEnv, FakeDb>({
      resolveDb: (env) => env?.SECTION_DB,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(429);
    expect(auditsOf(sink)).toEqual([]);
  });

  it('runs the handler under the limit, and calls rateLimit.key with the verified editor', async () => {
    const keyFn = vi.fn(() => 'k');
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const wrap = createSectionAction<TestEnv, FakeDb>({
      resolveDb: (env) => env?.SECTION_DB,
      rateLimit: { resolve: () => limiter, key: keyFn },
    });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(keyFn).toHaveBeenCalledWith(expect.objectContaining({ editor: expect.objectContaining({ email: staff.email }) }));
  });
});

describe('createSectionAction: database not bound', () => {
  it('returns 500 with the shared unavailable message, audited, handler never called', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: () => undefined });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(500);
    expect(result.data).toEqual({ error: 'This section is not available.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: database not bound' })]);
  });
});

describe('createSectionAction: access map not attached', () => {
  it('returns 500, audited, handler never called', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ cairnAccess: undefined, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(500);
    expect(result.data).toEqual({ error: 'This section is not available.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: access map not attached' })]);
  });
});

describe('createSectionAction: no access rule (fail-closed, owner included)', () => {
  it('an EMPTY map (the zero-config sentinel) refuses even an owner-capability session', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ editor: owner, cairnAccess: {}, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(403);
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: no access rule' })]);
  });

  it('a map with no rule matching the pathname refuses an owner too, though canReach alone would admit', async () => {
    const sink = vi.fn();
    const unmatchedAccess: AccessMap = { '/admin/other': ['editor'] };
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ editor: owner, cairnAccess: unmatchedAccess, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(403);
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: no access rule' })]);
  });
});

describe('createSectionAction: role not admitted', () => {
  it('refuses with the shared default message, and again with deniedMessage overriding it', async () => {
    const roleGatedAccess: AccessMap = { [mappedTarget]: ['owner'] };
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();

    const sink = vi.fn();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ editor: staff, cairnAccess: roleGatedAccess, auditSink: sink }));
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'You do not have access to this action.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: role not admitted' })]);

    const overridden = wrap(handler, { action: 'approve', entity: 'event', deniedMessage: 'Not for you.' });
    const overriddenResult = await overridden(readyEvent({ editor: staff, cairnAccess: roleGatedAccess }));
    if (!isActionFailure(overriddenResult)) throw new Error('expected an ActionFailure');
    expect(overriddenResult.data).toEqual({ error: 'Not for you.' });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('createSectionAction: opts.target overrides event.url.pathname (the catch-all defense)', () => {
  it('refuses when the map admits the pathname but not the declared target', async () => {
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event', target: '/admin/club/other' });
    const result = await action(readyEvent({ cairnAccess: mappedAccess })); // mappedAccess admits pathname, not the target
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('admits when the map admits the declared target but not the pathname', async () => {
    const targetOnlyAccess: AccessMap = { '/admin/club/other': ['editor'] };
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event', target: '/admin/club/other' });
    const result = await action(readyEvent({ cairnAccess: targetOnlyAccess })); // admits the target, not the pathname
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
  });
});

describe('createSectionAction: ownerOnly stacks on the map check', () => {
  it('refuses an editor-capability session a permissive map admits, with the shared default message', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event', ownerOnly: true });
    const result = await action(readyEvent({ auditSink: sink })); // staff editor, mappedAccess admits 'editor'
    expect(handler).not.toHaveBeenCalled();
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'You do not have access to this action.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: not owner' })]);
  });
});

describe('createSectionAction: check ordering', () => {
  it('an over-limit binding AND an unbound db: the 429 wins', async () => {
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const wrap = createSectionAction<TestEnv, FakeDb>({
      resolveDb: () => undefined,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const handler = okHandler();
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent());
    if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
    expect(result.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('createSectionAction: happy path', () => {
  it('hands the handler the exact db object, returns its value, and audits exactly once', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>({ resolveDb: (env) => env?.SECTION_DB });
    const handler = vi.fn(async ({ ctx }: { ctx: SectionActionContext<FakeDb> }) => {
      expect(ctx.db).toBe(fakeDb);
      ctx.audit({ action: 'approve', entity: 'event', entityId: '1' });
      return { approved: true };
    });
    const action = wrap(handler, { action: 'approve', entity: 'event' });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(result).toEqual({ approved: true });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ action: 'approve', entity: 'event', entityId: '1' })]);
  });
});

// Step 5: a compile-only type test (review note N1: the runtime fakes above cannot prove route
// assignability, and check:snippets rewrites `./$types` imports to `any`). This block never runs;
// it exists so `npm run check` proves the generic Env parameter actually threads through to a
// site's own generated route Actions, with no cast anywhere in this block.
declare global {
  namespace App {
    interface Platform {
      env: SiteEnv;
    }
  }
}

type SiteEnv = { SECTION_DB: { marker: true } };

function typeOnlyRouteActionsAssignability(): void {
  const sectionAction = createSectionAction<SiteEnv, SiteEnv['SECTION_DB']>({
    resolveDb: (env: SiteEnv | undefined) => env?.SECTION_DB,
  });
  const approve = sectionAction(async ({ ctx }) => {
    return { id: ctx.db.marker };
  }, { action: 'approve', entity: 'event' });

  approve satisfies Action;

  // A direct assignability check against a real RequestEvent, matching how a site's own
  // `export const actions: Actions = { approve }` assigns this factory's output.
  const actions = { approve } satisfies Record<string, (event: RequestEvent) => unknown>;
  void actions;
}
void typeOnlyRouteActionsAssignability;
