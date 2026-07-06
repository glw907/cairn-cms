<!-- @component
The upstream demo's own `hgroup` pattern: a centered page title plus an optional lead paragraph,
capped at the site-wide measure. Every template (home, gallery-listing, photo-grid, prose) opens
with one.
-->
<script lang="ts">
  /** One page heading's content. */
  interface Props {
    /** The page's own title, rendered as the h1. */
    title: string;
    /** An optional lead paragraph under the title. */
    description?: string;
  }

  let { title, description }: Props = $props();
</script>

<hgroup class="mx-auto mb-l flex max-w-measure-wide flex-col items-center gap-s px-m pt-s text-center sm:mb-xl sm:pt-m">
  <h1 class="text-step-4 font-semibold text-balance">{title}</h1>
  {#if description}
    <p class="mx-auto max-w-measure text-step-1 text-muted text-balance">{description}</p>
  {/if}
</hgroup>
