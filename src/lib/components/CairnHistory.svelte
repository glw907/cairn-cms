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
was given. A refusal renders as an alert above the table, naming what blocked it: `draft_exists`
names the blocking draft's author and last-save date, `history_stale` and `ref_unknown` each name
what moved, and an unexpected failure falls back to its own bare message.
-->
<script lang="ts">
  import type { HistoryData, RevertFailure } from '../sveltekit/types.js';
  import CsrfField from './CsrfField.svelte';
  import { PageHeader, AdminTable, StatusChip, EmptyState, formatTimestamp } from '../admin-toolkit/index.js';

  interface Props {
    /** The history load's data: the bounded publish list, the open draft (if any), the
     *  truncation flag, and the default branch's head sha this page rendered against. */
    data: HistoryData;
    /** The last `?/revert` action's result: a fail-closed `RevertFailure` naming why the revert
     *  was refused, or `viewAction`'s generic `{ error }` catch-all on an unexpected failure. The
     *  two shapes are disjoint (a refusal carries `reason` and no `error`; the catch-all carries
     *  `error` and no `reason`), so a reason check alone narrows the union. Null or undefined on
     *  first load and after a successful revert (which redirects away from this view). */
    form?: RevertFailure | { error: string } | null | undefined;
  }

  let { data, form = null }: Props = $props();

  const rowCount = $derived(data.entries.length + (data.draft ? 1 : 0));
  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

  /**
   * The refused revert's message, naming the blocker: a `draft_exists` refusal names the
   * draft's own author and last-save date and instructs the editor to publish or discard it
   * first (spec "Part 2: revert"); `history_stale` and `ref_unknown` each name what moved out
   * from under the posted form. `viewAction`'s generic `{ error }` catch-all falls through to
   * its own message unchanged. Null when there is nothing to report (no `form`, or a bare-error
   * shape this branch never reaches).
   */
  const revertRefusal = $derived.by(() => {
    if (!form || !('reason' in form)) return null;
    if (form.reason === 'draft_exists') {
      const lastSaved = form.draftLastSavedAt ? `, last saved ${formatTimestamp(form.draftLastSavedAt)}` : '';
      return `${form.draftEditor} has a draft in progress${lastSaved}. Publish or discard it before reverting.`;
    }
    if (form.reason === 'history_stale') {
      return 'The history changed since this page loaded. Reload and try again.';
    }
    return 'That version is no longer in the recent list.';
  });

  /** `viewAction`'s generic `{ error }` catch-all, the branch `revertRefusal` above leaves
   *  untouched: the two shapes are disjoint, so `form` never carries both. */
  const bareError = $derived(form && 'error' in form ? form.error : null);
</script>

<div class="mx-auto w-full max-w-3xl">
  <PageHeader
    title="Recent versions"
    meta={data.truncated ? `Showing the most recent ${data.entries.length} versions.` : undefined}
  />

  {#if revertRefusal}
    <div class="alert alert-error mb-4 type-body">{revertRefusal}</div>
  {:else if bareError}
    <div class="alert alert-error mb-4 type-body">{bareError}</div>
  {/if}

  {#if data.entries.length === 0 && !data.draft}
    <!-- historyLoad 404s outright when the entry has neither a main file nor a branch, so this
         branch renders only for an entry that DOES exist but whose commit read came back empty
         (a degraded GitHub read, or a dev-backend seed with no recorded commits): never "publish
         once and history will appear", which would be false here. -->
    <EmptyState
      heading="No versions found"
      message="No published versions were found for this entry."
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
                 it is not a publish. Below sm the Date column hides, so its "Last saved" line
                 stacks under the editor name instead, keeping the row's own date legible rather
                 than dropping it. -->
            <tr>
              <td class="py-2 pl-6"><StatusChip label="Draft" size="xs" /></td>
              <td class="py-2 type-subtitle">
                {data.draft.editor}
                <span class="block type-meta text-muted sm:hidden">
                  Last saved {formatTimestamp(data.draft.lastSavedAt)}
                </span>
              </td>
              <td class="hidden py-2 type-subtitle text-muted sm:table-cell">
                Last saved {formatTimestamp(data.draft.lastSavedAt)}
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
                  <StatusChip label="Current" size="xs" />
                {/if}
              </td>
              <td class="py-2 type-subtitle">
                {entry.editor}
                <span class="block type-meta text-muted sm:hidden">{formatTimestamp(entry.date)}</span>
              </td>
              <td class="hidden py-2 type-subtitle text-muted sm:table-cell">{formatTimestamp(entry.date)}</td>
              <td class="px-2 py-2 text-right">
                <form method="POST" action="?/revert">
                  <CsrfField />
                  <input type="hidden" name="ref" value={entry.ref} />
                  <input type="hidden" name="head" value={data.head ?? ''} />
                  <button
                    type="submit"
                    class="btn btn-ghost btn-xs"
                    aria-label={`Revert to the version from ${formatTimestamp(entry.date)} by ${entry.editor}`}
                  >
                    Revert
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        {/snippet}
      </AdminTable>
    </div>
  {/if}
</div>
