// cairn-cms: the cairnManifest Vite plugin (@glw907/cairn-cms/vite). It owns a virtual module that
// runs import.meta.glob over the content dirs inside the app's own Vite graph, builds the manifest
// with the engine builder, and verifies it against the committed file. The verify runs in the
// plugin's buildStart hook through a nested Vite SSR module load, so a drift throws there and fails
// the build as a hard build error, outside the prerender request lifecycle (where handleHttpError
// could downgrade it). The same virtual module in write mode produces the serialized manifest, which
// the cairn-manifest bin uses to regenerate. See the design spec, locked decision 1.
import type { Plugin, PluginOption } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveViteRoot } from './resolve-root.js';

/** The key the cairnManifest plugin stashes its options under, so the write path can read them off the
 *  plugin instance in the consumer's loaded config without re-parsing the config file. */
const CAIRN_OPTIONS = Symbol.for('cairn-cms.manifest-options');

/** A cairnManifest plugin instance with its options stashed for the write path to read. */
type CairnManifestPlugin = Plugin & { [CAIRN_OPTIONS]?: CairnManifestOptions };

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

/** Evaluate a virtual module source inside the consumer's own Vite resolution, then return the
 *  module's `result`. It reuses the consumer's loaded config (so `$lib`, the config module,
 *  `import.meta.glob`, and `?raw` resolve exactly as the build does) and strips the cairnManifest
 *  plugin from the nested server's plugin list, so its buildStart never recurses. This runs at
 *  build time and in the bins, never in the request lifecycle. */
async function evalVirtual(source: string, root: string): Promise<string> {
  const { createServer, loadConfigFromFile } = await import('vite');
  // Load the consumer's real Vite config so the nested server inherits SvelteKit's resolution
  // (the $lib alias, the app root, the ?raw and import.meta.glob handling). Drop cairnManifest from
  // it so the nested server's buildStart does not recurse, and add a plugin that serves only the
  // given virtual module source.
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, root);
  const inlineConfig = loaded?.config ?? {};
  const server = await createServer({
    ...inlineConfig,
    root,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    plugins: [...stripCairnManifest(inlineConfig.plugins ?? []), cairnVirtualOnly(source)],
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

/** Flatten the consumer's plugins option and drop the cairnManifest plugin at any nesting depth, so
 *  the nested verify server can never re-enter its buildStart. Vite supports (and flattens) nested
 *  plugin arrays, and findCairnOptions recurses into them, so a flat single-level filter would miss a
 *  cairnManifest nested inside a shared preset's sub-array and let it survive into the nested server.
 *  This mirrors findCairnOptions's recursion. Falsy slots pass through, which Vite tolerates. */
export function stripCairnManifest(plugins: PluginOption | PluginOption[]): PluginOption[] {
  if (Array.isArray(plugins)) return plugins.flatMap(stripCairnManifest);
  if (isCairnManifestPlugin(plugins)) return [];
  return [plugins];
}

/** Verify the committed manifest against the corpus from a Vite context, throwing on drift. The bin
 *  and the plugin share this; the spike proved it runs cleanly inside the consumer's config. */
export async function verifyManifestFromVite(opts: CairnManifestOptions, root: string): Promise<void> {
  await evalVirtual(virtualSource(opts, 'verify'), root);
}

/** Regenerate the serialized manifest from the corpus in a Vite context, sharing the build's
 *  resolution. The cairn-manifest bin (a later task) will call this and write the result. */
export async function buildManifestFromVite(opts: CairnManifestOptions, root: string): Promise<string> {
  return evalVirtual(virtualSource(opts, 'write'), root);
}

/** The cairnManifest plugin. It serves the verify virtual module to the app graph and, in
 *  buildStart, evaluates it through a nested Vite SSR load so a manifest drift fails the build. */
export function cairnManifest(opts: CairnManifestOptions): Plugin {
  let root = process.cwd();
  const plugin: CairnManifestPlugin = {
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
  // Stash the options on the instance so the cairn-manifest bin's writeManifest can read the content
  // globs, config module, and manifest path off the plugin in the consumer's loaded config, sharing
  // exactly the options the build verifies with.
  plugin[CAIRN_OPTIONS] = opts;
  return plugin;
}

/** Regenerate the committed manifest from the consumer's corpus and write it to the configured
 *  manifestPath. It searches for the consumer's Vite config from `cwd`, derives the authoritative
 *  Vite root from the loaded config (so a configured `root` or a non-root cwd resolves correctly),
 *  reads the cairnManifest plugin's options off the instance, evaluates the write-mode virtual
 *  module through the build's own resolution, and writes the serialized manifest under the Vite
 *  root. The cairn-manifest bin calls this; it is exported so the write logic is testable apart
 *  from the CLI shell. */
export async function writeManifest(cwd: string = process.cwd()): Promise<void> {
  const { loadConfigFromFile } = await import('vite');
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, cwd);
  if (!loaded) {
    throw new Error(`cairn-manifest: no Vite config found in ${cwd}`);
  }
  const opts = findCairnOptions(loaded.config.plugins);
  if (!opts) {
    throw new Error(
      'cairn-manifest: the Vite config has no cairnManifest() plugin. Add it so the bin shares the build options.',
    );
  }
  const root = resolveViteRoot(loaded, cwd);
  const serialized = await buildManifestFromVite(opts, root);
  const manifestPath = opts.manifestPath ?? DEFAULT_MANIFEST_PATH;
  // The manifest path is app-root-absolute (a leading slash relative to the project), so resolve it
  // against the Vite root, not the filesystem root or the config-search cwd.
  const outPath = join(root, manifestPath.replace(/^\//, ''));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, serialized);
}

/** Walk a Vite plugins option (which may nest arrays, hold falsy slots, or be a thenable) and return
 *  the stashed cairnManifest options from the first matching plugin, or null if there is none. */
function findCairnOptions(plugins: unknown): CairnManifestOptions | null {
  if (!plugins) return null;
  if (Array.isArray(plugins)) {
    for (const p of plugins) {
      const found = findCairnOptions(p);
      if (found) return found;
    }
    return null;
  }
  if (typeof plugins === 'object' && CAIRN_OPTIONS in plugins) {
    return (plugins as CairnManifestPlugin)[CAIRN_OPTIONS] ?? null;
  }
  return null;
}

/** A minimal plugin that serves only the given virtual module source, for the nested SSR load. It
 *  carries no buildStart, so the nested server never recurses into the verify. */
function cairnVirtualOnly(source: string): Plugin {
  return {
    name: 'cairn-manifest-virtual',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return source;
    },
  };
}

/** The repo and sender facts cairn-doctor derives off the consumer's adapter. */
export interface AdapterFacts {
  /** `cairn.backend.owner`. */
  owner?: string;
  /** `cairn.backend.repo`. */
  repo?: string;
  /** `cairn.sender.from`. */
  from?: string;
}

/** Build the virtual module that reads only the adapter facts the doctor derives. It imports the
 *  configured config module and exports the string-typed `owner`, `repo`, and `from` as JSON, so
 *  nothing else of the adapter (least of all a secret) crosses the boundary. */
function adapterFactsSource(opts: CairnManifestOptions): string {
  return `
import { cairn } from ${JSON.stringify(opts.configModule)};
const backend = cairn?.backend ?? {};
const sender = cairn?.sender ?? {};
const facts = {};
if (typeof backend.owner === 'string') facts.owner = backend.owner;
if (typeof backend.repo === 'string') facts.repo = backend.repo;
if (typeof sender.from === 'string') facts.from = sender.from;
export const result = JSON.stringify(facts);
`;
}

/** Read `{ owner, repo, from }` off the consumer's adapter by evaluating a tiny virtual module
 *  through the consumer's own Vite resolution, the same machinery the cairn-manifest bin uses.
 *  cairn-doctor calls this to fill inputs the operator did not pass. Derivation is best-effort:
 *  any failure (no Vite config, no cairnManifest plugin, a config module that throws) returns
 *  null, so the doctor degrades to flags instead of crashing. This runs only on the bin path,
 *  never in a Worker. */
export async function readAdapterFacts(cwd: string = process.cwd()): Promise<AdapterFacts | null> {
  try {
    const { loadConfigFromFile } = await import('vite');
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      undefined,
      cwd,
      'silent',
    );
    if (!loaded) return null;
    const opts = findCairnOptions(loaded.config.plugins);
    if (!opts) return null;
    const parsed = JSON.parse(await evalVirtual(adapterFactsSource(opts), cwd)) as Record<
      string,
      unknown
    >;
    const facts: AdapterFacts = {};
    if (typeof parsed.owner === 'string') facts.owner = parsed.owner;
    if (typeof parsed.repo === 'string') facts.repo = parsed.repo;
    if (typeof parsed.from === 'string') facts.from = parsed.from;
    return facts;
  } catch {
    return null;
  }
}
