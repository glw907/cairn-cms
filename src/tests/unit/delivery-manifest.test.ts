import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { buildSiteManifest } from '../../lib/delivery/manifest.js';
import { createLinkResolver, createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineComponent, defineRegistry } from '../../lib/render/registry.js';
import { verifyEntries } from '../../lib/content/manifest.js';
import { fields } from '../../lib/content/fields.js';

const adapter = defineAdapter({
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', routing: 'dated', permalink: '/:year/:month/:slug', datePrefix: 'day', fields: { title: fields.text({ label: 'Title' }), date: fields.date({ label: 'Date' }) } },
    pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: { title: fields.text({ label: 'Title' }) } },
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.c' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
});

const aboutPage = { '/src/content/pages/about.md': '---\ntitle: About\n---\n\nHi.\n' };
const files = {
  '/src/content/posts/2026-01-04-guide.md': '---\ntitle: Guide\ndate: 2026-01-04\n---\n\n[about](cairn:pages/about)\n',
  ...aboutPage,
};

// A posts concept whose validate requires a non-empty title, so an empty-title file fails.
const requiredTitleAdapter = defineAdapter({
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', routing: 'dated', permalink: '/:year/:month/:slug', datePrefix: 'day', fields: { title: fields.text({ label: 'Title', required: true }), date: fields.date({ label: 'Date' }) } },
    pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: { title: fields.text({ label: 'Title' }) } },
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.c' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
});

describe('buildSiteManifest', () => {
  it('builds one entry per file across concepts with edges', () => {
    const { manifest } = buildSiteManifest(adapter, files);
    const keys = manifest.entries.map((e) => `${e.concept}/${e.id}`).sort();
    expect(keys).toEqual(['pages/about', 'posts/2026-01-04-guide']);
    const guide = manifest.entries.find((e) => e.id === '2026-01-04-guide');
    expect(guide?.permalink).toBe('/2026/01/guide');
    expect(guide?.links).toEqual([{ concept: 'pages', id: 'about' }]);
  });

  it('carries an excerpt on each built entry', () => {
    const { manifest } = buildSiteManifest(adapter, files);
    const about = manifest.entries.find((e) => e.id === 'about');
    // No description, so the excerpt comes from the body.
    expect(about?.excerpt).toBe('Hi.');
  });

  it('excludes a file whose frontmatter fails validation', () => {
    const { manifest } = buildSiteManifest(requiredTitleAdapter, {
      'src/content/posts/2026-01-01-good.md': '---\ntitle: Good\ndate: 2026-01-01\n---\nbody',
      'src/content/posts/2026-01-02-bad.md': '---\ntitle: ""\ndate: 2026-01-02\n---\nbody',
    });
    const ids = manifest.entries.map((e) => e.id);
    expect(ids).toContain('2026-01-01-good');
    expect(ids).not.toContain('2026-01-02-bad');
  });
});

describe('createLinkResolver', () => {
  it('resolves a known target and throws on a miss', () => {
    const site = createSiteResolver(adapter, files);
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
        pages: { dir: 'src/content/pages', label: 'Pages', permalink: '/:slug', fields: { title: fields.text({ label: 'Title' }) } },
        fragments: { dir: 'src/content/fragments', label: 'Fragments', routing: 'embedded', fields: { title: fields.text({ label: 'Title' }) } },
      },
      backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
      email: { from: 'a@b.c' },
      rendering: { render: ({ body }) => Promise.resolve(body) },
    });
    const site = createSiteResolver(fragmentsAdapter, {
      ...aboutPage,
      '/src/content/fragments/address.md': '---\ntitle: Address\n---\n\nBody.',
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
    buildSiteManifest(adapter, {
      ...files,
      '/src/content/pages/a.md': '---\ntitle: A\nrobots: noindex\n---\n\nA.\n',
      '/src/content/pages/b.md': '---\ntitle: B\nrobots: noindex\n---\n\nB.\n',
    });
    const records = undeclaredWarnings(warn);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ level: 'warn', concept: 'pages', keys: ['robots'] });
  });

  it('warns once per entry it skips as invalid, a draft included', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { manifest } = buildSiteManifest(requiredTitleAdapter, {
      '/src/content/posts/2026-01-04-live.md': '---\ntitle: Live\ndate: 2026-01-04\n---\n\nOK.\n',
      '/src/content/posts/2026-01-05-broken.md': '---\ntitle: ""\ndate: 2026-01-05\ndraft: true\n---\n\nNo title.\n',
      '/src/content/posts/2026-01-06-broken-too.md': '---\ntitle: ""\ndate: 2026-01-06\n---\n\nNo title.\n',
      ...aboutPage,
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
    buildSiteManifest(adapter, files);
    expect(undeclaredWarnings(warn)).toEqual([]);
  });
});

describe('buildSiteManifest problems', () => {
  afterEach(() => vi.restoreAllMocks());

  const post = (body: string, frontmatter = '') =>
    `---\ntitle: T\ndate: 2026-01-04\n${frontmatter}---\n\n${body}\n`;
  const target = { '/src/content/posts/one.md': post('Target.') };

  /** The errors reported for a post holding `body`, with whether its row survived. */
  function scan(body: string) {
    const path = '/src/content/posts/2026-01-04-probe.md';
    const { manifest, problems } = buildSiteManifest(adapter, { ...target, [path]: post(body) });
    return {
      errors: problems.find((p) => p.path === path)?.errors,
      kept: manifest.entries.some((e) => e.id === '2026-01-04-probe'),
    };
  }

  it('reports an invalid filename and keeps the row', () => {
    const path = '/src/content/pages/My_Trip.md';
    const { manifest, problems } = buildSiteManifest(adapter, { [path]: '---\ntitle: Trip\n---\n\nHi.\n' });
    expect(problems).toEqual([
      {
        concept: 'pages',
        id: 'My_Trip',
        path,
        draft: false,
        errors: { filename: 'My_Trip.md is not a valid entry filename: use lowercase letters, digits, and single hyphens' },
      },
    ]);
    expect(manifest.entries.map((e) => e.id)).toEqual(['My_Trip']);
  });

  it.each([
    ['a reference definition', '[a][r]\n\n[r]: cairn:posts/one', 'cairn:posts/one'],
    ['an html anchor', '<a href="cairn:posts/one">a</a>', 'cairn:posts/one'],
    ['a malformed inline token', '[a](cairn:bad)', 'cairn:bad'],
    ['a directive attribute', ':::cta{href="cairn:posts/one"}\nGo.\n:::', 'cairn:posts/one'],
    ['an html image', '<img src="cairn:x">', 'cairn:x'],
    ['a markdown image', '![a](cairn:posts/one)', 'cairn:posts/one'],
    ['a single-quoted href', "<a href='cairn:posts/one'>a</a>", 'cairn:posts/one'],
    ['a tag spanning two lines', '<a class="x"\n  href="cairn:posts/one">a</a>', 'cairn:posts/one'],
  ])('reports %s and keeps the row', (_name, body, href) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(scan(body)).toEqual({ errors: { body: `cairn: link can't resolve: ${href}` }, kept: true });
  });

  it.each([
    ['a good inline token', '[a](cairn:posts/one)'],
    ['a token in a code fence', '```\n[a](cairn:bad)\n<a href="cairn:posts/one">\n```'],
    ['a token in an html comment', '<!-- <a href="cairn:posts/old">gone</a> -->'],
    ['a token between tags', '<pre><code>href="cairn:posts/one"</code></pre>'],
  ])('reports nothing for %s', (_name, body) => {
    expect(scan(body)).toEqual({ errors: undefined, kept: true });
  });

  it('flags a draft, which verifyEntries passes', () => {
    const { problems } = buildSiteManifest(adapter, {
      '/src/content/posts/2026-01-04-probe.md': post('[a](cairn:bad)', 'draft: true\n'),
    });
    expect(problems).toMatchObject([{ draft: true }]);
    expect(() => verifyEntries(problems)).not.toThrow();
  });

  it('merges a validator failure into the problem and drops the row', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { manifest, problems } = buildSiteManifest(requiredTitleAdapter, {
      '/src/content/posts/Bad_Name.md': '---\ntitle: ""\ndate: 2026-01-04\n---\n\n[a](cairn:bad)\n',
    });
    expect(manifest.entries).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(Object.keys(problems[0].errors).sort()).toEqual(['body', 'filename', 'title']);
  });

  it('counts non-draft problems and lists one line per error', () => {
    const problem = { concept: 'posts', path: 'p', draft: false, errors: { title: 'Required', body: 'Bad' } };
    expect(() =>
      verifyEntries([{ ...problem, id: 'a' }, { ...problem, id: 'b', errors: { title: 'Required' } }, { ...problem, id: 'c', draft: true }]),
    ).toThrowError('cairn: 2 invalid entries:\nposts/a: title: Required\nposts/a: body: Bad\nposts/b: title: Required');
  });
});

describe('buildSiteManifest directive check', () => {
  afterEach(() => vi.restoreAllMocks());

  const registered = defineAdapter({
    content: adapter.content,
    backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    email: { from: 'a@b.c' },
    rendering: {
      render: ({ body }) => Promise.resolve(body),
      components: defineRegistry({
        components: [defineComponent({ name: 'callout', label: 'Callout', description: 'd', build: (ctx) => ctx.node, slots: [{ name: 'item', label: 'Item', kind: 'markdown' }] })],
      }),
    },
  });

  /** The `content.directive_unknown` records written for a page holding `body`. */
  function unknownDirectives(body: string): Record<string, unknown>[] {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildSiteManifest(registered, { '/src/content/pages/probe.md': `---\ntitle: P\n---\n\n${body}\n` });
    return warn.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter((record) => record.event === 'content.directive_unknown');
  }

  it('warns on a name nothing registers', () => {
    expect(unknownDirectives(':::calout\nHi.\n:::')).toEqual([
      expect.objectContaining({ level: 'warn', concept: 'pages', path: '/src/content/pages/probe.md', name: 'calout' }),
    ]);
  });

  it.each([
    ['a registered name', ':::callout\nHi.\n:::'],
    ['a slot name', '::::callout\n:::item\nHi.\n:::\n::::'],
    ['an include', '::include{fragment="x"}'],
    ['a figure', ':::figure\n![a](media:x)\n:::'],
    ['a text directive', 'A :word in prose.'],
  ])('stays silent for %s', (_name, body) => {
    expect(unknownDirectives(body)).toEqual([]);
  });
});
