<!--
@component
Renders a page's SEO head from a SeoMeta object into <svelte:head>: a title, meta tags, link
tags, and one escaped JSON-LD script. The title renders from seo.title by default; title={false}
lets the site own the <title>, and a string overrides it. titleTemplate wraps seo.title in the
site's own suffix convention (for example `(t) => `${t} · My Site`); it applies only when title
is left undefined, so an explicit title or title={false} still wins. markdownUrl, when passed,
adds a rel="alternate" type="text/markdown" link pointing at the entry's raw-markdown twin; a
site that has not wired the twin route passes nothing and the link is omitted. It carries no
CSS, so it pulls in no admin styles.
-->
<script lang="ts">
  import type { SeoMeta } from './seo.js';
  import { renderJsonLdScript } from './json-ld.js';

  let {
    /** The plain-data head to render. */
    seo,
    /** Title override: a string replaces seo.title, false lets the site own <title>. */
    title,
    /** The site's title-suffix convention, applied to seo.title when title is left undefined. */
    titleTemplate,
    /**
     * Absolute URL of this entry's raw-markdown twin. When set, emits a
     *  rel="alternate" type="text/markdown" link; when omitted, no such link is emitted.
     */
    markdownUrl,
  }: {
    seo: SeoMeta;
    title?: string | false;
    titleTemplate?: (title: string) => string;
    markdownUrl?: string;
  } = $props();
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
  {#if markdownUrl}
    <link rel="alternate" type="text/markdown" href={markdownUrl} />
  {/if}
  {@html renderJsonLdScript(seo.jsonLd)}
</svelte:head>
