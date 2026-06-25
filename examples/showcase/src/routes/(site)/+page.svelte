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

<section class="mx-auto max-w-[var(--cairn-measure)] pb-[var(--cairn-space-xl)] pt-[var(--cairn-space-l)]">
  <p
    class="m-0 mb-[var(--cairn-space-s)] text-[length:var(--cairn-step--1)] font-semibold uppercase tracking-[var(--cairn-tracking-eyebrow)] text-[color:var(--cairn-muted)]"
  >
    A cairn site
  </p>
  <h1
    class="m-0 mb-[var(--cairn-space-s)] font-[family-name:var(--font-display)] text-[length:var(--cairn-step-5)] font-semibold leading-[var(--cairn-leading-tight)] tracking-[var(--cairn-tracking-tight)]"
  >
    Notes, stacked one stone at a time.
  </h1>
  <p
    class="m-0 max-w-[38rem] text-[length:var(--cairn-step-1)] leading-[var(--cairn-leading-snug)] text-[color:var(--cairn-muted)]"
  >
    The cairn showcase. You write in markdown and publish a static page that reads the way a
    publication should. Every entry below is the markdown you type, rendered by the surface your
    readers see.
  </p>
</section>

<section class="index" aria-label="Writing">
  <div class="index__head">
    <p
      class="m-0 text-[length:var(--cairn-step--1)] font-semibold uppercase tracking-[var(--cairn-tracking-eyebrow)] text-[color:var(--cairn-muted)]"
    >
      Writing
    </p>
    <span class="index__count">
      {entries.length}
      {entries.length === 1 ? 'entry' : 'entries'}
    </span>
  </div>

  {#each entries as post (post.id)}
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
    padding-top: var(--cairn-space-s);
    margin-bottom: var(--cairn-space-2xl);
  }
  .index__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--cairn-space-xs);
  }
  .index__count {
    font-size: var(--cairn-step--1);
    color: var(--cairn-muted);
    font-variant-numeric: tabular-nums;
  }

  .entry {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: var(--cairn-space-m);
    align-items: start;
    padding: var(--cairn-space-m) 0;
    border-bottom: var(--border) solid var(--cairn-card-border);
  }
  /* An undated post drops the date column and reads as a single column. */
  .entry--undated {
    grid-template-columns: 1fr;
  }

  .entry__date {
    padding-top: 0.5rem;
    font-size: var(--cairn-step--1);
    color: var(--cairn-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .entry__title {
    margin: 0 0 0.35rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--cairn-step-2);
    line-height: var(--cairn-leading-snug);
    letter-spacing: var(--cairn-tracking-tight);
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
    font-size: var(--cairn-step-0);
    line-height: var(--cairn-leading-snug);
    color: var(--cairn-muted);
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
