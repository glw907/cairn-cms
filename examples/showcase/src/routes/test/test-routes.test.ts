import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureDeliver, resetCapture } from '../../members/capture-transport.js';

// Every /test fixture route refuses with a 404 unless the dev backend is on. The members routes
// check the worker's own env and the host in their bodies; the three dev-package routes check the
// build define and the runtime opt-in. Each refusal case below keeps its collaborators armed (a
// stored capture, a database stub, a resolved subject, a recorded commit), so a route that lost
// its check would answer 200 instead of reaching an empty-handed 404 by accident, and each route
// has a control that proves the same setup does reach the handler when the backend is on.

// The members routes read the Worker env from `cloudflare:workers`, which exists only where a
// Worker runs; each case installs its bindings in this stand-in before calling the route.
const workerEnv = vi.hoisted((): Record<string, unknown> => ({}));
vi.mock('cloudflare:workers', () => ({ env: workerEnv }));

const revokeSessions = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../members/channel.js', () => ({
  memberChannel: { resolveSubject: async () => 'member-test', revokeSessions },
}));
vi.mock('@glw907/cairn-cms-dev', () => ({
  committedFile: () => 'committed body',
  lastRecordedCommit: () => ({ sha: 'recorded' }),
}));
vi.mock('#theme/cairn.config.js', () => ({
  cairn: { rendering: { render: async () => '<p>rendered</p>' } },
}));

/** Build the fake event for `path` on `host`, installing `env` as the worker's bindings. */
function eventFor(path: string, host: string, env: Record<string, unknown>) {
  for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  Object.assign(workerEnv, env);
  const url = new URL(`http://${host}${path}`);
  return { url, request: new Request(url, { method: 'POST', body: '{}' }) };
}

/** A D1 stand-in that records each statement the route runs. */
function fakeDb() {
  const statements: string[] = [];
  return {
    statements,
    prepare: (sql: string) => ({
      run: async () => {
        statements.push(sql);
      },
    }),
  };
}

let db = fakeDb();

interface MembersRoute {
  name: string;
  /** Invoke the route's handler against a fake event on `host` with `env` as its bindings. */
  call: (host: string, env: Record<string, unknown>) => Promise<Response>;
  /** True when the route did its side effect, so a refusal can be shown to have skipped it. */
  didWork: () => boolean;
}

const membersRoutes: MembersRoute[] = [
  {
    name: 'last-otp',
    call: async (host, env) => {
      const { GET } = await import('./last-otp/+server.js');
      return GET(
        eventFor('/test/last-otp?contact=seed@showcase.test', host, env) as unknown as Parameters<
          typeof GET
        >[0],
      );
    },
    // The response body is the work: a refused call never reaches the stored capture.
    didWork: () => false,
  },
  {
    name: 'reset-members',
    call: async (host, env) => {
      const { POST } = await import('./reset-members/+server.js');
      return POST(
        eventFor('/test/reset-members', host, { ...env, MEMBER_DB: db }) as unknown as Parameters<
          typeof POST
        >[0],
      );
    },
    didWork: () => db.statements.length > 0,
  },
  {
    name: 'revoke-member-session',
    call: async (host, env) => {
      const { POST } = await import('./revoke-member-session/+server.js');
      return POST(
        eventFor('/test/revoke-member-session', host, {
          ...env,
          MEMBER_DB: db,
        }) as unknown as Parameters<typeof POST>[0],
      );
    },
    didWork: () => revokeSessions.mock.calls.length > 0,
  },
];

beforeEach(async () => {
  db = fakeDb();
  revokeSessions.mockClear();
  resetCapture();
  // A stored capture for the contact last-otp reads, delivered under the flag the transport itself
  // demands, so the 404 a flag-less call gets can only come from the route's own refusal.
  await captureDeliver('seed@showcase.test', '12345678', {
    env: { CAIRN_DEV_BACKEND: '1' },
  } as Parameters<typeof captureDeliver>[2]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe.each(membersRoutes)('/test/$name', (route) => {
  it('answers 404 on a local host when the flag is absent from env', async () => {
    await expect(route.call('localhost:4392', {})).rejects.toMatchObject({ status: 404 });
    expect(route.didWork()).toBe(false);
  });

  it('answers 404 on a non-local host even with the flag set', async () => {
    await expect(
      route.call('showcase.example.com', { CAIRN_DEV_BACKEND: '1' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(route.didWork()).toBe(false);
  });

  it('answers 200 on a local host with the flag set', async () => {
    const response = await route.call('localhost:4392', { CAIRN_DEV_BACKEND: '1' });
    expect(response.status).toBe(200);
  });
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
  });

  it('answers 404 on a local host when CAIRN_DEV_BACKEND is absent', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', undefined);
    await expect(route.call()).rejects.toMatchObject({ status: 404 });
  });

  it('answers 200 when CAIRN_DEV_BACKEND is 1', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '1');
    const response = await route.call();
    expect(response.status).toBe(200);
  });
});
