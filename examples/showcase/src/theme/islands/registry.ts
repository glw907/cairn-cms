// The theme's island registry: directive name to live Svelte component. Kept in its own module,
// separate from cairn.config.ts, so the root layout can import just this small map to hydrate
// islands without pulling in the full adapter (the engine renderer, the icon set, the committed
// media manifest, hastscript) into the client bundle. cairn.config.ts imports this same map for
// `rendering.islands`, so the two stay one source of truth; defineAdapter validates it against
// every component that declares `hydrate: true`.
import type { IslandRegistry } from '@glw907/cairn-cms/islands';
import Banner from './Banner.svelte';

export const siteIslands: IslandRegistry = { banner: Banner };
