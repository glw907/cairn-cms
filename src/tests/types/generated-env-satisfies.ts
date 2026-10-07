// The compile-only proof that a site's generated Worker `Env` carries every binding cairn requires.
// The `Env` below is the showcase's committed worker-configuration.d.ts, which `wrangler types`
// generates from its wrangler.jsonc and the secret names in a .dev.vars.example file (the command
// is in that file's header). `npm run check` compiles this file in a site-shaped program
// (./tsconfig.json), so a binding the bindings types require and the showcase's config lacks
// fails the check here. Nothing in this file runs.
/// <reference path="../../../examples/showcase/worker-configuration.d.ts" />
import type { CairnPlatformBindings, CairnMediaBindings } from '../../lib/sveltekit/platform-bindings.js';

({}) as Env satisfies CairnPlatformBindings & CairnMediaBindings;
