// cairn-cms: the cairnManifest Vite plugin and its shared write/verify/derive machinery. This
// module is NOT the public `/vite` entry (that is `./index.ts`, which re-exports only `cairnManifest`
// and `CairnManifestOptions`); it is the plugin's own implementation plus the lower-level functions
// the cairn-manifest bin and its unit tests import by relative path, unreachable
// from the package's `@glw907/cairn-cms/vite` subpath. It owns a virtual module that runs
// import.meta.glob over the content dirs inside the app's own Vite graph, builds the manifest with
// the engine builder, and verifies it against the committed file. The verify runs in the plugin's
// buildStart hook through a nested Vite SSR module load, so a drift throws there and fails the build
// as a hard build error, outside the prerender request lifecycle (where handleHttpError could
// downgrade it). The same virtual module in write mode produces the serialized manifest, which the
// cairn-manifest bin uses to regenerate. See the design spec, locked decision 1.
import type { Plugin, PluginOption } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveViteRoot } from './resolve-root.js';
import { parseManifest, formatManifest } from '../content/manifest.js';
import type { RolesDeclaration } from '../auth/roles.js';
import type { AiPosture } from '../content/types.js';

/**
 * The key the cairnManifest plugin stashes its options under, so the write path can read them off the
 *  plugin instance in the consumer's loaded config without re-parsing the config file.
 */
const CAIRN_OPTIONS = Symbol.for('cairn-cms.manifest-options');

/** A cairnManifest plugin instance with its options stashed for the write path to read. */
type CairnManifestPlugin = Plugin & { [CAIRN_OPTIONS]?: CairnManifestOptions };

/**
 * Options for {@link cairnManifest}. Paths are app-root-absolute (the form `import.meta.glob` wants),
 *  so they match the build's own resolution.
 */
export interface CairnManifestOptions {
  /** The module exporting the `cairn` adapter and the parsed `siteConfig`, app-root-absolute. */
  configModule: string;
  /** Per-concept content globs, keyed by concept id, app-root-absolute. */
  content: Record<string, string>;
  /** The committed manifest path, app-root-absolute. Defaults to `/src/content/.cairn/index.json`. */
  manifestPath?: string;
  /** The committed site-facts path, app-root-absolute. Defaults to `/src/content/.cairn/site-facts.json`. */
  siteFactsPath?: string;
}

const VIRTUAL_ID = 'virtual:cairn-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** The default committed manifest path, app-root-absolute. */
const DEFAULT_MANIFEST_PATH = '/src/content/.cairn/index.json';

/** The default committed site-facts path, app-root-absolute. */
const DEFAULT_SITE_FACTS_PATH = '/src/content/.cairn/site-facts.json';

/**
 * Build the virtual module source. In verify mode it throws on drift; in write mode it exports the
 *  serialized manifest as `result`. The module runs in the app graph, so its `import.meta.glob`,
 *  package, and `?raw` resolution is the build's own.
 */
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
  // In verify mode, run verifyReferences after verifyManifest, inside the generated source where the
  // built manifest is in scope. References have no prerender backstop, so this build gate is their only
  // integrity authority; it cannot move to the verifyManifestFromVite TS call site, where `built` does
  // not exist (it lives only in this evaluated string).
  const resultExpr =
    mode === 'write'
      ? 'formatManifest(built)'
      : '(verifyManifest(built, committed), verifyReferences(built), "ok")';
  return `
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
import { formatManifest, verifyManifest, verifyReferences } from '@glw907/cairn-cms';
import { cairn, siteConfig } from ${JSON.stringify(opts.configModule)};
${committedImport}
const globs = {
${globEntries}
};
const built = buildSiteManifest(cairn, siteConfig, globs);
export const result = ${resultExpr};
`;
}

/**
 * Evaluate a virtual module source inside the consumer's own Vite resolution, then return the
 *  module's `result`. It reuses the consumer's loaded config (so `$lib`, the config module,
 *  `import.meta.glob`, and `?raw` resolve exactly as the build does) and strips the cairnManifest
 *  plugin from the nested server's plugin list, so its buildStart never recurses. This runs at
 *  build time and in the bins, never in the request lifecycle.
 */
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

/**
 * True for any plugin object whose name is the cairnManifest plugin, so the nested server drops it
 *  and cannot recurse into another buildStart. The consumer's plugin list may nest arrays and hold
 *  falsy slots, so guard the shape.
 */
function isCairnManifestPlugin(p: unknown): boolean {
  return !!p && typeof p === 'object' && 'name' in p && (p as { name?: unknown }).name === 'cairn-manifest';
}

/**
 * Flatten the consumer's plugins option and drop the cairnManifest plugin at any nesting depth, so
 *  the nested verify server can never re-enter its buildStart. Vite supports (and flattens) nested
 *  plugin arrays, and findCairnOptions recurses into them, so a flat single-level filter would miss a
 *  cairnManifest nested inside a shared preset's sub-array and let it survive into the nested server.
 *  This mirrors findCairnOptions's recursion. Falsy slots pass through, which Vite tolerates.
 */
export function stripCairnManifest(plugins: PluginOption | PluginOption[]): PluginOption[] {
  if (Array.isArray(plugins)) return plugins.flatMap(stripCairnManifest);
  if (isCairnManifestPlugin(plugins)) return [];
  return [plugins];
}

/**
 * Verify the committed manifest against the corpus from a Vite context, throwing on drift. The bin
 *  and the plugin share this; the spike proved it runs cleanly inside the consumer's config.
 */
export async function verifyManifestFromVite(opts: CairnManifestOptions, root: string): Promise<void> {
  await evalVirtual(virtualSource(opts, 'verify'), root);
}

/**
 * Regenerate the serialized manifest from the corpus in a Vite context, sharing the build's
 *  resolution. The cairn-manifest bin (a later task) will call this and write the result.
 */
export async function buildManifestFromVite(opts: CairnManifestOptions, root: string): Promise<string> {
  return evalVirtual(virtualSource(opts, 'write'), root);
}

/** The configured site-facts path, app-root-relative (no leading slash), for joining and display. */
function siteFactsRelPath(opts: CairnManifestOptions): string {
  return (opts.siteFactsPath ?? DEFAULT_SITE_FACTS_PATH).replace(/^\//, '');
}

/**
 * The cairnManifest plugin. It serves the verify virtual module to the app graph and, in
 *  buildStart, evaluates it through a nested Vite SSR load so a manifest drift fails the build.
 */
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
      const siteFacts = await checkSiteFacts(opts, root);
      if (siteFacts.status === 'absent') {
        this.warn(siteFactsAbsentWarning(siteFactsRelPath(opts)));
      } else if (siteFacts.status === 'stale') {
        this.error(siteFacts.message);
      }
    },
  };
  // Stash the options on the instance so the cairn-manifest bin's writeManifest can read the content
  // globs, config module, and manifest path off the plugin in the consumer's loaded config, sharing
  // exactly the options the build verifies with.
  plugin[CAIRN_OPTIONS] = opts;
  return plugin;
}

/**
 * Locate the consumer's Vite config from `cwd` and pair the cairnManifest options it wires with the
 *  authoritative Vite root, so a configured `root` or a non-root cwd resolves identically for every
 *  bin write.
 * @throws When no Vite config is found, or the one found wires no cairnManifest plugin.
 */
async function loadCairnBuild(cwd: string): Promise<{ opts: CairnManifestOptions; root: string }> {
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
  return { opts, root: resolveViteRoot(loaded, cwd) };
}

/**
 * Regenerate the committed manifest from the consumer's corpus and write it to the configured
 *  manifestPath under the Vite root {@link loadCairnBuild} derives, evaluating the write-mode
 *  virtual module through the build's own resolution. The cairn-manifest bin calls this; it is
 *  exported so the write logic is testable apart from the CLI shell.
 */
export async function writeManifest(cwd: string = process.cwd()): Promise<void> {
  const { opts, root } = await loadCairnBuild(cwd);
  const serialized = await buildManifestFromVite(opts, root);
  const manifestPath = opts.manifestPath ?? DEFAULT_MANIFEST_PATH;
  // The manifest path is app-root-absolute (a leading slash relative to the project), so resolve it
  // against the Vite root, not the filesystem root or the config-search cwd.
  const outPath = join(root, manifestPath.replace(/^\//, ''));
  // The rebuild derives every row from a content file, and publishedAt is manifest-owned, so merge
  // the committed stamps back in before writing. Without this, regenerating would clear every one.
  const committed = await readFile(outPath, 'utf8').catch(() => null);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, carryPublishStamps(serialized, committed));
}

/**
 * Regenerate the committed `site-facts.json` from the consumer's adapter and write it to the
 *  configured siteFactsPath, sharing the manifest bin's config discovery and root derivation so
 *  the file always tracks the exact adapter the build verifies against.
 */
export async function writeSiteFacts(cwd: string = process.cwd()): Promise<void> {
  const { opts, root } = await loadCairnBuild(cwd);
  const serialized = await buildSiteFactsFromVite(opts, root);
  const outPath = join(root, siteFactsRelPath(opts));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, serialized);
}

/**
 * Merge the committed manifest's first-publish stamps into a freshly built one, matched on concept
 *  and id, and return the canonical serialized result. `committedRaw` is the file's current contents,
 *  or null when none exists yet.
 *
 * Only `publishedAt` carries over, and only onto an entry the rebuild still produces, so a deleted
 *  entry's stamp does not come back. A committed file that will not parse degrades to the built
 *  output with a warning rather than throwing: regenerating is how a site repairs a corrupt manifest,
 *  so throwing here would leave it with no way out.
 */
export function carryPublishStamps(builtSerialized: string, committedRaw: string | null): string {
  if (committedRaw === null) return builtSerialized;
  const stamps = new Map<string, string>();
  try {
    for (const e of parseManifest(committedRaw).entries) {
      if (e.publishedAt) stamps.set(`${e.concept}/${e.id}`, e.publishedAt);
    }
  } catch {
    console.warn(
      'cairn-manifest: the committed manifest could not be read, so publish stamps were not carried forward.',
    );
    return builtSerialized;
  }
  if (stamps.size === 0) return builtSerialized;
  const built = parseManifest(builtSerialized);
  return formatManifest({
    version: 1,
    entries: built.entries.map((e) => {
      const publishedAt = stamps.get(`${e.concept}/${e.id}`);
      return publishedAt ? { ...e, publishedAt } : e;
    }),
  });
}

/**
 * Walk a Vite plugins option (which may nest arrays, hold falsy slots, or be a thenable) and return
 *  the stashed cairnManifest options from the first matching plugin, or null if there is none.
 */
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

/**
 * A minimal plugin that serves only the given virtual module source, for the nested SSR load. It
 *  carries no buildStart, so the nested server never recurses into the verify.
 */
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

/** The facts the site-facts writer derives off the consumer's adapter. */
export interface AdapterFacts {
  /**
   * `cairn.media.bucketBinding`, the media R2 binding name; undefined when the adapter declares no
   *  media.
   */
  mediaBucketBinding?: string;
  /** `cairn.roles`, the site's declared role vocabulary; undefined for a zero-config site. */
  roles?: RolesDeclaration;
  /**
   * `cairn.aiPosture`, the site's stated stance toward AI training crawlers; undefined when the
   *  site states no posture.
   */
  aiPosture?: AiPosture;
}

/**
 * Build the virtual module that reads only the adapter facts {@link AdapterFacts} carries. It
 *  imports the configured config module and exports the media `bucketBinding`, `roles`, and
 *  `aiPosture` as JSON, so nothing else of the adapter (least of all a secret) crosses the
 *  boundary.
 */
function adapterFactsSource(opts: CairnManifestOptions): string {
  return `
import { cairn } from ${JSON.stringify(opts.configModule)};
const media = cairn?.media ?? {};
const roles = cairn?.roles;
const aiPosture = cairn?.aiPosture;
const facts = {};
if (typeof media.bucketBinding === 'string') facts.mediaBucketBinding = media.bucketBinding;
if (roles && typeof roles === 'object') facts.roles = roles;
if (typeof aiPosture === 'string') facts.aiPosture = aiPosture;
export const result = JSON.stringify(facts);
`;
}

/**
 * Validate the JSON an evaluated `adapterFactsSource` module exports into the typed
 *  {@link AdapterFacts} shape, dropping any field of the wrong runtime type. Shared by
 *  {@link readAdapterFacts} and {@link buildSiteFactsFromVite}, so the two callers never
 *  re-derive the same field-by-field validation.
 */
function parseAdapterFacts(raw: string): AdapterFacts {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const facts: AdapterFacts = {};
  if (typeof parsed.mediaBucketBinding === 'string') facts.mediaBucketBinding = parsed.mediaBucketBinding;
  if (parsed.roles !== undefined && typeof parsed.roles === 'object' && parsed.roles !== null) {
    facts.roles = parsed.roles as RolesDeclaration;
  }
  if (parsed.aiPosture === 'invite' || parsed.aiPosture === 'decline') {
    facts.aiPosture = parsed.aiPosture;
  }
  return facts;
}

/**
 * Read the media bucket binding, role vocabulary, and AI posture off the consumer's adapter by
 *  evaluating a tiny virtual module through the consumer's own Vite resolution, the same
 *  machinery the cairn-manifest bin uses. Kept as an `internal.js`-only entry point for tooling
 *  built directly against this module; the site-facts write path (`buildSiteFactsFromVite`)
 *  shares its evaluation machinery but calls it independently. Derivation is best-effort: any
 *  failure (no Vite config, no cairnManifest plugin, a config module that throws) returns null.
 *  This runs only on the bin path, never in a Worker.
 */
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
    return parseAdapterFacts(await evalVirtual(adapterFactsSource(opts), cwd));
  } catch {
    return null;
  }
}

/**
 * Serialize the `site-facts.json` contract deterministically: `version` first, each of the three
 *  adapter-derived fields omitted when the adapter declares none rather than written as null, one
 *  stable key order, one trailing newline, so the build-time verify compares byte-for-byte with no
 *  normalization. `owner`, `repo`, and `from` are never accepted here: the file carries only what a
 *  Go process (which cannot evaluate a site's adapter) needs.
 */
export function formatSiteFacts(facts: AdapterFacts): string {
  const out: { version: 1; mediaBucketBinding?: string; roles?: RolesDeclaration; aiPosture?: AiPosture } = {
    version: 1,
  };
  if (facts.mediaBucketBinding !== undefined) out.mediaBucketBinding = facts.mediaBucketBinding;
  if (facts.roles !== undefined) out.roles = facts.roles;
  if (facts.aiPosture !== undefined) out.aiPosture = facts.aiPosture;
  return `${JSON.stringify(out, null, 2)}\n`;
}

/**
 * Derive the current `site-facts.json` contents from the consumer's adapter, evaluated through the
 *  build's own Vite resolution. Shares `adapterFactsSource` and its validation with
 *  {@link readAdapterFacts}; never re-derives the three fields independently.
 */
export async function buildSiteFactsFromVite(opts: CairnManifestOptions, root: string): Promise<string> {
  const facts = parseAdapterFacts(await evalVirtual(adapterFactsSource(opts), root));
  return formatSiteFacts(facts);
}

/**
 * Build the build-log warning `checkSiteFacts` reports once when the committed file at `path` (the
 *  configured `siteFactsPath`, app-root-relative for display) does not exist yet.
 */
export function siteFactsAbsentWarning(path: string): string {
  return `cairn-cms: ${path} is missing. Run \`npx cairn-manifest\` to create it.`;
}

/** The three outcomes {@link checkSiteFacts} distinguishes: current, not yet created, or drifted. */
export type SiteFactsCheck = { status: 'ok' } | { status: 'absent' } | { status: 'stale'; message: string };

/**
 * Check the committed `site-facts.json` against the adapter, without importing the committed file
 *  into the app graph (unlike the manifest's `?raw` import, which would throw at buildStart on
 *  every site that has not yet run the bin). An absent file is not drift: no site commits one until
 *  it runs `cairn-manifest`, and no site's `build` script runs that bin, so a fresh install or an
 *  upgrading consumer must still build. A present file that no longer matches the adapter is drift
 *  and fails the build in the manifest's own shape. A derivation failure (the adapter throwing for a
 *  reason unrelated to these three fields) degrades to `ok` rather than reporting stale, the same
 *  best-effort contract `readAdapterFacts` already keeps: the manifest verify immediately before this
 *  check already evaluates the same config module and is the build's real gate on an adapter that
 *  cannot load at all, so failing this specific comparison for an unrelated reason would be a false
 *  positive, not a real site-facts drift.
 */
export async function checkSiteFacts(opts: CairnManifestOptions, root: string): Promise<SiteFactsCheck> {
  const relPath = siteFactsRelPath(opts);
  const committed = await readFile(join(root, relPath), 'utf8').catch(() => null);
  if (committed === null) return { status: 'absent' };
  let expected: string;
  try {
    expected = await buildSiteFactsFromVite(opts, root);
  } catch {
    return { status: 'ok' };
  }
  if (expected === committed) return { status: 'ok' };
  return {
    status: 'stale',
    message:
      `cairn-cms: ${relPath} is stale: the committed file does not match the adapter.\n` +
      'Run `npx cairn-manifest` and commit the result.',
  };
}
