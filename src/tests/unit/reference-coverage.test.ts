import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  enumerateExports,
  missingNames,
  hasTierMarker,
  untaggedNames,
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
