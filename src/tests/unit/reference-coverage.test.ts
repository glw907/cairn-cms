import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { enumerateExports, missingNames } from '../../../scripts/reference-coverage.mjs';

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
