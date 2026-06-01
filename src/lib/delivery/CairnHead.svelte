<!--
@component
Renders a page's SEO head from a SeoMeta object into <svelte:head>: a title, meta tags, link
tags, and one escaped JSON-LD script. The title renders from seo.title by default; title={false}
lets the site own the <title>, and a string overrides it. It carries no CSS, so it pulls in no
admin styles.
-->
<script lang="ts">
  import type { SeoMeta } from './seo.js';
  import { jsonLdScript } from './json-ld.js';

  let {
    /** The plain-data head to render. */
    seo,
    /** Title override: a string replaces seo.title, false lets the site own <title>. */
    title,
  }: { seo: SeoMeta; title?: string | false } = $props();
  const titleText = $derived(title === undefined ? seo.title : title);
</script>

<svelte:head>
  {#if titleText !== false}
    <title>{titleText}</title>
  {/if}
  {#each seo.meta as m}
    {#if m.name}
      <meta name={m.name} content={m.content} />
    {:else if m.property}
      <meta property={m.property} content={m.content} />
    {/if}
  {/each}
  {#each seo.links as l}
    <link rel={l.rel} type={l.type} href={l.href} title={l.title} />
  {/each}
  {@html jsonLdScript(seo.jsonLd)}
</svelte:head>
