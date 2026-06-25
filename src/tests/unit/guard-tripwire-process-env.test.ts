// The prod tripwire must fire on the adapter-node deploy shape, where the dev-backend flag lands in
// process.env and platform.env is empty. The integration test in auth-guard.test.ts proves the
// platform.env (Worker var) path under workerd; this node-env test proves the process.env path,
// which workerd cannot exercise reliably. Run together they show the tripwire reads BOTH sources.
import { describe, it, expect, vi } from 'vitest';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import type { RequestContext } from '../../lib/sveltekit/types.js';

const handle = createAuthGuard();
const OK = new Response('ok');

// The adapter-node shape: no Cloudflare platform binding at all, so the flag can only be read from
// process.env. `platform: undefined` mirrors a deploy where Worker vars never populate.
function adapterNodeEvent(pathname: string): RequestContext {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
    locals: {},
    platform: undefined,
    setHeaders: () => {},
  };
}

describe('dev-backend tripwire via process.env (adapter-node)', () => {
  it('refuses with 503 and logs guard.rejected reason=dev_backend_in_prod', async () => {
    const saved = process.env.CAIRN_DEV_BACKEND;
    process.env.CAIRN_DEV_BACKEND = '1';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      let resolved = false;
      const res = await handle({
        event: adapterNodeEvent('/admin'),
        resolve: async () => {
          resolved = true;
          return OK;
        },
      });
      expect(resolved).toBe(false);
      expect(res.status).toBe(503);
      const records = errorSpy.mock.calls.map(
        (c) => c[0] as { event?: string; reason?: string; path?: string },
      );
      expect(
        records.some(
          (r) =>
            r.event === 'guard.rejected' &&
            r.reason === 'dev_backend_in_prod' &&
            r.path === '/admin',
        ),
      ).toBe(true);
    } finally {
      errorSpy.mockRestore();
      if (saved === undefined) delete process.env.CAIRN_DEV_BACKEND;
      else process.env.CAIRN_DEV_BACKEND = saved;
    }
  });
});
