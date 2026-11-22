import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKS } from '../../../scripts/checks/registry.mjs';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

// A skipped script keeps its old form until the named round deletes it; a skip whose file is gone fails below.
const SKIP: Readonly<Record<string, string>> = Object.freeze({
  'scripts/checks/check-chassis-boundary.mjs': 'made-site-3 (round 8)',
  'scripts/build/pack-engine-template.mjs': 'stock-1 (round 5)',
  'scripts/build/emit-template-dir.mjs': 'stock-1 (round 5)',
});

const STABLE_SOURCE = 'scripts/checks/check-stable-source.mjs';

// The scripts the rows run through `node`; a `node --test` row has no `scripts/...mjs` word and drops out.
const extracted = [
  ...new Set(CHECKS.flatMap((row) => [...row.command.matchAll(/\bnode (scripts\/\S+\.mjs)/g)].map((m) => m[1]))),
];
const scripts = [...extracted, STABLE_SOURCE];

const VERDICT = /(console\.(log|error)|process\.std(out|err)\.write)\([^;]*?\b(PASS|FAILED|OK|FAIL)\b/;
const EXIT_CALL = /\bprocess\.exit\s*\(/;
const OWN_ROOT = /fileURLToPath\(new URL\('\.\.|resolve\(.*import\.meta\.dirname|dirname\(fileURLToPath/;

// The theme check ends through runCheck on three paths (usage, a throw, the run); every other script on one.
const CALLS: Readonly<Record<string, number>> = { 'scripts/theme/check.mjs': 3 };

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe('the check scripts share one form', () => {
  it('extracts the 36 scripts the rows run through node', () => {
    // The 32 under scripts/checks except stable-source, the theme check, version-rise, and the two build scripts.
    expect(extracted).toHaveLength(36);
    expect(scripts).toHaveLength(37);
  });

  it.each(Object.entries(SKIP))('keeps the skipped %s on disk until %s', (path) => {
    expect(existsSync(resolve(ROOT, path))).toBe(true);
    expect(scripts).toContain(path);
  });

  it.each(scripts.filter((path) => !(path in SKIP)))('%s ends through runCheck and prints no verdict', (path) => {
    const text = read(path);
    expect(text).toMatch(/import\s*\{[^}]*\brunCheck\b[^}]*\}\s*from\s*['"][^'"]*shared\.mjs['"]/);
    expect(count(text, 'runCheck(')).toBe(CALLS[path] ?? 1);
    expect(text).not.toMatch(EXIT_CALL);
    expect(text).not.toMatch(VERDICT);
  });

  it('prints the stable-source sha line', () => {
    expect(read(STABLE_SOURCE)).toMatch(/console\.log\([^;]*sha: \$\{/);
  });

  it('flags the old form: a verdict print spanning lines, and a bare one', () => {
    expect(VERDICT.test('console.log(\n  `x: OK`\n);')).toBe(true);
    expect(VERDICT.test("console.error('check: FAILED');")).toBe(true);
    expect(VERDICT.test('console.log(`sha: ${sha}`);')).toBe(false);
  });
});

describe('the check scripts find the repo through one helper', () => {
  // These sit beside the checks but are not checks: the runner, the close, the tier picker, the shared helper.
  const NOT_CHECKS = new Set(['run.mjs', 'close-prebuilt.mjs', 'gate-tier.mjs', 'shared.mjs']);
  const files = readdirSync(resolve(ROOT, 'scripts/checks'))
    .filter((name) => name.endsWith('.mjs') && !NOT_CHECKS.has(name))
    .map((name) => `scripts/checks/${name}`)
    .filter((path) => !(path in SKIP));

  it('covers the check scripts', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)('%s computes no root of its own and calls no repoRoot', (path) => {
    const text = read(path);
    expect(text).not.toMatch(OWN_ROOT);
    expect(text).not.toMatch(/\brepoRoot\(/);
  });
});
