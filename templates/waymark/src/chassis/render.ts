// The chassis's component-grammar wiring: a theme supplies its own icon set (the concrete glyph
// data) and its own defineComponent() list; this module wires either into the engine's render
// helpers with no theme-specific knowledge of its own. A theme reads makeIconRenderer, never
// renderGlyph directly, so re-skinning the icon SET (swapping the glyph data passed in) never
// touches a component's build() function. It also holds the prose-typography seam: a
// createRenderer remarkPlugins entry a theme composes in once, so every render call inherits it.
import { renderGlyph, type IconSet } from '@glw907/cairn-cms';
import type { Element, ElementContent } from 'hast';
import { h } from 'hastscript';
import remarkSmartypants from 'remark-smartypants';
import type { PluggableList } from 'unified';

/**
 * Wires a theme's icon set into the engine's glyph-rendering helper, returning a function that
 * looks up one glyph by name and renders it as an inline icon span, with an optional semantic
 * role attribute. A theme's defineComponent() build() functions call the returned function; this
 * module never sees which names a theme declares.
 */
export function makeIconRenderer(icons: IconSet): (name: string, role?: string) => Element {
  return (name, role) => {
    const className =
      role === 'secondary' ? ['cairn-icon', 'cairn-icon-secondary'] : ['cairn-icon'];
    return h('span', { className }, [renderGlyph(name, icons)]);
  };
}

/**
 * Card head row: `<div class="cairn-head">[icon]<hN class="cairn-head-title">{title}</hN></div>`. Pass
 * the title's inline children, an optional pre-built icon element, and an optional heading level
 * (default 2). A titled component's build() (the alert directive is the one call site) calls this
 * rather than rebuilding the icon-plus-heading shape by hand.
 */
export function headRow(title: ElementContent[], icon?: Element, level: number = 2): Element {
  const children: ElementContent[] = [];
  if (icon) children.push(icon);
  children.push(h(`h${level}`, { className: ['cairn-head-title'] }, title));
  return h('div', { className: ['cairn-head'] }, children);
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
