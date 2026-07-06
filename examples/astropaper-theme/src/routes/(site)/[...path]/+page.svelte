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

  const editHref = $derived(
    isPost ? `https://github.com/${REPO.owner}/${REPO.repo}/edit/${REPO.branch}/src/content/posts/${data.entry.date}-${data.entry.slug}.md` : undefined,
  );

  const shareText = $derived(`${data.entry.title} ${data.canonicalUrl}`);
  /** The share row's targets, in the reference's own order. Each opens the platform's own share
   *  intent with this post's canonical URL and title; `path` is this port's own simple glyph, not
   *  the platform's brand mark (the SiteFooter precedent). */
  const shares = $derived([
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(shareText)}`, path: 'M12 3a9 9 0 0 0-7.5 13.9L3 21l4.3-1.4A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.8 12.9l-.3-.2-2.5.8.8-2.4-.2-.3A7 7 0 0 1 12 5Zm-3.3 3.3c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c0 .2 0 .3-.1.5l-.4.5c-.1.1-.2.3 0 .5.4.7 1.6 1.9 2.3 2.2.2.1.3.1.5 0l.5-.5c.1-.2.3-.2.5-.1l1.6.8c.2.1.3.2.3.4 0 .8-.6 1.5-1.4 1.6-1.6.3-3.9-.6-5.4-2.1s-2.3-3.8-2-5.4c0-.4.3-.7.4-.8Z' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.canonicalUrl)}`, path: 'M14 4h3V1h-3a4 4 0 0 0-4 4v2H8v3h2v9h3v-9h3l1-3h-4V5c0-.6.4-1 1-1Z' },
    { label: 'X', href: `https://x.com/intent/post?url=${encodeURIComponent(data.canonicalUrl)}`, path: 'M5 5l14 14M19 5L5 19' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(data.canonicalUrl)}`, path: 'M21 4 3 11.5l6 2m12-9.5-3.5 15-6-4.5m9.5-10.5-9.5 8.5m0 0-.5 4.5 3-3' },
    { label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(data.canonicalUrl)}`, path: 'M12 3a9 9 0 0 0-3.3 17.4c0-.7 0-1.6.2-2.3l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.5 2 1.6 2 1.9 0 3.2-2.5 3.2-5.3 0-2.2-1.5-3.9-4.2-3.9-3 0-4.9 2.2-4.9 4.7 0 .9.3 1.5.7 2 .2.2.2.3.1.5l-.3 1c0 .2-.2.3-.4.2-1.2-.5-1.8-1.9-1.8-3.4 0-2.6 2.2-5.6 6.5-5.6 3.5 0 5.8 2.5 5.8 5.2 0 3.6-2 6.3-4.9 6.3-1 0-1.9-.5-2.2-1.1l-.6 2.4c-.2.9-.7 1.9-1.1 2.6.8.2 1.7.4 2.6.4a9 9 0 1 0 0-18Z' },
    { label: 'Mail', href: `mailto:?subject=${encodeURIComponent(data.entry.title)}&body=${encodeURIComponent(`See this post: ${data.canonicalUrl}`)}`, path: 'M4 6h16v12H4Zm0 0 8 7 8-7' },
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
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d={share.path} stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </li>
        {/each}
      </ul>
    </div>

    {#if data.older || data.newer}
      <nav class="not-prose mt-l flex flex-col gap-m border-t border-card-border pt-m sm:flex-row sm:items-start sm:justify-between" aria-label="Adjacent posts">
        <div>
          {#if data.older}
            <a href={data.older.permalink} class="inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Previous Post
            </a>
            <p class="m-0 mt-1"><a href={data.older.permalink} class="text-primary hover:underline">{data.older.title}</a></p>
          {/if}
        </div>
        <div class="sm:text-right">
          {#if data.newer}
            <a href={data.newer.permalink} class="inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
              Next Post
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
            <p class="m-0 mt-1"><a href={data.newer.permalink} class="text-primary hover:underline">{data.newer.title}</a></p>
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
