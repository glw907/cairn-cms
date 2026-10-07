// The prod tripwire reads the dev-backend flag from the Worker env (`cloudflare:workers`) alone,
// the one place a Worker var lands. A flag in `process.env` carries no meaning to the guard: it
// neither refuses nor changes any other decision. While a build prerenders, the guard leaves the
// Worker env untouched, since every read throws there. The unit project resolves
// `cloudflare:workers` to a settable fake and `$app/env` to a stub whose `building` a test flips.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';
import { setFakeEnv, setFakeEnvThrowing } from '../helpers/cloudflare-workers-fake.js';
import { __setBuilding } from '../_app-env.js';

// createAuthGuard is annotated `: Handle`, kit's own type (the interop carve-out); the cast below
// bridges it to the lighter CairnEvent shape this file's fakes build, mirroring
// auth-guard.test.ts's own note.
const handle = createAuthGuard() as unknown as (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response>;
const OK = new Response('ok');

/** A non-admin request, so an unrefused guard reaches `resolve` without any further gate. */
function event(): CairnEvent {
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
    setHeaders: () => {},
  };
}

/** Run the guard over {@link event}, reporting whether it reached `resolve`. */
async function run(): Promise<{ res: Response; resolved: boolean }> {
  let resolved = false;
  const res = await handle({
    event: event(),
    resolve: async () => {
      resolved = true;
      return OK;
    },
  });
  return { res, resolved };
}

describe('dev-backend tripwire reads the Worker env alone', () => {
  afterEach(() => {
    __setBuilding(false);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not refuse when the flag is set only in process.env', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '1');
    const { res, resolved } = await run();
    expect(resolved).toBe(true);
    expect(res).toBe(OK);
  });

  it('refuses with 503 and logs guard.refused reason=dev_backend_in_prod when the Worker env carries the flag', async () => {
    setFakeEnv({ CAIRN_DEV_BACKEND: '1' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { res, resolved } = await run();
    expect(resolved).toBe(false);
    expect(res.status).toBe(503);
    const records = errorSpy.mock.calls.map((c) => c[0] as { event?: string; reason?: string; path?: string });
    expect(
      records.some(
        (r) => r.event === 'guard.refused' && r.reason === 'dev_backend_in_prod' && r.path === '/blog',
      ),
    ).toBe(true);
  });

  it('never reads the Worker env while the build prerenders', async () => {
    __setBuilding(true);
    // Any env read now throws, the way the adapter's stub does during prerender.
    setFakeEnvThrowing();
    const { res, resolved } = await run();
    expect(resolved).toBe(true);
    expect(res).toBe(OK);
  });
});
