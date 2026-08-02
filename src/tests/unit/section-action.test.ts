import { describe, it, expect, vi, afterEach } from 'vitest';
import { isActionFailure, isRedirect, redirect } from '@sveltejs/kit';
import {
  createSectionAction,
  type RateLimitLike,
  type SectionActionConfig,
  type SectionActionContext,
  type SectionActionOptions,
} from '../../lib/sveltekit/section-action.js';
import { log } from '../../lib/log/index.js';
import type { AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';
import type { CairnEvent, CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { Editor } from '../../lib/auth/types.js';
import type { Action, ActionFailure, RequestEvent } from '@sveltejs/kit';

afterEach(() => {
  vi.restoreAllMocks();
});

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
}): CairnEvent<TestEnv> {
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
    params: {},
    route: { id: '/admin/club/events' },
    cookies: jar(opts.cookie !== undefined ? { '__Host-cairn_csrf': opts.cookie } : {}),
    locals: {
      editor: opts.editor === undefined ? owner : opts.editor,
      cairnAccess: opts.cairnAccess,
      auditSink: opts.auditSink,
    },
    platform: opts.env === undefined ? undefined : { env: opts.env },
    setHeaders: () => {},
  };
}

const mappedTarget = '/admin/club/events';
const mappedAccess: AccessMap = { [mappedTarget]: ['editor'] };

/** A ready-to-admit event: a verified CSRF pair, an editor-capability session, and a mapped path. */
function readyEvent(overrides: Parameters<typeof makeEvent>[0] = {}): CairnEvent<TestEnv> {
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

/** The everything-wired config: the section's binding off the platform env, no rate limit. */
const boundDb: SectionActionConfig<TestEnv, FakeDb> = { resolveDb: (env) => env?.SECTION_DB };

/**
 * One wrapped action and the handler behind it, over the shared `approve`/`event` verbs, so each
 * test below passes only the config or option it is actually proving.
 */
function approveAction(
  config: SectionActionConfig<TestEnv, FakeDb> = boundDb,
  opts: Omit<SectionActionOptions, 'action' | 'entity'> = {},
) {
  const handler = okHandler();
  const action = createSectionAction<TestEnv, FakeDb>(config)(handler, {
    action: 'approve',
    entity: 'event',
    ...opts,
  });
  return { handler, action };
}

/** Narrow an action's result to the refusal a test expects, so the assertions read as one line each. */
function refusal(result: unknown): ActionFailure {
  if (!isActionFailure(result)) throw new Error('expected an ActionFailure, got a handler result');
  return result;
}

describe('createSectionAction: no rate limit configured', () => {
  it('runs the handler given a matching CSRF pair, a valid editor, and a mapped path', async () => {
    const { handler, action } = approveAction();
    const result = await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
  });
});

describe('createSectionAction: rate limit degrade-to-open', () => {
  it('runs the handler when rateLimit.resolve returns undefined, and audits nothing for it', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => undefined, key: () => 'k' },
    });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ action: 'test', entity: 'test' })]);
  });

  it('runs the handler when limit() throws, and logs rate_limit_failed, never rate_limit_absent', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const limiter: RateLimitLike = { limit: async () => Promise.reject(new Error('binding unreachable')) };
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const result = await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.rate_limit_failed',
      expect.objectContaining({ error: 'binding unreachable' }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith('admin.action.rate_limit_absent', expect.anything());
  });

  it('runs the handler when rateLimit.key throws, and logs rate_limit_failed, never rate_limit_absent', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const throwingKey = () => {
      throw new Error('key derivation failed');
    };
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: throwingKey },
    });
    const result = await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.rate_limit_failed',
      expect.objectContaining({ error: 'key derivation failed' }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith('admin.action.rate_limit_absent', expect.anything());
  });
});

describe('createSectionAction: rate limit enforcement', () => {
  it('returns 429 over the limit, never calls the handler, and audits nothing', async () => {
    const sink = vi.fn();
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    expect(refusal(result).status).toBe(429);
    expect(auditsOf(sink)).toEqual([]);
  });

  it('blocks on a truthy non-boolean success (a malformed limiter response), never a pass', async () => {
    const sink = vi.fn();
    // RateLimitLike is structural: a site-supplied limiter can resolve anything shaped like
    // { success: boolean } without actually being one. A truthy non-boolean must read as blocked,
    // the same as checkRateLimit's own `result?.success === true` test.
    const limiter = { limit: async () => ({ success: 1 as unknown as boolean }) } as RateLimitLike;
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    expect(refusal(result).status).toBe(429);
    expect(auditsOf(sink)).toEqual([]);
  });

  it('runs the handler under the limit, and calls rateLimit.key with the verified editor', async () => {
    const keyFn = vi.fn(() => 'k');
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: keyFn },
    });
    await action(readyEvent());
    expect(handler).toHaveBeenCalledOnce();
    expect(keyFn).toHaveBeenCalledWith(expect.objectContaining({ editor: expect.objectContaining({ email: staff.email }) }));
  });
});

describe('createSectionAction: database not bound', () => {
  it('returns 500 with the shared unavailable message, audited, handler never called', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction({ resolveDb: () => undefined });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    const failure = refusal(result);
    expect(failure.status).toBe(500);
    expect(failure.data).toEqual({ error: 'This section is not available.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: database not bound' })]);
  });

  it('also refuses a resolveDb that returns null, the same as undefined', async () => {
    const sink = vi.fn();
    // A structural cast: resolveDb's declared return type is `Db | undefined`, but a site's own
    // resolver can return `null` (a nullable binding type), which is exactly what this guards.
    const { handler, action } = approveAction({ resolveDb: () => null as unknown as FakeDb | undefined });
    const result = await action(readyEvent({ auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    const failure = refusal(result);
    expect(failure.status).toBe(500);
    expect(failure.data).toEqual({ error: 'This section is not available.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: database not bound' })]);
  });
});

describe('createSectionAction: access map not attached', () => {
  it('returns 500, audited, handler never called', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction();
    const result = await action(readyEvent({ cairnAccess: undefined, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    const failure = refusal(result);
    expect(failure.status).toBe(500);
    expect(failure.data).toEqual({ error: 'This section is not available.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: access map not attached' })]);
  });
});

describe('createSectionAction: no access rule (fail-closed, owner included)', () => {
  it('an EMPTY map (the zero-config sentinel) refuses even an owner-capability session', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction();
    const result = await action(readyEvent({ editor: owner, cairnAccess: {}, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    expect(refusal(result).status).toBe(403);
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: no access rule' })]);
  });

  it('a map with no rule matching the pathname refuses an owner too, though canReach alone would admit', async () => {
    const sink = vi.fn();
    const unmatchedAccess: AccessMap = { '/admin/other': ['editor'] };
    const { handler, action } = approveAction();
    const result = await action(readyEvent({ editor: owner, cairnAccess: unmatchedAccess, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    expect(refusal(result).status).toBe(403);
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: no access rule' })]);
  });
});

describe('createSectionAction: role not admitted', () => {
  it('refuses with the shared default message, and again with deniedMessage overriding it', async () => {
    const roleGatedAccess: AccessMap = { [mappedTarget]: ['owner'] };

    const sink = vi.fn();
    const { handler, action } = approveAction();
    const result = await action(readyEvent({ editor: staff, cairnAccess: roleGatedAccess, auditSink: sink }));
    const failure = refusal(result);
    expect(failure.status).toBe(403);
    expect(failure.data).toEqual({ error: 'You do not have access to this action.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: role not admitted' })]);

    const overridden = approveAction(boundDb, { deniedMessage: 'Not for you.' });
    const overriddenResult = await overridden.action(readyEvent({ editor: staff, cairnAccess: roleGatedAccess }));
    expect(refusal(overriddenResult).data).toEqual({ error: 'Not for you.' });

    expect(handler).not.toHaveBeenCalled();
    expect(overridden.handler).not.toHaveBeenCalled();
  });
});

describe('createSectionAction: rate limit catch rethrows control-flow shapes', () => {
  it('propagates a redirect() thrown from rateLimit.key, rather than degrading to open', async () => {
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const throwingKey = () => {
      redirect(303, '/somewhere');
    };
    const { handler, action } = approveAction({
      ...boundDb,
      rateLimit: { resolve: () => limiter, key: throwingKey },
    });
    let thrown: unknown;
    try {
      await action(readyEvent());
    } catch (err) {
      thrown = err;
    }
    expect(isRedirect(thrown)).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('createSectionAction: opts.target overrides event.url.pathname (the catch-all defense)', () => {
  it('refuses when the map admits the pathname but not the declared target', async () => {
    const { handler, action } = approveAction(boundDb, { target: '/admin/club/other' });
    const result = await action(readyEvent({ cairnAccess: mappedAccess })); // mappedAccess admits pathname, not the target
    expect(refusal(result).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('admits when the map admits the declared target but not the pathname', async () => {
    const targetOnlyAccess: AccessMap = { '/admin/club/other': ['editor'] };
    const { handler, action } = approveAction(boundDb, { target: '/admin/club/other' });
    const result = await action(readyEvent({ cairnAccess: targetOnlyAccess })); // admits the target, not the pathname
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, db: fakeDb });
  });
});

describe('createSectionAction: ownerOnly stacks on the map check', () => {
  it('refuses an editor-capability session a permissive map admits, with the shared default message', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction(boundDb, { ownerOnly: true });
    const result = await action(readyEvent({ auditSink: sink })); // staff editor, mappedAccess admits 'editor'
    expect(handler).not.toHaveBeenCalled();
    const failure = refusal(result);
    expect(failure.status).toBe(403);
    expect(failure.data).toEqual({ error: 'You do not have access to this action.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: not owner' })]);
  });
});

describe('createSectionAction: check ordering', () => {
  it('an over-limit binding AND an unbound db: the 429 wins', async () => {
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const { handler, action } = approveAction({
      resolveDb: () => undefined,
      rateLimit: { resolve: () => limiter, key: () => 'k' },
    });
    const result = await action(readyEvent());
    expect(refusal(result).status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it('an unbound db AND a session the map refuses: the 403 wins, audited as a denial not a config fault', async () => {
    const sink = vi.fn();
    const unmatchedAccess: AccessMap = { '/admin/other': ['editor'] };
    const { handler, action } = approveAction({ resolveDb: () => undefined });
    const result = await action(readyEvent({ cairnAccess: unmatchedAccess, auditSink: sink }));
    expect(handler).not.toHaveBeenCalled();
    expect(refusal(result).status).toBe(403);
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: no access rule' })]);
  });
});

describe('createSectionAction: happy path', () => {
  it('hands the handler the exact db object, returns its value, and audits exactly once', async () => {
    const sink = vi.fn();
    const wrap = createSectionAction<TestEnv, FakeDb>(boundDb);
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
//
// It builds its own local stand-in for the platform typing instead of a `declare global` block
// (review finding: a `declare global App.Platform` augmentation inside a runtime test file leaks
// a project-wide ambient type into every other file's compile, this repo's own included, rather
// than staying scoped to this one type-only check).
type SiteEnv = { SECTION_DB: { marker: true } };

/**
 * A structural stand-in for what a real site's own generated `RequestEvent` looks like once its
 * `app.d.ts` declares `interface Platform { env: SiteEnv }`: kit's real event type, with only
 * `platform` overridden locally, so the simulated platform typing never escapes this file.
 */
type SiteRequestEvent = Omit<RequestEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

function typeOnlyRouteActionsAssignability(): void {
  const sectionAction = createSectionAction<SiteEnv, SiteEnv['SECTION_DB']>({
    resolveDb: (env: SiteEnv | undefined) => env?.SECTION_DB,
  });
  const approve = sectionAction(async ({ ctx }) => {
    return { id: ctx.db.marker };
  }, { action: 'approve', entity: 'event' });

  // Kit's bare `Action` defaults its RouteId param to `string | null` (the fully-ambient,
  // no-generated-types case); a real `+page.server.ts` never actually types its `actions` export
  // against that default, since `./$types`'s own `Actions` always narrows RouteId to that route's
  // non-null literal id. The explicit RouteId argument here matches that reality rather than the
  // unreachable fully-ambient case (`CairnEvent['route']['id']` stays `string | null`, matching
  // kit's own ambient default, so this narrower literal still assigns in with no cast).
  // OutputData keeps kit's own `Record<string, any> | void` default (env-genericity.test.ts's
  // `SiteActionReturn` explains why `any`, not `unknown`, is the faithful match: an interface
  // return with no index signature, like `ActionFailure`, is not structurally assignable to
  // `Record<string, unknown>`).
  approve satisfies Action<Record<string, string>, Record<string, any> | void, string>;

  // The direct assignability check against a real generated route's Actions record, matching how
  // a site's own `export const actions: Actions = { approve }` assigns this factory's output, but
  // against SiteRequestEvent (the site's own real platform typing) rather than kit's ambient
  // default, which carries no platform shape until a site's own app.d.ts declares one.
  const actions = { approve } satisfies Record<string, (event: SiteRequestEvent) => unknown>;
  void actions;
}
void typeOnlyRouteActionsAssignability;
