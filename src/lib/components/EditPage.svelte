<!--
@component
The differentiated editor: the per-concept frontmatter form (from `data.fields`) beside the Carta
markdown editor and a live, design-accurate preview. The whole surface is one form posting to the
`?/save` action; the preview toggle persists per user in localStorage (spec §7.6).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import ComponentPalette from './ComponentPalette.svelte';
  import type { ComponentRegistry } from '../render/registry.js';
  import type { EditData } from '../sveltekit/content-routes.js';
  import type { TextareaField, TagsField, FreeTagsField } from '../content/types.js';

  interface Props {
    /** The edit load's data, plus the site name for the heading. */
    data: EditData & { siteName: string };
    /** The site's component registry, for the insert palette. */
    registry?: ComponentRegistry;
    /** Carta preview plugins from the adapter, for the design-accurate preview. */
    preview?: unknown[];
  }

  let { data, registry, preview = [] }: Props = $props();

  // `body` is local editor state seeded once from the prop; it diverges as the user types.
  // untrack() captures the initial value without subscribing to future prop changes.
  let body = $state(untrack(() => data.body));
  let showPreview = $state(false);
  let previewHtml = $state('');
  let insert = $state<(text: string) => void>(() => {});

  const PREVIEW_KEY = 'cairn-admin:preview';

  $effect(() => {
    // Restore the per-user preference once, on mount.
    showPreview = localStorage.getItem(PREVIEW_KEY) === '1';
  });

  function togglePreview() {
    showPreview = !showPreview;
    localStorage.setItem(PREVIEW_KEY, showPreview ? '1' : '0');
  }

  // Coerce a frontmatter value to a string for text/date/textarea inputs.
  function str(v: unknown): string {
    return v == null ? '' : String(v);
  }
</script>

<header class="mb-4 flex items-center justify-between gap-2">
  <div>
    <h1 class="text-xl font-semibold">{data.title}</h1>
    <p class="text-xs opacity-60">{data.label}: {data.id}</p>
  </div>
  <div class="flex items-center gap-2">
    <ComponentPalette {registry} insert={(t) => insert(t)} />
    <button type="button" class="btn btn-sm btn-ghost" aria-pressed={showPreview} onclick={togglePreview}>
      {showPreview ? 'Hide preview' : 'Show preview'}
    </button>
  </div>
</header>

{#if data.saved}
  <div role="status" class="alert alert-success mb-4 text-sm">Saved.</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.error}</div>
{/if}

<form method="POST" action="?/save" class="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6">
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <div class="lg:order-1">
    <div class="rounded-box border border-base-300 bg-base-100 overflow-hidden">
      <MarkdownEditor bind:value={body} name="body" plugins={preview} registerInsert={(fn) => (insert = fn)} />
    </div>
    {#if showPreview}
      <section
        aria-label="Preview"
        class="rounded-box border border-base-300 bg-base-100 prose mt-4 max-w-none p-4"
      >
        {@html previewHtml}
      </section>
    {/if}
  </div>

  <aside class="lg:order-2 mt-4 lg:mt-0">
    <fieldset class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
      {#each data.fields as field (field.name)}
        {#if field.type === 'textarea'}
          {@const f = field as TextareaField}
          <label class="form-control">
            <span class="label-text mb-1">{f.label}</span>
            <textarea class="textarea textarea-bordered" name={f.name} aria-label={f.label} rows={f.rows ?? 3}>{str(data.frontmatter[f.name])}</textarea>
          </label>
        {:else if field.type === 'date'}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <input class="input input-bordered" type="date" name={field.name} aria-label={field.label} value={str(data.frontmatter[field.name])} />
          </label>
        {:else if field.type === 'boolean'}
          <label class="label cursor-pointer justify-start gap-2">
            <input class="checkbox checkbox-sm" type="checkbox" name={field.name} aria-label={field.label} checked={data.frontmatter[field.name] === true} />
            <span class="label-text">{field.label}</span>
          </label>
        {:else if field.type === 'tags'}
          {@const f = field as TagsField}
          <fieldset class="form-control">
            <span class="label-text mb-1">{f.label}</span>
            <div class="flex flex-wrap gap-2">
              {#each f.options as option (option)}
                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    class="checkbox checkbox-sm"
                    type="checkbox"
                    name={f.name}
                    value={option}
                    checked={Array.isArray(data.frontmatter[f.name]) && (data.frontmatter[f.name] as string[]).includes(option)}
                  />
                  <span class="label-text">{option}</span>
                </label>
              {/each}
            </div>
          </fieldset>
        {:else if field.type === 'freetags'}
          {@const f = field as FreeTagsField}
          <label class="form-control">
            <span class="label-text mb-1">{f.label}</span>
            <input
              class="input input-bordered"
              name={f.name}
              aria-label={f.label}
              placeholder={f.placeholder}
              value={Array.isArray(data.frontmatter[f.name]) ? (data.frontmatter[f.name] as string[]).join(', ') : ''}
            />
          </label>
        {:else}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <input class="input input-bordered" name={field.name} aria-label={field.label} value={str(data.frontmatter[field.name])} required={field.required} />
          </label>
        {/if}
      {/each}
      <button type="submit" class="btn btn-primary mt-2">Save</button>
    </fieldset>
  </aside>
</form>
