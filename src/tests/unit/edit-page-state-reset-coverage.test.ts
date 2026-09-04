// EditPage.svelte carries roughly fifty `$state`/`$state.raw` declarations, and the entry-key
// reset ($effect.pre, keyed on entryKey) only ever covered a hand-picked fraction of them: task
// 11's audit found `uploadedRecords` missing (a same-route link hop carried entry A's uploaded
// media records into entry B's save payload, docs/superpowers/plans/2026-09-03-internals-b-pass.md
// Task 11). This test parses the real source so a NEW `$state` declaration added later without an
// explicit decision (reset it, or mark it exempt with a reason) fails the gate instead of silently
// widening the same gap. It is a source-enumeration test, not a runtime one: it never mounts any
// component, only reads file text.
//
// tidy-controller.svelte.ts and figure-editor.svelte.ts carry the same entry-key-scoped reset
// shape (Task 12's extraction out of EditPage.svelte), each owning its own RESET_BLOCK/
// RESET_EXEMPT fences, so this gate walks all three files rather than EditPage.svelte alone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** One source file this gate covers, with its own `RESET_BLOCK_START`/`RESET_BLOCK_END`/
 *  `RESET_EXEMPT` fences. */
interface CoveredFile {
  label: string;
  path: string;
}

const COVERED_FILES: CoveredFile[] = [
  { label: 'EditPage.svelte', path: resolve(ROOT, 'src/lib/components/EditPage.svelte') },
  {
    label: 'tidy-controller.svelte.ts',
    path: resolve(ROOT, 'src/lib/components/tidy-controller.svelte.ts'),
  },
  {
    label: 'figure-editor.svelte.ts',
    path: resolve(ROOT, 'src/lib/components/figure-editor.svelte.ts'),
  },
];

/** Every `let NAME = $state(...)` / `let NAME = $state.raw(...)` declaration in the source, in
 *  declaration order. Matches a bare declarator (`let name = $state(...)`), one carrying a type
 *  annotation (`let name: Foo = $state(...)`), and a later declarator on the same `let` statement
 *  (`let a = $state(1), b: Bar = $state(2)`), each of the last two by allowing an optional
 *  `: Type` run (no `=` or `,`, so it never crosses into a real type's own generic comma) before
 *  the `=`. A comment merely mentioning `$state` (no real `name =` before it) never matches, since
 *  the identifier class requires a real name immediately before the optional type and the `=`. */
export function parseDeclaredStateNames(source: string): string[] {
  const names: string[] = [];
  const pattern = /(?:\blet\s+|,\s*)([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=,]+)?=\s*\$state\b/g;
  for (const match of source.matchAll(pattern)) names.push(match[1]);
  return names;
}

/** The assignment targets inside the `RESET_BLOCK_START`/`RESET_BLOCK_END`-fenced span of the
 *  entry-key reset, comment lines stripped first so a comment mentioning a name in passing is
 *  never mistaken for an actual reset assignment. */
export function parseResetNames(source: string, label: string): string[] {
  const span = source.match(/RESET_BLOCK_START([\s\S]*?)RESET_BLOCK_END/);
  if (!span) throw new Error(`RESET_BLOCK_START/RESET_BLOCK_END markers not found in ${label}`);
  const body = span[1]
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  const names: string[] = [];
  const pattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/gm;
  for (const match of body.matchAll(pattern)) names.push(match[1]);
  return names;
}

/** The comma-separated identifier list following a `RESET_EXEMPT:` marker, read across every
 *  contiguous `//`-prefixed line starting at that marker (so the list can wrap several lines, or
 *  be empty when a module resets every `$state` name it declares). */
export function parseExemptNames(source: string, label: string): string[] {
  const lines = source.split('\n');
  const startIndex = lines.findIndex((line) => line.includes('RESET_EXEMPT:'));
  if (startIndex === -1) throw new Error(`RESET_EXEMPT marker not found in ${label}`);
  const collected: string[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('//')) break;
    collected.push(trimmed.replace(/^\/\/\s?/, ''));
  }
  const joined = collected.join(' ').replace(/^RESET_EXEMPT:\s*/, '');
  return joined
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

describe.each(COVERED_FILES)('$label $state reset coverage', ({ label, path }) => {
  it('accounts for every declared $state/$state.raw name in either the reset or the exempt list', () => {
    const source = readFileSync(path, 'utf8');
    const declared = parseDeclaredStateNames(source);
    const reset = new Set(parseResetNames(source, label));
    const exempt = new Set(parseExemptNames(source, label));
    const unaccounted = declared.filter((name) => !reset.has(name) && !exempt.has(name));
    expect(unaccounted).toEqual([]);
  });

  it('never lists the same name in both the reset and the exempt list', () => {
    const source = readFileSync(path, 'utf8');
    const reset = parseResetNames(source, label);
    const exempt = new Set(parseExemptNames(source, label));
    const inBoth = reset.filter((name) => exempt.has(name));
    expect(inBoth).toEqual([]);
  });

  it('never lists an exempt name that is no longer declared (a stale exempt entry)', () => {
    // An exempt entry is a deliberate decision about a REAL declared name; a name removed from
    // the source (a rename, or the state itself deleted) must also leave the exempt list, or the
    // list quietly stops describing anything real. This is the mirror of "unaccounted": every
    // exempt name must resolve to something the source still declares.
    const source = readFileSync(path, 'utf8');
    const declared = new Set(parseDeclaredStateNames(source));
    const exempt = parseExemptNames(source, label);
    const stale = exempt.filter((name) => !declared.has(name));
    expect(stale).toEqual([]);
  });

  it('fails when a new $state name is added without a reset assignment or an exempt entry', () => {
    // Proves the gate actually catches drift, the way an omitted uploadedRecords reset would have.
    const source = readFileSync(path, 'utf8') + '\n  let brandNewFeatureFlag = $state(false);\n';
    const declared = parseDeclaredStateNames(source);
    const reset = new Set(parseResetNames(source, label));
    const exempt = new Set(parseExemptNames(source, label));
    const unaccounted = declared.filter((name) => !reset.has(name) && !exempt.has(name));
    expect(unaccounted).toEqual(['brandNewFeatureFlag']);
  });

  it('fails when the exempt list names a $state that is no longer declared', () => {
    // Simulates a rename/removal that left a stale name behind in RESET_EXEMPT: strip one
    // declaration the exempt list already names, so that name is now stale.
    const exemptNames = parseExemptNames(readFileSync(path, 'utf8'), label);
    if (exemptNames.length === 0) return; // Nothing exempt in this file to go stale.
    const target = exemptNames[0];
    const source = readFileSync(path, 'utf8').replace(
      new RegExp(`let ${target} = \\$state[^;]*;\\n`),
      '',
    );
    const declared = new Set(parseDeclaredStateNames(source));
    const exempt = parseExemptNames(source, label);
    const stale = exempt.filter((name) => !declared.has(name));
    expect(stale).toEqual([target]);
  });
});

describe('parseDeclaredStateNames widened declaration shapes', () => {
  it('matches a declarator carrying a type annotation', () => {
    const source = "let message: string | null = $state(null);\n";
    expect(parseDeclaredStateNames(source)).toEqual(['message']);
  });

  it('matches every declarator on a multi-declarator let statement', () => {
    const source = 'let a = $state(1), b: number = $state(2);\n';
    expect(parseDeclaredStateNames(source)).toEqual(['a', 'b']);
  });

  it('matches $state.raw the same way as $state', () => {
    const source = 'let review = $state.raw<{ x: number } | null>(null);\n';
    expect(parseDeclaredStateNames(source)).toEqual(['review']);
  });

  it('never matches a bare comment mentioning $state', () => {
    const source = '// some prose about $state that names no real declarator\n';
    expect(parseDeclaredStateNames(source)).toEqual([]);
  });
});
