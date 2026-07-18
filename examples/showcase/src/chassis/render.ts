// The chassis's component-grammar wiring: a theme supplies its own icon set (the concrete glyph
// data) and its own defineComponent() list; this module wires either into the engine's render
// helpers with no theme-specific knowledge of its own. A theme reads makeIconRenderer, never
// iconSpan/glyph directly, so re-skinning the icon SET (swapping the glyph data passed in) never
// touches a component's build() function. It also holds the prose-typography seam: a
// createRenderer remarkPlugins entry a theme composes in once, so every render call inherits it.
import { glyph, type IconSet } from '@glw907/cairn-cms';
import { iconSpan } from '@glw907/cairn-cms/render';
import type { Element } from 'hast';
import remarkSmartypants from 'remark-smartypants';
import type { PluggableList } from 'unified';

/**
 * Wires a theme's icon set into the engine's glyph-rendering helpers, returning a function that
 * looks up one glyph by name and renders it as an inline icon span, with an optional semantic
 * role attribute. A theme's defineComponent() build() functions call the returned function; this
 * module never sees which names a theme declares.
 */
export function makeIconRenderer(icons: IconSet): (name: string, role?: string) => Element {
  return (name, role) => iconSpan(glyph(name, icons), role);
}

/**
 * The chassis's prose-typography seam: a `createRenderer` `remarkPlugins` entry that smartens
 * straight quotes into curly ones, `--`/`---` into en/em dashes, and `...` into a real ellipsis.
 * It runs over the mdast tree, before the remark-to-rehype conversion, visiting only text nodes,
 * so inline code, fenced code blocks, and link URLs (held as node attributes, never as text) are
 * structurally exempt, and already-curly input passes through unchanged (it only rewrites
 * straight ASCII marks). A theme wires it once through
 * `createRenderer(registry, { remarkPlugins: proseTypography })`; both the public render and the
 * editor's live preview read the one `renderMarkdown` that composes, so both inherit it.
 */
export const proseTypography: PluggableList = [[remarkSmartypants, { dashes: 'oldschool' }]];
