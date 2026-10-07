import { describe, expect, it, vi } from 'vitest';
import { buildRobots } from '@glw907/cairn-cms/delivery';

// #chassis/content.js and #theme/cairn.config.js both pull in the full adapter, including a
// Svelte island component this standalone vitest config has no Svelte plugin to parse; mocking
// them to the one field each the route reads keeps the test on the route's own wiring without
// that unrelated dependency chain.
const SITE_ORIGIN = 'https://showcase.test';
vi.mock('#chassis/content.js', () => ({ siteMeta: { origin: SITE_ORIGIN } }));
const mockCairn = vi.hoisted(() => ({
  cairn: { aiPosture: undefined as 'decline' | 'invite' | undefined },
}));
vi.mock('#theme/cairn.config.js', () => mockCairn);

describe('robots.txt route', () => {
  it('stays byte-identical to the no-posture output when the adapter declares no aiPosture', async () => {
    mockCairn.cairn.aiPosture = undefined;
    const { GET } = await import('./+server.js');
    const body = await (await GET({} as Parameters<typeof GET>[0])).text();
    expect(body).toBe(
      buildRobots({ sitemapUrl: SITE_ORIGIN + '/sitemap.xml', disallow: ['/admin'] }),
    );
  });

  it('passes a declared aiPosture through to robotsResponse', async () => {
    mockCairn.cairn.aiPosture = 'decline';
    vi.resetModules();
    const { GET } = await import('./+server.js');
    const body = await (await GET({} as Parameters<typeof GET>[0])).text();
    expect(body).toBe(
      buildRobots({
        sitemapUrl: SITE_ORIGIN + '/sitemap.xml',
        disallow: ['/admin'],
        posture: 'decline',
      }),
    );
  });
});
