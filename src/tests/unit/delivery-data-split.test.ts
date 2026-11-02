// /delivery is one barrel: the corpus projections and the route loaders. The engine's own manifest
// builder call goes through /internal, which the cairnManifest plugin's generated module imports.
import { describe, it, expect } from 'vitest';

// The first barrel import pays the suite's parallel transform queue under a full run and can
// exceed the 5s default; the same import finishes in about a second in isolation.
describe('delivery data barrel', { timeout: 20_000 }, () => {
  it('exposes the pure projections and the route loaders from one barrel', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.buildSiteManifest).toBe('function');
    expect(typeof barrel.createSiteResolver).toBe('function');
    expect(typeof barrel.buildRssResponse).toBe('function');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });

  it('gives the internal entry the same manifest builder', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    const internal = await import('../../lib/internal.js');
    expect(internal.buildSiteManifest).toBe(barrel.buildSiteManifest);
  });
});
