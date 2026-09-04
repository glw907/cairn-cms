import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isAuthOnlyPath,
  blankReexportBlocks,
  blankBlockComments,
  blankLineComments,
  buildDeclMap,
  callSites,
  analyzeExport,
  allExportNames,
  findViolations,
  formatViolations,
} from '../../../scripts/checks/check-self-use.mjs';

// analyzeExport resolves each declaring file relative to the real repo ROOT (the same
// two-levels-up resolution check-self-use.mjs's own repoRoot() applies), so an auth-path
// scenario needs a real path under it, not an arbitrary absolute-looking string.
const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const authFile = (rel: string) => resolve(ROOT, rel);

describe('isAuthOnlyPath', () => {
  it('matches every src/lib/auth* sibling directory', () => {
    expect(isAuthOnlyPath('src/lib/auth/store.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/auth-channel/factory.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/auth-crypto/index.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/auth-store/index.ts')).toBe(true);
  });

  it('matches exactly the four named sveltekit files, not their siblings', () => {
    expect(isAuthOnlyPath('src/lib/sveltekit/guard.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/sveltekit/csrf.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/sveltekit/admin-action.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/sveltekit/section-action.ts')).toBe(true);
    expect(isAuthOnlyPath('src/lib/sveltekit/health.ts')).toBe(false);
  });

  it('does not match an unrelated path', () => {
    expect(isAuthOnlyPath('src/lib/content/fields.ts')).toBe(false);
  });
});

describe('blankReexportBlocks', () => {
  it('blanks a single-line re-export naming the target', () => {
    const text = "export { removeOwnerIfNotLast } from '../auth/store.js';\n";
    expect(blankReexportBlocks(text)).not.toContain('removeOwnerIfNotLast');
  });

  it('blanks a multi-line re-export block, preserving line count', () => {
    const text = [
      'export {',
      '  listEditors,',
      '  removeOwnerIfNotLast,',
      "} from '../auth/store.js';",
      'export type { OwnerGuardOutcome } from \'../auth/store.js\';',
    ].join('\n');
    const blanked = blankReexportBlocks(text);
    expect(blanked).not.toContain('removeOwnerIfNotLast');
    expect(blanked).not.toContain('OwnerGuardOutcome');
    expect(blanked.split('\n')).toHaveLength(text.split('\n').length);
  });

  it('leaves a real (non-re-export) mention untouched', () => {
    const text = 'const x: OwnerGuardOutcome = run();';
    expect(blankReexportBlocks(text)).toContain('OwnerGuardOutcome');
  });
});

describe('blankBlockComments', () => {
  it('blanks a TSDoc mention inside a block comment, preserving line count', () => {
    const text = '/**\n * See {@link presetUrl} for the vocabulary.\n */\nexport const x = 1;';
    const blanked = blankBlockComments(text);
    expect(blanked).not.toContain('presetUrl');
    expect(blanked.split('\n')).toHaveLength(text.split('\n').length);
  });

  it('leaves real code untouched', () => {
    expect(blankBlockComments('const y = presetUrl(a);')).toContain('presetUrl');
  });
});

describe('blankLineComments', () => {
  it('blanks a whole-line // comment mentioning a name, preserving line count', () => {
    const text = '// See requireAccess for the shape.\nconst x = 1;\n';
    const blanked = blankLineComments(text);
    expect(blanked).not.toContain('requireAccess');
    expect(blanked.split('\n')).toHaveLength(text.split('\n').length);
  });

  it('blanks an indented whole-line // comment', () => {
    const text = 'function f() {\n  // uses requireAccess internally\n  return 1;\n}\n';
    expect(blankLineComments(text)).not.toContain('requireAccess');
  });

  it('leaves a trailing same-line // comment and any real code untouched', () => {
    const text = "const url = 'https://example.com'; // not a whole-line comment\nrequireAccess();\n";
    const blanked = blankLineComments(text);
    expect(blanked).toContain("const url = 'https://example.com';");
    expect(blanked).toContain('requireAccess();');
  });
});

describe('buildDeclMap', () => {
  it('finds a top-level export declaration and its file, not a re-export', () => {
    const fileA = '/a.ts';
    const fileB = '/b.ts';
    const texts = new Map([
      [fileA, "export function widget() {}\nexport interface Options {}\n"],
      [fileB, "export { widget } from './a.js';\n"],
    ]);
    const decl = buildDeclMap([fileA, fileB], texts);
    expect([...(decl.get('widget') ?? [])]).toEqual([fileA]);
    expect(decl.has('Options')).toBe(true);
  });
});

describe('callSites', () => {
  it('excludes the declaring file and a barrel re-export, counts a real usage', () => {
    const own = '/own.ts';
    const barrel = '/barrel.ts';
    const caller = '/caller.ts';
    // callSites reads already-prepared text (blankReexportBlocks already applied, as
    // analyzeSurface does before calling it); a barrel's re-export line is blanked upstream,
    // not by callSites itself.
    const texts = new Map([
      [own, 'export function widget() { return widget; }'],
      [barrel, blankReexportBlocks("export { widget } from './own.js';")],
      [caller, 'import { widget } from "./own.js";\nwidget();'],
    ]);
    const hits = callSites('widget', [own, barrel, caller], texts, new Set([own]));
    expect(hits).toEqual([caller]);
  });
});

describe('analyzeExport', () => {
  const publicFile = authFile('src/lib/content/thing.ts');
  const secretFile = authFile('src/lib/auth/thing.ts');
  const secretSibling = authFile('src/lib/auth/other.ts');
  const showcaseFile = authFile('examples/showcase/src/x.ts');
  const declMap = new Map([
    ['PublicThing', new Set([publicFile])],
    ['SecretThing', new Set([secretFile])],
  ]);

  it('has no callers when the only occurrence is inside the declaring module', () => {
    const texts = new Map([[publicFile, 'export const PublicThing = 1; const x = PublicThing;']]);
    const result = analyzeExport('PublicThing', [publicFile], [], texts, declMap);
    expect(result.hasCallers).toBe(false);
    expect(result.authOnly).toBe(false);
  });

  it('counts a showcase call site for a non-auth export', () => {
    const texts = new Map([
      [publicFile, 'export const PublicThing = 1;'],
      [showcaseFile, 'use(PublicThing);'],
    ]);
    const result = analyzeExport('PublicThing', [publicFile], [showcaseFile], texts, declMap);
    expect(result.hasCallers).toBe(true);
  });

  // The auth-path allowlist-only rule: a showcase call site alone must never discharge an export
  // declared under an auth/security path, even though the identical scenario passes for a
  // non-auth export above.
  it('refuses a showcase call site alone for an auth-path export', () => {
    const texts = new Map([
      [secretFile, 'export const SecretThing = 1;'],
      [showcaseFile, 'use(SecretThing);'],
    ]);
    const result = analyzeExport('SecretThing', [secretFile], [showcaseFile], texts, declMap);
    expect(result.authOnly).toBe(true);
    expect(result.hasCallers).toBe(false);
  });

  it('counts a real in-engine call site for an auth-path export', () => {
    const texts = new Map([
      [secretFile, 'export const SecretThing = 1;'],
      [secretSibling, 'use(SecretThing);'],
    ]);
    const result = analyzeExport('SecretThing', [secretFile, secretSibling], [], texts, declMap);
    expect(result.hasCallers).toBe(true);
  });
});

describe('allExportNames', () => {
  it('deduplicates a name published from more than one subpath', () => {
    const model = { '.': { A: 'string', B: 'number' }, '/sveltekit': { A: 'string' } };
    expect(allExportNames(model)).toEqual(['A', 'B']);
  });
});

describe('findViolations / formatViolations (the failing-first proof)', () => {
  const zeroCaller = { name: 'Orphan', ownFiles: ['src/lib/x.ts'], engineCallSites: [], showcaseCallSites: [], authOnly: false, hasCallers: false };
  const hasCallers = { name: 'Used', ownFiles: ['src/lib/y.ts'], engineCallSites: ['src/lib/z.ts'], showcaseCallSites: [], authOnly: false, hasCallers: true };

  it('fails a zero-caller export with no allowlist entry, naming it and the remedy order', () => {
    const result = findViolations([zeroCaller, hasCallers], []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.unlisted.map((u) => u.name)).toEqual(['Orphan']);
    const message = formatViolations(result);
    expect(message).toContain('Orphan');
    expect(message).toContain('allowlist');
    expect(message).toContain('showcase call site');
    expect(message).not.toContain('deletion never as the gate');
  });

  it('passes once a reasoned allowlist entry covers it (the delisted-then-relisted proof)', () => {
    const redRun = findViolations([zeroCaller], []);
    expect(redRun.ok).toBe(false);
    const greenRun = findViolations([zeroCaller], [{ name: 'Orphan', reason: 'a real anonymous-consumer argument' }]);
    expect(greenRun.ok).toBe(true);
  });

  // An unreasoned entry is its own violation class (round B): it no longer makes the export it
  // names read as "carries no allowlist entry", which is false, and the gate no longer silently
  // drops it either. Both `unlisted` and `unreasoned` are checked directly, since a bug that
  // regressed one into the other would still leave `result.ok` false and hide behind it.
  it('treats an unreasoned allowlist entry as its own violation, not a false "no entry" report', () => {
    const result = findViolations([zeroCaller], [{ name: 'Orphan', reason: '' }]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.unlisted).toEqual([]);
    expect(result.unreasoned.map((e) => e.name)).toEqual(['Orphan']);
    const message = formatViolations(result);
    expect(message).toContain('Orphan');
    expect(message).toContain('carry no reason');
    expect(message).not.toContain('carry no allowlist entry');
  });

  it("marks an auth-only export's remedy as allowlist-only in the failure message", () => {
    const authZero = { ...zeroCaller, name: 'SecretOrphan', authOnly: true };
    const result = findViolations([authZero], []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    const message = formatViolations(result);
    expect(message).toContain('SecretOrphan');
    expect(message).toContain('allowlist-only (auth/security path)');
  });
});
