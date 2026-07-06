<!-- @component A calendar-icon date line, styled after AstroPaper's own `Datetime.astro` (MIT):
     shows "Updated: <date>" when `modDate` is later than `date`, otherwise the plain published
     date. Dates are the engine's own `YYYY-MM-DD` strings; formatting stays UTC so the same
     server-rendered string never shifts across a reader's timezone.
-->
<script lang="ts">
  interface Props {
    /** The entry's published date, an ISO `YYYY-MM-DD` string. */
    date?: string;
    /** The entry's last-modified date, when later than `date`. */
    modDate?: string;
  }
  let { date, modDate }: Props = $props();

  const isModified = $derived(!!(modDate && date && modDate > date));
  const shown = $derived(isModified ? modDate : date);

  // "3 Jun, 2026", AstroPaper's own Datetime.astro format: day and month with no separating
  // comma, then a comma before the year. No single Intl.DateTimeFormat option set produces this
  // exact punctuation, so the year is appended by hand rather than folded into the formatter.
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  function format(iso: string): string {
    const parsed = new Date(iso);
    return `${fmt.format(parsed)}, ${parsed.getUTCFullYear()}`;
  }
</script>

{#if shown}
  <div class="flex items-center gap-1 text-step--1 text-muted">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke-linecap="round" />
    </svg>
    {#if isModified}<span>Updated:</span>{/if}
    <time datetime={shown}>{format(shown)}</time>
  </div>
{/if}
