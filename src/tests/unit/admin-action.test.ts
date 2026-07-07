import { describe, it, expect, vi, afterEach } from 'vitest';
import { fail } from '@sveltejs/kit';
import { adminAction, AdminActionError, type AdminActionEvent, type AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';

const editor: Editor = { email: 'owner@example.com', displayName: 'Owner', role: 'owner' };

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
  extra?: Record<string, string>;
  auditSink?: (record: AdminActionAuditRecord) => void;
}): AdminActionEvent {
  const body = new URLSearchParams();
  if (opts.csrfField !== undefined) body.set('csrf', opts.csrfField);
  for (const [k, v] of Object.entries(opts.extra ?? {})) body.set(k, v);
  const request = new Request('https://x.dev/admin/club/events', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return {
    url: new URL('https://x.dev/admin/club/events'),
    request,
    cookies: jar(opts.cookie !== undefined ? { '__Host-cairn_csrf': opts.cookie } : {}),
    locals: { editor: opts.editor === undefined ? editor : opts.editor, auditSink: opts.auditSink },
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    throw new Error('expected adminAction to throw');
  } catch (err) {
    expect(err).toBeInstanceOf(AdminActionError);
    return (err as AdminActionError).status;
  }
}

describe('adminAction: editor guard', () => {
  it('throws a 403 with no locals.editor, and never calls the handler', async () => {
    const handler = vi.fn();
    const action = adminAction(handler);
    const event = makeEvent({ editor: null, cookie: 'TOK', csrfField: 'TOK' });
    expect(await statusOf(action(event))).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('adminAction: CSRF guard (defense-in-depth)', () => {
  it('rejects a missing cookie, a missing field, and a same-length mismatch, all 403', async () => {
    const handler = vi.fn();
    const action = adminAction(handler);
    expect(await statusOf(action(makeEvent({ csrfField: 'TOK' })))).toBe(403); // no cookie
    expect(await statusOf(action(makeEvent({ cookie: 'TOK' })))).toBe(403); // no field
    expect(await statusOf(action(makeEvent({ cookie: 'AAAA', csrfField: 'AAAB' })))).toBe(403); // same-length mismatch
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
      expect(await statusOf(action(makeEvent({ cookie, csrfField })))).toBe(403);
    }
    expect(handler).not.toHaveBeenCalled();
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
});

describe('adminAction: the handler runs with a verified editor and a bound audit emitter', () => {
  it('hands the handler the locals editor and forwards ctx.audit to the site auditSink', async () => {
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
      editor: editor.email,
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
