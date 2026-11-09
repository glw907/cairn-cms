import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every /test fixture route refuses with a 404 unless the dev backend is on: each of the three
// dev-package routes checks the build define and the runtime opt-in, which reads the Worker env
// and then the process env. Each route has a control that proves the same setup does reach the
// handler when the backend is on.

// The routes read the Worker env from `cloudflare:workers`, which exists only where a Worker
// runs; each case installs its bindings in this stand-in before calling the route.
const workerEnv = vi.hoisted((): Record<string, unknown> => ({}));
vi.mock('cloudflare:workers', () => ({ env: workerEnv }));

vi.mock('@glw907/cairn-cms-dev', () => ({
  committedFile: () => 'committed body',
  lastRecordedCommit: () => ({ sha: 'recorded' }),
}));
vi.mock('#site/cairn.config.js', () => ({
  cairn: { rendering: { render: async () => '<p>rendered</p>' } },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

interface DevPackageRoute {
  name: string;
  call: () => Promise<Response>;
}

const devPackageRoutes: DevPackageRoute[] = [
  {
    name: 'last-commit',
    call: async () => {
      const { GET } = await import('./last-commit/+server.js');
      return GET({} as Parameters<typeof GET>[0]);
    },
  },
  {
    name: 'branch-file',
    call: async () => {
      const { GET } = await import('./branch-file/+server.js');
      return GET({
        url: new URL('http://localhost:4392/test/branch-file?branch=b&path=p'),
      } as Parameters<typeof GET>[0]);
    },
  },
  {
    name: 'render-media',
    call: async () => {
      const { POST } = await import('./render-media/+server.js');
      const record = { hash: 'abc', mime: 'image/png' };
      return POST({
        request: new Request('http://localhost:4392/test/render-media', {
          method: 'POST',
          body: JSON.stringify({ body: 'x', record }),
        }),
      } as Parameters<typeof POST>[0]);
    },
  },
];

describe.each(devPackageRoutes)('/test/$name', (route) => {
  beforeEach(() => {
    vi.stubGlobal('__CAIRN_DEV_BUILD__', true);
    for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  });

  it('answers 404 on a local host when CAIRN_DEV_BACKEND is absent', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', undefined);
    await expect(route.call()).rejects.toMatchObject({ status: 404 });
  });

  it('answers 200 when CAIRN_DEV_BACKEND is 1 in the process env', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '1');
    const response = await route.call();
    expect(response.status).toBe(200);
  });

  it('answers 200 when CAIRN_DEV_BACKEND is 1 on the Worker env alone', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', undefined);
    workerEnv.CAIRN_DEV_BACKEND = '1';
    const response = await route.call();
    expect(response.status).toBe(200);
  });
});
