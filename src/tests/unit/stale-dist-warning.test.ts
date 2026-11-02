import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { staleDistWarning } from '../_unit-global-setup.js';

const roots: string[] = [];

/** A scratch repo with one `src/lib` file and, optionally, a `dist/index.js`, each at a set mtime. */
function scratch(srcSeconds: number, distSeconds: number | null): string {
  const root = mkdtempSync(join(tmpdir(), 'stale-dist-'));
  roots.push(root);
  mkdirSync(join(root, 'src/lib'), { recursive: true });
  writeFileSync(join(root, 'src/lib/a.ts'), '');
  utimesSync(join(root, 'src/lib/a.ts'), srcSeconds, srcSeconds);
  if (distSeconds !== null) {
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist/index.js'), '');
    utimesSync(join(root, 'dist/index.js'), distSeconds, distSeconds);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('the stale-dist warning', () => {
  it('warns when src/lib is newer than dist', () => {
    expect(staleDistWarning(scratch(2000, 1000))).toMatch(/newer than dist/);
  });

  it('stays quiet when dist is as new as src/lib', () => {
    expect(staleDistWarning(scratch(1000, 2000))).toBeNull();
  });

  it('warns without throwing when dist is missing', () => {
    const root = scratch(1000, null);
    expect(() => staleDistWarning(root)).not.toThrow();
    expect(staleDistWarning(root)).toMatch(/dist is missing/);
  });
});
