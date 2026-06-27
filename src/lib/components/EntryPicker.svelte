<!--
@component
The search + concept-grouped target list shared by the editor's "Link to page" control and the
reference field picker. It lists link targets from the committed manifest, grouped by concept with
Pages first then Posts then any other concept, each post showing its date and each draft marked, and
fires choose() with the picked target. It knows nothing about cairn: tokens or the editor cursor; the
host decides what a chosen target means. An optional conceptFilter narrows the list to one concept,
and selectedIds marks rows the host already holds. Built on a native <dialog>, following the component
dialog's a11y conventions.
-->
<script lang="ts">
  import type { LinkTarget } from '../content/manifest.js';

  interface Props {
    /** The site's link targets, from the committed manifest (editLoad ships them). */
    targets: LinkTarget[];
    /** Called with the target the user picked; the host decides what to do with it. */
    choose: (target: LinkTarget) => void;
    /** Narrow the list to a single concept (the reference field's concept). */
    conceptFilter?: string;
    /** Ids the host already holds; matching rows render as already-selected and do not re-fire choose. */
    selectedIds?: string[];
    /** Render the built-in trigger button. False mounts only the dialog, for a host that supplies its
     *  own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { targets, choose, conceptFilter, selectedIds = [], trigger = true }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let query = $state('');

  // Group filtered targets by concept, Pages first then Posts then any other concept, so the list
  // reads in a stable order. The filter is a case-insensitive title substring.
  const ORDER: Record<string, number> = { pages: 0, posts: 1 };
  function rank(concept: string): number {
    return ORDER[concept] ?? 2;
  }
  function heading(concept: string): string {
    if (concept === 'pages') return 'Pages';
    if (concept === 'posts') return 'Posts';
    return concept.charAt(0).toUpperCase() + concept.slice(1);
  }

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const scoped = conceptFilter ? targets.filter((t) => t.concept === conceptFilter) : targets;
    const matched = q ? scoped.filter((t) => t.title.toLowerCase().includes(q)) : scoped;
    const byConcept = new Map<string, LinkTarget[]>();
    for (const t of matched) {
      const list = byConcept.get(t.concept) ?? [];
      list.push(t);
      byConcept.set(t.concept, list);
    }
    return [...byConcept.entries()]
      .map(([concept, items]) => ({ concept, heading: heading(concept), items }))
      .sort((a, b) => rank(a.concept) - rank(b.concept) || a.heading.localeCompare(b.heading));
  });

  function isSelected(target: LinkTarget): boolean {
    return selectedIds.includes(target.id);
  }

  /** Open the picker programmatically, for a host that drives it without the trigger. */
  export function open() {
    query = '';
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
  function pick(target: LinkTarget) {
    if (isSelected(target)) return;
    choose(target);
    close();
  }
</script>

{#if trigger}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Link to page" onclick={open}>
    Link to page
  </button>
{/if}

<dialog class="modal" aria-labelledby="cairn-entry-picker-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-entry-picker-title" class="text-base font-semibold">Link to a page</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>

    <input
      type="search"
      class="input input-bordered mb-3 w-full"
      placeholder="Search by title"
      aria-label="Search pages and posts"
      bind:value={query}
    />

    {#if groups.length === 0}
      <p class="text-sm text-[var(--color-muted)]">No pages or posts to link to.</p>
    {:else}
      {#each groups as group (group.concept)}
        <h3 class="mt-2 mb-1 text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">{group.heading}</h3>
        <ul class="menu w-full">
          {#each group.items as target (`${target.concept}/${target.id}`)}
            <li>
              <button type="button" aria-disabled={isSelected(target)} onclick={() => pick(target)}>
                <span class="flex flex-col items-start">
                  <span class="font-medium">{target.title}</span>
                  <span class="text-xs text-[var(--color-muted)]">
                    {#if isSelected(target)}<span class="badge badge-ghost badge-sm mr-1">Selected</span>{/if}
                    {#if target.draft}<span class="badge badge-ghost badge-sm mr-1">Draft</span>{/if}
                    {#if target.date}{target.date}{/if}
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/each}
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
