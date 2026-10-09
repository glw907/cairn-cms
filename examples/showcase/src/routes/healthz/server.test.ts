import { beforeEach, describe, expect, it, vi } from 'vitest';

// The route's own wiring is what is under test: how it maps loadHealth's payload to a status. The
// engine's health check and the site's runtime are stood in for, since neither needs the full
// adapter chain this standalone vitest config cannot parse.
const health = vi.hoisted(() => ({ loadHealth: vi.fn() }));
vi.mock('@glw907/cairn-cms/sveltekit', () => health);
vi.mock('#chassis/cairn.server.js', () => ({ runtime: {} }));

const event = {} as Parameters<(typeof import('./+server.js'))['GET']>[0];

describe('healthz route', () => {
  beforeEach(() => {
    health.loadHealth.mockReset();
  });

  it('answers 200 with the payload when the check is ok', async () => {
    const payload = { ok: true, checks: { githubAppSigning: { ok: true } } };
    health.loadHealth.mockResolvedValue(payload);
    const { GET } = await import('./+server.js');
    const res = await GET(event);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  it('answers 503 with the payload when the check is not ok', async () => {
    const payload = {
      ok: false,
      checks: {
        githubAppSigning: { ok: false, detail: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured' },
      },
    };
    health.loadHealth.mockResolvedValue(payload);
    const { GET } = await import('./+server.js');
    const res = await GET(event);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual(payload);
  });

  it('answers with cache-control no-store on both the passing and the failing payload', async () => {
    const { GET } = await import('./+server.js');
    health.loadHealth.mockResolvedValue({ ok: true, checks: { githubAppSigning: { ok: true } } });
    expect((await GET(event)).headers.get('cache-control')).toBe('no-store');
    health.loadHealth.mockRejectedValue(new Error('boom'));
    expect((await GET(event)).headers.get('cache-control')).toBe('no-store');
  });

  it('answers 503 with a fixed detail when the check throws, never the thrown message', async () => {
    health.loadHealth.mockRejectedValue(new Error('secret-bearing failure text'));
    const { GET } = await import('./+server.js');
    const res = await GET(event);
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).not.toContain('secret-bearing failure text');
    const body = JSON.parse(text);
    expect(body.ok).toBe(false);
    expect(body.checks.githubAppSigning.ok).toBe(false);
    expect(typeof body.checks.githubAppSigning.detail).toBe('string');
  });
});
