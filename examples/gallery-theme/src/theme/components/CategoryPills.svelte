<!-- @component
The home page's category cross-index nav: one pill per distinct `categories` tag across every
leaf album, styled after the upstream demo's own rounded pill row. Reads `pages.allTags()`, the
same taxonomy mechanism the Foxi port's post tags already proved (theme-ports-1-3's capability
test names this cross-index as the one piece of the tree that maps cleanly onto an existing
engine mechanism; see this theme's README).
-->
<script lang="ts">
  /** One distinct category tag and how many leaf albums carry it. */
  interface Props {
    tags: { tag: string; count: number }[];
  }

  let { tags }: Props = $props();
</script>

{#if tags.length > 0}
  <nav aria-label="Categories" class="site-wide mb-l flex flex-wrap justify-center gap-xs sm:mb-xl">
    {#each tags as t (t.tag)}
      <a
        href={`/categories/${t.tag}`}
        class="rounded-selector border border-card-border px-s py-2xs text-step--1 text-base-content capitalize no-underline hover:border-base-content sm:px-m sm:py-xs sm:text-step-0"
      >
        {t.tag}
      </a>
    {/each}
  </nav>
{/if}
