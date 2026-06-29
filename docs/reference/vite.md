# Vite (`@glw907/cairn-cms/vite`)

This subpath holds the build-time manifest plugin. The `cairnManifest()` plugin evaluates a site's
content corpus through the build's own Vite resolution, verifies the committed manifest against it on
every build, and fails the build on drift. Import it in your `vite.config.ts`. The subpath also
exports the lower-level functions the plugin and the [`cairn-manifest`](./cli-cairn-manifest.md)
CLI call, so the verify and write logic is testable apart from the plugin shell.

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
      configModule: '/src/lib/cairn.config.ts',
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

---

## Lower-level functions

The plugin and the [`cairn-manifest`](./cli-cairn-manifest.md) CLI share these. A site rarely calls
them directly.

### `buildManifestFromVite`

Stability tier: Extension API.

```ts
function buildManifestFromVite(opts: CairnManifestOptions, root: string): Promise<string>;
```

Regenerate the serialized manifest from the corpus in a Vite context, sharing the build's
resolution. It returns the manifest as a string and writes nothing.

### `verifyManifestFromVite`

Stability tier: Extension API.

```ts
function verifyManifestFromVite(opts: CairnManifestOptions, root: string): Promise<void>;
```

Verify the committed manifest against the corpus from a Vite context, throwing on drift. The plugin's
`buildStart` calls this to fail a build whose manifest has gone stale.

### `writeManifest`

Stability tier: Extension API.

```ts
function writeManifest(cwd?: string): Promise<void>;
```

Regenerate the committed manifest from the consumer's corpus and write it to the configured
`manifestPath`. It loads the consumer's Vite config from `cwd`, reads the `cairnManifest` plugin's
options off the instance, evaluates the write-mode virtual module through the build's own resolution,
and writes the result. The `cairn-manifest` bin calls this.

### `stripCairnManifest`

Stability tier: Extension API.

```ts
function stripCairnManifest(plugins: PluginOption | PluginOption[]): PluginOption[];
```

Flatten the consumer's `plugins` option and drop the `cairnManifest` plugin at any nesting depth, so
the nested verify server can never re-enter its own `buildStart`. The verify path uses this when it
spins up a nested Vite server from the consumer's config.

### `readAdapterFacts`

Stability tier: Extension API.

```ts
function readAdapterFacts(cwd?: string): Promise<AdapterFacts | null>;
```

Read the owner, repo, and from-address off the consumer's adapter by evaluating a tiny virtual
module through the consumer's own Vite resolution, the same machinery `writeManifest` uses. The
[`cairn-doctor`](./doctor.md) CLI calls this to derive inputs the operator did not pass. It is
best-effort by design: when the directory has no Vite config, the config wires no `cairnManifest`
plugin, or the adapter module fails to load, it returns `null` instead of throwing. It runs only
on the CLI path, never in a Worker.

### `AdapterFacts`

Stability tier: Extension API.

```ts
interface AdapterFacts {
  owner?: string;
  repo?: string;
  from?: string;
}
```

What `readAdapterFacts` returns: `cairn.backend.owner`, `cairn.backend.repo`, and
`cairn.email.from`, each present only when the adapter declares it as a string.
