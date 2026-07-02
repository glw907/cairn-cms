import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  enumerateExports,
  missingNames,
  hasTierMarker,
  untaggedNames,
  staleNames,
} from '../../../scripts/reference-coverage.mjs';

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
      'interface AssetConfig {',
      '  variants?: Record<string, VariantSpec>;',
      '}',
      '',
      'interface VariantSpec {',
      '  width?: number;',
      '}',
      '```',
    ].join('\n');
    expect(staleNames(['AssetConfig'], text)).toEqual([]);
  });

  it('does not flag a real export mentioned only in ordinary prose', () => {
    const text = 'This page mentions `SomeOtherExport` only in a sentence, never as a heading or row.';
    expect(staleNames(['SomeOtherExport'], text)).toEqual([]);
  });
});
