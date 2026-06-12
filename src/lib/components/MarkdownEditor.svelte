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

  onMount(async () => {
    const viewMod = await import('@codemirror/view');
    const stateMod = await import('@codemirror/state');
    const markdownMod = await import('@codemirror/lang-markdown');
    const commandsMod = await import('@codemirror/commands');
    const languageMod = await import('@codemirror/language');
    const autocompleteMod = await import('@codemirror/autocomplete');
    const highlightMod = await import('./editor-highlight.js');
    const modesMod = await import('./editor-modes.js');

    if (!host) return;

    const { EditorView, keymap } = viewMod;
    // Mirror the admin theme into CodeMirror's own dark flag, so its base chrome (the autocomplete
    // tooltip above all) renders dark-on-dark instead of light-on-dark.
    const isDark = host.closest('[data-theme]')?.getAttribute('data-theme')?.includes('dark') ?? false;
    // The directive machinery treatment: rails, not bands. A row at depth N draws every rail
    // 1..N as literal nested brackets: 2px accent bars at x offsets 0-2, 4-6, and 8-10 with 2px
    // of surface between them, stacked as inset box shadows (top layer first, so each bar sits
    // over the spacer and deeper bar beneath it). The alphas step through the per-theme vars in
    // cairn-admin.css; the fallbacks are the light values, so the editor still renders sensibly
    // outside an admin theme wrapper. On a fence line the colon runs, brackets, and {attrs}
    // braces dim to the marker tone while the name and label keep a depth-stepped ink. Leaf and
    // inline directives keep a fixed 8% accent chip; the accent ink holds AA on it (4.75:1
    // light, 5.20:1 dark).
    const railFallbacks = ['72%', '82%', '92%'];
    const railColor = (step: number | 'active', fallback: string) =>
      `color-mix(in oklab, var(--color-accent) var(--cairn-directive-rail-${step}, ${fallback}), transparent)`;
    // With `active`, the row's own (deepest) bar takes the full-strength -active mix and widens
    // 1px, so the caret's container reads at a glance; a bar-width change shifts no text.
    const rails = (depth: number, active = false): string => {
      const layers: string[] = [];
      for (let d = 1; d <= depth; d++) {
        const edge = 4 * d - 2;
        if (d > 1) layers.push(`inset ${edge - 2}px 0 0 0 var(--color-base-100, oklch(99% 0.004 75))`);
        const own = active && d === depth;
        layers.push(
          own
            ? `inset ${edge + 1}px 0 0 0 ${railColor('active', '100%')}`
            : `inset ${edge}px 0 0 0 ${railColor(d, railFallbacks[d - 1] ?? '92%')}`,
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
        // The 50vh floor keeps a short entry reading as a writing surface, and because the
        // contenteditable content area carries the height, a click in the empty space below the
        // text still lands in the editor and focuses it. The 70ch cap with auto margins holds
        // the manuscript to a readable measure, centered in whatever width the card gives it.
        '.cm-content': {
          // The theme roots set --font-editor to the self-hosted iA Writer Mono; the inline
          // fallback keeps the surface monospace outside an admin theme wrapper.
          fontFamily: "var(--font-editor, ui-monospace, monospace)",
          padding: '0.875rem 1.25rem',
          lineHeight: '1.8',
          minHeight: '50vh',
          maxWidth: '70ch',
          margin: '0 auto',
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
        // The gutter: directive rows pad left so the text clears the deepest rail stack. It is
        // static structure (caret-independent), so caret movement shifts no layout.
        '.cm-cairn-directive-fence, .cm-cairn-directive-content': { paddingLeft: '1.25rem' },
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
      },
      { dark: isDark },
    );

    modes = modesMod;
    focusCompartment = new stateMod.Compartment();
    typewriterCompartment = new stateMod.Compartment();

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
          EditorView.contentAttributes.of({ spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' }),
          theme,
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
    if (!mounted || !view || !modes || !focusCompartment || !typewriterCompartment) return;
    view.dispatch({
      effects: [
        focusCompartment.reconfigure(focus ? modes.focusMode() : []),
        typewriterCompartment.reconfigure(typing ? modes.typewriterScroll() : []),
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
