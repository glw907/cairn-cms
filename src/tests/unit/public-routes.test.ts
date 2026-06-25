import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPublicRoutes } from '../../lib/delivery/public-routes.js';
import { log } from '../../lib/log/index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFields } from '../../lib/content/schema.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

const [posts] = normalizeConcepts(
  { posts: { dir: 'p', schema: defineFields([]) } },
  { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
);
const [pages] = normalizeConcepts({ pages: { dir: 'g', schema: defineFields([]) } });

const site = createSiteResolver([
  { descriptor: posts, index: createContentIndex([
    { path: '/p/2026-02-01-a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
    { path: '/p/2026-01-01-b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
  ], posts) },
  { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' }], pages) },
]);

const routes = createPublicRoutes({ site, render: (md) => `<r>${md.trim()}</r>`, origin: 'https://example.com', siteName: 'Test', description: 'Test description.' });

describe('createPublicRoutes', () => {
  it('entryLoad resolves a dated Posts URL by pathname', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(data.entry.id).toBe('2026-02-01-a');
    expect(data.html).toBe('<r>Body A.</r>');
    expect(data.canonicalUrl).toBe('https://example.com/2026/02/01/a');
  });

  it('entryLoad resolves a flat Pages URL through the same route', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(data.entry.id).toBe('about');
  });

  it('entryLoad carries the resolved concept on EntryData', async () => {
    const post = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(post.concept).toBe('posts');
    const page = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(page.concept).toBe('pages');
  });

  it('entryLoad throws a 404 for an unknown path', async () => {
    await expect(routes.entryLoad({ url: new URL('https://example.com/missing') })).rejects.toMatchObject({ status: 404 });
  });

  it('entries enumerates every path across concepts', () => {
    expect(routes.entries().map((e) => e.path).sort()).toEqual(['2026/01/01/b', '2026/02/01/a', 'about']);
  });

  it('archiveLoad and tagLoad stay per-concept', () => {
    expect(routes.archiveLoad('posts').entries.map((e) => e.id)).toEqual(['2026-02-01-a', '2026-01-01-b']);
    expect(routes.tagLoad('posts', { params: { tag: 'x' } }).entries.map((e) => e.id)).toEqual(['2026-02-01-a']);
    expect(routes.tagIndexLoad('posts').tags).toEqual([{ tag: 'x', count: 1 }, { tag: 'y', count: 1 }]);
  });

  it('entryLoad derives a heroImage projection from a frontmatter media: reference', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'image', name: 'image', label: 'Hero' }]) },
    });
    const heroSite = createSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n  caption: y\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const resolveMedia = (ref: { hash: string }) =>
      ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined;
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: (md) => `<r>${md.trim()}</r>`,
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

  it('entryLoad leaves heroImage undefined for an unresolved hash, and when media is off', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'image', name: 'image', label: 'Hero' }]) },
    });
    const heroIndex = () => createContentIndex([
      { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nHero body.' },
    ], heroPages);

    // Resolver present but the hash does not resolve: no throw, undefined projection.
    const unresolved = createPublicRoutes({
      site: createSiteResolver([{ descriptor: heroPages, index: heroIndex() }]),
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: () => undefined,
    });
    const a = await unresolved.entryLoad({ url: new URL('https://example.com/hero') });
    expect(a.heroImage).toBeUndefined();

    // Media off: no resolveMedia dep at all, still undefined and no throw.
    const off = createPublicRoutes({
      site: createSiteResolver([{ descriptor: heroPages, index: heroIndex() }]),
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
    });
    const b = await off.entryLoad({ url: new URL('https://example.com/hero') });
    expect(b.heroImage).toBeUndefined();
  });

  it('entryLoad emits og:image from a resolved structured hero plus twitter:image:alt', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'image', name: 'image', label: 'Hero' }]) },
    });
    const heroSite = createSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: A hero photo\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const resolveMedia = (ref: { hash: string }) =>
      ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined;
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia,
    });

    const data = await heroRoutes.entryLoad({ url: new URL('https://example.com/hero') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://example.com/media/a.0123456789abcdef.webp' });
    expect(data.seo.meta).toContainEqual({ name: 'twitter:image:alt', content: 'A hero photo' });
  });

  it('entryLoad keeps the back-compat string image (origin-anchored, no twitter:image:alt)', async () => {
    const [stringPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'text', name: 'image', label: 'Social image' }]) },
    });
    const stringSite = createSiteResolver([
      { descriptor: stringPages, index: createContentIndex([
        { path: '/g/legacy.md', raw: '---\ntitle: Legacy\nimage: /og/legacy.png\n---\n\nLegacy body.' },
      ], stringPages) },
    ]);
    const stringRoutes = createPublicRoutes({
      site: stringSite,
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
    });

    const data = await stringRoutes.entryLoad({ url: new URL('https://example.com/legacy') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://example.com/og/legacy.png' });
    expect(data.seo.meta.some((m) => m.name === 'twitter:image:alt')).toBe(false);
  });

  it('entryLoad emits no og:image when the only image-shaped field is under another key and no default', async () => {
    const [coverPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'image', name: 'cover', label: 'Cover' }]) },
    });
    const coverSite = createSiteResolver([
      { descriptor: coverPages, index: createContentIndex([
        { path: '/g/cover.md', raw: '---\ntitle: Cover\ncover:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nCover body.' },
      ], coverPages) },
    ]);
    const coverRoutes = createPublicRoutes({
      site: coverSite,
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: (ref: { hash: string }) =>
        ref.hash === '0123456789abcdef' ? '/media/a.0123456789abcdef.webp' : undefined,
    });

    const data = await coverRoutes.entryLoad({ url: new URL('https://example.com/cover') });
    expect(data.seo.meta.some((m) => m.property === 'og:image')).toBe(false);
  });

  it('entryLoad emits no og:image when a structured hero does not resolve', async () => {
    const [heroPages] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'image', name: 'image', label: 'Hero' }]) },
    });
    const heroSite = createSiteResolver([
      { descriptor: heroPages, index: createContentIndex([
        { path: '/g/hero.md', raw: '---\ntitle: Hero\nimage:\n  src: "media:a.0123456789abcdef"\n  alt: x\n---\n\nHero body.' },
      ], heroPages) },
    ]);
    const heroRoutes = createPublicRoutes({
      site: heroSite,
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      resolveMedia: () => undefined,
    });

    const data = await heroRoutes.entryLoad({ url: new URL('https://example.com/hero') });
    expect(data.seo.meta.some((m) => m.property === 'og:image')).toBe(false);
  });

  it('entryLoad resolves cairn links and fails the build on a dangling token', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    function linkRoutes(body: string) {
      const linkSite = createSiteResolver([
        { descriptor: pages, index: createContentIndex([
          { path: '/g/home.md', raw: `---\ntitle: Home\n---\n\n${body}` },
          { path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' },
        ], pages) },
      ]);
      return createPublicRoutes({ site: linkSite, render: (md, opts) => renderMarkdown(md, opts), origin: 'https://example.com', siteName: 'Test', description: 'Test description.' });
    }

    const ok = await linkRoutes('[about](cairn:pages/about)').entryLoad({ url: new URL('https://example.com/home') });
    expect(ok.html).toContain('href="/about"');

    await expect(linkRoutes('[gone](cairn:pages/missing)').entryLoad({ url: new URL('https://example.com/home') })).rejects.toThrow(/cairn:pages\/missing|not found/);
  });
});

describe('createPublicRoutes media.resolver_absent', () => {
  afterEach(() => vi.restoreAllMocks());

  function build(deps: { assetsEnabled?: boolean; withResolver?: boolean }) {
    return createPublicRoutes({
      site,
      render: (md) => `<r>${md.trim()}</r>`,
      origin: 'https://example.com',
      siteName: 'Test',
      description: 'Test description.',
      ...(deps.assetsEnabled !== undefined ? { assetsEnabled: deps.assetsEnabled } : {}),
      ...(deps.withResolver ? { resolveMedia: () => undefined } : {}),
    });
  }

  it('warns once at construction when media is on but no resolver was wired', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    build({ assetsEnabled: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [event, fields] = warnSpy.mock.calls[0];
    expect(event).toBe('media.resolver_absent');
    expect(fields).toEqual({ enabled: true });
    // The record carries the configured-on flag only, never a token or a session.
    expect(Object.keys(fields ?? {})).toEqual(['enabled']);
  });

  it('does not warn when a resolver is wired (the correctly configured case)', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    build({ assetsEnabled: true, withResolver: true });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when media is off (assetsEnabled false or absent)', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    build({ assetsEnabled: false });
    build({});
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
