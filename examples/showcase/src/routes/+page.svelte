<!-- @component The showcase home: lists post summaries, proving summaryFields and the concept stamp
     reach a list card with no per-entry detail read. -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1>cairn showcase</h1>
<nav>
  <a href="/calendar">Calendar (a non-cairn feature)</a>
  <a href="/admin">Admin</a>
</nav>

<ul class="post-list">
  {#each data.posts as post (post.id)}
    <li data-concept={post.concept}>
      <a href={post.permalink}>{post.title}</a>
      {#if post.fields.description}
        <p class="summary">{post.fields.description}</p>
      {/if}
    </li>
  {/each}
</ul>
