<!--
@component
A test host for `AdminTable`'s selection column: it holds the id set in `$state` and reassigns it on
every change, the shape the prop's own contract asks a caller for, so the header checkbox's three
states and the batch region's own behavior are proven against a real caller rather than a prop
snapshot a test re-renders by hand.
-->
<script lang="ts">
  import AdminTable from '../../lib/admin-toolkit/AdminTable.svelte';

  interface Props {
    /** The rows the table renders, each with its own checkbox `<td>` the way a caller writes one. */
    rows: { id: string; household: string }[];
  }

  let { rows }: Props = $props();

  let selectedIds = $state<ReadonlySet<string>>(new Set<string>());

  function toggle(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    selectedIds = next;
  }
</script>

<AdminTable
  rowCount={rows.length}
  selection={{ ids: selectedIds, onchange: (next) => (selectedIds = next), label: 'Select households' }}
>
  {#snippet header()}
    <th>Household</th>
  {/snippet}
  {#snippet children()}
    {#each rows as row (row.id)}
      <tr>
        <td>
          <input
            type="checkbox"
            class="checkbox"
            aria-label={`Select ${row.household}`}
            checked={selectedIds.has(row.id)}
            onchange={(event) => toggle(row.id, event.currentTarget.checked)}
          />
        </td>
        <td>{row.household}</td>
      </tr>
    {/each}
  {/snippet}
  {#snippet batchBar({ count, clear })}
    <p data-testid="batch-count">{count} selected</p>
    <button type="button" data-testid="batch-clear" onclick={clear}>Clear</button>
  {/snippet}
</AdminTable>
