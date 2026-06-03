// The /delivery data barrel must not pull a .svelte component into the module graph, so a
// node-environment consumer can import a delivery data helper without the Svelte vitest plugin.
// The CairnHead component lives at the dedicated ./delivery/head entry instead.
import { describe, it, expect } from 'vitest';

describe('delivery head split', () => {
  it('imports the /delivery barrel at runtime under node with no Svelte plugin', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.createContentIndex).toBe('function');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });

  it('does not export CairnHead from the data barrel', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect('CairnHead' in barrel).toBe(false);
  });
});
