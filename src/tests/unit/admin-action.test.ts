import { describe, it, expect, vi, afterEach } from 'vitest';
import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { adminAction, UnauditedActionError, type AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';
import { log } from '../../lib/log/index.js';
import type { CairnEvent, CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { Editor } from '../../lib/auth/types.js';

const editor: Editor = { email: 'owner@example.com', displayName: 'Owner', role: 'owner', capability: 'owner' };

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
  csrfHeader?: string;
  editor?: Editor | null;
  extra?: Record<string, string>;
  auditSink?: (record: AdminActionAuditRecord) => void;
  access?: AccessMap;
}): CairnEvent {
  const body = new URLSearchParams();
  if (opts.csrfField !== undefined) body.set('csrf', opts.csrfField);
  for (const [k, v] of Object.entries(opts.extra ?? {})) body.set(k, v);
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (opts.csrfHeader !== undefined) headers['x-cairn-csrf'] = opts.csrfHeader;
  const request = new Request('https://x.dev/admin/club/events', {
    method: 'POST',
    headers,
    body: body.toString(),
  });
  return {
    url: new URL('https://x.dev/admin/club/events'),
    request,
    params: {},
    route: { id: '/admin/club/events' },
    cookies: jar(opts.cookie !== undefined ? { '__Host-cairn_csrf': opts.cookie } : {}),
    locals: {
      cairnEditor: opts.editor === undefined ? editor : opts.editor,
      cairnAuditSink: opts.auditSink,
      cairnAccess: opts.access,
    },
    setHeaders: () => {},
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    throw new Error('expected adminAction to throw');
  } catch (err) {
    expect(err).toBeInstanceOf(UnauditedActionError);
    return (err as UnauditedActionError).status;
  }
}

/** Assert the promise rejects with SvelteKit's own `redirect()`, and return its status and location. */
async function redirectOf(promise: Promise<unknown>): Promise<{ status: number; location: string }> {
  try {
    await promise;
    throw new Error('expected adminAction to redirect');
  } catch (err) {
    expect(isRedirect(err)).toBe(true);
    const redirected = err as { status: number; location: string };
    return { status: redirected.status, location: redirected.location };
  }
}

/** Assert the promise rejects with SvelteKit's own `error()`, and return its status. */
async function httpErrorStatusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    throw new Error("expected adminAction to throw SvelteKit's error()");
  } catch (err) {
    expect(isHttpError(err)).toBe(true);
    return (err as { status: number }).status;
  }
}

describe('adminAction: editor guard', () => {
  it('redirects to /admin/login with no locals.cairnEditor, and never calls the handler', async () => {
    const handler = vi.fn();
    const action = adminAction(handler);
    const event = makeEvent({ editor: null, cookie: 'TOK', csrfField: 'TOK' });
    expect(await redirectOf(action(event))).toEqual({ status: 303, location: '/admin/login' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('logs admin.action.session_absent with the path before redirecting', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const handler = vi.fn();
    const action = adminAction(handler);
    const event = makeEvent({ editor: null, cookie: 'TOK', csrfField: 'TOK' });
    await redirectOf(action(event));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.session_absent',
      expect.objectContaining({ path: '/admin/club/events' }),
    );
    warnSpy.mockRestore();
  });
});

describe('adminAction: CSRF guard (defense-in-depth)', () => {
  it('rejects a missing cookie, a missing field, and a same-length mismatch, all with a 403 error()', async () => {
    const handler = vi.fn();
    const action = adminAction(handler);
    expect(await httpErrorStatusOf(action(makeEvent({ csrfField: 'TOK' })))).toBe(403); // no cookie
    expect(await httpErrorStatusOf(action(makeEvent({ cookie: 'TOK' })))).toBe(403); // no field
    expect(await httpErrorStatusOf(action(makeEvent({ cookie: 'AAAA', csrfField: 'AAAB' })))).toBe(403); // same-length mismatch
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects every mismatch shape uniformly, short and long alike (a property, not a timing assertion)', async () => {
    const handler = vi.fn();
    const action = adminAction(handler);
    const mismatches = [
      ['a'.repeat(64), 'a'.repeat(63) + 'b'], // same length, last char differs
      ['a'.repeat(64), 'a'.repeat(4)], // very different lengths
      ['', 'nonempty'],
    ];
    for (const [cookie, csrfField] of mismatches) {
      expect(await httpErrorStatusOf(action(makeEvent({ cookie, csrfField })))).toBe(403);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('logs admin.action.csrf_rejected with the path and editor, never the response', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const handler = vi.fn();
    const action = adminAction(handler);
    await httpErrorStatusOf(action(makeEvent({ cookie: 'AAAA', csrfField: 'AAAB' })));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.csrf_rejected',
      expect.objectContaining({ path: '/admin/club/events', editor: editor.email }),
    );
    warnSpy.mockRestore();
  });

  it('accepts a matching cookie and field', async () => {
    const handler = vi.fn(async ({ ctx }: { ctx: { audit: (r: { action: string; entity: string }) => void } }) => {
      ctx.audit({ action: 'noop', entity: 'test' });
      return { ok: true };
    });
    const action = adminAction(handler);
    const result = await action(makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' }));
    expect(result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('accepts a valid X-Cairn-CSRF header witness with no csrf form field, mirroring the guard', async () => {
    const handler = vi.fn(async ({ ctx }: { ctx: { audit: (r: { action: string; entity: string }) => void } }) => {
      ctx.audit({ action: 'noop', entity: 'test' });
      return { ok: true };
    });
    const action = adminAction(handler);
    const result = await action(makeEvent({ cookie: 'MATCH', csrfHeader: 'MATCH' }));
    expect(result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('falls back to the form field only when the header was never sent, not merely mismatched', async () => {
    // Precedence: a header that was SENT but wrong decides outright; it must not fall through
    // to a correct form field (the guard's own precedence rule, mirrored here).
    const handler = vi.fn();
    const action = adminAction(handler);
    expect(
      await httpErrorStatusOf(action(makeEvent({ cookie: 'MATCH', csrfHeader: 'WRONG', csrfField: 'MATCH' }))),
    ).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('adminAction: CSRF rejection discriminator (Task 3)', () => {
  type CsrfRecord = { path?: string; editor?: string; detail?: string; witness?: string };

  it('reads detail=no-cookie/witness=field with no cookie and no header', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const action = adminAction(vi.fn());
    await httpErrorStatusOf(action(makeEvent({ csrfField: 'TOK' })));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.csrf_rejected',
      expect.objectContaining<CsrfRecord>({ detail: 'no-cookie', witness: 'field' }),
    );
    warnSpy.mockRestore();
  });

  it('reads detail=no-witness/witness=field when the cookie is present but no csrf field was posted', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const action = adminAction(vi.fn());
    await httpErrorStatusOf(action(makeEvent({ cookie: 'TOK' })));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.csrf_rejected',
      expect.objectContaining<CsrfRecord>({ detail: 'no-witness', witness: 'field' }),
    );
    warnSpy.mockRestore();
  });

  it('reads detail=mismatch/witness=field on a same-length field mismatch', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const action = adminAction(vi.fn());
    await httpErrorStatusOf(action(makeEvent({ cookie: 'AAAA', csrfField: 'AAAB' })));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.csrf_rejected',
      expect.objectContaining<CsrfRecord>({ detail: 'mismatch', witness: 'field' }),
    );
    warnSpy.mockRestore();
  });

  it('reads detail=mismatch/witness=header for a stale header, never falling through to a valid field', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const action = adminAction(vi.fn());
    await httpErrorStatusOf(action(makeEvent({ cookie: 'MATCH', csrfHeader: 'WRONG', csrfField: 'MATCH' })));
    expect(warnSpy).toHaveBeenCalledWith(
      'admin.action.csrf_rejected',
      expect.objectContaining<CsrfRecord>({ detail: 'mismatch', witness: 'header' }),
    );
    warnSpy.mockRestore();
  });

  it('never logs token material or length on any csrf rejection', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const action = adminAction(vi.fn());
    await httpErrorStatusOf(action(makeEvent({ cookie: 'a-very-recognizable-secret-token', csrfField: 'WRONG' })));
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toContain('a-very-recognizable-secret-token');
    expect(serialized).not.toContain('WRONG');
    warnSpy.mockRestore();
  });
});

describe('adminAction: the handler runs with a verified editor and a bound audit emitter', () => {
  it('hands the handler the locals cairnEditor and forwards ctx.audit to the site auditSink', async () => {
    const sink = vi.fn();
    const action = adminAction(async ({ ctx }) => {
      expect(ctx.editor).toEqual(editor);
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42', detail: 'ok' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    const result = await action(event);
    expect(result).toEqual({ done: true });
    expect(sink).toHaveBeenCalledWith({
      action: 'approve',
      entity: 'signup',
      entityId: '42',
      detail: 'ok',
      actor: editor.email,
    });
  });

  it('never re-reads the request body: the handler reads the same posted fields the CSRF check used', async () => {
    const action = adminAction(async ({ form, ctx }) => {
      ctx.audit({ action: 'noop', entity: 'test' });
      return { note: form.get('note') };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', extra: { note: 'hello' } });
    expect(await action(event)).toEqual({ note: 'hello' });
  });
});

describe('adminAction: opt-in authorization', () => {
  const staff: Editor = { email: 'staff@example.com', displayName: 'Staff', role: 'editor', capability: 'editor' };
  const target = '/admin/club/events';
  const csrf = { cookie: 'MATCH', csrfField: 'MATCH' } as const;

  /** A wrapped handler that records its calls and audits, opted into the access check. */
  function guarded(access?: { target: string; ownerOnly?: boolean }) {
    const handler = vi.fn(async ({ ctx }: { ctx: { audit: (r: { action: string; entity: string }) => void } }) => {
      ctx.audit({ action: 'approve', entity: 'event' });
      return { ok: true } as const;
    });
    return { handler, action: adminAction(handler, access ? { access } : {}) };
  }

  it('leaves an omitted access option at today’s behavior: no map, no rule, handler still runs', async () => {
    // The zero-config default attaches an empty access map, so default-on enforcement would 403
    // every consumer that never declared one. Absent means absent.
    const { handler, action } = guarded();
    expect(await action(makeEvent({ ...csrf, editor: staff, access: {} }))).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('runs the handler when the map admits the session for the declared target', async () => {
    const { handler, action } = guarded({ target });
    expect(await action(makeEvent({ ...csrf, editor: staff, access: { [target]: ['editor'] } }))).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('audits and throws 403 when the map carries no rule for the target, owner included', async () => {
    const sink = vi.fn();
    const { handler, action } = guarded({ target });
    const event = makeEvent({ ...csrf, access: { '/admin/other': ['editor'] }, auditSink: sink });
    expect(await httpErrorStatusOf(action(event))).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ detail: 'rejected: no access rule', actor: editor.email }));
  });

  it('audits and throws 403 when no access map is attached at all', async () => {
    // Fail-closed: an opted-in action on a route the guard never ran is refused, not admitted.
    const sink = vi.fn();
    const { handler, action } = guarded({ target });
    expect(await httpErrorStatusOf(action(makeEvent({ ...csrf, auditSink: sink })))).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ detail: 'rejected: no access rule' }));
  });

  it('audits and throws 403 when the rule exists but the role is not admitted', async () => {
    const sink = vi.fn();
    const { handler, action } = guarded({ target });
    const event = makeEvent({ ...csrf, editor: staff, access: { [target]: ['owner'] }, auditSink: sink });
    expect(await httpErrorStatusOf(action(event))).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ detail: 'rejected: role not admitted' }));
  });

  it('audits and throws 403 for ownerOnly against an admitted non-owner session', async () => {
    const sink = vi.fn();
    const { handler, action } = guarded({ target, ownerOnly: true });
    const event = makeEvent({ ...csrf, editor: staff, access: { [target]: ['editor'] }, auditSink: sink });
    expect(await httpErrorStatusOf(action(event))).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ detail: 'rejected: not owner' }));
  });

  it('logs auth.access.denied with the session and the target on a refusal', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const { action } = guarded({ target });
    await httpErrorStatusOf(action(makeEvent({ ...csrf, editor: staff, access: { [target]: ['owner'] } })));
    expect(warnSpy).toHaveBeenCalledWith('auth.access.denied', { email: staff.email, role: staff.role, target });
    warnSpy.mockRestore();
  });

  it('refuses before the handler and before the unaudited check, so no unaudited record follows', async () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const { action } = guarded({ target });
    await httpErrorStatusOf(action(makeEvent({ ...csrf, editor: staff, access: { [target]: ['owner'] } })));
    expect(errorSpy).not.toHaveBeenCalledWith('admin.action.unaudited', expect.anything());
    errorSpy.mockRestore();
  });

  it('keeps the wrapped return type at T, never widening it to an ActionFailure union', async () => {
    // A compile-time assertion: authorization refusals throw here, so the handler's own success
    // type is still the whole of what a caller awaits. Widening would break every call site.
    const typed: (event: CairnEvent) => Promise<{ ok: true }> = adminAction(
      async () => ({ ok: true }) as const,
      { access: { target } },
    );
    expect(typeof typed).toBe('function');
  });
});

describe('adminAction: the required audit emit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a 500 in dev when the handler emits zero audit records', async () => {
    const action = adminAction(async () => ({ ok: true }), { isDev: true });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' });
    expect(await statusOf(action(event))).toBe(500);
  });

  it('logs admin.action.unaudited and still resolves in production', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async () => ({ ok: true }), { isDev: false });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' });
    const result = await action(event);
    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ event: 'admin.action.unaudited', editor: editor.email }));
  });

  it('exempts a fail() return from the unaudited check in dev: no throw, the fail() result passes through', async () => {
    const action = adminAction(async () => fail(400, { error: 'missing' }), { isDev: true });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' });
    const result = await action(event);
    expect(result).toEqual(fail(400, { error: 'missing' }));
  });

  it('exempts a fail() return from the unaudited check in production: no admin.action.unaudited log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async () => fail(404, { error: 'not found' }), { isDev: false });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' });
    const result = await action(event);
    expect(result).toEqual(fail(404, { error: 'not found' }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('still requires an audit on a normal (non-fail) success return', async () => {
    const action = adminAction(async () => ({ ok: true }), { isDev: true });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH' });
    expect(await statusOf(action(event))).toBe(500);
  });
});

describe('adminAction: the audit sink is fail-open', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes the handler and returns its result when locals.cairnAuditSink throws synchronously', async () => {
    const sink = vi.fn(() => {
      throw new Error('sink exploded');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    const result = await action(event);
    expect(result).toEqual({ done: true });
    expect(sink).toHaveBeenCalledOnce();
  });

  it('logs admin.action.sink_threw with the action identity and the error, never the record contents', async () => {
    const sink = vi.fn(() => {
      throw new Error('sink exploded');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42', detail: 'top secret detail' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    await action(event);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.action.sink_threw',
        path: '/admin/club/events',
        action: 'approve',
        entity: 'signup',
        entityId: '42',
        editor: editor.email,
        error: 'sink exploded',
      }),
    );
    const [record] = spy.mock.calls[0] as [Record<string, unknown>];
    expect(record.detail).toBeUndefined();
  });

  it("propagates a sink that throws SvelteKit's own redirect(), rather than swallowing it into a log line", async () => {
    const sink = vi.fn(() => {
      redirect(303, '/somewhere');
    });
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    let thrown: unknown;
    try {
      await action(event);
    } catch (err) {
      thrown = err;
    }
    expect(isRedirect(thrown)).toBe(true);
  });

  it("propagates a sink that throws SvelteKit's own error(), rather than swallowing it into a log line", async () => {
    const sink = vi.fn(() => {
      error(500, 'sink refused');
    });
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    let thrown: unknown;
    try {
      await action(event);
    } catch (err) {
      thrown = err;
    }
    expect(isHttpError(thrown)).toBe(true);
  });

  it('logs a diagnostic string, never "[object Object]", when a sink throws a plain object', async () => {
    const sink = vi.fn(() => {
      throw { code: 'boom', detail: 'internal sink state' };
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    await action(event);
    const [record] = spy.mock.calls[0] as [Record<string, unknown>];
    expect(record.error).not.toBe('[object Object]');
    expect(record.error).toContain('boom');
  });

  it('does not fail the action when locals.cairnAuditSink is async and rejects, and still logs the failure', async () => {
    const sink = vi.fn(async () => {
      throw new Error('async sink exploded');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const action = adminAction(async ({ ctx }) => {
      ctx.audit({ action: 'approve', entity: 'signup', entityId: '42' });
      return { done: true };
    });
    const event = makeEvent({ cookie: 'MATCH', csrfField: 'MATCH', auditSink: sink });
    const result = await action(event);
    expect(result).toEqual({ done: true });
    // The rejection handler is attached fire-and-forget: flush the microtask queue so it has run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.action.sink_threw',
        action: 'approve',
        entity: 'signup',
        entityId: '42',
        editor: editor.email,
        error: 'async sink exploded',
      }),
    );
  });
});
