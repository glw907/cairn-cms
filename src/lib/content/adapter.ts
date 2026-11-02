// cairn-cms: the adapter-authoring helper. A plain `const adapter: CairnAdapter = {...}` annotation
// widens each concept's schema type away and breaks typed reads. defineAdapter captures the adapter
// through a `const` type parameter, so each concept's concrete ConceptSchema<F> survives for the
// full-auto typed reads in createSiteResolver, while still checking the adapter against the contract.
import { defineRegistry } from '../render/registry.js';
import type { KeyedNavLayout } from '../sveltekit/admin-nav.js';
import type { CairnAdapter } from './types.js';

// Fail closed on an inconsistent island registry: a hydrate block with no live component, or a
// registered island with no hydrate block. Either is a wiring mistake the site author should see at
// build time, not a silent forever-fallback. Read-only over the rendering group; imports no runtime.
function assertIslandsConsistent(rendering: CairnAdapter['rendering']): void {
  const islands = rendering.islands ?? {};
  const hydrated = new Set((rendering.blocks ?? []).filter((d) => d.hydrate).map((d) => d.name));
  for (const name of hydrated) {
    if (!(name in islands)) {
      throw new Error(`cairn: block '${name}' declares hydrate but rendering.islands has no entry for it.`);
    }
  }
  for (const name of Object.keys(islands)) {
    if (!hydrated.has(name)) {
      throw new Error(`cairn: rendering.islands has '${name}' but no component declares hydrate for it.`);
    }
  }
}

/**
 * Declare a site's adapter while preserving each concept's concrete schema type for typed reads. The
 * returned type also keeps every optional `CairnAdapter` key the site left unset, so `cairn.aiPosture`
 * reads as optional with no cast, and `editor.navLayout` checks each `screen` against the declared
 * concepts and the engine's screens.
 * @throws When a block declares `hydrate` with no `rendering.islands` entry, when `rendering.islands`
 * holds a name no block hydrates, when `defineRegistry` refuses `rendering.blocks`, or when
 * `rendering` holds a `components` key. A site's build is `vite build`, which does not type-check,
 * so that key would otherwise publish a site with no blocks.
 * @public
 */
export function defineAdapter<const A extends CairnAdapter>(
  adapter: A & {
    /** Admin-experience knobs, narrowed here only to key the sidebar's screens. */
    editor?: {
      /** The whole sidebar, with each `screen` checked against this adapter's `content` keys. */
      navLayout?: KeyedNavLayout<keyof A['content'] & string>;
    };
  },
): A & Omit<CairnAdapter, keyof A> {
  if ('components' in adapter.rendering) {
    throw new Error('cairn: the `components` key under `rendering` is gone. Pass your block definitions as `blocks`, an array.');
  }
  assertIslandsConsistent(adapter.rendering);
  // A reserved block name fails here, at boot, not on the first edit-screen render, which is where
  // the admin builds its registry for a site that hand-writes `render`.
  defineRegistry({ blocks: adapter.rendering.blocks ?? [] });
  // keyof A is unresolved here, so the compiler cannot see the unset keys are simply absent at runtime.
  return adapter as A & Omit<CairnAdapter, keyof A>;
}
