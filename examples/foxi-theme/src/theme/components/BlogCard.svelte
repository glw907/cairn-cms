<!-- @component
A blog index card: a full-bleed cover, a title, a byline, an excerpt, and tag pills, styled
after `src/components/ui/cards/BlogCard.astro` (oxygenna-themes/foxi-astro-theme, MIT), whose
own `Card.astro` foundation carries no padding of its own, so the cover image sits flush with the
card's edges and only the text below it is padded. Expressed with the chassis's `.cairn-card`
recipe, with its default padding overridden to zero and reapplied to the text block alone.
-->
<script lang="ts">
  import Datetime from './Datetime.svelte';
  import AppMockup from '$theme/components/AppMockup.svelte';

  interface Props {
    href: string;
    title: string;
    author?: string;
    date?: string;
    excerpt?: string;
    tags: string[];
  }
  let { href, title, author, date, excerpt, tags }: Props = $props();

  const VARIANTS = ['calendar', 'chat', 'chart', 'stats', 'kanban'] as const;
  /** A deterministic cover variant from the title, so the same post always gets the same cover
   *  and the grid still reads as varied rather than repeating one illustration. */
  const variant = $derived.by(() => {
    let hash = 0;
    for (let i = 0; i < title.length; i += 1) hash = (hash * 31 + title.charCodeAt(i)) | 0;
    return VARIANTS[Math.abs(hash) % VARIANTS.length];
  });
</script>

<a href={href} class="cairn-card block !p-0 overflow-hidden no-underline hover:shadow-[var(--cairn-shadow)]">
  <AppMockup {variant} class="aspect-video w-full" />
  <div class="p-m">
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
  </div>
</a>
