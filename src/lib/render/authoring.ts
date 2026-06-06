// cairn-cms: the component-authoring toolkit (@glw907/cairn-cms/render). A site authoring components
// through build(ctx) reaches for these hast builders and the string-attribute reader. Curated on
// purpose: the internal hast helpers (strProp, markFirstList, dataAttrProp) stay internal, and
// rehypeDispatch is deliberately omitted (createRenderer is the one public render pipeline).
export { iconSpan, cardShell, headRow, isElement, strAttr } from './rehype-dispatch.js';
export type { MakeIcon } from './rehype-dispatch.js';
export type { ComponentContext } from './registry.js';
