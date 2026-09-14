<!--
@component
`toolkit/custom-screen`'s mounted subject: a faithful transcription of the worked example under
"Compose the screen" in `docs/extend/add-a-custom-admin-screen.md`, the page whose own render this
story exists to prove. No component in the package renders one of a site's own content concepts,
so this file lives inside the reproductions module rather than `src/lib/components`, and composes
only the toolkit primitives the doc snippet names: `PageHeader`, `AdminTable`, `StatusChip`. The
card div around `AdminTable` is written at the call site with the design system's floating-card
recipe (`card-shell card-shadow`) rather than by a wrapping component, since `AdminTable` already
owns its own horizontal overflow and a second `overflow-x-auto` on this div would double the
scroll container. `overflow-hidden` on the div is the corner clip: `card-shell` rounds its
border but sets no clipping of its own, so `AdminTable`'s square table would otherwise paint
over the card's rounded corners. Keep this in lockstep with the doc snippet rather than
improving on it; a drift here is a drift a reader of that page would hit.
-->
<script lang="ts">
  import { PageHeader, AdminTable, StatusChip } from '../../admin-toolkit/index.js';

  let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
</script>

<PageHeader eyebrow="Club" title="Events" meta={`${data.events.length} upcoming`} />

<div class="overflow-hidden card-shell card-shadow">
  <AdminTable rowCount={data.events.length}>
    {#snippet header()}
      <th scope="col">Name</th>
      <th scope="col">Status</th>
    {/snippet}
    {#snippet children()}
      {#each data.events as event (event.id)}
        <tr>
          <td>{event.name}</td>
          <td><StatusChip label={event.status} /></td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</div>
