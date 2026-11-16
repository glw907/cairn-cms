<!-- @component
One news row, shared by the home page's news list and the archive routes so the row's markup and
styles live in one place: a page that copies the row instead drifts from it at the next redesign.
A row shows the date, the linked title with the description under it, and a thumbnail when the
post has a usable image. A row with no image has two columns, and an undated row drops the date
column.

The thumbnail reads `post.summaryFields.image`, which reaches a row only when the site's
`cairn.config.ts` names `image` among its summary fields. With `description` alone, or with an
`image.src` that is a `media:` token or anything but a root-relative path or an `https://` URL,
the row silently renders without one. The thumbnail is decorative beside the linked title, so it
carries empty alt text, and no row prints a caption or a name with its photo. `data-cairn-post` is
the stable hook other tests key off.
-->
<script lang="ts">
  import type { ContentSummary } from '@glw907/cairn-cms/delivery';
  import { formatDate } from '#chassis/date.js';

  interface Props {
    /** The post this row renders: its date, title, permalink, and summary fields. */
    post: ContentSummary;
  }

  let { post }: Props = $props();

  // The site's one date vocabulary ("12 Nov 2026"), split so the year can sit on its own line.
  const dateParts = $derived.by(() => {
    if (!post.date) return undefined;
    const words = formatDate(post.date).split(' ');
    const year = words.pop() ?? '';
    return { dayMonth: words.join(' '), year };
  });

  const description = $derived(
    typeof post.summaryFields.description === 'string' ? post.summaryFields.description : undefined,
  );

  // A summary-field image the browser can load as written. A `media:` token is never resolved here.
  const thumb = $derived.by(() => {
    const value = post.summaryFields.image;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const src = (value as { src?: unknown }).src;
    return typeof src === 'string' && /^(https?:\/\/|\/(?!\/))/.test(src) ? src : undefined;
  });
</script>

<article
  class="site-entry"
  class:site-entry--undated={!dateParts}
  class:site-entry--thumb={Boolean(thumb)}
  data-cairn-post
>
  {#if dateParts && post.date}
    <time class="site-entry__date" datetime={post.date}>
      <span class="site-entry__day">{dateParts.dayMonth}</span>
      <span class="site-entry__year">{dateParts.year}</span>
    </time>
  {/if}
  <div class="site-entry__body">
    <h3 class="site-entry__title">
      <a href={post.permalink}>{post.title}</a>
    </h3>
    {#if description}
      <p class="site-entry__excerpt">{description}</p>
    {/if}
  </div>
  {#if thumb}
    <img class="site-entry__thumb" src={thumb} alt="" loading="lazy" />
  {/if}
</article>

<style>
  .site-entry {
    display: grid;
    grid-template-columns: 5.75rem minmax(0, 1fr);
    grid-template-areas: 'date body';
    column-gap: var(--spacing-m);
    row-gap: var(--spacing-3xs);
    align-items: start;
    padding-block: var(--spacing-s);
    border-bottom: var(--border) solid var(--color-card-border);
  }
  .site-entry--thumb {
    grid-template-columns: 5.75rem minmax(0, 1fr) 9.375rem;
    grid-template-areas: 'date body thumb';
  }
  .site-entry--undated {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'body';
  }
  .site-entry--undated.site-entry--thumb {
    grid-template-columns: minmax(0, 1fr) 9.375rem;
    grid-template-areas: 'body thumb';
  }

  .site-entry__date {
    grid-area: date;
    display: flex;
    flex-direction: column;
    padding-top: 0.15rem;
    font-variant-numeric: tabular-nums;
  }
  .site-entry__day {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-primary);
  }
  .site-entry__year {
    font-size: var(--text-step--2);
    color: var(--color-muted);
  }

  .site-entry__body {
    grid-area: body;
  }
  .site-entry__title {
    margin: 0 0 var(--spacing-3xs);
    font-family: var(--font-display);
    font-weight: var(--font-weight-heading);
    text-transform: var(--cairn-heading-case);
    font-size: var(--text-step-2);
    line-height: var(--leading-snug);
    letter-spacing: var(--tracking-tight);
  }
  .site-entry__title a {
    font-weight: inherit;
    color: inherit;
    text-decoration: none;
  }
  .site-entry__title a:hover {
    text-decoration: underline;
    text-decoration-thickness: calc(2 * var(--border));
    text-underline-offset: 0.15em;
  }
  .site-entry__title a:focus-visible {
    outline: var(--cairn-focus-ring-outline);
    outline-offset: var(--cairn-focus-ring-offset);
    border-radius: var(--cairn-focus-ring-radius);
  }
  .site-entry__excerpt {
    margin: 0;
    font-size: var(--text-step-0);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }

  .site-entry__thumb {
    grid-area: thumb;
    display: block;
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    margin: 0;
    border-radius: var(--radius-box);
  }

  /* Below the hero's breakpoint the date runs across the top, the year inline, and a thumbnail
     sits small beside the title. */
  @media (max-width: 47.49rem) {
    .site-entry {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'date' 'body';
    }
    .site-entry--thumb {
      grid-template-columns: minmax(0, 1fr) 6rem;
      grid-template-areas: 'date date' 'body thumb';
    }
    .site-entry--undated {
      grid-template-areas: 'body';
    }
    .site-entry--undated.site-entry--thumb {
      grid-template-columns: minmax(0, 1fr) 6rem;
      grid-template-areas: 'body thumb';
    }
    .site-entry__date {
      flex-direction: row;
      align-items: baseline;
      gap: 0.4em;
      padding-top: 0;
    }
  }
</style>
