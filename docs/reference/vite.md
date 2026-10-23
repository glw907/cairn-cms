# Vite (`@glw907/cairn-cms/vite`)

This subpath holds the build-time manifest plugin. The `cairnManifest()` plugin evaluates a site's
content corpus through the build's Vite resolution, verifies the committed manifest against it on
every build, and fails the build on drift. Import it in your `vite.config.ts`. This subpath
carries the plugin a site wires into its `vite.config.ts`. The write, verify, and
derive machinery the plugin shares with the [`cairn-manifest`](./cli-cairn-manifest.md) bin
is not public surface: a build-time helper that is not itself a Vite plugin stays
internal. Every real caller (the bin and its unit tests) reaches
it by relative import, never through this subpath.

```ts
import { cairnManifest } from '@glw907/cairn-cms/vite';
```

The TypeScript types in `src/lib/vite` are the source of truth, and the export-coverage gate checks
every name here against them.

---

## `cairnManifest`

Stability tier: Extension API.

```ts
function cairnManifest(opts: CairnManifestOptions): Plugin;
```

The build plugin. In `buildStart` it evaluates a verify virtual module through a nested Vite SSR
load, so a manifest that has drifted from the corpus fails the build. Add it to the `plugins` array,
after `sveltekit()`. The showcase wires it in its `vite.config.ts`, alongside its build-time
plugin (`@tailwindcss/vite`) this excerpt omits:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    cairnManifest({
      configModule: '/src/theme/cairn.config.ts',
      content: {
        posts: '/src/content/posts/*.md',
        pages: '/src/content/pages/*.md',
        fragments: '/src/content/fragments/*.md',
      },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

The plugin's `config` hook also defines the global `__CAIRN_DEV_BUILD__`, the build-time half of the
dev-backend gate. It is `true` under `vite dev` and in a build that sets `VITE_CAIRN_E2E=1`, and
`false` in a default build, so a guarded branch and its `@glw907/cairn-cms-dev` import fold out of a
deployed Worker. The flag reads from the process environment and from the `.env` files in the working
directory. A `define` your config or plugin sets for the name wins.

To regenerate the manifest after editing content, run the [`cairn-manifest`](./cli-cairn-manifest.md)
CLI, which pairs with this plugin.

The same `buildStart` hook also verifies [`site-facts.json`](./site-facts.md), the adapter-derived
contract a Go process reads. A missing file only warns; a stale one fails the build the same way a
drifted manifest does.

## `CairnManifestOptions`

Stability tier: Extension API.

```ts
interface CairnManifestOptions {
  configModule: string;
  content: Record<string, string>;
  manifestPath?: string;
  siteFactsPath?: string;
}
```

The plugin's options. Every path is app-root-absolute, the form `import.meta.glob` wants, so it
matches the build's resolution.

- `configModule` is the module that exports the `cairn` adapter and the parsed `siteConfig`.
- `content` maps each concept id to its content glob.
- `manifestPath` is where the committed manifest lives. It defaults to
  `/src/content/.cairn/index.json`.
- `siteFactsPath` is where the committed [`site-facts.json`](./site-facts.md) lives. It defaults
  to `/src/content/.cairn/site-facts.json`.
