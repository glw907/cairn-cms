<!-- @component A custom calendar that lives entirely outside cairn: it imports nothing from the engine. -->
<script lang="ts">
  interface Props {
    /** The list of events to display. */
    events: { date: string; title: string }[];
  }
  let { events }: Props = $props();
</script>

<ul aria-label="Events">
  {#each events as event (event.date + event.title)}
    <li>{event.date}: {event.title}</li>
  {/each}
</ul>
