// What run-gate.sh hands the gate, its lock and exit file, and the credential smoke against a local
// server that stands in for the Cloudflare, GitHub, and JMAP APIs. Nothing here leaves the machine.
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { GATE_ACCOUNT_ID, runSmoke, shapeOf } from '../../../scripts/gate/gate.mjs';

const CLEANROOM_TOKEN = 'cfut_CleanroomTokenValueNeverPrinted0123456789';
const GITHUB_TOKEN = 'ghp_MachineTokenNeverPrinted0123456789';
const MAIL_PASSWORD = 'mail-never-printed';
const PARENT_ENV = {
  CF_WS_CAIRN_CLEANROOM_TOKEN: CLEANROOM_TOKEN,
  GITHUB_TEST_LOGIN: 'gate-machine',
  GITHUB_TEST_PASSWORD: 'pw-never-printed',
  GITHUB_TEST_TOTP_SECRET: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  GITHUB_TEST_TOKEN: GITHUB_TOKEN,
  STALWART_PASSWORD_CAIRN_GATE: MAIL_PASSWORD,
};

const dirs: string[] = [];
const servers: Server[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  for (const server of servers.splice(0)) server.close();
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

  it('passes the cleanroom token through by name, and no other Cloudflare name', () => {
    const dump = envSeen({
      CF_WS_CAIRN_CLEANROOM_TOKEN: 'cleanroom-value',
      CF_WS_CAIRN_GATE_TOKEN: 'old-gate-value',
      CF_CI_CAIRN_BUILD_TOKEN: 'old-build-value',
      CF_CI_OTHER: 'not-allowed',
    });
    expect(dump.split('\n')).toContain('CF_WS_CAIRN_CLEANROOM_TOKEN=cleanroom-value');
    expect(dump).not.toContain('old-gate-value');
    expect(dump).not.toContain('old-build-value');
    expect(dump).not.toContain('CF_CI_OTHER');
  });

  it('passes the machine account and mailbox names through', () => {
    const dump = envSeen({ GITHUB_TEST_TOKEN: 'gh-value', STALWART_PASSWORD_CAIRN_GATE: 'mail-value' });
    expect(dump.split('\n')).toContain('GITHUB_TEST_TOKEN=gh-value');
    expect(dump.split('\n')).toContain('STALWART_PASSWORD_CAIRN_GATE=mail-value');
  });

  it('hands sweep and its flags on to the gate', () => {
    const home = mkdtempSync(join(tmpdir(), 'gate-home-'));
    dirs.push(home);
    mkdirSync(join(home, 'bin'));
    writeFileSync(join(home, 'bin', 'node'), '#!/bin/sh\necho "$@" >> "$HOME/args-dump"\n', { mode: 0o755 });
    const result = spawnSync('bash', [resolve('scripts/gate/run-gate.sh'), 'sweep', '--check-scopes', '--headed'], { env: { PATH: `${join(home, 'bin')}:${process.env.PATH}`, HOME: home }, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(readFileSync(join(home, 'args-dump'), 'utf8')).toMatch(/gate\.mjs sweep --check-scopes --headed$/m);
  });

  it('passes none of the display names when the parent sets none', () => {
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

  it('prints the run dir first and writes the exit status last', () => {
    const { run, home } = rig();
    const result = run('fail');
    expect(result.status).toBe(3);
    const first = result.stdout.split('\n')[0];
    expect(first).toMatch(/^run dir: /);
    expect(readFileSync(join(first.slice('run dir: '.length), 'exit'), 'utf8').trim()).toBe('3');
    expect(first).toContain(home);
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

describe('shapeOf', () => {
  it('keeps keys and types and drops every value', () => {
    const shape = shapeOf({ success: true, result: [{ id: 'abc', n: 3, none: null }], result_info: { total: 9 }, empty: [] });
    expect(shape).toEqual({ success: 'boolean', result: [{ id: 'string', n: 'number', none: 'null' }], result_info: { total: 'number' }, empty: ['empty'] });
    expect(JSON.stringify(shape)).not.toContain('abc');
  });
});

/** A local stand-in for the three APIs; `refuse` lists routes (method path) that answer 403. */
async function fakeApis(refuse: string[] = [], jmap: 'ok' | 'error' = 'ok') {
  const requests: string[] = [];
  const ok = (result: unknown, extra: object = {}) => JSON.stringify({ success: true, errors: [], result, ...extra });
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://x');
    const key = `${request.method} ${pathname}`;
    requests.push(key);
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    let body = '';
    request.on('data', (chunk) => (body += String(chunk)));
    request.on('end', () => {
      const reply = (status: number, text: string, headers: Record<string, string> = {}) => {
        response.writeHead(status, { 'content-type': 'application/json', ...headers });
        response.end(text);
      };
      if (refuse.includes(key)) return reply(403, JSON.stringify({ success: false, errors: [{ code: 9109, message: 'Unauthorized' }] }));
      const acct = `/v4/accounts/${GATE_ACCOUNT_ID}`;
      if (key === 'GET /gh/user') return reply(200, JSON.stringify({ login: 'gate-machine', id: 5 }), { 'x-oauth-scopes': 'repo, delete_repo' });
      if (key === `GET ${acct}/tokens/verify`) return reply(200, ok({ id: 'tid', status: 'active' }));
      if (key === 'GET /v4/zones') return reply(200, ok([{ id: 'zone1', status: 'active' }]));
      if (key === `GET ${acct}/workers/scripts`) return reply(200, ok([{ id: 'w', etag: 'x' }]));
      if (key === `GET ${acct}/d1/database`) return reply(200, ok([{ uuid: 'u', name: 'n' }]));
      if (key === `GET ${acct}/r2/buckets`) return reply(200, ok({ buckets: [{ name: 'b' }] }));
      if (key === `GET ${acct}`) return reply(200, ok({ id: GATE_ACCOUNT_ID, name: 'acct' }));
      if (key === 'GET /v4/zones/zone1') return reply(200, ok({ id: 'zone1' }));
      if (key === 'GET /v4/zones/zone1/dns_records') return reply(200, ok([{ id: 'r', type: 'TXT' }]));
      if (key === 'GET /v4/zones/zone1/email/sending/subdomains') return reply(200, ok([{ name: 'x' }]));
      if (key === 'GET /v4/zones/zone1/workers/routes') return reply(200, ok([]));
      if (key === 'GET /jmap/session') return reply(200, JSON.stringify({ apiUrl: `${origin}/jmap/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
      if (key === 'POST /jmap/api') {
        expect(body).toContain('Email/query');
        return reply(200, JSON.stringify({ methodResponses: jmap === 'ok' ? [['Email/query', { ids: [] }, 'q']] : [['error', { type: 'serverFail' }, 'q']] }));
      }
      return reply(404, JSON.stringify({ success: false, errors: [{ code: 7003, message: 'no route' }] }));
    });
  });
  servers.push(server);
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { requests, apiBase: `${origin}/v4`, githubBase: `${origin}/gh`, sessionUrl: `${origin}/jmap/session` };
}

async function smoke(parentEnv: Record<string, string | undefined>, refuse: string[] = [], jmap: 'ok' | 'error' = 'ok') {
  const apis = await fakeApis(refuse, jmap);
  const lines: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), 'gate-smoke-'));
  dirs.push(dir);
  const shapesFile = join(dir, 'shapes.json');
  const ok = await runSmoke({
    env: { ...parentEnv, GATE_RUN_DIR: dir },
    deps: { apiBase: apis.apiBase, githubBase: apis.githubBase, sessionUrl: apis.sessionUrl, shapesFile, print: (line: string) => lines.push(line) },
  });
  return { ok, lines, requests: apis.requests, shapesFile };
}

describe('runSmoke', () => {
  it('passes every check, only reads, and prints no secret', async () => {
    const { ok, lines, requests } = await smoke(PARENT_ENV);
    expect(lines.filter((line) => line.startsWith('FAIL'))).toEqual([]);
    expect(ok).toBe(true);
    expect(lines[0]).toMatch(/^host \S+/);
    expect(lines.filter((line) => line.startsWith('ok'))).toHaveLength(14);
    for (const secret of [CLEANROOM_TOKEN, GITHUB_TOKEN, MAIL_PASSWORD, 'pw-never-printed', PARENT_ENV.GITHUB_TEST_TOTP_SECRET]) {
      expect(lines.join('\n')).not.toContain(secret);
    }
    expect(requests.filter((key) => !key.startsWith('GET ') && key !== 'POST /jmap/api')).toEqual([]);
  });

  it('checks the token at the account verify route and reads one endpoint per permission group', async () => {
    const { lines } = await smoke(PARENT_ENV);
    expect(lines.some((l) => l.startsWith('ok') && l.includes('/accounts/<id>/tokens/verify'))).toBe(true);
    for (const group of ['Workers Scripts', 'D1', 'Workers R2 Storage', 'Account Settings', 'Zone', 'DNS', 'Email Sending', 'Workers Routes']) {
      expect(lines.some((l) => l.startsWith('ok') && l.includes(`permission group ${group}`)), group).toBe(true);
    }
  });

  it('names a permission group whose read is refused, keeps going, and fails', async () => {
    const { ok, lines } = await smoke(PARENT_ENV, ['GET /v4/zones/zone1/workers/routes']);
    expect(ok).toBe(false);
    const failure = lines.filter((line) => line.startsWith('FAIL'));
    expect(failure).toHaveLength(1);
    expect(failure[0]).toContain('permission group Workers Routes');
    expect(failure[0]).toContain('403');
    expect(lines.some((line) => line.startsWith('ok') && line.includes('mailbox'))).toBe(true);
  });

  it('fails when the token verify route is refused', async () => {
    const { ok, lines } = await smoke(PARENT_ENV, [`GET /v4/accounts/${GATE_ACCOUNT_ID}/tokens/verify`]);
    expect(ok).toBe(false);
    expect(lines.find((line) => line.startsWith('FAIL'))).toContain('tokens/verify answered 403');
  });

  it('fails when the cleanroom token is not in the environment', async () => {
    const { CF_WS_CAIRN_CLEANROOM_TOKEN: _omitted, ...without } = PARENT_ENV;
    const { ok, lines } = await smoke(without);
    expect(ok).toBe(false);
    expect(lines.find((line) => line.startsWith('FAIL'))).toContain('CF_WS_CAIRN_CLEANROOM_TOKEN');
  });

  it('fails the mailbox check on a JMAP method error', async () => {
    const { ok, lines } = await smoke(PARENT_ENV, [], 'error');
    expect(ok).toBe(false);
    expect(lines.find((line) => line.startsWith('FAIL'))).toMatch(/mailbox over JMAP: the JMAP read failed: serverFail/);
  });

  it('fails the machine account check when the token is absent', async () => {
    const { GITHUB_TEST_TOKEN: _omitted, ...without } = PARENT_ENV;
    const { ok, lines } = await smoke(without);
    expect(ok).toBe(false);
    expect(lines.find((line) => line.includes('machine account GET /user'))).toMatch(/^FAIL/);
  });

  it('writes the reply shapes with keys and types and no value', async () => {
    const { shapesFile } = await smoke(PARENT_ENV);
    const text = readFileSync(shapesFile, 'utf8');
    const shapes = JSON.parse(text);
    expect(shapes['Workers Scripts']).toEqual({ success: 'boolean', errors: ['empty'], result: [{ id: 'string', etag: 'string' }] });
    expect(shapes.githubUser).toEqual({ login: 'string', id: 'number' });
    for (const value of ['acct', 'gate-machine', 'zone1', GATE_ACCOUNT_ID]) expect(text).not.toContain(value);
  });
});
