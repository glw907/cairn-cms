<!-- @component A deeper archive page: the year-grouped continuation of the home page's index, past
     the first ARCHIVE_PAGE_SIZE entries. No lead treatment and no tag filter here; both are page-one
     compositions (the newest-entry spotlight, and a narrowing control scoped to the entries visible
     on the page you are viewing), not a shape a deeper page repeats. Shares its markup and token
     vocabulary with the home page's index; see $chassis/archive for the pagination shape both build
     from. -->
<script lang="ts">
  import { page } from '$app/state';
  import type { PageData } from './$types';
  import EntryRow from '$theme/components/EntryRow.svelte';

  let { data }: { data: PageData } = $props();

  const visibleCount = $derived(data.archive.years.flatMap((group) => group.entries).length);
</script>

<svelte:head>
  <title>Archive, page {data.archive.page} · {page.data.siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="listing" aria-label="Writing">
  <div class="index">
    <div class="index__head">
      <p class="m-0 text-step--1 font-semibold uppercase tracking-eyebrow text-muted">Archive</p>
      <span class="index__count">
        {visibleCount}
        {visibleCount === 1 ? 'entry' : 'entries'}
      </span>
    </div>

    {#each data.archive.years as group, i (group.year)}
      <h3 class="index__year" class:index__year--first={i === 0}>{group.year}</h3>
      {#each group.entries as post (post.id)}
        <EntryRow {post} />
      {/each}
    {/each}
  </div>

  <nav class="pagination" aria-label="Archive pages">
    <a
      href={data.archive.page - 1 === 1 ? '/' : `/archive/${data.archive.page - 1}`}
      class="pagination__link cairn-focus-ring"
    >
      <span aria-hidden="true">&larr; </span>Newer
    </a>
    <span class="pagination__status">Page {data.archive.page} of {data.archive.totalPages}</span>
    {#if data.archive.page < data.archive.totalPages}
      <a href={`/archive/${data.archive.page + 1}`} class="pagination__link cairn-focus-ring">
        Older<span aria-hidden="true"> &rarr;</span>
      </a>
    {/if}
  </nav>
</section>

<style>
  .listing {
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
  .pagination__status {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
