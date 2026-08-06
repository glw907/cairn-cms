<!--
@component
The per-entry publish-history screen (spec "Part 1: entry history"; plan Task 4). A version is a
publish: the list renders `historyLoad`'s bounded, newest-first commit read under the heading
"Recent versions", never a completeness claim, since the commits API's path filter restarts at a
rename and the view has no way to know its own list fell short of the entry's real lifetime. A
synthetic draft row pins on top when the entry carries an open pending branch; it carries no
revert affordance, since it is not itself a publish. Each publish row's own revert affordance is a
form posting `?/revert` with two hidden fields: `ref`, the row's full commit sha, and `head`, the
default branch's head sha the page rendered against. `revertAction` re-validates `ref` against a
fresh history read and refuses a stale `head` rather than silently reverting over a publish that
landed after this page loaded. Failure mode: a stale `data` prop (a page rendered
before a since-published revert) still renders a revert form whose `head` no longer matches
`main`; `revertAction` is the authority that catches that, this screen only carries the value it
was given.
-->
<script lang="ts">
  import type { HistoryData } from '../sveltekit/types.js';
  import CsrfField from './CsrfField.svelte';
  import { PageHeader, AdminTable, StatusChip, EmptyState } from '../admin-toolkit/index.js';

  interface Props {
    /** The history load's data: the bounded publish list, the open draft (if any), the
     *  truncation flag, and the default branch's head sha this page rendered against. */
    data: HistoryData;
  }

  let { data }: Props = $props();

  /**
   * Format a publish's ISO timestamp for a history row: a version is a moment an editor might
   * recall by time of day ("published just before lunch"), not only a calendar day, so this
   * keeps the time rather than routing through the admin toolkit's civil-date-only formatter.
   * Falls back to the raw string when the value fails to parse.
   */
  function formatVersionDate(iso: string): string {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }

  const rowCount = $derived(data.entries.length + (data.draft ? 1 : 0));
  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';
</script>

<div class="mx-auto w-full max-w-3xl">
  <PageHeader title="Recent versions" meta={data.truncated ? 'Showing the most recent 25 versions.' : undefined} />

  {#if data.entries.length === 0 && !data.draft}
    <EmptyState
      heading="No versions yet"
      message="Publish this entry once, and its history will appear here."
    />
  {:else}
    <div class="overflow-hidden card-shell card-shadow">
      <AdminTable density="sm" {rowCount}>
        {#snippet header()}
          <th class="{headerLabel} w-28 pl-6">Status</th>
          <th class="{headerLabel}">Editor</th>
          <th class="{headerLabel} hidden sm:table-cell">Date</th>
          <th class="w-16 px-2 text-right"><span class="sr-only">Actions</span></th>
        {/snippet}
        {#snippet children()}
          {#if data.draft}
            <!-- The synthetic draft row: an honest live element with no revert affordance, since
                 it is not a publish. -->
            <tr>
              <td class="py-2 pl-6"><StatusChip tone="info" label="Draft" size="xs" /></td>
              <td class="py-2 type-subtitle">{data.draft.editor}</td>
              <td class="hidden py-2 type-subtitle text-muted sm:table-cell">
                Started {formatVersionDate(data.draft.startedAt)}
              </td>
              <td class="px-2 py-2 text-right"></td>
            </tr>
          {/if}
          {#each data.entries as entry, i (entry.ref)}
            <tr>
              <td class="py-2 pl-6">
                {#if i === 0}
                  <!-- entries is newest-first, so the top row is the version live on the default
                       branch right now, whether or not an open draft also exists (a draft has
                       not gone live). -->
                  <StatusChip tone="neutral" label="Current" size="xs" register="quiet" />
                {/if}
              </td>
              <td class="py-2 type-subtitle">{entry.editor}</td>
              <td class="hidden py-2 type-subtitle text-muted sm:table-cell">{formatVersionDate(entry.date)}</td>
              <td class="px-2 py-2 text-right">
                <form method="POST" action="?/revert">
                  <CsrfField />
                  <input type="hidden" name="ref" value={entry.ref} />
                  <input type="hidden" name="head" value={data.head ?? ''} />
                  <button type="submit" class="btn btn-ghost btn-xs">Revert</button>
                </form>
              </td>
            </tr>
          {/each}
        {/snippet}
      </AdminTable>
    </div>
  {/if}
</div>
