// The cairnManifest plugin's two verify paths. Under `vite dev` it must verify through the dev
// server already running and never create a second Vite server: a nested server carries the site's
// own plugins, and closing it runs their closeServer hooks, where adapter-cloudflare's disposes the
// platform proxy the running dev server shares through a global. Under `vite build` its buildStart
// fires once per build environment, so the nested verify must run once per build, and the nested
// server must drop the adapter's platform-proxy plugin so it starts no proxy of its own. Each case
// drives the real plugin object's hooks against a throwaway site whose `vite` package is a fake that
// counts createServer calls and records each nested server's plugin names, so a nested server
// shows up as a count rather than a real server start.
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { ViteDevServer } from 'vite';
import { cairnManifest } from '../../lib/vite/internal.js';

const WORKTREE = process.cwd();

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
  content: { posts: '/src/content/posts/*.md' },
  manifestPath: '/src/content/.cairn/index.json',
  siteFactsPath: '/src/content/.cairn/site-facts.json',
};

/** The global the fake `vite` package bumps on every createServer call. */
const COUNTER = '__cairnNestedViteServers';

/** The global the fake `vite` package appends each nested server's flattened plugin names to. */
const NAMES = '__cairnNestedViteServerPlugins';

/** The plugin adapter-cloudflare adds through SvelteKit, which starts the platform proxy. */
const ADAPTER_WORKERS = 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module';

// The fake's loaded config mirrors a real site's: sveltekit() is async, so the adapter's plugins
// arrive inside a pending array, beside the cairnManifest plugin itself.
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
  (globalThis.${NAMES} ??= []).push((await flat(config.plugins)).filter(Boolean).map((p) => p.name));
  return {
    environments: { ssr: { runner: { import: async () => ({ result: '{}' }) } } },
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

beforeEach(() => {
  (globalThis as Record<string, unknown>)[COUNTER] = 0;
  (globalThis as Record<string, unknown>)[NAMES] = [];
});

const nestedServers = (): unknown => (globalThis as Record<string, unknown>)[COUNTER];
const nestedPluginNames = (): string[][] => (globalThis as Record<string, unknown>)[NAMES] as string[][];

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
  it("verifies the manifest and the site facts through the running server's SSR module runner, creating no nested server", async () => {
    const dir = tempSite();
    const { server, loaded, ssrLoadModuleCalls } = liveServer(async (id) => ({
      result: id === 'virtual:cairn-manifest' ? 'ok' : '{}',
    }));
    const ctx = fakeContext();

    await serve(dir, server, ctx);

    expect(nestedServers()).toBe(0);
    expect(loaded).toEqual(['virtual:cairn-manifest', 'virtual:cairn-manifest/adapter-facts']);
    expect(ssrLoadModuleCalls).toEqual([]);
    expect(ctx.warnings).toEqual([]);
  });

  it('a manifest drift the running server reports still fails dev start through this.error', async () => {
    const dir = tempSite();
    const { server } = liveServer(async (id) => {
      if (id === 'virtual:cairn-manifest') throw new Error('manifest drift: posts/hello');
      return { result: '{}' };
    });

    await expect(serve(dir, server, fakeContext())).rejects.toThrow(/manifest drift: posts\/hello/);
    expect(nestedServers()).toBe(0);
  });

  it('falls back to the nested verify server when the SSR environment is not runnable in Node', async () => {
    const dir = tempSite();
    const { server, ssrLoadModuleCalls } = liveServer(async () => ({ result: '{}' }), false);

    await serve(dir, server, fakeContext());

    // One nested server for the manifest verify, one for the site-facts check.
    expect(nestedServers()).toBe(2);
    expect(ssrLoadModuleCalls).toEqual([]);
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
