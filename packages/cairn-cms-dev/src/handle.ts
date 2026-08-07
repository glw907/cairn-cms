// The blessed dev-backend SvelteKit Handle factory. It installs the in-memory GitHub/D1/R2 doubles
// and mints an owner session, the local-dev substitute for the GitHub App commit pipeline and the
// magic-link auth loop. A consumer activates it from hooks.server.ts behind the three-layer fence
// (a build-time flag named at each call site, the devDependency boundary, and the engine prod
// tripwire; see this package's README for why a shared exported constant does not hold layer one);
// the fence, not this factory, owns the dev+flag gate, so calling devBackendHandle always installs.
//
// Two risk tiers ride here. The owner-session bypass is an authentication breach if it reaches a
// deployed runtime; the GitHub/R2/D1 doubles only degrade to "saves do not persist." The bypass is
// why the fence exists; never relax it by analogy to the harmless mock.
import type { Handle } from '@sveltejs/kit';
import type { Backend } from '@glw907/cairn-cms';
import {
  createDevBackend,
  seedMediaLibrary,
  seedVocabulary,
  seedFragments,
  seedPreviewTwin,
  SEED_MEDIA_KEYS,
} from './fake-github.js';
import { createFakeAuthDb } from './fake-auth-db.js';
import { createFakeAppDb } from './fake-app-db.js';
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
  // Seed the Media Library fixtures into the in-memory repo so /admin/media has a realistic set.
  seedMediaLibrary();

  // Seed two published fragments (a committed body plus a manifest row each) so /admin/fragments
  // lists a real set and the include picker on every other concept's edit screen has candidates.
  // Runs after the media seed because it appends rows to the manifest that seed writes.
  seedFragments();

  // Seed the tag-vocabulary fixtures (a committed site config, in-use tags, an unlisted seed
  // candidate) so /admin/vocabulary renders populated rather than empty. Runs after the media seed
  // because it patches `tags:` onto the manifest that seed writes.
  seedVocabulary();

  // Seed the preview twin-render fixture (spec part 3, "Public preview for a non-editor"): the one
  // entry this in-memory repo shares byte-for-byte with the real on-disk corpus, so an admin draft
  // against it and its prerendered public page are comparable. Runs after the media seed for the
  // same reason seedFragments and seedVocabulary do.
  seedPreviewTwin();

  // One dev Backend over the module-level store, built at handle-build time so every request shares
  // the same singleton repo (a commit on one request is visible to the recorder route on the next).
  const backend = createDevBackend();

  // One instance each for the server's lifetime, like the in-memory repo, so editors added through
  // /admin/editors and an asset uploaded through /admin persist across requests.
  const fakeAuthDb = createFakeAuthDb();
  const fakeAppDb = createFakeAppDb();
  const fakeR2 = createFakeR2();

  // Seed the R2 bytes for the Media Library fixtures, so each seeded asset's thumbnail resolves
  // through /media and the orphan delete removes a real object.
  for (const key of SEED_MEDIA_KEYS) fakeR2.seedObject(key);

  return async ({ event, resolve }) => {
    const path = event.url.pathname;
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const isMedia = path === '/media' || path.startsWith('/media/');
    // /preview/[token] is the one non-admin route the engine reaches AUTH_DB and cairnBackend
    // from (previewLoad, spec part 3): it needs the SAME fakeAuthDb instance previewMintAction
    // wrote its row into (both admin and preview must share this one process-lifetime store, or
    // a minted token would never resolve) and the same in-memory repo, but never the owner
    // session bypass below, which is admin-only.
    const isPreview = path === '/preview' || path.startsWith('/preview/');
    if (isAdmin || isMedia || isPreview) {
      // The dev Backend rides event.locals.cairnBackend, the per-request channel the engine
      // resolves (locals.cairnBackend ?? runtime.backend.connect(env)). It replaces the retired
      // global-fetch patch: the engine's reads and commits hit the in-memory repo through this
      // object.
      (event.locals as { cairnBackend?: Backend }).cairnBackend = backend;

      // The binding doubles ride platform.env the way the Cloudflare adapter would supply the real
      // ones. The template's App.Platform also declares context and caches, which the dev routes
      // never touch, so this partial value casts through unknown; the engine reads the env
      // structurally at runtime. AUTH_DB serves /admin and /preview (previewLoad's own binding
      // read); MEDIA_BUCKET serves the upload action under /admin and the delivery route under
      // /media. ANTHROPIC_API_KEY is a dummy presence flag: the tidy action refuses before
      // building a client when it is absent, so the value is set even though the fake client
      // (fake-anthropic.ts) never reads it. APP_DB is the developer-binding example: a custom
      // admin screen reads and writes its own D1 binding the engine never touches, so the dev
      // handle supplies a fake for it the same way it does AUTH_DB. Both AUTH_DB and APP_DB stay
      // admin-only otherwise: /preview needs only AUTH_DB, never the tidy stub or the developer's
      // own binding.
      //
      // Plain vars (PUBLIC_ORIGIN and any other non-binding wrangler.jsonc `vars` entry) are
      // preserved from whatever the adapter's own platform proxy already resolved, spread first so
      // the fakes below always win on a name collision: previewMintAction's `requireOrigin(env)`
      // is the first admin action that ever reads a var in dev, since every earlier one either
      // ignores it or, like the login flow, never runs at all under the owner-session bypass.
      // Read through the same cast the write below uses: inside this package `App.Platform` is the
      // bare kit default (no consuming site's app.d.ts is in scope), so it declares no `env`.
      const platform = event.platform as unknown as { env?: Record<string, unknown> } | undefined;
      const existingEnv = platform?.env ?? {};
      event.platform = {
        env: {
          ...existingEnv,
          ...(isAdmin || isPreview ? { AUTH_DB: fakeAuthDb } : {}),
          ...(isAdmin ? { APP_DB: fakeAppDb, ANTHROPIC_API_KEY: 'sk-showcase-stub' } : {}),
          MEDIA_BUCKET: fakeR2,
        },
      } as unknown as App.Platform;
    }
    if (isAdmin) {
      // Editor shape: { email, displayName, role, capability }, the engine's Editor type
      // (src/lib/auth/types.ts). The dev backend always mints an owner session, so capability is
      // the literal 'owner' rather than a resolveCapability() call against a declared vocabulary.
      event.locals.cairnEditor = {
        email: 'editor@showcase.test',
        displayName: 'Demo Editor',
        role: 'owner',
        capability: 'owner',
      };
    }
    return resolve(event);
  };
}
