<!-- @component
Pennant's article template. `(site)/[...path]/+page.svelte` (the prerendered public entry route),
`(site)/preview/[token]/+page.svelte` (the preview pass's runtime route), and the home route all
render this one component, so the surfaces cannot structurally drift: the same markup, the same
styling, the same data shape.

Without `home`, a page or post reads at the measure: the hero image, the title and meta line, the
rendered body, and the related-posts nav. With `home`, the page is the club's front page in the wide
container: a banner lifted off the start of `home.before` (by `splitHomeBanner`), the hero (the
title, the frontmatter description, up to two buttons from `page.data.actions`, and the image, or
the crest on a color-1 ground when the page sets none), the rest of `home.before`, the news list of
`posts` with a link to `archiveUrl`, then `home.after`. An empty `posts` renders no news section.
The home page advertises no markdown twin, since it has none.

No photo carries a caption or a name: the hero renders the image and its alt text only, whatever
caption the frontmatter holds. Club pages show members, often children, and a printed name beside a
photo is the pairing safeguarding practice asks a club to avoid.

The `preview` flag is the one behavior difference the public and preview callers need: on preview,
this component emits no `<link rel="canonical">`, no `og:url`, and no raw-markdown `.md` twin link,
since the entry's eventual public permalink is not yet live (or, on the ended page, already
superseded). The public route also passes `titleTemplate` (the site's `<page> · <siteName>`
convention); the preview route leaves it unset, so a minted preview's `<title>` stays the entry's
bare title. Everything else renders identically on both. -->
<script lang="ts" module>
  import type { ContentSummary } from '@glw907/cairn-cms/delivery';

  /** One entry in the home page's news list: the shape `EntryRow` renders. */
  export type HomePost = ContentSummary;

  /** The home page's parts: the body split around the news list, and the list itself. */
  export interface HomeData {
    /** The newest posts, newest first. Empty renders no news section. */
    posts: HomePost[];
    /** Where the "All news" link points. */
    archiveUrl: string;
    /** Trusted rendered HTML shown above the news list. A leading banner island is lifted above the hero. */
    before: string;
    /** Trusted rendered HTML shown below the news list. */
    after: string;
  }
</script>

<script lang="ts">
  import type { NavNode } from '@glw907/cairn-cms';
  import type { EntryData, EntryRef } from '@glw907/cairn-cms/delivery';
  import { CairnHead } from '@glw907/cairn-cms/public';
  import { page } from '$app/state';
  import { formatDate } from '#chassis/date.js';
  import type { site } from '#chassis/content.js';
  import { isAdminHref } from './admin-link.js';
  import Crest from './Crest.svelte';
  import EntryRow from './EntryRow.svelte';
  import { splitHomeBanner } from './home-split.js';

  interface Props {
    /**
     * The composed entry data, plus the reference-edge resolution `#chassis/entry-data.js` layers on.
     * Typed by the site's concepts: every route assigns the same shape. The raw `image` and
     * `description` values are still checked at runtime below.
     */
    data: EntryData<typeof site> & { references: Record<string, EntryRef | EntryRef[]> };
    /** True on the preview route: suppresses canonical, og:url, and the `.md` twin link. Defaults to false (the public route). */
    preview?: boolean;
    /**
     * Forwarded to `CairnHead`'s `titleTemplate`: wraps the entry's raw title in the caller's
     * title-suffix convention. Left unset on preview, so a minted preview keeps the entry's bare
     * title rather than reading as a published page.
     */
    titleTemplate?: (title: string) => string;
    /** Present on the home page: renders the front-page layout and drops the `.md` twin link. */
    home?: HomeData;
  }

  let { data, preview = false, titleTemplate, home }: Props = $props();

  // Per-instance ids, so the hero and news headings never collide with a rehype-slug id from an
  // editor heading.
  const uid = $props.id();
  const heroId = `${uid}-hero`;
  const newsId = `${uid}-news`;

  // loadPreview already strips canonical/og:url/jsonLd.url from data.seo, so this filter is a no-op
  // against that caller. It stays so this component's contract does not depend on the caller.
  const seo = $derived(
    preview
      ? {
          ...data.seo,
          meta: data.seo.meta.filter((m) => m.property !== 'og:url'),
          links: data.seo.links.filter((l) => l.rel !== 'canonical'),
        }
      : data.seo,
  );

  // The resolved author edge: a single reference projects to one EntryRef. Undefined when unset.
  const author = $derived(data.references.author as EntryRef | undefined);
  // The resolved related edges: an array(reference) projects to a list, rendered as links.
  const related = $derived((data.references.related as EntryRef[] | undefined) ?? []);

  /** The raw frontmatter `image` object, loosely typed: only the fields the fallback below reads. */
  interface RawImageField {
    src?: unknown;
    alt?: unknown;
  }

  /**
   * A raw `image.src` the engine's heroImage projection leaves unresolved, since it resolves only a
   * `media:` token: an external `https://` URL or a root-relative path to a static file. A
   * protocol-relative `//` path is refused. Undefined once `data.heroImage` is set, so this never
   * overrides the resolved projection.
   */
  const rawHeroFallback = $derived.by(() => {
    if (data.heroImage) return undefined;
    // Only the concepts that declare an `image` field carry one; the `in` test narrows the union to them.
    const value: unknown =
      'image' in data.entry.frontmatter ? data.entry.frontmatter.image : undefined;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const field = value as RawImageField;
    if (typeof field.src !== 'string' || !/^(https?:\/\/|\/(?!\/))/.test(field.src)) {
      return undefined;
    }
    return { url: field.src, alt: typeof field.alt === 'string' ? field.alt : '' };
  });

  const hero = $derived(data.heroImage ?? rawHeroFallback);

  // The hero's lede: the page's own description, the same text its meta description carries.
  const description = $derived.by(() => {
    const value: unknown =
      'description' in data.entry.frontmatter ? data.entry.frontmatter.description : undefined;
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  });

  // The root layout returns `actions` (the site's `menus.actions`) beside the members app.d.ts
  // declares; the cast reads that one extra member. The hero shows the first two linked ones.
  const actions = $derived(
    ((page.data as { actions?: NavNode[] }).actions ?? [])
      .filter((node): node is NavNode & { url: string } => typeof node.url === 'string')
      .slice(0, 2),
  );

  const split = $derived(home ? splitHomeBanner(home.before) : undefined);

  /**
   * The entry's raw-markdown twin, `undefined` for a `noindex` entry, on preview, and on the home
   * page. Read off the rendered robots meta tag so this agrees with whatever the head decided.
   */
  const markdownUrl = $derived(
    preview ||
      home ||
      data.seo.meta.some((m) => m.name === 'robots' && m.content.includes('noindex'))
      ? undefined
      : data.canonicalUrl + '.md',
  );
</script>

<CairnHead {seo} {markdownUrl} {titleTemplate} />

{#if home && split}
  <div class="pennant-home">
    {#if split.banner}
      <div class="pennant-home__banner">{@html split.banner}</div>
    {/if}
    <div class="pennant-home__wrap">
      <section class="pennant-hero" aria-labelledby={heroId}>
        <div class="pennant-hero__text">
          <h1 id={heroId} class="pennant-hero__title">{data.entry.title}</h1>
          {#if description}
            <p class="pennant-hero__lede">{description}</p>
          {/if}
          {#if actions.length}
            <div class="pennant-hero__actions">
              {#each actions as action, i}
                <a
                  href={action.url}
                  rel={isAdminHref(action.url) ? 'external' : undefined}
                  class="pennant-button"
                  class:pennant-button--filled={i === 0}
                  class:pennant-button--quiet={i > 0}>{action.label}</a
                >
              {/each}
            </div>
          {/if}
        </div>
        {#if hero}
          <div class="pennant-hero__media">
            <img src={hero.url} alt={hero.alt} />
          </div>
        {:else}
          <div class="pennant-hero__media pennant-hero__media--crest">
            <Crest siteName={page.data.siteName ?? data.entry.title} />
          </div>
        {/if}
      </section>
      <div class="prose pennant-home__body">
        {@html split.rest}
        {#if home.posts.length}
          <section class="news" aria-labelledby={newsId}>
            <div class="news__head">
              <h2 id={newsId}>Latest news</h2>
              <a href={home.archiveUrl}>All news</a>
            </div>
            <ul class="news__list" role="list">
              {#each home.posts as post (post.id)}
                <li><EntryRow {post} /></li>
              {/each}
            </ul>
          </section>
        {/if}
        {@html home.after}
      </div>
    </div>
  </div>
{:else}
  <!-- The reading surface. `.prose` caps the column at the measure and binds every element to the
       theme tokens (prose.css, @import-ed into theme.css). -->
  <article class="prose">
    {#if hero}
      <figure class="hero">
        <img src={hero.url} alt={hero.alt} />
      </figure>
    {/if}
    <h1>{data.entry.title}</h1>
    {#if data.entry.date || author}
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
{/if}

<style>
  /* The article's one meta line, in the archive rows' date register so the two read as one
     vocabulary. `.prose > h1 + *` (prose.css) already spaces it below the title. */
  .meta {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }
  .meta a {
    color: var(--color-primary);
    text-decoration: none;
  }
  .meta a:hover {
    text-decoration: underline;
  }
  .meta a:focus-visible {
    outline: var(--cairn-focus-ring-outline);
    outline-offset: var(--cairn-focus-ring-offset);
    border-radius: var(--cairn-focus-ring-radius);
  }

  /* The news rows are a list for assistive tech only: no bullets, indent, or prose list spacing.
     The rule above the first row closes the section head; each row draws its own rule below. */
  .news__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: var(--border) solid var(--color-card-border);
  }
  .news__list > li {
    margin: 0;
    padding: 0;
  }
</style>
