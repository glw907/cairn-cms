<!-- @component The showcase home: a masthead over a composed front page, the newest entry given a lead
     treatment above a year-grouped, paginated archive index. Archive page one; deeper pages live at
     /archive/[page], sharing this page's markup shape and the $chassis/archive pagination helper. It
     is token-backed throughout: DaisyUI role utilities and cairn-token arbitrary-value utilities for
     the markup, a scoped `<style>` only for the lead card, the index grid, and the hairlines a utility
     cannot express. No hard-coded color or px font-size. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$chassis/date';

  let { data }: { data: PageData } = $props();

  // The archive grows past this count before the tag filter earns its place. Below it the control
  // is off entirely: a short list narrows nothing worth the chrome (the spec's size gate). Do not
  // lower this to make a smaller archive show the filter.
  const TAG_FILTER_MIN_ENTRIES = 12;

  // The selected tag value, empty for "all". Off by default; a click sets it, the All reset clears
  // it.
  let selected = $state('');

  // This page's entries, flattened out of their year groups. Pagination bounds the payload to one
  // page's worth of posts, so the tag filter narrows within the visible page rather than the whole
  // corpus; a tag with no match on this page simply shows nothing, the same as a real narrowing.
  const pageEntries = $derived(data.archive.years.flatMap((group) => group.entries));

  // The filter options: the committed vocabulary entries whose value is actually in use on this
  // page, so the control never offers a tag nothing here carries.
  const inUse = $derived(new Set(pageEntries.flatMap((p) => p.tags ?? [])));
  const tagOptions = $derived(data.vocabulary.filter((entry) => inUse.has(entry.value)));

  // A tag search is a narrowing operation over the flat page, not a composition: it drops the
  // year headings and the featured lead, showing exactly what matched. `filtered` is undefined
  // while browsing unfiltered, so the template can branch on its presence.
  const filtered = $derived(selected ? pageEntries.filter((p) => p.tags?.includes(selected)) : undefined);
  const visibleCount = $derived((filtered ?? pageEntries).length);
  const showFeatured = $derived(selected === '' && Boolean(data.featured));
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
       on the page needed distinguishing from it). Only page one carries a lead: a tag search and any
       deeper archive page are both browsing a list, not opening the front page. -->
  {#if showFeatured && data.featured}
    <article class="lead" data-cairn-post>
      <p class="m-0 mb-2xs text-step--1 font-semibold uppercase tracking-eyebrow text-muted">
        Latest
      </p>
      {#if data.featured.date}
        <div class="lead__date">{formatDate(data.featured.date)}</div>
      {/if}
      <h2 class="lead__title">
        <a href={data.featured.permalink}>{data.featured.title}</a>
      </h2>
      {#if data.featured.fields.description}
        <p class="lead__excerpt">{data.featured.fields.description}</p>
      {/if}
      <a href={data.featured.permalink} class="lead__link">
        Read the post<span aria-hidden="true"> &rarr;</span>
      </a>
    </article>
  {/if}

  <div class="index">
    <div class="index__head">
      <p class="m-0 text-step--1 font-semibold uppercase tracking-eyebrow text-muted">Archive</p>
      <span class="index__count">
        {visibleCount}
        {visibleCount === 1 ? 'entry' : 'entries'}
      </span>
    </div>

    <!-- The size-gated tag filter: rendered only once the archive grows past the threshold, where a
         per-tag narrowing earns its chrome. The All reset clears the selection; each option is a
         vocabulary label over an in-use slug value. -->
    {#if pageEntries.length > TAG_FILTER_MIN_ENTRIES && tagOptions.length > 0}
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

    {#if filtered}
      {#each filtered as post (post.id)}
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
    {:else}
      <!-- Year-grouped archive: a year marker opens each run of same-year entries, in the page's
           established eyebrow-heading register, so a multi-year archive reads as segmented history
           rather than one flat scroll. -->
      {#each data.archive.years as group, i (group.year)}
        <h3 class="index__year" class:index__year--first={i === 0}>{group.year}</h3>
        {#each group.entries as post (post.id)}
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
      {/each}
    {/if}
  </div>

  <!-- Pagination: only over the unfiltered, year-grouped archive. A tag search already narrows to
       a flat list of exactly what matched, so paging through it would page through a result set
       whose size changes with the selection, not a stable archive shape. -->
  {#if !filtered && data.archive.totalPages > 1}
    <nav class="pagination" aria-label="Archive pages">
      {#if data.archive.page > 1}
        <a
          href={data.archive.page - 1 === 1 ? '/' : `/archive/${data.archive.page - 1}`}
          class="pagination__link"
        >
          <span aria-hidden="true">&larr; </span>Newer
        </a>
      {/if}
      <span class="pagination__status">Page {data.archive.page} of {data.archive.totalPages}</span>
      {#if data.archive.page < data.archive.totalPages}
        <a href={`/archive/${data.archive.page + 1}`} class="pagination__link">
          Older<span aria-hidden="true"> &rarr;</span>
        </a>
      {/if}
    </nav>
  {/if}
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
    border-radius: 2px;
  }
  .lead__title a:hover {
    color: var(--color-primary);
  }
  .lead__title a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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
    /* The 44px floor: the link keeps its visual line, the tappable box grows invisibly. */
    min-height: 2.75rem;
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

  /* The year marker: the page's own eyebrow-heading register (display face, tight tracking) scaled
     up from the "Archive"/"Latest" eyebrow rather than introducing a new voice, with a hairline
     above every group but the first, so a multi-year archive reads as segmented history. */
  .index__year {
    margin: var(--spacing-l) 0 var(--spacing-xs);
    padding-top: var(--spacing-m);
    border-top: var(--border) solid var(--color-base-300);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-2);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    color: var(--color-base-content);
  }
  .index__year--first {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }

  /* The size-gated tag filter: a row of pill toggles over the index, reading the showcase tokens.
     The pressed option carries the primary ink so the active narrowing is visible without color
     alone (the aria-pressed state backs assistive tech). The pill shape rides its own scoped
     custom property (the `--flow-space` idiom in prose.css) rather than a literal 999px: the
     theme's `--radius-selector` is a separate, smaller "modest" DaisyUI geometry knob (0.28rem),
     so reading it here would change the shape, not just unlock it. --tag-filter-radius keeps the
     default pill unchanged while giving a re-skin a token to override. Each pill reaches the 44px
     touch-target floor through its own vertical padding rather than a fixed height, so the visible
     pill grows with its content instead of clipping a longer label. */
  .tag-filter {
    --tag-filter-radius: 999px;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    padding: var(--spacing-s) 0;
  }
  .tag-filter__option {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    font-size: var(--text-step--1);
    line-height: var(--leading-snug);
    padding: 0.6rem 0.9rem;
    border: var(--border) solid var(--color-card-border);
    border-radius: var(--tag-filter-radius);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition:
      color 0.2s ease-out,
      border-color 0.2s ease-out,
      background-color 0.2s ease-out;
  }
  .tag-filter__option:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .tag-filter__option:hover {
    color: var(--color-base-content);
    border-color: var(--color-primary);
  }
  .tag-filter__option[aria-pressed='true'] {
    border-color: var(--color-primary);
    color: var(--color-primary-content);
    background: var(--color-primary);
  }
  @media (prefers-reduced-motion: reduce) {
    .tag-filter__option {
      transition: none;
    }
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
    border-radius: 2px;
  }
  .entry__title a:hover {
    color: var(--color-primary);
  }
  .entry__title a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .entry__excerpt {
    margin: 0;
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  /* Pagination: a plain, centered row (a status label between the two direction links), reading
     the same tokens as the rest of the index. */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-m);
    margin-top: var(--spacing-l);
    padding-top: var(--spacing-m);
    border-top: var(--border) solid var(--color-base-300);
  }
  .pagination__link {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    font-weight: 600;
    color: var(--color-primary);
    text-decoration: none;
    border-radius: 2px;
  }
  .pagination__link:hover {
    text-decoration: underline;
  }
  .pagination__link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .pagination__status {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
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
