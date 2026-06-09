// The /delivery data barrel must not pull a .svelte component into the module graph, so a
// node-environment consumer can import a delivery data helper without the Svelte vitest plugin.
// The CairnHead component lives at the dedicated ./delivery/head entry instead.
import { describe, it, expect } from 'vitest';

// The first barrel import pays the suite's parallel transform queue under a full run and can
// exceed the 5s default; the same import finishes in about a second in isolation.
describe('delivery head split', { timeout: 20_000 }, () => {
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
