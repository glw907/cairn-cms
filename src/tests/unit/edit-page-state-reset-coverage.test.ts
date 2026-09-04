// EditPage.svelte carries roughly fifty `$state`/`$state.raw` declarations, and the entry-key
// reset ($effect.pre, keyed on entryKey) only ever covered a hand-picked fraction of them: task
// 11's audit found `uploadedRecords` missing (a same-route link hop carried entry A's uploaded
// media records into entry B's save payload, docs/superpowers/plans/2026-09-03-internals-b-pass.md
// Task 11). This test parses the real source so a NEW `$state` declaration added later without an
// explicit decision (reset it, or mark it exempt with a reason) fails the gate instead of silently
// widening the same gap. It is a source-enumeration test, not a runtime one: it never mounts the
// component, only reads the file text.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const EDIT_PAGE_PATH = resolve(ROOT, 'src/lib/components/EditPage.svelte');

/** Every `let NAME = $state(...)` / `let NAME = $state.raw(...)` declaration in the source,
 *  in declaration order. A comment merely mentioning `$state` (no real `let NAME =` before it)
 *  never matches, since the identifier class requires a real name between `let` and `=`. */
export function parseDeclaredStateNames(source: string): string[] {
  const names: string[] = [];
  const pattern = /\blet\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$state\b/g;
  for (const match of source.matchAll(pattern)) names.push(match[1]);
  return names;
}

/** The assignment targets inside the `RESET_BLOCK_START`/`RESET_BLOCK_END`-fenced span of the
 *  entry-key `$effect.pre` reset, comment lines stripped first so a comment mentioning a name in
 *  passing is never mistaken for an actual reset assignment. */
export function parseResetNames(source: string): string[] {
  const span = source.match(/RESET_BLOCK_START([\s\S]*?)RESET_BLOCK_END/);
  if (!span) throw new Error('RESET_BLOCK_START/RESET_BLOCK_END markers not found in EditPage.svelte');
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
 *  contiguous `//`-prefixed line starting at that marker (so the list can wrap several lines). */
export function parseExemptNames(source: string): string[] {
  const lines = source.split('\n');
  const startIndex = lines.findIndex((line) => line.includes('RESET_EXEMPT:'));
  if (startIndex === -1) throw new Error('RESET_EXEMPT marker not found in EditPage.svelte');
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

describe('EditPage $state reset coverage', () => {
  it('accounts for every declared $state/$state.raw name in either the reset or the exempt list', () => {
    const source = readFileSync(EDIT_PAGE_PATH, 'utf8');
    const declared = parseDeclaredStateNames(source);
    const reset = new Set(parseResetNames(source));
    const exempt = new Set(parseExemptNames(source));
    const unaccounted = declared.filter((name) => !reset.has(name) && !exempt.has(name));
    expect(unaccounted).toEqual([]);
  });

  it('never lists the same name in both the reset and the exempt list', () => {
    const source = readFileSync(EDIT_PAGE_PATH, 'utf8');
    const reset = parseResetNames(source);
    const exempt = new Set(parseExemptNames(source));
    const inBoth = reset.filter((name) => exempt.has(name));
    expect(inBoth).toEqual([]);
  });

  it('fails when a new $state name is added without a reset assignment or an exempt entry', () => {
    // Proves the gate actually catches drift, the way an omitted uploadedRecords reset would have.
    const source = readFileSync(EDIT_PAGE_PATH, 'utf8') + '\n  let brandNewFeatureFlag = $state(false);\n';
    const declared = parseDeclaredStateNames(source);
    const reset = new Set(parseResetNames(source));
    const exempt = new Set(parseExemptNames(source));
    const unaccounted = declared.filter((name) => !reset.has(name) && !exempt.has(name));
    expect(unaccounted).toEqual(['brandNewFeatureFlag']);
  });
});
