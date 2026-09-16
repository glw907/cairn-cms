import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { parseSheet } from '../../lib/audit/sheet.js';

// CONTRACT (issue #12): the shipped sheet's class inventory is a de facto public API. A consumer's
// admin markup rides dist/components/cairn-admin.css, not cairn's own tree, so a class Tailwind
// tree-shakes out of the compiled sheet silently breaks any consumer markup still riding it, with no
// build error anywhere. This gate snapshots the FULL class inventory the compiled sheet ships and
// diffs it against the committed fixture below; either direction of drift is a failure. A class may
// only ever leave the shipped sheet as a deliberate act carried in CHANGELOG.md, never as a side
// effect of cairn's own tree moving off it (0.91.0's silent loss of nineteen classes, restored here
// as a labeled compatibility safelist in scripts/build/admin-css.input.css). When a change intentionally
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
let liveCss: string;

beforeAll(async () => {
  liveCss = await buildAdminCss();
  const sheet = parseSheet(liveCss);
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

// The motion token vocabulary: five durations and three curves, the closed set cairn-audit's
// motion-band rule enforces, declared on both admin theme roots so a component under either
// scheme reads the same values. The two theme-root blocks are found by their opening selector and
// their assertion runs against the SLICE up to the next top-level closing brace, so a token
// declared in one root does not silently satisfy the assertion for the other. lightningcss's
// printer normalizes number serialization (110ms becomes .11s, a leading zero on a cubic-bezier
// term drops), so the expected values below are the built sheet's actual normalized form of the
// authored --cairn-dur-*/--cairn-ease-* values, not their as-typed source text.
describe('the admin motion token set', () => {
  const TOKENS: Record<string, string> = {
    '--cairn-dur-instant': '70ms',
    '--cairn-dur-quick': '.11s',
    '--cairn-dur-base': '.15s',
    '--cairn-dur-shift': '.24s',
    '--cairn-dur-settle': '.4s',
    '--cairn-ease-standard': 'cubic-bezier(.2, 0, .38, .9)',
    '--cairn-ease-entrance': 'cubic-bezier(0, 0, .38, .9)',
    '--cairn-ease-exit': 'cubic-bezier(.2, 0, 1, .9)',
  };

  function themeRootBlock(selector: string): string {
    const start = liveCss.indexOf(selector);
    expect(start, `expected to find the ${selector} theme root`).toBeGreaterThan(-1);
    const open = liveCss.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < liveCss.length; i++) {
      if (liveCss[i] === '{') depth++;
      else if (liveCss[i] === '}' && --depth === 0) return liveCss.slice(open + 1, i);
    }
    throw new Error(`unterminated ${selector} block`);
  }

  it('declares all eight token names with their exact values on the light theme root', () => {
    const block = themeRootBlock('[data-theme="cairn-admin"] {');
    for (const [name, value] of Object.entries(TOKENS)) {
      expect(block, `expected ${name} in the light root`).toContain(`${name}: ${value}`);
    }
  });

  it('declares all eight token names with their exact values on the dark theme root', () => {
    const block = themeRootBlock('[data-theme="cairn-admin-dark"] {');
    for (const [name, value] of Object.entries(TOKENS)) {
      expect(block, `expected ${name} in the dark root`).toContain(`${name}: ${value}`);
    }
  });

  it("declares the reduced-motion block's two delay declarations by name", () => {
    // The blanket block is the LAST prefers-reduced-motion: reduce block in the sheet; several
    // DaisyUI components (.skeleton, .motion-reduce\:animate-none) author their own earlier ones.
    const start = liveCss.lastIndexOf('@media (prefers-reduced-motion: reduce)');
    expect(start, 'expected the blanket reduced-motion block').toBeGreaterThan(-1);
    const end = liveCss.indexOf('}', liveCss.indexOf('}', start) + 1);
    const block = liveCss.slice(start, end);
    expect(block).toContain('[data-theme="cairn-admin"] *');
    expect(block).toContain('transition-delay: 0s !important');
    expect(block).toContain('animation-delay: 0s !important');
  });
});
