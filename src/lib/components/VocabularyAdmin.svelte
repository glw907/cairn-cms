<!--
@component
The tag-vocabulary admin screen ("Tags"), the proving pilot of the admin idiomatic re-expression.
A near-twin of CairnTidySettings: an untrack-seeded `$state` working copy, a hidden-JSON field
posted with `<CsrfField />` to `?/saveVocabulary`, and a `role="status"` live region. It curates the
site's shared tag vocabulary, the labels editors pick from when they write, and does three jobs plus
a calmer fourth:
  - ADD a tag. A typed label derives a slug `value` live (matching SAFE_TAG_VALUE); an empty,
    invalid, or colliding slug is rejected in the AA error ink and nothing is appended.
  - RENAME a tag's label. The Name input edits `label` only; the `value` slug is immutable once
    created, so a rename never rewrites a post.
  - REMOVE a tag nothing uses. The delete control is active only for a zero-usage entry. An in-use
    entry's delete is GUARDED with `aria-disabled="true"` (never native `disabled`, which drops it
    from the tab order and kills the explanatory title) and names the count, mirroring the route's
    strict cross-branch delete gate, so the screen never offers a delete the route would reject.
  - SEED the list from tags already on posts. The `unlisted` set (in use, not in the vocabulary)
    each gets an "Add to list" control appending `{ value, label }` to the working copy.

The a11y spine is an always-present `role="status" aria-live="polite"` region that narrates the last
list mutation (add, remove, seed), a larger change than the tidy twin's fixed-row count voices.

Built natively on the frozen role interface: secondary text rides only the `text-muted` / `text-subtle`
named utilities, error text the sanctioned Tier-2 AA ink `text-[var(--cairn-error-ink)]`. No bespoke
custom surface, no `@layer components` rule, no retired muted/subtle bracket token.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import CsrfField from './CsrfField.svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import TagIcon from '@lucide/svelte/icons/tag';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import type { VocabularyLoadData } from '../sveltekit/content-routes.js';
  import type { VocabularyEntry } from '../index.js';

  interface Props {
    /** The committed vocabulary, the per-value cross-branch usage count, and the unlisted seed set. */
    data: VocabularyLoadData;
  }

  let { data }: Props = $props();

  // The engine's slug shape: the derived value the route also enforces on save.
  const SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  // The working copy of the vocabulary: every control binds to it and the save posts it. Seeded once
  // from the committed list, so the resting state IS the committed state. A fresh load remounts the
  // screen (the route key), so seeding from the initial prop is correct.
  let working = $state<VocabularyEntry[]>(untrack(() => structuredClone(data.vocabulary)));

  // The payload the save posts: the live working copy as JSON, in config order.
  const vocabularyJson = $derived(JSON.stringify(working));

  // The label a typed value reads, and the human-readable label a seed candidate's value implies.
  const newLabel = $state({ value: '' });

  // Derive a slug from a human label: lowercase, non-alphanumeric runs to a single hyphen, trimmed.
  // The result either matches SAFE_TAG_VALUE or is empty (an invalid label).
  function deriveSlug(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // A seed candidate carries only a value; imply a display label by un-slugging it (hyphens to
  // spaces, the first letter capitalized), matching the editor's mental model of a readable name.
  function labelFromValue(value: string): string {
    const spaced = value.replace(/-/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  // The live slug preview for the add field, and whether the current label is addable.
  const newSlug = $derived(deriveSlug(newLabel.value));
  const existingValues = $derived(new Set(working.map((e) => e.value)));
  const addError = $derived.by(() => {
    if (newLabel.value.trim() === '') return '';
    if (!SAFE_TAG_VALUE.test(newSlug)) return 'That name has no letters or numbers to make a tag from.';
    if (existingValues.has(newSlug)) return `A tag is already stored as “${newSlug}”.`;
    return '';
  });

  // The always-present mutation announcement. Empty at rest; an add, remove, or seed sets it. A
  // trailing zero-width marker keeps the text distinct so a repeated identical action re-announces.
  let mutation = $state('');
  let pulse = 0;
  function announce(text: string) {
    pulse += 1;
    mutation = `${text}${'​'.repeat(pulse % 2)}`;
  }

  function add() {
    const label = newLabel.value.trim();
    if (label === '' || !SAFE_TAG_VALUE.test(newSlug) || existingValues.has(newSlug)) return;
    working.push({ value: newSlug, label });
    announce(`Added ${label}.`);
    newLabel.value = '';
  }

  function remove(value: string) {
    if ((data.usage[value] ?? 0) > 0) return; // never delete an in-use tag (the route would reject)
    const removed = working.find((e) => e.value === value);
    working = working.filter((e) => e.value !== value);
    if (removed) announce(`Removed ${removed.label}.`);
  }

  function seed(value: string) {
    if (existingValues.has(value)) return;
    const label = labelFromValue(value);
    working.push({ value, label });
    announce(`Seeded ${label}.`);
  }

  // The seed candidates still absent from the working copy (a seeded one leaves the section).
  const seedCandidates = $derived(data.unlisted.filter((u) => !existingValues.has(u.value)));

  // The card recipe shared by the add and list cards.
  const cardClass =
    'rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]';
</script>

<div class="mx-auto max-w-3xl px-2 py-2">
  <!-- The office heading recipe: the display face, no eyebrow above the h1 -->
  <h1 class="text-2xl font-bold tracking-tight">Tags</h1>
  <p class="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-muted">
    A tag groups related posts. This list is shared across the site, so every editor picks from the
    same names. Add one, rename it, or remove a tag nothing uses.
  </p>

  <!-- THE MUTATION ANNOUNCEMENT, always present so assistive tech re-announces every add, remove, and
       seed. Empty at rest. -->
  <div
    role="status"
    aria-live="polite"
    data-testid="vocab-mutation-live"
    class="mt-3 flex min-h-5 items-center gap-1.5 text-[0.8125rem] text-muted"
  >
    {#if mutation.trim()}
      <CheckIcon class="h-3.5 w-3.5 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
      <span>{mutation}</span>
    {/if}
  </div>

  <!-- THE ADD CARD: a human label, a live slug preview, the primary Add control. -->
  <section class="mt-5 {cardClass} p-4">
    <label for="vocab-new-label" class="text-[0.9375rem] font-semibold">Add a tag</label>
    <div class="mt-2.5 flex flex-wrap items-start gap-2.5">
      <input
        id="vocab-new-label"
        name="new-label"
        type="text"
        autocomplete="off"
        placeholder="Snow report"
        bind:value={newLabel.value}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        class="input input-sm min-w-0 flex-1"
        aria-describedby="vocab-new-help"
        aria-invalid={addError ? 'true' : undefined}
      />
      <button type="button" class="btn btn-primary btn-sm flex-none" onclick={add}>
        <PlusIcon class="h-4 w-4" aria-hidden="true" />Add tag
      </button>
    </div>
    <div id="vocab-new-help" class="mt-2 text-[0.8125rem] leading-relaxed">
      {#if addError}
        <span role="alert" class="text-[var(--cairn-error-ink)]">{addError}</span>
      {:else if newSlug}
        <span class="text-muted"
          >Stored as
          <code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">{newSlug}</code>
          &middot; editors see the name, posts keep the slug</span
        >
      {:else}
        <span class="text-muted">Editors see the name; posts keep a short slug.</span>
      {/if}
    </div>
  </section>

  <!-- THE LIST: a count chip and a ledger of Name (rename), Stored as (immutable slug), In use
       (count), and a trailing delete. -->
  <section class="mt-5">
    <div class="mb-2.5 flex items-center gap-2 px-0.5">
      <h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
        Your tags
        <span
          class="rounded-full bg-base-content/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-muted"
          >{working.length}</span
        >
      </h2>
    </div>
    <div class="overflow-hidden {cardClass}">
      {#if working.length === 0}
        <div class="p-6 text-center text-[0.9375rem] text-muted">
          No tags yet. Add your first one above{seedCandidates.length
            ? ', or seed from tags already on your posts'
            : ''}.
        </div>
      {:else}
        <div
          class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-[var(--cairn-card-border)] px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted"
        >
          <span>Name</span>
          <span>Stored as</span>
          <span>In use</span>
          <span class="sr-only">Remove</span>
        </div>
        {#each working as entry, i (entry.value)}
          {@const count = data.usage[entry.value] ?? 0}
          <div
            class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2.5 {i > 0
              ? 'border-t border-[var(--cairn-card-border)]'
              : ''}"
          >
            <input
              aria-label="Tag name ({entry.value})"
              type="text"
              bind:value={entry.label}
              class="input input-sm min-w-0"
            />
            <code class="font-mono text-[0.8125rem] text-muted">{entry.value}</code>
            {#if count > 0}
              <span class="whitespace-nowrap text-[0.8125rem] tabular-nums text-subtle"
                >{count} {count === 1 ? 'post' : 'posts'}</span
              >
            {:else}
              <span class="whitespace-nowrap text-[0.8125rem] text-subtle">Unused</span>
            {/if}
            {#if count > 0}
              <!-- GUARDED delete: aria-disabled, never native disabled, with a stateful name and
                   title naming the count, so a keyboard/AT editor learns the tag is in use. -->
              <button
                type="button"
                data-value={entry.value}
                aria-disabled="true"
                aria-label="Cannot remove {entry.label}. Used on {count} {count === 1
                  ? 'post'
                  : 'posts'}. Remove it from those posts first."
                title="Used on {count} {count === 1 ? 'post' : 'posts'}. Remove it from those posts first."
                onclick={() => remove(entry.value)}
                class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-subtle opacity-50"
              >
                <Trash2Icon class="h-4 w-4" aria-hidden="true" />
              </button>
            {:else}
              <button
                type="button"
                data-value={entry.value}
                aria-label="Remove {entry.label}"
                title="Remove {entry.label}"
                onclick={() => remove(entry.value)}
                class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-error hover:bg-error/10"
              >
                <Trash2Icon class="h-4 w-4" aria-hidden="true" />
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </section>

  <!-- THE SEED SECTION: tags in use but not in the list, each with an Add-to-list control. Rendered
       only when there is a real candidate. A UX affordance, not a safety gate. -->
  {#if seedCandidates.length > 0}
    <section class="mt-5">
      <div class="mb-2.5 px-0.5">
        <h2 class="text-lg font-bold tracking-tight">Already on your posts</h2>
        <p class="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted">
          These tags are in use but not in your list yet. Add the ones you want editors to keep
          picking.
        </p>
      </div>
      <div class="overflow-hidden rounded-2xl border border-dashed border-[var(--cairn-card-border)] bg-base-100">
        {#each seedCandidates as candidate, i (candidate.value)}
          <div
            class="flex items-center gap-3 px-4 py-2.5 {i > 0
              ? 'border-t border-[var(--cairn-card-border)]'
              : ''}"
          >
            <TagIcon class="h-4 w-4 flex-none text-subtle" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <code class="font-mono text-[0.9375rem]">{candidate.value}</code>
              <span class="ml-2 text-[0.8125rem] tabular-nums text-subtle"
                >{candidate.count} {candidate.count === 1 ? 'post' : 'posts'}</span
              >
            </div>
            <button
              type="button"
              data-seed={candidate.value}
              class="btn btn-xs btn-ghost flex-none"
              aria-label="Add {labelFromValue(candidate.value)} to your tag list"
              onclick={() => seed(candidate.value)}
            >
              <PlusIcon class="h-3.5 w-3.5" aria-hidden="true" />Add to list
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- THE SAVE FOOTER: the hidden-JSON post with the CSRF field, plus a one-line reassurance. -->
  <form method="POST" action="?/saveVocabulary" class="mt-6 flex items-center gap-3 pt-4">
    <CsrfField />
    <input type="hidden" name="vocabulary" value={vocabularyJson} />
    <span class="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug text-muted">
      Saving commits your tag list to the site config, so every editor shares it.
    </span>
    <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
  </form>
</div>
