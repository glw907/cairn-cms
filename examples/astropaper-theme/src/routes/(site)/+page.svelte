<!-- @component The AstroPaper port's home template, styled after `src/pages/index.astro` (MIT): a
     one-line masthead over an RSS link, a short description, a social-links row, then a
     "Featured" section (entries with `featured` set) and a "Recent Posts" section (the rest, up
     to the per-index count), closed by an "All Posts" link into the full index. -->
<script lang="ts">
  import type { PageData } from './$types';
  import Datetime from '$theme/components/Datetime.svelte';

  let { data }: { data: PageData } = $props();

  const sorted = $derived([...data.posts].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')));
  const featured = $derived(sorted.filter((p) => p.fields.featured));
  const recent = $derived(sorted.filter((p) => !p.fields.featured));

  const PER_INDEX = 4;

  /** The hero's social row, the same four links and glyphs as the footer (SiteFooter.svelte),
   *  repeated here because AstroPaper's own home hero and footer both carry the full row. */
  type SocialLink = { label: string; href: string; path: string };
  const socials: SocialLink[] = [
    {
      label: 'GitHub',
      href: 'https://github.com/glw907/cairn-cms',
      path: 'M12 3a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43v-1.5c-2.5.54-3.03-1.2-3.03-1.2-.41-1.03-1-1.31-1-1.31-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.37 2.1.97 2.62.74.08-.58.32-.97.57-1.2-2-.22-4.1-1-4.1-4.44 0-.98.35-1.78.92-2.4-.1-.23-.4-1.15.09-2.4 0 0 .75-.24 2.45.92a8.4 8.4 0 0 1 4.46 0c1.7-1.16 2.45-.92 2.45-.92.49 1.25.19 2.17.09 2.4.57.62.92 1.42.92 2.4 0 3.45-2.1 4.21-4.11 4.43.33.28.62.85.62 1.72v2.55c0 .23.16.51.62.43A9 9 0 0 0 12 3Z',
    },
    { label: 'X', href: 'https://x.com/', path: 'M5 5l14 14M19 5L5 19' },
    {
      label: 'LinkedIn',
      href: 'https://linkedin.com/',
      path: 'M4 9h3v10H4zM5.5 4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM10 9h3v1.6c.6-1 1.6-1.8 3-1.8 2.4 0 4 1.6 4 4.8V19h-3v-4.8c0-1.4-.6-2.3-1.8-2.3-1 0-1.8.8-2.1 1.6-.1.3-.1.6-.1 1V19h-3Z',
    },
    { label: 'Email', href: 'mailto:hello@example.com', path: 'M4 6h16v12H4Zm0 0 8 7 8-7' },
  ];
</script>

<svelte:head>
  <title>AstroPaper</title>
</svelte:head>

<section class="border-b border-card-border pb-m pt-l">
  <h1 class="my-s inline-block text-step-5 font-bold sm:my-l">
    Mingalaba
    <a href="/feed.xml" aria-label="RSS Feed" title="RSS Feed" class="ml-1 inline-block align-middle text-primary">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <circle cx="6" cy="18" r="1.5" fill="currentColor" stroke="none" />
        <path d="M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15" stroke-linecap="round" />
      </svg>
      <span class="sr-only">RSS Feed</span>
    </a>
  </h1>

  <p>
    AstroPaper is a minimal, responsive, accessible and SEO-friendly blog theme, ported here as a
    cairn theme (see the README for the license and attribution). This port follows cairn's
    seams: a chrome layer, a composed home, and a token-driven reading surface, no bespoke
    engine change.
  </p>
  <p class="mt-2xs">
    Read the posts, or check the
    <a href="https://github.com/glw907/cairn-cms" class="text-primary underline decoration-dashed underline-offset-4">
      source</a
    >
    for more info.
  </p>

  <div class="mt-s flex items-center gap-s">
    <span>Social Links:</span>
    <ul class="m-0 flex list-none items-center gap-s p-0" aria-label="Social links">
      {#each socials as social (social.href)}
        <li>
          <a href={social.href} class="inline-flex items-center justify-center text-base-content hover:text-primary" aria-label={social.label} title={social.label}>
            {#if social.label === 'GitHub'}
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={social.path} />
              </svg>
            {:else}
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d={social.path} stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  </div>
</section>

{#if featured.length > 0}
  <section class="border-b border-card-border py-l" class:border-b={recent.length > 0}>
    <h2 class="text-step-3 font-semibold tracking-wide">Featured</h2>
    <ul class="m-0 list-none p-0">
      {#each featured as post (post.id)}
        <li class="my-m">
          <a href={post.permalink} class="text-step-1 font-medium text-primary decoration-dashed underline-offset-4 hover:underline">
            {post.title}
          </a>
          <Datetime date={post.date} modDate={post.fields.modDate as string | undefined} />
          {#if post.fields.description}
            <p class="m-0">{post.fields.description}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if recent.length > 0}
  <section class="py-l">
    <h2 class="text-step-3 font-semibold tracking-wide">Recent Posts</h2>
    <ul class="m-0 list-none p-0">
      {#each recent.slice(0, PER_INDEX) as post (post.id)}
        <li class="my-m">
          <a href={post.permalink} class="text-step-1 font-medium text-primary decoration-dashed underline-offset-4 hover:underline">
            {post.title}
          </a>
          <Datetime date={post.date} modDate={post.fields.modDate as string | undefined} />
          {#if post.fields.description}
            <p class="m-0">{post.fields.description}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<div class="my-l text-center">
  <a href="/posts" class="inline-flex items-center gap-1 hover:text-primary">
    All Posts
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
</div>
