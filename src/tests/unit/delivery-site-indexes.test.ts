import { describe, it, expect, expectTypeOf } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import type { SiteGlobs } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = defineAdapter({
  content: {
    posts: {
      dir: 'src/content/posts',
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      }),
    },
    pages: {
      dir: 'src/content/pages',
      fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
    },
  },
  backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'noreply@test.example' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
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

describe('createSiteIndexes build-time guards', () => {
  it('throws naming the concept when its glob key is absent', () => {
    expect(() =>
      createSiteIndexes(adapter, config, {
        posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
      }),
    ).toThrowError(/pages/);
  });

  it('allows a present-but-empty glob record as an empty concept', () => {
    const indexes = createSiteIndexes(adapter, config, {
      posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
      pages: {},
    });
    expect(indexes.pages.all()).toEqual([]);
    expect(indexes.posts.all().map((p) => p.id)).toEqual(['2026-01-05-hello']);
  });

  it('throws when a concept is named site, the reserved resolver key', () => {
    // `site` is the reserved resolver key. CairnAdapter.content is an open record, so a "site"
    // concept is declarable; the build-time guard rejects it. The cast keeps the SiteGlobs key
    // typing aligned for the createSiteIndexes call below.
    const siteAdapter = defineAdapter({
      content: {
        site: {
          dir: 'src/content/site',
          fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
        },
      } as CairnAdapter['content'],
      backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
      email: { from: 'noreply@test.example' },
      rendering: { render: ({ body }) => Promise.resolve(body) },
    });
    expect(() =>
      createSiteIndexes(siteAdapter, config, { site: {} } as SiteGlobs<typeof siteAdapter>),
    ).toThrowError(/reserved/);
  });
});
