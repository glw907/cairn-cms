# Reference

One page per package export subpath. The TypeScript types in `src/lib` are the source of truth, and
the export-coverage gate checks every page against them.

Two gates back these pages. `check:reference` verifies a page documents every export of its subpath.
`check:reference:signatures` goes further for function and const-function exports: it renders each
export's real type through the TypeScript compiler and compares it against the declared `ts`-block
signature on the page, so a signature that drifts from the code fails the build. Copy a declared
signature from the real export type rather than hand-writing it. A page that deliberately summarizes
a large signature (an actions record shown as `Record<string, ...>`, say) names itself in the
`ALLOWLIST` at the top of `scripts/check-reference-signatures.mjs`, keyed `${subpath}#${name}` with a
reason.

- [Core (`@glw907/cairn-cms`)](./core.md): the engine, the adapter and schema contract, render, and the runtime.
- [SvelteKit (`/sveltekit`)](./sveltekit.md): the single-mount `createCairnAdmin` facade, the auth guard, and the per-route factories.
- [The canonical admin mount](./admin-routes.md): the two-file catch-all mount and the composer a site copies.
- [Components (`/components`)](./components.md): the admin Svelte UI.
- [Render authoring (`/render`)](./render.md): the component-authoring toolkit for a component `build()`.
- [Delivery (`/delivery`)](./delivery.md): the public read-model route loaders, the response helpers, and `CairnHead`.
- [Delivery data (`/delivery/data`)](./delivery-data.md): the node-safe pure projections.
- [Media (`/media`)](./media.md): the node-safe media surface: the config normalizer, the manifest functions, the naming and transform-URL helpers, the `media:` codec, and the render resolver.
- [Vite (`/vite`)](./vite.md): the `cairnManifest()` build plugin.
- [Ambient types (`/ambient`)](./ambient.md): the one-line `App.Locals.editor` augmentation for a site's `app.d.ts`.
- [The `cairn-manifest` CLI](./cli-cairn-manifest.md): the manifest regenerate command.
- [The `cairn-doctor` CLI](./doctor.md): the setup preflight that checks a site's local config, Cloudflare account, and GitHub App.
- [Log events](./log-events.md): the structured diagnostic events cairn emits, and their fields.

One page here is not export-keyed, since it documents author-facing markdown syntax rather than a
package subpath:

- [Content authoring syntax](./authoring-syntax.md): the `cairn:` internal-link and `media:` asset
  token schemes an author types in markdown.
