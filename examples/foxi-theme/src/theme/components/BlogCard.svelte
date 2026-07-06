<!-- @component
A blog index card: a cover placeholder, a title, a byline, an excerpt, and tag pills, styled
after `src/components/ui/cards/BlogCard.astro` (oxygenna-themes/foxi-astro-theme, MIT).
Expressed with the chassis's `.cairn-card` recipe.
-->
<script lang="ts">
  import Datetime from './Datetime.svelte';

  interface Props {
    href: string;
    title: string;
    author?: string;
    date?: string;
    excerpt?: string;
    tags: string[];
  }
  let { href, title, author, date, excerpt, tags }: Props = $props();
</script>

<a href={href} class="cairn-card block no-underline hover:shadow-[var(--cairn-shadow)]">
  <div class="mb-s flex aspect-video items-center justify-center rounded-box bg-base-200">
    <svg class="h-10 w-10 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 15l4-4 4 3 4-5 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
  <h3 class="mb-2xs text-step-1 font-bold text-base-content">{title}</h3>
  {#if author || date}
    <p class="m-0 mb-2xs text-step--1 text-muted">
      {#if author}By {author}{/if}
      {#if date}<Datetime {date} />{/if}
    </p>
  {/if}
  {#if excerpt}
    <p class="m-0 mb-s text-step--1 text-muted">{excerpt}</p>
  {/if}
  <ul class="m-0 flex flex-wrap gap-2xs p-0">
    {#each tags as tag (tag)}
      <li class="rounded-field bg-base-200 px-2 py-0.5 text-step--1 text-muted">{tag}</li>
    {/each}
  </ul>
</a>
