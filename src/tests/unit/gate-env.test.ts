// What each child process of the gate sees, and the credential smoke against a local server that
// stands in for the Cloudflare and GitHub APIs. Nothing here reaches api.cloudflare.com.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildCliEnv, main, runSmoke, GATE_ACCOUNT_ID, type makeSession } from '../../../scripts/gate/gate.mjs';
import { runLeg } from '../../../scripts/gate/legs.mjs';
import { parseGateRows, recordLeg, recordPending } from '../../../scripts/gate/record.mjs';
import { runDriver } from '../../../scripts/gate/driver.mjs';

const GATE_TOKEN = 'cfut_GateTokenValueNeverPrinted0123456789';
const GITHUB_TOKEN = 'ghp_MachineTokenNeverPrinted0123456789';
const PARENT_ENV = {
  PATH: process.env.PATH,
  HOME: '/home/someone',
  CF_WS_CAIRN_GATE_TOKEN: GATE_TOKEN,
  GITHUB_TEST_LOGIN: 'gate-machine',
  GITHUB_TEST_PASSWORD: 'pw-never-printed',
  GITHUB_TEST_TOTP_SECRET: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  GITHUB_TEST_TOKEN: GITHUB_TOKEN,
  STALWART_PASSWORD_CAIRN_GATE: 'mail-never-printed',
  UNRELATED: 'leaks-if-inherited',
};

const dirs: string[] = [];
const servers: Server[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  for (const server of servers.splice(0)) server.close();
});

describe('buildCliEnv', () => {
  it('builds the CLI child environment from an allowlist: the shim first on PATH, the gate token as CLOUDFLARE_API_TOKEN, no GITHUB_TEST names', () => {
    const env = buildCliEnv({ runDir: '/run/x', parentEnv: PARENT_ENV });
    expect(env.PATH.startsWith(`${resolve('scripts/gate')}:`)).toBe(true);
    expect(env.CLOUDFLARE_API_TOKEN).toBe(GATE_TOKEN);
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBe(GATE_ACCOUNT_ID);
    expect(env.CAIRN_STATE_DIR).toBe('/run/x/state');
    expect(env.GATE_URL_LOG).toBe('/run/x/urls.log');
    expect(Object.keys(env).filter((name) => /^GITHUB_TEST_|STALWART|CF_WS|UNRELATED/.test(name))).toEqual([]);
  });

  it('refuses to build without the gate token', () => {
    expect(() => buildCliEnv({ runDir: '/run/x', parentEnv: { PATH: '/bin' } })).toThrow('CF_WS_CAIRN_GATE_TOKEN');
  });

  it('reaches a spawned CLI as exactly that environment', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-env-'));
    dirs.push(dir);
    const dump = join(dir, 'env.json');
    const result = await runDriver({
      command: process.execPath,
      args: ['-e', `require('fs').writeFileSync(${JSON.stringify(dump)}, JSON.stringify(process.env))`],
      env: { ...buildCliEnv({ runDir: dir, parentEnv: PARENT_ENV }) },
      table: [],
      settleMs: 30,
    });
    expect(result.code).toBe(0);
    const seen = JSON.parse(readFileSync(dump, 'utf8')) as Record<string, string>;
    expect(Object.keys(seen).filter((name) => name.startsWith('GITHUB_TEST_'))).toEqual([]);
    expect(seen.CLOUDFLARE_API_TOKEN).toBe(GATE_TOKEN);
    expect(seen.CLOUDFLARE_ACCOUNT_ID).toBe(GATE_ACCOUNT_ID);
    expect(seen.UNRELATED).toBeUndefined();
  });
});

describe('run-gate.sh environment', () => {
  /** Runs the script with a stub `node` that records the environment it was given. */
  function envSeen(parent: Record<string, string>) {
    const home = mkdtempSync(join(tmpdir(), 'gate-home-'));
    dirs.push(home);
    const bin = join(home, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'node'), '#!/bin/sh\nenv >> "$HOME/env-dump"\n', { mode: 0o755 });
    const script = resolve('scripts/gate/run-gate.sh');
    const result = spawnSync('bash', [script, '--stub-mode'], { env: { PATH: `${bin}:${process.env.PATH}`, HOME: home, ...parent }, encoding: 'utf8' });
    expect(result.status).toBe(0);
    return readFileSync(join(home, 'env-dump'), 'utf8');
  }

  it('carries the display and session-bus names to the gate when the parent sets them, and only those', () => {
    const dump = envSeen({ DISPLAY: ':7', WAYLAND_DISPLAY: 'wayland-9', XAUTHORITY: '/x/auth', XDG_RUNTIME_DIR: '/run/user/1', DBUS_SESSION_BUS_ADDRESS: 'unix:path=/bus', UNRELATED: 'leaks-if-inherited' });
    for (const line of ['DISPLAY=:7', 'WAYLAND_DISPLAY=wayland-9', 'XAUTHORITY=/x/auth', 'XDG_RUNTIME_DIR=/run/user/1', 'DBUS_SESSION_BUS_ADDRESS=unix:path=/bus']) {
      expect(dump.split('\n')).toContain(line);
    }
    expect(dump).not.toContain('UNRELATED');
  });

  it('hands --headed on to the gate', () => {
    const home = mkdtempSync(join(tmpdir(), 'gate-home-'));
    dirs.push(home);
    mkdirSync(join(home, 'bin'));
    writeFileSync(join(home, 'bin', 'node'), '#!/bin/sh\necho "$@" >> "$HOME/args-dump"\n', { mode: 0o755 });
    const result = spawnSync('bash', [resolve('scripts/gate/run-gate.sh'), '--all', '--version', '1.0.0', '--headed'], { env: { PATH: `${join(home, 'bin')}:${process.env.PATH}`, HOME: home }, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(readFileSync(join(home, 'args-dump'), 'utf8')).toMatch(/gate\.mjs --all --version 1\.0\.0 --headed$/m);
  });

  it('passes none of them when the parent sets none', () => {
    const dump = envSeen({});
    expect(dump).not.toMatch(/^(DISPLAY|WAYLAND_DISPLAY|XAUTHORITY|XDG_RUNTIME_DIR|DBUS_SESSION_BUS_ADDRESS)=/m);
  });
});

describe('run-gate.sh lock and exit file', () => {
  /** A copy of the script beside a stub gate.mjs that logs its argv and, given `hold`, sleeps with an orphan-able child. */
  function rig() {
    const home = mkdtempSync(join(tmpdir(), 'gate-lock-'));
    dirs.push(home);
    const bin = join(home, 'gate');
    mkdirSync(bin);
    copyFileSync(resolve('scripts/gate/run-gate.sh'), join(bin, 'run-gate.sh'));
    const log = join(home, 'starts.log');
    writeFileSync(
      join(bin, 'gate.mjs'),
      [
        "import { appendFileSync } from 'node:fs';",
        "import { spawn } from 'node:child_process';",
        `const args = process.argv.slice(2);`,
        `if (args.includes('--teardown-run')) { appendFileSync(${JSON.stringify(log)}, 'teardown\\n'); process.exit(0); }`,
        `appendFileSync(${JSON.stringify(log)}, 'start ' + args.join(' ') + ' pid=' + process.pid + '\\n');`,
        "if (args.includes('fail')) process.exit(3);",
        "if (args.includes('hold')) {",
        "  const orphan = spawn('sleep', ['60'], { detached: true, stdio: 'ignore' });",
        `  appendFileSync(${JSON.stringify(log)}, 'orphan pid=' + orphan.pid + '\\n');`,
        '  orphan.unref();',
        '  setTimeout(() => {}, 60000);',
        '}',
      ].join('\n'),
    );
    const start = (...args: string[]) => spawn('bash', [join(bin, 'run-gate.sh'), ...args], { env: { PATH: process.env.PATH, HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] });
    const run = (...args: string[]) => spawnSync('bash', [join(bin, 'run-gate.sh'), ...args], { env: { PATH: process.env.PATH, HOME: home }, encoding: 'utf8', timeout: 30_000 });
    const starts = () => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : []);
    return { home, start, run, starts };
  }

  /** Wait until the stub has started and, with `hold`, spawned its child. */
  async function until(check: () => boolean) {
    for (let i = 0; i < 200 && !check(); i++) await new Promise((r) => setTimeout(r, 50));
    expect(check()).toBe(true);
  }

  const stray: number[] = [];
  afterEach(() => {
    for (const pid of stray.splice(0)) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already gone.
      }
    }
  });

  it('prints the run dir first and writes the exit status after teardown', () => {
    const { run, home, starts } = rig();
    const result = run('fail');
    expect(result.status).toBe(3);
    const first = result.stdout.split('\n')[0];
    expect(first).toMatch(/^run dir: /);
    expect(readFileSync(join(first.slice('run dir: '.length), 'exit'), 'utf8').trim()).toBe('3');
    expect(first).toContain(home);
    expect(starts().at(-1)).toBe('teardown');
  });

  it('refuses while another run holds the lock, naming its pid and run dir, and starts nothing', async () => {
    const { start, run, starts, home } = rig();
    const first = start('hold');
    stray.push(first.pid!);
    let out = '';
    first.stdout.on('data', (chunk) => (out += chunk));
    await until(() => starts().some((line) => line.startsWith('orphan')));
    for (const line of starts()) if (line.includes('pid=')) stray.push(Number(line.split('pid=')[1]));
    const second = run('quick');
    expect(second.status).not.toBe(0);
    expect(second.stderr).toContain(String(first.pid));
    expect(second.stderr).toContain(out.split('\n')[0].slice('run dir: '.length));
    expect(second.stderr).toContain('is alive');
    expect(starts().filter((line) => line.startsWith('start'))).toHaveLength(1);
    expect(home).toBeTruthy();
  });

  it('frees the lock at once when the run is killed while its child lives on', async () => {
    const { start, run, starts } = rig();
    const first = start('hold');
    await until(() => starts().some((line) => line.startsWith('orphan')));
    for (const line of starts()) if (line.includes('pid=')) stray.push(Number(line.split('pid=')[1]));
    process.kill(first.pid!, 'SIGKILL');
    await new Promise((resolveWait) => first.once('exit', resolveWait));
    const third = run('quick');
    expect(third.status).toBe(0);
    expect(starts().filter((line) => line.startsWith('start'))).toHaveLength(2);
  });
});

describe('main under --cli', () => {
  const VERSION = '0.99.0-rc.3';
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const fakeSession = (() => ({
    getBrowser: async () => ({ newAdminContext: async () => ({}) }),
    creds: {},
    teardownDeps: {},
    close: async () => {},
  })) as unknown as typeof makeSession;

  function setup() {
    const root = mkdtempSync(join(tmpdir(), 'gate-cli-'));
    dirs.push(root);
    const runDir = join(root, 'runs', 'run-7');
    const env = { GATE_RUN_DIR: runDir, CF_WS_CAIRN_GATE_TOKEN: 'token' };
    const ghCalls: string[][] = [];
    const gh = async (args: string[]) => {
      ghCalls.push(args);
      return { code: 1, stdout: '' };
    };
    const events: string[] = [];
    const deps: Partial<NonNullable<Parameters<typeof main>[2]>> = {
      makeSession: fakeSession,
      teardownRun: async () => [],
      teardownStale: async () => {
        events.push('stale');
        return [];
      },
      recordPending: (input) => recordPending({ ...input, gh }),
      recordLeg: (input) => recordLeg({ ...input, gh }),
    };
    return { root, runDir, env, ghCalls, events, deps };
  }

  it('hands npx file:<tgz> to the driver and writes every row to the record file with no gh call', async () => {
    const { root, env, ghCalls, deps } = setup();
    const file = join(root, 'record.md');
    const tgz = join(root, 'x.tgz');
    const argsSeen: string[][] = [];
    let atA1: string[] = [];
    const code = await main(['--all', '--cli', tgz, '--record-file', file, '--version', VERSION], env, {
      ...deps,
      runLeg: async (ctx, legDeps) => {
        if (ctx.leg !== 'A1') return { pass: true, failures: [] };
        atA1 = parseGateRows(readFileSync(file, 'utf8')).map((r) => `${r.leg}:${r.verdict}`);
        return runLeg(ctx, legDeps);
      },
      legDeps: {
        runDriver: (async (o: { args: string[] }) => {
          argsSeen.push(o.args);
          return { code: 1, screen: '' };
        }) as unknown as NonNullable<NonNullable<Parameters<typeof main>[2]>['legDeps']>['runDriver'],
      },
    });
    expect(code).toBe(1);
    expect(atA1).toEqual(['A1:pending', 'A2:pending', 'B1:pending', 'B2:pending']);
    expect(argsSeen[0].slice(0, 3)).toEqual(['--yes', `file:${tgz}`, '--dir']);
    const rows = parseGateRows(readFileSync(file, 'utf8'));
    expect(rows.find((r) => r.leg === 'A1')?.verdict).toMatch(/^fail: the CLI run failed/);
    expect(rows.find((r) => r.leg === 'A2')?.verdict).toBe('skipped: needs A1');
    expect(ghCalls).toEqual([]);
  });

  it.each([
    ['a relative tgz', ['--cli', 'x.tgz', '--record-file', '/abs/r.md']],
    ['no record file', ['--cli', '/abs/x.tgz']],
    ['a record file without --cli', ['--record-file', '/abs/r.md']],
  ])('returns 2 with the usage for %s', async (_name, extra) => {
    const { env, deps, ghCalls } = setup();
    expect(await main(['--leg', 'A1', '--version', VERSION, ...extra], env, deps)).toBe(2);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('Usage: run-gate.sh');
    expect(ghCalls).toEqual([]);
  });

  it('returns 2 before any leg when the record file has no parent directory', async () => {
    const { root, env, deps } = setup();
    let ran = 0;
    const code = await main(['--leg', 'A1', '--cli', '/abs/x.tgz', '--record-file', join(root, 'missing', 'r.md'), '--version', VERSION], env, {
      ...deps,
      runLeg: async () => {
        ran += 1;
        return { pass: true, failures: [] };
      },
    });
    expect(code).toBe(2);
    expect(ran).toBe(0);
  });

  it('tears down other runs before the first leg of a --leg run', async () => {
    const { env, events, deps } = setup();
    await main(['--leg', 'A1', '--version', VERSION], env, {
      ...deps,
      recordPending: async () => {},
      runLeg: async () => {
        events.push('leg');
        return { pass: true, failures: [] };
      },
    });
    expect(events).toEqual(['stale', 'leg']);
  });
});

/** A local stand-in for the two APIs; `refuse` lists routes (method path) that answer 403. */
async function fakeApis(refuse: string[] = []) {
  const requests: string[] = [];
  const ok = (result: unknown, extra: object = {}) => JSON.stringify({ success: true, errors: [], result, ...extra });
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://x');
    const key = `${request.method} ${pathname}`;
    requests.push(key);
    const reply = (status: number, body: string, headers: Record<string, string> = {}) => {
      response.writeHead(status, { 'content-type': 'application/json', ...headers });
      response.end(body);
    };
    if (refuse.includes(key)) return reply(403, JSON.stringify({ success: false, errors: [{ code: 9109, message: 'Unauthorized' }] }));
    const acct = `/v4/accounts/${GATE_ACCOUNT_ID}`;
    const page = { result_info: { total_pages: 1, total_count: 1 } };
    if (key === 'GET /gh/user') return reply(200, JSON.stringify({ login: 'gate-machine' }), { 'x-oauth-scopes': 'repo, delete_repo' });
    if (key === 'GET /v4/user/tokens/verify' || key === `GET ${acct}/tokens/verify`) return reply(200, ok({ id: 'tid', status: 'active' }));
    if (key === 'GET /v4/zones') return reply(200, ok([{ id: 'zone1', status: 'active' }], page));
    if (key === `GET ${acct}/builds/tokens`) return reply(200, ok([], { result_info: { total_pages: 1, total_count: 0 } }));
    if (key === 'GET /v4/zones/zone1/email/sending/subdomains') return reply(200, ok([{ name: 'x' }], page));
    if (key === `POST ${acct}/d1/database`) return reply(200, ok({ uuid: 'd1-id' }));
    if (key === `DELETE ${acct}/d1/database/d1-id`) return reply(200, ok(null));
    if (key === `POST ${acct}/r2/buckets`) return reply(200, ok({ name: 'b' }));
    if (key.startsWith(`DELETE ${acct}/r2/buckets/cairn-e2e-gate-probe-`)) return reply(200, ok(null));
    if (key === `POST ${acct}/builds/tokens`) return reply(200, ok({ build_token_uuid: 'bt-id' }));
    if (key === `DELETE ${acct}/builds/tokens/bt-id`) return reply(200, ok(null));
    return reply(404, JSON.stringify({ success: false, errors: [{ code: 7003, message: 'no route' }] }));
  });
  servers.push(server);
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { requests, apiBase: `${origin}/v4`, githubBase: `${origin}/gh` };
}

const WRANGLER_OUT = {
  whoami: 'You are logged in with an API Token.',
  json: JSON.stringify({ loggedIn: true, accounts: [{ id: GATE_ACCOUNT_ID, name: 'acct' }] }),
};

async function smoke(parentEnv: Record<string, string | undefined>, refuse: string[] = []) {
  const apis = await fakeApis(refuse);
  const lines: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), 'gate-smoke-'));
  dirs.push(dir);
  const ok = await runSmoke({
    env: { ...parentEnv, GATE_RUN_DIR: dir },
    runDir: dir,
    deps: {
      apiBase: apis.apiBase,
      githubBase: apis.githubBase,
      runWrangler: async (args) => (args.includes('--json') ? WRANGLER_OUT.json : WRANGLER_OUT.whoami),
      print: (line: string) => lines.push(line),
      now: () => 1700000000000,
    },
  });
  return { ok, lines, requests: apis.requests };
}

describe('runSmoke', () => {
  it('passes every check, deletes each throwaway by the id its create returned, and prints no secret', async () => {
    const { ok, lines, requests } = await smoke(PARENT_ENV);
    expect(lines.filter((line) => line.startsWith('FAIL'))).toEqual([]);
    expect(ok).toBe(true);
    expect(lines[0]).toMatch(/^host \S+/);
    expect(lines.filter((line) => line.startsWith('ok'))).toHaveLength(11);
    for (const secret of [GATE_TOKEN, GITHUB_TOKEN, 'pw-never-printed', PARENT_ENV.GITHUB_TEST_TOTP_SECRET]) {
      expect(lines.join('\n')).not.toContain(secret);
    }
    const acct = `/v4/accounts/${GATE_ACCOUNT_ID}`;
    expect(requests).toContain(`DELETE ${acct}/d1/database/d1-id`);
    expect(requests).toContain(`DELETE ${acct}/builds/tokens/bt-id`);
    expect(requests.filter((key) => key.startsWith(`DELETE ${acct}/r2/buckets/cairn-e2e-gate-probe-1700000000000`))).toHaveLength(1);
  });

  it('records a refused verify route as a FAIL, keeps going, and returns false', async () => {
    const { ok, lines } = await smoke(PARENT_ENV, ['GET /v4/user/tokens/verify']);
    expect(ok).toBe(false);
    expect(lines.find((line) => line.startsWith('FAIL'))).toContain('/user/tokens/verify answered 403');
    expect(lines.some((line) => line.startsWith('ok') && line.includes('D1 write probe'))).toBe(true);
    // Without a token id the build token probe cannot run, and says so.
    expect(lines.some((line) => line.startsWith('FAIL') && line.includes('build token registration'))).toBe(true);
  });

  it('reports a refused account verify route as info and still returns true', async () => {
    const acct = `GET /v4/accounts/${GATE_ACCOUNT_ID}/tokens/verify`;
    const { ok, lines } = await smoke(PARENT_ENV, [acct]);
    expect(ok).toBe(true);
    expect(lines.some((line) => line.startsWith('FAIL'))).toBe(false);
    expect(lines.find((line) => line.includes('/accounts/<id>/tokens/verify'))).toMatch(/^info .*answered 403/);
  });

  it('skips the GitHub account check when the machine token is not in the store', async () => {
    const { GITHUB_TEST_TOKEN: _omitted, ...withoutToken } = PARENT_ENV;
    const { ok, lines } = await smoke(withoutToken);
    expect(ok).toBe(true);
    expect(lines.find((line) => line.includes('machine account GET /user'))).toMatch(/^skipped/);
  });
});
