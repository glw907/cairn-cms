// Under `vite dev`, the cairnManifest plugin must verify through the dev server that is already
// running and never create a second Vite server. A nested server carries the site's own plugins,
// and closing it runs their closeServer hooks: adapter-cloudflare's hook disposes the platform
// proxy the running dev server shares through a global, which breaks every later request that
// reads `cloudflare:workers`. Each case drives the real plugin object's hooks against a throwaway
// site whose `vite` package is a fake that counts createServer calls, so a nested server shows up
// as a count rather than a real server start.
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

const FAKE_VITE = `
export async function loadConfigFromFile() { return null; }
export async function createServer() {
  globalThis.${COUNTER} = (globalThis.${COUNTER} ?? 0) + 1;
  return {
    ssrLoadModule: async (id) => ({ result: id === 'virtual:cairn-manifest' ? 'ok' : '{}' }),
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
});

/** A stand-in for the running dev server that records each module id it is asked to load. */
function liveServer(load: (id: string) => Promise<{ result: string }>): { server: ViteDevServer; loaded: string[] } {
  const loaded: string[] = [];
  const server = {
    ssrLoadModule: (id: string) => {
      loaded.push(id);
      return load(id);
    },
  } as unknown as ViteDevServer;
  return { server, loaded };
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

/** Run the plugin's serve-time hooks in Vite's order against `server`, under `ctx`. */
async function serve(dir: string, server: ViteDevServer, ctx: ReturnType<typeof fakeContext>): Promise<void> {
  const plugin = cairnManifest(OPTS);
  (plugin.configResolved as (c: { root: string; command: string }) => void)({ root: dir, command: 'serve' });
  await (plugin.configureServer as ((s: ViteDevServer) => unknown) | undefined)?.(server);
  await (plugin.buildStart as (this: unknown) => Promise<void>).call(ctx);
}

describe('cairnManifest under vite dev', () => {
  it('verifies the manifest and the site facts through the running server, creating no nested server', async () => {
    const dir = tempSite();
    const { server, loaded } = liveServer(async (id) => ({ result: id === 'virtual:cairn-manifest' ? 'ok' : '{}' }));
    const ctx = fakeContext();

    await serve(dir, server, ctx);

    expect((globalThis as Record<string, unknown>)[COUNTER]).toBe(0);
    expect(loaded[0]).toBe('virtual:cairn-manifest');
    expect(loaded).toHaveLength(2);
    expect(ctx.warnings).toEqual([]);
  });

  it('a manifest drift the running server reports still fails dev start through this.error', async () => {
    const dir = tempSite();
    const { server } = liveServer(async (id) => {
      if (id === 'virtual:cairn-manifest') throw new Error('manifest drift: posts/hello');
      return { result: '{}' };
    });

    await expect(serve(dir, server, fakeContext())).rejects.toThrow(/manifest drift: posts\/hello/);
    expect((globalThis as Record<string, unknown>)[COUNTER]).toBe(0);
  });
});
