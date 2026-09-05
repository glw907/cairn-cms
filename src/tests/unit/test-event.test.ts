import { describe, it, expect } from 'vitest';
import { testEvent } from '../helpers/test-event.js';

describe('testEvent', () => {
  it('builds a structurally valid CairnEvent with no overrides', () => {
    const event = testEvent();
    expect(event.url).toBeInstanceOf(URL);
    expect(event.request).toBeInstanceOf(Request);
    expect(event.request.method).toBe('GET');
    expect(event.params).toEqual({});
    expect(event.route).toEqual({ id: null });
    expect(event.cookies.get('anything')).toBeUndefined();
    expect(event.locals).toEqual({});
    expect(event.platform).toEqual({ env: {} });
    // setHeaders is callable and a no-op.
    expect(() => event.setHeaders({ 'x-test': '1' })).not.toThrow();
  });

  it('threads the url override into both event.url and event.request.url', () => {
    const event = testEvent({ url: 'https://t.example/admin/posts/hi' });
    expect(event.url.pathname).toBe('/admin/posts/hi');
    expect(event.request.url).toBe('https://t.example/admin/posts/hi');
  });

  it('defaults to GET, and to POST once a body is given', () => {
    expect(testEvent().request.method).toBe('GET');
    expect(testEvent({ body: 'x=1' }).request.method).toBe('POST');
  });

  it('honors an explicit method even without a body', () => {
    expect(testEvent({ method: 'DELETE' }).request.method).toBe('DELETE');
  });

  it('carries a body and headers onto the built request', async () => {
    const event = testEvent({ body: 'a=1&b=2', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    expect(event.request.headers.get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(await event.request.text()).toBe('a=1&b=2');
  });

  it('accepts a prebuilt request, bypassing method/body/headers construction', () => {
    const request = new Request('https://t.example/admin/posts', { method: 'PUT' });
    const event = testEvent({ request });
    expect(event.request).toBe(request);
  });

  it('threads params, route, cookies, locals, and env overrides straight through', () => {
    const cookies = { get: () => 'v', set: () => {}, delete: () => {} };
    const locals = { cairnEditor: { email: 'e@t', displayName: 'E', role: 'editor', capability: 'editor' as const } };
    const event = testEvent({
      params: { concept: 'posts', id: 'hi' },
      route: '/admin/[...path]',
      cookies,
      locals,
      env: { PUBLIC_ORIGIN: 'https://site.example' },
    });
    expect(event.params).toEqual({ concept: 'posts', id: 'hi' });
    expect(event.route).toEqual({ id: '/admin/[...path]' });
    expect(event.cookies).toBe(cookies);
    expect(event.locals).toBe(locals);
    expect(event.platform).toEqual({ env: { PUBLIC_ORIGIN: 'https://site.example' } });
  });
});
