<!--
@component
The "Link to page" control and its modal. It lists the site's posts and pages from the committed
manifest (the linkTargets the editor receives), grouped by concept with Pages first, each post
showing its date and each draft marked. Picking a target inserts a cairn: internal link through the
editor's registerInsertLink seam. Built on a native <dialog>, following the component dialog's a11y
conventions. The plain-URL link stays the toolbar's link button; this is for an internal target.
-->
<script lang="ts">
  import type { LinkTarget } from '../content/manifest.js';
  import { formatCairnToken } from '../content/links.js';

  interface Props {
    /** The site's link targets, from the committed manifest (editLoad ships them). */
    linkTargets: LinkTarget[];
    /** Insert an inline cairn link at the editor cursor. */
    insert: (href: string, title: string) => void;
  }

  let { linkTargets, insert }: Props = $props();

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
    const matched = q ? linkTargets.filter((t) => t.title.toLowerCase().includes(q)) : linkTargets;
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

  function open() {
    query = '';
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
  function choose(target: LinkTarget) {
    insert(formatCairnToken(target), target.title);
    close();
  }
</script>

<button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Link to page" onclick={open}>
  Link to page
</button>

<dialog class="modal" aria-labelledby="cairn-link-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-link-dialog-title" class="text-base font-semibold">Link to a page</h2>
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
              <button type="button" onclick={() => choose(target)}>
                <span class="flex flex-col items-start">
                  <span class="font-medium">{target.title}</span>
                  <span class="text-xs text-[var(--color-muted)]">
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
