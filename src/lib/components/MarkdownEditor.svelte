<!--
@component
The `MarkdownEditor` seam (spec §6, seam 5): a thin wrapper over Carta exposing a bindable value
and a cursor-insert callback. Carta and Shiki are client-only, so the editor mounts after the
component does; until then the hidden field still carries the value so the form submits correctly.
Swapping Carta for a bare CodeMirror editor stays a one-file change.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Carta extensions from the adapter, for the design-accurate preview. */
    plugins?: unknown[];
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
  }

  let { value = $bindable(), name, plugins = [], registerInsert }: Props = $props();

  // Local structural type for the Carta editing surface this seam uses. carta-md re-exports its
  // Svelte components from the package entry, so its `Carta` class is not reachable as a named
  // export under NodeNext; a structural type stays compatible without naming it (the shape
  // legacy/src/lib/editor.ts relied on, verified against carta-md@4.11).
  interface CartaInput {
    getSelection(): { start: number };
    insertAt(position: number, text: string): void;
    update(): boolean;
  }
  interface CartaLike {
    input?: CartaInput;
  }

  let mounted = $state(false);
  // Carta and the MarkdownEditor component load only in the browser, after mount, so the server
  // bundle never pulls in Carta or Shiki (guarded by the carta-boundary test). The component keeps
  // its real type, so `value` stays bindable; the Carta constructor is reached through a cast
  // because the package entry does not surface the class by name.
  let Editor = $state<(typeof import('carta-md'))['MarkdownEditor'] | null>(null);
  let carta = $state<CartaLike | null>(null);

  onMount(async () => {
    const mod = await import('carta-md');
    const CartaCtor = (
      mod as unknown as { Carta: new (options: { extensions?: unknown[]; sanitizer: false }) => CartaLike }
    ).Carta;
    const instance = new CartaCtor({
      extensions: plugins,
      // Sanitization is the site adapter's concern; the seam passes raw markdown through.
      sanitizer: false,
    });
    carta = instance;
    Editor = mod.MarkdownEditor;
    // Insert at the current cursor through carta.input once the editor is mounted; fall back to
    // appending while input is not yet populated (the pre-mount textarea phase).
    registerInsert?.((text: string) => {
      const inp = instance.input;
      if (inp) {
        const pos = inp.getSelection().start;
        const prefix = pos > 0 ? '\n\n' : '';
        inp.insertAt(pos, `${prefix}${text}`);
        inp.update();
      } else {
        value = value ? `${value}\n\n${text}` : text;
      }
    });
    mounted = true;
  });
</script>

<input type="hidden" {name} value={value} />

{#if mounted && Editor && carta}
  {@const EditorComponent = Editor}
  <EditorComponent carta={carta as never} bind:value theme="default" mode="tabs" />
{:else}
  <textarea class="textarea min-h-64 w-full font-mono text-sm" bind:value aria-label="Markdown source"></textarea>
{/if}
