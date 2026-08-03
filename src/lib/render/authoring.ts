// cairn-cms: the component-authoring toolkit (@glw907/cairn-cms/render). A site authoring components
// through build(ctx) reaches for these hast builders and the string-attribute reader. Curated on
// purpose: the internal hast helpers (strProp, markFirstList, dataAttrProp) stay internal, and
// rehypeDispatch is deliberately omitted (createRenderer is the one public render pipeline).
// Anything proposed here must be a helper a component's own build(ctx) calls to construct or read
// hast; the render pipeline entry itself (createRenderer) lives on the root barrel, not here, since
// a site calls it once to build its renderer, never from inside a component.
export { iconSpan, cardShell, headRow, isElement, strAttr } from './rehype-dispatch.js';
export type { ComponentContext } from './registry.js';
