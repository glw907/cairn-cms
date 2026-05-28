<script lang="ts">
  // One collection's entries: a table (title, date, draft badge) linking into the editor, plus a
  // collapsible "New entry" form. The author types a title; the slug stem derives from it (R4) and
  // stays editable. A story collection also collects a date, which createEntry forwards so the new
  // entry opens with its date set. Placeholders differ by kind. The shell (AdminLayout) owns the
  // chrome and nav; this renders only the body.
  import type { CollectionListData } from '../sveltekit';
  import { slugify } from '../slug';

  let { data }: { data: CollectionListData } = $props();

  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);

  // Keep the slug in sync with the title until the author edits the slug directly.
  function onTitleInput(value: string) {
    title = value;
    if (!slugEdited) slug = slugify(value);
  }

  const slugPlaceholder = $derived(data.kind === 'page' ? 'about-us' : '2026-05-my-entry');
</script>

<div class="flex items-center justify-between gap-4">
  <h1 class="text-2xl font-bold">{data.label}</h1>
  <details class="dropdown dropdown-end">
    <summary class="btn btn-primary btn-sm">New entry</summary>
    <form
      method="POST"
      action="?/create"
      class="dropdown-content z-10 mt-2 flex w-80 flex-col gap-2 rounded-box border border-base-300 bg-base-100 p-4 shadow"
    >
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Title</span>
        <input
          type="text"
          value={title}
          oninput={(e) => onTitleInput(e.currentTarget.value)}
          placeholder="A human title"
          class="input w-full"
        />
      </label>

      {#if data.kind === 'story'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Date</span>
          <input type="date" name="date" class="input w-full" />
        </label>
      {/if}

      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Slug</span>
        <input
          type="text"
          name="id"
          required
          bind:value={slug}
          oninput={() => (slugEdited = true)}
          placeholder={slugPlaceholder}
          pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
          class="input w-full"
        />
        <span class="text-xs opacity-60">Lowercase letters, numbers, and hyphens. Becomes the filename.</span>
      </label>

      <button type="submit" class="btn btn-primary btn-sm">Create &amp; edit</button>
    </form>
  </details>
</div>

{#if data.formError}
  <div class="alert alert-error mt-4"><span>{data.formError}</span></div>
{/if}

{#if data.error}
  <div class="alert alert-warning mt-6">Couldn't load {data.label.toLowerCase()}: {data.error}</div>
{:else if data.entries.length === 0}
  <p class="mt-6 opacity-60">No entries yet.</p>
{:else}
  <ul class="menu mt-6 rounded-box border border-base-300 bg-base-100 p-2">
    {#each data.entries as entry (entry.path)}
      <li>
        <a href="/admin/edit/{data.type}/{entry.id}" class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2">
            <span>{entry.title}</span>
            {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>{/if}
          </span>
          {#if entry.date}<span class="text-xs opacity-60">{entry.date}</span>{/if}
        </a>
      </li>
    {/each}
  </ul>
{/if}
