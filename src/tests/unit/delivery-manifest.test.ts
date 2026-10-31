import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { buildSiteManifest } from '../../lib/delivery/manifest.js';
import { createLinkResolver } from '../../lib/delivery/site-resolver.js';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { fields } from '../../lib/content/fields.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import type { SiteConfig } from '../../lib/nav/site-config.js';

const adapter = defineAdapter({
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', routing: 'feed', permalink: '/:year/:month/:slug', datePrefix: 'day', fields: defineFieldset({ title: fields.text({ label: 'Title' }), date: fields.date({ label: 'Date' }) }) },
    pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: defineFieldset({ title: fields.text({ label: 'Title' }) }) },
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.c' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
});

const config: SiteConfig = { siteName: 'T' };

const globs = {
  posts: { '/src/content/posts/2026-01-04-guide.md': '---\ntitle: Guide\ndate: 2026-01-04\n---\n\n[about](cairn:pages/about)\n' },
  pages: { '/src/content/pages/about.md': '---\ntitle: About\n---\n\nHi.\n' },
};

// A posts concept whose validate requires a non-empty title, so an empty-title file fails.
const requiredTitleAdapter = defineAdapter({
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', routing: 'feed', permalink: '/:year/:month/:slug', datePrefix: 'day', fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }), date: fields.date({ label: 'Date' }) }) },
    pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: defineFieldset({ title: fields.text({ label: 'Title' }) }) },
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.c' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
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

  it('carries a summary on each built entry', () => {
    const manifest = buildSiteManifest(adapter, config, globs);
    const about = manifest.entries.find((e) => e.id === 'about');
    // No description, so the summary is the body excerpt.
    expect(about?.summary).toBe('Hi.');
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

describe('createLinkResolver', () => {
  it('resolves a known target and throws on a miss', () => {
    const { site } = createSiteIndexes(adapter, config, globs);
    const resolve = createLinkResolver(site);
    expect(resolve({ concept: 'pages', id: 'about' })).toBe('/about');
    expect(() => resolve({ concept: 'posts', id: 'missing' })).toThrow(/cairn:posts\/missing/);
  });

  // Fragments Task 3, spec §1 "not a link target": a fragment is included, never linked, and its
  // gated permalink would 404. The build resolver must treat a cairn: ref to a non-routable
  // concept's entry as a miss, the same dangling-link backstop as an unknown id.
  it('treats a cairn: ref to a non-routable concept as a miss (the dangling-link backstop)', () => {
    const fragmentsAdapter = defineAdapter({
      content: {
        pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: defineFieldset({ title: fields.text({ label: 'Title' }) }) },
        fragments: { dir: 'src/content/fragments', label: 'Fragments', routing: 'embedded', fields: defineFieldset({ title: fields.text({ label: 'Title' }) }) },
      },
      backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
      email: { from: 'a@b.c' },
      rendering: { render: ({ body }) => Promise.resolve(body) },
    });
    const { site } = createSiteIndexes(fragmentsAdapter, config, {
      pages: globs.pages,
      fragments: { 'src/content/fragments/address.md': '---\ntitle: Address\n---\n\nBody.' },
    });
    const resolve = createLinkResolver(site);
    expect(() => resolve({ concept: 'fragments', id: 'address' })).toThrow(/cairn:fragments\/address/);
  });
});

describe('buildSiteManifest undeclared frontmatter keys', () => {
  afterEach(() => vi.restoreAllMocks());

  /** The `content.field_undeclared` records the build wrote through the log chokepoint. */
  function undeclaredWarnings(spy: { mock: { calls: unknown[][] } }): Record<string, unknown>[] {
    return spy.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter((record) => record.event === 'content.field_undeclared');
  }

  it('warns once for a concept whose entries carry a key its schema does not declare', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildSiteManifest(adapter, config, {
      posts: globs.posts,
      pages: {
        '/src/content/pages/a.md': '---\ntitle: A\nrobots: noindex\n---\n\nA.\n',
        '/src/content/pages/b.md': '---\ntitle: B\nrobots: noindex\n---\n\nB.\n',
      },
    });
    const records = undeclaredWarnings(warn);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ level: 'warn', concept: 'pages', keys: ['robots'] });
  });

  it('warns once per entry it skips as invalid, a draft included', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manifest = buildSiteManifest(requiredTitleAdapter, config, {
      posts: {
        '/src/content/posts/2026-01-04-live.md': '---\ntitle: Live\ndate: 2026-01-04\n---\n\nOK.\n',
        '/src/content/posts/2026-01-05-broken.md': '---\ntitle: ""\ndate: 2026-01-05\ndraft: true\n---\n\nNo title.\n',
        '/src/content/posts/2026-01-06-broken-too.md': '---\ntitle: ""\ndate: 2026-01-06\n---\n\nNo title.\n',
      },
      pages: globs.pages,
    });
    expect(manifest.entries.filter((e) => e.concept === 'posts').map((e) => e.id)).toEqual(['2026-01-04-live']);
    const records = warn.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter((record) => record.event === 'content.entry_invalid');
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      scope: 'manifest',
      concept: 'posts',
      path: '/src/content/posts/2026-01-05-broken.md',
      draft: true,
    });
    expect(records[1]).toMatchObject({ draft: false });
  });

  it('stays silent for a concept with no undeclared keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildSiteManifest(adapter, config, globs);
    expect(undeclaredWarnings(warn)).toEqual([]);
  });
});
