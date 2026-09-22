// Proves check-tool-heuristics.mjs's tripwire in both directions: green against the real repo
// (every watched literal is present), and red against a scratch copy with one watched site
// renamed, naming exactly the broken site.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { WATCHES, findBrokenWatches } from '../../../scripts/checks/check-tool-heuristics.mjs';

const ROOT = resolve(process.cwd());

describe('findBrokenWatches against the real repo', () => {
  it('reports no broken watch: every literal the Go tool keys on is still present', () => {
    expect(findBrokenWatches()).toEqual([]);
  });

  it('watches exactly four sites', () => {
    expect(WATCHES).toHaveLength(4);
  });
});

/** Copy every watched file's real content into a scratch root, so a single mutation is isolated. */
function scratchRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-tool-heuristics-'));
  for (const watch of WATCHES) {
    const src = join(ROOT, watch.file);
    const dest = join(dir, watch.file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src, 'utf8'));
  }
  return dir;
}

describe('findBrokenWatches against a mutated scratch copy', () => {
  it('reports the createAuthGuard watch broken when the site renames the function', () => {
    const dir = scratchRoot();
    const guardFile = join(dir, 'src/lib/sveltekit/guard.ts');
    const original = readFileSync(guardFile, 'utf8');
    writeFileSync(guardFile, original.replace('export function createAuthGuard(', 'export function createAuthGuardV2('));
    const broken = findBrokenWatches(dir);
    expect(broken).toHaveLength(1);
    expect(broken[0].file).toBe('src/lib/sveltekit/guard.ts');
    expect(broken[0].heuristic).toBe('auth.role-wiring');
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports nothing broken when the scratch copy is untouched', () => {
    const dir = scratchRoot();
    expect(findBrokenWatches(dir)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});
