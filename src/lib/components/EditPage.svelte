<!--
@component
The differentiated editor: the per-concept frontmatter form (from `data.fields`) beside the
markdown editor and a live, design-accurate preview. The whole surface is one form posting to the
`?/save` action; the preview toggle persists per user in localStorage (spec §7.6). A pending entry
adds a state banner plus Publish (riding the same form via formaction) and Discard controls.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import CsrfField from './CsrfField.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import ComponentInsertDialog from './ComponentInsertDialog.svelte';
  import LinkPicker from './LinkPicker.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import RenameDialog from './RenameDialog.svelte';
  import { cairnLinkCompletionSource } from './link-completion.js';
  import { unwrapCairnLink } from './markdown-format.js';
  import type { ComponentRegistry } from '../render/registry.js';
  import type { IconSet } from '../render/glyph.js';
  import type { EditData } from '../sveltekit/content-routes.js';
  import type { TextareaField, TagsField, FreeTagsField } from '../content/types.js';
  import type { LinkResolve } from '../content/links.js';
  import { manifestLinkResolver } from '../content/manifest.js';

  interface Props {
    /** The edit load's data, plus the site name for the heading. */
    data: EditData & { siteName: string };
    /** The site's component registry, for the insert palette. */
    registry?: ComponentRegistry;
    /** The site's design-accurate render pipeline; the preview pane renders its output, which the floored pipeline already sanitized. */
    render?: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
    /** The site's icon set, for the guided form's icon fields. */
    icons?: IconSet;
    /** The `?/save` or `?/delete` action result. Carries the save guard's broken links when a save was
     *  blocked, or the delete guard's inbound linkers when a delete was refused. */
    form?: { brokenLinks?: string[]; body?: string; inboundLinks?: import('../content/manifest.js').InboundLink[]; renameError?: string } | null;
  }

  let { data, registry, render, icons, form }: Props = $props();

  // `body` is local editor state seeded once; it diverges as the user types. A blocked save returns
  // the author's edited markdown as form.body, so seed from that when present to keep the edits and
  // the broken link they were told to fix. On the success and delete-refused paths form carries no
  // body, so it falls back to the committed data.body. untrack() captures the initial value without
  // subscribing to future prop changes.
  let body = $state(untrack(() => form?.body ?? data.body));
  // True from the moment the save form submits until the navigation it triggers replaces the page,
  // so the Save button shows a calm "Saving…" state instead of looking inert.
  let saving = $state(false);
  // The same working state for the Publish button, which rides the edit form via formaction. The
  // submit handler reads the submitter to flip the right one, so Save never reads "Saving…" while
  // a publish is in flight.
  let publishing = $state(false);
  function onEditSubmit(e: SubmitEvent) {
    const formaction = (e.submitter as HTMLButtonElement | null)?.getAttribute('formaction');
    if (formaction === '?/publish') publishing = true;
    else saving = true;
  }
  // Either in-flight submit disables both buttons, so a second click cannot fire a second POST
  // while the first navigation is still pending.
  const busy = $derived(saving || publishing);
  // The discard confirm, on the DeleteDialog pattern: a native <dialog> holding the POST form.
  let discardDialog = $state<HTMLDialogElement | null>(null);
  let showPreview = $state(false);
  let previewHtml = $state('');
  let insert = $state.raw<(text: string) => void>(() => {});
  let insertLink = $state.raw<(href: string, title: string) => void>(() => {});

  // The save guard's broken links, from the blocked action result. The fix unwraps a link in the
  // local body, which the bound editor reconciles, so the author re-saves clean.
  const brokenLinks = $derived(form?.brokenLinks ?? []);
  // Track the hrefs the author has already fixed this session. The banner reads the immutable action
  // result, so without this a fixed row would linger and "Remove link" would read as a no-op.
  let removedLinks = $state<string[]>([]);
  const visibleBrokenLinks = $derived(brokenLinks.filter((h) => !removedLinks.includes(h)));
  function removeBrokenLink(href: string) {
    // Hide the row only when the unwrap changed the body. A genuine no-op keeps the row honest.
    const next = unwrapCairnLink(body, href);
    if (next !== body) {
      body = next;
      removedLinks = [...removedLinks, href];
    }
  }

  // The delete guard's inbound linkers, from a refused delete (fail 409). Empty when the delete was
  // not refused. When set, a delete was blocked by a link that appeared since the page loaded.
  const deleteRefusedLinks = $derived(form?.inboundLinks ?? []);

  // A rename that hit a collision or an invalid slug returns form.renameError.
  const renameError = $derived(form?.renameError ?? '');

  // After a save that links to a draft target, the redirect carries ?drafts=<tokens>.
  let draftWarning = $state('');
  $effect(() => {
    const search = typeof location === 'undefined' ? '' : location.search;
    const drafts = new URLSearchParams(search).get('drafts');
    draftWarning = drafts ? drafts.split(',').filter(Boolean).join(', ') : '';
  });

  // One persistent live region announces the current message, since a {#if}-gated role element
  // inserted fresh is announced inconsistently. A polite region carries the success and draft
  // notices; an assertive region carries the errors. The visible banners below keep their styling
  // but drop their roles, so a message is announced once.
  const politeMessage = $derived.by(() => {
    if (draftWarning) return `Saved. This page links to unpublished pages: ${draftWarning}.`;
    if (data.saved) return 'Saved.';
    if (data.publishedFlash) return 'Published. The live site is rebuilding.';
    if (data.discardedFlash) return 'Changes discarded.';
    if (data.renamed) return `The URL is now ${data.slug}.`;
    return '';
  });
  const assertiveMessage = $derived.by(() => {
    if (data.error) return data.error;
    if (renameError) return renameError;
    if (deleteRefusedLinks.length) {
      const count = deleteRefusedLinks.length;
      return `This ${data.label.toLowerCase()} could not be deleted. ${count} ${count === 1 ? 'page links' : 'pages link'} to it.`;
    }
    if (visibleBrokenLinks.length) {
      const count = visibleBrokenLinks.length;
      return `This page links to ${count} missing ${count === 1 ? 'page' : 'pages'}.`;
    }
    return '';
  });

  // The manifest-backed resolver turns a cairn: link into its live permalink in the preview, and
  // returns undefined for a missing target so the render step marks it cairn-broken-link.
  const resolveLink = $derived(manifestLinkResolver(data.linkTargets));

  // The [[ autocomplete source over the same link targets, handed to the editor's generic seam.
  const completionSources = $derived([cairnLinkCompletionSource(data.linkTargets)]);

  const PREVIEW_KEY = 'cairn-admin:preview';

  $effect(() => {
    // Restore the per-user preference once, on mount.
    showPreview = localStorage.getItem(PREVIEW_KEY) === '1';
  });

  function togglePreview() {
    showPreview = !showPreview;
    localStorage.setItem(PREVIEW_KEY, showPreview ? '1' : '0');
  }

  // Render the design-accurate preview as the body changes, debounced. The site's render is the
  // floored engine pipeline, so its output is already sanitized; the preview mirrors the page.
  // previewRun is a plain counter (not reactive state) used as a latest-wins guard: if a slow earlier
  // async render call resolves after a newer one has started, the stale result is discarded.
  let previewRun = 0;
  $effect(() => {
    if (!showPreview || !render) return;
    const md = body;
    const resolve = resolveLink; // tracked read in the effect body
    const run = ++previewRun;
    const handle = setTimeout(async () => {
      try {
        const html = await render(md, { resolve });
        if (run === previewRun) previewHtml = html;
      } catch {
        if (run === previewRun) previewHtml = '';
      }
    }, 150);
    return () => clearTimeout(handle);
  });

  // Coerce a frontmatter value to a string for text/date/textarea inputs.
  function str(v: unknown): string {
    return v == null ? '' : String(v);
  }
</script>

<header class="mb-6 flex items-center justify-between gap-2">
  <div>
    <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">{data.title}</h1>
    <p class="text-xs text-[var(--color-muted)]">{data.label}: {data.id}</p>
  </div>
  <div class="flex items-center gap-2">
    <ComponentInsertDialog {registry} {insert} {icons} />
    <LinkPicker linkTargets={data.linkTargets} insert={insertLink} />
    <RenameDialog conceptId={data.conceptId} id={data.id} label={data.label} slug={data.slug} />
    <DeleteDialog conceptId={data.conceptId} id={data.id} label={data.label} inboundLinks={data.inboundLinks} pending={data.pending} />
    <button
      type="button"
      class="btn btn-sm btn-ghost"
      aria-expanded={showPreview}
      aria-controls="cairn-preview"
      onclick={togglePreview}
    >
      {showPreview ? 'Hide preview' : 'Show preview'}
    </button>
  </div>
</header>

<div class="sr-only" aria-live="polite">{politeMessage}</div>
<div class="sr-only" aria-live="assertive">{assertiveMessage}</div>

{#if data.saved && !draftWarning}
  <div class="alert alert-success mb-4 text-sm">Saved.</div>
{/if}
{#if data.publishedFlash}
  <div class="alert alert-success mb-4 text-sm">Published. The live site is rebuilding.</div>
{/if}
{#if data.discardedFlash}
  <div class="alert alert-success mb-4 text-sm">Changes discarded.</div>
{/if}
{#if data.renamed}
  <div class="alert alert-success mb-4 text-sm">The URL is now {data.slug}.</div>
{/if}
{#if data.error}
  <div class="alert alert-error mb-4 text-sm">{data.error}</div>
{/if}
{#if renameError}
  <div class="alert alert-error mb-4 text-sm">{renameError}</div>
{/if}
{#if deleteRefusedLinks.length}
  <div class="alert alert-error mb-4 flex-col items-start text-sm">
    <p class="font-medium">This {data.label.toLowerCase()} could not be deleted.</p>
    <p>{deleteRefusedLinks.length} {deleteRefusedLinks.length === 1 ? 'page' : 'pages'} now link to it. Remove or repoint the {deleteRefusedLinks.length === 1 ? 'link' : 'links'} listed below, then delete again.</p>
    <ul class="mt-1 w-full">
      {#each deleteRefusedLinks as link (link.concept + '/' + link.id)}
        <li>
          <a class="link" href={`/admin/${link.concept}/${link.id}`}>{link.title}</a>
        </li>
      {/each}
    </ul>
  </div>
{/if}
{#if visibleBrokenLinks.length}
  <div class="alert alert-error mb-4 flex-col items-start text-sm">
    <p>This page links to {visibleBrokenLinks.length === 1 ? 'a page' : 'pages'} that no longer {visibleBrokenLinks.length === 1 ? 'exists' : 'exist'}. Remove the broken {visibleBrokenLinks.length === 1 ? 'link' : 'links'} and save again.</p>
    <ul class="mt-1 w-full">
      {#each visibleBrokenLinks as href (href)}
        <li class="flex items-center justify-between gap-2">
          <code class="text-xs">{href}</code>
          <button type="button" class="btn btn-xs" onclick={() => removeBrokenLink(href)}>Remove link</button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
{#if draftWarning}
  <div class="alert alert-warning mb-4 text-sm">
    Saved. Note: this page links to unpublished {draftWarning.includes(',') ? 'pages' : 'a page'} ({draftWarning}), which will 404 until published.
  </div>
{/if}

{#if data.pending}
  <!-- A standing state notice, not a flash: the branch holds edits the live site does not show. -->
  <div class="alert alert-warning mb-4 text-sm">
    {#if data.published}Unpublished changes. The live site still shows the last published version.{:else}Not yet published.{/if}
  </div>
{/if}

<form method="POST" action="?/save" onsubmit={onEditSubmit} class="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6">
  <CsrfField />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <div class="lg:order-1">
    <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-hidden shadow-[var(--cairn-shadow)]">
      <MarkdownEditor
        bind:value={body}
        name="body"
        registerInsert={(fn) => (insert = fn)}
        registerInsertLink={(fn) => (insertLink = fn)}
        {completionSources}
      />
    </div>
    {#if showPreview}
      <section
        id="cairn-preview"
        aria-label="Preview"
        class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 prose mt-4 max-w-none p-4 shadow-[var(--cairn-shadow)]"
      >
        {@html previewHtml}
      </section>
    {/if}
  </div>

  <aside class="lg:order-2 mt-4 lg:mt-0">
    <fieldset class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 flex flex-col gap-3 p-4 shadow-[var(--cairn-shadow)]">
      <legend class="sr-only">Frontmatter</legend>
      {#each data.fields as field (field.name)}
        {#if field.type === 'textarea'}
          {@const f = field as TextareaField}
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">{f.label}</span>
            <textarea class="textarea" name={f.name} aria-label={f.label} rows={f.rows ?? 3}>{str(data.frontmatter[f.name])}</textarea>
          </label>
        {:else if field.type === 'date'}
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">{field.label}</span>
            <input class="input" type="date" name={field.name} aria-label={field.label} value={str(data.frontmatter[field.name])} />
          </label>
        {:else if field.type === 'boolean'}
          <label class="label cursor-pointer justify-start gap-2">
            <input class="checkbox checkbox-sm" type="checkbox" name={field.name} aria-label={field.label} checked={data.frontmatter[field.name] === true} />
            <span class="text-sm">{field.label}</span>
          </label>
        {:else if field.type === 'tags'}
          {@const f = field as TagsField}
          {@const selected = (data.frontmatter[f.name] ?? []) as string[]}
          <fieldset class="fieldset">
            <legend class="fieldset-legend">{f.label}</legend>
            <div class="flex flex-wrap gap-2">
              {#each f.options as option (option)}
                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    class="checkbox checkbox-sm"
                    type="checkbox"
                    name={f.name}
                    value={option}
                    checked={selected.includes(option)}
                  />
                  <span class="text-sm">{option}</span>
                </label>
              {/each}
            </div>
          </fieldset>
        {:else if field.type === 'freetags'}
          {@const f = field as FreeTagsField}
          {@const tagValue = ((data.frontmatter[f.name] ?? []) as string[]).join(', ')}
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">{f.label}</span>
            <input
              class="input"
              name={f.name}
              aria-label={f.label}
              placeholder={f.placeholder}
              value={tagValue}
            />
          </label>
        {:else}
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">{field.label}</span>
            <input class="input" name={field.name} aria-label={field.label} value={str(data.frontmatter[field.name])} required={field.required} />
          </label>
        {/if}
      {/each}
      <div class="mt-3 flex flex-col gap-2">
        <button type="submit" class="btn btn-primary" disabled={busy}>
          {#if saving}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Saving…{:else}Save{/if}
        </button>
        {#if data.pending}
          <!-- Outline keeps Save the single solid primary action; Publish reads as its peer. -->
          <button type="submit" formaction="?/publish" class="btn btn-outline btn-primary" disabled={busy}>
            {#if publishing}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Publishing…{:else}Publish{/if}
          </button>
          <button type="button" class="btn btn-ghost" aria-haspopup="dialog" onclick={() => discardDialog?.showModal()}>
            Discard changes
          </button>
        {/if}
      </div>
    </fieldset>
  </aside>
</form>

{#if data.pending}
  <dialog class="modal" aria-labelledby="cairn-discard-dialog-title" bind:this={discardDialog}>
    <div class="modal-box">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="cairn-discard-dialog-title" class="text-base font-semibold">Discard the unpublished changes?</h2>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => discardDialog?.close()}>✕</button>
      </div>
      {#if data.published}
        <p class="mb-3 text-sm">This restores the live version. The changes cannot be recovered.</p>
      {:else}
        <p class="mb-3 text-sm">This entry has never been published, so discarding deletes it. Nothing can be recovered.</p>
      {/if}
      <form method="POST" action="?/discard" class="flex justify-end gap-2">
        <CsrfField />
        <button type="button" class="btn btn-sm" onclick={() => discardDialog?.close()}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-error">Discard</button>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button tabindex="-1" aria-label="Close">close</button>
    </form>
  </dialog>
{/if}
