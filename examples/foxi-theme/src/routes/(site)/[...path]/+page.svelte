<!-- @component The Foxi port's single-entry reader, styled after
     `src/pages/blog/[...id].astro` (the post template) and `src/pages/terms.astro` (the sidebar-banded
     page idiom), oxygenna-themes/foxi-astro-theme, MIT. A post additionally carries a breadcrumb
     trail, its tag list, and an edit-page link; the Terms page (the one entry `+page.server.ts`
     splits into `termsBands`) renders as alternating sidebar-and-content bands instead of one
     flowing article; any other page falls back to the plain breadcrumb-and-prose template. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import Breadcrumbs from '$theme/components/Breadcrumbs.svelte';
  import AppMockup from '$theme/components/AppMockup.svelte';
  import { REPO } from '$theme/cairn.config.js';

  let { data }: { data: PageData } = $props();

  const isPost = $derived(data.concept === 'posts');
  const tags = $derived((data.entry.frontmatter.tags as string[] | undefined) ?? []);
  const author = $derived(data.entry.frontmatter.author as string | undefined);

  const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const formattedDate = $derived(data.entry.date ? fmt.format(new Date(data.entry.date)) : undefined);

  // A post is always dated (the 'feed' routing model); this still guards it rather than
  // interpolating the literal string "undefined" into a URL.
  const editHref = $derived(
    isPost && data.entry.date
      ? `https://github.com/${REPO.owner}/${REPO.repo}/edit/${REPO.branch}/src/content/posts/${data.entry.date}-${data.entry.slug}.md`
      : undefined,
  );
</script>

<CairnHead seo={data.seo} />

{#if isPost}
  <div class="cairn-band pb-0">
    <div class="site-wide mx-auto max-w-3xl text-center">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: data.entry.title }]} />
      <h1 class="my-m text-step-4 font-bold text-base-content">{data.entry.title}</h1>
      {#if author || formattedDate}
        <p class="m-0 text-step--1 text-muted">
          {#if author}Written by {author}{/if}
          {#if formattedDate}&nbsp;on {formattedDate}{/if}
        </p>
      {/if}
      {#if tags.length > 0}
        <ul class="m-0 mt-s flex list-none flex-wrap justify-center gap-2xs p-0">
          {#each tags as tag (tag)}
            <li>
              <a href={`/blog/tags/${tag}`} class="inline-flex rounded-field bg-base-200 px-3 py-1 text-step--1 text-muted no-underline hover:bg-base-300">
                {tag}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <article class="site-main prose">
    <AppMockup variant="chart" class="not-prose mb-l aspect-[21/9] w-full rounded-box border border-card-border" />

    {@html data.html}

    {#if editHref}
      <p class="not-prose mt-l">
        <a href={editHref} class="text-step--1 text-muted hover:text-primary" target="_blank" rel="noopener noreferrer">Edit this post</a>
      </p>
    {/if}
  </article>
{:else if data.termsBands}
  <div class="cairn-band">
    <div class="site-wide mx-auto max-w-3xl text-center">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: data.entry.title }]} />
      <h1 class="my-m text-step-4 font-bold text-base-content">
        Terms and Conditions: Read, Relax, <strong class="text-primary">Enjoy!</strong>
      </h1>
      <p class="m-0 text-step-0 text-muted">Please read them carefully to understand your rights and responsibilities.</p>
    </div>
  </div>

  {#each data.termsBands as band, index (band.heading)}
    <div class="{index % 2 === 1 ? 'bg-base-200' : ''} py-2xl">
      <div class="site-wide">
        <div class="grid grid-cols-1 gap-l md:grid-cols-3">
          <div>
            <h2 class="mb-2xs text-step-2 font-bold text-base-content">{band.heading}</h2>
            <p class="m-0 text-step--1 text-muted">{band.lead}</p>
          </div>
          <div class="prose md:col-span-2">
            {@html band.html}
          </div>
        </div>
      </div>
    </div>
  {/each}
{:else}
  <div class="cairn-band pb-0">
    <div class="site-wide mx-auto max-w-3xl text-center">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: data.entry.title }]} />
      <h1 class="my-m text-step-4 font-bold text-base-content">{data.entry.title}</h1>
    </div>
  </div>

  <article class="site-main prose">
    {@html data.html}
  </article>
{/if}
