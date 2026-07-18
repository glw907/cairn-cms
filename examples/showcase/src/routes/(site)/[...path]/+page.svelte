<script lang="ts">
  import type { PageData } from './$types';
  import type { ResolvedReference } from '@glw907/cairn-cms/delivery';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import { formatDate } from '$chassis/date';

  let { data }: { data: PageData } = $props();

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
</script>

<CairnHead seo={data.seo} />

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
