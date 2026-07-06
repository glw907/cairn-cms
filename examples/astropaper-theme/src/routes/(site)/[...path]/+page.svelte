<!-- @component The AstroPaper port's single-entry reader, styled after
     `src/pages/posts/[...slug]/index.astro` and `src/layouts/PostDetails.astro` (MIT). A plain page
     (routing: 'page', e.g. About) gets the same breadcrumb-and-title idiom as Archives/Tags/Search; a
     post additionally carries the accent title, the updated/edit-page meta row, a table of contents,
     its tag list, a share-this-post row, and the previous/next post nav, all Layout-level devices the
     post gets regardless of its own content. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import Datetime from '$theme/components/Datetime.svelte';
  import { REPO } from '$theme/cairn.config.js';
  import { enhanceCodeCards } from '$theme/code-card.js';

  let { data }: { data: PageData } = $props();

  const isPost = $derived(data.concept === 'posts');
  const tags = $derived((data.entry.frontmatter.tags as string[] | undefined) ?? []);

  /** One heading captured from the rendered article, for the table of contents. rehype-slug gives
   *  every h2/h3 an id; this reads that id back off the already-rendered HTML string rather than
   *  re-parsing markdown, so it stays in lockstep with whatever the render pipeline emitted. */
  interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
  }

  function extractToc(html: string): TocItem[] {
    const items: TocItem[] = [];
    const headingRe = /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
    for (const match of html.matchAll(headingRe)) {
      const level = Number(match[1]) as 2 | 3;
      const text = match[3].replace(/<[^>]*>/g, '').trim();
      if (text) items.push({ level, id: match[2], text });
    }
    return items;
  }

  const toc = $derived(isPost ? extractToc(data.html) : []);

  // A post is always dated (the 'feed' routing model), so entry.date is present in practice;
  // this still guards it rather than interpolating the literal string "undefined" into a URL.
  const editHref = $derived(
    isPost && data.entry.date
      ? `https://github.com/${REPO.owner}/${REPO.repo}/edit/${REPO.branch}/src/content/posts/${data.entry.date}-${data.entry.slug}.md`
      : undefined,
  );

  const shareText = $derived(`${data.entry.title} ${data.canonicalUrl}`);
  /** The share row's targets, in the reference's own order. Each opens the platform's own share
   *  intent with this post's canonical URL and title; `paths` is the Tabler outline icon's own
   *  path data (`icons-tabler-outline`, satnaing/astro-paper's own icon set, MIT), the same glyph
   *  family as the SiteFooter/hero social rows. */
  const shares = $derived([
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      paths: [
        'M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9',
        'M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1',
      ],
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.canonicalUrl)}`,
      paths: ['M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3'],
    },
    {
      label: 'X',
      href: `https://x.com/intent/post?url=${encodeURIComponent(data.canonicalUrl)}`,
      paths: ['M4 4l11.733 16h4.267l-11.733 -16z', 'M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772'],
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(data.canonicalUrl)}`,
      paths: ['M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4'],
    },
    {
      label: 'Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(data.canonicalUrl)}`,
      paths: [
        'M8 20l4 -9',
        'M10.7 14c.437 1.263 1.43 2 2.55 2c2.071 0 3.75 -1.554 3.75 -4a5 5 0 1 0 -9.7 1.7',
        'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
      ],
    },
    {
      label: 'Mail',
      href: `mailto:?subject=${encodeURIComponent(data.entry.title)}&body=${encodeURIComponent(`See this post: ${data.canonicalUrl}`)}`,
      paths: ['M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z', 'M3 7l9 6l9 -6'],
    },
  ]);

  // A dependency on data.html, not just an empty effect, so this reruns on a client-side
  // navigation between two posts: SvelteKit reuses this component instance across two matches
  // of the same [...path] route rather than remounting it, so onMount would only ever fire once.
  $effect(() => {
    data.html;
    const article = document.querySelector('article');
    if (article) enhanceCodeCards(article);
  });
</script>

<CairnHead seo={data.seo} />

{#if isPost}
  <article class="prose">
    <a href="/posts" class="not-prose mb-s inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Go back
    </a>

    <h1 class="post-title">{data.entry.title}</h1>

    <div class="not-prose flex flex-wrap items-center gap-s text-step--1 text-muted">
      <Datetime date={data.entry.frontmatter.date as string | undefined} modDate={data.entry.frontmatter.modDate as string | undefined} />
      {#if editHref}
        <span aria-hidden="true">|</span>
        <a href={editHref} class="inline-flex items-center gap-1 hover:text-primary" target="_blank" rel="noopener noreferrer">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="m15 5 4 4M4 20l1-4 11-11 3 3-11 11-4 1Z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Edit page
        </a>
      {/if}
    </div>

    {#if toc.length > 0}
      <h2>Table of contents</h2>
      <details class="toc">
        <summary>Open Table of contents</summary>
        <nav aria-label="Table of contents">
          <ul class="m-0 list-none p-0">
            {#each toc as item (item.id)}
              <li class={item.level === 3 ? 'ml-m' : ''}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            {/each}
          </ul>
        </nav>
      </details>
    {/if}

    {@html data.html}

    {#if tags.length > 0}
      <ul class="not-prose m-0 mt-l flex list-none flex-wrap gap-s p-0">
        {#each tags as tag (tag)}
          <li>
            <a href={`/tags/${tag}`} class="inline-flex items-center gap-0.5 border-b-2 border-dashed border-base-content text-step--1 hover:border-primary hover:text-primary">
              # {tag}
            </a>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="not-prose mt-l">
      <p class="italic">Share this post:</p>
      <ul class="m-0 mt-2xs flex list-none flex-wrap gap-s p-0">
        {#each shares as share (share.label)}
          <li>
            <a href={share.href} class="inline-flex h-9 w-9 items-center justify-center text-base-content hover:text-primary" aria-label={share.label} title={share.label} target="_blank" rel="noopener noreferrer">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                {#each share.paths as d (d)}
                  <path {d} stroke-linecap="round" stroke-linejoin="round" />
                {/each}
              </svg>
            </a>
          </li>
        {/each}
      </ul>
    </div>

    {#if data.older || data.newer}
      <!-- AstroPaper's own adjacent-post convention (getSortedPosts.ts, sorted newest-first):
           "Previous Post" is the post one index earlier in that sort, the NEWER post; "Next Post"
           is one index later, the OLDER post. `data.newer`/`data.older` name the calendar
           direction, not the reading-order label, so the mapping below is deliberately crossed. -->
      <nav class="not-prose mt-l flex flex-col gap-m border-t border-card-border pt-m sm:flex-row sm:items-start sm:justify-between" aria-label="Adjacent posts">
        <div>
          {#if data.newer}
            <a href={data.newer.permalink} class="inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Previous Post
            </a>
            <p class="m-0 mt-1"><a href={data.newer.permalink} class="text-primary hover:underline">{data.newer.title}</a></p>
          {/if}
        </div>
        <div class="sm:text-right">
          {#if data.older}
            <a href={data.older.permalink} class="inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
              Next Post
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
            <p class="m-0 mt-1"><a href={data.older.permalink} class="text-primary hover:underline">{data.older.title}</a></p>
          {/if}
        </div>
      </nav>
    {/if}
  </article>
{:else}
  <nav aria-label="Breadcrumb" class="text-step--1 text-muted">
    <a href="/" class="hover:text-primary">Home</a> &raquo; {data.entry.title}
  </nav>
  <h1 class="text-step-4 font-bold">{data.entry.title}</h1>
  <article class="prose mt-m">
    {@html data.html}
  </article>
{/if}

<style>
  /* article.prose > h1.post-title beats prose.css's .prose > h1 (0,1,1) on specificity
     (0,2,2), regardless of Svelte's own scoping hash, so the accent title wins without an
     !important. */
  article.prose > h1.post-title {
    color: var(--color-primary);
    font-size: var(--text-step-4);
  }

  /* The table of contents disclosure: the same chevron-rotate gesture as the FAQ directive
     (prose.css), re-expressed locally since this is page-owned raw markup, not an engine
     directive's own class. */
  .toc {
    --flow-space: var(--spacing-s);
    border-bottom: var(--border) solid var(--color-card-border);
    padding-block: var(--spacing-2xs);
  }
  .toc summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    cursor: pointer;
    color: var(--color-muted);
    list-style: none;
  }
  .toc summary::-webkit-details-marker {
    display: none;
  }
  .toc summary::before {
    content: '\25B8';
    display: inline-block;
    transition: transform 0.15s ease;
  }
  .toc[open] summary::before {
    transform: rotate(90deg);
  }
  .toc nav {
    margin-top: var(--spacing-2xs);
  }
  .toc a {
    color: var(--color-primary);
  }
</style>
