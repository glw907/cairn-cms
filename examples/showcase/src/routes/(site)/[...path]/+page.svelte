<script lang="ts">
  import type { PageData } from './$types';
  import type { ResolvedReference } from '@glw907/cairn-cms/delivery';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();

  // The discriminated load: an entry carries the rendered article and its resolved references, the tag
  // index carries the linked tag list, the tag archive carries its entries. The template narrows by
  // `data.kind`, so each branch reads only the fields its payload guarantees.
</script>

{#if data.kind === 'entry'}
  {@const author = data.references.author as ResolvedReference | undefined}
  {@const related = (data.references.related as ResolvedReference[] | undefined) ?? []}

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
{:else if data.kind === 'tagIndex'}
  <!-- The tag index: every taxonomy value with its count, each linking to its archive through the
       engine-built href the load derived from the concept's taxonomyBase. -->
  <article class="prose">
    <h1>Topics</h1>
    <ul data-testid="tag-index">
      {#each data.links as link (link.tag)}
        <li><a href={link.href}>{link.tag}</a> ({link.count})</li>
      {/each}
    </ul>
  </article>
{:else}
  <!-- A single tag's archive: the posts carrying this tag, each linking to its own permalink. -->
  <article class="prose">
    <h1>Posts tagged {data.tag}</h1>
    <ul data-testid="tag-archive">
      {#each data.entries as entry (entry.permalink)}
        <li><a href={entry.permalink}>{entry.title}</a></li>
      {/each}
    </ul>
  </article>
{/if}
