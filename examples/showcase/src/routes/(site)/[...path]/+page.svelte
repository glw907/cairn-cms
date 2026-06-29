<script lang="ts">
  import type { PageData } from './$types';
  import type { ResolvedReference } from '@glw907/cairn-cms/delivery';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();

  // The resolved author edge: a single reference projects to one ResolvedReference, so the template
  // reads its title and permalink. Undefined when the entry sets no author.
  const author = $derived(data.references.author as ResolvedReference | undefined);
  // The resolved related edges: an array(reference) projects to a list, rendered as links.
  const related = $derived((data.references.related as ResolvedReference[] | undefined) ?? []);
</script>

<CairnHead seo={data.seo} />

<!-- The bespoke reading surface. The `.prose` container caps the column at the measure and binds every
     element to the theme tokens (prose.css, @import-ed into theme.css). The hero figure leads the
     article on the same surface; the engine's rendered markdown follows the title. -->
<article class="prose">
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
  {#if author}
    <!-- The resolved author edge, rendered as a link to the target page's permalink. The link text is
         the target's own title, read from the resolved reference, so it matches the page's own heading. -->
    <p class="byline" data-testid="post-author">By <a href={author.permalink}>{author.title}</a></p>
  {/if}
  {@html data.html}
  {#if related.length}
    <!-- The resolved related-post edges, each a link to its target permalink. -->
    <nav class="related" aria-label="Related posts" data-testid="post-related">
      <h2>Related posts</h2>
      <ul>
        {#each related as ref (ref.concept + '/' + ref.id)}
          <li><a href={ref.permalink}>{ref.title}</a></li>
        {/each}
      </ul>
    </nav>
  {/if}
</article>
