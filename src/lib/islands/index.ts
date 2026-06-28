// cairn-cms islands (@glw907/cairn-cms/islands): the client runtime that mounts a site's live Svelte
// components over the static fallbacks the render pipeline emits. cairn is Svelte-only by design, so this
// mounts with Svelte's own mount()/unmount() directly, with no framework abstraction. A site imports this
// dynamically, gated on a non-empty registry, so a static site never ships it (zero cost when unused).
import { mount, unmount, type Component } from 'svelte';
import type { IslandRegistry } from './types.js';

export type { IslandRegistry } from './types.js';

// The live Svelte instances of the current pass and the observers still waiting to fire, kept module-level
// so the next pass can tear the previous one down. A layout calls hydrateIslands once per navigation, and
// the previous mounts must unmount before the next mount over the same DOM.
let mounted: Record<string, unknown>[] = [];
let observers: IntersectionObserver[] = [];

// Tear down the previous pass: unmount live instances and disconnect observers that never fired. unmount
// runs with outro: false so teardown is synchronous and deterministic on navigation; an island declaring an
// out: transition would otherwise linger and briefly double-render against the next pass's fresh mount.
function teardown(): void {
  for (const o of observers) o.disconnect();
  observers = [];
  for (const instance of mounted) {
    try {
      void unmount(instance, { outro: false });
    } catch {
      // a component that throws on teardown must not block the rest
    }
  }
  mounted = [];
}

// Mount one island over its boundary: parse props (try/catch, a malformed payload leaves the fallback),
// clear the fallback, mount, and on a mount failure restore the fallback so the reader still sees content.
// WATCH: props are trusted to equal the directive's declared scalar attributes (serializeIslandProps emits
// only those). If a directive ever carries an attribute its island does not declare, this forwards it as-is.
function mountIsland(node: Element, Comp: Component<Record<string, unknown>>): void {
  let props: Record<string, unknown>;
  try {
    props = JSON.parse(node.getAttribute('data-cairn-props') ?? '{}') as Record<string, unknown>;
  } catch {
    return;
  }
  const fallback = [...node.childNodes];
  node.replaceChildren();
  try {
    mounted.push(mount(Comp, { target: node as HTMLElement, props }));
  } catch {
    node.replaceChildren(...fallback);
  }
}

// Defer a 'visible' island to first intersection, then mount once and stop observing.
function observeIsland(node: Element, Comp: Component<Record<string, unknown>>): void {
  const observer = new IntersectionObserver((entries, self) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        self.disconnect();
        mountIsland(node, Comp);
      }
    }
  });
  observer.observe(node);
  observers.push(observer);
}

/**
 * Mount each island in `root` (default `document`) over its server-rendered fallback. Call it after each
 *  client-side navigation, once the new DOM is in place (an `afterNavigate` callback): it tears down the
 *  previous pass first, so it is idempotent and leak-free. An eager island (`hydrate: true`) mounts at once;
 *  a `'visible'` island mounts on first intersection. An unknown directive name, a malformed prop payload,
 *  or a component that throws leaves the static fallback in place, so one bad island never breaks the page.
 *  Mount-and-replace clears the fallback, so an island whose fallback holds a focusable control should
 *  restore focus itself; the shipped fallbacks are non-interactive.
 */
export function hydrateIslands(islands: IslandRegistry, root: ParentNode = document): void {
  teardown();
  for (const node of root.querySelectorAll('[data-cairn-island]')) {
    const name = node.getAttribute('data-cairn-island');
    const Comp = name ? islands[name] : undefined;
    if (!Comp) continue;
    if (node.getAttribute('data-cairn-hydrate') === 'visible') observeIsland(node, Comp);
    else mountIsland(node, Comp);
  }
}
