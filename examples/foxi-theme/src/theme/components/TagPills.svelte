<!-- @component
A row of filter pills, styled after the tag row on `src/pages/blog/index.astro`
(oxygenna-themes/foxi-astro-theme, MIT): the active pill reads the primary role, the rest a
muted neutral fill.
-->
<script lang="ts">
  interface Props {
    tags: string[];
    active?: string;
  }
  let { tags, active = 'All' }: Props = $props();
</script>

<ul class="m-0 flex flex-wrap gap-2xs p-0">
  {#each ['All', ...tags] as tag (tag)}
    <li>
      <a
        href={tag === 'All' ? '/blog' : `/blog/tags/${tag}`}
        class="inline-flex rounded-field px-3 py-1 text-step--1 font-medium no-underline {tag === active
          ? 'bg-primary text-primary-content'
          : 'bg-base-200 text-muted hover:bg-base-300'}"
      >
        {tag}
      </a>
    </li>
  {/each}
</ul>
