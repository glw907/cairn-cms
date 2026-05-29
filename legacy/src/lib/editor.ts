// cairn-core: the editor cursor seam (decision P3). The component palette and any later insert
// control talk to MarkdownEditor, never to Carta directly, so a swap to a different editing
// engine is contained to this file. Verified against carta-md@4.11: `input.getSelection()` and
// `input.insertAt(pos, text)` are public on the InputEnhancer.

// Local structural type for the Carta surface this module uses. carta-md is a peerDep and its
// types are erased at runtime, but the carta-boundary test bars any `.ts` file from importing
// `carta-md` (C4 bundle guard). A structural type avoids that import while remaining compatible.
interface CartaInput {
  getSelection(): { start: number; end: number; direction: string; slice: string };
  insertAt(position: number, text: string): void;
}

interface CartaLike {
  input?: CartaInput;
}

/** The programmatic editing surface the admin relies on. */
export interface MarkdownEditor {
  /** Insert a component or template at the current cursor position. */
  insertComponent(template: string): void;
}

/**
 * Wrap a Carta instance as a MarkdownEditor. Takes a getter (not the instance) because the
 * EditPage component creates the Carta instance once and `carta.input` is only populated after
 * the editor mounts; reading it lazily at call time avoids capturing an undefined `input`.
 */
export function cartaEditor(getCarta: () => CartaLike): MarkdownEditor {
  return {
    insertComponent(template) {
      const input = getCarta().input;
      if (!input) return; // editor not mounted yet; nothing to insert into
      const { start } = input.getSelection();
      input.insertAt(start, template);
    },
  };
}
