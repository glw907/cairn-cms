import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

// The showcase's own `pages` concept is the concrete example named in the C6 fix (the
// "New Pages" defect): a concept declared without `singular` falls back to its plural `label`
// at ConceptList's create affordances, so the showcase's reference config must set one, exactly
// as `posts` already does a few lines above it. A plain text read (rather than importing the
// module) sidesteps the showcase's own `$theme`/`$chassis` Vite aliases, which this root
// project's vitest config does not resolve.
describe('the showcase pages concept', () => {
  it('declares an explicit singular so the create button reads "New page", not "New Pages"', () => {
    const configSrc = readFileSync(resolve(ROOT, 'examples/showcase/src/theme/cairn.config.ts'), 'utf8');
    const pagesBlock = configSrc.match(/pages:\s*defineConcept\(\{[\s\S]*?\n\s{4}\}\),/);
    expect(pagesBlock).not.toBeNull();
    expect(pagesBlock?.[0]).toMatch(/singular:\s*'page'/);
  });
});
