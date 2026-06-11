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
  import { applyMarkdownFormat, insertInlineLink, type FormatKind } from './markdown-format.js';

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
    /** Receives a `(href, title) => void` that inserts an inline link; the link picker calls it. */
    registerInsertLink?: (insert: (href: string, title: string) => void) => void;
    /** Receives a `(kind) => void` that transforms the current selection; the host's toolbar calls it. */
    registerFormat?: (format: (kind: FormatKind) => void) => void;
    /** Generic CodeMirror completion sources wired into the editor; the link autocomplete is one. The
     *  type is referenced inline so no static `@codemirror/*` import sits in this client-only file. */
    completionSources?: import('@codemirror/autocomplete').CompletionSource[];
  }

  let {
    value = $bindable(),
    name,
    registerInsert,
    registerInsertLink,
    registerFormat,
    completionSources = [],
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let mounted = $state(false);
  // The CodeMirror view, untyped at the runtime boundary because @codemirror/* loads only in the
  // browser. The type-only `import(...)` annotation is erased; the value import is dynamic in onMount,
  // so the server bundle never pulls CodeMirror (guarded by the editor-boundary test).
  let view: import('@codemirror/view').EditorView | null = null;

  onMount(async () => {
    const viewMod = await import('@codemirror/view');
    const stateMod = await import('@codemirror/state');
    const markdownMod = await import('@codemirror/lang-markdown');
    const commandsMod = await import('@codemirror/commands');
    const languageMod = await import('@codemirror/language');
    const autocompleteMod = await import('@codemirror/autocomplete');
    const highlightMod = await import('./editor-highlight.js');

    if (!host) return;

    const { EditorView, keymap } = viewMod;
    const theme = EditorView.theme(
      {
        '&': { backgroundColor: 'var(--color-base-100)', color: 'var(--color-base-content)', fontSize: '0.875rem' },
        '.cm-content': { fontFamily: 'ui-monospace, monospace', padding: '0.75rem', lineHeight: '1.7' },
        '.cm-cursor': { borderLeftColor: 'var(--color-primary)' },
        '&.cm-focused': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
        '.cm-line': { padding: '0' },
        '.cm-cairn-directive-fence': {
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
          color: 'var(--color-accent)',
        },
        '.cm-cairn-directive-leaf': {
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
          color: 'var(--color-accent)',
        },
        '.cm-cairn-directive-inline': {
          backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
          color: 'var(--color-accent)',
        },
      },
      { dark: false },
    );

    view = new EditorView({
      parent: host,
      state: stateMod.EditorState.create({
        doc: value,
        extensions: [
          commandsMod.history(),
          keymap.of([...autocompleteMod.completionKeymap, ...commandsMod.defaultKeymap, ...commandsMod.historyKeymap]),
          markdownMod.markdown(),
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

  function insertLink(href: string, title: string) {
    if (!view) {
      // The editor has not mounted yet; append the link to the raw value so a pick is never lost,
      // mirroring insertAtCursor's pre-mount fallback.
      const link = insertInlineLink('', 0, 0, href, title).doc;
      value = value ? `${value} ${link}` : link;
      return;
    }
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const next = insertInlineLink(doc, from, to, href, title);
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.doc },
      selection: { anchor: next.from, head: next.to },
    });
    view.focus();
  }

  function applyFormat(kind: FormatKind) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const next = applyMarkdownFormat(doc, from, to, kind);
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.doc },
      selection: { anchor: next.from, head: next.to },
    });
    view.focus();
  }
</script>

<input type="hidden" {name} {value} />

<div bind:this={host}></div>
{#if !mounted}
  <textarea class="textarea min-h-64 w-full font-mono text-sm" bind:value aria-label="Markdown source"></textarea>
{/if}
