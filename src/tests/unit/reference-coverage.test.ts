import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  enumerateExports,
  missingNames,
  hasTierMarker,
  untaggedNames,
  staleNames,
  checkOne,
  assertAllowlistReasoned,
  NARRATIVE_CONTEXT_ALLOWLIST,
} from '../../../scripts/checks/reference-coverage.mjs';

const fixture = (name: string) => resolve(__dirname, 'fixtures/reference-coverage', name);

describe('enumerateExports', () => {
  it('lists own exports, type-only exports, and re-exported names', () => {
    expect(enumerateExports(fixture('a.d.ts'))).toEqual(['T', 'x', 'y']);
  });
});

describe('missingNames', () => {
  it('returns the names absent from the page text', () => {
    const text = 'Documents `foo` and the `bar` helper.';
    expect(missingNames(['foo', 'bar', 'baz'], text)).toEqual(['baz']);
  });

  it('matches a whole-word token, not a substring', () => {
    expect(missingNames(['foo'], 'this mentions foobar only')).toEqual(['foo']);
  });
});

describe('hasTierMarker', () => {
  it('fails a `###` section with no Stability tier line in its window', () => {
    const text = ['### `foo`', '', 'Some prose about foo.', '', '### `bar`'].join('\n');
    expect(hasTierMarker('foo', text)).toBe(false);
  });

  it('passes a `###` section that carries the inline tier line', () => {
    const text = ['### `foo`', '', 'Some prose. Stability tier: Extension API.', '', '### `bar`'].join(
      '\n',
    );
    expect(hasTierMarker('foo', text)).toBe(true);
  });

  it('does not leak a later section tier line back to an earlier untagged export', () => {
    const text = [
      '### `foo`',
      '',
      'Prose about foo, untagged.',
      '',
      '### `bar`',
      '',
      'Stability tier: Extension API.',
    ].join('\n');
    expect(hasTierMarker('foo', text)).toBe(false);
    expect(hasTierMarker('bar', text)).toBe(true);
  });

  it('fails a Types-table row with no tier cell', () => {
    const text = [
      '| Name | Signature | Meaning |',
      '| --- | --- | --- |',
      '| `Foo` | `interface Foo {}` | A thing. |',
    ].join('\n');
    expect(hasTierMarker('Foo', text)).toBe(false);
  });

  it('fails a Types-table row whose Stability cell is unrecognized', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `Foo` | maybe | `interface Foo {}` | A thing. |',
    ].join('\n');
    expect(hasTierMarker('Foo', text)).toBe(false);
  });

  it('passes a Types-table row whose Stability cell names a valid tier', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `Foo` | Extension API | `interface Foo {}` | A thing. |',
      '| `Bar` | Scaffold API | `interface Bar {}` | Another. |',
    ].join('\n');
    expect(hasTierMarker('Foo', text)).toBe(true);
    expect(hasTierMarker('Bar', text)).toBe(true);
  });

  it('passes an Unstable API tier, both as a table cell and an inline section line', () => {
    const tableText = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `Foo` | Unstable API | `interface Foo {}` | A thing. |',
    ].join('\n');
    expect(hasTierMarker('Foo', tableText)).toBe(true);

    const sectionText = ['### `bar`', '', 'Some prose. Stability tier: Unstable API.'].join('\n');
    expect(hasTierMarker('bar', sectionText)).toBe(true);
  });
});

describe('untaggedNames', () => {
  it('reports per-export: a page that tags A but not B still fails for B', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `A` | Extension API | `interface A {}` | Tagged. |',
      '| `B` | | `interface B {}` | Untagged. |',
    ].join('\n');
    expect(untaggedNames(['A', 'B'], text)).toEqual(['B']);
  });
});

describe('staleNames', () => {
  it('flags a Types-table row naming a type that is no longer a real export', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `Kept` | Extension API | `interface Kept {}` | Still real. |',
      '| `Renamed` | Extension API | `interface Renamed {}` | No longer real. |',
    ].join('\n');
    expect(staleNames(['Kept'], text)).toEqual(['Renamed']);
  });

  it('flags a bare export heading naming a removed export', () => {
    const text = ['### `Kept`', '', 'Stability tier: Extension API.', '', '### `Removed`', '', 'Gone.'].join(
      '\n',
    );
    expect(staleNames(['Kept'], text)).toEqual(['Removed']);
  });

  it('flags a `declare function` signature naming a removed function', () => {
    const text = ['```ts', 'declare function kept(): void;', 'declare function removed(): void;', '```'].join(
      '\n',
    );
    expect(staleNames(['kept'], text)).toEqual(['removed']);
  });

  it('does not flag a qualified heading whose bare name is a field label, not an export', () => {
    // "editor" here names the adapter's `editor` group member, not the exported `Editor` type;
    // the trailing "(adapter `editor` member)" text keeps the heading out of the bare-heading scope.
    const text = ["#### \`preview\` (adapter \`editor\` member)", '', 'Some prose.'].join('\n');
    expect(staleNames(['Editor', 'PreviewConfig'], text)).toEqual([]);
  });

  it('does not flag a non-export table whose first column is backticked but is not a Types table', () => {
    const text = [
      '| Action | Valid views | Delegates to |',
      '| --- | --- | --- |',
      '| `request` | login | the magic-link request |',
      '| `confirm` | confirm | the token confirm |',
    ].join('\n');
    expect(staleNames(['createAuthRoutes'], text)).toEqual([]);
  });

  it('does not flag a dependent, non-exported type shown bare (no `declare`) beside a real export', () => {
    const text = [
      '```ts',
      'interface ConceptDescriptor {',
      '  routing: RoutingRule;',
      '}',
      '',
      'interface RoutingRule {',
      '  routable: boolean;',
      '}',
      '```',
    ].join('\n');
    expect(staleNames(['ConceptDescriptor'], text)).toEqual([]);
  });

  it('does not flag a real export mentioned only in ordinary prose', () => {
    const text = 'This page mentions `SomeOtherExport` only in a sentence, never as a heading or row.';
    expect(staleNames(['SomeOtherExport'], text)).toEqual([]);
  });

  it('does not flag a `declare const` scaffolding name inside a runnable usage example', () => {
    // The snippet-typecheck gate needs a fictional local to stand in for a value the reader
    // already has; `fileText` here is scaffolding for `parseMarkdown(fileText)`, not an export.
    const text = [
      '```ts',
      "import { parseMarkdown } from '@glw907/cairn-cms';",
      '',
      'declare const fileText: string;',
      '',
      'const { frontmatter, body } = parseMarkdown(fileText);',
      '```',
    ].join('\n');
    expect(staleNames(['parseMarkdown'], text)).toEqual([]);
  });

  it('still flags a `declare const` naming a removed export inside a signature-only block', () => {
    const text = ['```ts', 'declare const kept: string;', 'declare const removed: string;', '```'].join('\n');
    expect(staleNames(['kept'], text)).toEqual(['removed']);
  });
});

describe('checkOne (per-subpath stale-name rescope)', () => {
  // The historical case: `delivery-data.md` once carried 14 Types-table rows naming types real
  // only on other subpaths (core, auth-channel), which the old union-over-everything pool never
  // caught (see `docs/internal/engine-rulings.md`'s `reference-coverage-stale-names-rescope`
  // row). `rescope-page-a.md` reconstructs that shape: it correctly documents `fromA` (subpath A's
  // own export) and, like the dead delivery-data.md rows, also names `fromB`, a name real only on
  // a different subpath (B).
  const pageA = fixture('rescope-page-a.md');
  const pageAFixed = fixture('rescope-page-a-fixed.md');
  const entryA = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: pageA };
  const entryAFixed = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: pageAFixed };
  const pageKnownNames = new Set(['fromA']); // subpath A's own pool: fromB is foreign
  const globalKnownNames = new Set(['fromA', 'fromB']); // fromB is still real, just elsewhere

  it('fails a page that names a foreign subpath export the old global pool let pass', () => {
    const result = checkOne(entryA, pageKnownNames, globalKnownNames, []);
    expect(result.stale).toEqual(['fromB']);
  });

  it('runs clean once the foreign row is removed (the real fix, not an allowlist)', () => {
    const result = checkOne(entryAFixed, pageKnownNames, globalKnownNames, []);
    expect(result.stale).toEqual([]);
  });

  it('excuses an allowlisted foreign name that is still a real export somewhere', () => {
    const allowlist = [{ page: pageA, names: ['fromB'], reason: 'narrative context, see /b.' }];
    const result = checkOne(entryA, pageKnownNames, globalKnownNames, allowlist);
    expect(result.stale).toEqual([]);
  });

  it('does not excuse an allowlisted name outside its own page', () => {
    const allowlist = [{ page: fixture('some-other-page.md'), names: ['fromB'], reason: 'wrong page.' }];
    const result = checkOne(entryA, pageKnownNames, globalKnownNames, allowlist);
    expect(result.stale).toEqual(['fromB']);
  });

  it('keeps the renamed/removed lock even for an allowlisted name: a name real nowhere still fails', () => {
    const allowlist = [{ page: pageA, names: ['fromB'], reason: 'narrative context, see /b.' }];
    const globalWithoutFromB = new Set(['fromA']); // fromB renamed or removed everywhere
    const result = checkOne(entryA, pageKnownNames, globalWithoutFromB, allowlist);
    expect(result.stale).toEqual(['fromB']);
  });

  it('pools two subpath entries that share one page: neither name is foreign to the shared page', () => {
    const sharedPage = fixture('rescope-shared-page.md');
    const entryOnSharedPage = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: sharedPage };
    // The shared-page pool a real `main()` run builds via `knownNamesByPage`: the union of both
    // subpaths' own exports, since both document the same page (delivery.md and
    // reproductions.md's own real shape).
    const sharedPoolFromMain = new Set(['fromA', 'fromB']);
    const result = checkOne(entryOnSharedPage, sharedPoolFromMain, globalKnownNames, []);
    expect(result.stale).toEqual([]);
  });
});

describe('NARRATIVE_CONTEXT_ALLOWLIST (the render trio, F-1 list (c) Tier 4)', () => {
  it('is reasoned: every entry carries a non-empty reason', () => {
    expect(() => assertAllowlistReasoned(NARRATIVE_CONTEXT_ALLOWLIST)).not.toThrow();
  });

  it('rejects an entry with no reason (the fail-unless-recorded idiom)', () => {
    expect(() =>
      assertAllowlistReasoned([{ page: 'docs/reference/core.md', names: ['cardShell'], reason: '' }]),
    ).toThrow(/no reason/);
  });

  it('records core.md as the render trio\'s narrative-context page', () => {
    const coreEntry = NARRATIVE_CONTEXT_ALLOWLIST.find((e) => e.page === 'docs/reference/core.md');
    expect(coreEntry?.names).toEqual(['cardShell', 'headRow', 'iconSpan']);
  });
});
