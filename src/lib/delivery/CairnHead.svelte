<!--
@component
Renders a page's SEO head from a SeoMeta object into <svelte:head>: a title, meta tags, link
tags, and one escaped JSON-LD script. The title renders from seo.title by default; title={false}
lets the site own the <title>, and a string overrides it. titleTemplate wraps seo.title in the
site's own suffix convention (for example `(t) => `${t} · 907.life`); it applies only when title
is left undefined, so an explicit title or title={false} still wins. It carries no CSS, so it
pulls in no admin styles.
-->
<script lang="ts">
  import type { SeoMeta } from './seo.js';
  import { jsonLdScript } from './json-ld.js';

  let {
    /** The plain-data head to render. */
    seo,
    /** Title override: a string replaces seo.title, false lets the site own <title>. */
    title,
    /** The site's title-suffix convention, applied to seo.title when title is left undefined. */
    titleTemplate,
  }: { seo: SeoMeta; title?: string | false; titleTemplate?: (title: string) => string } = $props();
  const titleText = $derived(
    title !== undefined ? title : titleTemplate ? titleTemplate(seo.title) : seo.title,
  );
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
