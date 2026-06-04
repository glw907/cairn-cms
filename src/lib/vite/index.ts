// cairn-cms: the cairnManifest Vite plugin (@glw907/cairn-cms/vite). It owns a virtual module that
// runs import.meta.glob over the content dirs inside the app's own Vite graph, builds the manifest
// with the engine builder, and verifies it against the committed file. The verify runs in the
// plugin's buildStart hook through a nested Vite SSR module load, so a drift throws there and fails
// the build as a hard build error, outside the prerender request lifecycle (where handleHttpError
// could downgrade it). The same virtual module in write mode produces the serialized manifest, which
// the cairn-manifest bin uses to regenerate. See the design spec, locked decision 1.
import type { Plugin } from 'vite';

/** Options for {@link cairnManifest}. Paths are app-root-absolute (the form `import.meta.glob` wants),
 *  so they match the build's own resolution. */
export interface CairnManifestOptions {
  /** The module exporting the `cairn` adapter and the parsed `siteConfig`, app-root-absolute. */
  configModule: string;
  /** Per-concept content globs, keyed by concept id, app-root-absolute. */
  content: Record<string, string>;
  /** The committed manifest path, app-root-absolute. Defaults to `/src/content/.cairn/index.json`. */
  manifestPath?: string;
}

const VIRTUAL_ID = 'virtual:cairn-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** The default committed manifest path, app-root-absolute. */
const DEFAULT_MANIFEST_PATH = '/src/content/.cairn/index.json';

/** Build the virtual module source. In verify mode it throws on drift; in write mode it exports the
 *  serialized manifest as `result`. The module runs in the app graph, so its `import.meta.glob`,
 *  package, and `?raw` resolution is the build's own. */
function virtualSource(opts: CairnManifestOptions, mode: 'verify' | 'write'): string {
  const manifestPath = opts.manifestPath ?? DEFAULT_MANIFEST_PATH;
  const globEntries = Object.entries(opts.content)
    .map(
      ([id, pattern]) =>
        `  ${JSON.stringify(id)}: import.meta.glob(${JSON.stringify(pattern)}, { query: '?raw', import: 'default', eager: true }),`,
    )
    .join('\n');
  // In write mode the committed file may not exist yet, so do not import it.
  const committedImport = mode === 'verify' ? `import committed from ${JSON.stringify(manifestPath + '?raw')};` : '';
  const resultExpr =
    mode === 'write' ? 'serializeManifest(built)' : '(verifyManifest(built, committed), "ok")';
  return `
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
import { serializeManifest, verifyManifest } from '@glw907/cairn-cms';
import { cairn, siteConfig } from ${JSON.stringify(opts.configModule)};
${committedImport}
const globs = {
${globEntries}
};
const built = buildSiteManifest(cairn, siteConfig, globs);
export const result = ${resultExpr};
`;
}

/** Evaluate the virtual module in the given mode inside the consumer's own Vite resolution, then
 *  return the module's `result`. It reuses the consumer's loaded config (so `$lib`, the config
 *  module, `import.meta.glob`, and `?raw` resolve exactly as the build does) and strips the
 *  cairnManifest plugin from the nested server's plugin list, so its buildStart never recurses.
 *  This runs at build time and in the bin, never in the request lifecycle. */
async function evalVirtual(
  opts: CairnManifestOptions,
  mode: 'verify' | 'write',
  root: string,
): Promise<string> {
  const { createServer, loadConfigFromFile } = await import('vite');
  // Load the consumer's real Vite config so the nested server inherits SvelteKit's resolution
  // (the $lib alias, the app root, the ?raw and import.meta.glob handling). Drop cairnManifest from
  // it so the nested server's buildStart does not recurse, and add a plugin that serves only the
  // virtual module in the requested mode.
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, root);
  const inlineConfig = loaded?.config ?? {};
  const inheritedPlugins = (inlineConfig.plugins ?? []).filter(
    (p) => !isCairnManifestPlugin(p),
  );
  const server = await createServer({
    ...inlineConfig,
    root,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    plugins: [...inheritedPlugins, cairnVirtualOnly(opts, mode)],
  });
  try {
    const mod = (await server.ssrLoadModule(VIRTUAL_ID)) as { result: string };
    return mod.result;
  } finally {
    await server.close();
  }
}

/** True for any plugin object whose name is the cairnManifest plugin, so the nested server drops it
 *  and cannot recurse into another buildStart. The consumer's plugin list may nest arrays and hold
 *  falsy slots, so guard the shape. */
function isCairnManifestPlugin(p: unknown): boolean {
  return !!p && typeof p === 'object' && 'name' in p && (p as { name?: unknown }).name === 'cairn-manifest';
}

/** Verify the committed manifest against the corpus from a Vite context, throwing on drift. The bin
 *  and the plugin share this; the spike proved it runs cleanly inside the consumer's config. */
export async function verifyManifestFromVite(opts: CairnManifestOptions, root: string): Promise<void> {
  await evalVirtual(opts, 'verify', root);
}

/** Regenerate the serialized manifest from the corpus in a Vite context, sharing the build's
 *  resolution. The cairn-manifest bin (a later task) will call this and write the result. */
export async function buildManifestFromVite(opts: CairnManifestOptions, root: string): Promise<string> {
  return evalVirtual(opts, 'write', root);
}

/** The cairnManifest plugin. It serves the verify virtual module to the app graph and, in
 *  buildStart, evaluates it through a nested Vite SSR load so a manifest drift fails the build. */
export function cairnManifest(opts: CairnManifestOptions): Plugin {
  let root = process.cwd();
  return {
    name: 'cairn-manifest',
    configResolved(config) {
      // Capture the resolved app root so the nested server loads the same config the build did.
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return virtualSource(opts, 'verify');
    },
    async buildStart() {
      try {
        await verifyManifestFromVite(opts, root);
      } catch (err) {
        this.error(err instanceof Error ? err.message : String(err));
      }
    },
  };
}

/** A minimal plugin that serves only the virtual module in one mode, for the nested SSR load. It
 *  carries no buildStart, so the nested server never recurses into the verify. */
function cairnVirtualOnly(opts: CairnManifestOptions, mode: 'verify' | 'write'): Plugin {
  return {
    name: 'cairn-manifest-virtual',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return virtualSource(opts, mode);
    },
  };
}
