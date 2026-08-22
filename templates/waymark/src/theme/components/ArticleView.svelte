<!-- @component
The Waymark article template: the hero figure, the title and meta line, the rendered body, and the
related-posts nav. `(site)/[...path]/+page.svelte` (the prerendered public entry route) and
`(site)/preview/[token]/+page.svelte` (the preview pass's runtime route) both render this one
component, so the two surfaces cannot structurally drift: the same markup, the same styling, the
same data shape.

The `preview` flag is the ONE behavior difference the two callers need: on preview, this component
emits no `<link rel="canonical">`, no `og:url`, and no raw-markdown `.md` twin link, since the
entry's eventual public permalink is not yet live (or, on the ended page, already superseded) and
a preview must not self-canonicalize onto it or let a crawler or unfurler consolidate there. The
token, not the URL, is the credential; it lives only in the route path and never appears on the
page. `previewLoad` (`/sveltekit`) already strips `canonical`, `og:url`, and `jsonLd.url` from
`data.seo` for exactly this reason, so the strip below is redundant for that field, though not for
the `.md` twin link, which this component derives itself. It changes no other rendering: the
fidelity claim (a minted preview and its eventual public page render identically) depends on
everything else staying byte-for-byte the same. -->
<script lang="ts">
  import type { EntryData, ResolvedReference } from '@glw907/cairn-cms/delivery';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import { formatDate } from '$chassis/date';

  interface Props {
    /** The composed entry data, plus the reference-edge resolution `$chassis/entry-data.js` layers on. */
    data: EntryData & { references: Record<string, ResolvedReference | ResolvedReference[]> };
    /** True on the preview route: suppresses canonical, og:url, and the `.md` twin link. Defaults to false (the public route). */
    preview?: boolean;
  }

  let { data, preview = false }: Props = $props();

  // Belt and suspenders: previewLoad already strips canonical/og:url/jsonLd.url from data.seo, so
  // this filter is a no-op against that caller. It stays so this component's own contract does not
  // depend on the specific caller's behavior, and so a site rendering preview data from any other
  // source still gets the strip.
  const seo = $derived(
    preview
      ? {
          ...data.seo,
          meta: data.seo.meta.filter((m) => m.property !== 'og:url'),
          links: data.seo.links.filter((l) => l.rel !== 'canonical'),
        }
      : data.seo,
  );

  // The resolved author edge: a single reference projects to one ResolvedReference, so the template
  // reads its title and permalink. Undefined when the entry sets no author.
  const author = $derived(data.references.author as ResolvedReference | undefined);
  // The resolved related edges: an array(reference) projects to a list, rendered as links.
  const related = $derived((data.references.related as ResolvedReference[] | undefined) ?? []);

  /** The raw frontmatter `image` object, loosely typed: only the two fields the fallback below reads. */
  interface RawImageField {
    src?: unknown;
    alt?: unknown;
    caption?: unknown;
  }

  /**
   * A raw external `image.src` URL (a plain `https://...` link, not a `media:` token), rendered
   * directly since the engine's own heroImage projection only resolves a `media:` token (raw-URL
   * hero images bypass the R2 delivery pipeline by design). Undefined once `data.heroImage` is set,
   * so this never overrides the resolved projection.
   */
  const rawHeroFallback = $derived.by(() => {
    if (data.heroImage) return undefined;
    const value = (data.entry.frontmatter as Record<string, unknown>).image;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const field = value as RawImageField;
    if (typeof field.src !== 'string' || !/^https?:\/\//.test(field.src)) return undefined;
    return {
      url: field.src,
      alt: typeof field.alt === 'string' ? field.alt : '',
      caption: typeof field.caption === 'string' && field.caption !== '' ? field.caption : undefined,
    };
  });

  const hero = $derived(data.heroImage ?? rawHeroFallback);

  /**
   * The entry's raw-markdown twin, `undefined` for a `noindex` entry (so the head never advertises a
   * twin `markdownEntries` excluded from the build) and always `undefined` on preview (the twin route
   * is a build-time prerender enumeration a token-bearing draft never joins, and advertising one would
   * leak the draft's existence at a guessable neighboring URL). Read off the rendered robots meta tag
   * rather than re-reading frontmatter, so this agrees with whatever the head itself already decided.
   */
  const markdownUrl = $derived(
    preview || data.seo.meta.some((m) => m.name === 'robots' && m.content.includes('noindex'))
      ? undefined
      : data.canonicalUrl + '.md',
  );
</script>

<CairnHead {seo} {markdownUrl} />

<!-- The bespoke reading surface. The `.prose` container caps the column at the measure and binds every
     element to the theme tokens (prose.css, @import-ed into theme.css). The hero figure leads the
     article on the same surface; the engine's rendered markdown follows the title. -->
<article class="prose">
  {#if hero}
    <!-- The site template owns the hero layout: the engine ships the resolved data (or, for a raw
         external URL the engine's own projection does not resolve, the fallback above), this renders
         it. The root-relative url feeds the img; the absolute form is the og:image (in the head above). -->
    <figure class="hero">
      <img src={hero.url} alt={hero.alt} />
      {#if hero.caption}
        <figcaption>{hero.caption}</figcaption>
      {/if}
    </figure>
  {/if}
  <h1>{data.entry.title}</h1>
  {#if data.entry.date || author}
    <!-- The one meta line every article carries: the date in the site's shared vocabulary, and the
         resolved author edge when the entry sets one. The author link's text is the target page's
         own title, read from the resolved reference, so it matches that page's own heading. -->
    <p class="meta">
      {#if data.entry.date}
        <time datetime={data.entry.date}>{formatDate(data.entry.date)}</time>
      {/if}
      {#if data.entry.date && author}
        <span aria-hidden="true"> &middot; </span>
      {/if}
      {#if author}
        <span data-testid="post-author">By <a href={author.permalink}>{author.title}</a></span>
      {/if}
    </p>
  {/if}
  {@html data.html}
  {#if related.length}
    <!-- The resolved related-post edges, each a link to its target permalink. -->
    <nav class="related" aria-label="Related posts" data-testid="post-related">
      <h2>Related posts</h2>
      <ul>
        {#each related as ref (ref.concept + '/' + ref.id)}
          <li><a href={ref.permalink}>{ref.title}</a></li>
        {/each}
      </ul>
    </nav>
  {/if}
</article>

<style>
  /* The article's one meta line: the archive index's own date/muted register (step--1, tabular
     figures) so the two surfaces read as one shared vocabulary rather than two independent
     treatments. `.prose > h1 + *`'s spacing rule (prose.css) already gives this its air below the
     title; this only sets its own typography and color. */
  .meta {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }
  .meta a {
    color: var(--color-primary);
    text-decoration: none;
  }
  .meta a:hover {
    text-decoration: underline;
  }
  .meta a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
</style>
