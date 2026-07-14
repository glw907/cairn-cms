import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs, contextFromEnv, defaultChecks } from '../../lib/doctor/index.js';

describe('parseArgs', () => {
  it('returns an empty object for no arguments', () => {
    expect(parseArgs([])).toEqual({});
  });

  it('parses --from', () => {
    expect(parseArgs(['--from', 'cairn@example.com'])).toEqual({ from: 'cairn@example.com' });
  });

  it('parses --repo', () => {
    expect(parseArgs(['--repo', 'glw907/ecxc-ski'])).toEqual({ repo: 'glw907/ecxc-ski' });
  });

  it('parses --send-test', () => {
    expect(parseArgs(['--send-test', 'me@example.com'])).toEqual({ sendTest: 'me@example.com' });
  });

  it('parses all three flags together', () => {
    expect(
      parseArgs(['--from', 'a@b.c', '--repo', 'o/r', '--send-test', 'd@e.f'])
    ).toEqual({ from: 'a@b.c', repo: 'o/r', sendTest: 'd@e.f' });
  });

  it('parses a valued --probe', () => {
    expect(parseArgs(['--probe', 'https://site.example'])).toEqual({
      probe: 'https://site.example',
    });
  });

  it('parses a bare --probe as true, the PUBLIC_ORIGIN default', () => {
    expect(parseArgs(['--probe'])).toEqual({ probe: true });
  });

  it('treats --probe followed by another flag as bare', () => {
    expect(parseArgs(['--probe', '--from', 'a@b.c'])).toEqual({ probe: true, from: 'a@b.c' });
  });

  it('rejects a flag with a missing value, naming the flag and printing usage', () => {
    expect(() => parseArgs(['--from'])).toThrowError(/--from/);
    expect(() => parseArgs(['--from'])).toThrowError(/Usage: cairn-doctor/);
  });

  it('rejects an unknown flag, naming it and printing usage', () => {
    expect(() => parseArgs(['--verbose'])).toThrowError(/--verbose/);
    expect(() => parseArgs(['--verbose'])).toThrowError(/Usage: cairn-doctor/);
  });
});

describe('contextFromEnv', () => {
  const EMPTY: Record<string, string | undefined> = {};

  it('maps the four plain env variables and carries cwd', () => {
    const ctx = contextFromEnv(
      {
        CAIRN_FROM: 'env@example.com',
        GITHUB_REPO: 'env/repo',
        CLOUDFLARE_API_TOKEN: 'tok',
        CLOUDFLARE_ACCOUNT_ID: 'acct',
      },
      {},
      '/srv/site'
    );
    expect(ctx.cwd).toBe('/srv/site');
    expect(ctx.from).toBe('env@example.com');
    expect(ctx.repo).toBe('env/repo');
    expect(ctx.cfToken).toBe('tok');
    expect(ctx.cfAccountId).toBe('acct');
  });

  it('carries PUBLIC_ORIGIN for the public-origin check', () => {
    const ctx = contextFromEnv({ PUBLIC_ORIGIN: 'https://example.com' }, {}, '/srv/site');
    expect(ctx.publicOrigin).toBe('https://example.com');
  });

  it('lets the flag beat the env for from and repo', () => {
    const ctx = contextFromEnv(
      { CAIRN_FROM: 'env@example.com', GITHUB_REPO: 'env/repo' },
      { from: 'flag@example.com', repo: 'flag/repo' },
      '/srv/site'
    );
    expect(ctx.from).toBe('flag@example.com');
    expect(ctx.repo).toBe('flag/repo');
  });

  it('leaves absent fields undefined', () => {
    const ctx = contextFromEnv(EMPTY, {}, '/srv/site');
    expect(ctx.from).toBeUndefined();
    expect(ctx.repo).toBeUndefined();
    expect(ctx.cfToken).toBeUndefined();
    expect(ctx.cfAccountId).toBeUndefined();
    expect(ctx.github).toBeUndefined();
    expect(ctx.publicOrigin).toBeUndefined();
  });

  it('assembles github only when the whole trio is present', () => {
    const trio = {
      GITHUB_APP_ID: '3847496',
      GITHUB_APP_INSTALLATION_ID: '135372268',
      GITHUB_APP_PRIVATE_KEY_B64: 'a2V5',
    };
    expect(contextFromEnv(trio, {}, '/srv/site').github).toEqual({
      appId: '3847496',
      installationId: '135372268',
      privateKeyB64: 'a2V5',
    });
    for (const dropped of Object.keys(trio)) {
      const partial = { ...trio, [dropped]: undefined };
      expect(contextFromEnv(partial, {}, '/srv/site').github).toBeUndefined();
    }
  });
});

describe('defaultChecks', () => {
  it('returns the sixteen checks in registry order', () => {
    expect(defaultChecks().map((c) => c.id)).toEqual([
      'config.bindings',
      'config.media-bucket',
      'config.observability',
      'config.csrf-disable',
      'config.site-config',
      'config.public-origin',
      'config.tidy-key',
      'admin.mount-shape',
      'config.dependency-floors',
      'email.sender-onboarded',
      'edge.https-forced',
      'edge.hsts',
      'auth.store',
      'auth.role-vocabulary',
      'auth.email-normalization',
      'github.app',
    ]);
  });

  it('never carries the live-send check', () => {
    expect(defaultChecks().some((c) => c.id === 'email.live-send')).toBe(false);
  });

  it('never carries the login-probe check', () => {
    expect(defaultChecks().some((c) => c.id === 'admin.login-probe')).toBe(false);
  });

  it('returns a fresh array, so the bin appending live-send mutates nothing shared', () => {
    const first = defaultChecks();
    first.push({ id: 'x', conditionId: 'x', title: 'x', run: async () => ({ status: 'pass', detail: '' }) });
    expect(defaultChecks()).toHaveLength(16);
  });
});

// The Plan 07 packaging lesson: prove the emitted bin runs under plain Node from dist. The
// unit suite must pass without a prior `npm run package`, so this spawns only when the built
// bin exists and skips (via skipIf) otherwise.
const BIN = resolve(process.cwd(), 'dist/doctor/bin.js');
const built = existsSync(BIN);

describe('packaged bin (needs dist/doctor/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('reports skips and exits cleanly from a bare dir with an empty env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-doctor-'));
    const out = spawnSync(process.execPath, [BIN], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).not.toBeNull();
    expect([0, 1]).toContain(out.status);
    expect(out.stdout).toContain('SKIP');
    expect(out.stdout).toMatch(/\d+ passed, \d+ failed, \d+ skipped/);
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on an unknown flag', () => {
    const out = spawnSync(process.execPath, [BIN, '--bogus'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-doctor');
  });
});
