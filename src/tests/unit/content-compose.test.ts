import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension, ConceptConfig } from '../../lib/content/types.js';
import { testAdapter } from './_content-fixture.js';

describe('composeRuntime', () => {
  it('folds the adapter into a runtime carrying the normalized concepts and backend', () => {
    const runtime = composeRuntime(testAdapter);
    expect(runtime.siteName).toBe('Test');
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(runtime.render('x')).toBe('x');
  });

  // Seam 2 contract: an extension folds in additively, the same way the adapter does.
  it('folds an extension concept in after the adapter concepts', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      fields: [{ type: 'text', name: 'title', label: 'Title' }],
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    };
    const extension: CairnExtension = { content: { fragments } };
    const runtime = composeRuntime(testAdapter, [extension]);
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
  });

  // Seam 4 contract: the reserved asset slot passes through untouched.
  it('passes the reserved asset slot through, and omits it when absent', () => {
    expect(composeRuntime(testAdapter).assets).toBeUndefined();
    const withAssets: CairnAdapter = {
      ...testAdapter,
      assets: { roots: ['static/images'], publicBase: '/images' },
    };
    expect(composeRuntime(withAssets).assets).toEqual({ roots: ['static/images'], publicBase: '/images' });
  });
});
