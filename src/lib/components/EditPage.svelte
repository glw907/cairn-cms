<!--
@component
The differentiated editor: the per-concept frontmatter form (from `data.fields`) beside the
markdown editor and a live, design-accurate preview. The whole surface is one form posting to the
`?/save` action. The title field is hoisted above the editor card as the document title; the
remaining fields group in the sidebar under Details, Visibility (the draft boolean as the Hidden
toggle), and Address (the slug with the Change URL trigger). The toolbar's Write/Preview tabs
swap the editing surface for the rendered preview inside the same card; every visit lands on
Write. A sticky glass header carries the breadcrumb, the status badges, the save-state indicator,
and the lifecycle actions: Save, Publish (riding the same form via formaction while edits are
pending), and an overflow menu for Discard and Delete. One feedback strip under the header carries the
transient flashes, and the editor card's footer holds the word count and the Markdown help.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import CsrfField from './CsrfField.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import EditorToolbar from './EditorToolbar.svelte';
  import ComponentInsertDialog from './ComponentInsertDialog.svelte';
  import LinkPicker from './LinkPicker.svelte';
  import WebLinkDialog from './WebLinkDialog.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import RenameDialog from './RenameDialog.svelte';
  import MarkdownHelpDialog from './MarkdownHelpDialog.svelte';
  import { cairnLinkCompletionSource } from './link-completion.js';
  import { unwrapCairnLink, type FormatKind } from './markdown-format.js';
  import { directiveLineKind } from './markdown-directives.js';
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

  // Dirty tracking. The body compares against the text the page loaded with (or the edited body a
  // blocked save returned, which seeded the editor); the uncontrolled sidebar fields flip a flag
  // on any input event, and the navigation a save triggers reloads the page, which resets both.
  const bodyDirty = $derived(body !== (form?.body ?? data.body));
  let fieldsDirty = $state(false);
  const dirty = $derived(bodyDirty || fieldsDirty);
  // What the header's save-state indicator says.
  const saveState = $derived(dirty ? 'Unsaved changes' : data.saved ? 'Saved' : '');
  function onFormInput(e: Event) {
    const target = e.target as Element | null;
    // Two kinds of input event bubble through the form without being frontmatter edits: the link
    // picker's search box (its dialog sits in the toolbar snippet) and the editing surface's
    // contenteditable. Skipping the surface keeps body edits owned by bodyDirty, so undoing back
    // to the committed text reads clean again.
    if (target?.closest('dialog, #cairn-pane-write')) return;
    fieldsDirty = true;
  }

  // The edit form element, for the Ctrl/Cmd+S shortcut's requestSubmit.
  let editForm = $state<HTMLFormElement | null>(null);

  // The SvelteKit half of the leave guard. Registered at component init (beforeNavigate wraps
  // onMount, so it must run synchronously here) and auto-unregistered on destroy. A submit's own
  // navigation passes through because busy flips before it starts.
  beforeNavigate((navigation) => {
    if (dirty && !busy && !confirm('You have unsaved changes. Leave anyway?')) navigation.cancel();
  });

  // The browser half of the leave guard plus the page-wide save shortcut. The handlers read the
  // current dirty and busy values at event time, so the effect itself tracks nothing and runs once.
  $effect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !busy) e.preventDefault();
    };
    // Guard-clause style on purpose: svelte 5.56.1 misprints `(a || b) && c` by dropping the
    // parentheses, and consumers compile this source with their own svelte.
    const onWindowKeydown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      editForm?.requestSubmit();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onWindowKeydown);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onWindowKeydown);
    };
  });
  // The discard confirm, on the DeleteDialog pattern: a native <dialog> holding the POST form.
  let discardDialog = $state<HTMLDialogElement | null>(null);
  // Which pane the editor card shows. The toolbar's tablist drives it; Write is always the
  // landing tab.
  let mode = $state<'write' | 'preview'>('write');
  let previewHtml = $state('');
  // True after a render call threw, so the preview pane can say so instead of going blank.
  let previewFailed = $state(false);
  let insert = $state.raw<(text: string) => void>(() => {});
  let insertLink = $state.raw<(href: string, title: string) => void>(() => {});
  // The editor's current selection, registered by MarkdownEditor on mount; the web link dialog
  // reads it for the Text field's default.
  let getSelection = $state.raw<() => string>(() => '');
  // The editor's selection transform, registered by MarkdownEditor on mount; a no-op until then.
  let format = $state.raw<(kind: FormatKind) => void>(() => {});
  // A headless dialog instance, typed structurally over its exported open() (the linkPicker idiom).
  type DialogHandle = { open: () => void };
  // The web link dialog, for the Ctrl/Cmd+K shortcut.
  let webLinkDialog = $state<DialogHandle | null>(null);
  // The lifecycle dialogs, opened from the header's overflow menu.
  let deleteDialog = $state<DialogHandle | null>(null);
  let renameDialog = $state<DialogHandle | null>(null);
  // The Markdown cheat sheet, opened from the editor card's footer.
  let helpDialog = $state<DialogHandle | null>(null);

  // The header's status badge, in ConceptList's vocabulary: a pending entry reads Edited (or New
  // when it has never been published); otherwise the live site matches and it reads Published.
  const status = $derived.by(() => {
    if (!data.pending) return 'Published';
    return data.published ? 'Edited' : 'New';
  });
  const statusBadge = $derived.by(() => {
    if (status === 'Edited') return 'badge-warning';
    if (status === 'New') return 'badge-info';
    return 'badge-ghost';
  });

  // An overflow-menu pick runs its action, then blurs the item so the focus-driven DaisyUI
  // dropdown closes (the EditorToolbar More-menu pattern).
  function pickAction(action: () => void) {
    action();
    (document.activeElement as HTMLElement | null)?.blur();
  }

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

  // The one transient feedback strip under the sticky header. The redirect flags are mutually
  // exclusive in practice; the chain picks one so a surprise overlap still renders a single strip.
  // A saved flash with a draft warning yields to the warning alert below, the prior behavior.
  const flash = $derived.by(() => {
    if (data.saved && !draftWarning)
      return 'Saved. Your site keeps showing the published version until you publish.';
    if (data.publishedFlash) return 'Published. The live site is rebuilding.';
    if (data.discardedFlash) return 'Changes discarded.';
    if (data.renamed) return `The URL is now ${data.slug}.`;
    return '';
  });

  // One persistent live region announces the current message, since a {#if}-gated role element
  // inserted fresh is announced inconsistently. A polite region carries the success and draft
  // notices (the flash, plus the draft notice the strip yields to); an assertive region carries
  // the errors. The visible banners below keep their styling but drop their roles, so a message
  // is announced once.
  const politeMessage = $derived(
    draftWarning ? `Saved. This page links to unpublished pages: ${draftWarning}.` : flash,
  );
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

  // The editor footer's word count, over the local body so it tracks every keystroke. Directive
  // machinery lines and table rows are dropped first, so the count reads as the author's prose.
  const countedBody = $derived(
    body
      .split('\n')
      .filter((line) => directiveLineKind(line) === null && !/^\s*\|/.test(line))
      .join('\n'),
  );
  const wordCount = $derived(countedBody.trim() ? countedBody.trim().split(/\s+/).length : 0);
  const wordLabel = $derived(wordCount === 1 ? '1 word' : `${wordCount} words`);

  // The manifest-backed resolver turns a cairn: link into its live permalink in the preview, and
  // returns undefined for a missing target so the render step marks it cairn-broken-link.
  const resolveLink = $derived(manifestLinkResolver(data.linkTargets));

  // The [[ autocomplete source over the same link targets, handed to the editor's generic seam.
  const completionSources = $derived([cairnLinkCompletionSource(data.linkTargets)]);

  function setMode(m: 'write' | 'preview') {
    mode = m;
  }

  // Preview is read-only, so the insert controls the page renders into the toolbar disable with
  // the strip's own format buttons.
  const insertDisabled = $derived(mode === 'preview');

  // The editor card's keyboard shortcuts. Bound to the card so they fire wherever focus sits in the
  // strip or the surface, without claiming the keys page-wide. The listener attaches
  // programmatically: it is event delegation, not an interaction affordance, which Svelte's a11y
  // rule cannot tell apart on a declarative handler.
  let editorCard = $state<HTMLDivElement | null>(null);
  $effect(() => {
    const card = editorCard;
    if (!card) return;
    card.addEventListener('keydown', onEditorKeydown);
    return () => card.removeEventListener('keydown', onEditorKeydown);
  });
  function onEditorKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      format('bold');
    } else if (key === 'i') {
      e.preventDefault();
      format('italic');
    } else if (key === 'k') {
      e.preventDefault();
      webLinkDialog?.open();
    }
  }

  // Render the design-accurate preview as the body changes, debounced. The site's render is the
  // floored engine pipeline, so its output is already sanitized; the preview mirrors the page.
  // previewRun is a plain counter (not reactive state) used as a latest-wins guard: if a slow earlier
  // async render call resolves after a newer one has started, the stale result is discarded.
  let previewRun = 0;
  $effect(() => {
    if (mode !== 'preview' || !render) return;
    const md = body;
    const resolve = resolveLink; // tracked read in the effect body
    const run = ++previewRun;
    const handle = setTimeout(async () => {
      try {
        const html = await render(md, { resolve });
        if (run === previewRun) {
          previewHtml = html;
          previewFailed = false;
        }
      } catch {
        if (run === previewRun) {
          previewHtml = '';
          previewFailed = true;
        }
      }
    }, 150);
    return () => clearTimeout(handle);
  });

  // Coerce a frontmatter value to a string for text/date/textarea inputs.
  function str(v: unknown): string {
    return v == null ? '' : String(v);
  }

  // The eyebrow legend each sidebar group opens with, one class string for all three.
  const eyebrowClass =
    'mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]';

  // The sidebar's grouping. The title field hoists above the editor card as the document title,
  // and a boolean named draft becomes the Visibility group's Hidden toggle (both production
  // adapters use that name); everything else is a Details field.
  const titleField = $derived(data.fields.find((f) => f.name === 'title'));
  const draftField = $derived(data.fields.find((f) => f.type === 'boolean' && f.name === 'draft'));
  const detailFields = $derived(data.fields.filter((f) => f !== titleField && f !== draftField));
</script>

<!-- The sticky action header, a glass ruler: a translucent base-200 veil with backdrop blur the
     page scrolls beneath, never a second opaque band (the admin topbar keeps that role). It sticks
     under the h-16 topbar and bleeds across AdminLayout's content padding (p-4, lg:p-8) with
     matching negative margins, so the veil spans the whole content column. -->
<header
  class="sticky top-16 z-10 -mx-4 mb-6 border-b border-[var(--cairn-card-border)] bg-base-200/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8"
>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={`/admin/${data.conceptId}`}
        class="flex shrink-0 items-center gap-0.5 text-sm text-[var(--color-muted)] transition-colors hover:text-base-content"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 18-6-6 6-6" />
        </svg>
        {data.label}
      </a>
      <!-- The manuscript heading below is the visible title; repeating it here read as
           duplication, so the header keeps the h1 for assistive tech only. -->
      <h1 class="sr-only">{data.title}</h1>
      <span class="badge badge-sm font-medium {statusBadge}">{status}</span>
      {#if data.frontmatter.draft === true}
        <span class="badge badge-neutral badge-sm font-medium">Hidden</span>
      {/if}
      <!-- The save-state indicator eases in and out; the admin sheet's prefers-reduced-motion rule
           squashes the transition for editors who asked for that. The dot is the quiet unsaved cue. -->
      <span
        class="cairn-save-state flex items-center gap-1.5 text-xs text-[var(--color-muted)] transition-opacity duration-300"
        class:opacity-0={!saveState}
        aria-live="off"
      >
        {#if dirty}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true"></span>{/if}
        {saveState}
      </span>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <div class="dropdown dropdown-end">
        <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="More actions" title="More actions" aria-haspopup="true">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12h.01" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12h.01" />
          </svg>
        </button>
        <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box z-10 w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]">
          {#if data.pending}
            <li>
              <button type="button" aria-haspopup="dialog" onclick={() => pickAction(() => discardDialog?.showModal())}>
                Discard changes
              </button>
            </li>
          {/if}
          <li>
            <button type="button" class="text-error" aria-haspopup="dialog" onclick={() => pickAction(() => deleteDialog?.open())}>
              Delete
            </button>
          </li>
        </ul>
      </div>
      {#if data.pending}
        <!-- Outline keeps Save the single solid primary action; Publish reads as its peer. -->
        <button type="submit" form="cairn-edit-form" formaction="?/publish" class="btn btn-outline btn-primary btn-sm" disabled={busy}>
          {#if publishing}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Publishing…{:else}Publish{/if}
        </button>
      {/if}
      <!-- Save sleeps while the page is clean, agreeing with the header indicator; a new entry
           stays saveable so it can be created as loaded. -->
      <button type="submit" form="cairn-edit-form" class="btn btn-primary btn-sm" disabled={busy || (!dirty && !data.isNew)}>
        {#if saving}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Saving…{:else}Save{/if}
      </button>
    </div>
  </div>
</header>

<div class="sr-only" aria-live="polite">{politeMessage}</div>
<div class="sr-only" aria-live="assertive">{assertiveMessage}</div>

<!-- The feedback strip slides in just under the header: @starting-style drives the entry, so the
     motion is pure CSS and the admin sheet's prefers-reduced-motion rule squashes it. -->
{#if flash}
  <div class="cairn-feedback alert alert-success mb-4 text-sm transition-all duration-300 starting:-translate-y-2 starting:opacity-0">
    {flash}
  </div>
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

<form
  method="POST"
  action="?/save"
  id="cairn-edit-form"
  bind:this={editForm}
  onsubmit={onEditSubmit}
  oninput={onFormInput}
  class="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6"
>
  <CsrfField />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <div class="lg:order-1">
    {#if titleField}
      <!-- The hoisted document title: large, borderless, in the display face, so the manuscript
           reads as the protagonist. It submits as name="title", the same field as before. -->
      <input
        class="cairn-doc-title mb-4 w-full border-0 bg-transparent text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] placeholder:text-[var(--color-muted)] focus:outline-none"
        name="title"
        value={str(data.frontmatter.title)}
        placeholder={titleField.label}
        aria-label={titleField.label}
        required={titleField.required}
      />
    {/if}
    <!-- The editor card: the toolbar strip and the editing surface share one frame, so the editor
         reads as a single object. The card carries the formatting shortcuts for everything in it. -->
    <div
      bind:this={editorCard}
      class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-hidden shadow-[var(--cairn-shadow)]"
      role="group"
      aria-label="Editor"
    >
      <EditorToolbar {format} {mode} onMode={setMode}>
        {#snippet insertControls()}
          <ComponentInsertDialog {registry} {insert} {icons} disabled={insertDisabled} />
          <WebLinkDialog bind:this={webLinkDialog} insert={insertLink} selection={getSelection} disabled={insertDisabled} />
          <LinkPicker linkTargets={data.linkTargets} insert={insertLink} disabled={insertDisabled} />
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            disabled
            aria-label="Image (coming soon)"
            title="Image (coming soon)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </button>
        {/snippet}
      </EditorToolbar>
      <!-- The Write pane stays mounted while Preview shows, so CodeMirror keeps its caret, scroll
           position, and undo history across the tab switch. -->
      <div id="cairn-pane-write" role="tabpanel" aria-labelledby="cairn-tab-write" class:hidden={mode === 'preview'}>
        <MarkdownEditor
          bind:value={body}
          name="body"
          registerInsert={(fn) => (insert = fn)}
          registerInsertLink={(fn) => (insertLink = fn)}
          registerGetSelection={(fn) => (getSelection = fn)}
          registerFormat={(fn) => (format = fn)}
          {completionSources}
        />
      </div>
      {#if mode === 'preview'}
        <div id="cairn-pane-preview" role="tabpanel" aria-labelledby="cairn-tab-preview" class="prose max-w-none p-4">
          {#if previewHtml}
            {@html previewHtml}
          {:else if previewFailed}
            <p class="text-sm text-[var(--color-muted)]">The preview could not render this content.</p>
          {:else}
            <p class="text-sm text-[var(--color-muted)]">Nothing to preview yet.</p>
          {/if}
        </div>
      {/if}
      <!-- The card footer, part of the same instrument frame. It stays up in Preview too, so the
           frame never jumps between tabs and the count keeps reading while proofing. -->
      <div class="flex items-center justify-between border-t border-[var(--cairn-card-border)] px-3 py-1 text-xs text-[var(--color-muted)]">
        <span>{wordLabel}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs font-normal text-[var(--color-muted)]"
          aria-haspopup="dialog"
          onclick={() => helpDialog?.open()}
        >
          Markdown help
        </button>
      </div>
    </div>
  </div>

  <aside class="lg:order-2 mt-4 lg:mt-0">
    <!-- One sidebar card, three labeled groups. Each group is its own fieldset so its eyebrow is
         a real legend that screen readers announce with the fields it holds. -->
    <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 flex flex-col gap-5 p-4 shadow-[var(--cairn-shadow)]">
      {#if detailFields.length}
      <fieldset class="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend class={eyebrowClass}>Details</legend>
      {#each detailFields as field (field.name)}
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
      </fieldset>
      {/if}
      {#if draftField}
      <fieldset class="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend class={eyebrowClass}>Visibility</legend>
        <label class="label cursor-pointer justify-start gap-2">
          <input class="checkbox checkbox-sm" type="checkbox" name="draft" checked={data.frontmatter.draft === true} />
          <span class="text-sm">Hidden</span>
        </label>
        <p class="text-xs text-[var(--color-muted)]">Hidden entries stay off the site's lists and feeds, even when published.</p>
      </fieldset>
      {/if}
      <fieldset class="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend class={eyebrowClass}>Address</legend>
        <div class="flex items-center justify-between gap-2">
          <code class="min-w-0 break-all text-xs text-[var(--color-muted)]">/{data.slug}</code>
          <button
            type="button"
            class="btn btn-ghost btn-sm shrink-0"
            aria-haspopup="dialog"
            onclick={() => renameDialog?.open()}
          >
            Change URL
          </button>
        </div>
      </fieldset>
    </div>
  </aside>
</form>

<!-- The lifecycle dialogs, mounted headless: the header's overflow menu drives them through their
     exported open(). -->
<RenameDialog bind:this={renameDialog} trigger={false} conceptId={data.conceptId} id={data.id} label={data.label} slug={data.slug} />
<MarkdownHelpDialog bind:this={helpDialog} />
<DeleteDialog
  bind:this={deleteDialog}
  trigger={false}
  conceptId={data.conceptId}
  id={data.id}
  label={data.label}
  inboundLinks={data.inboundLinks}
  pending={data.pending}
/>

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
