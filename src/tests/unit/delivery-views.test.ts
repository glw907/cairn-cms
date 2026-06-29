import { describe, it, expect } from 'vitest';
import { feedView, sitemapView } from '../../lib/delivery/views.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import type { ConceptIndex } from '../../lib/delivery/site-resolver.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

const ORIGIN = 'https://example.com';

const descriptors = normalizeConcepts({
  posts: {
    dir: 'posts',
    routing: 'feed',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
      date: fields.date({ label: 'Date' }),
      topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
    }),
  },
  pages: {
    dir: 'pages',
    routing: 'page',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
    }),
  },
  fragments: {
    dir: 'fragments',
    routing: 'embedded',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
    }),
  },
});

function indexFor(descriptor: ConceptDescriptor, record: Record<string, string>): ConceptIndex {
  return { descriptor, index: createContentIndex(fromGlob(record), descriptor) };
}

function site() {
  const concepts: ConceptIndex[] = [
    indexFor(descriptors[0], {
      '/src/content/posts/hello.md': '---\ntitle: Hello\ndate: 2026-05-09\ntopics: [svelte, kit]\n---\n\nA post body.',
    }),
    indexFor(descriptors[1], {
      '/src/content/pages/about.md': '---\ntitle: About\n---\n\nAbout body.',
    }),
    indexFor(descriptors[2], {
      '/src/content/fragments/snippet.md': '---\ntitle: Snippet\n---\n\nFragment body.',
    }),
  ];
  return createSiteResolver(concepts);
}

describe('feedView', () => {
  it('returns only the inFeeds concept items, each with its taxonomy tags and an absolute url', () => {
    const items = feedView(site(), descriptors, ORIGIN);
    expect(items.map((i) => i.title)).toEqual(['Hello']);
    expect(items[0].url).toBe('https://example.com/posts/hello');
    expect(items[0].tags).toEqual(['svelte', 'kit']);
    expect(items[0].summary).toBe('A post body.');
  });

  it('is summary-only and carries no full content html', () => {
    const items = feedView(site(), descriptors, ORIGIN);
    expect(items[0].contentHtml).toBeUndefined();
  });
});

describe('sitemapView', () => {
  it('returns the routable concept URLs (feed and page) but not the embedded concept', () => {
    const urls = sitemapView(site(), descriptors, ORIGIN);
    expect(urls.map((u) => u.loc).sort()).toEqual([
      'https://example.com/about',
      'https://example.com/posts/hello',
    ]);
    expect(urls.some((u) => u.loc.includes('snippet'))).toBe(false);
  });

  it('sets lastmod from the entry date', () => {
    const urls = sitemapView(site(), descriptors, ORIGIN);
    const post = urls.find((u) => u.loc.endsWith('/posts/hello'));
    expect(post?.lastmod).toBe('2026-05-09');
  });
});
