// The xdg-open stand-in: it records the URL it is asked to open and opens nothing. It runs here
// only against a log file in a temp directory.
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SHIM = resolve('scripts/gate/xdg-open');

describe('scripts/gate/xdg-open', () => {
  it('is executable', () => {
    expect(statSync(SHIM).mode & 0o111).not.toBe(0);
  });

  it('appends its URL argument to the log and exits 0', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-shim-'));
    try {
      const log = join(dir, 'urls.log');
      const env = { PATH: process.env.PATH ?? '', GATE_URL_LOG: log };
      execFileSync(SHIM, ['http://127.0.0.1:5000/manifest'], { env });
      execFileSync(SHIM, ['https://site.example.workers.dev/admin/confirm?token=abc'], { env });
      expect(readFileSync(log, 'utf8')).toBe(
        'http://127.0.0.1:5000/manifest\nhttps://site.example.workers.dev/admin/confirm?token=abc\n',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits non-zero rather than drop a URL when no log is named', () => {
    const result = spawnSync(SHIM, ['http://127.0.0.1:5000/'], { env: { PATH: process.env.PATH ?? '' } });
    expect(result.status).not.toBe(0);
  });
});
