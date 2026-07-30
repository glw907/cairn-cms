import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';
import { parseSheet } from '../../lib/audit/sheet.js';

// CONTRACT (issue #12): the shipped sheet's class inventory is a de facto public API. A consumer's
// admin markup rides dist/components/cairn-admin.css, not cairn's own tree, so a class Tailwind
// tree-shakes out of the compiled sheet silently breaks any consumer markup still riding it, with no
// build error anywhere. This gate snapshots the FULL class inventory the compiled sheet ships and
// diffs it against the committed fixture below; either direction of drift is a failure. A class may
// only ever leave the shipped sheet as a deliberate act carried in CHANGELOG.md, never as a side
// effect of cairn's own tree moving off it (0.91.0's silent loss of nineteen classes, restored here
// as a labeled compatibility safelist in scripts/admin-css.input.css). When a change intentionally
// adds or drops a shipped class, update CHANGELOG.md first, then regenerate the fixture with
// `npm run update-admin-sheet-inventory`.
//
// One compile for the whole file, and deliberately the PLAIN build, byte-identical to what
// `npm run package` ships. Keep this to ONE buildAdminCss() call: @tailwindcss/postcss caches its
// compiler per `from` path across calls within one process (keyed on disk mtime, not the in-memory
// input string), so a second call against the same input path replays the first call's compiled
// output instead of re-scanning (grammar-tokens.test.ts documents the same trap).
const SNAPSHOT_PATH = new URL('./fixtures/admin-sheet-inventory.txt', import.meta.url);

let liveClasses: Set<string>;

beforeAll(async () => {
  const sheet = parseSheet(await buildAdminCss());
  liveClasses = new Set(sheet.rules.flatMap((rule) => rule.classNames));
}, 60_000);

function readSnapshot(): Set<string> {
  const names = readFileSync(SNAPSHOT_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return new Set(names);
}

function sortedDifference(from: Set<string>, exclude: Set<string>): string[] {
  return [...from].filter((name) => !exclude.has(name)).sort((a, b) => a.localeCompare(b));
}

describe('shipped admin sheet class inventory', () => {
  it('matches the committed snapshot in both directions', () => {
    const committed = readSnapshot();
    const missing = sortedDifference(committed, liveClasses);
    const added = sortedDifference(liveClasses, committed);
    if (missing.length === 0 && added.length === 0) return;
    const lines = [
      'the shipped admin sheet class inventory drifted from the committed snapshot.',
      'a class may only leave the shipped sheet as a deliberate, changelog-carried act, never as a',
      "side effect of cairn's own tree moving off it (this is how 0.91.0 silently dropped nineteen",
      'classes consumer markup rode). if this drift is intentional, record it in CHANGELOG.md first,',
      'then regenerate the snapshot: npm run update-admin-sheet-inventory',
      '',
    ];
    if (missing.length > 0) {
      lines.push(`missing from the built sheet (${missing.length}):`);
      lines.push(...missing.map((name) => `  - ${name}`), '');
    }
    if (added.length > 0) {
      lines.push(`new to the built sheet (${added.length}):`);
      lines.push(...added.map((name) => `  + ${name}`), '');
    }
    expect.fail(lines.join('\n'));
  });

  // The mechanical proof the nineteen classes issue #12 found dropped in 0.91.0 are restored: named
  // by value here rather than only through the snapshot diff above, so a regen that accidentally
  // regenerates over a real loss (rather than a deliberate one) still fails this file.
  it('ships all nineteen classes 0.91.0 silently dropped', () => {
    const restored = [
      'badge-ghost',
      'gap-6',
      'text-2xl',
      'text-3xl',
      'text-[0.625rem]',
      'text-[0.6875rem]',
      'text-[0.6rem]',
      'text-[0.75rem]',
      'text-[0.7rem]',
      'text-[0.8125rem]',
      'text-[0.875rem]',
      'text-[0.9375rem]',
      'text-[0.9em]',
      'text-[1.0625rem]',
      'text-base',
      'text-lg',
      'text-sm',
      'text-xs',
      'tracking-tight',
    ];
    expect(restored, 'expected the restored set to list exactly nineteen classes').toHaveLength(19);
    for (const name of restored) {
      expect(liveClasses.has(name), `expected the built sheet to carry .${name}`).toBe(true);
    }
  });
});
