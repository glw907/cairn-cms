<!-- @component The Foxi port's single-entry reader, styled after
     `src/pages/blog/[...id].astro` (the post template) and a plain page's breadcrumb-and-title
     idiom (the Terms page), oxygenna-themes/foxi-astro-theme, MIT. A post additionally carries
     a breadcrumb trail, its tag list, and an edit-page link; both cases render the same
     `prose` body. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import Breadcrumbs from '$theme/components/Breadcrumbs.svelte';
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
    <div class="not-prose mb-l aspect-[21/9] rounded-box bg-gradient-to-br from-primary to-secondary"></div>

    {@html data.html}

    {#if editHref}
      <p class="not-prose mt-l">
        <a href={editHref} class="text-step--1 text-muted hover:text-primary" target="_blank" rel="noopener noreferrer">Edit this post</a>
      </p>
    {/if}
  </article>
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
