import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs, USAGE } from '../../../lib/guidance/bin.js';

describe('parseArgs', () => {
  it('parses install with no flags', () => {
    expect(parseArgs(['install'])).toEqual({ command: 'install', strict: false, help: false });
  });

  it('parses check with no flags', () => {
    expect(parseArgs(['check'])).toEqual({ command: 'check', strict: false, help: false });
  });

  it('parses check --strict', () => {
    expect(parseArgs(['check', '--strict'])).toEqual({ command: 'check', strict: true, help: false });
  });

  it('rejects install --strict, naming that it applies only to check', () => {
    expect(() => parseArgs(['install', '--strict'])).toThrowError(/applies only to check/);
  });

  it('rejects an unknown command, printing usage', () => {
    expect(() => parseArgs(['bogus'])).toThrowError(/unknown command/);
    expect(() => parseArgs(['bogus'])).toThrowError(/Usage: cairn-guidance/);
  });

  it('rejects no command at all', () => {
    expect(() => parseArgs([])).toThrowError(/unknown command/);
  });

  it('rejects an unknown flag, printing usage', () => {
    expect(() => parseArgs(['check', '--bogus'])).toThrowError(/unknown flag '--bogus'/);
    expect(() => parseArgs(['check', '--bogus'])).toThrowError(/Usage: cairn-guidance/);
  });

  it('treats --help anywhere as help, before any command validation', () => {
    expect(parseArgs(['--help'])).toEqual({ command: 'check', strict: false, help: true });
    expect(parseArgs(['bogus', '--help'])).toEqual({ command: 'check', strict: false, help: true });
  });
});

describe('USAGE', () => {
  it('names both commands and --strict', () => {
    expect(USAGE).toContain('install');
    expect(USAGE).toContain('check');
    expect(USAGE).toContain('--strict');
  });
});

// The Plan 07 packaging lesson: prove the emitted bin runs under plain Node from dist. The unit
// suite must pass without a prior `npm run package`, so this spawns only when the built bin
// exists (via skipIf), the same convention doctor-bin.test.ts:193-196 established.
const BIN = resolve(process.cwd(), 'dist/guidance/bin.js');
const built = existsSync(BIN);

describe('packaged bin (needs dist/guidance/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('prints usage and exits 0 on --help, running no command', () => {
    const out = spawnSync(process.execPath, [BIN, '--help'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Usage: cairn-guidance');
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on an unknown command', () => {
    const out = spawnSync(process.execPath, [BIN, 'bogus'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-guidance');
  });

  it.skipIf(!built)('check reports a missing tree and exits 0 without --strict', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-guidance-check-'));
    try {
      const out = spawnSync(process.execPath, [BIN, 'check'], {
        cwd: dir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
      expect(out.status).toBe(0);
      expect(out.stdout.toLowerCase()).toContain('not installed');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!built)('check --strict exits 1 on a missing tree', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-guidance-strict-'));
    try {
      const out = spawnSync(process.execPath, [BIN, 'check', '--strict'], {
        cwd: dir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
      expect(out.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!built)('install writes the guidance tree, and a second install reports it unchanged', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-guidance-install-'));
    try {
      const first = spawnSync(process.execPath, [BIN, 'install'], {
        cwd: dir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
      expect(first.status).toBe(0);
      expect(existsSync(join(dir, '.claude/cairn/MANIFEST'))).toBe(true);
      expect(existsSync(join(dir, '.claude/skills/cairn-admin-screens/SKILL.md'))).toBe(true);

      const second = spawnSync(process.execPath, [BIN, 'check', '--strict'], {
        cwd: dir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
      expect(second.status).toBe(0);
      expect(second.stdout.toLowerCase()).toContain('matches the installed package');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
