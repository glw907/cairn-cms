import { describe, it, expect } from 'vitest';
import { createPublicRoutes, composeEntryData } from '../../lib/delivery/public-routes.js';
import { buildSiteResolver } from '../../lib/delivery/site-resolver.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { MediaResolve } from '../../lib/render/resolve-media.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'p',
    routing: 'dated',
    permalink: '/:year/:month/:day/:slug',
    datePrefix: 'day',
    fields: { date: fields.date({ label: 'Date' }), tags: fields.multiselect({ label: 'Tags', taxonomy: true }) },
  },
});
const [pages] = normalizeConcepts({ pages: { dir: 'g', fields: {} } });

const site = buildSiteResolver([
  { descriptor: posts, index: createContentIndex([
    { path: '/p/2026-02-01-a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
    { path: '/p/2026-01-01-b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
  ], posts) },
  { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' }], pages) },
]);

const routes = createPublicRoutes({ site, render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`), origin: 'https://example.com', siteName: 'Test', description: 'Test description.', resolveMedia: null });

describe('createPublicRoutes entryLoad', () => {
  it('resolves a dated Posts URL to its entry by pathname', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(data.entry.id).toBe('2026-02-01-a');
    expect(data.html).toBe('<r>Body A.</r>');
    expect(data.canonicalUrl).toBe('https://example.com/2026/02/01/a');
  });

  it('resolves a flat Pages URL through the same route', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(data.entry.id).toBe('about');
  });

  it('carries the resolved concept on the entry', async () => {
    const post = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(post.concept).toBe('posts');
    const page = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(page.concept).toBe('pages');
  });

  it('throws a 404 for an unknown path', async () => {
    await expect(routes.entryLoad({ url: new URL('https://example.com/missing') })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('exposes the entry loader, the prerender enumeration, and the markdown twin surface only', () => {
    const surface = routes as unknown as Record<string, unknown>;
    expect(surface.archiveLoad).toBeUndefined();
    expect(surface.tagIndexLoad).toBeUndefined();
    expect(surface.tagLoad).toBeUndefined();
    expect(Object.keys(routes).sort()).toEqual(['entries', 'entryLoad', 'markdownEntries', 'markdownLoad']);
  });

  it('entries enumerates every entry path across concepts', () => {
    expect(routes.entries().map((e) => e.path).sort()).toEqual([
      '2026/01/01/b',
      '2026/02/01/a',
      'about',
    ]);
  });

  it('derives a heroImage projection from a frontmatter media: reference on the entry kind', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.image({ label: 'Hero' }) } },
    });
    const heroSite = buildSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n  caption: y\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const resolveMedia = (ref: { hash: string }) =>
      ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined;
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia,
    });

    const data = await heroRoutes.entryLoad({ url: new URL('https://example.com/hero') });
    expect(data.heroImage).toEqual({
      url: '/media/a.0123456789abcdef.webp',
      absoluteUrl: 'https://example.com/media/a.0123456789abcdef.webp',
      alt: 'x',
      caption: 'y',
    });
    // Locked decision 5: the on-disk token is never mutated; the projection is additive.
    expect((data.entry.frontmatter as { image: { src: string } }).image.src).toBe('media:a.0123456789abcdef');
  });

  it('leaves heroImage undefined for an unresolved hash, and when media is off', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.image({ label: 'Hero' }) } },
    });
    const heroIndex = () => createContentIndex([
      { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nHero body.' },
    ], heroPages);

    // Resolver present but the hash does not resolve: no throw, undefined projection.
    const unresolved = createPublicRoutes({
      site: buildSiteResolver([{ descriptor: heroPages, index: heroIndex() }]),
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: () => undefined,
    });
    const a = await unresolved.entryLoad({ url: new URL('https://example.com/hero') });
    expect(a.heroImage).toBeUndefined();

    // Media off: a null resolveMedia derives no hero and the entry still renders.
    const off = createPublicRoutes({
      site: buildSiteResolver([{ descriptor: heroPages, index: heroIndex() }]),
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    });
    const b = await off.entryLoad({ url: new URL('https://example.com/hero') });
    expect(b.heroImage).toBeUndefined();
    expect(b.html).toBe('<r>Hero body.</r>');
  });

  it('emits og:image from a resolved structured hero plus twitter:image:alt', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.image({ label: 'Hero' }) } },
    });
    const heroSite = buildSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: A hero photo\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const resolveMedia = (ref: { hash: string }) =>
      ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined;
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia,
    });

    const data = await heroRoutes.entryLoad({ url: new URL('https://example.com/hero') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://example.com/media/a.0123456789abcdef.webp' });
    expect(data.seo.meta).toContainEqual({ name: 'twitter:image:alt', content: 'A hero photo' });
  });

  it('keeps the back-compat string image (origin-anchored, no twitter:image:alt)', async () => {
    const [stringPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.text({ label: 'Social image' }) } },
    });
    const stringSite = buildSiteResolver([
      { descriptor: stringPages, index: createContentIndex([
        { path: '/g/legacy.md', raw: '---\ntitle: Legacy\nimage: /og/legacy.png\n---\n\nLegacy body.' },
      ], stringPages) },
    ]);
    const stringRoutes = createPublicRoutes({
      site: stringSite,
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    });

    const data = await stringRoutes.entryLoad({ url: new URL('https://example.com/legacy') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://example.com/og/legacy.png' });
    expect(data.seo.meta.some((m) => m.name === 'twitter:image:alt')).toBe(false);
  });

  it('emits no og:image when the only image-shaped field is under another key and no default', async () => {
    const [coverPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { cover: fields.image({ label: 'Cover' }) } },
    });
    const coverSite = buildSiteResolver([
      { descriptor: coverPages, index: createContentIndex([
        { path: '/g/cover.md', raw: '---\ntitle: Cover\ncover:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nCover body.' },
      ], coverPages) },
    ]);
    const coverRoutes = createPublicRoutes({
      site: coverSite,
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: (ref: { hash: string }) =>
        ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined,
    });

    const data = await coverRoutes.entryLoad({ url: new URL('https://example.com/cover') });
    expect(data.seo.meta.some((m) => m.property === 'og:image')).toBe(false);
  });

  it('emits no og:image when a structured hero does not resolve', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.image({ label: 'Hero' }) } },
    });
    const heroSite = buildSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: ({ body }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: () => undefined,
    });

    const data = await heroRoutes.entryLoad({ url: new URL('https://example.com/hero') });
    expect(data.seo.meta.some((m) => m.property === 'og:image')).toBe(false);
  });

  it('resolves cairn links and fails the build on a dangling token', async () => {
    const { render } = createRenderer();
    function linkRoutes(body: string) {
      const linkSite = buildSiteResolver([
        { descriptor: pages, index: createContentIndex([
          { path: '/g/home.md', raw: `---\ntitle: Home\n---\n\n${body}` },
          { path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' },
        ], pages) },
      ]);
      return createPublicRoutes({ site: linkSite, render: ({ body, resolveLink, resolveMedia }) => render({ body, resolveLink, resolveMedia }), origin: 'https://example.com', siteName: 'Test', description: 'Test description.', resolveMedia: null });
    }

    const ok = await linkRoutes('[about](cairn:pages/about)').entryLoad({ url: new URL('https://example.com/home') });
    expect(ok.html).toContain('href="/about"');

    await expect(linkRoutes('[gone](cairn:pages/missing)').entryLoad({ url: new URL('https://example.com/home') })).rejects.toThrow(/cairn:pages\/missing|not found/);
  });

  describe('neighbors', () => {
    const [fragments] = normalizeConcepts({
      fragments: { dir: 'f', routing: 'embedded', fields: { date: fields.date({ label: 'Date' }) } },
    });
    const neighborSite = buildSiteResolver([
      { descriptor: posts, index: createContentIndex([
        { path: '/p/2026-02-01-a.md', raw: '---\ntitle: A\ndate: 2026-02-01\n---\n\nBody A.' },
        { path: '/p/2026-01-01-b.md', raw: '---\ntitle: B\ndate: 2026-01-01\n---\n\nBody B.' },
      ], posts) },
      { descriptor: fragments, index: createContentIndex([
        { path: '/f/first.md', raw: '---\ntitle: First\ndate: 2026-02-01\n---\n\nFirst.' },
        { path: '/f/second.md', raw: '---\ntitle: Second\ndate: 2026-01-01\n---\n\nSecond.' },
      ], fragments) },
    ]);
    const config = {
      site: neighborSite,
      render: ({ body }: { body: string }) => Promise.resolve(body),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    };

    it('gives a routable entry its neighbors within the concept', async () => {
      const entry = neighborSite.concept('posts')!.byId('2026-01-01-b')!;
      const data = await composeEntryData(config, entry);
      expect(data.newer?.id).toBe('2026-02-01-a');
    });

    it('gives a fragment-concept entry no neighbors, though its index has them', async () => {
      const fragmentIndex = neighborSite.concept('fragments')!;
      expect(fragmentIndex.adjacent('second').newer?.id).toBe('first');
      const data = await composeEntryData(config, fragmentIndex.byId('second')!);
      expect(data.newer).toBeUndefined();
      expect(data.older).toBeUndefined();
    });

    it('gives an entry of a concept the site lacks no neighbors', async () => {
      const entry = { ...neighborSite.concept('posts')!.byId('2026-01-01-b')!, concept: 'absent' };
      const data = await composeEntryData(config, entry);
      expect(data.newer).toBeUndefined();
    });

    it('finds neighbors by id, so a preview whose permalink changed still gets them', async () => {
      const entry = { ...neighborSite.concept('posts')!.byId('2026-01-01-b')!, permalink: '/moved' };
      const data = await composeEntryData(config, entry);
      expect(data.newer?.id).toBe('2026-02-01-a');
    });
  });

  it('passes a build-backed resolveFragment through to the render call', async () => {
    const [fragments] = normalizeConcepts({
      fragments: { dir: 'f', routing: 'embedded', fields: { title: fields.text({ label: 'Title' }) } },
    });
    const fragmentSite = buildSiteResolver([
      { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' }], pages) },
      { descriptor: fragments, index: createContentIndex([{ path: '/f/address.md', raw: '---\ntitle: Address\n---\n\nAddress body.' }], fragments) },
    ]);
    let recordedResolveFragment: ((id: string) => string | undefined) | undefined;
    const recordingRoutes = createPublicRoutes({
      site: fragmentSite,
      render: ({ body, resolveFragment }) => {
        recordedResolveFragment = resolveFragment;
        return Promise.resolve(`<r>${body.trim()}</r>`);
      },
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    });

    await recordingRoutes.entryLoad({ url: new URL('https://example.com/about') });
    expect(recordedResolveFragment?.('address')?.trim()).toBe('Address body.');
  });

  it('renders a spliced ::include with no trace of the preview-only boundary cue (ratified 4B)', async () => {
    // createFragmentResolver never sets previewTitle (only EditPage's client-side resolver does), so
    // the same entry through the real render pipeline must come back byte-identical to a splice
    // with no boundary wrapper: this is the provable public-path half of the preview-only cue.
    const { render } = createRenderer();
    const [fragments] = normalizeConcepts({
      fragments: { dir: 'f', routing: 'embedded', fields: { title: fields.text({ label: 'Title' }) } },
    });
    const fragmentSite = buildSiteResolver([
      { descriptor: pages, index: createContentIndex([
        { path: '/g/about.md', raw: '---\ntitle: About\n---\n\n::include{fragment="address"}' },
      ], pages) },
      { descriptor: fragments, index: createContentIndex([{ path: '/f/address.md', raw: '---\ntitle: Address\n---\n\nOur address is 12 Harbor Way.' }], fragments) },
    ]);
    const fragmentRoutes = createPublicRoutes({
      site: fragmentSite,
      render: ({ body, resolveFragment }) => render({ body, resolveFragment }),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    });

    const data = await fragmentRoutes.entryLoad({ url: new URL('https://example.com/about') });
    expect(data.html).toContain('Our address is 12 Harbor Way.');
    expect(data.html).not.toContain('cairn-fragment-boundary');
    expect(data.html).not.toContain('From “');
  });
});

describe('composeEntryData', () => {
  const config = {
    site,
    render: ({ body }: { body: string }) => Promise.resolve(`<r>${body.trim()}</r>`),
    origin: 'https://example.com',
    siteName: 'Test',
    description: 'Test description.',
    resolveMedia: null,
  };

  it('produces output identical to entryLoad when called with no overrides', async () => {
    const routes = createPublicRoutes(config);
    const entry = site.byPermalink('/2026/02/01/a')!;
    const viaLoad = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    const viaCompose = await composeEntryData(config, entry);
    expect(viaCompose).toEqual(viaLoad);
  });

  it('substitutes the link resolver override in place of the build-backed resolver', async () => {
    const { render } = createRenderer();
    const linkSite = buildSiteResolver([
      { descriptor: pages, index: createContentIndex([
        { path: '/g/home.md', raw: '---\ntitle: Home\n---\n\n[about](cairn:pages/about)' },
      ], pages) },
    ]);
    const linkConfig = {
      site: linkSite,
      render: ({ body, resolveLink, resolveMedia }: { body: string; resolveLink?: (ref: { concept: string; id: string }) => string | undefined; resolveMedia?: MediaResolve }) =>
        render({ body, resolveLink, resolveMedia }),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    };
    const home = linkSite.byPermalink('/home')!;

    // The build-backed resolver throws on this dangling target; a marking override resolves it instead.
    const data = await composeEntryData(linkConfig, home, {
      resolveLink: () => '/about-overridden',
    });
    expect(data.html).toContain('href="/about-overridden"');
  });

  it('substitutes the fragment resolver override in place of the build-backed resolver', async () => {
    const { render } = createRenderer();
    const [fragments] = normalizeConcepts({
      fragments: { dir: 'f', routing: 'embedded', fields: { title: fields.text({ label: 'Title' }) } },
    });
    const fragmentSite = buildSiteResolver([
      { descriptor: pages, index: createContentIndex([
        { path: '/g/about.md', raw: '---\ntitle: About\n---\n\n::include{fragment="address"}' },
      ], pages) },
      { descriptor: fragments, index: createContentIndex([{ path: '/f/address.md', raw: '---\ntitle: Address\n---\n\nAddress body.' }], fragments) },
    ]);
    const fragmentConfig = {
      site: fragmentSite,
      render: ({ body, resolveFragment }: { body: string; resolveFragment?: (id: string) => string | undefined }) =>
        render({ body, resolveFragment }),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: null,
    };
    const about = fragmentSite.byPermalink('/about')!;

    const data = await composeEntryData(fragmentConfig, about, {
      resolveFragment: (id) => (id === 'address' ? 'Overridden address body.' : undefined),
    });
    expect(data.html).toContain('Overridden address body.');
  });

  it('has the hero derivation consume the resolveMedia override, not config.resolveMedia', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', fields: { image: fields.image({ label: 'Hero' }) } },
    });
    const heroSite = buildSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const heroConfig = {
      site: heroSite,
      render: ({ body }: { body: string }) => Promise.resolve(`<r>${body.trim()}</r>`),
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      // config.resolveMedia never resolves this hash; the override does instead.
      resolveMedia: () => undefined,
    };
    const hero = heroSite.byPermalink('/hero')!;

    const data = await composeEntryData(heroConfig, hero, {
      resolveMedia: (ref: { hash: string }) =>
        ref.hash === '0123456789abcdef' ? '/media/overridden.webp' : undefined,
    });
    expect(data.heroImage?.url).toBe('/media/overridden.webp');
  });
});
