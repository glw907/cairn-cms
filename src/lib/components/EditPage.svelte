<!--
@component
The differentiated editor: the per-concept frontmatter form (from `data.fields`) beside the
markdown editor and a live, design-accurate preview. The whole surface is one form posting to the
`?/save` action. The title field is hoisted above the editor card as the document title; the
remaining fields group behind the Details slide-over (a fixed panel below the band, toggled from
the band's Details trigger or Ctrl+.) under Details, Visibility (the draft boolean as the Hidden
toggle), and Address (the slug with the Change URL trigger). The toolbar's Write/Preview tabs
swap the editing surface for the rendered preview inside the same card; every visit lands on
Write. Preview renders inside a sandboxed iframe that links the site's own stylesheets (the
adapter's `preview` knob), takes the full content width (the sidebar hides until Write), and
sizes to a persisted device width picked from the toolbar's capsule. A sticky glass header
carries the breadcrumb, the status badges, the save-state indicator,
and the lifecycle actions: Save, Publish (always present, riding the same form via formaction;
guarded rather than hidden when there is nothing new to publish), and an overflow menu for
Discard and Delete. One feedback strip under the header carries the
transient flashes, and the editor card's footer is the writing-environment strip: the word
count, the Prose/Markup posture pair, the focus and typewriter toggles, and the Markdown help.
-->
<script lang="ts">
  import { flushSync, untrack, getContext } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import SquarePenIcon from '@lucide/svelte/icons/square-pen';
  import LinkIcon from '@lucide/svelte/icons/link';
  import FileSymlinkIcon from '@lucide/svelte/icons/file-symlink';
  import PanelRightIcon from '@lucide/svelte/icons/panel-right';
  import ImageIcon from '@lucide/svelte/icons/image';
  import { useTopbar } from './topbar-context.js';
  import CsrfField from './CsrfField.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import EditorToolbar from './EditorToolbar.svelte';
  import ComponentInsertDialog, { insertableDefs, hasSchema } from './ComponentInsertDialog.svelte';
  import LinkPicker from './LinkPicker.svelte';
  import WebLinkDialog from './WebLinkDialog.svelte';
  import MediaInsertPopover from './MediaInsertPopover.svelte';
  import FieldInput from './FieldInput.svelte';
  import type MediaHeroField from './MediaHeroField.svelte';
  import MediaFigureControl from './MediaFigureControl.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import RenameDialog from './RenameDialog.svelte';
  import MarkdownHelpDialog from './MarkdownHelpDialog.svelte';
  import ShortcutsDialog from './ShortcutsDialog.svelte';
  import TidyReview from './TidyReview.svelte';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { validateTidy, TIDY_REJECTION_MESSAGE } from './tidy-validate.js';
  import type { Change } from './tidy-diff.js';
  import { cairnLinkCompletionSource } from './link-completion.js';
  import {
    findMediaImagesNeedingAlt,
    unwrapCairnLink,
    unwrapFigure,
    updateFigure,
    wrapImageInFigure,
    type FigureAtImage,
    type FigureRole,
    type FormatKind,
  } from './markdown-format.js';
  import { buildPreviewDoc, deviceLabel, previewDevice, previewDevices, type PreviewDeviceId } from './preview-doc.js';
  import { directiveLineKind, findInlineDirectives } from './markdown-directives.js';
  import type { ComponentRegistry, ComponentDef } from '../render/registry.js';
  import { parseComponent, componentRoundTripSafety } from '../render/component-grammar.js';
  import type { IconSet } from '../render/glyph.js';
  import type { ContentFormFailure, EditData } from '../sveltekit/content-routes.js';
  import type { SiteRender } from '../content/types.js';
  import { manifestLinkResolver } from '../content/manifest.js';
  import { manifestMediaResolver } from '../render/resolve-media.js';
  import type { MediaEntry } from '../media/manifest.js';
  import { mediaLibraryEntry } from '../media/library-entry.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { postFormAction } from './client-action.js';
  import { arbitrateChecked } from './spellcheck.js';
  import type { DiagnosticCounts } from './editor-diagnostics-announcer.js';

  interface Props {
    /** The edit load's data, plus the site name for the heading. */
    data: EditData & { siteName: string };
    /** The site's component registry, for the insert palette. */
    registry?: ComponentRegistry;
    /** The site's design-accurate render pipeline; the preview pane renders its output, which the floored pipeline already sanitized. */
    render?: SiteRender;
    /** The site's icon set, for the guided form's icon fields. */
    icons?: IconSet;
    /** The last content action's failure: the save guard's broken links, the delete guard's
     *  inbound linkers, or a rename refusal, each carrying the shared `error` summary. */
    form?: ContentFormFailure | null;
  }

  let { data, registry, render, icons, form }: Props = $props();

  /** One action row in an advisory notice: an `href` row renders a link, an `onAct` row a button. */
  type AdvisoryRow = { rowLabel?: string; rowCode?: boolean; label: string; href?: string; onAct?: () => void };
  /** A notice ready to render: the server advisory and the client needs-alt notice both map to this. */
  type RenderNotice = { kind: string; message: string; detail?: string; rows: AdvisoryRow[] };

  // The client-side tidy deadline (spec 2.1, Task 14): a slow call becomes a cancel/retry rather than a
  // hung review. Set above the action's own 30s Worker deadline so the server's retryable fail lands
  // first when the model is merely slow; this catches a stalled connection past that.
  const TIDY_CLIENT_TIMEOUT_MS = 45_000;

  // The topbar context portal (CairnAdminShell owns the holder). The desk snippet below carries the
  // document's status and action clusters; this effect registers it into the band on mount and
  // nulls it on teardown, so CairnAdmin's view switch (which unmounts EditPage) clears the band.
  // The holder is absent only when EditPage renders outside CairnAdminShell (it always renders inside
  // it in the app); the optional chaining keeps that case inert.
  const topbar = useTopbar();
  $effect(() => {
    if (!topbar) return;
    topbar.desk = desk;
    // Zen drops the band: CairnAdminShell reads this flag to remove the whole topbar element, so the
    // desk's clusters and CairnAdminShell's own chrome (the drawer toggle, the breadcrumb) all slide
    // away together. The effect tracks `zen`, so a toggle reaches the band live.
    topbar.zen = zen;
    return () => {
      topbar.desk = null;
      topbar.zen = false;
    };
  });

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
    // Commit any pending personal-dictionary additions alongside the save. Fire-and-forget: the words
    // are already live in the Worker, so the in-flight commit never blocks the save navigation; an add
    // that does not land stays pending for the next save (declared before the navigation reads it).
    void commitPendingDictionary();
  }
  // Guards the Publish button's own click: aria-disabled blocks nothing by itself (it is not the
  // native disabled attribute), so a guarded click must cancel the button's default action here,
  // before it submits the form via its ?/publish formaction. An actionable click passes through
  // untouched and reaches onEditSubmit as an ordinary submit.
  function onPublishClick(e: MouseEvent) {
    if (!publishActionable) e.preventDefault();
  }
  // Either in-flight submit disables both buttons, so a second click cannot fire a second POST
  // while the first navigation is still pending.
  const busy = $derived(saving || publishing);
  // True once a non-edit POST (discard, delete, rename) submits. Those forms navigate the
  // document without flipping busy, so without this the leave guard would fire mid-discard while
  // the page is still dirty, which is the primary discard scenario.
  let leaving = $state(false);

  // Dirty tracking. The body compares against the text the page loaded with (or the edited body a
  // blocked save returned, which seeded the editor); the uncontrolled sidebar fields flip a flag
  // on any input event, and the navigation a save triggers reloads the page, which resets both.
  const bodyDirty = $derived(body !== (form?.body ?? data.body));
  let fieldsDirty = $state(false);
  const dirty = $derived(bodyDirty || fieldsDirty);
  const saveState = $derived(dirty ? 'Unsaved changes' : data.saved ? 'Saved' : '');
  // Whether Publish has anything to take live: a body/field edit, a held draft branch, or a
  // brand-new entry that has never been saved. Otherwise the button is guarded rather than hidden
  // (the grounding survey: six of eight comparable editors keep Publish permanently visible), so
  // the control stays discoverable and its reason reaches assistive technology.
  const publishActionable = $derived(dirty || data.pending || data.isNew);
  // The guarded reason, undefined while actionable so the button carries no extra title or
  // aria-label beyond its own "Publish"/"Publishing…" text. The accessible name keeps the visible
  // "Publish" label in front of the reason (WCAG 2.5.3, label in name), so a focused guarded
  // button still announces what it is before why it is inactive; the title carries the bare
  // reason, since the tooltip renders beside the visible label.
  const publishGuardReason = $derived(publishActionable ? undefined : 'Nothing new to publish');
  const publishGuardName = $derived(publishActionable ? undefined : 'Publish: nothing new to publish');
  function onFormInput(e: Event) {
    const target = e.target as Element | null;
    // Two kinds of input event bubble through the form without being frontmatter edits: the link
    // picker's search box (its dialog sits in the toolbar snippet) and the editing surface's
    // contenteditable. Skipping the surface keeps body edits owned by bodyDirty, so undoing back
    // to the committed text reads clean again.
    if (target?.closest('dialog, #cairn-pane-write')) return;
    fieldsDirty = true;
  }
  // Mark the details fields dirty without a form input event. The hero field writes its value to
  // hidden inputs, whose programmatic value changes do not fire the form's oninput, so it signals
  // dirty through this helper instead.
  function markFieldsDirty() {
    fieldsDirty = true;
  }

  // The edit form element, for the Ctrl/Cmd+S shortcut's requestSubmit.
  let editForm = $state<HTMLFormElement | null>(null);
  // The header's Publish submitter, for the Ctrl/Cmd+Shift+S shortcut: requesting submit through it
  // carries the ?/publish formaction and trips the busy flags down the existing submit path. Publish
  // always renders now, so this ref always exists; the chord guards on publishActionable itself,
  // the same condition the button's own aria-disabled reads.
  let publishButton = $state<HTMLButtonElement | null>(null);

  // A required field hidden from the browser's validation report cannot take it: an invisible
  // control is unfocusable, so the browser cancels the save silently with no message. Two surfaces
  // can hide a required field, so this capture-phase invalid listener reveals whichever holds the
  // invalid control before the report that follows fires. A field in the write pane needs Preview
  // flipped back to Write; a field in the details slide-over needs the panel opened. flushSync
  // forces the reveal inside the event, so the report lands on a now-visible control.
  function onFormInvalid(e: Event) {
    const target = e.target as Element | null;
    if (target?.closest('aside')) {
      if (!detailsOpen) flushSync(() => (detailsOpen = true));
      return;
    }
    if (mode === 'write') return;
    flushSync(() => (mode = 'write'));
  }

  // The SvelteKit half of the leave guard. Registered at component init (beforeNavigate wraps
  // onMount, so it must run synchronously here) and auto-unregistered on destroy. A submit's own
  // navigation passes through because busy flips before it starts, and a non-edit POST's because
  // leaving does.
  beforeNavigate((navigation) => {
    // A full-page unload (refresh, tab close, external link): per SvelteKit semantics, cancel()
    // on a leave navigation is what asks the browser for its native dialog, so no confirm()
    // here or two prompts would stack. The beforeunload listener below is deliberate
    // belt-and-braces, not the dialog's source.
    if (navigation.willUnload) {
      if (dirty && !busy && !leaving) navigation.cancel();
      return;
    }
    if (dirty && !busy && !leaving && !confirm('You have unsaved changes. Leave anyway?'))
      navigation.cancel();
  });

  // The browser half of the leave guard plus the page-wide save shortcut. The handlers read the
  // current dirty and busy values at event time, so the effect itself tracks nothing and runs once.
  $effect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !busy && !leaving) e.preventDefault();
    };
    // Guard-clause style on purpose: svelte 5.56.1 misprints `(a || b) && c` by dropping the
    // parentheses, and consumers compile this source with their own svelte.
    const onWindowKeydown = (e: KeyboardEvent) => {
      // Escape precedence, top to bottom: an open dialog claims Escape natively, so step aside
      // when one is up. Otherwise the details slide-over closes first (Task 8: it is a region, not
      // a dialog, so it has no native light-dismiss), and only when no panel is open does Escape
      // exit zen. So under zen with the panel open, the first Escape closes the panel and the
      // second exits zen, which keeps the two affordances independent.
      if (e.key === 'Escape' && (detailsOpen || zen)) {
        const inDialog = !!(e.target as Element | null)?.closest?.('dialog');
        if (inDialog) return;
        e.preventDefault();
        if (detailsOpen) closeDetails();
        else setZen(false);
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      // The page-wide chords never act on a surface the author cannot see: a save, publish, mode
      // flip, or focus toggle from inside an open modal is suppressed the same way.
      const inDialog = !!(e.target as Element | null)?.closest?.('dialog');
      // Ctrl+/ opens the shortcuts sheet, the third discoverability surface. It reads off e.key so
      // it survives the shifted glyph differences across layouts, and it stays clear of dialogs the
      // same way the other chords do (the sheet is itself a dialog, so opening from inside one would
      // stack modals over a surface the author cannot see).
      if (!e.shiftKey && !e.altKey && e.key === '/') {
        e.preventDefault();
        if (inDialog) return;
        shortcutsDialog?.open();
        return;
      }
      if (e.shiftKey && key === 's') {
        // Publish rides the header's Publish submitter so the ?/publish formaction and the busy
        // flags follow the existing submit path; the chord mirrors the button's own guard
        // (publishActionable), so it no-ops when there is nothing new to publish.
        e.preventDefault();
        if (busy || inDialog || !publishActionable) return;
        editForm?.requestSubmit(publishButton);
        return;
      }
      if (e.altKey && key === 'p') {
        e.preventDefault();
        if (inDialog) return;
        setMode(mode === 'write' ? 'preview' : 'write');
        return;
      }
      if (e.shiftKey && key === 'f') {
        e.preventDefault();
        if (inDialog) return;
        setFocusMode(!focusMode);
        return;
      }
      // Ctrl+Shift+. toggles zen (the bindings' zen key); the period reads off e.key. This sits
      // before the Ctrl+. panel block so the shifted chord is not mistaken for the panel toggle.
      if (e.shiftKey && !e.altKey && e.key === '.') {
        e.preventDefault();
        if (inDialog) return;
        setZen(!zen);
        return;
      }
      // Ctrl+. toggles the details slide-over (the bindings' panel key); the period reads off
      // e.key with no shift or alt.
      if (!e.shiftKey && !e.altKey && e.key === '.') {
        e.preventDefault();
        if (inDialog) return;
        toggleDetails();
        return;
      }
      if (e.shiftKey || e.altKey) return;
      if (key !== 's') return;
      // Always claim the shortcut so the browser's save-page dialog never opens over the admin.
      e.preventDefault();
      // Gate the submit itself: an in-flight POST must not race a second one, a clean page has
      // nothing to save (a no-op save would still cut a pending branch), and a save from inside
      // an open modal would act on a surface the author cannot see.
      if (busy) return;
      if (!dirty && !data.isNew) return;
      if (inDialog) return;
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
  // Preview is read-only, so the insert controls the page renders into the toolbar disable with the
  // strip's own format buttons. Declared here (above the Edit-block derivations that read it) so it
  // is in scope before its first use.
  // Tidy mode disables the toolbar and makes the surface read-only while a review is open. The host
  // sets it when the review opens and clears it on apply or cancel. Declared here so the insert-disable
  // derivation below can read it.
  let tidyMode = $state(false);
  // The tidy request in-flight flag, so the Tidy control reads busy while a call runs.
  let tidyBusy = $state(false);
  // The insert controls disable in Preview (read-only) and while a tidy review is open (the author
  // cannot edit underneath a pending review, the same posture Preview takes).
  const insertDisabled = $derived(mode === 'preview' || tidyMode);
  let previewHtml = $state('');
  // True after a render call threw, so the preview pane can say so instead of going blank.
  let previewFailed = $state(false);
  // The preview frame's device width, a per-browser preference under its own key (the legacy
  // 'cairn-admin:preview' key from the removed split-pane preview stays untouched). Desktop is
  // the default; the storage read sits in an effect so it never runs during SSR, and it tracks
  // nothing reactive, so it runs once.
  const deviceStorageKey = 'cairn-editor-preview-device';
  let device = $state<PreviewDeviceId>('desktop');
  $effect(() => {
    const stored = localStorage.getItem(deviceStorageKey);
    if (previewDevices.some((d) => d.id === stored)) device = stored as PreviewDeviceId;
  });
  function setDevice(id: PreviewDeviceId) {
    device = id;
    localStorage.setItem(deviceStorageKey, id);
  }
  // The writing modes (focus, typewriter) and the surface posture, per-browser preferences on
  // the device pick's pattern: read in an effect so SSR never touches localStorage, written by
  // the card footer's toggles. The effect tracks nothing reactive, so it runs once.
  const focusStorageKey = 'cairn-editor-focus-mode';
  const typewriterStorageKey = 'cairn-editor-typewriter';
  const surfaceStorageKey = 'cairn-editor-surface';
  const zenStorageKey = 'cairn-editor-zen';
  // Spellcheck (the markdown-aware lint underlines) defaults ON, so a fresh editor checks spelling
  // without a choice. The toggle joins the editor-preference family on the same pattern: a localStorage
  // key read once in the effect below, written by the footer setter. Stored as 'false' only when the
  // author turns it off; any other value (including unset) reads as on.
  const spellcheckStorageKey = 'cairn-editor-spellcheck';
  let focusMode = $state(false);
  let typewriter = $state(false);
  let spellcheck = $state(true);
  // Zen: the manuscript alone on the recessed ground. The band, the document title, the toolbar
  // strip, and the footer go; the editing surface stays. It joins the editor-preference family on
  // the same pattern (a localStorage key, read once below, written by the setter), and composes
  // with focus mode and the postures rather than resetting them.
  let zen = $state(false);
  // The surface posture: prose (the writing instrument) by default; markup is the dense
  // working surface.
  let surface = $state<'prose' | 'markup'>('prose');
  $effect(() => {
    focusMode = localStorage.getItem(focusStorageKey) === 'true';
    typewriter = localStorage.getItem(typewriterStorageKey) === 'true';
    zen = localStorage.getItem(zenStorageKey) === 'true';
    if (localStorage.getItem(surfaceStorageKey) === 'markup') surface = 'markup';
    // Spellcheck is on unless the author explicitly stored it off.
    spellcheck = localStorage.getItem(spellcheckStorageKey) !== 'false';
  });
  function setFocusMode(on: boolean) {
    focusMode = on;
    localStorage.setItem(focusStorageKey, String(on));
  }
  function setTypewriter(on: boolean) {
    typewriter = on;
    localStorage.setItem(typewriterStorageKey, String(on));
  }
  function setSpellcheck(on: boolean) {
    spellcheck = on;
    localStorage.setItem(spellcheckStorageKey, String(on));
  }

  // The personal-dictionary pending additions (spec 1.6), owned here and shared with MarkdownEditor's
  // lint source: an add-to-dictionary choice records the lowercased word here (and clears the underline
  // at once), and this host commits the set through the addDictionaryWord action at save time. An add
  // that fails to commit stays here for the session and re-attempts on the next save, so the word is
  // never silently dropped. A plain Set, not $state: the lint source mutates it, and nothing renders
  // from it, so reactivity is unneeded.
  const pendingAdditions = new Set<string>();
  // The CSRF token getter from the admin layout context, for the raw-body dictionary commit.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  /** Commit the pending personal-dictionary additions through the addDictionaryWord action, then drop
   *  the words the server confirms from the pending set. Fire-and-forget at save time: the words are
   *  already live in the Worker's in-memory set, so a slow or failed commit never blocks the save. A
   *  failure (a network throw, an expired session, a parsed csrf/400/409) leaves the words pending for
   *  the next save (never dropped); the words stay live in the Worker for the session, so the author
   *  sees no regression. The transport mirrors the media raw-body actions: a text/plain POST, the CSRF
   *  token in X-Cairn-CSRF, a JSON `{ words }` body, read back through the S3 round-trip helper. */
  async function commitPendingDictionary(): Promise<void> {
    if (pendingAdditions.size === 0) return;
    const words = [...pendingAdditions];
    const outcome = await postFormAction<{ words?: unknown }>(
      `/admin/${data.conceptId}/${data.id}?/addDictionaryWord`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
        body: JSON.stringify({ words }),
      },
    );
    if (!outcome.ok) return;
    const merged = outcome.data.words;
    if (!Array.isArray(merged)) return;
    // Reconcile: drop every now-committed word (matched lowercased, the form the action stored) from
    // the pending set so it is not re-sent. A word the server did not confirm stays pending.
    const committed = new Set(merged.filter((w): w is string => typeof w === 'string').map((w) => w.toLowerCase()));
    for (const w of words) if (committed.has(w.toLowerCase())) pendingAdditions.delete(w);
  }
  function setSurface(posture: 'prose' | 'markup') {
    surface = posture;
    localStorage.setItem(surfaceStorageKey, posture);
  }
  function setZen(on: boolean) {
    // Entering zen hides the band, the document title, the toolbar strip, and the footer. Focus on
    // any of those (a band action like Publish, a strip button, the title input, a footer toggle)
    // would strand on a detached node when its host leaves the DOM, so move focus into the editing
    // surface first. The surface (.cm-editor) and the exit chip are all that survive, so any focus
    // outside the surface is about to hide. Reading activeElement before the DOM updates is what
    // tells a hiding control from the surviving one.
    const surface = editorCard?.querySelector('.cm-editor');
    const focusHides = on && !surface?.contains(document.activeElement);
    zen = on;
    localStorage.setItem(zenStorageKey, String(on));
    if (focusHides) {
      // flushSync applies the zen layout (the strip and footer leave the DOM) before we reach for
      // the surface, so the focus call lands on the now-sole interactive region.
      flushSync();
      (editorCard?.querySelector('.cm-content') as HTMLElement | null)?.focus();
    }
  }
  // The footer controls dress as what they are (the spec's rule). Each helper returns a verbatim
  // Tailwind class string: the admin CSS build's @source scan reads this file as raw text, so the
  // utilities must appear whole, never assembled from fragments.
  //
  // A segment of the bordered posture control (the mockup's .seg). The shared group border carries
  // the pick-one semantics, so a segment stays borderless; the active one tints and bolds. The
  // admin's scoped button reset (cairn-admin.css) already strips the UA border and fill.
  function segButtonClass(pressed: boolean): string {
    return `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-normal ${pressed ? 'bg-primary/10 text-primary font-medium' : 'text-muted'}`;
  }
  // A standalone writing-mode toggle (the mockup's .ftr-toggle): rounded, transparent until hover,
  // check-and-tint when pressed.
  function ftrToggleClass(pressed: boolean): string {
    return `ftr-toggle inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-normal hover:bg-base-content/[0.06] ${pressed ? 'bg-primary/10 text-primary font-medium' : 'text-muted'}`;
  }
  const activeDevice = $derived(previewDevice(device));
  // The iframe document around the rendered html: the site's stylesheets from the adapter's
  // preview knob, or a styleless document (behind the hint below) when the site sets none.
  const previewDoc = $derived(buildPreviewDoc(previewHtml, data.preview));
  let insert = $state.raw<(text: string) => void>(() => {});
  // The editor's range-replace seam, registered by MarkdownEditor on mount; the dialog's Update
  // routes through it to overwrite an edited block's source span. A no-op until then.
  let replaceRange = $state.raw<(from: number, to: number, text: string) => void>(() => {});
  // The editor's select-range seam, registered by MarkdownEditor on mount; the needs-alt notice's
  // jump control routes through it to land the author on an image that lacks alt. A no-op until then.
  let selectRange = $state.raw<(from: number, to: number) => void>(() => {});
  let insertLink = $state.raw<(href: string, title: string) => void>(() => {});
  // The editor's current selection, registered by MarkdownEditor on mount; the web link dialog
  // reads it for the Text field's default.
  let getSelection = $state.raw<() => string>(() => '');
  // The editor's selection range, registered by MarkdownEditor on mount; tidy reads it for the exact
  // selected span's offset so a selection tidy never maps onto an identical passage earlier in the
  // document. Returns null when the selection is empty (a bare caret), which reads as document scope.
  let getSelectionRange = $state.raw<() => { from: number; to: number } | null>(() => null);
  // The editor's selection transform, registered by MarkdownEditor on mount; a no-op until then.
  let format = $state.raw<(kind: FormatKind) => void>(() => {});

  // The tidy apply seam, registered by MarkdownEditor on mount; the review surface drives the in-buffer
  // decorations and the batched apply through it. Null until the editor mounts.
  let tidyApi = $state.raw<import('./editor-tidy.js').TidyApi | null>(null);
  // The editor's undo, registered on mount; the Undo-tidy chip calls it. A no-op until then.
  let undoEditor = $state.raw<() => void>(() => {});
  // The open review's data: the validated change set, the captured original it was diffed against, the
  // scope, and the model. Null when no review is open. The diff positions index `tidyOriginal`, which
  // for a selection tidy is the FULL document (the changes are offset back before they reach here).
  let tidyReview = $state.raw<{ changes: Change[]; original: string; model: string } | null>(null);
  // The error message a refused or failed tidy surfaces. The working state is cancelable through the
  // AbortController; a validation rejection or an action failure lands here.
  let tidyMessage = $state<string | null>(null);
  // The no-op confirmation: a clean result (tidy found nothing to fix) shows "Nothing to fix" and never
  // opens an empty review. Cleared on the next tidy run.
  let tidyNoop = $state(false);
  // The session-level "Undo tidy" affordance: surfaced right after Apply, dismissed on the next edit.
  let tidyApplied = $state(false);
  // The in-flight controller, for Cancel and the bounded client timeout.
  let tidyController: AbortController | null = null;

  // The three tidy status dialogs (working, no-op, message). Each is promoted to the top layer with
  // showModal() the way TidyReview does, so the focus trap, Escape, and inert background come from the
  // platform. The $effect below opens each when its flag flips and closes it when the flag clears; the
  // {#if} mounts the element, so the ref is set before the effect reads it.
  let tidyWorkingDialog = $state<HTMLDialogElement | null>(null);
  let tidyNoopDialog = $state<HTMLDialogElement | null>(null);
  let tidyMessageDialog = $state<HTMLDialogElement | null>(null);
  $effect(() => {
    if (tidyBusy) tidyWorkingDialog?.showModal();
  });
  $effect(() => {
    if (tidyNoop) tidyNoopDialog?.showModal();
  });
  $effect(() => {
    if (tidyMessage) tidyMessageDialog?.showModal();
  });

  // True when tidy is enabled for the site (the developer-tier master switch). Gates the Tidy control.
  // The optional chain mirrors the component's tolerance of a partial data load: a degraded load that
  // omits the tidy block simply reads disabled rather than throwing.
  const tidyEnabled = $derived(data.tidy?.enabled ?? false);

  /** Run tidy (spec 2.1, Task 11) over the whole document or the current selection. The action receives
   *  only the selected text plus a scope flag; the diff is computed against that text and the changes'
   *  ranges are offset back into the full document before they reach the apply seam. On success the
   *  result is validated as a proofread (Task 13); a rejection shows the honest message and writes
   *  nothing; a clean result shows "Nothing to fix"; otherwise the review opens. */
  async function runTidy() {
    if (!tidyEnabled || tidyBusy || tidyMode) return;
    tidyMessage = null;
    tidyNoop = false;
    tidyApplied = false;
    // Scope: a non-empty selection tidies that range; otherwise the whole body. The offset is where the
    // selected text begins in the full document, so the diff positions map back. The range seam carries
    // the exact selection offsets, so a passage that repeats earlier in the body still maps the
    // corrections onto the actually-selected occurrence. Fall back to the first textual match only when
    // no range is available (offset 0 keeps document-scope tidy unchanged).
    const selected = getSelection();
    const range = getSelectionRange();
    const useSelection = selected.length > 0;
    let offset = 0;
    if (range) {
      offset = range.from;
    } else if (useSelection) {
      offset = Math.max(body.indexOf(selected), 0);
    }
    const text = useSelection ? selected : body;

    tidyBusy = true;
    tidyController = new AbortController();
    // The bounded client timeout: a slow call becomes a cancel/retry rather than hanging the review.
    const timer = setTimeout(() => tidyController?.abort(), TIDY_CLIENT_TIMEOUT_MS);
    try {
      const outcome = await postFormAction<{ corrected?: unknown; model?: unknown }>(
        `/admin/${data.conceptId}/${data.id}?/tidy`,
        {
          method: 'POST',
          redirect: 'manual',
          headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
          body: JSON.stringify({ text, scope: useSelection ? 'selection' : 'document' }),
          signal: tidyController.signal,
        },
      );
      if (!outcome.ok) {
        // An abort (Cancel or the client timeout) resolves through the round-trip helper's own
        // fail-closed catch with no way to tell it apart from a genuine network failure; read the
        // signal directly so Cancel stays silent instead of showing the generic retry message
        // below. A response that was actually received (outcome.ok) is processed on its own merits
        // below regardless of the flag, so a late-arriving success is never discarded.
        if (tidyController.signal.aborted) {
          tidyMessage = null;
          return;
        }
        if (outcome.sessionExpired) {
          tidyMessage = 'Your session expired. Sign in again to tidy.';
          return;
        }
        const failure = outcome.data as { error?: unknown } | undefined;
        tidyMessage =
          typeof failure?.error === 'string' && failure.error !== 'csrf'
            ? failure.error
            : 'Tidy could not finish. Try again.';
        return;
      }
      const corrected = typeof outcome.data.corrected === 'string' ? outcome.data.corrected : '';
      const model = typeof outcome.data.model === 'string' ? outcome.data.model : data.tidy.model;
      if (corrected.length === 0 || corrected === text) {
        // A clean result: tidy found nothing to fix. Never open an empty review.
        tidyNoop = true;
        return;
      }
      // Validate the result as a proofread (Task 13). A rejection writes nothing and shows the message.
      const validation = validateTidy(text, corrected);
      if (!validation.ok) {
        tidyMessage = TIDY_REJECTION_MESSAGE;
        return;
      }
      if (validation.changes.length === 0) {
        tidyNoop = true;
        return;
      }
      // Offset the changes back into the full document (a selection tidy diffs the selected text). The
      // captured original handed to the review is the full body, so every line label and context row is
      // computed against the real document.
      const changes: Change[] = validation.changes.map((c) => ({
        ...c,
        from: c.from + offset,
        to: c.to + offset,
      }));
      tidyReview = { changes, original: body, model };
      tidyMode = true;
      tidyApi?.enter(changes);
    } catch {
      // A throw anywhere in the round trip or the success processing above (a parse failure
      // unrelated to the network) must not escape as an unhandled rejection out of the untracked
      // onclick call; fold it into the same retryable message a fetch failure shows.
      tidyMessage = 'Tidy could not finish. Try again.';
    } finally {
      clearTimeout(timer);
      tidyController = null;
      tidyBusy = false;
    }
  }

  /** Cancel an in-flight tidy: abort the request and clear the working state. The buffer is untouched. */
  function cancelTidy() {
    tidyController?.abort();
    tidyBusy = false;
    tidyMessage = null;
  }

  /** Close the review: clear tidy mode and the review data. On apply the "Undo tidy" affordance shows
   *  until the next edit; on cancel nothing changed. */
  function closeTidyReview(applied: boolean) {
    tidyMode = false;
    tidyReview = null;
    tidyApplied = applied;
    // Record the body the apply produced, so the next edit (a different body) dismisses the Undo chip.
    tidyAppliedBody = applied ? body : null;
  }
  // The body snapshot right after Apply; the Undo-tidy chip dismisses once the body diverges from it.
  let tidyAppliedBody = $state<string | null>(null);
  $effect(() => {
    const current = body;
    if (tidyApplied && tidyAppliedBody !== null && current !== tidyAppliedBody) {
      tidyApplied = false;
      tidyAppliedBody = null;
    }
  });
  // Undo the whole applied tidy in one move (ordinary editor Undo of the one batched transaction). The
  // chip names it so the author knows the whole tidy is one move back.
  function undoTidy() {
    undoEditor();
    tidyApplied = false;
    tidyAppliedBody = null;
  }

  // The media insert seams, registered by MarkdownEditor on mount, mirroring the range holders
  // above. The popover drives the optimistic upload loop through them: the caret anchor, the focus
  // restore, the placeholder api, and the direct-insert path for a picked image. The placeholder
  // api type is referenced inline (import('...').Type), never a static `import type ... from`, so
  // no static edge to the dynamically-imported editor-placeholder module sits in this component
  // (the editor-boundary test bars that edge by a textual `from` scan).
  let caretCoords = $state.raw<() => { left: number; right: number; top: number; bottom: number } | null>(
    () => null,
  );
  let focusEditor = $state.raw<() => void>(() => {});
  let placeholders = $state.raw<import('./editor-placeholder.js').ImagePlaceholderApi | null>(null);
  let insertImageFn = $state.raw<(alt: string, ref: string) => void>(() => {});

  // A no-op placeholder api so the editor object handed to the popover is never null before the
  // editor registers its real one on mount.
  const noopPlaceholders: import('./editor-placeholder.js').ImagePlaceholderApi = {
    begin: () => 0,
    progress: () => {},
    resolveTo: () => {},
    cancel: () => {},
  };

  // The editor object the popover drives, delegating through the holders so the latest registered
  // function is always used (the holders start as no-ops and are replaced on mount).
  const editorApi = $derived({
    caretCoords: () => caretCoords(),
    focusEditor: () => focusEditor(),
    placeholders: placeholders ?? noopPlaceholders,
    insertImage: (alt: string, ref: string) => insertImageFn(alt, ref),
  });

  // The headless media insert popover, opened from the toolbar control, paste, or drop.
  let mediaPopover = $state<MediaInsertPopover | null>(null);

  // The rendered hero fields' refs (for the needs-alt notice's "Add alt text" action, which focuses
  // the field's own alt input) and their reported needs-alt signals, keyed by field name. A hero is
  // a frontmatter value with no body offset, so its needs-alt signal comes from the field, not the
  // body scanner (findMediaImagesNeedingAlt), and its remediation focuses the alt input, never a
  // source range (selectRange). The records are keyed by field name; `data.fields` is static for the
  // page's lifetime, so a key never goes stale (no per-key cleanup on unmount is needed).
  let heroFieldRefs = $state<Record<string, MediaHeroField>>({});
  let heroNeedsAlt = $state<Record<string, boolean>>({});

  // The server-owned records from each successful upload this session. They ride the save form as
  // the hidden `media` field, so the save action merges them into media.json.
  let uploadedRecords = $state<MediaEntry[]>([]);
  // A headless dialog instance, typed structurally over its exported open() (the linkPicker idiom).
  type DialogHandle = { open: () => void };
  // The toolbar's insert dialogs. Each holds its own <form>, so they mount outside the edit form
  // (a form nested in a form is invalid HTML the parser repairs by dropping the outer tag, which
  // breaks SSR and hydration); the toolbar snippet renders plain triggers that open them here.
  let webLinkDialog = $state<DialogHandle | null>(null);
  let linkPicker = $state<DialogHandle | null>(null);
  // The insert dialog binds the full instance, not the bare DialogHandle: the Edit-block control
  // drives editComponent(def, values, range) on it, beyond the shared open().
  let insertDialog = $state<ComponentInsertDialog | null>(null);
  // The lifecycle dialogs, opened from the header's overflow menu.
  let deleteDialog = $state<DialogHandle | null>(null);
  let renameDialog = $state<DialogHandle | null>(null);
  // The Markdown cheat sheet, opened from the editor card's footer.
  let helpDialog = $state<DialogHandle | null>(null);
  // The keyboard shortcuts sheet, opened from anywhere on the desk by Ctrl+/.
  let shortcutsDialog = $state<DialogHandle | null>(null);

  // Whether the registry offers anything insertable, the same condition the insert dialog lists
  // by, so the toolbar trigger and the dialog appear and disappear together.
  const hasComponents = $derived(insertableDefs(registry).length > 0);

  // The directive container at the editor caret, reported by MarkdownEditor whenever it changes
  // (null outside any container). The Edit-block control resolves it against the registry and the
  // round-trip safety gate below; its identity is the key the async gate guards against a stale
  // result. The reporter's name+markdown+from+to shape; declared locally because MarkdownEditor's
  // matching interface is not exported.
  type CaretComponent = { name: string | null; markdown: string; from: number; to: number };
  let caretComponent = $state<CaretComponent | null>(null);

  // The media image at the editor caret, reported by MarkdownEditor whenever it changes (null off any
  // media image). The Figure control reads it to wrap a bare image or edit an existing figure; it
  // writes source through the replaceRange seam. The figure dialog is mounted headless below.
  let mediaAtCaret = $state<FigureAtImage | null>(null);
  // The figure control's host <dialog>, opened by the toolbar control. Mounted outside the edit form
  // (a form nested in a form is invalid HTML), the Edit-block dialog pattern.
  let figureDialog = $state<HTMLDialogElement | null>(null);
  // Whether the Figure control is available: a media image sits at the caret and Preview is not
  // showing (the insert controls disable together with the Write surface). The control is always
  // rendered (it never mounts on caret move); only its enabled state changes.
  const figureAvailable = $derived(mediaAtCaret != null && !insertDisabled);
  const figureLabel = $derived(
    figureAvailable
      ? mediaAtCaret?.figure
        ? 'Edit the figure at the cursor'
        : 'Wrap the image at the cursor in a figure'
      : 'Place the cursor on an image to add a figure',
  );
  // Whether the image at the caret is decorative (empty or whitespace-only alt). The token came from
  // a parsed image node, so the alt is the source between `![` and the closing `]` before `](`. An
  // empty alt is the needs-alt signal; the figure control surfaces it and the decorative-plus-caption
  // warning. Derived from the reported token so it tracks the caret.
  const figureDecorative = $derived.by(() => {
    if (!mediaAtCaret) return false;
    const token = body.slice(mediaAtCaret.imageFrom, mediaAtCaret.imageTo);
    const match = /^!\[([\s\S]*?)\]\(/.exec(token);
    return (match?.[1] ?? '').trim() === '';
  });
  // A def is actionable for guided edit when it has a schema (the same notion the insert catalog
  // lists by): a template-only def has no form to re-open into. Reuses the dialog's exported
  // hasSchema so the two surfaces can never drift on what counts as editable.
  function editableDef(name: string | null): ComponentDef | undefined {
    if (!name) return undefined;
    const def = registry?.get(name);
    if (!def) return undefined;
    return hasSchema(def) ? def : undefined;
  }
  // The resolved editability: the def, the source range, and the validated markdown when the caret
  // sits on a known, schema-bearing component whose round-trip safety check passed for the CURRENT
  // caret; null otherwise. The def, range, and markdown are captured from one caretComponent
  // snapshot, so editBlock() never mixes a newer markdown with an older range. The Edit-block
  // control enables only when this is set.
  let editable = $state<{ def: ComponentDef; range: { from: number; to: number }; markdown: string } | null>(null);
  // Why edit is unavailable, distinguishing "not on a component" from "on an unsafe one" so the
  // disabled tooltip is honest. 'none' covers both no-caret-component and an unknown/template-only
  // one (no guided form either way); 'unsafe' is a known component the safety gate refused.
  let editReason = $state<'none' | 'unsafe'>('none');
  // Resolve editability when the caret-component changes, async-safe. componentRoundTripSafety is
  // async, so a slow check could resolve after a newer caret move; guard latest-wins on the
  // shared SeqArbiter shape, only applying a result when no newer caret move has started a fresh
  // check. The arbiter alone is not enough: it is bumped only when the effect itself reruns
  // (the teardown below, or the next run's own call), which Svelte schedules asynchronously, so a
  // slow check for the block the caret just left can still resolve before that rerun happens. The
  // live `caretComponent` read is the belt to the arbiter's suspenders: it reflects the caret's
  // real position the instant it changes, independent of when the effect gets around to noticing.
  // A block whose check did not pass for the current caret never enables edit.
  const editableArbiter = arbitrateChecked();
  $effect(() => {
    const current = caretComponent;
    const def = editableDef(current?.name ?? null);
    if (!current || !def) {
      editable = null;
      editReason = 'none';
      return;
    }
    const run = editableArbiter.next();
    void componentRoundTripSafety(current.markdown, def)
      .then((result) => {
        if (!editableArbiter.accept(run) || caretComponent !== current) return;
        if (result.safe) {
          editable = { def, range: { from: current.from, to: current.to }, markdown: current.markdown };
          editReason = 'none';
        } else {
          editable = null;
          editReason = 'unsafe';
        }
      })
      .catch(() => {
        // A parse throw during the safety check must never leave a stale block enabled. Guarded by
        // the same arbiter and live caret identity, fall back to the safe default of no editable
        // block.
        if (!editableArbiter.accept(run) || caretComponent !== current) return;
        editable = null;
        editReason = 'none';
      });
    return () => {
      editableArbiter.next();
    };
  });
  // The Edit-block control's accessible label and tooltip: a plain reason in each state. Enabled
  // names the action; the two disabled reasons are honest about why.
  const editBlockLabel = $derived(
    editable
      ? 'Edit the component at the cursor'
      : editReason === 'unsafe'
        ? "This block can't be edited in the form. Edit it as markdown."
        : 'Place the cursor in a component to edit it',
  );
  // Whether the Edit-block control is unavailable: either Preview hides the Write surface, or the
  // caret is not on a safe, schema-bearing component. The control stays focusable and announced in
  // this state (aria-disabled, not the native disabled attribute), so its reason reaches assistive
  // technology; the dead click is made inert in editBlock().
  const editBlockUnavailable = $derived(insertDisabled || !editable);
  // Activate edit: parse the block into form values, then open the dialog in edit mode over the
  // stored source range. Guarded by editable AND the preview-mode disable, so the control is inert
  // unless the gate passed and the editor is on the Write tab. The def, range, and markdown all come
  // from the one editable snapshot, so a newer caret markdown is never paired with an older range.
  async function editBlock() {
    if (insertDisabled || !editable) return;
    const values = await parseComponent(editable.markdown, editable.def);
    insertDialog?.editComponent(editable.def, values, editable.range);
  }

  // The figure dialog's pre-fill, snapshotted when the control opens so the form never mixes a newer
  // caret with the values it opened on. Captured from mediaAtCaret at open time: edit mode with the
  // figure's caption/role when a figure wraps the image, else wrap mode with empty caption and the
  // measure default. decorative rides the snapshot too. Null while the dialog is closed.
  let figurePrefill = $state<{
    mode: 'wrap' | 'edit';
    caption: string;
    role: FigureRole | null;
    decorative: boolean;
    image: { from: number; to: number };
    figureRange: { from: number; to: number } | null;
  } | null>(null);

  // Open the figure control over the media image at the caret. Inert unless a media image sits there
  // and the Write surface is up, the same gate the toolbar control shows. The snapshot is the source
  // of truth for the apply handlers, so a caret move while the dialog is open never re-targets it.
  function openFigure() {
    if (!figureAvailable || !mediaAtCaret) return;
    const at = mediaAtCaret;
    figurePrefill = {
      mode: at.figure ? 'edit' : 'wrap',
      caption: at.figure?.caption ?? '',
      role: at.figure?.role ?? null,
      decorative: figureDecorative,
      image: { from: at.imageFrom, to: at.imageTo },
      figureRange: at.figure ? { from: at.figure.from, to: at.figure.to } : null,
    };
    figureDialog?.showModal();
  }

  // Apply the control's choice through the replaceRange seam, then close. Wrap a bare image or update
  // an existing figure, off the snapshot the dialog opened on. The pure transform owns the source
  // shape and keeps the media token byte-intact; the preview stays read-only.
  function applyFigure(choice: { caption: string; role: FigureRole | null }) {
    const pre = figurePrefill;
    if (!pre) return;
    const result =
      pre.mode === 'edit' && pre.figureRange
        ? updateFigure(body, pre.figureRange, choice.caption, choice.role)
        : wrapImageInFigure(body, pre.image.from, pre.image.to, choice.caption, choice.role);
    writeFigureResult(result);
  }

  // Unwrap the figure back to its bare image, then close. Edit mode only (the snapshot carries the
  // figure range). The bare image token is restored verbatim by the pure transform.
  function unwrapFigureAction() {
    const pre = figurePrefill;
    if (!pre || !pre.figureRange) return;
    writeFigureResult(unwrapFigure(body, pre.figureRange));
  }

  // Write a figure transform's result back to the editor: overwrite the whole doc through the
  // replaceRange seam, then place the selection the transform chose (the seam alone drops the caret
  // at the end). replaceRange dispatches the doc change and focuses the surface; selectRange then
  // dispatches a selection-only transaction, which CodeMirror's history does not record as its own
  // undoable event, so one undo reverts the whole figure write. Close the dialog last.
  function writeFigureResult(result: { doc: string; from: number; to: number }) {
    replaceRange(0, body.length, result.doc);
    selectRange(result.from, result.to);
    figureDialog?.close();
  }

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

  // The band overflow menu's popover element and its open state, mirrored from the toggle
  // event into aria-expanded on the trigger.
  let actionsMenu = $state<HTMLUListElement | null>(null);
  let actionsOpen = $state(false);

  // The details slide-over. The aside below carries the frontmatter groups; it stays physically
  // inside the edit form (so the uncontrolled fields submit) but presents as a fixed panel under
  // the band, hidden when closed so it leaves the a11y tree and the tab order while its
  // display:none fields still post. Focus moves into the panel on open and returns to the trigger
  // on close, the region-with-focus-management pattern (the a11y reviewer adjudicates region vs
  // dialog at the pass gate).
  let detailsOpen = $state(false);
  let detailsTrigger = $state<HTMLButtonElement | null>(null);
  let detailsClose = $state<HTMLButtonElement | null>(null);
  function openDetails() {
    // flushSync removes the panel's `hidden` attribute synchronously; a hidden element cannot
    // take focus, so the close button must be visible before we move focus to it.
    flushSync(() => (detailsOpen = true));
    detailsClose?.focus();
  }
  function closeDetails() {
    detailsOpen = false;
    detailsTrigger?.focus();
  }
  function toggleDetails() {
    if (detailsOpen) closeDetails();
    else openDetails();
  }

  // An overflow-menu pick runs its action, then dismisses the popover menu. Opening a modal
  // dialog already closes an auto popover, so the explicit hide fires only when the menu is
  // still up.
  function pickAction(action: () => void) {
    action();
    if (actionsMenu?.matches(':popover-open')) actionsMenu.hidePopover();
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

  // The media images in the live body that carry no alt text, recomputed as the author types. Alt is
  // accessibility debt, never a render or publish failure, so this drives a non-blocking warning the
  // author can act on or leave; the count drops and the notice clears as each alt is filled.
  const needsAlt = $derived(findMediaImagesNeedingAlt(body));

  // The declared image (hero) fields, for labelling the needs-alt notice's frontmatter rows. Only
  // top-level image fields are enumerated. A nested image (an array(image) gallery item or an object
  // image sub-field) is intentionally out of scope for the needs-alt notice this phase, the recorded
  // carry-forward, so the flat top-level scan is deliberate, not an oversight.
  const imageFields = $derived(
    data.fields.filter((f) => f.type === 'image').map((f) => ({ name: f.name, label: f.label })),
  );
  // The frontmatter-hero needs-alt rows: each image field whose hero reports a needs-alt signal. The
  // row's action focuses the field's alt input (the body scanner and its source-range jump cannot
  // reach a frontmatter value). The headline count sums these with the body scanner's hits.
  const heroRows = $derived(imageFields.filter((f) => heroNeedsAlt[f.name]));
  const needsAltCount = $derived(needsAlt.length + heroRows.length);

  // The advisory region renders two notice sources through one shape: the server's data-only
  // advisories (an action carries an href) and the client-derived needs-alt notice (its rows carry
  // callbacks the editor must run, so they cannot ride the serializable server shape). Both map into
  // this local render type, where the snippet draws an href row as a link and an onAct row as a button.
  const renderNotices = $derived<RenderNotice[]>([
    ...data.advisories.map((notice) => ({
      kind: notice.kind,
      message: notice.message,
      rows: (notice.actions ?? []).map((action) => ({ label: action.label, href: action.href })),
    })),
    ...(needsAltCount
      ? [
          {
            kind: 'needs-alt',
            message: `${needsAltCount} ${needsAltCount === 1 ? 'image needs' : 'images need'} alt text`,
            detail:
              'Alt text describes an image for readers who cannot see it. Add it now, or save and come back to it.',
            rows: [
              ...needsAlt.map((item) => ({
                rowLabel: item.ref,
                rowCode: true,
                label: 'Add alt text',
                onAct: () => selectRange(item.from, item.to),
              })),
              ...heroRows.map((hero) => ({
                rowLabel: hero.label,
                label: 'Add alt text',
                onAct: () => heroFieldRefs[hero.name]?.focusAlt(),
              })),
            ],
          },
        ]
      : []),
  ]);

  // The delete guard's inbound linkers, from a refused delete (fail 409). Empty when the delete was
  // not refused. When set, a delete was blocked by a link that appeared since the page loaded.
  const deleteRefusedLinks = $derived(form?.inboundLinks ?? []);

  // The shared failure summary, rendered only when no richer banner claims the failure: the save
  // and delete guards get their own banners from brokenLinks and inboundLinks below, so this
  // surfaces the rest (a rename refusal, today).
  const formError = $derived(
    form?.error && !form.brokenLinks?.length && !form.inboundLinks?.length ? form.error : '',
  );

  // The entry this surface is editing. SvelteKit reuses the page component across a same-route
  // navigation (the delete-refused and broken-link banners link entry to entry), so the per-entry
  // state seeded at init would survive the hop and show entry A's body over entry B's data with
  // the dirty indicator armed. When the identity changes, re-seed the state here; the {#key}
  // block around the template remounts the DOM to match (CodeMirror with its undo history, the
  // uncontrolled sidebar fields, any open dialog). The leave guard still protects the hop:
  // beforeNavigate runs before the navigation completes, so it reads the old dirty value.
  const entryKey = $derived(data.conceptId + '/' + data.id);
  let seededKey = untrack(() => entryKey);
  $effect.pre(() => {
    const key = entryKey;
    if (key === seededKey) return;
    seededKey = key;
    untrack(() => {
      body = form?.body ?? data.body;
      saving = false;
      publishing = false;
      leaving = false;
      fieldsDirty = false;
      mode = 'write';
      detailsOpen = false;
      previewHtml = '';
      previewFailed = false;
      removedLinks = [];
    });
  });

  // After a save that links to a draft target, the redirect carries ?drafts=<tokens>. page.url
  // is reactive kit state, so a client-side navigation that swaps the search string re-derives
  // this, and the read is SSR-safe.
  const draftWarning = $derived.by(() => {
    const drafts = page.url.searchParams.get('drafts');
    return drafts ? drafts.split(',').filter(Boolean).join(', ') : '';
  });

  // A save whose frontmatter references an absent or draft target carries ?refs=<concept/id list>,
  // the advisory reference warning the save threads through (mirroring ?drafts=). It never blocks the
  // save; the build's verifyReferences is the integrity authority, so this is informational only.
  const referenceWarning = $derived.by(() => {
    const refs = page.url.searchParams.get('refs');
    return refs ? refs.split(',').filter(Boolean).join(', ') : '';
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
  const politeMessage = $derived.by(() => {
    if (draftWarning) return `Saved. This page links to unpublished pages: ${draftWarning}.`;
    if (referenceWarning) return `Saved. This page references unpublished entries: ${referenceWarning}.`;
    return flash;
  });
  const assertiveMessage = $derived.by(() => {
    if (data.error) return data.error;
    if (formError) return formError;
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

  // One line of body text reduced to its prose: inline directives drop wholesale, then the
  // markdown marker characters become spaces. Spacing rather than deleting keeps "[text](url)"
  // as two words instead of mashing the link text into its destination, so a link counts its
  // text plus its URL and the count never undercounts prose.
  function proseOnly(line: string): string {
    let out = '';
    let cursor = 0;
    for (const { from, to } of findInlineDirectives(line)) {
      out += line.slice(cursor, from);
      cursor = to;
    }
    out += line.slice(cursor);
    return out.replace(/[*_~`[\]()#]/g, ' ');
  }

  // The editor footer's word count, over the local body so it tracks every keystroke. Directive
  // machinery lines and table rows are dropped first and the inline syntax stripped, so the
  // count reads as the author's prose.
  const countedBody = $derived(
    body
      .split('\n')
      .filter((line) => directiveLineKind(line) === null && !/^\s*\|/.test(line))
      .map(proseOnly)
      .join('\n'),
  );
  const wordCount = $derived(countedBody.trim() ? countedBody.trim().split(/\s+/).length : 0);
  const wordLabel = $derived(wordCount === 1 ? '1 word' : `${wordCount} words`);

  // The visible issue count (Task 3): the same settled spelling-plus-style diagnostics the
  // announcer speaks, read off its identical debounced report rather than a second, independently
  // timed pass over the document. Starts at zero before the editor's first report lands.
  let diagnosticsCounts = $state<DiagnosticCounts>({ spelling: 0, style: 0 });
  const issueCount = $derived(diagnosticsCounts.spelling + diagnosticsCounts.style);
  const issueLabel = $derived(issueCount === 1 ? '1 issue' : `${issueCount} issues`);

  // The manifest-backed resolver turns a cairn: link into its live permalink in the preview, and
  // returns undefined for a missing target so the render step marks it cairn-broken-link.
  const resolveLink = $derived(manifestLinkResolver(data.linkTargets));

  // The media analog: it turns a media: reference into its /media delivery path in the preview, and
  // returns undefined for a missing target so the render step marks it cairn-broken-media. The
  // committed mediaTargets projection is merged with this session's uploaded records (the same
  // override the picker's library does), so a just-uploaded image renders its thumbnail in the live
  // preview before the next save commits it, rather than reading as a broken reference.
  const resolveMediaTargets = $derived({
    ...data.mediaTargets,
    ...Object.fromEntries(
      uploadedRecords.map((r) => [r.hash, { slug: r.slug, ext: r.ext, contentType: r.contentType }]),
    ),
  });
  const resolveMedia = $derived(manifestMediaResolver(resolveMediaTargets));

  // The picker's library, the committed projection merged with this session's uploaded records,
  // keyed by content hash. An uploaded record overrides a committed entry on a hash match (the same
  // hash is the same bytes, so the override is harmless). This is what the editor decorates with, so
  // a just-uploaded image carries its source chip before the next save commits it.
  const mediaLibrary = $derived({
    ...data.mediaLibrary,
    ...Object.fromEntries(uploadedRecords.map((r) => [r.hash, mediaLibraryEntry(r)])),
  });

  // The [[ autocomplete source over the same link targets, handed to the editor's generic seam.
  const completionSources = $derived([cairnLinkCompletionSource(data.linkTargets)]);

  function setMode(m: 'write' | 'preview') {
    mode = m;
  }

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
    // The shifted-digit list trio (Ctrl+Shift+9/8/7) arrives as '('/'*'/'&' for e.key on US
    // layouts, so the digit identity comes from e.code; the heading pair rides Ctrl+Alt+2/3.
    const fmt = formatForKeydown(e);
    if (fmt) {
      e.preventDefault();
      format(fmt);
    } else if (key === 'b') {
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
  // Maps the format-key chords to their FormatKind. Inline code is the plain Ctrl+E; quote and the
  // two lists are Ctrl+Shift with the digit read from e.code (the shifted key glyph is layout
  // dependent); the headings are the Ctrl+Alt+2/3 Google Docs idiom.
  function formatForKeydown(e: KeyboardEvent): FormatKind | null {
    if (e.altKey) {
      if (e.key === '2') return 'h2';
      if (e.key === '3') return 'h3';
      return null;
    }
    if (e.shiftKey) {
      if (e.code === 'Digit9') return 'quote';
      if (e.code === 'Digit8') return 'ul';
      if (e.code === 'Digit7') return 'ol';
      return null;
    }
    if (e.key.toLowerCase() === 'e') return 'code';
    return null;
  }

  // Render the design-accurate preview as the body changes, debounced. The site's render is the
  // floored engine pipeline, so its output is already sanitized; the preview mirrors the page.
  // The preview call threads the same entry context the public route passes (concept and
  // frontmatter), so a custom entry-aware renderer's preview matches its page. The body is the live
  // editor content; frontmatter is the loaded snapshot, which is faithful for the saved state.
  // previewArbiter is the shared SeqArbiter latest-wins guard: if a slow earlier async render call
  // resolves after a newer one has started, the stale result is discarded.
  const previewArbiter = arbitrateChecked();
  $effect(() => {
    if (mode !== 'preview' || !render) return;
    const md = body;
    const resolve = resolveLink; // tracked read in the effect body
    const resolveMediaRef = resolveMedia; // tracked read in the effect body
    const run = previewArbiter.next();
    const handle = setTimeout(async () => {
      try {
        const html = await render({ body: md, concept: data.conceptId, frontmatter: data.frontmatter, resolve, resolveMedia: resolveMediaRef });
        if (previewArbiter.accept(run)) {
          previewHtml = html;
          previewFailed = false;
        }
      } catch {
        if (previewArbiter.accept(run)) {
          previewHtml = '';
          previewFailed = true;
        }
      }
    }, 150);
    return () => {
      clearTimeout(handle);
      // Every re-run and the final teardown invalidate the in-flight render: bumping the arbiter
      // with no waiting caller makes any earlier accept() call report stale. The entry-key reset
      // above cannot reach this arbiter, so without the bump a slow render for entry A could
      // resolve after a same-route hop and write A's html into entry B's pane.
      previewArbiter.next();
    };
  });

  function str(v: unknown): string {
    return v == null ? '' : String(v);
  }

  // The eyebrow legend each sidebar group opens with, one class string for all three.
  const eyebrowClass =
    'mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted';

  // The sidebar's grouping. The title field hoists above the editor card as the document title,
  // and a boolean named draft becomes the Visibility group's Hidden toggle (both production
  // adapters use that name); everything else is a Details field.
  const titleField = $derived(data.fields.find((f) => f.name === 'title'));
  const draftField = $derived(data.fields.find((f) => f.type === 'boolean' && f.name === 'draft'));
  const detailFields = $derived(data.fields.filter((f) => f !== titleField && f !== draftField));
</script>

<!-- The desk controls live in the one header band: CairnAdminShell renders this snippet through the
     topbar context portal, to the right of the breadcrumb (the way back). Two clusters: the
     document status behind a hairline (status badge, save-state) and the actions split by a
     second hairline into the quiet pair (Details, overflow) and the lifecycle pair
     (Publish, Save). The breadcrumb itself stays in CairnAdminShell, so the duplicate is gone. -->
{#snippet desk()}
  <div class="ml-2 flex min-w-0 flex-1 items-center gap-3">
    <!-- The document status, fenced off by a hairline on its left. -->
    <div class="flex min-w-0 items-center gap-2.5 border-l border-[var(--cairn-card-border)] pl-3">
      <span class="badge badge-sm font-medium {statusBadge}">{status}</span>
      {#if data.frontmatter.draft === true}
        <span class="badge badge-neutral badge-sm font-medium">Hidden</span>
      {/if}
      <!-- The save-state indicator eases in and out; the admin sheet's prefers-reduced-motion rule
           squashes the transition for editors who asked for that. The dot is the quiet unsaved cue. -->
      <span
        class="cairn-save-state flex items-center gap-1.5 text-xs text-muted transition-opacity duration-300"
        class:opacity-0={!saveState}
        aria-live="off"
      >
        {#if dirty}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true"></span>{/if}
        {saveState}
      </span>
      {#if tidyApplied}
        <!-- The session-level Undo tidy (graft 6): surfaced right after Apply, dismissed on the next
             edit. Ordinary editor Undo covers it mechanically (the apply is one history entry); this
             chip names it so the author knows the whole tidy is one move back. -->
        <span class="flex items-center gap-2 border-l border-[var(--cairn-card-border)] pl-3 text-xs text-muted" data-testid="tidy-undo-chip">
          <span class="inline-flex items-center gap-1 font-semibold text-[var(--color-positive-ink)]">Tidy applied</span>
          <button type="button" class="underline decoration-[color-mix(in_oklab,currentColor_40%,transparent)] underline-offset-2 hover:text-primary" onclick={undoTidy}>Undo tidy</button>
        </span>
      {/if}
    </div>

    <div class="ml-auto flex items-center gap-2 border-l border-[var(--cairn-card-border)] pl-3">
      <!-- The form's default button, FIRST in the actions cluster (and so first among the form's
           submit buttons in tree order, since the band precedes the form). The default button for
           implicit submission (Enter in a single-line field) is the first form-owned submit button
           in tree order; without this the Publish button would claim it and Enter in the title
           would publish a half-finished edit. This sr-only button carries no formaction (so an
           implicit submit posts ?/save) and mirrors Save's disabled state, so Enter on a clean
           page submits nothing. -->
      <button
        type="submit"
        form="cairn-edit-form"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        disabled={busy || (!dirty && !data.isNew)}
      >
        Save
      </button>

      <!-- The quiet pair: the Details panel trigger and the overflow menu. The trigger toggles
           the slide-over; aria-expanded mirrors its state and focus returns here on close. -->
      <button
        bind:this={detailsTrigger}
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        aria-label="Details"
        title="Details"
        aria-expanded={detailsOpen}
        onclick={toggleDetails}
      >
        <PanelRightIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <!-- The overflow menu is the same DaisyUI v5 popover dropdown recipe EditorToolbar's More
           menu uses (click to open, Escape/light-dismiss via the Popover API, anchor-name/
           position-anchor placement). -->
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        aria-label="More actions"
        title="More actions"
        aria-expanded={actionsOpen}
        popovertarget="cairn-edit-actions-menu"
        style="anchor-name:--cairn-edit-actions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12h.01" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12h.01" />
        </svg>
      </button>
      <ul
        bind:this={actionsMenu}
        popover="auto"
        id="cairn-edit-actions-menu"
        style="position-anchor:--cairn-edit-actions"
        ontoggle={(e) => (actionsOpen = e.newState === 'open')}
        class="dropdown dropdown-end menu menu-sm bg-base-100 rounded-box w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]"
      >
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

      <!-- The lifecycle pair, fenced off by their own hairline. -->
      <div class="flex items-center gap-2 border-l border-[var(--cairn-card-border)] pl-3">
        <!-- Publish always renders (the grounding survey favors permanent visibility over hiding
             the control until a draft exists). Outline keeps Save the single solid primary action;
             Publish reads as its peer. With nothing new to publish it guards rather than hides,
             on the figure-control pattern this repo already owns: aria-disabled (never the native
             attribute, so the control stays focusable and its reason reaches assistive technology),
             the cairn-btn-guarded marker so the title tooltip survives DaisyUI's pointer-events
             kill, and a not-allowed cursor rather than .btn-disabled. DaisyUI's own [aria-disabled]
             rule supplies the dimming, so no opacity utility rides on top (a second dimming would
             halve the focus ring on this still-focusable control). Native disabled is reserved for
             busy (mid-submit), the one case the guidance sanctions, and aria-disabled is emitted
             only while guarded so the two never contradict. onPublishClick cancels a guarded click's
             own submit, since aria-disabled alone blocks nothing. -->
        <button
          bind:this={publishButton}
          type="submit"
          form="cairn-edit-form"
          formaction="?/publish"
          class="btn btn-outline btn-primary btn-sm cairn-btn-guarded"
          class:cursor-not-allowed={!publishActionable}
          aria-disabled={publishActionable ? undefined : true}
          aria-label={publishGuardName}
          title={publishGuardReason}
          disabled={busy}
          onclick={onPublishClick}
        >
          {#if publishing}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Publishing…{:else}Publish{/if}
        </button>
        <!-- Save sleeps while the page is clean, agreeing with the band indicator; a new entry
             stays saveable so it can be created as loaded. -->
        <button type="submit" form="cairn-edit-form" class="btn btn-primary btn-sm" disabled={busy || (!dirty && !data.isNew)}>
          {#if saving}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span> Saving…{:else}Save{/if}
        </button>
      </div>
    </div>
  </div>
{/snippet}

<!-- The whole edit surface remounts when navigation lands on another entry (see the entryKey
     reset above); script-level state and the beforeNavigate registration sit outside the block,
     so only the template rebuilds. -->
{#key entryKey}
<div class="sr-only" aria-live="polite">{politeMessage}</div>
<div class="sr-only" aria-live="assertive">{assertiveMessage}</div>

<!-- The feedback strip slides in directly under the one header band: @starting-style drives the
     entry, so the motion is pure CSS and the admin sheet's prefers-reduced-motion rule squashes it. -->
{#if flash}
  <div class="cairn-feedback alert alert-success mb-4 text-sm transition-all duration-300 starting:-translate-y-2 starting:opacity-0">
    {flash}
  </div>
{/if}
<!-- The site's publish-actions next-step links (docs/reference/sveltekit.md#the-publish-actions-seam):
     quiet links beside the publish-success strip, never their own alert. They render only alongside
     publishedFlash, so a mid-edit reload of a previously published entry never shows a stale set. -->
{#if data.publishedFlash && data.publishActions.length}
  <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
    {#each data.publishActions as action (action.label)}
      <a class="link link-primary" href={action.href}>{action.label}</a>
    {/each}
  </div>
{/if}
{#if data.error}
  <div class="alert alert-error mb-4 text-sm">{data.error}</div>
{/if}
{#if formError}
  <div class="alert alert-error mb-4 text-sm">{formError}</div>
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
<!-- The shared advisory notices: one live-region surface for every non-blocking editor warning. It
     carries the server's address-collision advisory and the client-derived needs-alt notice through
     one snippet. Each renders as one alert-warning row: the caution glyph, the message, an optional
     detail sentence, and a list of action rows. Each is a warning, never a block: the author can act
     on it or save without it. The leading glyph carries the state alongside the message, so the
     caution reads without relying on hue. A row with an href is a server advisory's link; a row with
     onAct is the needs-alt jump that runs an editor callback (selecting the image source, or focusing
     a hero alt input). -->
<!-- Keyed by index, not by notice.kind: the kind is a free string with no uniqueness constraint, so
     two notices of one kind would otherwise throw each_key_duplicate. The list is append-only and
     never reordered, so the index is a stable key here. -->
{#snippet advisoryNotices(notices: RenderNotice[])}
  {#each notices as notice, i (i)}
    <div class="alert alert-warning mb-4 flex-col items-start text-sm">
      <p class="flex items-center gap-2 font-medium">
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        <span>{notice.message}</span>
      </p>
      {#if notice.detail}
        <p>{notice.detail}</p>
      {/if}
      {#if notice.rows.length}
        <ul class="mt-1 w-full">
          {#each notice.rows as row, i (i)}
            <li class="flex items-center justify-between gap-2">
              {#if row.rowLabel}
                <!-- A body needs-alt row labels with its source reference in a code span; a hero row
                     and any future labelled row use a plain label. -->
                {#if row.rowCode}
                  <code class="text-xs">{row.rowLabel}</code>
                {:else}
                  <span class="text-xs font-medium">{row.rowLabel}</span>
                {/if}
              {/if}
              {#if row.href}
                <a class="btn btn-xs" href={row.href}>{row.label}</a>
              {:else}
                <button type="button" class="btn btn-xs" onclick={row.onAct}>{row.label}</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
{/snippet}
<!-- The role="status" live region renders unconditionally (present and empty at load), so when the
     first notice appears it announces; a region conditionally mounted with its first content may not
     be observed by assistive tech (WCAG 4.1.3). The notices gate on their own presence, so an empty
     region shows nothing. A plain wrapper (not display:contents) carries the role, since some
     assistive tech drops a role off a display:contents box. -->
<div role="status">
  {@render advisoryNotices(renderNotices)}
</div>
{#if draftWarning}
  <div class="alert alert-warning mb-4 text-sm">
    Saved. Note: this page links to unpublished {draftWarning.includes(',') ? 'pages' : 'a page'} ({draftWarning}), which will 404 until published.
  </div>
{/if}
{#if referenceWarning}
  <div class="alert alert-warning mb-4 text-sm">
    Saved. Note: this page references {referenceWarning.includes(',') ? 'entries' : 'an entry'} ({referenceWarning}) not yet published, which the build will flag until published.
  </div>
{/if}

<form
  method="POST"
  action="?/save"
  id="cairn-edit-form"
  bind:this={editForm}
  onsubmit={onEditSubmit}
  oninput={onFormInput}
  oninvalidcapture={onFormInvalid}
>
  <CsrfField />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <!-- In Write mode the card hugs the manuscript: the column caps near the 70ch measure and
       centers, so the card frame never spans emptiness on a wide window. Preview keeps the full
       column for its device frames. The cap follows the surface posture: prose hugs its 72ch
       measure (49rem covers it at the prose type step), markup puts the ceiling near 89ch of
       the base face for tables, attributed directives, and long URLs. The toggle lives in the
       card footer with the other writing preferences. -->
  <div class={mode === 'preview' ? '' : `mx-auto w-full ${surface === 'prose' ? 'max-w-[49rem]' : 'max-w-[56rem]'}`}>
    <!-- The page's accessible name. The visible title is a borderless input, so a real heading
         lives here for assistive tech (the band no longer carries one). -->
    <h1 class="sr-only">{data.title}</h1>
    {#if titleField && !zen}
      <!-- The hoisted document title: large, borderless, in the display face, so the manuscript
           reads as the protagonist. It submits as name="title", the same field as before. The
           admin sheet gives it the editor's quiet focus hairline (see .cairn-doc-title there).
           In markup posture the surface fills the card, so shared inline padding is the whole
           alignment; in prose posture the manuscript centers on its measure, so the wrapper
           mirrors that geometry (the editor face at the prose size, the measure, auto margins).
           Under focus mode the title eases back with the rest of the context unless it holds
           focus itself. -->
      <div class={surface === 'prose' ? 'mb-4 mx-auto w-full max-w-[72ch] px-5 text-[1.0625rem] font-[family-name:var(--font-editor,ui-monospace,monospace)]' : 'mb-4 w-full px-5'}>
        <input
          class="cairn-doc-title w-full border-0 bg-transparent text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] placeholder:text-muted {focusMode ? 'cairn-doc-title-dim' : ''}"
          name="title"
          value={str(data.frontmatter.title)}
          placeholder={titleField.label}
          aria-label={titleField.label}
          required={titleField.required}
        />
      </div>
    {/if}
    <!-- The editor card: the toolbar strip and the editing surface share one frame, so the editor
         reads as a single object. The card carries the formatting shortcuts for everything in it. -->
    <div
      bind:this={editorCard}
      class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-hidden shadow-[var(--cairn-shadow)]"
      role="group"
      aria-label="Editor"
    >
      {#if !zen}
      <EditorToolbar {format} {mode} onMode={setMode} {device} onDevice={setDevice}>
        {#snippet insertControls()}
          <!-- Plain triggers only: the dialogs they open hold their own <form> elements, so the
               dialogs themselves mount outside the edit form at the bottom of this component.
               Icon buttons like the format strip beside them: the labels live in aria-label and
               the title tooltip, so the Insert group reads as part of one instrument strip. -->
          {#if hasComponents}
            <button
              type="button"
              class="btn btn-sm btn-ghost btn-square"
              aria-haspopup="dialog"
              aria-label="Insert block"
              title="Insert block"
              disabled={insertDisabled}
              onclick={() => insertDialog?.open()}
            >
              <BlocksIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <!-- Edit block re-opens the component at the caret into the guided form. It is
                 unavailable while Preview shows (like the insert controls) and whenever the caret is
                 not on a safe, schema-bearing component; the tooltip names the reason in each state.
                 The unavailable state uses aria-disabled, not the native disabled attribute, so the
                 control stays focusable and its reason reaches assistive technology; the disabled
                 look rides a class and editBlock() early-returns so the dead click is inert. -->
            <button
              type="button"
              class="btn btn-sm btn-ghost btn-square"
              class:btn-disabled={editBlockUnavailable}
              aria-haspopup="dialog"
              aria-label={editBlockLabel}
              title={editBlockLabel}
              aria-disabled={editBlockUnavailable}
              onclick={editBlock}
            >
              <SquarePenIcon class="h-4 w-4" aria-hidden="true" />
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-sm btn-ghost btn-square"
            aria-haspopup="dialog"
            aria-label="Web link (Ctrl+K)"
            title="Web link (Ctrl+K)"
            disabled={insertDisabled}
            onclick={() => webLinkDialog?.open()}
          >
            <LinkIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost btn-square"
            aria-haspopup="dialog"
            aria-label="Link to page"
            title="Link to page"
            disabled={insertDisabled}
            onclick={() => linkPicker?.open()}
          >
            <FileSymlinkIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            disabled={insertDisabled}
            aria-label="Insert image"
            title="Insert image"
            onclick={() => mediaPopover?.open('chooser')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </button>
          {#if tidyEnabled}
            <!-- Tidy (spec 2.1): the single desk entry point for the light copy-edit. A labelled
                 accent-quiet action (something you invoke, not a format you toggle). Disabled in
                 Preview, while a review is open, and while a request is in flight. -->
            <button
              type="button"
              class="btn btn-sm btn-ghost gap-1.5"
              aria-label="Tidy"
              title="Tidy: a light copy-edit you review before it lands"
              disabled={insertDisabled || tidyBusy}
              onclick={runTidy}
            >
              <SparklesIcon class="h-4 w-4" aria-hidden="true" />Tidy
            </button>
          {/if}
          <!-- The Figure control: always rendered, enabled only when the caret sits on a media image
               (and the Write surface is up). It never mounts or unmounts on caret movement; only its
               enabled state changes (the Edit-block pattern). The unavailable state uses aria-disabled,
               not the native disabled attribute, so the control stays focusable and its reason reaches
               assistive technology; openFigure() early-returns so the dead click is inert. The dimming
               uses opacity and cursor utilities, never .btn-disabled, because that sets
               pointer-events: none and would suppress the title tooltip a mouse user reads for the why. -->
          <button
            type="button"
            class="btn btn-sm btn-ghost btn-square cairn-btn-guarded"
            class:opacity-50={!figureAvailable}
            class:cursor-not-allowed={!figureAvailable}
            aria-haspopup="dialog"
            aria-label={figureLabel}
            title={figureLabel}
            aria-disabled={!figureAvailable}
            onclick={openFigure}
          >
            <ImageIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        {/snippet}
      </EditorToolbar>
      {/if}
      <!-- The Write pane stays mounted while Preview shows, so CodeMirror keeps its caret, scroll
           position, and undo history across the tab switch. -->
      <div id="cairn-pane-write" role="tabpanel" aria-labelledby="cairn-tab-write" class:hidden={mode === 'preview'}>
        <MarkdownEditor
          bind:value={body}
          name="body"
          {surface}
          registerInsert={(fn) => (insert = fn)}
          onComponentAtCaret={(info) => (caretComponent = info)}
          onMediaImageAtCaret={(info) => (mediaAtCaret = info)}
          registerReplaceRange={(fn) => (replaceRange = fn)}
          registerSelectRange={(fn) => (selectRange = fn)}
          registerInsertLink={(fn) => (insertLink = fn)}
          registerGetSelection={(fn) => (getSelection = fn)}
          registerGetSelectionRange={(fn) => (getSelectionRange = fn)}
          registerFormat={(fn) => (format = fn)}
          registerTidy={(api) => (tidyApi = api)}
          registerUndo={(fn) => (undoEditor = fn)}
          {tidyMode}
          registerCaretCoords={(fn) => (caretCoords = fn)}
          registerFocusEditor={(fn) => (focusEditor = fn)}
          registerImagePlaceholders={(api) => (placeholders = api)}
          registerInsertImage={(fn) => (insertImageFn = fn)}
          onImageIngest={(file) => mediaPopover?.open('capture', file)}
          onDiagnosticsCounts={(counts) => (diagnosticsCounts = counts)}
          {completionSources}
          {mediaLibrary}
          {focusMode}
          {typewriter}
          {spellcheck}
          spellcheckDictionary={data.spellcheckDictionary}
          siteDictionary={data.siteDictionary}
          {pendingAdditions}
          foldOnMount
        />
        <!-- The accumulated uploaded records ride the save form alongside the body. The save action
             reads `media` and merges these records into media.json (publish submits the same form). -->
        <input type="hidden" name="media" value={JSON.stringify(uploadedRecords)} />
      </div>
      {#if mode === 'preview'}
        <!-- The preview ground: recessed under the floating frame card so the page reads as a
             sheet on the desk. tabindex 0 only while a message shows in place of the iframe;
             with the iframe up the frame itself is the pane's focusable content (the tabpanel
             pattern's completeness requirement). -->
        <div
          id="cairn-pane-preview"
          role="tabpanel"
          aria-labelledby="cairn-tab-preview"
          tabindex={previewHtml && !previewFailed ? undefined : 0}
          class="bg-base-200 px-4 py-6 lg:px-8"
        >
          <!-- The frame column: centered, sized by the picked device (capped at the pane), with
               the width eased; the admin sheet's prefers-reduced-motion rule squashes the move. -->
          <div
            class="cairn-preview-frame mx-auto max-w-full transition-[width] duration-300"
            style:width={activeDevice.width === null ? '100%' : `${activeDevice.width}px`}
          >
            {#if activeDevice.width !== null}
              <p class="mb-2 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                {deviceLabel(activeDevice)}
              </p>
            {/if}
            {#if !data.preview}
              <p class="mb-2 text-xs text-muted">
                Preview shows unstyled markup until the adapter's preview option names the site's stylesheets.
              </p>
            {/if}
            <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-hidden shadow-[var(--cairn-shadow)]">
              {#if previewFailed}
                <p class="p-4 text-sm text-muted">The preview could not render this content.</p>
              {:else if !previewHtml}
                <p class="p-4 text-sm text-muted">Nothing to preview yet.</p>
              {:else}
                <!-- The site's render pipeline already sanitized the html (the floor strips
                     scripts and handlers); the empty sandbox is belt and braces on top. The
                     frame document's base tag targets every link at a new tab, which the
                     sandbox (no allow-popups) blocks, so a proofing click never navigates the
                     admin or the frame itself. tabindex 0 keeps the scrollable preview
                     keyboard-reachable (an iframe is not a sequential tab stop by itself); on
                     a link-heavy page that one inert Tab stop is a deliberate tradeoff. The
                     a11y rule reads any tabindex on a non-interactive element as a smell, but
                     a scrollable region is the recognized exception. -->
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <iframe sandbox="" tabindex="0" title="Page preview" srcdoc={previewDoc} class="block h-[70vh] w-full"></iframe>
              {/if}
            </div>
          </div>
        </div>
      {/if}
      <!-- The card footer, part of the same instrument frame. It stays up in Preview too, so the
           frame never jumps between tabs and the count keeps reading while proofing. The strip
           carries the writing environment (the count, the persisted writing modes, help) while
           the top toolbar acts on the text; the toggles live here visible rather than buried in
           an overflow menu. -->
      {#if !zen}
      <div class="flex items-center justify-between border-t border-[var(--cairn-card-border)] px-3 py-1 text-xs text-muted">
        <span class="flex items-center gap-1.5">
          <span>{wordLabel}</span>
          <!-- Visually shown but not screen-reader announced: the diagnostics-summary announcer
               already speaks this settled count in its own polite live region, so exposing this
               span too would announce the same information twice (WCAG 4.1.3 speaks to exactly
               this: one designed channel per piece of status information). -->
          <span aria-hidden="true" class="opacity-50">·</span>
          <span aria-hidden="true" data-testid="cairn-issue-count">{issueLabel}</span>
        </span>
        <div class="flex items-center gap-3.5">
          <!-- The posture pair is one bordered segmented control: the shared border carries the
               pick-one semantics, so no group label is needed (the spec considered and declined
               them). The pressed check is the non-color state cue (WCAG 1.4.1): the segments share
               weight outside the active one, so hue alone never carries the state. -->
          <div
            role="group"
            aria-label="Editing surface"
            class="bg-base-100 inline-flex items-center overflow-hidden rounded-lg border border-[var(--cairn-card-border)]"
          >
            <button
              type="button"
              class={segButtonClass(surface === 'prose')}
              aria-pressed={surface === 'prose'}
              onclick={() => setSurface('prose')}
            >
              {#if surface === 'prose'}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Prose
            </button>
            <button
              type="button"
              class="{segButtonClass(surface === 'markup')} border-l border-[var(--cairn-card-border)]"
              aria-pressed={surface === 'markup'}
              onclick={() => setSurface('markup')}
            >
              {#if surface === 'markup'}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Markup
            </button>
          </div>
          <!-- Focus mode and Typewriter are standalone check-and-tint toggles, no border. -->
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class={ftrToggleClass(focusMode)}
              aria-pressed={focusMode}
              onclick={() => setFocusMode(!focusMode)}
            >
              {#if focusMode}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Focus mode
            </button>
            <button
              type="button"
              class={ftrToggleClass(typewriter)}
              aria-pressed={typewriter}
              onclick={() => setTypewriter(!typewriter)}
            >
              {#if typewriter}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Typewriter
            </button>
            <!-- Spellcheck: the markdown-aware lint underlines. Off reconfigures the lint compartment
                 to empty and idles the Worker. Same check-and-tint grammar as the modes beside it. -->
            <button
              type="button"
              class={ftrToggleClass(spellcheck)}
              aria-pressed={spellcheck}
              onclick={() => setSpellcheck(!spellcheck)}
            >
              {#if spellcheck}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Spellcheck
            </button>
            <!-- Zen enters from the footer (and Ctrl+Shift+.); it reads as a peer writing-mode
                 toggle here, but once on it hides the whole footer, so the chip carries the way out. -->
            <button
              type="button"
              class={ftrToggleClass(zen)}
              aria-pressed={zen}
              onclick={() => setZen(!zen)}
            >
              {#if zen}<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
              Zen
            </button>
          </div>
          <!-- Markdown help is a plain underlined link-styled button (a reference, not a control),
               no border, no fill. -->
          <button
            type="button"
            class="ftr-link cursor-pointer text-muted underline [text-decoration-color:color-mix(in_oklab,currentColor_40%,transparent)] [text-underline-offset:2px] hover:text-[var(--color-primary)]"
            aria-haspopup="dialog"
            onclick={() => helpDialog?.open()}
          >
            Markdown help
          </button>
        </div>
      </div>
      {/if}
    </div>
  </div>

  <!-- The details slide-over: a fixed panel below the band, the frontmatter groups behind a
       Details/close header. It stays physically inside the edit form so its uncontrolled fields
       submit; `hidden` when closed takes it out of the a11y tree and the tab order while its
       display:none fields still post. role="region" with aria-label names it for assistive tech;
       focus moves to the close button on open and back to the trigger on close (the
       region-with-focus-management pattern). -->
  <aside
    role="region"
    aria-label="Entry details"
    hidden={!detailsOpen}
    class="fixed right-0 top-16 bottom-0 z-30 w-[19rem] overflow-y-auto border-l border-[var(--cairn-card-border)] bg-base-100 p-4 shadow-[var(--cairn-shadow)]"
  >
    <!-- The panel header: the Details eyebrow and the close button. The eyebrow is a plain span
         (not a legend), so the three group legends below still read as the only sidebar legends. -->
    <div class="mb-3.5 flex items-center justify-between">
      <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Details</span>
      <button
        bind:this={detailsClose}
        type="button"
        class="btn btn-ghost btn-xs btn-square"
        aria-label="Close details"
        onclick={closeDetails}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
    <!-- Three labeled groups. Each group is its own fieldset so its eyebrow is a real legend that
         screen readers announce with the fields it holds. -->
    <div class="flex flex-col gap-6">
      {#if detailFields.length}
      <fieldset class="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <!-- The panel header already shows the "Details" eyebrow, so this group's legend stays for
           the screen-reader grouping but hides visually, the way the mockup carries it once. -->
      <legend class="sr-only">Details</legend>
      {#each detailFields as field (field.name)}
        <FieldInput
          {field}
          frontmatter={data.frontmatter}
          targets={data.linkTargets}
          markFieldsDirty={markFieldsDirty}
          mediaLibrary={mediaLibrary}
          conceptId={data.conceptId}
          id={data.id}
          heroFieldRefs={heroFieldRefs}
          onuploaded={(record) => (uploadedRecords = [...uploadedRecords, record])}
          onheroneedsalt={(name, n) => (heroNeedsAlt = { ...heroNeedsAlt, [name]: n })}
          {icons}
          orphanTags={data.orphanTags}
        />
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
        <p class="text-xs text-muted">Hidden entries stay off the site's lists and feeds, even when published.</p>
      </fieldset>
      {/if}
      <fieldset class="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend class={eyebrowClass}>Address</legend>
        <div class="flex items-center justify-between gap-2">
          <code class="min-w-0 break-all text-xs text-muted">/{data.slug}</code>
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

<!-- The floating zen chip (the mockup's .zen-chip): fixed top-right, it carries the two things the
     WordPress/Ghost rule says never disappear under zen, the live save state and the way out. The
     save-state span mirrors the band's, so the warning dot flips with `dirty` live; the Exit button
     restores the chrome, with the Esc hint as the secondary cue. It renders only under zen. -->
{#if zen}
  <div class="cairn-zen-chip fixed right-[1.125rem] top-[0.875rem] z-40 flex items-center gap-2 rounded-xl border border-[var(--cairn-card-border)] bg-base-100 px-2.5 py-[5px] text-xs text-muted shadow-[var(--cairn-shadow)]">
    <span class="cairn-save-state flex items-center gap-1.5" aria-live="off">
      {#if dirty}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true"></span>{:else}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true"></span>{/if}
      {dirty ? 'Unsaved changes' : 'Saved'}
    </span>
    <span class="opacity-50" aria-hidden="true">·</span>
    <button
      type="button"
      class="ftr-link inline-flex items-center cursor-pointer text-muted underline [text-decoration-color:color-mix(in_oklab,currentColor_40%,transparent)] [text-underline-offset:2px] hover:text-[var(--color-primary)]"
      onclick={() => setZen(false)}
    >
      Exit zen<kbd class="ml-1.5 inline-block rounded border border-[var(--cairn-card-border)] px-1 text-[0.625rem] no-underline" aria-hidden="true">Esc</kbd>
    </button>
  </div>
{/if}

<!-- The toolbar's insert dialogs, mounted headless outside the edit form: each holds its own
     <form>, and a form nested in a form is invalid HTML the parser repairs by dropping the outer
     tag, which breaks the SSR'd document and hydration. The toolbar snippet's triggers drive them
     through their exported open(). -->
<ComponentInsertDialog
  bind:this={insertDialog}
  trigger={false}
  {registry}
  {insert}
  update={(range, md) => replaceRange(range.from, range.to, md)}
  {icons}
  {render}
  preview={data.preview}
/>
<WebLinkDialog bind:this={webLinkDialog} trigger={false} insert={insertLink} selection={getSelection} />
<LinkPicker bind:this={linkPicker} trigger={false} linkTargets={data.linkTargets} insert={insertLink} />

<!-- The media insert popover, mounted headless: the toolbar control, a paste, or a drop drives it
     through its exported open(). On a successful upload it hands the server-owned record up; the
     record joins uploadedRecords (the hidden save field) and the merged library (the source chip). -->
<MediaInsertPopover
  bind:this={mediaPopover}
  trigger={false}
  conceptId={data.conceptId}
  id={data.id}
  library={mediaLibrary}
  editor={editorApi}
  onuploaded={(record) => (uploadedRecords = [...uploadedRecords, record])}
/>

<!-- The figure control's host dialog, mounted headless outside the edit form (the control holds its
     own <form>). The toolbar Figure control opens it through openFigure(), pre-filled from the caret
     snapshot. The control is keyed on figurePrefill so it remounts fresh per open, seeding its fields
     from the new caption/role. The native <dialog> gives the focus trap and Escape for free, and the
     close event (the X, the backdrop, Escape, and the apply path all fire it) clears the snapshot so
     the host state matches the closed dialog. -->
<dialog
  class="modal"
  aria-labelledby="cairn-figure-dialog-title"
  bind:this={figureDialog}
  onclose={() => (figurePrefill = null)}
>
  <div class="modal-box max-w-sm">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-figure-dialog-title" class="flex items-center gap-2 text-base font-semibold">
        <ImageIcon class="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
        {figurePrefill?.mode === 'edit' ? 'Edit figure' : 'Wrap in a figure'}
      </h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => figureDialog?.close()}>✕</button>
    </div>
    {#if figurePrefill}
      {#key figurePrefill}
        <MediaFigureControl
          caption={figurePrefill.caption}
          role={figurePrefill.role}
          mode={figurePrefill.mode}
          decorative={figurePrefill.decorative}
          onapply={applyFigure}
          onunwrap={unwrapFigureAction}
        />
      {/key}
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>

<!-- The lifecycle dialogs, mounted headless: the header's overflow menu drives them through their
     exported open(). Their POST forms flip the leaving flag so the leave guard stands down. -->
<RenameDialog
  bind:this={renameDialog}
  trigger={false}
  conceptId={data.conceptId}
  id={data.id}
  label={data.label}
  slug={data.slug}
  onsubmitting={() => (leaving = true)}
/>
<MarkdownHelpDialog bind:this={helpDialog} />
<ShortcutsDialog bind:this={shortcutsDialog} />

<!-- The tidy review surface (spec 2.5). Mounted only while a review is open, keyed by the validated
     change set so a fresh review remounts. It drives the in-buffer decorations and the batched apply
     through tidyApi; the host clears tidy mode on close. -->
{#if tidyReview && tidyApi}
  <TidyReview
    changes={tidyReview.changes}
    original={tidyReview.original}
    conventions={data.tidy.conventions}
    model={tidyReview.model}
    title={data.title}
    api={tidyApi}
    onclose={closeTidyReview}
    onshow={(from, to) => selectRange(from, to)}
  />
{/if}

<!-- The tidy working state: a cancelable dialog wired to the real abort (Task 11's AbortController
     plus the bounded client timeout). Shown while the model call is in flight. -->
{#if tidyBusy}
  <dialog
    class="modal"
    aria-labelledby="cairn-tidy-working-title"
    data-testid="tidy-working"
    bind:this={tidyWorkingDialog}
    onclose={cancelTidy}
  >
    <div class="modal-box flex flex-col items-center gap-3 text-center">
      <span class="loading loading-spinner loading-lg text-primary" aria-hidden="true"></span>
      <h2 id="cairn-tidy-working-title" class="text-base font-semibold">Tidying your text</h2>
      <p class="max-w-prose text-sm text-muted">
        Claude is reading your draft for a light copy-edit. You will review every change before it lands.
      </p>
      <button type="button" class="btn btn-sm" onclick={() => tidyWorkingDialog?.close()}>Cancel</button>
    </div>
  </dialog>
{/if}

<!-- The no-op confirmation: tidy found nothing to fix. Quiet, never an empty review. -->
{#if tidyNoop}
  <dialog
    class="modal"
    aria-labelledby="cairn-tidy-noop-title"
    data-testid="tidy-noop"
    bind:this={tidyNoopDialog}
    onclose={() => (tidyNoop = false)}
  >
    <div class="modal-box flex flex-col items-center gap-3 text-center">
      <h2 id="cairn-tidy-noop-title" class="text-base font-semibold">Nothing to fix</h2>
      <p class="max-w-prose text-sm text-muted">Tidy read your text and found nothing to change.</p>
      <button type="button" class="btn btn-sm btn-primary" onclick={() => tidyNoopDialog?.close()}>Close</button>
    </div>
  </dialog>
{/if}

<!-- A refused, failed, or rejected tidy: the honest message; the document is unchanged. -->
{#if tidyMessage}
  <dialog
    class="modal"
    aria-labelledby="cairn-tidy-message-title"
    data-testid="tidy-message"
    bind:this={tidyMessageDialog}
    onclose={() => (tidyMessage = null)}
  >
    <div class="modal-box flex flex-col gap-3">
      <h2 id="cairn-tidy-message-title" class="text-base font-semibold">Tidy could not run</h2>
      <p class="text-sm text-muted">{tidyMessage}</p>
      <div class="flex justify-end">
        <button type="button" class="btn btn-sm btn-primary" onclick={() => tidyMessageDialog?.close()}>Close</button>
      </div>
    </div>
  </dialog>
{/if}
<DeleteDialog
  bind:this={deleteDialog}
  trigger={false}
  conceptId={data.conceptId}
  id={data.id}
  label={data.label}
  inboundLinks={data.inboundLinks}
  pending={data.pending}
  onsubmitting={() => (leaving = true)}
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
      <form method="POST" action="?/discard" class="flex justify-end gap-2" onsubmit={() => (leaving = true)}>
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
{/key}
