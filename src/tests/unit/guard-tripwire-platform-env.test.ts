// The prod tripwire reads the dev-backend flag from `platform.env` alone, the one place a Worker
// var lands. A flag in `process.env` carries no meaning to the guard: it neither refuses nor
// changes any other decision. The integration test in auth-guard.test.ts proves the platform.env
// path under workerd; this node-env pair pins the two sides of that rule against the shell's own
// environment, which workerd cannot exercise reliably.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

// createAuthGuard is annotated `: Handle`, kit's own ambient type (the interop carve-out); the
// cast below bridges it to the lighter CairnEvent shape this file's fakes build, mirroring
// auth-guard.test.ts's own note.
const handle = createAuthGuard() as unknown as (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response>;
const OK = new Response('ok');

/** A non-admin request, so an unrefused guard reaches `resolve` without any further gate. */
function event(platform: CairnEvent['platform']): CairnEvent {
  const url = 'https://test.dev/blog';
  return {
    url: new URL(url),
    request: new Request(url),
    params: {},
    route: { id: '/blog' },
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
    locals: {},
    platform,
    setHeaders: () => {},
  };
}

describe('dev-backend tripwire reads platform.env alone', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not refuse when the flag is set only in process.env', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '1');
    let resolved = false;
    const res = await handle({
      event: event({ env: {} }),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(true);
    expect(res).toBe(OK);
  });

  it('refuses with 503 and logs guard.refused reason=dev_backend_in_prod when platform.env carries the flag', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolved = false;
    const res = await handle({
      event: event({ env: { CAIRN_DEV_BACKEND: '1' } }),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(503);
    const records = errorSpy.mock.calls.map((c) => c[0] as { event?: string; reason?: string; path?: string });
    expect(
      records.some(
        (r) => r.event === 'guard.refused' && r.reason === 'dev_backend_in_prod' && r.path === '/blog',
      ),
    ).toBe(true);
  });
});
