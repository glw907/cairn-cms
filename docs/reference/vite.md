# Vite (`@glw907/cairn-cms/vite`)

This subpath holds the build-time manifest plugin. The `cairnManifest()` plugin evaluates a site's
content corpus through the build's own Vite resolution, verifies the committed manifest against it on
every build, and fails the build on drift. Import it in your `vite.config.ts`. The write, verify, and
derive machinery the plugin shares with the [`cairn-manifest`](./cli-cairn-manifest.md) and
`cairn-doctor` bins is not public surface: every real caller (both bins and their unit tests) reaches
it by relative import, never through this subpath, so it stays an internal implementation detail.

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
after `sveltekit()`. The showcase wires it in its `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    cairnManifest({
      configModule: '/src/theme/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

To regenerate the manifest after editing content, run the [`cairn-manifest`](./cli-cairn-manifest.md)
CLI, which pairs with this plugin.

## `CairnManifestOptions`

Stability tier: Extension API.

```ts
interface CairnManifestOptions {
  configModule: string;
  content: Record<string, string>;
  manifestPath?: string;
}
```

The plugin's options. Every path is app-root-absolute, the form `import.meta.glob` wants, so it
matches the build's own resolution.

- `configModule` is the module that exports the `cairn` adapter and the parsed `siteConfig`.
- `content` maps each concept id to its content glob.
- `manifestPath` is where the committed manifest lives. It defaults to
  `/src/content/.cairn/index.json`.
