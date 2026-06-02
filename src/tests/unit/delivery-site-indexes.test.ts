import { describe, it, expect, expectTypeOf } from 'vitest';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFields } from '../../lib/content/schema.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';

const adapter = defineAdapter({
  siteName: 'Test',
  content: {
    posts: {
      dir: 'src/content/posts',
      schema: defineFields([
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'date', type: 'date', label: 'Date' },
      ]),
    },
    pages: {
      dir: 'src/content/pages',
      schema: defineFields([{ name: 'title', type: 'text', label: 'Title', required: true }]),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
});

const config = parseSiteConfig('siteName: Test\nmenus:\n  primary: []\n');

const indexes = createSiteIndexes(adapter, config, {
  posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
  pages: { '/src/content/pages/about.md': '---\ntitle: About\n---\nThe about page.' },
});

describe('createSiteIndexes', () => {
  it('builds one typed index per concept', () => {
    expect(indexes.posts.byId('2026-01-05-hello')?.frontmatter.title).toBe('Hello');
    expect(indexes.pages.all().map((p) => p.id)).toEqual(['about']);
  });

  it('exposes a site resolver for the catch-all route', () => {
    expect(indexes.site.byPermalink('/posts/hello')?.id).toBe('2026-01-05-hello');
    expect(indexes.site.entries().map((e) => e.path).sort()).toEqual(['about', 'posts/hello']);
  });

  it('types each concept frontmatter from its schema', () => {
    const entry = indexes.posts.byId('2026-01-05-hello');
    if (entry) expectTypeOf(entry.frontmatter).toEqualTypeOf<{ title: string; date?: string }>();
  });
});
