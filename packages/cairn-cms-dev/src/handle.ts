// The blessed dev-backend SvelteKit Handle factory. It installs the in-memory GitHub/D1/R2 doubles
// and mints an owner session, the local-dev substitute for the GitHub App commit pipeline and the
// magic-link auth loop. A consumer activates it from hooks.server.ts behind the three-layer fence
// (the build-foldable `dev` flag, the devDependency boundary, and the engine prod tripwire); the
// fence, not this factory, owns the dev+flag gate, so calling devBackendHandle always installs.
//
// Two risk tiers ride here. The owner-session bypass is an authentication breach if it reaches a
// deployed runtime; the GitHub/R2/D1 doubles only degrade to "saves do not persist." The bypass is
// why the fence exists; never relax it by analogy to the harmless mock.
import type { Handle } from '@sveltejs/kit';
import { installFakeGitHub, seedMediaLibrary, SEED_MEDIA_KEYS } from './fake-github.js';
import { createFakeAuthDb } from './fake-auth-db.js';
import { createFakeR2 } from './fake-r2.js';

/** Options for the dev-backend handle. */
export interface DevBackendOptions {
  /**
   * The Part B seam for seeding the consumer's own committed starter content into the in-memory
   * repo, so the template ships realistic posts instead of the showcase's hard-coded seed. Part A
   * keeps the media-only seed and leaves this a typed hook for Part B to fill; setting it has no
   * effect yet.
   */
  seedContent?: boolean;
}

/**
 * Build the dev-backend `Handle`. On call it installs the fake GitHub double, seeds the Media
 * Library fixtures, and creates one fake AUTH_DB and one fake MEDIA_BUCKET for the process lifetime
 * (so editors added through /admin/editors and assets uploaded through /admin persist across
 * requests in the dev session). The returned handle supplies the binding doubles on `platform.env`
 * for /admin and /media requests and mints an owner editor on /admin, leaving every other path
 * untouched.
 * @param options - {@link DevBackendOptions}; `seedContent` is the Part B content-seeding hook.
 * @returns a SvelteKit `Handle` that installs the dev backend per request path.
 */
export function devBackendHandle(options?: DevBackendOptions): Handle {
  installFakeGitHub();
  // Seed the Media Library fixtures into the in-memory repo so /admin/media has a realistic set.
  seedMediaLibrary();

  // One instance each for the server's lifetime, like the fake GitHub's in-memory repo, so editors
  // added through /admin/editors and an asset uploaded through /admin persist across requests.
  const fakeAuthDb = createFakeAuthDb();
  const fakeR2 = createFakeR2();

  // Seed the R2 bytes for the Media Library fixtures, so each seeded asset's thumbnail resolves
  // through /media and the orphan delete removes a real object.
  for (const key of SEED_MEDIA_KEYS) fakeR2.seedObject(key);

  return async ({ event, resolve }) => {
    const path = event.url.pathname;
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const isMedia = path === '/media' || path.startsWith('/media/');
    if (isAdmin || isMedia) {
      // The binding doubles ride platform.env the way the Cloudflare adapter would supply the real
      // ones. The template's App.Platform also declares context and caches, which the dev routes
      // never touch, so this partial value casts through unknown; the engine reads the env
      // structurally at runtime. AUTH_DB is admin-only; MEDIA_BUCKET serves both the upload action
      // under /admin and the delivery route under /media. ANTHROPIC_API_KEY is a dummy presence
      // flag: the tidy action refuses before building a client when it is absent, so the value is
      // set even though the fake client (fake-anthropic.ts) never reads it.
      event.platform = {
        env: {
          ...(isAdmin ? { AUTH_DB: fakeAuthDb, ANTHROPIC_API_KEY: 'sk-showcase-stub' } : {}),
          MEDIA_BUCKET: fakeR2,
        },
      } as unknown as App.Platform;
    }
    if (isAdmin) {
      // Editor shape: { email, displayName, role }, the engine's Editor type (src/lib/auth/types.ts).
      event.locals.editor = {
        email: 'editor@showcase.test',
        displayName: 'Demo Editor',
        role: 'owner',
      };
    }
    return resolve(event);
  };
}
