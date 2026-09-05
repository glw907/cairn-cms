import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  enumerateExports,
  missingNames,
  hasTierMarker,
  untaggedNames,
  staleNames,
  checkOne,
  assertAllowlistReasoned,
  NARRATIVE_CONTEXT_ALLOWLIST,
  missingIndexedAccessParentheticals,
  leakNamesForSubpath,
  componentPropsNames,
  componentSectionWindow,
  missingComponentProps,
  promotedUnstableProps,
  checkComponentProps,
  assertDocumentedUnstableReasoned,
  DOCUMENTED_UNSTABLE_PROPS,
  CONFIG,
} from '../../../scripts/checks/reference-coverage.mjs';
import { loadRegistry } from '../../../scripts/checks/check-surface-leaks.mjs';

const ROOT = resolve(__dirname, '../../..');

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
    const result = checkOne({ entry: entryA, pageKnownNames, globalKnownNamesSet: globalKnownNames, allowlist: [] });
    expect(result.stale).toEqual(['fromB']);
  });

  it('runs clean once the foreign row is removed (the real fix, not an allowlist)', () => {
    const result = checkOne({ entry: entryAFixed, pageKnownNames, globalKnownNamesSet: globalKnownNames, allowlist: [] });
    expect(result.stale).toEqual([]);
  });

  it('excuses an allowlisted foreign name that is still a real export somewhere', () => {
    const allowlist = [{ page: pageA, names: ['fromB'], reason: 'narrative context, see /b.' }];
    const result = checkOne({ entry: entryA, pageKnownNames, globalKnownNamesSet: globalKnownNames, allowlist });
    expect(result.stale).toEqual([]);
  });

  it('does not excuse an allowlisted name outside its own page', () => {
    const allowlist = [{ page: fixture('some-other-page.md'), names: ['fromB'], reason: 'wrong page.' }];
    const result = checkOne({ entry: entryA, pageKnownNames, globalKnownNamesSet: globalKnownNames, allowlist });
    expect(result.stale).toEqual(['fromB']);
  });

  it('keeps the renamed/removed lock even for an allowlisted name: a name real nowhere still fails', () => {
    const allowlist = [{ page: pageA, names: ['fromB'], reason: 'narrative context, see /b.' }];
    const globalWithoutFromB = new Set(['fromA']); // fromB renamed or removed everywhere
    const result = checkOne({ entry: entryA, pageKnownNames, globalKnownNamesSet: globalWithoutFromB, allowlist });
    expect(result.stale).toEqual(['fromB']);
  });

  it('pools two subpath entries that share one page: neither name is foreign to the shared page', () => {
    const sharedPage = fixture('rescope-shared-page.md');
    const entryOnSharedPage = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: sharedPage };
    // The shared-page pool a real `main()` run builds via `knownNamesByPage`: the union of both
    // subpaths' own exports, since both document the same page (delivery.md and
    // reproductions.md's own real shape).
    const sharedPoolFromMain = new Set(['fromA', 'fromB']);
    const result = checkOne({
      entry: entryOnSharedPage,
      pageKnownNames: sharedPoolFromMain,
      globalKnownNamesSet: globalKnownNames,
      allowlist: [],
    });
    expect(result.stale).toEqual([]);
  });

  // The dropped ceremony (round B): checkOne is an options object now, so a caller omitting
  // `allowlist` gets NARRATIVE_CONTEXT_ALLOWLIST, the same default the old positional signature
  // carried; this proves the default still applies rather than becoming `undefined`.
  it('defaults allowlist to NARRATIVE_CONTEXT_ALLOWLIST when omitted', () => {
    const result = checkOne({ entry: entryA, pageKnownNames, globalKnownNamesSet: globalKnownNames });
    // fromB is foreign to entryA's page and NOT covered by the real narrative-context allowlist
    // (which only excuses cardShell/headRow/iconSpan on core.md), so it still reports as stale.
    expect(result.stale).toEqual(['fromB']);
  });
});

describe('leakNamesForSubpath', () => {
  it('returns the distinct names recorded against one subpath', () => {
    const leaks = [
      { name: 'Foo', subpath: '/a' },
      { name: 'Bar', subpath: '/a' },
      { name: 'Foo', subpath: '/a' }, // duplicate, e.g. two reason kinds would never coexist but dedupe anyway
      { name: 'Baz', subpath: '/b' },
    ];
    expect(leakNamesForSubpath(leaks, '/a')).toEqual(['Foo', 'Bar']);
  });

  it('returns an empty array for a subpath with no recorded leaks', () => {
    expect(leakNamesForSubpath([{ name: 'Foo', subpath: '/a' }], '/z')).toEqual([]);
  });
});

describe('missingIndexedAccessParentheticals (ruling 3, the indexed-access convention)', () => {
  it('is silent for a name the page never prints (nothing to retrofit a parenthetical onto)', () => {
    const text = 'This page never mentions the leaked name at all.';
    expect(missingIndexedAccessParentheticals(['NeverPrinted'], text)).toEqual([]);
  });

  it('flags a printed name with no indexed-access expression anywhere near it', () => {
    const text = 'The `EditData.advisories` field is typed `AdvisoryNotice[]`, documented above.';
    expect(missingIndexedAccessParentheticals(['AdvisoryNotice'], text)).toEqual(['AdvisoryNotice']);
  });

  it('passes a printed name whose parenthetical sits later in the same prose paragraph', () => {
    const text = [
      '`LoginData` and `ConfirmData`, shown in the preceding signature for their shape, carry no',
      "export row of their own: a consumer reaches them as `Extract<AdminData, { view: 'login' }>['page']`",
      "and `Extract<AdminData, { view: 'confirm' }>['page']` respectively.",
    ].join('\n');
    expect(missingIndexedAccessParentheticals(['LoginData', 'ConfirmData'], text)).toEqual([]);
  });

  it('scopes a Types-table row to its own line: a marker on a different row does not excuse it', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      '| `ListData` | Extension API | `interface ListData { entries: EntrySummary[] }` | The list data. |',
      "| `Other` | Extension API | `interface Other {}` | Reaches `Foo['bar'][number]` elsewhere. |",
    ].join('\n');
    expect(missingIndexedAccessParentheticals(['EntrySummary'], text)).toEqual(['EntrySummary']);
  });

  it('passes a Types-table row that carries its own indexed-access parenthetical', () => {
    const text = [
      '| Name | Stability | Signature | Meaning |',
      '| --- | --- | --- | --- |',
      "| `ListData` | Extension API | `interface ListData { entries: EntrySummary[] }` | The list data. `EntrySummary` carries no export row of its own: a consumer reaches it as `Extract<AdminData, { view: 'list' }>['page']['entries'][number]`. |",
    ].join('\n');
    expect(missingIndexedAccessParentheticals(['EntrySummary'], text)).toEqual([]);
  });
});

describe('the indexed-access retrofit is complete on its two target pages (Task 5)', () => {
  // The corpus is derived, never hard-coded: every leak the check-surface-leaks registry
  // records against /sveltekit or /reproductions is a site this retrofit must cover.
  const leaks = loadRegistry();
  if (!leaks) throw new Error('check-surface-leaks.json failed to load');
  const sveltekitPage = resolve(ROOT, 'docs/reference/sveltekit.md');
  const reproductionsPage = resolve(ROOT, 'docs/reference/reproductions.md');
  const sveltekitText = readFileSync(sveltekitPage, 'utf8');
  const reproductionsText = readFileSync(reproductionsPage, 'utf8');

  it('derives a non-trivial corpus for /sveltekit (never a hard-coded count)', () => {
    expect(leakNamesForSubpath(leaks, '/sveltekit').length).toBeGreaterThan(20);
  });

  it('carries no missing parenthetical on sveltekit.md', () => {
    const names = leakNamesForSubpath(leaks, '/sveltekit');
    expect(missingIndexedAccessParentheticals(names, sveltekitText)).toEqual([]);
  });

  it('carries no missing parenthetical on reproductions.md', () => {
    const names = [
      ...leakNamesForSubpath(leaks, '/reproductions'),
      ...leakNamesForSubpath(leaks, '/reproductions/manifest'),
    ];
    expect(missingIndexedAccessParentheticals(names, reproductionsText)).toEqual([]);
  });

  it('is wired to fail via check:reference if the retrofit ever regresses', () => {
    // Reconstructs the shape a regression would take: a real subpath entry whose page prints a
    // recorded leak with no parenthetical. `fromB` already appears on `rescope-page-a.md`
    // (see the `checkOne` describe block above) with no indexed-access marker anywhere on the
    // page, so passing it through `leakNames` must surface it on `missingParenthetical`.
    const entry = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: fixture('rescope-page-a.md') };
    const pageKnownNames = new Set(['fromA']);
    const globalKnownNames = new Set(['fromA', 'fromB']);
    const result = checkOne({
      entry,
      pageKnownNames,
      globalKnownNamesSet: globalKnownNames,
      allowlist: [],
      leakNames: ['fromB'],
    });
    expect(result.missingParenthetical).toEqual(['fromB']);
  });

  it('does not require a parenthetical for a leak name the entry does not carry', () => {
    const entry = { subpath: '/a', dts: fixture('rescope-a.d.ts'), page: fixture('rescope-page-a.md') };
    const pageKnownNames = new Set(['fromA']);
    const globalKnownNames = new Set(['fromA', 'fromB']);
    const result = checkOne({
      entry,
      pageKnownNames,
      globalKnownNamesSet: globalKnownNames,
      allowlist: [],
      leakNames: [],
    });
    expect(result.missingParenthetical).toEqual([]);
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

describe('componentPropsNames (Task 7, the props-vs-reference clause)', () => {
  it('reads a local `interface Props` declaration', () => {
    expect(componentPropsNames(fixture('component-props-a.d.ts'))).toEqual(['bar', 'foo']);
  });

  it('falls back to a synthesized `$$ComponentProps` alias when there is no local Props interface', () => {
    // svelte-package emits this shape for a component whose $props() destructuring types its
    // shape inline (no local `interface Props`), such as HelpHome and WelcomeView.
    expect(componentPropsNames(fixture('component-props-b.d.ts'))).toEqual(['data']);
  });

  it('resolves inherited members through an `extends` composition, not just Props\' own', () => {
    // Mirrors MarkdownEditor's `interface Props extends StableEditorProps, UnstableEditorProps`:
    // Props itself declares no members, so a naive AST scan of only its own body would find none.
    expect(componentPropsNames(fixture('component-props-extends.d.ts'))).toEqual([
      'registerEditor',
      'spellcheckTest',
      'value',
    ]);
  });
});

describe('componentSectionWindow', () => {
  const pageText = readFileSync(fixture('component-props-page.md'), 'utf8');

  it('captures a component\'s own `### `Name`` section up to the next h2/h3', () => {
    const window = componentSectionWindow('CompA', pageText);
    expect(window).toContain('let { foo }');
    expect(window).not.toContain('CompC');
  });

  it('spans through an owned h4 sub-section (a wiring-props table under the same component)', () => {
    const window = componentSectionWindow('CompC', pageText);
    expect(window).toContain('registerEditor');
    expect(window).toContain('spellcheckTest');
  });

  it('returns null for a name with no heading on the page', () => {
    expect(componentSectionWindow('Nowhere', pageText)).toBeNull();
  });
});

describe('missingComponentProps', () => {
  it('flags a real Props key the component\'s own section never mentions (failing-first proof)', () => {
    const pageText = readFileSync(fixture('component-props-page.md'), 'utf8');
    const section = componentSectionWindow('CompA', pageText)!;
    expect(missingComponentProps(['foo', 'bar'], section)).toEqual(['bar']);
  });

  it('passes once every key is mentioned somewhere in the section', () => {
    const pageText = readFileSync(fixture('component-props-page.md'), 'utf8');
    const section = componentSectionWindow('CompC', pageText)!;
    expect(missingComponentProps(['registerEditor', 'spellcheckTest', 'value'], section)).toEqual([]);
  });
});

describe('promotedUnstableProps (ruling 1 / S-10: spellcheckTest pinned documented-unstable)', () => {
  const pageText = readFileSync(fixture('component-props-page.md'), 'utf8');
  const section = componentSectionWindow('CompC', pageText)!;
  const registry = [{ component: 'CompC', prop: 'spellcheckTest', reason: 'test-only pin.' }];

  it('holds the pin: the prop stays out of the stable snippet (the first fenced block)', () => {
    expect(promotedUnstableProps('CompC', section, registry)).toEqual([]);
  });

  it('flags a pin that crept into the stable snippet', () => {
    const promoted = [
      '### `CompC`',
      '',
      '```ts',
      'let { value, spellcheckTest }: { value: string; spellcheckTest?: unknown } = $props();',
      '```',
    ].join('\n');
    expect(promotedUnstableProps('CompC', promoted, registry)).toEqual(['spellcheckTest']);
  });

  it('ignores an entry for a different component', () => {
    const other = [{ component: 'SomeoneElse', prop: 'spellcheckTest', reason: 'unrelated.' }];
    expect(promotedUnstableProps('CompC', section, other)).toEqual([]);
  });
});

describe('assertDocumentedUnstableReasoned', () => {
  it('is reasoned: every real entry carries a non-empty reason', () => {
    expect(() => assertDocumentedUnstableReasoned(DOCUMENTED_UNSTABLE_PROPS)).not.toThrow();
  });

  it('rejects an entry with no reason (the fail-unless-recorded idiom)', () => {
    expect(() =>
      assertDocumentedUnstableReasoned([{ component: 'X', prop: 'y', reason: '' }]),
    ).toThrow(/no reason/);
  });

  it('pins MarkdownEditor.spellcheckTest, per ruling 1', () => {
    const entry = DOCUMENTED_UNSTABLE_PROPS.find(
      (e) => e.component === 'MarkdownEditor' && e.prop === 'spellcheckTest',
    );
    expect(entry).toBeTruthy();
  });
});

describe('checkComponentProps (composed)', () => {
  const pageText = readFileSync(fixture('component-props-page.md'), 'utf8');

  it('reports a real undocumented prop as missing', () => {
    const r = checkComponentProps('CompA', fixture('component-props-a.d.ts'), pageText);
    expect(r).toMatchObject({ component: 'CompA', missing: ['bar'], promoted: [], noSection: false });
  });

  it('reports clean for a fully documented component', () => {
    const r = checkComponentProps('CompC', fixture('component-props-extends.d.ts'), pageText);
    expect(r).toMatchObject({ component: 'CompC', missing: [], promoted: [], noSection: false });
  });

  it('reports noSection when the page carries no heading for the component at all', () => {
    const r = checkComponentProps('CompA', fixture('component-props-a.d.ts'), 'nothing about it here.');
    expect(r).toMatchObject({ component: 'CompA', missing: ['bar', 'foo'], noSection: true });
  });

  it('returns null for a component whose declaration carries no Props shape', () => {
    // A component with truly zero props is not among today's exported set, so this exercises the
    // null branch directly through a dts with neither known shape name (rescope-a.d.ts, a bare
    // value export fixture from the stale-names suite above).
    expect(componentPropsNames(fixture('rescope-a.d.ts'))).toBeNull();
    expect(checkComponentProps('fromA', fixture('rescope-a.d.ts'), pageText)).toBeNull();
  });

  // Round B: a MISSING declaration must throw, matching checkOne's own "run npm run package
  // first" for the index-wide case, rather than reading as "this component genuinely has zero
  // props" the way the existing-but-shapeless fixture above legitimately does.
  it('throws when the declaration file itself is missing, rather than returning null', () => {
    const missingPath = fixture('does-not-exist.d.ts');
    expect(() => checkComponentProps('Ghost', missingPath, pageText)).toThrow(/run "npm run package" first/);
  });
});

describe('the props gate is clean on the real /components surface (Task 7)', () => {
  // The corpus is the real exported component set, read the same way main() does: every default
  // export of dist/components/index.d.ts, diffed against its own section on components.md.
  const componentsEntry = CONFIG.find((e: { subpath: string }) => e.subpath === '/components')!;
  const indexPath = resolve(ROOT, componentsEntry.dts);
  const pageText = readFileSync(resolve(ROOT, componentsEntry.page), 'utf8');

  it(
    'finds no missing or promoted props on any real exported component',
    () => {
      const names = enumerateExports(indexPath);
      expect(names.length).toBeGreaterThan(10); // a corpus sanity floor, never a hard-coded list
      // /components also carries a plain type export or two (EditorApi) with no matching
      // `.svelte.d.ts`, by design; checkComponentProps now throws on a genuinely missing
      // declaration (round B), so this corpus is pre-filtered to real component exports the same
      // way main() is: by the *source* file, not the dist output, so a missing dist declaration
      // for a genuine component would still reach the throw rather than being silently dropped.
      const offenders = names
        .filter((name) => existsSync(resolve(ROOT, `src/lib/components/${name}.svelte`)))
        .map((name) => checkComponentProps(name, resolve(ROOT, `dist/components/${name}.svelte.d.ts`), pageText))
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .filter((r) => r.noSection || r.missing.length > 0 || r.promoted.length > 0);
      expect(offenders).toEqual([]);
    },
    // A fresh ts.createProgram per component (~19 of them) is slow under full-suite parallel
    // contention; the default 30s budget is tight even though a standalone run clears it easily.
    60000,
  );

  it('keeps MarkdownEditor\'s registerEditor free of any bare register* callback', () => {
    const names = componentPropsNames(resolve(ROOT, 'dist/components/MarkdownEditor.svelte.d.ts'))!;
    const bareRegisterCallbacks = names.filter((n) => n.startsWith('register') && n !== 'registerEditor');
    expect(bareRegisterCallbacks).toEqual([]);
    expect(names).toContain('registerEditor');
  });

  it('keeps spellcheckTest out of MarkdownEditor\'s stable snippet', () => {
    const section = componentSectionWindow('MarkdownEditor', pageText)!;
    expect(promotedUnstableProps('MarkdownEditor', section)).toEqual([]);
  });
});
