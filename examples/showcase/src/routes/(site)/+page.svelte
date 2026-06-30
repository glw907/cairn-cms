<!-- @component The showcase home: a masthead over an archival index of the posts. This is the B2 mock
     that stresses the design tokens on a real composed reading-adjacent page; B3 implements the
     production home (pagination, search). It is token-backed throughout: DaisyUI role utilities and
     cairn-token arbitrary-value utilities for the markup, a scoped `<style>` only for the index grid
     and the hairlines that a utility cannot express. No hard-coded color or px font-size. -->
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
  <p
    class="m-0 mb-s text-step--1 font-semibold uppercase tracking-eyebrow text-muted"
  >
    A cairn site
  </p>
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

<section class="index" aria-label="Writing">
  <div class="index__head">
    <p
      class="m-0 text-step--1 font-semibold uppercase tracking-eyebrow text-muted"
    >
      Writing
    </p>
    <span class="index__count">
      {filtered.length}
      {filtered.length === 1 ? 'entry' : 'entries'}
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

  {#each filtered as post (post.id)}
    <article class="entry" class:entry--undated={!post.date}>
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
</section>

<style>
  /* The archival index. A base-300 top rule opens it; each entry is a two-column grid (a fixed date
     column and the title/excerpt body) over a hairline. All color and rhythm reads the tokens. */
  .index {
    border-top: var(--border) solid var(--color-base-300);
    padding-top: var(--spacing-s);
    margin-bottom: var(--spacing-2xl);
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
     alone (the aria-pressed state backs assistive tech). */
  .tag-filter {
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
    border-radius: 999px;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
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
