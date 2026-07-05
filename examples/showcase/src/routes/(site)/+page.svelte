<!-- @component The showcase home: a masthead over a composed front page, the newest entry given a lead
     treatment above a tightened archive index. This is the B2 mock that stresses the design tokens on
     a real composed reading-adjacent page; B3 implements the production home (pagination, search). It
     is token-backed throughout: DaisyUI role utilities and cairn-token arbitrary-value utilities for
     the markup, a scoped `<style>` only for the lead card, the index grid, and the hairlines a utility
     cannot express. No hard-coded color or px font-size. -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /**
   * The home list, newest first. The summaries already arrive date-sorted from the dated-concept
   * index, but the home owns its order, so it sorts again defensively. The canonical `date` is the
   * normalized top-level field the loader provides; an undated post sorts to the end.
   */
  const entries = $derived(
    [...data.posts].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
  );

  // The archive grows past this count before the tag filter earns its place. Below it the control
  // is off entirely: a short list narrows nothing worth the chrome (the spec's size gate). Do not
  // lower this to make a smaller archive show the filter.
  const TAG_FILTER_MIN_ENTRIES = 12;

  // The selected tag value, empty for "all". Off by default; a click sets it, the All reset clears
  // it.
  let selected = $state('');

  // The archive narrowed to the selected tag, or the whole archive when nothing is selected. The
  // tag values ride each summary's `tags`, the validated taxonomy field the index projects.
  const filtered = $derived(
    selected ? entries.filter((p) => p.tags?.includes(selected)) : entries,
  );

  // The filter options: the committed vocabulary entries whose value is actually in use across the
  // archive, so the control never offers a tag no post carries. Each option pairs the editor-facing
  // label with the slug value the filter matches on.
  const inUse = $derived(new Set(entries.flatMap((p) => p.tags ?? [])));
  const tagOptions = $derived(data.vocabulary.filter((entry) => inUse.has(entry.value)));

  // The newest entry gets its own lead treatment above the archive, but only while browsing
  // unfiltered: a tag search is a narrowing operation, not a composition, so a selected tag flattens
  // back to a plain list of exactly what matched, with no separate pinned "featured" entry.
  const featured = $derived(selected === '' ? filtered[0] : undefined);
  const rest = $derived(selected === '' ? filtered.slice(1) : filtered);

  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  /** Render an ISO `YYYY-MM-DD` date as a short tabular label, e.g. "15 Jan 2026". */
  function formatDate(iso: string): string {
    return dateFmt.format(new Date(iso));
  }
</script>

<section class="mx-auto max-w-measure pb-xl pt-l">
  <h1
    class="m-0 mb-s font-display text-step-5 font-semibold leading-tight tracking-tight"
  >
    Notes, stacked one stone at a time.
  </h1>
  <p
    class="m-0 max-w-[38rem] text-step-1 leading-snug text-muted"
  >
    The cairn showcase. You write in markdown and publish a static page that reads the way a
    publication should. Every entry below is the markdown you type, rendered by the surface your
    readers see.
  </p>
</section>

<section class="listing" aria-label="Writing">
  <!-- The lead: the newest entry, set apart with its own title size, an excerpt, and an explicit
       "Read the post" link, so the front page opens with one clear invitation instead of the first
       row of a table. The "Latest" label now differentiates it from "Archive" below, which is why
       the eyebrow device earns its place here (it did not on the masthead above, where nothing else
       on the page needed distinguishing from it). -->
  {#if featured}
    <article class="lead" data-cairn-post>
      <p class="m-0 mb-2xs text-step--1 font-semibold uppercase tracking-eyebrow text-muted">
        Latest
      </p>
      {#if featured.date}
        <div class="lead__date">{formatDate(featured.date)}</div>
      {/if}
      <h2 class="lead__title">
        <a href={featured.permalink}>{featured.title}</a>
      </h2>
      {#if featured.fields.description}
        <p class="lead__excerpt">{featured.fields.description}</p>
      {/if}
      <a href={featured.permalink} class="lead__link">
        Read the post<span aria-hidden="true"> &rarr;</span>
      </a>
    </article>
  {/if}

  <div class="index">
    <div class="index__head">
      <p class="m-0 text-step--1 font-semibold uppercase tracking-eyebrow text-muted">Archive</p>
      <span class="index__count">
        {rest.length}
        {rest.length === 1 ? 'entry' : 'entries'}
      </span>
    </div>

    <!-- The size-gated tag filter: rendered only once the archive grows past the threshold, where a
         per-tag narrowing earns its chrome. The All reset clears the selection; each option is a
         vocabulary label over an in-use slug value. -->
    {#if entries.length > TAG_FILTER_MIN_ENTRIES && tagOptions.length > 0}
      <div class="tag-filter" role="group" aria-label="Filter by tag">
        <button
          type="button"
          class="tag-filter__option"
          aria-pressed={selected === ''}
          onclick={() => (selected = '')}
        >
          All
        </button>
        {#each tagOptions as option (option.value)}
          <button
            type="button"
            class="tag-filter__option"
            aria-pressed={selected === option.value}
            onclick={() => (selected = option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    {/if}

    {#each rest as post (post.id)}
      <article class="entry" class:entry--undated={!post.date} data-cairn-post>
        {#if post.date}
          <div class="entry__date">{formatDate(post.date)}</div>
        {/if}
        <div>
          <h2 class="entry__title">
            <a href={post.permalink}>{post.title}</a>
          </h2>
          {#if post.fields.description}
            <p class="entry__excerpt">{post.fields.description}</p>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  /* The listing: a top hairline opens the whole section (the previous single-list treatment), with
     the lead and the tightened index each carrying their own rhythm below it. */
  .listing {
    border-top: var(--border) solid var(--color-base-300);
    padding-top: var(--spacing-s);
    margin-bottom: var(--spacing-2xl);
  }

  /* The lead card: the newest entry, set larger than an index row and closed by its own hairline
     before the archive starts. */
  .lead {
    padding-bottom: var(--spacing-l);
    margin-bottom: var(--spacing-l);
    border-bottom: var(--border) solid var(--color-card-border);
  }
  .lead__date {
    margin-bottom: var(--spacing-3xs);
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }
  .lead__title {
    margin: 0 0 var(--spacing-2xs);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-4);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
  }
  .lead__title a {
    color: inherit;
    text-decoration: none;
  }
  .lead__title a:hover {
    color: var(--color-primary);
  }
  .lead__excerpt {
    margin: 0 0 var(--spacing-s);
    max-width: 38rem;
    font-size: var(--text-step-1);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }
  .lead__link {
    display: inline-flex;
    align-items: center;
    font-weight: 600;
    color: var(--color-primary);
    text-decoration: none;
  }
  .lead__link:hover {
    text-decoration: underline;
  }
  .lead__link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .index__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
  }
  .index__count {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  /* The size-gated tag filter: a row of pill toggles over the index, reading the showcase tokens.
     The pressed option carries the primary ink so the active narrowing is visible without color
     alone (the aria-pressed state backs assistive tech). The pill shape rides its own scoped
     custom property (the `--flow-space` idiom in prose.css) rather than a literal 999px: the
     theme's `--radius-selector` is a separate, smaller "modest" DaisyUI geometry knob (0.28rem),
     so reading it here would change the shape, not just unlock it. --tag-filter-radius keeps the
     default pill unchanged while giving a re-skin a token to override. */
  .tag-filter {
    --tag-filter-radius: 999px;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    padding: var(--spacing-s) 0;
  }
  .tag-filter__option {
    font-size: var(--text-step--1);
    line-height: var(--leading-snug);
    padding: 0.25rem 0.7rem;
    border: var(--border) solid var(--color-card-border);
    border-radius: var(--tag-filter-radius);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
  }
  .tag-filter__option:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .tag-filter__option:hover {
    color: var(--color-base-content);
  }
  .tag-filter__option[aria-pressed='true'] {
    border-color: var(--color-primary);
    color: var(--color-primary-content);
    background: var(--color-primary);
  }

  .entry {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: var(--spacing-m);
    align-items: start;
    padding: var(--spacing-m) 0;
    border-bottom: var(--border) solid var(--color-card-border);
  }
  /* An undated post drops the date column and reads as a single column. */
  .entry--undated {
    grid-template-columns: 1fr;
  }

  .entry__date {
    padding-top: 0.5rem;
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .entry__title {
    margin: 0 0 0.35rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-2);
    line-height: var(--leading-snug);
    letter-spacing: var(--tracking-tight);
  }
  .entry__title a {
    color: inherit;
    text-decoration: none;
  }
  .entry__title a:hover {
    color: var(--color-primary);
  }

  .entry__excerpt {
    margin: 0;
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  /* Below the narrow breakpoint the date stacks above the title in one column. */
  @media (max-width: 34rem) {
    .entry {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }
    .entry__date {
      padding-top: 0;
    }
  }
</style>
