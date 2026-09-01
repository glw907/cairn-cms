import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs, USAGE } from '../../lib/vite/assemble.js';

describe('parseArgs', () => {
  it('returns an empty object for no arguments', () => {
    expect(parseArgs([])).toEqual({});
  });

  it('parses --help as a bare boolean', () => {
    expect(parseArgs(['--help'])).toEqual({ help: true });
  });

  it('rejects an unknown argument, naming it and printing usage', () => {
    expect(() => parseArgs(['--verbose'])).toThrowError(/--verbose/);
    expect(() => parseArgs(['--verbose'])).toThrowError(/Usage: cairn-manifest/);
  });

  it('rejects a positional argument the same way', () => {
    expect(() => parseArgs(['bogus'])).toThrowError(/unknown argument bogus/);
  });
});

// The Plan 07 packaging lesson (proven in doctor-bin.test.ts): prove the emitted bin runs under
// plain Node from dist. Spawns only when the built bin exists and skips otherwise, so the unit
// suite passes without a prior `npm run package`.
const BIN = resolve(process.cwd(), 'dist/vite/bin.js');
const built = existsSync(BIN);

describe('packaged bin (needs dist/vite/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('prints usage and exits 0 on --help, without writing a manifest', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'cairn-manifest-help-'));
    const out = spawnSync(process.execPath, [BIN, '--help'], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain(USAGE);
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on an unknown flag', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'cairn-manifest-bogus-'));
    const out = spawnSync(process.execPath, [BIN, '--bogus'], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-manifest');
  });

  it.skipIf(!built)('exits 1 with the error on stderr, never a stack-only crash, when no Vite config is found', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'cairn-manifest-no-config-'));
    const out = spawnSync(process.execPath, [BIN], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(1);
    expect(out.stderr).toContain('cairn-manifest: no Vite config found');
  });
});
