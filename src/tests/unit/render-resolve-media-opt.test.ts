import { describe, it, expect } from 'vitest';
import type { SiteRender } from '../../lib/content/types.js';
import type { MediaResolve } from '../../lib/render/resolve-media.js';

// The entry-aware render seam carries `resolveMedia` as an optional input field. This test pins the
// contract at the type level: an adapter render that reads `resolveMedia` off the object arg accepts
// it (so it typechecks) and forwards it through to an inner renderer unchanged.
describe('render resolveMedia opt', () => {
  it('is accepted and forwarded by the object-arg render', async () => {
    let forwarded: MediaResolve | undefined;
    const inner = (md: string, opts?: { resolveMedia?: MediaResolve }): string => {
      forwarded = opts?.resolveMedia;
      return md;
    };
    const render: SiteRender = ({ body, resolveMedia }) => Promise.resolve(inner(body, { resolveMedia }));

    const resolveMedia: MediaResolve = (ref) => `/media/${ref.hash}.webp`;
    const out = await render({ body: '![x](media:a1b2c3d4e5f6a7b8)', resolveMedia });

    expect(out).toBe('![x](media:a1b2c3d4e5f6a7b8)');
    expect(forwarded).toBe(resolveMedia);
    expect(forwarded?.({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBe('/media/a1b2c3d4e5f6a7b8.webp');
  });
});
