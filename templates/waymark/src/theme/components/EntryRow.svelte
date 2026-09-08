<!-- @component
One archive row: a post's date, title, and excerpt in the two-column grid the home page's index
and the deeper `/archive/[page]` route both render, so the row's markup and its `.site-entry*`
stylesheet live in exactly one place instead of drifting between the two call sites. An undated
post drops the date column and reads as a single column (`.site-entry--undated`); below the
34rem breakpoint the date stacks above the title in one column regardless. `data-cairn-post`
stays the stable hook other tests and pages key off, since the class names it carries are this
component's own concern. Failing to keep this component in sync with a future index redesign
reintroduces the drift this extraction closes: the fix is here, not on a page's local `.entry`
copy.
-->
<script lang="ts">
  import type { ContentSummary } from '@glw907/cairn-cms/delivery';
  import { formatDate } from '$chassis/date.js';

  interface Props {
    /** The archive entry this row renders: its date, title, permalink, and optional excerpt. */
    post: ContentSummary;
  }

  let { post }: Props = $props();
</script>

<article class="site-entry" class:site-entry--undated={!post.date} data-cairn-post>
  {#if post.date}
    <div class="site-entry__date">{formatDate(post.date)}</div>
  {/if}
  <div>
    <h2 class="site-entry__title">
      <a href={post.permalink} class="cairn-focus-ring">{post.title}</a>
    </h2>
    {#if post.fields.description}
      <p class="site-entry__excerpt">{post.fields.description}</p>
    {/if}
  </div>
</article>

<style>
  .site-entry {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: var(--spacing-m);
    align-items: start;
    padding: var(--spacing-m) 0;
    border-bottom: var(--border) solid var(--color-card-border);
  }
  /* An undated post drops the date column and reads as a single column. */
  .site-entry--undated {
    grid-template-columns: 1fr;
  }

  .site-entry__date {
    padding-top: 0.5rem;
    font-size: var(--text-step--1);
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .site-entry__title {
    margin: 0 0 0.35rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-2);
    line-height: var(--leading-snug);
    letter-spacing: var(--tracking-tight);
  }
  .site-entry__title a {
    color: inherit;
    text-decoration: none;
    border-radius: 2px;
  }
  .site-entry__title a:hover {
    color: var(--color-primary);
  }

  .site-entry__excerpt {
    margin: 0;
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  /* Below the narrow breakpoint the date stacks above the title in one column. */
  @media (max-width: 34rem) {
    .site-entry {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }
    .site-entry__date {
      padding-top: 0;
    }
  }
</style>
