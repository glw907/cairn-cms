// Teardown removes only what the gate recorded, against stub APIs that record every call.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { teardownInstall, teardownStateDir, type TeardownDeps } from '../../../scripts/gate/teardown.mjs';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

const NAME = 'cairn-e2e-gate-0990rc3-a-031200';
const WRANGLER = `{ "name": "${NAME}", "d1_databases": [{ "database_name": "${NAME}-auth" }], "r2_buckets": [{ "bucket_name": "${NAME}-media" }] }`;
const record = {
  github: { appSlug: NAME, repo: { owner: 'glw907-test', repo: NAME } },
  cloudflare: { workerName: NAME, domain: 'carin-test.org', buildsTriggerUuid: 'trig-1', buildsConnectionUuid: 'conn-1' },
};

/** A stub whose `failing` routes answer 500 and whose `gone` set answers 404 to a DELETE. */
function stubDeps(options: { failing?: string[]; gone?: boolean; unknownRoute?: boolean } = {}) {
  const calls: Array<{ method: string; url: string }> = [];
  const printed: string[] = [];
  const apps: string[] = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url });
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (options.failing?.some((part) => url.includes(part))) return reply(500, { errors: [{ code: 1, message: 'boom' }] });
    if (method === 'DELETE' && options.unknownRoute && url.includes('/accounts/')) return reply(404, { success: false, errors: [{ code: 7003, message: 'no route' }] });
    if (method === 'DELETE') return options.gone ? reply(404, {}) : reply(200, { success: true });
    if (url.includes('/workers/domains')) return reply(200, { result: options.gone ? [] : [{ id: 'dom-1', hostname: 'carin-test.org', service: NAME }] });
    if (url.includes('/d1/database')) return reply(200, { result: options.gone ? [] : [{ uuid: 'd1-uuid', name: `${NAME}-auth` }] });
    return reply(404, {});
  }) as typeof fetch;
  const deps: TeardownDeps = {
    fetchImpl,
    cloudflareBase: 'https://cf.test/client/v4',
    githubBase: 'https://gh.test',
    cloudflareToken: 'cf-token',
    githubToken: 'gh-token',
    accountId: 'acct',
    print: (line) => printed.push(line),
    deleteApp: async (slug) => {
      apps.push(slug);
      return options.gone ? 'absent' : 'deleted';
    },
  };
  return { deps, calls, apps, printed };
}

describe('teardownInstall', () => {
  it('refuses a name without the prefix, making no call', async () => {
    const stub = stubDeps();
    const bad = { ...record, cloudflare: { ...record.cloudflare, workerName: 'someone-elses-worker' } };
    await expect(teardownInstall({ record: bad, wranglerText: WRANGLER, deps: stub.deps })).rejects.toThrow(/does not start with cairn-e2e-gate-/);
    expect(stub.calls).toEqual([]);
    const badBucket = WRANGLER.replace(`${NAME}-media`, 'production-media');
    await expect(teardownInstall({ record, wranglerText: badBucket, deps: stub.deps })).rejects.toThrow(/production-media/);
    expect(stub.calls).toEqual([]);
  });

  it('issues each delete once, in order, and never touches a build token registration', async () => {
    const stub = stubDeps();
    const result = await teardownInstall({ record, wranglerText: WRANGLER, deps: stub.deps });
    expect(result.left).toEqual([]);
    const deletes = stub.calls.filter((call) => call.method === 'DELETE').map((call) => call.url.replace('https://cf.test/client/v4/accounts/acct', ''));
    expect(deletes).toEqual([
      '/builds/triggers/trig-1',
      '/builds/repos/connections/conn-1',
      '/workers/domains/dom-1',
      `/workers/scripts/${NAME}?force=true`,
      '/d1/database/d1-uuid',
      `/r2/buckets/${NAME}-media`,
      `https://gh.test/repos/glw907-test/${NAME}`,
    ]);
    expect(stub.calls.some((call) => call.url.includes('builds/tokens'))).toBe(false);
    expect(stub.apps).toEqual([NAME]);
  });

  it('counts a 404 as done, so a second teardown reports nothing left', async () => {
    const stub = stubDeps({ gone: true });
    const result = await teardownInstall({ record, wranglerText: WRANGLER, deps: stub.deps });
    expect(result.left).toEqual([]);
    expect(result.steps.every((step) => step.status === 'absent')).toBe(true);
  });

  it('treats a 404 with an unknown-route code as left, and logs the first 404 body once', async () => {
    const stub = stubDeps({ unknownRoute: true });
    const result = await teardownInstall({ record, wranglerText: WRANGLER, deps: stub.deps });
    expect(result.left).toContain('Builds trigger');
    expect(result.left).toContain(`R2 ${NAME}-media`);
    expect(result.steps.find((step) => step.step === 'Builds trigger')?.detail).toContain('7003');
    expect(stub.printed.filter((line) => line.includes('first 404'))).toHaveLength(1);
    expect(stub.printed[0]).toContain('no route');
  });

  it('keeps a plain 404 as absent', async () => {
    const stub = stubDeps({ gone: true });
    await teardownInstall({ record, wranglerText: WRANGLER, deps: stub.deps });
    expect(stub.printed.filter((line) => line.includes('first 404'))).toHaveLength(1);
  });

  it('attempts R2 and the repository after a D1 failure, and reports D1 left', async () => {
    const stub = stubDeps({ failing: ['/d1/database'] });
    const result = await teardownInstall({ record, wranglerText: WRANGLER, deps: stub.deps });
    expect(result.left).toEqual([`D1 ${NAME}-auth`]);
    const urls = stub.calls.map((call) => call.url);
    expect(urls.some((url) => url.includes('/r2/buckets/'))).toBe(true);
    expect(urls.some((url) => url.includes('/repos/glw907-test/'))).toBe(true);
    expect(stub.apps).toEqual([NAME]);
  });
});

describe('teardownStateDir', () => {
  async function seedRun(root: string, run: string) {
    const runDir = path.join(root, run);
    const siteDir = path.join(runDir, 'installs', NAME);
    await mkdir(siteDir, { recursive: true });
    await mkdir(path.join(runDir, 'state'), { recursive: true });
    await writeFile(path.join(siteDir, 'wrangler.jsonc'), WRANGLER);
    await writeFile(path.join(runDir, 'state', 'site-abc123.json'), JSON.stringify({ ...record, dir: siteDir }));
    await writeFile(path.join(runDir, 'urls.log'), '');
    await writeFile(path.join(runDir, 'capture.bin'), '');
    return runDir;
  }

  it('reaches an install recorded in an earlier run directory and clears its record', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'gate-runs-'));
    dirs.push(root);
    const earlier = await seedRun(root, '20261101T000000');
    const stub = stubDeps();
    const out = await teardownStateDir({
      stateDir: path.join(earlier, 'state'),
      deps: stub.deps,
      cleanup: [path.join(earlier, 'urls.log'), path.join(earlier, 'capture.bin')],
      print: () => {},
    });
    expect(out).toEqual({ installs: 1, left: [] });
    expect(stub.calls.filter((call) => call.method === 'DELETE')).toHaveLength(7);
    expect(await readdir(path.join(earlier, 'state'))).toEqual([]);
    expect(await readdir(earlier)).not.toContain('urls.log');
  });

  it('keeps the record when the wrangler.jsonc is gone, since the D1 and R2 names were never read', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'gate-runs-'));
    dirs.push(root);
    const earlier = await seedRun(root, '20261101T000000');
    await rm(path.join(earlier, 'installs', NAME, 'wrangler.jsonc'));
    const stub = stubDeps();
    const out = await teardownStateDir({ stateDir: path.join(earlier, 'state'), deps: stub.deps, cleanup: [path.join(earlier, 'urls.log')], print: () => {} });
    expect(out.left).toEqual(['site-abc123.json: D1/R2 names unread']);
    expect(await readdir(path.join(earlier, 'state'))).toEqual(['site-abc123.json']);
    expect(await readdir(earlier)).toContain('urls.log');
  });

  it('keeps the record and the logs when a step is left', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'gate-runs-'));
    dirs.push(root);
    const earlier = await seedRun(root, '20261101T000000');
    const stub = stubDeps({ failing: ['/r2/buckets'] });
    const out = await teardownStateDir({ stateDir: path.join(earlier, 'state'), deps: stub.deps, cleanup: [path.join(earlier, 'urls.log')], print: () => {} });
    expect(out.left).toHaveLength(1);
    expect(await readdir(path.join(earlier, 'state'))).toEqual(['site-abc123.json']);
    expect(await readdir(earlier)).toContain('urls.log');
  });
});

describe('run-gate.sh exit trap', () => {
  it('runs through the trap and keeps the entry run exit code', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'gate-home-'));
    dirs.push(home);
    const script = fileURLToPath(new URL('../../../scripts/gate/run-gate.sh', import.meta.url));
    const result = spawnSync('bash', [script, '--no-such-mode'], { env: { PATH: process.env.PATH, HOME: home }, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage: run-gate.sh');
  });
});
