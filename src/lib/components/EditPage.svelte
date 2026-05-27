<script lang="ts">
  // The editor: a per-field frontmatter form (driven by the adapter's `fields`) plus a Carta
  // markdown editor whose preview runs the site's plugin set (passed as `preview`). Data comes
  // from `editLoad` merged with `adminLayoutLoad` (siteName); `carta-md` is a peer dependency.
  import { onMount } from 'svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  import 'carta-md/default.css';
  import { previewCartaOptions, type PreviewPlugins } from '../carta';
  import type { CairnField } from '../adapter';
  import type { EditData } from '../sveltekit';

  let { data, preview }: { data: EditData & { siteName: string }; preview: PreviewPlugins } = $props();

  // Body is editable state; the Carta editor's preview runs the exact site plugin set, so it
  // matches the live page. A hidden input carries the current value into the form.
  // svelte-ignore state_referenced_locally (seeding from the initial load is intended)
  let body = $state(data.body);

  // svelte-ignore state_referenced_locally (the preview plugin set is fixed for the load)
  const carta = new Carta(previewCartaOptions(preview));

  // Carta's MarkdownEditor must not render on the worker (it pulls Shiki). onMount fires only
  // in the browser, so SSR renders the plain textarea and the client swaps in the editor.
  // This is the kit-free equivalent of the per-site route's `$app/environment` `browser` guard.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

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
</script>

<svelte:head>
  <title>Edit {data.title} · {data.siteName} CMS</title>
</svelte:head>

<div class="flex items-center justify-between gap-4">
  <div>
    <a href="/admin" class="text-sm opacity-70 hover:underline">← Back</a>
    <h1 class="mt-1 text-2xl font-bold">{data.title}</h1>
    <p class="text-sm opacity-60">{data.label} · {data.path}</p>
  </div>
</div>

{#if data.saved}
  <div class="alert alert-success mt-6"><span>Saved — committed to main; the site will redeploy.</span></div>
{:else if data.error}
  <div class="alert alert-error mt-6"><span>{data.error}</span></div>
{/if}

<form method="POST" action="/admin/save" class="mt-6 flex flex-col gap-5">
  <input type="hidden" name="type" value={data.type} />
  <input type="hidden" name="id" value={data.id} />

  <fieldset class="grid gap-4 rounded-box border border-base-300 bg-base-100 p-6">
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
  </fieldset>

  <div class="rounded-box border border-base-300 bg-base-100 p-2">
    <input type="hidden" name="body" value={body} />
    {#if mounted}
      <MarkdownEditor {carta} bind:value={body} mode="tabs" />
    {:else}
      <textarea bind:value={body} rows="20" class="textarea w-full font-mono"></textarea>
    {/if}
  </div>

  <div class="flex justify-end">
    <button type="submit" class="btn btn-primary">Save &amp; commit</button>
  </div>
</form>
