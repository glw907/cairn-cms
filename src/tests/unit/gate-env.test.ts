// What each child process of the gate sees, and the credential smoke against a local server that
// stands in for the Cloudflare and GitHub APIs. Nothing here reaches api.cloudflare.com.
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildCliEnv, runSmoke, GATE_ACCOUNT_ID } from '../../../scripts/gate/gate.mjs';
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

  it('passes none of them when the parent sets none', () => {
    const dump = envSeen({});
    expect(dump).not.toMatch(/^(DISPLAY|WAYLAND_DISPLAY|XAUTHORITY|XDG_RUNTIME_DIR|DBUS_SESSION_BUS_ADDRESS)=/m);
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
    expect(lines.filter((line) => line.startsWith('ok'))).toHaveLength(12);
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

  it('skips the GitHub account check when the machine token is not in the store', async () => {
    const { GITHUB_TEST_TOKEN: _omitted, ...withoutToken } = PARENT_ENV;
    const { ok, lines } = await smoke(withoutToken);
    expect(ok).toBe(true);
    expect(lines.find((line) => line.includes('machine account GET /user'))).toMatch(/^skipped/);
  });
});
