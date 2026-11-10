// The sweep against an in-memory stand-in for the Cloudflare and GitHub APIs: what it lists, what it
// never lists, the order it deletes in, and what --check-scopes creates and removes.
import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  GATE_ACCOUNT_ID,
  GATE_NAME,
  PROBE_NAME,
  apply,
  checkScopes,
  dryRun,
  inventory,
  select,
  type Clients,
} from '../../../scripts/gate/sweep.mjs';

const ID = '2611091200';
const OTHER = '2611091300';
const ZONE = 'zone1';
const OWNER = 'machine';

type Repo = { name: string; runs: Array<{ id: number; status: string }> };
type Record_ = { type: string; name: string; content: string };

interface World {
  workers: string[];
  domains: Array<{ id: string; hostname: string; service: string }>;
  d1: Array<{ uuid: string; name: string }>;
  r2: Record<string, string[]>;
  repos: Repo[];
  records: Record_[];
  apps: string[];
  /** `METHOD path-prefix` entries that answer 403. */
  refuse: string[];
  /** Names whose delete answers 404, as if a partial run already removed them. */
  gone: string[];
  tokenStatus: string;
}

const emptyWorld = (): World => ({
  workers: [],
  domains: [],
  d1: [],
  r2: {},
  repos: [],
  records: [],
  apps: [],
  refuse: [],
  gone: [],
  tokenStatus: 'active',
});

/** The stand-in: `calls` lists every request as `METHOD path`, in order. */
function stand(world: World) {
  const calls: string[] = [];
  const acct = `/accounts/${GATE_ACCOUNT_ID}`;
  const ok = (result: unknown, info: object = {}) => ({ status: 200, json: { success: true, errors: [], result, result_info: info }, headers: new Headers() });
  const status = (code: number, json: unknown = null) => ({ status: code, json, headers: new Headers() });
  const forbidden = () => status(403, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] });

  const cf: Clients['cf'] = async (method, route) => {
    const [path] = route.split('?');
    const key = `${method} ${path}`;
    calls.push(key);
    if (world.refuse.some((prefix) => key.startsWith(prefix))) return forbidden();
    const last = decodeURIComponent(path.split('/').at(-1) ?? '');
    if (key === `GET /zones`) return ok([{ id: ZONE }]);
    if (key === `GET ${acct}/tokens/verify`) return ok({ id: 't', status: world.tokenStatus });
    if (key === `GET ${acct}`) return ok({ id: GATE_ACCOUNT_ID });
    if (key === `GET /zones/${ZONE}`) return ok({ id: ZONE });
    if (key === `GET /zones/${ZONE}/dns_records`) return ok(world.records);
    if (key === `GET /zones/${ZONE}/email/sending/subdomains`) return ok([]);
    if (key === `GET /zones/${ZONE}/workers/routes`) return ok([]);
    if (key === `GET ${acct}/workers/scripts`) return ok(world.workers.map((id) => ({ id })));
    if (key === `GET ${acct}/workers/domains`) return ok(world.domains);
    if (key === `GET ${acct}/d1/database`) return ok(world.d1);
    if (key === `GET ${acct}/r2/buckets`) return ok({ buckets: Object.keys(world.r2).map((name) => ({ name })) });
    const objects = /^GET .*\/r2\/buckets\/([^/]+)\/objects$/.exec(key);
    if (objects) return ok((world.r2[objects[1]] ?? []).map((k) => ({ key: k })));
    const object = /^DELETE .*\/r2\/buckets\/([^/]+)\/objects\/(.+)$/.exec(key);
    if (object) {
      world.r2[object[1]] = world.r2[object[1]].filter((k) => k !== decodeURIComponent(object[2]));
      return ok(null);
    }
    if (method === 'PUT' && path === `${acct}/workers/scripts/${last}`) {
      world.workers.push(last);
      return ok({ id: last });
    }
    if (method === 'PUT' && path === `${acct}/workers/domains`) {
      world.domains.push({ id: 'dom-probe', hostname: `${last}`, service: 'x' });
      return ok({ id: 'dom-probe' });
    }
    if (method === 'POST' && path === `${acct}/d1/database`) {
      world.d1.push({ uuid: 'd1-probe', name: 'probe' });
      return ok({ uuid: 'd1-probe' });
    }
    if (method === 'POST' && path === `${acct}/r2/buckets`) {
      world.r2.probe = [];
      return ok({ name: 'probe' });
    }
    if (method === 'DELETE') {
      if (world.gone.includes(last)) return status(404, { success: false, errors: [{ code: 10007, message: 'not found' }] });
      if (path.includes('/workers/scripts/')) world.workers = world.workers.filter((w) => w !== last);
      if (path.includes('/workers/domains/')) {
        // The real API answers a domain delete with 204 and no body.
        world.domains = world.domains.filter((d) => d.id !== last);
        return status(204, null);
      }
      if (path.includes('/d1/database/')) world.d1 = world.d1.filter((d) => d.uuid !== last);
      if (path.includes('/r2/buckets/')) {
        if ((world.r2[last] ?? []).length > 0) return status(409, { success: false, errors: [{ code: 10008, message: 'bucket not empty' }] });
        delete world.r2[last];
      }
      return ok(null);
    }
    return status(404, { success: false, errors: [{ code: 7003, message: `no route ${key}` }] });
  };

  const gh: Clients['gh'] = async (method, route) => {
    const [path] = route.split('?');
    const key = `${method} ${path}`;
    calls.push(key);
    if (world.refuse.some((prefix) => key.startsWith(prefix))) return status(403, { message: 'Resource not accessible' });
    if (key === 'GET /user') return status(200, { login: OWNER });
    if (key === 'GET /user/repos') return status(200, world.repos.map((r) => ({ name: r.name, owner: { login: OWNER } })));
    const runs = /^GET \/repos\/[^/]+\/([^/]+)\/actions\/runs$/.exec(key);
    if (runs) {
      const wanted = new URL(route, 'http://x').searchParams.get('status');
      const repo = world.repos.find((r) => r.name === runs[1]);
      return status(200, { workflow_runs: (repo?.runs ?? []).filter((r) => r.status === wanted) });
    }
    const cancel = /^POST \/repos\/[^/]+\/([^/]+)\/actions\/runs\/(\d+)\/cancel$/.exec(key);
    if (cancel) {
      const repo = world.repos.find((r) => r.name === cancel[1]);
      if (repo) repo.runs = repo.runs.filter((r) => r.id !== Number(cancel[2]));
      return status(202, {});
    }
    if (method === 'POST' && path === '/user/repos') {
      world.repos.push({ name: 'probe-repo', runs: [] });
      return status(201, { name: 'probe-repo' });
    }
    if (method === 'DELETE') {
      const name = path.split('/').at(-1) ?? '';
      if (world.gone.includes(name)) return status(404, { message: 'Not Found' });
      world.repos = world.repos.filter((r) => r.name !== name && !(name === OWNER));
      return status(204, null);
    }
    return status(404, { message: `no route ${key}` });
  };
  return { clients: { cf, gh, accountId: GATE_ACCOUNT_ID } as Clients, calls };
}

function runner(world: World, probeTime = 1700000000000) {
  const { clients, calls } = stand(world);
  const lines: string[] = [];
  const deletedApps: string[] = [];
  return {
    calls,
    lines,
    deletedApps,
    run: {
      clients,
      listApps: async () => [...world.apps],
      deleteApp: async (slug: string) => {
        calls.push(`APP delete ${slug}`);
        deletedApps.push(slug);
        world.apps = world.apps.filter((a) => a !== slug);
        return 'deleted' as const;
      },
      log: (line: string) => lines.push(line),
      now: () => probeTime,
    },
  };
}

const mutating = (calls: string[]) => calls.filter((call) => !call.startsWith('GET '));

/** A world holding one full run's resources, a lookalike of each kind, and the old gate's. */
function crowded(): World {
  const world = emptyWorld();
  const base = `cairn-gate-${ID}`;
  world.workers = [base, `${base}-auth`, 'cairn-gate-x', 'cairn-e2e-gate-0990rc3-a-030905', 'live-site'];
  world.domains = [
    { id: 'd-mine', hostname: 'carin-test.org', service: base },
    { id: 'd-other', hostname: 'other.carin-test.org', service: 'live-site' },
  ];
  world.d1 = [{ uuid: 'u1', name: `${base}-auth` }, { uuid: 'u2', name: 'live-db' }];
  world.r2 = { [`${base}-media`]: ['a.png', 'b/c.png'], 'cairn-gate-x': [] };
  world.repos = [
    { name: base, runs: [{ id: 7, status: 'in_progress' }, { id: 8, status: 'queued' }] },
    { name: `${base}-2`, runs: [] },
    { name: 'cairn-e2e-gate-0990rc3-a-030905', runs: [] },
    { name: `x-${base}`, runs: [] },
  ];
  world.apps = [`cairn-${base}`, 'cairn-e2e-gate-0990rc3-a-030905', `cairn-${base}-extra`];
  world.records = [{ type: 'MX', name: 'carin-test.org', content: 'mx.example' }];
  return world;
}

describe('the name matchers', () => {
  it('pin the patterns as literals', () => {
    expect(GATE_NAME.source).toBe('^cairn-gate-\\d{10}(-[2-9])?(-auth|-media)?$');
    expect(APP_NAME.source).toBe('^cairn-cairn-gate-\\d{10}$');
    expect(PROBE_NAME.source).toBe('^cairn-gate-probe-\\d+$');
  });

  it.each([
    [`cairn-gate-${ID}`, true],
    [`cairn-gate-${ID}-2`, true],
    [`cairn-gate-${ID}-9-auth`, true],
    [`cairn-gate-${ID}-media`, true],
    ['cairn-gate-x', false],
    [`cairn-gate-${ID}-1`, false],
    [`cairn-gate-${ID}-extra`, false],
    [`x-cairn-gate-${ID}`, false],
    ['cairn-gate-12345678901', false],
    ['cairn-e2e-gate-0990rc3-a-030905', false],
  ])('GATE_NAME on %s is %s', (name, expected) => {
    expect(GATE_NAME.test(name)).toBe(expected);
  });
});

describe('select', () => {
  it('picks a custom domain only through its service naming a picked Worker', async () => {
    const { run } = runner(crowded());
    const targets = select(await inventory(run.clients, run.listApps), GATE_NAME, APP_NAME);
    expect(targets.workers).toEqual([`cairn-gate-${ID}`, `cairn-gate-${ID}-auth`]);
    expect(targets.domains).toEqual([{ id: 'd-mine', hostname: 'carin-test.org' }]);
    expect(targets.repos.map((r) => r.name)).toEqual([`cairn-gate-${ID}`, `cairn-gate-${ID}-2`]);
    expect(targets.databases.map((d) => d.name)).toEqual([`cairn-gate-${ID}-auth`]);
    expect(targets.buckets).toEqual([`cairn-gate-${ID}-media`]);
    expect(targets.apps).toEqual([`cairn-cairn-gate-${ID}`]);
  });
});

describe('the dry run', () => {
  it('deletes nothing, lists the targets, and reports the old gate without listing it', async () => {
    const world = crowded();
    world.apps = [`cairn-cairn-gate-${ID}`, 'cairn-e2e-gate-0990rc3-a-030905'];
    const { run, calls, lines } = runner(world);
    expect(await dryRun(run)).toBe(0);
    expect(mutating(calls)).toEqual([]);
    expect(lines).toContain(`delete worker cairn-gate-${ID}`);
    expect(lines).toContain(`delete app cairn-cairn-gate-${ID}`);
    expect(lines).toContain('delete custom domain carin-test.org');
    expect(lines.filter((l) => l.startsWith('delete ')).join('\n')).not.toMatch(/cairn-gate-x|e2e|live-/);
    expect(lines).toContain('  old gate worker cairn-e2e-gate-0990rc3-a-030905');
    expect(lines).toContain('  old gate repository cairn-e2e-gate-0990rc3-a-030905');
    expect(lines).toContain('  old gate app cairn-e2e-gate-0990rc3-a-030905');
  });

  it('never lists a TXT, MX, or DKIM record, however it is named', async () => {
    const world = emptyWorld();
    world.records = [
      { type: 'TXT', name: 'carin-test.org', content: 'v=spf1' },
      { type: 'MX', name: 'carin-test.org', content: 'mx' },
      { type: 'TXT', name: 'cf2024-1._domainkey.carin-test.org', content: 'k=rsa' },
      { type: 'TXT', name: 'www.carin-test.org', content: 'x' },
    ];
    const { run, lines } = runner(world);
    expect(await dryRun(run)).toBe(0);
    expect(lines.some((l) => l.startsWith('RECORD'))).toBe(false);
  });

  it('stops naming a record left on the bare address, and one on www', async () => {
    const world = emptyWorld();
    world.records = [
      { type: 'AAAA', name: 'carin-test.org', content: '100::' },
      { type: 'CNAME', name: 'www.carin-test.org', content: 'carin-test.org' },
    ];
    const { run, lines, calls } = runner(world);
    expect(await dryRun(run)).toBe(1);
    expect(lines).toContain('RECORD   AAAA carin-test.org -> 100::');
    expect(lines).toContain('RECORD   CNAME www.carin-test.org -> carin-test.org');
    expect(mutating(calls)).toEqual([]);
  });

  it('does not stop on a record that a listed custom domain takes with it', async () => {
    const world = crowded();
    world.records = [{ type: 'AAAA', name: 'carin-test.org', content: '100::' }];
    const { run } = runner(world);
    expect(await dryRun(run)).toBe(0);
  });
});

describe('--apply', () => {
  it('cancels a repository\'s runs before deleting it, and deletes repositories before Workers', async () => {
    const world = crowded();
    const { run, calls } = runner(world);
    expect(await apply(run)).toBe(0);
    const order = mutating(calls);
    const at = (call: string) => order.indexOf(call);
    const repo = `DELETE /repos/${OWNER}/cairn-gate-${ID}`;
    expect(at(`POST /repos/${OWNER}/cairn-gate-${ID}/actions/runs/7/cancel`)).toBeGreaterThanOrEqual(0);
    expect(at(`POST /repos/${OWNER}/cairn-gate-${ID}/actions/runs/8/cancel`)).toBeLessThan(at(repo));
    expect(at(`POST /repos/${OWNER}/cairn-gate-${ID}/actions/runs/7/cancel`)).toBeLessThan(at(repo));
    expect(at(repo)).toBeLessThan(at(`DELETE /accounts/${GATE_ACCOUNT_ID}/workers/scripts/cairn-gate-${ID}`));
    expect(at(`DELETE /accounts/${GATE_ACCOUNT_ID}/workers/domains/d-mine`)).toBeLessThan(at(`DELETE /accounts/${GATE_ACCOUNT_ID}/workers/scripts/cairn-gate-${ID}`));
    expect(world.workers).toEqual(['cairn-gate-x', 'cairn-e2e-gate-0990rc3-a-030905', 'live-site']);
  });

  it('checks tokens/verify first and deletes nothing under an inactive token', async () => {
    const world = crowded();
    world.tokenStatus = 'expired';
    const { run, calls } = runner(world);
    await expect(apply(run)).rejects.toThrow('expired');
    expect(calls[0]).toBe(`GET /accounts/${GATE_ACCOUNT_ID}/tokens/verify`);
    expect(mutating(calls)).toEqual([]);
  });

  it('empties a bucket before deleting it', async () => {
    const world = crowded();
    const { run, calls } = runner(world);
    await apply(run);
    const media = `/accounts/${GATE_ACCOUNT_ID}/r2/buckets/cairn-gate-${ID}-media`;
    const order = mutating(calls);
    expect(order.indexOf(`DELETE ${media}/objects/a.png`)).toBeLessThan(order.indexOf(`DELETE ${media}`));
    expect(order.indexOf(`DELETE ${media}/objects/b%2Fc.png`)).toBeLessThan(order.indexOf(`DELETE ${media}`));
  });

  it('skips targets already gone after a partial run and finishes the rest', async () => {
    const world = crowded();
    world.gone = [`cairn-gate-${ID}`, `cairn-gate-${ID}-auth`];
    const { run, lines } = runner(world);
    expect(await apply(run)).toBe(0);
    expect(lines).toContain(`gone  repository cairn-gate-${ID}`);
    expect(lines).toContain(`gone  worker cairn-gate-${ID}`);
    expect(lines).toContain(`deleted  bucket cairn-gate-${ID}-media`);
    expect(lines).toContain(`deleted  app cairn-cairn-gate-${ID}`);
  });

  it('keeps going past a failed target, then exits 1 naming it', async () => {
    const world = crowded();
    world.refuse = [`DELETE /accounts/${GATE_ACCOUNT_ID}/d1/database/u1`];
    const { run, lines } = runner(world);
    expect(await apply(run)).toBe(1);
    expect(lines.some((l) => l.startsWith('FAILED   database'))).toBe(true);
    expect(lines).toContain(`deleted  bucket cairn-gate-${ID}-media`);
  });

  it('never deletes a DNS record, and reports one left on the address', async () => {
    const world = emptyWorld();
    world.records = [{ type: 'A', name: 'www.carin-test.org', content: '192.0.2.1' }];
    const { run, calls, lines } = runner(world);
    expect(await apply(run)).toBe(1);
    expect(calls.some((c) => c.includes('dns_records') && c.startsWith('DELETE'))).toBe(false);
    expect(lines).toContain('RECORD   A www.carin-test.org -> 192.0.2.1');
  });

  it('leaves another run\'s lookalikes alone', async () => {
    const world = crowded();
    world.workers.push(`cairn-gate-${OTHER}-extra`);
    const { run, deletedApps } = runner(world);
    await apply(run);
    expect(world.workers).toContain(`cairn-gate-${OTHER}-extra`);
    expect(world.workers).toContain('cairn-gate-x');
    expect(world.repos.map((r) => r.name)).toEqual(['cairn-e2e-gate-0990rc3-a-030905', `x-cairn-gate-${ID}`]);
    expect(deletedApps).toEqual([`cairn-cairn-gate-${ID}`]);
  });
});

describe('--check-scopes', () => {
  it('removes probe leftovers, then creates and deletes only cairn-gate-probe resources', async () => {
    const world = crowded();
    world.workers.push('cairn-gate-probe-1600000000000');
    world.repos.push({ name: 'cairn-gate-probe-1600000000000', runs: [] });
    const { run, calls, lines } = runner(world);
    expect(await checkScopes(run)).toBe(0);
    expect(lines.at(-1)).toBe('scopes: every group works');
    const probeDeletes = mutating(calls).filter((c) => c.startsWith('DELETE'));
    expect(probeDeletes).toContain(`DELETE /accounts/${GATE_ACCOUNT_ID}/workers/scripts/cairn-gate-probe-1600000000000`);
    expect(probeDeletes).toContain(`DELETE /repos/${OWNER}/cairn-gate-probe-1600000000000`);
    expect(world.repos.map((r) => r.name)).not.toContain('cairn-gate-probe-1600000000000');
    expect(world.workers).toContain(`cairn-gate-${ID}`);
    expect(world.workers).not.toContain('cairn-gate-probe-1600000000000');
    // A run's own resources are untouched.
    expect(world.repos.map((r) => r.name)).toContain(`cairn-gate-${ID}`);
    expect(world.d1.map((d) => d.name)).toContain(`cairn-gate-${ID}-auth`);
    expect(Object.keys(world.r2)).toContain(`cairn-gate-${ID}-media`);
    expect(calls).toContain(`PUT /accounts/${GATE_ACCOUNT_ID}/workers/scripts/cairn-gate-probe-1700000000000`);
    expect(calls).toContain(`PUT /accounts/${GATE_ACCOUNT_ID}/workers/domains`);
    expect(calls).toContain('GET /user');
  });

  it('fails naming a family whose create answers 403, and never deletes what it did not create', async () => {
    const world = emptyWorld();
    world.refuse = [`POST /accounts/${GATE_ACCOUNT_ID}/d1/database`];
    const { run, calls, lines } = runner(world);
    expect(await checkScopes(run)).toBe(1);
    expect(lines.some((l) => l.startsWith('MISSING  D1:'))).toBe(true);
    expect(lines.at(-1)).toBe('scopes: missing D1');
    expect(calls.some((c) => c.startsWith('DELETE') && c.includes('/d1/'))).toBe(false);
  });

  it('names the Workers custom domain when no probe Worker could be made', async () => {
    const world = emptyWorld();
    world.refuse = [`PUT /accounts/${GATE_ACCOUNT_ID}/workers/scripts/`];
    const { run, lines } = runner(world);
    expect(await checkScopes(run)).toBe(1);
    expect(lines.at(-1)).toBe('scopes: missing Workers Scripts, Workers custom domain');
  });

  it('fails naming Workers Routes when only that read is refused', async () => {
    const world = emptyWorld();
    world.refuse = [`GET /zones/${ZONE}/workers/routes`];
    const { run, lines } = runner(world);
    expect(await checkScopes(run)).toBe(1);
    expect(lines.at(-1)).toBe('scopes: missing Workers Routes');
  });

  it('fails naming GitHub Apps when the settings page cannot list them', async () => {
    const world = emptyWorld();
    const { run, lines } = runner(world);
    run.listApps = async () => {
      throw new Error('The GitHub Apps page did not open');
    };
    expect(await checkScopes(run)).toBe(1);
    expect(lines.at(-1)).toBe('scopes: missing GitHub Apps');
  });

  it('never touches an App, a custom domain of another Worker, or a record', async () => {
    const world = crowded();
    const { run, calls, deletedApps } = runner(world);
    await checkScopes(run);
    expect(deletedApps).toEqual([]);
    expect(calls.filter((c) => c.includes('workers/domains/') && c.startsWith('DELETE'))).toEqual([`DELETE /accounts/${GATE_ACCOUNT_ID}/workers/domains/dom-probe`]);
    expect(calls.some((c) => c.startsWith('DELETE') && c.includes('dns_records'))).toBe(false);
  });
});
