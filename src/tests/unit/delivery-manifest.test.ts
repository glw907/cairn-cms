import { describe, it, expect } from 'vitest';
import { buildSiteManifest, buildLinkResolver } from '../../lib/delivery/manifest.js';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFields } from '../../lib/content/schema.js';
import type { SiteConfig } from '../../lib/nav/site-config.js';

const adapter = defineAdapter({
  siteName: 'T',
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }, { type: 'date', name: 'date', label: 'Date' }]) },
    pages: { dir: 'src/content/pages', label: 'Pages', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.c' },
  render: (md) => md,
});

const config: SiteConfig = {
  siteName: 'T',
  content: { posts: { permalink: '/:year/:month/:slug', datePrefix: 'day' }, pages: { permalink: '/:slug' } },
};

const globs = {
  posts: { '/src/content/posts/2026-01-04-guide.md': '---\ntitle: Guide\ndate: 2026-01-04\n---\n\n[about](cairn:pages/about)\n' },
  pages: { '/src/content/pages/about.md': '---\ntitle: About\n---\n\nHi.\n' },
};

// A posts concept whose validate requires a non-empty title, so an empty-title file fails.
const requiredTitleAdapter = defineAdapter({
  siteName: 'T',
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }, { type: 'date', name: 'date', label: 'Date' }]) },
    pages: { dir: 'src/content/pages', label: 'Pages', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.c' },
  render: (md) => md,
});

describe('buildSiteManifest', () => {
  it('builds one entry per file across concepts with edges', () => {
    const manifest = buildSiteManifest(adapter, config, globs);
    const keys = manifest.entries.map((e) => `${e.concept}/${e.id}`).sort();
    expect(keys).toEqual(['pages/about', 'posts/2026-01-04-guide']);
    const guide = manifest.entries.find((e) => e.id === '2026-01-04-guide');
    expect(guide?.permalink).toBe('/2026/01/guide');
    expect(guide?.links).toEqual([{ concept: 'pages', id: 'about' }]);
  });

  it('excludes a file whose frontmatter fails validation', () => {
    const manifest = buildSiteManifest(requiredTitleAdapter, config, {
      posts: {
        'src/content/posts/2026-01-01-good.md': '---\ntitle: Good\ndate: 2026-01-01\n---\nbody',
        'src/content/posts/2026-01-02-bad.md': '---\ntitle: ""\ndate: 2026-01-02\n---\nbody',
      },
      pages: {},
    });
    const ids = manifest.entries.map((e) => e.id);
    expect(ids).toContain('2026-01-01-good');
    expect(ids).not.toContain('2026-01-02-bad');
  });
});

describe('buildLinkResolver', () => {
  it('resolves a known target and throws on a miss', () => {
    const { site } = createSiteIndexes(adapter, config, globs);
    const resolve = buildLinkResolver(site);
    expect(resolve({ concept: 'pages', id: 'about' })).toBe('/about');
    expect(() => resolve({ concept: 'posts', id: 'missing' })).toThrow(/cairn:posts\/missing/);
  });
});
