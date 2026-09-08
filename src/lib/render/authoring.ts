// cairn-cms: the component-authoring subpath (@glw907/cairn-cms/render). It is type-only: a
// component's build(ctx) types its parameter with ComponentContext, the shape every registered
// component's build receives. The hast-building helpers this subpath used to re-export are
// re-homed to site-owned code (a component's build has no dependency on the engine beyond the
// context shape it reads, and constructs its own hast directly with hastscript's h()).
export type { ComponentContext } from './registry.js';
