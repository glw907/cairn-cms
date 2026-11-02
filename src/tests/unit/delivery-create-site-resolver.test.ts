import { describe, it, expect, expectTypeOf } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { buildSiteManifest } from '../../lib/delivery/manifest.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { fields } from '../../lib/content/fields.js';
import { defineFieldset } from '../../lib/content/fieldset.js';

const wiring = {
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'noreply@test.example' },
  rendering: { render: ({ body }: { body: string }) => Promise.resolve(body) },
};

const adapter = defineAdapter({
  content: {
    posts: {
      dir: 'src/content/posts',
      routing: 'feed',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      }),
    },
    pages: {
      dir: 'src/content/pages',
      fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }),
    },
  },
  ...wiring,
});

const post = { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' };
const files = { ...post, '/src/content/pages/about.md': '---\ntitle: About\n---\nThe about page.' };

describe('createSiteResolver', () => {
  it('buckets one glob into one typed index per concept', () => {
    const site = createSiteResolver(adapter, files);
    expect(site.concept('posts').byId('2026-01-05-hello')?.frontmatter.title).toBe('Hello');
    expect(site.concept('pages').all().map((p) => p.id)).toEqual(['about']);
  });

  it('resolves across concepts for the catch-all route', () => {
    const site = createSiteResolver(adapter, files);
    expect(site.byPermalink('/posts/hello')?.id).toBe('2026-01-05-hello');
    expect(site.paths().map((e) => e.path).sort()).toEqual(['about', 'posts/hello']);
  });

  it('types each concept frontmatter from its schema', () => {
    const entry = createSiteResolver(adapter, files).concept('posts').byId('2026-01-05-hello');
    if (entry) expectTypeOf(entry.frontmatter).toEqualTypeOf<{ title: string; date?: string }>();
  });

  it('allows a concept named site, now that the resolver reserves no key', () => {
    const site = createSiteResolver(
      defineAdapter({
        ...wiring,
        content: {
          site: {
            dir: 'src/content/site',
            fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }),
          },
        },
      }),
      { '/src/content/site/home.md': '---\ntitle: Home\n---\nBody.' },
    );
    expect(site.concept('site').all().map((e) => e.id)).toEqual(['home']);
  });
});

describe('content file bucketing', () => {
  it('throws naming the path and the declared dirs for a file under no concept', () => {
    const stray = { ...files, '/src/content/stray.md': '---\ntitle: Stray\n---\nBody.' };
    const message = `cairn: content file "/src/content/stray.md" sits under no concept's dir. Declared dirs: src/content/posts, src/content/pages`;
    expect(() => createSiteResolver(adapter, stray)).toThrowError(message);
    expect(() => buildSiteManifest(adapter, stray)).toThrowError(message);
  });

  it('refuses a file nested below a concept dir', () => {
    const nested = { ...files, '/src/content/posts/2026/2026-01-06-deep.md': '---\ntitle: Deep\n---\nBody.' };
    expect(() => createSiteResolver(adapter, nested)).toThrowError(/2026-01-06-deep\.md.*sits under no concept/);
  });

  it('refuses the relative glob form, whose keys climb out of the app root', () => {
    const relative = { '../content/posts/2026-01-05-hello.md': post['/src/content/posts/2026-01-05-hello.md'] };
    expect(() => createSiteResolver(adapter, relative)).toThrowError(/sits under no concept/);
  });

  it('throws naming the concept for a dir outside src/content', () => {
    const outside = defineAdapter({
      ...wiring,
      content: { ...adapter.content, events: { dir: 'content/posts', fields: adapter.content.pages.fields } },
    });
    const message = 'cairn: concept "events" dir "content/posts" is outside src/content';
    expect(() => createSiteResolver(outside, files)).toThrowError(message);
    expect(() => buildSiteManifest(outside, files)).toThrowError(message);
  });

  it('reads a concept with no files as an empty index beside a populated one', () => {
    const site = createSiteResolver(adapter, post);
    expect(site.concept('pages').all()).toHaveLength(0);
    expect(site.concept('posts').all().map((p) => p.id)).toEqual(['2026-01-05-hello']);
  });
});
