<!--
@component
One concept's list view: every entry as a link to its editor, with title, date, and a draft badge,
plus a new-entry form. The slug auto-derives from the title until the author edits the slug field.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { ListData } from '../sveltekit/content-routes.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
  }

  let { data }: Props = $props();

  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);
  // Default the date client-side so the SSR pass and hydration agree across UTC midnight.
  let dateDefault = $state('');
  $effect(() => {
    dateDefault = new Date().toISOString().slice(0, 10);
  });

  const derivedSlug = $derived(slugEdited ? slug : slugify(title));
  const slugPlaceholder = $derived(data.dated ? 'my-entry' : 'about-us');
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">{data.label}</h1>
</header>

{#if data.formError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}

{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

<div class="rounded-box border border-base-300 bg-base-100 mb-6">
  {#if data.entries.length === 0}
    <p class="p-4 text-sm opacity-70">No entries yet.</p>
  {:else}
    <ul class="menu w-full">
      {#each data.entries as entry (entry.id)}
        <li>
          <a href={`/admin/${data.conceptId}/${entry.id}`} class="flex items-center justify-between">
            <span>{entry.title}</span>
            <span class="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              {#if entry.date}<span>{entry.date}</span>{/if}
              {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>{/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<form method="POST" action="?/create" class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
  <h2 class="text-sm font-semibold">New entry</h2>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Title</span>
    <input class="input" name="title" bind:value={title} required />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Slug</span>
    <input
      class="input"
      name="slug"
      placeholder={slugPlaceholder}
      value={derivedSlug}
      oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
    />
  </label>
  {#if data.dated}
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Date</span>
      <input class="input" type="date" name="date" value={dateDefault} />
    </label>
  {/if}
  <button type="submit" class="btn btn-primary self-start">Create</button>
</form>
