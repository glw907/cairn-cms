import { describe, it, expect } from 'vitest';
import type { Plugin, PluginOption } from 'vite';
import { stripNestedServerPlugins } from '../../lib/vite/internal.js';

const named = (name: string): Plugin => ({ name });

/** The plugin adapter-cloudflare adds through SvelteKit, which starts the platform proxy. */
const ADAPTER_WORKERS = 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module';

/** The non-falsy plugin names a stripped list holds, in order. */
const namesOf = (plugins: PluginOption[]): unknown[] =>
  plugins.filter((p) => !!p).map((p) => (p as Plugin).name);

describe('stripNestedServerPlugins', () => {
  it('drops a cairnManifest plugin nested inside a sub-array and keeps the others', async () => {
    // A shared preset can nest the cairnManifest plugin inside a sub-array, the form Vite flattens.
    const plugins = [named('vite-plugin-svelte'), [named('cairn-manifest'), named('other-plugin')]];

    const names = namesOf(await stripNestedServerPlugins(plugins));

    expect(names).toEqual(['vite-plugin-svelte', 'other-plugin']);
  });

  it('drops a top-level cairnManifest plugin too', async () => {
    const names = namesOf(await stripNestedServerPlugins([named('cairn-manifest'), named('keep')]));
    expect(names).toEqual(['keep']);
  });

  it("drops adapter-cloudflare's platform-proxy plugin from inside the promise sveltekit() returns", async () => {
    // sveltekit() is async, so the adapter's plugins reach the config as a pending array.
    const sveltekit: Promise<Plugin[]> = Promise.resolve([named(ADAPTER_WORKERS), named('vite-plugin-sveltekit-setup')]);

    const names = namesOf(await stripNestedServerPlugins([sveltekit, named('cairn-manifest'), named('keep')]));

    expect(names).toEqual(['vite-plugin-sveltekit-setup', 'keep']);
  });

  it('passes falsy slots through without crashing', async () => {
    const stripped = await stripNestedServerPlugins([null, undefined, false, named('keep')]);
    expect(stripped).toContain(null);
    expect(stripped).toContain(undefined);
    expect(stripped).toContain(false);
    expect(namesOf(stripped)).toEqual(['keep']);
  });
});
