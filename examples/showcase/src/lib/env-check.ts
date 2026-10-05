// The compile-time check that this site's generated Worker `Env` carries every binding cairn
// requires. `Env` is declared by worker-configuration.d.ts, which `wrangler types` generates from
// wrangler.jsonc and the secret names in .dev.vars.example. A binding the engine needs and the
// config lacks fails `npm run check` here, instead of surfacing as a runtime
// `config.bindings-missing` error. CairnMediaBindings joins the check because this site turns
// media on; a site without media drops it. Nothing in this file runs.
import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';

({}) as Env satisfies CairnPlatformBindings & CairnMediaBindings;
