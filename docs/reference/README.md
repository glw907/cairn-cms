# Reference

One page per package export subpath. The TypeScript types in `src/lib` are the source of truth, and
the export-coverage gate checks every page against them.

- [Core (`@glw907/cairn-cms`)](./core.md): the engine, the adapter and schema contract, render, and the runtime.
- [SvelteKit (`/sveltekit`)](./sveltekit.md): the server load and action route factories.
- [Components (`/components`)](./components.md): the admin Svelte UI.
- [Render authoring (`/render`)](./render.md): the component-authoring toolkit for a component `build()`.
- [Delivery (`/delivery`)](./delivery.md): the public read-model route loaders, the response helpers, and `CairnHead`.
- [Delivery data (`/delivery/data`)](./delivery-data.md): the node-safe pure projections.
- [Vite (`/vite`)](./vite.md): the `cairnManifest()` build plugin.
- [The `cairn-manifest` CLI](./cli-cairn-manifest.md): the manifest regenerate command.
- [The `cairn-doctor` CLI](./doctor.md): the setup preflight that checks a site's local config, Cloudflare account, and GitHub App.
- [Log events](./log-events.md): the structured diagnostic events cairn emits, and their fields.
