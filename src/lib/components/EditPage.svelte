<script lang="ts">
  // The editor: a per-field frontmatter form (driven by the adapter's `fields`) beside a Carta
  // markdown editor whose preview runs the site plugin set (`preview`). Content-forward layout:
  // the editor is the prominent column, frontmatter sits in a side column (R4). A cairn control
  // row hosts the insert-component palette (R10) and the preview toggle (R12); basic formatting
  // stays on Carta's built-in toolbar (R11). Data comes from `editLoad` merged with the layout
  // load (siteName); `carta-md` is a peer dependency.
  import { onMount } from 'svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  import 'carta-md/default.css';
  import { previewCartaOptions, type PreviewPlugins } from '../carta';
  import type { CairnField } from '../adapter';
  import type { ComponentRegistry } from '../render';
  import type { EditData } from '../sveltekit';
  import { cartaEditor } from '../editor';
  import ComponentPalette from './ComponentPalette.svelte';

  let {
    data,
    preview,
    registry,
  }: { data: EditData & { siteName: string }; preview: PreviewPlugins; registry?: ComponentRegistry } =
    $props();

  // Body is editable state; the Carta editor's preview runs the exact site plugin set, so it
  // matches the live page. A hidden input carries the current value into the form.
  // svelte-ignore state_referenced_locally (seeding from the initial load is intended)
  let body = $state(data.body);

  // svelte-ignore state_referenced_locally (the preview plugin set is fixed for the load)
  const carta = new Carta(previewCartaOptions(preview));
  const editor = cartaEditor(() => carta);

  // Carta's MarkdownEditor must not render on the worker (it pulls Shiki). onMount fires only in
  // the browser, so SSR renders the plain textarea and the client swaps in the editor.
  let mounted = $state(false);

  // Preview toggle (R12), persisted per user. 'split' shows the live preview beside the editor;
  // 'tabs' foregrounds the editor full width with the preview one click away.
  let mode = $state<'split' | 'tabs'>('split');
  onMount(() => {
    mounted = true;
    const saved = localStorage.getItem('cairn-admin:preview');
    if (saved === 'tabs' || saved === 'split') mode = saved;
  });
  function togglePreview() {
    mode = mode === 'split' ? 'tabs' : 'split';
    localStorage.setItem('cairn-admin:preview', mode);
  }

  // svelte-ignore state_referenced_locally (form defaults from the initial load)
  const fm = data.frontmatter as Record<string, unknown>;

  function fmString(key: string): string {
    return typeof fm[key] === 'string' ? (fm[key] as string) : '';
  }
  function fmTags(key: string): Set<string> {
    return new Set(Array.isArray(fm[key]) ? (fm[key] as unknown[]).map(String) : []);
  }
  function fmFreeTags(key: string): string {
    return Array.isArray(fm[key]) ? (fm[key] as unknown[]).map(String).join(', ') : '';
  }

  // Kind-aware header: a story leads with its date; a page leads with its slug/path.
  const subtitle = $derived(
    data.kind === 'page' ? `Page · ${data.path}` : `${data.label} · ${fmString('date') || data.path}`,
  );
</script>

<svelte:head>
  <title>{data.isNew ? `New ${data.label} entry` : `Edit ${data.title}`} · {data.siteName} CMS</title>
</svelte:head>

<div class="flex items-center justify-between gap-4">
  <div>
    <a href="/admin/{data.type}" class="text-sm opacity-70 hover:underline">← Back to {data.label}</a>
    <h1 class="mt-1 text-2xl font-bold">{data.isNew ? `New ${data.label} entry` : data.title}</h1>
    <p class="text-sm opacity-60">{subtitle}</p>
  </div>
</div>

{#if data.saved}
  <div class="alert alert-success mt-6"><span>Saved. Committed to main; the site will redeploy.</span></div>
{:else if data.error}
  <div class="alert alert-error mt-6"><span>{data.error}</span></div>
{/if}

<form method="POST" action="/admin/save" class="mt-6 flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start">
  <input type="hidden" name="type" value={data.type} />
  <input type="hidden" name="id" value={data.id} />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <!-- Editor column (content-forward: first and widest) -->
  <div class="flex flex-col gap-3 lg:order-1">
    <div class="flex items-center justify-between gap-2">
      <ComponentPalette {registry} insert={(template) => editor.insertComponent(template)} />
      <button type="button" class="btn btn-sm btn-ghost" onclick={togglePreview}>
        {mode === 'split' ? 'Hide preview' : 'Show preview'}
      </button>
    </div>
    <div class="rounded-box border border-base-300 bg-base-100 p-2">
      <input type="hidden" name="body" value={body} />
      {#if mounted}
        <MarkdownEditor {carta} bind:value={body} {mode} />
      {:else}
        <textarea bind:value={body} rows="20" class="textarea w-full font-mono"></textarea>
      {/if}
    </div>
  </div>

  <!-- Frontmatter side column -->
  <fieldset class="grid gap-4 rounded-box border border-base-300 bg-base-100 p-6 lg:order-2">
    {#each data.fields as field (field.name)}
      {#if field.type === 'text' || field.type === 'date'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            name={field.name}
            required={field.required}
            value={fmString(field.name)}
            class="input w-full"
          />
        </label>
      {:else if field.type === 'textarea'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <textarea name={field.name} required={field.required} rows={field.rows ?? 4}
            class="textarea w-full">{fmString(field.name)}</textarea>
        </label>
      {:else if field.type === 'tags'}
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <div class="flex flex-wrap gap-3">
            {#each field.options as option (option)}
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name={field.name} value={option}
                  checked={fmTags(field.name).has(option)} class="checkbox checkbox-sm" />
                {option}
              </label>
            {/each}
          </div>
        </div>
      {:else if field.type === 'freetags'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <input type="text" name={field.name} value={fmFreeTags(field.name)}
            placeholder={field.placeholder ?? 'comma, separated'} class="input w-full" />
        </label>
      {:else if field.type === 'boolean'}
        <label class="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name={field.name} checked={fm[field.name] === true} class="checkbox checkbox-sm" />
          {field.label}
        </label>
      {/if}
    {/each}

    <button type="submit" class="btn btn-primary mt-2">{data.isNew ? 'Create & commit' : 'Save & commit'}</button>
  </fieldset>
</form>
