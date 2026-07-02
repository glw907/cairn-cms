import { describe, it, expect } from 'vitest';
import { liveProbeCheck } from '../../lib/doctor/check-probe.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const ORIGIN = 'https://site.example';

const WRANGLER_VARS = `{
  "vars": { "PUBLIC_ORIGIN": "https://from-wrangler.example" }
}`;

interface Call {
  url: string;
  init?: RequestInit;
}

/** A URL-dispatching scripted fetch that records every call, the doctor test idiom. */
function scripted(handler: (url: string, init?: RequestInit) => Response) {
  const calls: Call[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetch: impl as typeof fetch, calls };
}

/** The login page envelope a healthy deploy serves, with overridable csrf field and form. */
function loginPage(over: { field?: string; action?: string } = {}): string {
  const field = over.field ?? '<input type="hidden" name="csrf" value="field-token">';
  const action = over.action ?? '?/request';
  return `<html><body><form method="POST" action="${action}">${field}<input name="email"><button>Email me a sign-in link</button></form></body></html>`;
}

function loginResponse(over: { body?: string; status?: number; cookie?: string | null } = {}): Response {
  const headers = new Headers();
  const cookie =
    over.cookie === null
      ? null
      : (over.cookie ?? '__Host-cairn_csrf=cookie-token; Path=/; HttpOnly; Secure; SameSite=Strict');
  if (cookie !== null) headers.append('set-cookie', cookie);
  return new Response(over.body ?? loginPage(), { status: over.status ?? 200, headers });
}

/** SvelteKit's serialized form-action JSON for a no-Accept POST; data is a devalue string. */
function actionJson(status: 'sent' | 'send_error' | 'throttled'): Response {
  const sent = status === 'sent';
  return new Response(
    JSON.stringify({
      type: 'success',
      status: 200,
      data: `[{"status":1,"sent":2},"${status}",${sent}]`,
    }),
    { status: 200 }
  );
}

/** Routes the GET and the POST of one probe run. */
function probeFetch(get: Response, post: Response) {
  return scripted((url, init) => (init?.method === 'POST' ? post : get));
}

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
  return {
    cwd: '/site',
    fetch: (() => {
      throw new Error('unexpected fetch');
    }) as never,
    readFile: async () => null,
    ...over,
  };
}

describe('admin.login-probe', () => {
  it('passes the happy path, walking GET then POST with the cookie and field echoed', async () => {
    const { fetch, calls } = probeFetch(loginResponse(), actionJson('sent'));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('sent');
    expect(calls.map((c) => c.url)).toEqual([
      `${ORIGIN}/admin/login`,
      `${ORIGIN}/admin/login?/request`,
    ]);
    const post = calls[1];
    expect(post.init?.method).toBe('POST');
    const headers = new Headers(post.init?.headers);
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(headers.get('cookie')).toBe('__Host-cairn_csrf=cookie-token');
    const body = new URLSearchParams(String(post.init?.body));
    expect(body.get('csrf')).toBe('field-token');
    expect(body.get('email')).toMatch(/^cairn-doctor-probe-[a-z0-9]+@example\.invalid$/);
  });

  it('fails naming the status when GET /admin/login is not 200', async () => {
    const { fetch } = probeFetch(loginResponse({ status: 404 }), actionJson('sent'));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('404');
    expect(result.detail).toContain('/admin/login');
  });

  it('fails naming the __Host- cookie when an https page sets no CSRF cookie', async () => {
    const { fetch } = probeFetch(loginResponse({ cookie: null }), actionJson('sent'));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('__Host-cairn_csrf');
  });

  it('fails when an https page sets only the bare http cookie name', async () => {
    const { fetch } = probeFetch(
      loginResponse({ cookie: 'cairn_csrf=cookie-token; Path=/' }),
      actionJson('sent')
    );
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('__Host-cairn_csrf');
  });

  it('expects the bare cookie name on a local http origin', async () => {
    const { fetch, calls } = probeFetch(
      loginResponse({ cookie: 'cairn_csrf=cookie-token; Path=/; HttpOnly; SameSite=Strict' }),
      actionJson('sent')
    );
    const result = await liveProbeCheck('http://localhost:8788').run(ctx({ fetch }));
    expect(result.status).toBe('pass');
    expect(new Headers(calls[1].init?.headers).get('cookie')).toBe('cairn_csrf=cookie-token');
  });

  it('fails when the page carries no csrf hidden field', async () => {
    const { fetch } = probeFetch(
      loginResponse({ body: loginPage({ field: '' }) }),
      actionJson('sent')
    );
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('csrf');
  });

  it('fails when the csrf field carries no value', async () => {
    const { fetch } = probeFetch(
      loginResponse({ body: loginPage({ field: '<input type="hidden" name="csrf" value="">' }) }),
      actionJson('sent')
    );
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('csrf');
  });

  it('fails when no form posts the ?/request action', async () => {
    const { fetch } = probeFetch(
      loginResponse({ body: loginPage({ action: '?/other' }) }),
      actionJson('sent')
    );
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('?/request');
  });

  it('reads the csrf field with the attributes in any order', async () => {
    const { fetch } = probeFetch(
      loginResponse({
        body: loginPage({ field: '<input value="field-token" name="csrf" type="hidden">' }),
      }),
      actionJson('sent')
    );
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('pass');
  });

  it('fails naming the status when the POST is not 200', async () => {
    const { fetch } = probeFetch(loginResponse(), new Response('boom', { status: 500 }));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('500');
    expect(result.detail).toContain('?/request');
  });

  it('fails when the POST does not answer the serialized action JSON', async () => {
    const { fetch } = probeFetch(loginResponse(), new Response('<html>', { status: 200 }));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('action JSON');
  });

  it('fails naming the type when the action answers a non-success type', async () => {
    const post = new Response(JSON.stringify({ type: 'failure', status: 400 }), { status: 200 });
    const { fetch } = probeFetch(loginResponse(), post);
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('failure');
  });

  it('fails with a send-path detail on a send_error payload', async () => {
    const { fetch } = probeFetch(loginResponse(), actionJson('send_error'));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('send_error');
  });

  it('passes a throttled payload, noting the cooldown in the detail', async () => {
    const { fetch } = probeFetch(loginResponse(), actionJson('throttled'));
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('throttled');
  });

  it('fails with the error string when the fetch rejects', async () => {
    const fetch = (async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    }) as unknown as typeof globalThis.fetch;
    const result = await liveProbeCheck(ORIGIN).run(ctx({ fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('ENOTFOUND');
  });

  it('fails when the probe URL does not parse', async () => {
    const result = await liveProbeCheck('not a url').run(ctx());
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('not a url');
  });

  it('skips naming the three sources when bare --probe finds no URL', async () => {
    const result = await liveProbeCheck().run(ctx());
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('--probe');
    expect(result.detail).toContain('PUBLIC_ORIGIN');
    expect(result.detail).toContain('wrangler');
  });

  it('probes the environment PUBLIC_ORIGIN when bare --probe has no wrangler vars', async () => {
    const { fetch, calls } = probeFetch(loginResponse(), actionJson('sent'));
    const result = await liveProbeCheck().run(ctx({ fetch, publicOrigin: ORIGIN }));
    expect(result.status).toBe('pass');
    expect(calls[0].url).toBe(`${ORIGIN}/admin/login`);
  });

  it('lets the wrangler vars beat the environment for the bare --probe URL', async () => {
    const { fetch, calls } = probeFetch(loginResponse(), actionJson('sent'));
    const result = await liveProbeCheck().run(
      ctx({
        fetch,
        publicOrigin: ORIGIN,
        readFile: async (relPath) => (relPath === 'wrangler.jsonc' ? WRANGLER_VARS : null),
      })
    );
    expect(result.status).toBe('pass');
    expect(calls[0].url).toBe('https://from-wrangler.example/admin/login');
  });

  it('ties to the admin.login-probe-failed condition', () => {
    expect(liveProbeCheck().conditionId).toBe('admin.login-probe-failed');
    expect(liveProbeCheck().id).toBe('admin.login-probe');
  });
});
