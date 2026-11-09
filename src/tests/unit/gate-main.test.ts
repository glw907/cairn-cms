// The gate's command line: what it dispatches, what it refuses, and that the entry imports nothing
// from the retired leg runner.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main, type makeSession } from '../../../scripts/gate/gate.mjs';
import type { Clients } from '../../../scripts/gate/sweep.mjs';

type Deps = NonNullable<Parameters<typeof main>[2]>;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** A session with no browser behind it: it lists no Apps and closes cleanly. */
const closed: string[] = [];
const fakeSession = (() => ({
  getBrowser: async () => ({ github: { newPage: async () => ({}) } }),
  creds: { login: 'l', password: 'p', totp: () => '123456' },
  close: async () => void closed.push('closed'),
})) as unknown as typeof makeSession;

function harness() {
  const runDir = mkdtempSync(path.join(tmpdir(), 'gate-main-'));
  const env = { GATE_RUN_DIR: runDir, CF_WS_CAIRN_CLEANROOM_TOKEN: 'cf-value', GITHUB_TEST_TOKEN: 'gh-value' };
  const calls: string[] = [];
  const lines: string[] = [];
  const answer = (json: unknown) => ({ status: 200, json, headers: new Headers() });
  const clients: Clients = {
    accountId: 'acct',
    cf: async (method, route) => {
      calls.push(`${method} ${route.split('?')[0]}`);
      if (route.startsWith('/zones?name=')) return answer({ success: true, result: [{ id: 'z' }] });
      return answer({ success: true, result: route.includes('r2/buckets') ? { buckets: [] } : [] });
    },
    gh: async (method, route) => {
      calls.push(`${method} ${route.split('?')[0]}`);
      return answer([]);
    },
  };
  const deps: Partial<Deps> = { makeSession: fakeSession, makeClients: () => clients, browserApps: () => ({ listApps: async () => [], deleteApp: async () => 'absent' as const }), print: (line) => lines.push(line) };
  return { runDir, env, calls, lines, deps };
}

describe('main', () => {
  it('refuses to run outside run-gate.sh', async () => {
    expect(await main(['sweep'], {})).toBe(2);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('GATE_RUN_DIR');
  });

  it.each([[['sweep', '--bogus']], [['sweep', '--apply', '--check-scopes']], [['--leg', 'A1']], [['nonsense']], [[]]])('returns 2 with the usage for %j', async (argv) => {
    const { env, deps, calls } = harness();
    expect(await main(argv, env, deps)).toBe(2);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('Usage: run-gate.sh');
    expect(calls).toEqual([]);
  });

  it('refuses a sweep without the two tokens, before any call', async () => {
    const { runDir, deps, calls } = harness();
    expect(await main(['sweep'], { GATE_RUN_DIR: runDir }, deps)).toBe(2);
    expect(calls).toEqual([]);
  });

  it('runs a bare sweep as a dry run that reads and deletes nothing, logging to the run directory', async () => {
    const { runDir, env, deps, calls, lines } = harness();
    expect(await main(['sweep'], env, deps)).toBe(0);
    expect(calls.every((call) => call.startsWith('GET '))).toBe(true);
    expect(lines.at(-1)).toMatch(/^sweep: 0 target\(s\) to delete/);
    expect(readFileSync(path.join(runDir, 'sweep.log'), 'utf8')).toContain('sweep: 0 target(s) to delete');
    expect(closed.at(-1)).toBe('closed');
  });

  it('sends --apply to the apply path, which checks the token first', async () => {
    const { env, deps, calls } = harness();
    await main(['sweep', '--apply'], env, deps);
    expect(calls[0]).toBe('GET /accounts/acct/tokens/verify');
  });

  it('sends --check-scopes to the scope check', async () => {
    const { env, deps, lines } = harness();
    await main(['sweep', '--check-scopes'], env, deps);
    expect(lines.some((line) => line.startsWith('scopes:'))).toBe(true);
  });

  it('reports a failed sweep and exits 1', async () => {
    const { env, deps } = harness();
    const failing: Partial<Deps> = { ...deps, makeClients: () => ({ accountId: 'a', cf: async () => { throw new Error('network down'); }, gh: async () => { throw new Error('x'); } }) as Clients };
    expect(await main(['sweep'], env, failing)).toBe(1);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('network down');
  });
});

describe('the gate directory', () => {
  const dir = path.resolve('scripts/gate');

  it('holds no file of the retired leg runner', () => {
    for (const name of ['legs.mjs', 'driver.mjs', 'teardown.mjs', 'tail.mjs', 'xdg-open', 'cloudflare']) expect(existsSync(path.join(dir, name)), name).toBe(false);
  });

  it('imports nothing from a deleted file', () => {
    const deleted = /\.\/(legs|driver|teardown|tail)\.mjs|\.\/cloudflare\//;
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.mjs'))) {
      expect(readFileSync(path.join(dir, name), 'utf8'), name).not.toMatch(new RegExp(`from '(${deleted.source})`));
    }
  });
});
