import { describe, it, expect } from 'vitest';
import { resolveViteRoot } from '../../lib/vite/resolve-root.js';

// The cairn-manifest bin conflates three concerns: the config-search dir (cwd), the Vite app
// root, and the manifest output base. resolveViteRoot pulls the authoritative root off the
// loaded config the way Vite does: a relative `root` resolves against the config file's own
// directory, an absolute one stands, and no `root` falls back to cwd. These pure-helper cases
// pin that derivation without spinning a nested Vite server.
const CWD = '/site';

describe('resolveViteRoot', () => {
  it('resolves a relative root against the loaded config file directory, not cwd', () => {
    const loaded = { path: '/repo/app/vite.config.ts', config: { root: 'frontend' } };
    expect(resolveViteRoot(loaded, CWD)).toBe('/repo/app/frontend');
  });

  it('keeps an absolute root as the config gave it', () => {
    const loaded = { path: '/repo/app/vite.config.ts', config: { root: '/elsewhere/app' } };
    expect(resolveViteRoot(loaded, CWD)).toBe('/elsewhere/app');
  });

  it('falls back to cwd when the loaded config sets no root', () => {
    const loaded = { path: '/repo/app/vite.config.ts', config: {} };
    expect(resolveViteRoot(loaded, CWD)).toBe(CWD);
  });

  it('resolves a "." root to the config file directory', () => {
    const loaded = { path: '/repo/app/vite.config.ts', config: { root: '.' } };
    expect(resolveViteRoot(loaded, CWD)).toBe('/repo/app');
  });
});
