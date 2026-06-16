import { describe, it, expect } from 'vitest';
import type { CairnAdapter } from '../../lib/content/types.js';
import type { MediaResolve } from '../../lib/render/resolve-media.js';

// Task 3 makes `resolveMedia` an additive, trailing opt on the render signature. This test pins the
// contract at the type level: an adapter render that spreads its opts onto an inner renderer accepts
// `resolveMedia` (so it typechecks) and forwards it through unchanged.
describe('render resolveMedia opt', () => {
  it('is accepted and forwarded by a spread-forwarding render', async () => {
    let forwarded: MediaResolve | undefined;
    const inner = (
      md: string,
      opts?: { stagger?: boolean; resolveMedia?: MediaResolve },
    ): string => {
      forwarded = opts?.resolveMedia;
      return md;
    };
    const render: CairnAdapter['render'] = (md, opts) => inner(md, { ...opts });

    const resolveMedia: MediaResolve = (ref) => `/media/${ref.hash}.webp`;
    const out = await render('![x](media:a1b2c3d4e5f6a7b8)', { resolveMedia });

    expect(out).toBe('![x](media:a1b2c3d4e5f6a7b8)');
    expect(forwarded).toBe(resolveMedia);
    expect(forwarded?.({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBe('/media/a1b2c3d4e5f6a7b8.webp');
  });
});
