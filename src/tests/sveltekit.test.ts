import { describe, it, expect } from 'vitest';
import { adminLayoutLoad } from '../lib/sveltekit';
import type { CairnAdapter } from '../lib/adapter';

// A fixture adapter with two folder collections, mirroring ecnordic's shape.
const adapter: CairnAdapter = {
  siteName: 'Test Site',
  sender: 'noreply@test',
  backend: { owner: 'o', repo: 'r', branch: 'main' },
  preview: { remarkPlugins: [], rehypePlugins: [] },
  collections: [
    { type: 'posts', label: 'Posts', dir: 'src/content/posts', fields: [], validate: (d) => d },
    { type: 'pages', label: 'Pages', dir: 'src/content/pages', fields: [], validate: (d) => d },
  ],
};

describe('adminLayoutLoad', () => {
  it('returns branding, session, pathname, and the collection nav list', () => {
    const data = adminLayoutLoad(
      { locals: { user: null }, url: new URL('https://x/admin/posts') },
      adapter,
    );
    expect(data.siteName).toBe('Test Site');
    expect(data.pathname).toBe('/admin/posts');
    expect(data.collections).toEqual([
      { type: 'posts', label: 'Posts' },
      { type: 'pages', label: 'Pages' },
    ]);
  });
});
