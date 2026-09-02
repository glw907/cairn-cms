// cairn-cms: the component-authoring toolkit (@glw907/cairn-cms/render). A site authoring components
// through build(ctx) reaches for these hast builders; ctx.attr(key) is the string-attribute reader,
// carried on the context itself. Curated on purpose: the internal hast helpers (strProp,
// markFirstList, dataAttrProp) stay internal, and rehypeDispatch is deliberately omitted
// (createRenderer is the one public render pipeline).
// Anything proposed here must be a helper a component's own build(ctx) calls to construct or read
// hast; the render pipeline entry itself (createRenderer) lives on the root barrel, not here, since
// a site calls it once to build its renderer, never from inside a component.
export { iconSpan, cardShell, headRow } from './rehype-dispatch.js';
// Canonical home `.`; a recorded R4 re-export here because a component's `build(ctx)` holds one
// while calling every helper above and typing its own builder's parameter with it.
export type { ComponentContext } from './registry.js';
