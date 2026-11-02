import { describe, it, expect, expectTypeOf } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineConcept } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import type { SiteResolver } from '../../lib/delivery/site-resolver.js';
import type { ContentIndex } from '../../lib/delivery/content-index.js';

const adapter = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      routing: 'dated',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      },
    }),
    notes: defineConcept({
      dir: 'src/content/notes',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        rank: fields.number({ label: 'Rank' }),
        status: fields.select({ label: 'Status', options: ['open', 'closed'] }),
      },
      summaryFields: ['status'],
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        lede: fields.text({ label: 'Lede' }),
      },
    }),
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'noreply@test.example' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
});

const site = createSiteResolver(adapter, {
  '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.',
  '/src/content/pages/about.md': '---\ntitle: About\n---\nThe about page.',
});

/** Takes the default resolver, the parameter type `createFragmentResolver` and its kin declare. */
function pathsOf(resolver: SiteResolver): { path: string }[] {
  return resolver.paths();
}

describe('SiteResolver<A>', () => {
  it('types a declared concept from its fieldset and never as undefined', () => {
    const posts = site.concept('posts');
    expectTypeOf(posts.byId('2026-01-05-hello')!.frontmatter).toEqualTypeOf<{ title: string; date?: string }>();
    expect(posts.all().map((p) => p.id)).toEqual(['2026-01-05-hello']);
  });

  it('types a plain-record concept over a required text, an optional number, and a select union', () => {
    const read = () => site.concept('notes').byId('a')!.frontmatter;
    expectTypeOf(read).returns.toEqualTypeOf<{
      title: string;
      rank?: number;
      status?: 'open' | 'closed';
    }>();
  });

  it('refuses a summaryFields key no field declares', () => {
    defineConcept({
      dir: 'src/content/notes',
      fields: { title: fields.text({ label: 'Title' }) },
      // @ts-expect-error `lede` is not a key of this concept's fields.
      summaryFields: ['lede'],
    });
  });

  it('refuses an id the adapter does not declare', () => {
    // @ts-expect-error `events` is not a key of this adapter's content.
    expect(site.concept('events')).toBeUndefined();
  });

  it('refuses a field that belongs to the other concept', () => {
    const entry = site.concept('posts').byId('2026-01-05-hello')!;
    // @ts-expect-error `lede` is declared on pages, not posts.
    expect(entry.frontmatter.lede).toBeUndefined();
  });

  it('assigns to the default resolver as a value and as an argument', () => {
    const wide: SiteResolver = site;
    expect(wide.concept('posts')?.all()).toHaveLength(1);
    expect(pathsOf(site).map((p) => p.path).sort()).toEqual(['about', 'posts/hello']);
  });

  it('leaves the default resolver reading any id as possibly undefined', () => {
    const wide: SiteResolver = site;
    expectTypeOf(wide.concept('anything')).toEqualTypeOf<ContentIndex | undefined>();
    expect(wide.concept('anything')).toBeUndefined();
  });
});
