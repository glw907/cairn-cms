// The cairnManifest plugin's two start paths. Under `vite dev` it must regenerate through the dev
// server already running and never create a second Vite server: a nested server carries the site's
// own plugins, and closing it runs their closeServer hooks, where adapter-cloudflare's disposes the
// platform proxy the running dev server shares through a global. Under `vite build` its buildStart
// fires once per build environment, so the nested verify must run once per build, and the nested
// server must drop the adapter's platform-proxy plugin so it starts no proxy of its own. Each case
// drives the real plugin object's hooks against a throwaway site whose `vite` package is a fake that
// counts createServer calls and records each nested server's plugin names, so a nested server
// shows up as a count rather than a real server start.
import { describe, it, expect, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, statSync, utimesSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { ViteDevServer } from 'vite';
import { cairnManifest } from '../../lib/vite/internal.js';
import { formatManifestSummary, manifestExitCode, type ManifestReport } from '../../lib/vite/assemble.js';
import { formatManifest, type ManifestEntry, type ManifestProblem } from '../../lib/content/manifest.js';

const WORKTREE = process.cwd();

function entry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'hello', concept: 'posts', title: 'Hello', permalink: '/posts/hello', draft: false, links: [], ...over };
}

function problem(over: Partial<ManifestProblem> = {}): ManifestProblem {
  return {
    concept: 'posts',
    id: 'hello',
    path: 'src/content/posts/hello.md',
    draft: false,
    errors: { title: 'Title is required' },
    ...over,
  };
}

/** The serialized manifest every fake load regenerates unless a case says otherwise. */
const BUILT = formatManifest({ version: 1, entries: [entry()] });

/** What a write-mode virtual module exports as `result`. */
const writeResult = (manifest = BUILT, problems: ManifestProblem[] = []): string =>
  JSON.stringify({ manifest, problems });

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
};

/** The global the fake `vite` package bumps on every createServer call. */
const COUNTER = '__cairnNestedViteServers';

/** The global the fake `vite` package appends each nested server's flattened plugin names to. */
const NAMES = '__cairnNestedViteServerPlugins';

/** The global the fake `vite` package appends each nested server's virtual-only plugin `config()` result to. */
const CONFIGS = '__cairnNestedViteServerConfigs';

/** The plugin adapter-cloudflare adds through SvelteKit, which starts the platform proxy. */
const ADAPTER_WORKERS = 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module';

// The fake's loaded config mirrors a real site's: sveltekit() is async, so the adapter's plugins
// arrive inside a pending array, beside the cairnManifest plugin itself. Its one nested result stands
// in for each virtual module: the write path parses it, and parseAdapterFacts drops its unknown keys.
const FAKE_VITE = `
async function flat(p) {
  const v = await p;
  return Array.isArray(v) ? (await Promise.all(v.map(flat))).flat() : [v];
}
export async function loadConfigFromFile() {
  return {
    config: {
      plugins: [
        Promise.resolve([{ name: '${ADAPTER_WORKERS}' }, { name: 'vite-plugin-sveltekit-setup' }]),
        { name: 'cairn-manifest' },
      ],
    },
  };
}
export function isRunnableDevEnvironment(env) {
  return typeof env?.runner?.import === 'function';
}
export async function createServer(config) {
  globalThis.${COUNTER} = (globalThis.${COUNTER} ?? 0) + 1;
  const plugins = (await flat(config.plugins)).filter(Boolean);
  (globalThis.${NAMES} ??= []).push(plugins.map((p) => p.name));
  const virtualOnly = plugins.find((p) => p.name === 'cairn-manifest-virtual');
  (globalThis.${CONFIGS} ??= []).push(await virtualOnly?.config?.({}, { command: 'serve', mode: 'development' }));
  return {
    environments: { ssr: { runner: { import: async () => ({ result: ${JSON.stringify(writeResult())} }) } } },
    close: async () => {},
  };
}
`;

const made: string[] = [];

/** A throwaway site whose installed `vite` is the counting fake, with a committed site-facts file. */
function tempSite(): string {
  const dir = mkdtempSync(join(WORKTREE, '.cairn-vite-test-'));
  made.push(dir);
  const viteDir = join(dir, 'node_modules', 'vite');
  mkdirSync(join(viteDir, 'dist', 'node'), { recursive: true });
  mkdirSync(join(dir, 'src', 'content', '.cairn'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'site', type: 'module' }));
  writeFileSync(
    join(viteDir, 'package.json'),
    JSON.stringify({ name: 'vite', type: 'module', exports: { '.': './dist/node/index.js' } }),
  );
  writeFileSync(join(viteDir, 'dist', 'node', 'index.js'), FAKE_VITE);
  writeFileSync(join(dir, 'src', 'content', '.cairn', 'site-facts.json'), '{\n  "version": 1\n}\n');
  return dir;
}

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

afterEach(() => vi.restoreAllMocks());

const manifestPath = (dir: string): string => join(dir, 'src', 'content', '.cairn', 'index.json');

/** Backdate the committed manifest, so a later write shows in its mtime. */
function backdate(dir: string): number {
  utimesSync(manifestPath(dir), 1000, 1000);
  return statSync(manifestPath(dir)).mtimeMs;
}

beforeEach(() => {
  (globalThis as Record<string, unknown>)[COUNTER] = 0;
  (globalThis as Record<string, unknown>)[NAMES] = [];
  (globalThis as Record<string, unknown>)[CONFIGS] = [];
});

const nestedServers = (): unknown => (globalThis as Record<string, unknown>)[COUNTER];
const nestedPluginNames = (): string[][] => (globalThis as Record<string, unknown>)[NAMES] as string[][];
const nestedConfigs = (): unknown[] => (globalThis as Record<string, unknown>)[CONFIGS] as unknown[];

/**
 * A stand-in for the running dev server. With `runnable`, its SSR environment carries a module
 * runner that records each id it imports; without, the environment has no runner. Any call to the
 * deprecated `ssrLoadModule` is recorded too.
 */
function liveServer(
  load: (id: string) => Promise<{ result: string }>,
  runnable = true,
): { server: ViteDevServer; loaded: string[]; ssrLoadModuleCalls: string[] } {
  const loaded: string[] = [];
  const ssrLoadModuleCalls: string[] = [];
  const runner = {
    import: (id: string) => {
      loaded.push(id);
      return load(id);
    },
  };
  const server = {
    environments: { ssr: runnable ? { runner } : {} },
    ssrLoadModule: (id: string) => {
      ssrLoadModuleCalls.push(id);
      return load(id);
    },
  } as unknown as ViteDevServer;
  return { server, loaded, ssrLoadModuleCalls };
}

/** A fake Rollup plugin context recording warn calls and rethrowing error, as buildStart does. */
function fakeContext(): { warn: (m: unknown) => void; error: (m: unknown) => never; warnings: string[] } {
  const warnings: string[] = [];
  const text = (m: unknown): string =>
    typeof m === 'string' ? m : String((m as { message?: string }).message ?? m);
  return {
    warnings,
    warn: (m: unknown) => {
      warnings.push(text(m));
    },
    error: (m: unknown) => {
      throw new Error(text(m));
    },
  };
}

type PluginUnderTest = ReturnType<typeof cairnManifest>;

/** A cairnManifest plugin whose configResolved hook has run for `dir` under `command`. */
function resolvedPlugin(dir: string, command: 'serve' | 'build'): PluginUnderTest {
  const plugin = cairnManifest(OPTS);
  (plugin.configResolved as (c: { root: string; command: string }) => void)({ root: dir, command });
  return plugin;
}

/** Run the plugin's buildStart hook under `ctx`. */
async function buildStart(plugin: PluginUnderTest, ctx: ReturnType<typeof fakeContext>): Promise<void> {
  await (plugin.buildStart as (this: unknown) => Promise<void>).call(ctx);
}

/** Run the plugin's serve-time hooks in Vite's order against `server`, under `ctx`. */
async function serve(dir: string, server: ViteDevServer, ctx: ReturnType<typeof fakeContext>): Promise<void> {
  const plugin = resolvedPlugin(dir, 'serve');
  await (plugin.configureServer as ((s: ViteDevServer) => unknown) | undefined)?.(server);
  await buildStart(plugin, ctx);
}

describe('cairnManifest under vite dev', () => {
  /** A dev server regenerating `manifest` with `problems`, its adapter declaring no facts. */
  const regenerating = (manifest = BUILT, problems: ManifestProblem[] = []): ReturnType<typeof liveServer> =>
    liveServer(async (id) => ({ result: id === 'virtual:cairn-manifest/write' ? writeResult(manifest, problems) : '{}' }));

  it("regenerates the manifest and checks the site facts through the running server's SSR module runner, creating no nested server", async () => {
    const dir = tempSite();
    writeFileSync(manifestPath(dir), BUILT);
    const { server, loaded, ssrLoadModuleCalls } = regenerating();
    const ctx = fakeContext();

    await serve(dir, server, ctx);

    expect(nestedServers()).toBe(0);
    expect(loaded).toEqual(['virtual:cairn-manifest/write', 'virtual:cairn-manifest/adapter-facts']);
    expect(ssrLoadModuleCalls).toEqual([]);
    expect(ctx.warnings).toEqual([]);
  });

  it('writes a stale manifest once, warns one line, and never loads the verify module', async () => {
    const dir = tempSite();
    writeFileSync(manifestPath(dir), formatManifest({ version: 1, entries: [entry({ title: 'Stale' })] }));
    const { server, loaded } = regenerating();
    const ctx = fakeContext();

    await serve(dir, server, ctx);

    expect(readFileSync(manifestPath(dir), 'utf8')).toBe(BUILT);
    expect(ctx.warnings).toEqual(['cairn-manifest: regenerated index.json: 1 entry, 1 changed']);
    expect(loaded).not.toContain('virtual:cairn-manifest');
    expect(nestedServers()).toBe(0);
  });

  it('a second start over the same bytes writes nothing and warns nothing', async () => {
    const dir = tempSite();
    await serve(dir, regenerating().server, fakeContext());
    const mtime = backdate(dir);
    const ctx = fakeContext();

    await serve(dir, regenerating().server, ctx);

    expect(statSync(manifestPath(dir)).mtimeMs).toBe(mtime);
    expect(ctx.warnings).toEqual([]);
  });

  it('watchChange with no second buildStart writes nothing', async () => {
    const dir = tempSite();
    const plugin = resolvedPlugin(dir, 'serve');
    await (plugin.configureServer as (s: ViteDevServer) => unknown)(regenerating().server);
    await buildStart(plugin, fakeContext());
    writeFileSync(manifestPath(dir), 'edited after start');

    (plugin.watchChange as () => void)();

    expect(readFileSync(manifestPath(dir), 'utf8')).toBe('edited after start');
  });

  it('a dev start with a problem starts and names it, even over current bytes', async () => {
    const dir = tempSite();
    writeFileSync(manifestPath(dir), BUILT);
    const ctx = fakeContext();

    await serve(dir, regenerating(BUILT, [problem()]).server, ctx);

    expect(ctx.warnings).toEqual([
      'cairn-manifest: regenerated index.json: 1 entry, 0 changed; 1 invalid: posts/hello: title: Title is required',
    ]);
  });

  describe('an invalid published entry', () => {
    const STAMP = '2026-08-01T12:00:00.000Z';
    const stamped = (): string =>
      formatManifest({
        version: 1,
        entries: [entry({ publishedAt: STAMP }), entry({ id: 'other', permalink: '/posts/other', publishedAt: STAMP })],
      });
    const builtWithout = formatManifest({ version: 1, entries: [entry({ id: 'other', permalink: '/posts/other' })] });

    it('holds the write, leaves index.json byte-identical, and reports held', async () => {
      const dir = tempSite();
      writeFileSync(manifestPath(dir), stamped());
      const mtime = backdate(dir);
      const ctx = fakeContext();

      await serve(dir, regenerating(builtWithout, [problem()]).server, ctx);

      expect(readFileSync(manifestPath(dir), 'utf8')).toBe(stamped());
      expect(statSync(manifestPath(dir)).mtimeMs).toBe(mtime);
      expect(ctx.warnings).toHaveLength(1);
      expect(ctx.warnings[0]).toMatch(/^cairn-manifest: held index\.json: 2 entries, 0 changed; held, not written: a published entry is invalid/);
      expect(ctx.warnings[0]).toContain('posts/hello');
    });

    it('still writes when the published entry has a dead link and so keeps its row', async () => {
      const dir = tempSite();
      writeFileSync(manifestPath(dir), stamped());
      const built = formatManifest({
        version: 1,
        entries: [entry({ title: 'Renamed' }), entry({ id: 'other', permalink: '/posts/other' })],
      });

      await serve(dir, regenerating(built, [problem({ errors: { body: "cairn: link can't resolve: cairn:x" } })]).server, fakeContext());

      expect(readFileSync(manifestPath(dir), 'utf8')).toContain('Renamed');
    });

    it('still writes when the dropped invalid entry was never published', async () => {
      const dir = tempSite();
      writeFileSync(
        manifestPath(dir),
        formatManifest({ version: 1, entries: [entry({ id: 'other', permalink: '/posts/other', publishedAt: STAMP })] }),
      );
      const ctx = fakeContext();

      await serve(dir, regenerating(builtWithout, [problem()]).server, ctx);

      expect(readFileSync(manifestPath(dir), 'utf8')).toBe(
        formatManifest({ version: 1, entries: [entry({ id: 'other', permalink: '/posts/other', publishedAt: STAMP })] }),
      );
      expect(ctx.warnings[0]).toMatch(/^cairn-manifest: regenerated /);
    });
  });

  it('counts a committed stamped entry as unchanged and keeps its bytes', async () => {
    const dir = tempSite();
    const stamped = formatManifest({ version: 1, entries: [entry({ publishedAt: '2026-08-01T12:00:00.000Z' })] });
    writeFileSync(manifestPath(dir), stamped);
    const mtime = backdate(dir);
    const ctx = fakeContext();

    await serve(dir, regenerating().server, ctx);

    expect(statSync(manifestPath(dir)).mtimeMs).toBe(mtime);
    expect(ctx.warnings).toEqual([]);
  });

  it('warns on a rewrite that changes bytes and no row', async () => {
    const dir = tempSite();
    writeFileSync(manifestPath(dir), JSON.stringify(JSON.parse(BUILT)));
    const ctx = fakeContext();

    await serve(dir, regenerating().server, ctx);

    expect(readFileSync(manifestPath(dir), 'utf8')).toBe(BUILT);
    expect(ctx.warnings).toEqual(['cairn-manifest: regenerated index.json: 1 entry, 0 changed']);
  });

  it.each([
    ['absent', null],
    ['unparseable', 'not json'],
  ])('counts every entry as changed when the committed file is %s', async (_label, committed) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dir = tempSite();
    if (committed !== null) writeFileSync(manifestPath(dir), committed);
    const built = formatManifest({ version: 1, entries: [entry(), entry({ id: 'other', permalink: '/posts/other' })] });
    const ctx = fakeContext();

    await serve(dir, regenerating(built).server, ctx);

    expect(ctx.warnings).toEqual(['cairn-manifest: regenerated index.json: 2 entries, 2 changed']);
  });

  it('a stale site-facts file still fails dev start through this.error', async () => {
    const dir = tempSite();
    const { server } = liveServer(async (id) => ({
      result: id === 'virtual:cairn-manifest/write' ? writeResult() : '{"aiPosture":"decline"}',
    }));

    await expect(serve(dir, server, fakeContext())).rejects.toThrow(/site-facts\.json is stale/);
  });

  it('an error from the load still fails dev start through this.error', async () => {
    const dir = tempSite();
    const { server } = liveServer(async (id) => {
      if (id === 'virtual:cairn-manifest/write') throw new Error('adapter would not load');
      return { result: '{}' };
    });

    await expect(serve(dir, server, fakeContext())).rejects.toThrow(/adapter would not load/);
    expect(nestedServers()).toBe(0);
  });

  it('falls back to the nested server when the SSR environment is not runnable in Node', async () => {
    const dir = tempSite();
    const { server, ssrLoadModuleCalls } = liveServer(async () => ({ result: '{}' }), false);

    await serve(dir, server, fakeContext());

    // One nested server for the manifest regeneration, one for the site-facts check.
    expect(nestedServers()).toBe(2);
    expect(ssrLoadModuleCalls).toEqual([]);
    expect(readFileSync(manifestPath(dir), 'utf8')).toBe(BUILT);
  });
});

describe('formatManifestSummary', () => {
  const report = (problems: ManifestProblem[] = []): ManifestReport => ({
    entries: 15,
    changed: 2,
    written: true,
    problems,
  });

  it('reads the counts alone when no problem exists, omitting an undefined facts clause', () => {
    expect(formatManifestSummary(report())).toBe('index.json: 15 entries, 2 changed');
  });

  it('names one problem after the facts clause', () => {
    expect(formatManifestSummary(report([problem()]), false)).toBe(
      'index.json: 15 entries, 2 changed; site-facts.json unchanged; 1 invalid: posts/hello: title: Title is required',
    );
  });

  it('reads a draft problem as an invalid draft', () => {
    expect(formatManifestSummary(report([problem({ draft: true })]), true)).toBe(
      'index.json: 15 entries, 2 changed; site-facts.json changed; 1 invalid draft: posts/hello: title: Title is required',
    );
  });

  it('shows the first of many problems plus a count, with a clause for each kind', () => {
    const live = Array.from({ length: 40 }, (_, i) => problem({ id: i === 0 ? 'hello' : `p${i}` }));
    const drafts = [problem({ id: 'd1', draft: true }), problem({ id: 'd2', draft: true })];

    expect(formatManifestSummary(report([...drafts, ...live]))).toBe(
      'index.json: 15 entries, 2 changed; 40 invalid: posts/hello: title: Title is required (+39 more); ' +
        '2 invalid drafts: posts/d1: title: Title is required (+1 more)',
    );
  });
});

describe('manifestExitCode', () => {
  const report = (problems: ManifestProblem[]): ManifestReport => ({ entries: 1, changed: 0, written: false, problems });

  it('is 0 with no problem and with only a draft problem', () => {
    expect(manifestExitCode(report([]))).toBe(0);
    expect(manifestExitCode(report([problem({ draft: true })]))).toBe(0);
  });

  it('is 1 when a problem is non-draft', () => {
    expect(manifestExitCode(report([problem({ draft: true }), problem()]))).toBe(1);
  });
});

describe('cairnManifest under vite build', () => {
  it('verifies once per build although buildStart fires for each build environment', async () => {
    const dir = tempSite();
    const plugin = resolvedPlugin(dir, 'build');

    // SvelteKit builds the SSR environment, then the client one, through the same plugin instance.
    await buildStart(plugin, fakeContext());
    await buildStart(plugin, fakeContext());

    // One nested server for the manifest verify, one for the site-facts check, for the whole build.
    expect(nestedServers()).toBe(2);
  });

  it('verifies again after a watch-mode change', async () => {
    const dir = tempSite();
    const plugin = resolvedPlugin(dir, 'build');

    await buildStart(plugin, fakeContext());
    (plugin.watchChange as () => void)();
    await buildStart(plugin, fakeContext());

    expect(nestedServers()).toBe(4);
  });

  it("drops adapter-cloudflare's platform-proxy plugin and the cairnManifest plugin from each nested server", async () => {
    const dir = tempSite();

    await buildStart(resolvedPlugin(dir, 'build'), fakeContext());

    expect(nestedPluginNames()).toHaveLength(2);
    for (const names of nestedPluginNames()) {
      expect(names).not.toContain(ADAPTER_WORKERS);
      expect(names).not.toContain('cairn-manifest');
      expect(names).toContain('vite-plugin-sveltekit-setup');
    }
  });
});

describe('cairnManifest ssr.noExternal', () => {
  const NO_EXTERNAL = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'];
  type ConfigHook = (
    c: object,
    env: { command: string; mode: string },
  ) => Promise<Record<string, unknown> | undefined>;
  const configOf = (c: object): Promise<Record<string, unknown> | undefined> =>
    (cairnManifest(OPTS).config as ConfigHook)(c, { command: 'serve', mode: 'development' });

  it('returns both engine packages beside the dev-build define', async () => {
    const result = await configOf({});

    expect(result).toMatchObject({ ssr: { noExternal: NO_EXTERNAL }, define: { __CAIRN_DEV_BUILD__: 'true' } });
  });

  it('keeps a site-set define as the winner and still returns the packages', async () => {
    const result = await configOf({ define: { __CAIRN_DEV_BUILD__: 'false' } });

    expect(result).toEqual({ ssr: { noExternal: NO_EXTERNAL } });
  });

  it('hands the packages to each nested verify server through the virtual-only plugin', async () => {
    await buildStart(resolvedPlugin(tempSite(), 'build'), fakeContext());

    expect(nestedConfigs()).toEqual([{ ssr: { noExternal: NO_EXTERNAL } }, { ssr: { noExternal: NO_EXTERNAL } }]);
  });
});
