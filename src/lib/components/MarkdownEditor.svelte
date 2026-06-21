<!--
@component
The `MarkdownEditor` seam (spec §6, seam 5): a thin wrapper over CodeMirror 6 exposing a bindable
value and cursor-edit callbacks. CodeMirror is client-only, so it mounts after the component does
through a dynamic import; until then a plain textarea carries the value so the form still submits, and
the hidden field mirrors the value throughout. The host owns the toolbar and the card chrome, driving
selection transforms through the registerFormat seam; the design-accurate preview lives in EditPage
through the adapter's render. Swapping the editor stays a one-file change.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { applyMarkdownFormat, figureAtImage, insertImage as insertImageFormat, insertInlineLink, type FigureAtImage, type FormatKind, type FormatResult } from './markdown-format.js';
  import { fenceScan, caretContainerRange, directiveOpenerName } from './markdown-directives.js';
  import { firstImageFile, guardDropTarget } from './client-ingest.js';
  import type { MediaLibrary } from '../media/library-entry.js';

  /** The directive container at the caret: the opener's name, the block's markdown, and the
   *  document character offsets of its inclusive line range. */
  interface ComponentAtCaret {
    name: string | null;
    markdown: string;
    from: number;
    to: number;
  }

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
    /** Receives a `(href, title) => void` that inserts an inline link; the link picker calls it. */
    registerInsertLink?: (insert: (href: string, title: string) => void) => void;
    /** Receives an `(alt, ref) => void` that inserts an inline image at the caret; the media picker
     *  and the capture card call it with the chosen alt and the full `media:slug.hash` reference. */
    registerInsertImage?: (insert: (alt: string, ref: string) => void) => void;
    /** Called with the first image File of a paste or drop onto the surface; the host opens the
     *  capture card with the bytes. A paste or drop carrying no image falls through untouched. */
    onImageIngest?: (file: File) => void;
    /** The picker's human layer per stored asset, keyed by the 16-hex content hash (EditData's
     *  `mediaLibrary`). The source decoration reads it to render a `media:` token as a thumbnail chip;
     *  reactive, so a just-uploaded image decorates once it joins the library. Empty by default. */
    mediaLibrary?: MediaLibrary;
    /** Receives a `() => { left; right; top; bottom } | null` returning the caret's viewport
     *  coordinates; the insert popover anchors itself to the cursor from this. Null before mount or
     *  when the caret has no measurable position. */
    registerCaretCoords?: (
      get: () => { left: number; right: number; top: number; bottom: number } | null,
    ) => void;
    /** Receives a `() => void` that returns focus to the editor; the insert popover calls it on close
     *  or Escape. The selection is preserved automatically, since opening the popover only blurs the
     *  editor and never edits the doc. */
    registerFocusEditor?: (focus: () => void) => void;
    /** Receives the optimistic-placeholder api; the insert popover drives the upload loop through it
     *  (begin lands a placeholder at the caret, progress moves its bar, resolveTo swaps it for the
     *  committed image text, cancel removes it leaving the source untouched). */
    registerImagePlaceholders?: (api: import('./editor-placeholder.js').ImagePlaceholderApi) => void;
    /** Receives a `() => string` returning the selected text; the web link dialog reads it. */
    registerGetSelection?: (get: () => string) => void;
    /** Receives a `(kind) => void` that transforms the current selection; the host's toolbar calls it. */
    registerFormat?: (format: (kind: FormatKind) => void) => void;
    /** Reports the directive container at the caret (or null when outside any container) whenever
     *  the reported value changes; the host resolves it against the registry to offer Edit-block. */
    onComponentAtCaret?: (info: ComponentAtCaret | null) => void;
    /** Reports the media image at the caret (or null when the caret is not on one) whenever the
     *  reported value changes; the host opens the figure control over it to wrap, edit, or unwrap a
     *  `:::figure`. The figure transforms write source through registerReplaceRange. */
    onMediaImageAtCaret?: (info: FigureAtImage | null) => void;
    /** Receives a `(from, to, text) => void` that overwrites a document span; the dialog's Update
     *  calls it to write an edited block back over its original range. */
    registerReplaceRange?: (replace: (from: number, to: number, text: string) => void) => void;
    /** Receives a `(from, to) => void` that selects a document span, focuses the editor, and scrolls
     *  the range into view; the needs-alt notice's jump control calls it to land the author on an
     *  image that lacks alt text. */
    registerSelectRange?: (select: (from: number, to: number) => void) => void;
    /** Generic CodeMirror completion sources wired into the editor; the link autocomplete is one. The
     *  type is referenced inline so no static `@codemirror/*` import sits in this client-only file. */
    completionSources?: import('@codemirror/autocomplete').CompletionSource[];
    /** Focus mode: dim every line outside the caret's paragraph. Off by default. */
    focusMode?: boolean;
    /** Typewriter scroll: hold the cursor line at vertical center while typing. Off by default. */
    typewriter?: boolean;
    /** The surface posture. Prose is the writing instrument (72ch measure, larger type, looser
     *  leading); markup is the working surface (fills the card, denser). Prose by default. */
    surface?: 'prose' | 'markup';
    /** Spellcheck and the objective-error layer: the markdown-aware lint underlines. On by default;
     *  when off the lint compartment reconfigures to empty (the underlines vanish, the Worker stays
     *  idle). The footer toggle drives this. */
    spellcheck?: boolean;
    /** The dialect-resolved dictionary filename, e.g. "dictionary-en-us.txt", from EditData. The
     *  source resolves it to a real asset URL and hands it to the spellcheck Worker's init. Defaults to
     *  US English. */
    spellcheckDictionary?: string;
    /** The committed personal-dictionary words (spec 1.6), from EditData.siteDictionary. The lint
     *  source seeds the spellcheck Worker's personal layer with these at init, so a word another editor
     *  committed answers correct from the first lint. Empty by default (dialect-only). */
    siteDictionary?: ReadonlyArray<string>;
    /** The caller-owned pending personal-dictionary additions. When an author chooses "Add to
     *  dictionary" the lint source adds the lowercased word here (the underline clears at once); the
     *  host (EditPage) commits this set through the addDictionaryWord action at save time and reconciles
     *  it against the merged response. A fresh set by default. */
    pendingAdditions?: Set<string>;
    /** Test-only seam for the spellcheck Worker. The real wasm and dictionary assets are resolved with
     *  `import.meta.url` and do not load under the vitest browser dev server, so the component test
     *  injects a deterministic fake Worker factory and asks the lint source to skip the `ready` wait.
     *  When this is absent the production path is untouched: the real `new Worker(...)` and the real
     *  asset resolution. Never set this outside a test. */
    spellcheckTest?: {
      createWorker?: () => import('./spellcheck.js').SpellWorker;
      assumeReady?: boolean;
    };
  }

  let {
    value = $bindable(),
    name,
    registerInsert,
    registerInsertLink,
    registerInsertImage,
    onImageIngest,
    mediaLibrary = {},
    registerCaretCoords,
    registerFocusEditor,
    registerImagePlaceholders,
    registerGetSelection,
    registerFormat,
    onComponentAtCaret,
    onMediaImageAtCaret,
    registerReplaceRange,
    registerSelectRange,
    completionSources = [],
    focusMode = false,
    typewriter = false,
    surface = 'prose',
    spellcheck = true,
    spellcheckDictionary = 'dictionary-en-us.txt',
    siteDictionary = [],
    pendingAdditions = new Set<string>(),
    spellcheckTest,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let mounted = $state(false);
  // The CodeMirror view, untyped at the runtime boundary because @codemirror/* loads only in the
  // browser. The type-only `import(...)` annotation is erased; the value import is dynamic in onMount,
  // so the server bundle never pulls CodeMirror (guarded by the editor-boundary test).
  let view: import('@codemirror/view').EditorView | null = null;
  // The writing-mode extensions live in their own compartments so the toolbar toggles swap them
  // in and out of the mounted editor without rebuilding it. Assigned in onMount with the rest of
  // the dynamic editor modules.
  let modes: typeof import('./editor-modes.js') | null = null;
  let focusCompartment: import('@codemirror/state').Compartment | null = null;
  let typewriterCompartment: import('@codemirror/state').Compartment | null = null;
  let surfaceCompartment: import('@codemirror/state').Compartment | null = null;
  // The media: source decoration lives in its own compartment, reconfigured when the mediaLibrary
  // prop changes so a just-uploaded image decorates the moment it joins the library. The media
  // module loads with the other dynamic editor modules in onMount.
  let mediaCompartment: import('@codemirror/state').Compartment | null = null;
  let mediaMod: typeof import('./editor-media.js') | null = null;
  // The spellcheck lint source (and the objective-error layer it bundles) live in their own
  // compartment, reconfigured to empty when the footer toggle turns spellcheck off. Both surfaces ride
  // the one extension cairnSpellcheck returns, so one compartment gates both. The extension is built
  // asynchronously (it lazy-imports CodeMirror and the lint modules), so it is held here once resolved
  // and the on/off effect reconfigures against it.
  let spellcheckCompartment: import('@codemirror/state').Compartment | null = null;
  let spellcheckExt: import('@codemirror/state').Extension | null = null;
  // The posture themes, swapped through the surface compartment. Each owns its type step and
  // leading (the base theme deliberately sets neither on the content node, so the postures never
  // contest it on adoption order). Built in onMount beside the base theme.
  let proseTheme: import('@codemirror/state').Extension | null = null;
  let markupTheme: import('@codemirror/state').Extension | null = null;

  onMount(async () => {
    const viewMod = await import('@codemirror/view');
    const stateMod = await import('@codemirror/state');
    const markdownMod = await import('@codemirror/lang-markdown');
    const commandsMod = await import('@codemirror/commands');
    const languageMod = await import('@codemirror/language');
    const lintMod = await import('@codemirror/lint');
    const autocompleteMod = await import('@codemirror/autocomplete');
    const highlightMod = await import('./editor-highlight.js');
    const modesMod = await import('./editor-modes.js');
    const foldingMod = await import('./editor-folding.js');
    const placeholderMod = await import('./editor-placeholder.js');
    mediaMod = await import('./editor-media.js');
    const spellcheckMod = await import('./spellcheck.js');

    if (!host) return;

    const { EditorView, keymap } = viewMod;
    // Mirror the admin theme into CodeMirror's own dark flag, so its base chrome (the autocomplete
    // tooltip above all) renders dark-on-dark instead of light-on-dark.
    const isDark = host.closest('[data-theme]')?.getAttribute('data-theme')?.includes('dark') ?? false;
    // The directive machinery treatment: rails, not bands. A row at depth N draws every rail
    // 1..N as literal nested brackets: 2px accent bars on an 8px pitch (x offsets 0-2, 8-10,
    // and 16-18) with 6px of surface between them (three times the bar weight, so nested bars
    // separate cleanly instead of reading as one thick rule), stacked as inset box shadows (top
    // layer first, so each bar sits over the spacer and deeper bar beneath it). The alphas step through the per-theme vars in
    // cairn-admin.css; the fallbacks are the light values, so the editor still renders sensibly
    // outside an admin theme wrapper. On a fence line the colon runs, brackets, and {attrs}
    // braces dim to the marker tone while the name and label keep a depth-stepped ink. Leaf and
    // inline directives keep a fixed 8% accent chip; the accent ink holds AA on it (4.75:1
    // light, 5.20:1 dark).
    const railFallbacks = ['72%', '82%', '92%'];
    const railColor = (step: number | 'active', fallback: string) =>
      `color-mix(in oklab, var(--color-accent) var(--cairn-directive-rail-${step}, ${fallback}), transparent)`;
    // With `active`, the row's own (deepest) bar takes the full-strength -active mix at the same
    // 2px width. The emphasis is strength only: a rail column carrying both an active and a
    // quiet segment (two sibling containers at one depth) keeps one weight top to bottom. A paired
    // opener row paints its full rail like any other fence row; the fold chevron lives in the gutter
    // column left of the rails, so the opener no longer drops its innermost bar.
    const rails = (depth: number, active = false): string => {
      const layers: string[] = [];
      for (let d = 1; d <= depth; d++) {
        const edge = 8 * d - 6;
        if (d > 1) layers.push(`inset ${edge - 2}px 0 0 0 var(--color-base-100, oklch(99% 0.004 75))`);
        const own = active && d === depth;
        layers.push(
          `inset ${edge}px 0 0 0 ${own ? railColor('active', '100%') : railColor(d, railFallbacks[d - 1] ?? '92%')}`,
        );
      }
      return layers.join(', ');
    };
    const directiveInk = {
      backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
      color: 'var(--color-accent)',
    };
    // The rail rules, one quiet and one caret-active pair per visual depth step (deeper nesting
    // shares the third step). Fence and content rows at a depth share a rule, so a fence and its
    // body rail identically. The caret-active selector adds the caret-block class, so it outranks
    // its quiet twin on any contested row and the caret's container reads one step stronger.
    const railRules: Record<string, { boxShadow: string }> = {};
    for (const depth of [1, 2, 3]) {
      const row = (prefix: string) =>
        `${prefix}.cm-cairn-directive-fence.cm-cairn-depth-${depth}, ${prefix}.cm-cairn-directive-content.cm-cairn-depth-${depth}`;
      railRules[row('')] = { boxShadow: rails(depth) };
      railRules[row('.cm-cairn-caret-block')] = { boxShadow: rails(depth, true) };
    }
    const theme = EditorView.theme(
      {
        '&': { backgroundColor: 'var(--color-base-100)', color: 'var(--color-base-content)', fontSize: '1rem' },
        // The 60vh floor keeps the surface reading as the page's center stage even when the
        // entry is short, and because the contenteditable content area carries the height, a
        // click in the empty space below the text still lands in the editor and focuses it.
        // No inner measure cap: the surface fills the card the way a code editor fills its
        // pane, and the card's own width (the host caps it near 89ch of this face) is the one
        // constraint. The surface carries tables, attributed directives, and long URLs, so the
        // ceiling leans toward the code-editor end of the ergonomic band rather than the
        // long-form ideal; paragraphs wrap comfortably below it.
        '.cm-content': {
          // The theme roots set --font-editor to the self-hosted iA Writer Mono; the inline
          // fallback keeps the surface monospace outside an admin theme wrapper.
          fontFamily: "var(--font-editor, ui-monospace, monospace)",
          // Vertical padding holds at least one line-height of the body (1.8 x 1rem), with a
          // touch more below than above (the optical center sits high); the sides then read as
          // gutters rather than letterboxing.
          padding: '2rem 1.25rem 2.5rem',
          minHeight: '60vh',
        },
        '.cm-cursor': { borderLeftColor: 'var(--color-primary)' },
        // A quiet always-on focus hairline. :focus-visible is no escape here: browsers treat a
        // focused text-entry surface as keyboard-modal, so a 2px ring would shout through every
        // typing session. One subtle line keeps focus visible (WCAG 2.4.7) without competing
        // with the manuscript. The 70% primary mix clears the 3:1 non-text contrast floor
        // (WCAG 1.4.11) on both themes (3.23:1 light, 3.32:1 dark), where 45% measured near 2:1.
        '&.cm-focused': {
          outline: '1px solid color-mix(in oklab, var(--color-primary) 70%, transparent)',
          outlineOffset: '-1px',
        },
        '.cm-line': { padding: '0' },
        // A quote or list line hangs its wrapped continuation under the content: padding-left
        // holds the marker width (the --cairn-hang the decoration sets) and the line's own
        // negative text-indent (set inline) pulls the first line back, so the marker sits in the
        // indent. This rule sits before the gutter rule so a container content line, which
        // carries both classes, takes the gutter-plus-hang rule below.
        '.cm-cairn-hang': { paddingLeft: 'var(--cairn-hang, 0ch)' },
        // The gutter: directive rows pad left so the text clears the deepest rail stack (the
        // depth-3 bar ends at 18px; 1.75rem keeps 10px of air beyond it). Static structure
        // (caret-independent), so caret movement shifts no layout. The --cairn-hang term composes
        // a quote/list marker's hang on top of the gutter; it defaults to 0 on rows without one.
        '.cm-cairn-directive-fence, .cm-cairn-directive-content': {
          paddingLeft: 'calc(1.75rem + var(--cairn-hang, 0ch))',
        },
        ...railRules,
        '.cm-cairn-directive-mark': { color: 'var(--color-muted)' },
        '.cm-cairn-directive-label': { color: 'var(--color-accent)' },
        '.cm-cairn-directive-label.cm-cairn-depth-2': { color: 'var(--cairn-directive-ink-2, oklch(50% 0.16 300))' },
        '.cm-cairn-directive-label.cm-cairn-depth-3': { color: 'var(--cairn-directive-ink-3, oklch(48% 0.16 300))' },
        // Cursor-aware emphasis for the label ink: the caret's container takes the strongest
        // ink, through the -active variable in cairn-admin.css. This selector TIES the depth
        // rules above at two classes, so its place after them breaks the tie in its favor.
        '.cm-cairn-caret-block .cm-cairn-directive-label': {
          color: 'var(--cairn-directive-ink-active, oklch(46% 0.16 300))',
        },
        '.cm-cairn-directive-leaf': directiveInk,
        '.cm-cairn-directive-inline': directiveInk,
        // The media: source chip: the inline widget that stands in for a media reference token, in the
        // directive accent language (the 8% accent chip, the accent ink that holds AA on it). An
        // inline-flex pill carrying a small thumbnail and the asset's display name, so a reference
        // reads as the image it points at without leaving the source view.
        '.cm-cairn-media-chip': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3em',
          verticalAlign: 'baseline',
          padding: '0.05em 0.4em 0.05em 0.25em',
          borderRadius: '0.375rem',
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-body, ui-sans-serif, sans-serif)',
          fontSize: '0.8125rem',
          lineHeight: '1.4',
        },
        // The thumbnail: a small square crop, rounded to match the chip. object-fit keeps a
        // non-square source from distorting. A faint border lifts a light image off the chip tint.
        '.cm-cairn-media-thumb': {
          width: '1.4em',
          height: '1.4em',
          objectFit: 'cover',
          borderRadius: '0.25rem',
          border: '1px solid color-mix(in oklab, var(--color-accent) 20%, transparent)',
          flex: '0 0 auto',
        },
        '.cm-cairn-media-name': {
          fontWeight: '500',
          // Keep a long name from stretching the line; the title and the picker carry the full text.
          maxWidth: '18ch',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        // The needs-alt marker: a glyph plus a label, never hue alone (the spec accessibility rule).
        // It rides the warning tone so it reads as a caution, with the label spelling out the state.
        // The text uses --cairn-warning-ink, the on-surface warning text token, not --color-warning
        // (a fill tone that fails small-text contrast on the light chip tint, WCAG 1.4.3). The ink
        // holds AA on the chip's tint on both themes and stands apart from the accent name.
        '.cm-cairn-media-needs-alt': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2em',
          color: 'var(--cairn-warning-ink, oklch(50% 0.13 70))',
          fontSize: '0.6875rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        },
        '.cm-cairn-media-needs-alt-glyph': { fontSize: '0.85em', lineHeight: '1' },
        // The figure/role pill: a small bordered pill carrying the placement role (or "figure" for
        // the measure default) when a media token sits inside a :::figure, in the directive accent
        // language. The accent ink and a color-mix accent border on the base-100 surface read as a
        // quiet tag beside the name. The ink is theme-defined, so it holds contrast in both themes
        // (Task 8's polish confirms it visually). A bare token renders no pill at all.
        '.cm-cairn-media-role': {
          fontFamily: 'var(--font-body, ui-sans-serif, sans-serif)',
          fontSize: '0.625rem',
          fontWeight: '600',
          letterSpacing: '0.01em',
          color: 'var(--color-accent)',
          backgroundColor: 'var(--color-base-100)',
          border: '1px solid color-mix(in oklab, var(--color-accent) 35%, transparent)',
          borderRadius: '0.3rem',
          padding: '0.04rem 0.34rem',
          flex: '0 0 auto',
        },
        // The optimistic upload placeholder: an inline pill in the accent language, carrying a small
        // thumbnail of the image the author is placing and a determinate progress bar beneath it. It
        // stands in for the committed image text only while the upload runs; on resolve the seam
        // swaps it for the real reference, and on failure the seam removes it (the source untouched).
        // The accent tint matches the media chip so the two read as one visual family.
        '.cm-cairn-media-placeholder': {
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '0.2em',
          verticalAlign: 'baseline',
          padding: '0.2em 0.35em',
          borderRadius: '0.375rem',
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-accent) 20%, transparent)',
        },
        '.cm-cairn-media-placeholder-thumb': {
          width: '2.4em',
          height: '2.4em',
          objectFit: 'cover',
          borderRadius: '0.25rem',
          // A gentle pulse marks the placeholder as in-flight; reduced-motion drops it below.
          opacity: '0.85',
        },
        // The determinate bar: native <progress> restyled to the accent ink so the fill reads as the
        // upload's progress. Sized to the thumbnail width so the pill stays compact.
        '.cm-cairn-media-placeholder-bar': {
          width: '2.4em',
          height: '0.3em',
          appearance: 'none',
          border: '0',
          borderRadius: '0.15em',
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 18%, transparent)',
          overflow: 'hidden',
        },
        '.cm-cairn-media-placeholder-bar::-webkit-progress-bar': {
          backgroundColor: 'transparent',
        },
        '.cm-cairn-media-placeholder-bar::-webkit-progress-value': {
          backgroundColor: 'var(--color-accent)',
          borderRadius: '0.15em',
          transition: 'width 200ms ease',
        },
        '.cm-cairn-media-placeholder-bar::-moz-progress-bar': {
          backgroundColor: 'var(--color-accent)',
          borderRadius: '0.15em',
        },
        // Container folding lives in a real gutter column now, not an in-text band. The gutter is a
        // fixed-x column left of the content; the chevron is empty at rest and reveals on hovering
        // the gutter cell (the VS Code / Zed / Obsidian standard), forced on when folded or when the
        // caret is inside the container. One rotating chevron in the directive ink; the rails carry
        // depth, so the ink does not restep. The lone gutter's wrapper loses its default background
        // and border so the column blends into the quiet surface.
        // Neutralize the gutter wrapper so the column blends in. This assumes the fold gutter is the
        // only gutter (it is today: no lineNumbers or foldGutter in the build); a future line-number
        // or lint gutter would need its own chrome and a narrower selector here.
        '.cm-gutters': { backgroundColor: 'transparent', border: '0', color: 'inherit' },
        // 24px wide so the cell clears the WCAG 2.5.8 target-size floor unconditionally.
        '.cm-cairn-fold-gutter': { width: '24px' },
        '.cm-cairn-fold-gutter .cm-gutterElement': { display: 'flex', alignItems: 'stretch', padding: '0' },
        '.cm-cairn-fold-btn': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0',
          background: 'transparent',
          border: '0',
          cursor: 'pointer',
          color: 'var(--cairn-directive-ink-2, oklch(50% 0.16 300))',
        },
        '.cm-cairn-fold-btn svg': {
          width: '11px',
          height: '11px',
          // Empty at rest; the gutter-cell hover, the folded state, and the caret-active state each
          // force it on. A 120ms fade in and out, and a 120ms rotate for the folded turn.
          opacity: '0',
          transition: 'opacity 120ms ease, transform 120ms ease',
        },
        // Reveal on gutter-cell hover, on the folded and caret-active states, and on keyboard focus
        // so a focused control shows its glyph, not just the ring.
        '.cm-cairn-fold-gutter .cm-gutterElement:hover .cm-cairn-fold-btn svg, .cm-cairn-fold-btn:focus-visible svg, .cm-cairn-fold-folded svg, .cm-cairn-fold-active svg':
          { opacity: '1' },
        // Folded rotates the single chevron to point right; caret-active takes the stronger ink.
        '.cm-cairn-fold-folded svg': { transform: 'rotate(-90deg)' },
        '.cm-cairn-fold-active': { color: 'var(--cairn-directive-ink-active, oklch(46% 0.16 300))' },
        // A visible focus ring for keyboard users landing on the gutter button or the pill, reusing
        // the surface hairline's 70% primary mix (3:1+ non-text contrast on both themes).
        '.cm-cairn-fold-btn:focus-visible': {
          outline: '2px solid color-mix(in oklab, var(--color-primary) 70%, transparent)',
          outlineOffset: '-2px',
          borderRadius: '4px',
        },
        '.cm-cairn-fold-pill:focus-visible': {
          outline: '2px solid color-mix(in oklab, var(--color-primary) 70%, transparent)',
          outlineOffset: '1px',
        },
        // No-hover pointers (touch) cannot reveal on hover, so the rest-state chevron is persistent
        // and legible. Scoped to the rest state (not folded, not caret-active) so those forced-on
        // states still read at full strength on touch rather than this rule clamping them to 0.65.
        '@media (hover: none)': {
          '.cm-cairn-fold-btn:not(.cm-cairn-fold-folded):not(.cm-cairn-fold-active) svg': { opacity: '0.65' },
        },
        // Respect a reduced-motion preference: drop the chevron fade/rotate and the unfold flash.
        '@media (prefers-reduced-motion: reduce)': {
          '.cm-cairn-fold-btn svg': { transition: 'none' },
          '.cm-cairn-fold-flash': { transition: 'none' },
          '.cm-cairn-media-placeholder-bar::-webkit-progress-value': { transition: 'none' },
        },
        // The folded-row wash: a soft accent tint, square and full-row, returning as a STATE signal
        // so folded spots read in a scan. The rails are inset box-shadows on the same line element
        // and render above this background, so the rail column runs through the wash unbroken.
        '.cm-cairn-folded-row': {
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 7%, transparent)',
        },
        // The fold pill: the placeholder widget and the screen-reader story, a real focusable
        // button counting the hidden lines in accent ink. The 30% accent border lifts on hover.
        '.cm-cairn-fold-pill': {
          fontFamily: 'var(--font-body, ui-sans-serif, sans-serif)',
          fontSize: '0.6875rem',
          color: 'var(--color-accent)',
          border: '1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)',
          borderRadius: '0.375rem',
          padding: '1px 7px',
          marginLeft: '10px',
          verticalAlign: '1px',
          backgroundColor: 'var(--color-base-100)',
          cursor: 'pointer',
        },
        '.cm-cairn-fold-pill:hover': {
          borderColor: 'color-mix(in oklab, var(--color-accent) 60%, transparent)',
        },
        // The one-time unfold flash: a low-alpha accent background on the revealed lines, removed
        // after the animation. The transition runs as the field clears the class.
        '.cm-cairn-fold-flash': {
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 12%, transparent)',
          transition: 'background-color 400ms ease',
        },
        // Focus mode's dim ink, on the lines editor-modes marks outside the caret's paragraph.
        // Last on purpose: a dimmed line's spans (markers, tokens, directive labels) all drop to
        // the dim tone, and spec order breaks the specificity ties with the label rules above.
        // The fallback is the light theme's value, like the rail fallbacks. Backgrounds flatten
        // along with the ink: the dim tone on the code chip or an 8% accent chip measures under
        // the design's 3:1 floor, so a dimmed line keeps no tinted chip behind its text. The
        // span arm outranks the chip rules on specificity (the highlight style's generated
        // class, the inline-directive mark); the line arm covers the leaf chip, where spec
        // order breaks the tie.
        '.cm-cairn-focus-dim, .cm-cairn-focus-dim span, .cm-cairn-focus-dim .cm-cairn-directive-label': {
          color: 'var(--cairn-focus-dim-ink, oklch(66% 0.01 75))',
          backgroundColor: 'transparent',
        },
        // The fold pill dims with its folded opener row like any machinery line (the pill is a
        // widget inside the line). The gutter chevron lives in a separate DOM column that focus-dim
        // cannot reach by descendant selector, and it is already hidden at rest and forced visible
        // only when folded or caret-active, so a folded chevron stays findable without a dim rule.
        '.cm-cairn-focus-dim .cm-cairn-fold-pill': {
          color: 'var(--cairn-focus-dim-ink, oklch(66% 0.01 75))',
        },
        '.cm-cairn-focus-dim.cm-cairn-folded-row': { backgroundColor: 'transparent' },
        // The rails dim with their text: the rail color-mix reads --cairn-directive-rail-N per
        // element, so overriding the percentages on dimmed lines re-resolves every bar in place.
        // Without this the directive block keeps full-strength bars and becomes the one
        // chromatic object in the dimmed field. The active step needs the override too: focus
        // mode's lit unit is the caret PARAGRAPH while the caret-block class spans the whole
        // container, so a container holding a blank line has dimmed rows that still carry the
        // active rail.
        '.cm-cairn-focus-dim': {
          '--cairn-directive-rail-1': 'var(--cairn-focus-dim-rail-1, 24%)',
          '--cairn-directive-rail-2': 'var(--cairn-focus-dim-rail-2, 28%)',
          '--cairn-directive-rail-3': 'var(--cairn-focus-dim-rail-3, 32%)',
          '--cairn-directive-rail-active': 'var(--cairn-focus-dim-rail-active, 36%)',
        },
      },
      { dark: isDark },
    );

    // The prose posture: the writing instrument. A 72ch measure centered in the card, one type
    // step up, looser leading. Markup posture (the base theme) keeps the dense fill for tables,
    // directives, and long URLs. Placed after the base theme in the extension list, so its keys
    // win the spec-order ties.
    proseTheme = EditorView.theme(
      {
        // Scoped to the content node (not the editor root) so the base theme's root font-size
        // never contests it, and so the 72ch measure resolves against the prose type step.
        '.cm-content': { fontSize: '1.0625rem', lineHeight: '1.9', maxWidth: '72ch', margin: '0 auto' },
      },
      { dark: isDark },
    );
    markupTheme = EditorView.theme({ '.cm-content': { lineHeight: '1.8' } }, { dark: isDark });

    modes = modesMod;
    focusCompartment = new stateMod.Compartment();
    typewriterCompartment = new stateMod.Compartment();
    surfaceCompartment = new stateMod.Compartment();
    mediaCompartment = new stateMod.Compartment();
    spellcheckCompartment = new stateMod.Compartment();
    // Build the spellcheck extension once: the lint source resolves the dictionary asset URL from the
    // dialect-resolved filename and posts it to the Worker's init. The compartment starts with the
    // extension only when spellcheck is on, so a site that opens with it off never spins up the Worker.
    spellcheckExt = await spellcheckMod.cairnSpellcheck({
      dictionaryFile: spellcheckDictionary,
      // Seed the Worker's personal layer from the committed site dictionary, and share the host's
      // pending-additions set so an add-to-dictionary choice records here for the host to commit.
      siteWords: siteDictionary,
      pendingAdditions,
      // Hand the lint source the editor's own CodeMirror module instances so its extension lands on the
      // same copies; a separate dynamic import can resolve to a different instance and break instanceof.
      modules: { lint: lintMod, language: languageMod, view: viewMod, state: stateMod },
      // The test seam: a deterministic fake Worker and the skip-ready flag, both straight through to the
      // lint source. Absent in production, where the real Worker and real asset resolution run.
      createWorker: spellcheckTest?.createWorker,
      assumeReady: spellcheckTest?.assumeReady,
    });

    view = new EditorView({
      parent: host,
      state: stateMod.EditorState.create({
        doc: value,
        extensions: [
          focusCompartment.of(focusMode ? modesMod.focusMode() : []),
          typewriterCompartment.of(typewriter ? modesMod.typewriterScroll() : []),
          commandsMod.history(),
          keymap.of([...autocompleteMod.completionKeymap, ...commandsMod.defaultKeymap, ...commandsMod.historyKeymap]),
          // The GFM base (strikethrough, tables, task lists, autolink) over the commonmark
          // default. markdown() also wires markdownKeymap (Enter continues a list, Backspace
          // removes an empty marker) at high precedence through its addKeymap default.
          markdownMod.markdown({ base: markdownMod.markdownLanguage }),
          ...(completionSources.length
            ? // interactionDelay 0: the popup opens only on an explicit `[[` trigger, so the default
              // accidental-accept guard adds no value and would swallow an immediate Enter into a newline.
              [autocompleteMod.autocompletion({ override: completionSources, interactionDelay: 0 })]
            : []),
          EditorView.lineWrapping,
          languageMod.syntaxHighlighting(highlightMod.cairnHighlightStyle()),
          highlightMod.cairnDirectivePlugin(),
          // Container folding: the fold system, the chevron and wash affordance, and the safety
          // invariant. Placed after the directive plugin so its chevron widget on an opener row
          // composes with the row's rail and gutter; its keymap is internal to the extension.
          foldingMod.cairnFolding(),
          // The optimistic image placeholder field: a widget-only decoration the insert popover
          // drives through the registerImagePlaceholders api. It never writes doc text, so a failed
          // upload leaves the source untouched (open risk 2). Placed after folding so a placeholder
          // landing inside a directive composes with the rails.
          placeholderMod.cairnImagePlaceholders(),
          // The media: source decoration, in its own compartment so a mediaLibrary prop change
          // reconfigures it without rebuilding the editor. The chip and the atomic ranges read the
          // library; an empty library decorates nothing.
          mediaCompartment.of(mediaMod.cairnMediaDecorations(mediaLibrary)),
          // The spellcheck and objective-error lint sources plus the locked amber underline theme, in
          // their own compartment so the footer toggle gates both surfaces at once. Empty when off.
          spellcheckCompartment.of(spellcheck ? spellcheckExt : []),
          // Paste and drop ingest: an image carried by either gesture is preventDefault'd and handed
          // to onImageIngest (the host opens the capture card with the bytes); a gesture carrying no
          // image falls through to CodeMirror's default. 2b is single-file per gesture (open risk 3),
          // so only the first image routes.
          EditorView.domEventHandlers({
            dragover(event) {
              // Allow the drop only when the drag carries image files; otherwise let it pass so a
              // non-image drag (text, a link) keeps its native behavior.
              if (event.dataTransfer && firstImageFile(event.dataTransfer)) {
                guardDropTarget(event);
                return true;
              }
              return false;
            },
            drop(event) {
              const file = event.dataTransfer ? firstImageFile(event.dataTransfer) : null;
              if (!file) return false;
              guardDropTarget(event);
              onImageIngest?.(file);
              return true;
            },
            paste(event) {
              const file = event.clipboardData ? firstImageFile(event.clipboardData) : null;
              if (!file) return false; // a text or markdown paste falls through untouched
              event.preventDefault();
              onImageIngest?.(file);
              return true;
            },
          }),
          // No native text-correction override here (Task 7). The old `spellcheck: 'true'` is gone, so
          // the content node falls back to CodeMirror's own defaults: spellcheck "false", autocorrect
          // "off", autocapitalize "off". The cairn lint source replaces the browser's spellcheck
          // (running both would double-underline), and autocorrect/autocapitalize stay off so a browser
          // never silently rewrites a `media:` token, a directive name, or frontmatter.
          theme,
          surfaceCompartment.of(surface === 'prose' ? proseTheme : markupTheme),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) value = update.state.doc.toString();
            // A doc edit can change the block's span and a caret move can change which block the
            // caret sits in, so the reporter runs on either; the dedupe below absorbs the no-ops.
            if (onComponentAtCaret && (update.docChanged || update.selectionSet))
              reportComponentAtCaret(update.state);
            // The media-image reporter rides the same two triggers: a caret move lands on or off an
            // image, an edit shifts the figure's span. The dedupe absorbs the keystroke no-ops.
            if (onMediaImageAtCaret && (update.docChanged || update.selectionSet))
              reportMediaImageAtCaret(update.state);
          }),
        ],
      }),
    });

    registerInsert?.(insertAtCursor);
    registerInsertLink?.(insertLink);
    registerInsertImage?.(insertImage);
    registerCaretCoords?.(caretCoords);
    registerFocusEditor?.(focusEditor);
    registerImagePlaceholders?.(placeholderMod.imagePlaceholderApi(view));
    registerGetSelection?.(selectedText);
    registerFormat?.(applyFormat);
    registerReplaceRange?.(replaceRange);
    registerSelectRange?.(selectRange);
    // Report the caret's starting container once the editor exists, so a caret that mounts inside
    // a block is known without waiting for the first move.
    if (onComponentAtCaret) reportComponentAtCaret(view.state);
    if (onMediaImageAtCaret) reportMediaImageAtCaret(view.state);
    mounted = true;
  });

  onDestroy(() => view?.destroy());

  // Reconcile an externally reassigned `value` into the mounted editor. A no-op until `view` exists,
  // and the doc-equality guard ignores the updateListener's own writes so the two never feed back.
  $effect(() => {
    const incoming = value;
    if (!view) return;
    const current = view.state.doc.toString();
    if (incoming === current) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: incoming } });
  });

  // Reconfigure the writing-mode compartments when their props change. Reading `mounted` re-runs
  // the effect once the editor exists, so a preference arriving between render and mount still
  // applies; the reconfigure is idempotent, so the extra pass after mount costs nothing.
  $effect(() => {
    const focus = focusMode;
    const typing = typewriter;
    const posture = surface;
    if (!mounted || !view || !modes || !focusCompartment || !typewriterCompartment || !surfaceCompartment) return;
    view.dispatch({
      effects: [
        focusCompartment.reconfigure(focus ? modes.focusMode() : []),
        typewriterCompartment.reconfigure(typing ? modes.typewriterScroll() : []),
        surfaceCompartment.reconfigure((posture === 'prose' ? proseTheme : markupTheme) ?? []),
      ],
    });
  });

  // Reconfigure the media decoration when the mediaLibrary prop changes, so a just-uploaded image
  // (added to the library by the host) decorates without rebuilding the editor. Reading the prop
  // tracks it; the guard waits for the mounted editor and its media module.
  $effect(() => {
    const library = mediaLibrary;
    if (!mounted || !view || !mediaMod || !mediaCompartment) return;
    view.dispatch({ effects: mediaCompartment.reconfigure(mediaMod.cairnMediaDecorations(library)) });
  });

  // Reconfigure the spellcheck compartment when the footer toggle flips. On restores the bundled
  // extension (both lint sources and the theme); off swaps in an empty extension, so the underlines
  // vanish and the Worker goes idle. Reading the prop tracks it; the guard waits for the mounted
  // editor and the resolved extension.
  $effect(() => {
    const on = spellcheck;
    if (!mounted || !view || !spellcheckCompartment || !spellcheckExt) return;
    view.dispatch({ effects: spellcheckCompartment.reconfigure(on ? spellcheckExt : []) });
  });

  // The last value handed to onComponentAtCaret, so the reporter fires only on a change. The
  // identity compared is name + markdown + from + to. A pure caret move within one block leaves all
  // four unchanged, so it does not refire; an edit inside the block changes the markdown even when
  // it keeps the same length (an equal-length replacement leaves from and to unchanged), so the
  // markdown must be part of the equality or such an edit would keep a stale report.
  let lastCaretReport: ComponentAtCaret | null = null;

  // Compute the directive container at the caret from a CodeMirror state and report it through
  // onComponentAtCaret, deduped so a caret move within the same block does not refire. fenceScan
  // lines are 0-based; doc.line(n) is 1-based, so the line range maps with a +1 on each bound.
  function reportComponentAtCaret(state: import('@codemirror/state').EditorState) {
    const doc = state.doc;
    const lines: string[] = [];
    for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
    const caretLine = doc.lineAt(state.selection.main.head).number - 1;
    const range = caretContainerRange(fenceScan(lines), caretLine);
    let next: ComponentAtCaret | null = null;
    if (range) {
      const fromPos = doc.line(range.fromLine + 1).from;
      const toPos = doc.line(range.toLine + 1).to;
      next = {
        name: directiveOpenerName(lines[range.fromLine] ?? ''),
        markdown: doc.sliceString(fromPos, toPos),
        from: fromPos,
        to: toPos,
      };
    }
    const prev = lastCaretReport;
    const same =
      prev === next ||
      (prev !== null &&
        next !== null &&
        prev.name === next.name &&
        prev.markdown === next.markdown &&
        prev.from === next.from &&
        prev.to === next.to);
    if (same) return;
    lastCaretReport = next;
    onComponentAtCaret?.(next);
  }

  // The last media-image report, so the reporter fires only on a change. The compared identity is
  // the image span plus the figure's range/caption/role; a pure caret move within one image (or one
  // figure) leaves them unchanged, so it does not refire, while an edit that shifts the figure span
  // or rewrites the caption does. A null transitions to or from null on entering/leaving an image.
  let lastMediaReport: FigureAtImage | null = null;

  // Compute the media image at the caret from a CodeMirror state and report it through
  // onMediaImageAtCaret, deduped so a caret move that stays on the same image does not refire.
  function reportMediaImageAtCaret(state: import('@codemirror/state').EditorState) {
    const next = figureAtImage(state.doc.toString(), state.selection.main.head);
    const prev = lastMediaReport;
    const same =
      prev === next ||
      (prev !== null &&
        next !== null &&
        prev.imageFrom === next.imageFrom &&
        prev.imageTo === next.imageTo &&
        (prev.figure?.from ?? null) === (next.figure?.from ?? null) &&
        (prev.figure?.to ?? null) === (next.figure?.to ?? null) &&
        (prev.figure?.caption ?? null) === (next.figure?.caption ?? null) &&
        (prev.figure?.role ?? null) === (next.figure?.role ?? null));
    if (same) return;
    lastMediaReport = next;
    onMediaImageAtCaret?.(next);
  }

  // Overwrite a document span with new text and drop the caret after it, mirroring insertAtCursor's
  // dispatch shape. A no-op before the editor mounts, the same guard the other seams carry.
  function replaceRange(from: number, to: number, text: string) {
    if (!view) return;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    view.focus();
  }

  // Select a document span, focus the surface, and scroll the range into view. The needs-alt notice's
  // jump control calls it to land the author on an image that lacks alt text. A no-op before the
  // editor mounts, the same guard the other seams carry.
  function selectRange(from: number, to: number) {
    if (!view) return;
    view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
    view.focus();
  }

  function insertAtCursor(text: string) {
    if (!view) {
      value = value ? `${value}\n\n${text}` : text;
      return;
    }
    const pos = view.state.selection.main.head;
    const prefix = pos > 0 ? '\n\n' : '';
    const insert = `${prefix}${text}`;
    view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
    view.focus();
  }

  // Run a pure selection transform over the mounted editor: hand it the document and selection,
  // dispatch the document and selection it returns, and put focus back on the surface.
  function transformSelection(transform: (doc: string, from: number, to: number) => FormatResult) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const next = transform(doc, from, to);
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.doc },
      selection: { anchor: next.from, head: next.to },
    });
    view.focus();
  }

  function insertLink(href: string, title: string) {
    if (!view) {
      // The editor has not mounted yet; append the link to the raw value so a pick is never lost,
      // mirroring insertAtCursor's pre-mount fallback.
      const link = insertInlineLink('', 0, 0, href, title).doc;
      value = value ? `${value} ${link}` : link;
      return;
    }
    transformSelection((doc, from, to) => insertInlineLink(doc, from, to, href, title));
  }

  function insertImage(alt: string, ref: string) {
    if (!view) {
      // The editor has not mounted yet; append the image to the raw value so a pick is never lost,
      // mirroring insertLink's pre-mount fallback.
      const image = insertImageFormat('', 0, 0, alt, ref).doc;
      value = value ? `${value} ${image}` : image;
      return;
    }
    transformSelection((doc, from, to) => insertImageFormat(doc, from, to, alt, ref));
  }

  function selectedText(): string {
    if (!view) return '';
    const { from, to } = view.state.selection.main;
    return view.state.sliceDoc(from, to);
  }

  // The caret's viewport coordinates, for the insert popover to anchor itself to the cursor. Null
  // before the editor mounts or when the caret has no measurable position (an unrendered line).
  function caretCoords(): { left: number; right: number; top: number; bottom: number } | null {
    if (!view) return null;
    const rect = view.coordsAtPos(view.state.selection.main.head);
    return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
  }

  // Return focus to the editor surface; the popover calls it on close or Escape. The selection is
  // intact because opening the popover only blurred the editor, it never edited the doc.
  function focusEditor() {
    view?.focus();
  }

  function applyFormat(kind: FormatKind) {
    transformSelection((doc, from, to) => applyMarkdownFormat(doc, from, to, kind));
  }
</script>

<input type="hidden" {name} {value} />

<div bind:this={host}></div>
{#if !mounted}
  <textarea class="textarea min-h-[50vh] w-full font-mono text-sm" bind:value aria-label="Markdown source"></textarea>
{/if}
