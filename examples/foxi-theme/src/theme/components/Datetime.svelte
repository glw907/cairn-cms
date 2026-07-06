<!-- @component An inline "on <date>" byline fragment, styled after Foxi's own blog byline
     ("By Eleni K on April 4, 2024"). Dates are the engine's own `YYYY-MM-DD` strings; formatting
     stays UTC so the same server-rendered string never shifts across a reader's timezone.
-->
<script lang="ts">
  interface Props {
    /** The entry's published date, an ISO `YYYY-MM-DD` string. */
    date?: string;
  }
  let { date }: Props = $props();

  const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const formatted = $derived(date ? fmt.format(new Date(date)) : undefined);
</script>

{#if formatted}
  <time datetime={date}>on {formatted}</time>
{/if}
