// Composes the registered directive blocks: the chassis vocabulary (vocabulary.ts) with a theme's
// partial map of replacement `build` functions laid over the defaults. A theme can change how a
// directive renders and nothing about what it is, so the fields, slots, and preview an editor sees
// never depend on the theme.
import type { BlockContext, IconSet } from '@glw907/cairn-cms';
import type { Element } from 'hast';
import { makeIconRenderer } from '../render.js';
import { vocabulary, type DirectiveName } from './vocabulary.js';

/** A theme's replacement for one directive's `build`; same signature as the default. */
export type DirectiveRenderer = (ctx: BlockContext) => Element;

/** A theme's renderer map: any subset of the vocabulary's directive names. */
export type DirectiveRenderers = Partial<Record<DirectiveName, DirectiveRenderer>>;

/**
 * The nine registered blocks, in registration order, over a theme's icon set. Each renderer in
 * `renderers` replaces the `build` of the block it is keyed by and nothing else. A key outside the
 * vocabulary throws, naming it, so a misspelled or removed directive fails the build instead of
 * silently rendering the default.
 */
export function composeBlocks(icons: IconSet, renderers: DirectiveRenderers) {
  for (const key of Object.keys(renderers)) {
    if (!(key in vocabulary)) {
      throw new Error(
        `cairn: renderer "${key}" is not a directive in the chassis vocabulary (${Object.keys(vocabulary).join(', ')})`,
      );
    }
  }
  const kit = { icons, makeIcon: makeIconRenderer(icons) };
  return (Object.keys(vocabulary) as DirectiveName[]).map((name) => {
    const block = vocabulary[name](kit);
    return { ...block, build: renderers[name] ?? block.build };
  });
}
