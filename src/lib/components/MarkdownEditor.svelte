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
  import { applyMarkdownFormat, insertInlineLink, type FormatKind, type FormatResult } from './markdown-format.js';

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
    /** Receives a `(href, title) => void` that inserts an inline link; the link picker calls it. */
    registerInsertLink?: (insert: (href: string, title: string) => void) => void;
    /** Receives a `() => string` returning the selected text; the web link dialog reads it. */
    registerGetSelection?: (get: () => string) => void;
    /** Receives a `(kind) => void` that transforms the current selection; the host's toolbar calls it. */
    registerFormat?: (format: (kind: FormatKind) => void) => void;
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
  }

  let {
    value = $bindable(),
    name,
    registerInsert,
    registerInsertLink,
    registerGetSelection,
    registerFormat,
    completionSources = [],
    focusMode = false,
    typewriter = false,
    surface = 'prose',
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
    const autocompleteMod = await import('@codemirror/autocomplete');
    const highlightMod = await import('./editor-highlight.js');
    const modesMod = await import('./editor-modes.js');
    const foldingMod = await import('./editor-folding.js');

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
        // Container folding lives in a real gutter column now, not an in-text band. The gutter is a
        // fixed-x column left of the content; the chevron is empty at rest and reveals on hovering
        // the gutter cell (the VS Code / Zed / Obsidian standard), forced on when folded or when the
        // caret is inside the container. One rotating chevron in the directive ink; the rails carry
        // depth, so the ink does not restep. The lone gutter's wrapper loses its default background
        // and border so the column blends into the quiet surface.
        '.cm-gutters': { backgroundColor: 'transparent', border: '0', color: 'inherit' },
        '.cm-cairn-fold-gutter': { width: '22px' },
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
        '.cm-cairn-fold-gutter .cm-gutterElement:hover .cm-cairn-fold-btn svg, .cm-cairn-fold-folded svg, .cm-cairn-fold-active svg':
          { opacity: '1' },
        // Folded rotates the single chevron to point right; caret-active takes the stronger ink.
        '.cm-cairn-fold-folded svg': { transform: 'rotate(-90deg)' },
        '.cm-cairn-fold-active': { color: 'var(--cairn-directive-ink-active, oklch(46% 0.16 300))' },
        // A visible focus ring for keyboard users landing on the gutter button.
        '.cm-cairn-fold-btn:focus-visible': {
          outline: '2px solid color-mix(in oklab, var(--color-primary) 70%, transparent)',
          outlineOffset: '-2px',
          borderRadius: '4px',
        },
        // No-hover pointers (touch) cannot reveal on hover, so the chevron is persistent and legible.
        '@media (hover: none)': { '.cm-cairn-fold-btn svg': { opacity: '0.65' } },
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
          EditorView.contentAttributes.of({ spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' }),
          theme,
          surfaceCompartment.of(surface === 'prose' ? proseTheme : markupTheme),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) value = update.state.doc.toString();
          }),
        ],
      }),
    });

    registerInsert?.(insertAtCursor);
    registerInsertLink?.(insertLink);
    registerGetSelection?.(selectedText);
    registerFormat?.(applyFormat);
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

  function selectedText(): string {
    if (!view) return '';
    const { from, to } = view.state.selection.main;
    return view.state.sliceDoc(from, to);
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
