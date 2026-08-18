// cairn-cms: the editing surface's theme polarity follows a later theme change.
//
// CodeMirror carries its own dark flag (`EditorView.darkTheme`), which decides the base chrome the
// admin sheet does not reach: the autocomplete tooltip, the panels, the selection layer.
// MarkdownEditor mirrors the admin theme into it by reading the nearest `[data-theme]` ancestor.
// That read happened once, at mount, and was baked into three theme extensions, so a host that
// flips its theme afterwards (the topbar toggle, or a mounting context's `themeOverride`) was left
// with a light editor inside a dark shell. This file pins the flag to the ancestor's current value
// in both directions.
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { EditorView } from '@codemirror/view';
import ThemedMarkdownEditor from './_ThemedMarkdownEditor.svelte';

/** CodeMirror's own dark flag for the editor mounted in `container`, its public per-view facet. */
function editorIsDark(container: Element): boolean | null {
  const dom = container.querySelector<HTMLElement>('.cm-editor');
  if (!dom) return null;
  return EditorView.findFromDOM(dom)?.state.facet(EditorView.darkTheme) ?? null;
}

describe('MarkdownEditor theme polarity', () => {
  it('mounts with the polarity of the theme root it is under', async () => {
    const screen = render(ThemedMarkdownEditor, { props: { theme: 'cairn-admin-dark' } });
    await expect.poll(() => editorIsDark(screen.container)).toBe(true);
  });

  it('follows the theme root from light to dark without re-mounting', async () => {
    const screen = render(ThemedMarkdownEditor, { props: { theme: 'cairn-admin' } });
    await expect.poll(() => editorIsDark(screen.container)).toBe(false);
    const before = EditorView.findFromDOM(screen.container.querySelector<HTMLElement>('.cm-editor')!);

    await screen.rerender({ theme: 'cairn-admin-dark' });

    await expect.poll(() => editorIsDark(screen.container)).toBe(true);
    // The same view instance, so the doc, the history, and the caret survive the flip. A re-mount
    // would satisfy the polarity assertion above while losing everything the author had.
    expect(EditorView.findFromDOM(screen.container.querySelector<HTMLElement>('.cm-editor')!)).toBe(before);
  });

  it('follows the theme root back from dark to light', async () => {
    const screen = render(ThemedMarkdownEditor, { props: { theme: 'cairn-admin-dark' } });
    await expect.poll(() => editorIsDark(screen.container)).toBe(true);

    await screen.rerender({ theme: 'cairn-admin' });

    await expect.poll(() => editorIsDark(screen.container)).toBe(false);
  });
});
