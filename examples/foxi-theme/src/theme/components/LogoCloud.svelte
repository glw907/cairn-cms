<!-- @component
A "trusted by" logo row, styled after `src/components/blocks/socialproof/Basic.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a caption over a row of logo-shaped badges. Foxi's own
row uses the real Airtable/Asana/Basecamp/Evernote/Notion/Slack marks; this port draws each as a
plain monogram badge rather than reproducing a third party's trademarked logo art, keeping the
"a row of distinct logos" silhouette without redrawing marks this port has no license to. Plain
Tailwind flex-wrap, no chassis primitive needed for a device this small.
-->
<script lang="ts">
  interface Props {
    count: string;
    logos: string[];
  }
  let { count, logos }: Props = $props();
</script>

<div class="text-center">
  <p class="mb-s text-step--1 text-muted">Trusted by <strong class="text-base-content">{count}</strong> businesses</p>
  <ul class="m-0 flex flex-wrap items-center justify-center gap-m p-0" aria-label="Customer logos">
    {#each logos as logo (logo)}
      <li class="inline-flex items-center gap-2xs rounded-field border border-card-border bg-base-100 px-3 py-2 text-step-0 font-semibold text-muted/80">
        <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold text-primary">{logo.slice(0, 1)}</span>
        {logo}
      </li>
    {/each}
  </ul>
</div>
