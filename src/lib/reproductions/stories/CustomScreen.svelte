<!--
@component
`toolkit/custom-screen`'s mounted subject: a faithful transcription of the worked example under
"Compose the screen" in `docs/extend/add-a-custom-admin-screen.md`, the page whose own render this
story exists to prove. No component in the package renders one of a site's own content concepts
(the doc's own rule, repro-story-audit.md's `toolkit/custom-screen` row), so this file lives inside
the reproductions module rather than `src/lib/components`, and composes only the toolkit primitives
the doc snippet names: `PageHeader`, `OfficeList`, `AdminTable`, `StatusChip`. Keep this in lockstep
with the doc snippet rather than improving on it; a drift here is a drift a reader of that page would
hit.
-->
<script lang="ts">
  import { PageHeader, OfficeList, AdminTable, StatusChip } from '../../admin-toolkit/index.js';

  let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
</script>

<PageHeader eyebrow="Club" title="Events" meta={`${data.events.length} upcoming`} />

<OfficeList title="All events">
  <AdminTable rowCount={data.events.length}>
    {#snippet header()}
      <th>Name</th>
      <th>Status</th>
    {/snippet}
    {#snippet children()}
      {#each data.events as event (event.id)}
        <tr>
          <td>{event.name}</td>
          <td><StatusChip tone="info" label={event.status} /></td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</OfficeList>
