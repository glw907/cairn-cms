<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />

<article>
  {#if data.heroImage}
    <!-- The site template owns the hero layout: the engine ships the resolved data, this renders it.
         The root-relative url feeds the img; the absolute form is the og:image (in the head above). -->
    <figure class="hero">
      <img src={data.heroImage.url} alt={data.heroImage.alt} />
      {#if data.heroImage.caption}
        <figcaption>{data.heroImage.caption}</figcaption>
      {/if}
    </figure>
  {/if}
  <h1>{data.entry.title}</h1>
  {@html data.html}
</article>
