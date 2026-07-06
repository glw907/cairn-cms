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
   *  repeated here because AstroPaper's own home hero and footer both carry the full row. Each
   *  `paths` entry is the Tabler outline icon's own path data (see SiteFooter.svelte). */
  type SocialLink = { label: string; href: string; paths: string[] };
  const socials: SocialLink[] = [
    {
      label: 'GitHub',
      href: 'https://github.com/glw907/cairn-cms',
      paths: [
        'M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5',
      ],
    },
    {
      label: 'X',
      href: 'https://x.com/',
      paths: ['M4 4l11.733 16h4.267l-11.733 -16z', 'M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772'],
    },
    {
      label: 'LinkedIn',
      href: 'https://linkedin.com/',
      paths: [
        'M8 11v5',
        'M8 8v.01',
        'M12 16v-5',
        'M16 16v-3a2 2 0 1 0 -4 0',
        'M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z',
      ],
    },
    {
      label: 'Email',
      href: 'mailto:hello@example.com',
      paths: ['M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z', 'M3 7l9 6l9 -6'],
    },
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
          <a href={social.href} class="inline-flex h-9 w-9 items-center justify-center text-base-content hover:text-primary" aria-label={social.label} title={social.label}>
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              {#each social.paths as d (d)}
                <path {d} stroke-linecap="round" stroke-linejoin="round" />
              {/each}
            </svg>
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
