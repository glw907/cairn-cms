// The blessed dev-backend SvelteKit Handle factory. It installs the in-memory GitHub/D1/R2 doubles
// and mints an owner session, the local-dev substitute for the GitHub App commit pipeline and the
// magic-link auth loop. A consumer activates it from hooks.server.ts behind the three-layer fence
// (a build-time flag named at each call site, the devDependency boundary, and the engine prod
// tripwire; see this package's README for why a shared exported constant does not hold layer one);
// the fence, not this factory, owns the dev+flag gate, so calling devBackendHandle always installs.
// The one refusal it carries is the engine guard's tripwire, which it would otherwise displace: a
// set flag on a non-local host answers 503.
//
// Two risk tiers ride here. The owner-session bypass is an authentication breach if it reaches a
// deployed runtime; the GitHub/R2/D1 doubles only degrade to "saves do not persist." The bypass is
// why the fence exists; never relax it by analogy to the harmless mock.
import type { Handle } from '@sveltejs/kit/hooks';
import { env, withEnv } from 'cloudflare:workers';
import type { Backend, CairnRuntime } from '@glw907/cairn-cms';
import { createLogger, type CairnLogEvent } from '@glw907/cairn-cms/log';
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

const log = createLogger<CairnLogEvent>();

// WATCH: the flag name, its truthiness rule, the local-host list, and the refusal message mirror
// the engine's src/lib/dev-flag.ts (CAIRN_DEV_BACKEND_FLAG, isDevBackendFlagSet, isLocalHost,
// CAIRN_DEV_BACKEND_MESSAGE), which no public subpath exports. Change them together.
const DEV_BACKEND_MESSAGE =
  'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.';

/** True when the Worker env carries the dev-backend flag in a form the engine counts as set. */
function devFlagSet(): boolean {
  const raw = (env as unknown as Record<string, unknown>).CAIRN_DEV_BACKEND;
  return raw === '1' || raw === true;
}

/** True for a hostname that names a local development host. */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/** Options for the dev-backend handle. */
export interface DevBackendConfig {
  /**
   * The Part B seam for seeding the consumer's own committed starter content into the in-memory
   * repo, so the template ships realistic posts instead of the showcase's hard-coded seed. Part A
   * keeps the media-only seed and leaves this a typed hook for Part B to fill; setting it has no
   * effect yet.
   */
  seedContent?: boolean;
  /**
   * The runtime `composeRuntime` returned for the site's adapter, the same one the production
   * guard takes. Its `access` is attached to `event.locals.cairnAccess` on every /admin request
   * this handle mints an editor for, and `{}` when the adapter declares none, exactly as the
   * engine guard does, so the access helpers behave the same under either hook branch. Its `roles`
   * resolves no capability here: this handle mints the literal owner capability rather than
   * reading a role declaration, so the vocabulary changes no authorization decision.
   */
  runtime: Pick<CairnRuntime, 'roles' | 'access'>;
}

/**
 * Build the dev-backend `Handle`. On call it installs the fake GitHub double, seeds the Media
 * Library fixtures, and creates one fake AUTH_DB and one fake MEDIA_BUCKET for the process lifetime
 * (so editors added through /admin/editors and assets uploaded through /admin persist across
 * requests in the dev session). The returned handle runs /admin, /media, and /preview requests
 * inside `withEnv` with the binding doubles layered over the Worker env, and mints an owner editor
 * on /admin, leaving every other path untouched. It does nothing while the build prerenders, when
 * no Worker env exists to layer over. With `CAIRN_DEV_BACKEND` set on the Worker env and a request
 * to a non-local host, it refuses every path with a 503 and logs `guard.refused`, the same record
 * the engine guard writes for the same condition.
 * @param config - {@link DevBackendConfig}; `runtime` carries the site's access map, attached to
 * `locals.cairnAccess` beside the minted editor, and `seedContent` is the Part B content-seeding
 * hook.
 * @returns a SvelteKit `Handle` that installs the dev backend per request path.
 */
export function devBackendHandle(config: DevBackendConfig): Handle {
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
    // While the build prerenders, every Worker env read and every withEnv call throws, and a
    // prerendered page is static output this handle never serves again; pass it straight through.
    if (await isBuilding()) return resolve(event);
    const path = event.url.pathname;
    // This handle replaces the engine guard, so the guard's own dev-backend tripwire never runs
    // while it is mounted. A build that folded the dev backend in (VITE_CAIRN_E2E=1, say) and then
    // deployed with the flag set would otherwise serve the owner-session bypass on a public host.
    // The refusal pairs the flag with the request's hostname, read on its own: on Cloudflare the
    // URL's host is the routed one, and PUBLIC_ORIGIN cannot witness here, since a scaffolded
    // site's wrangler.jsonc names its deployed origin while `npm run dev` runs on localhost.
    if (devFlagSet() && !isLocalHost(event.url.hostname)) {
      log.error('guard.refused', { reason: 'dev_backend_in_prod', path });
      return new Response(DEV_BACKEND_MESSAGE, { status: 503 });
    }
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const isMedia = path === '/media' || path.startsWith('/media/');
    // /preview/[token] is the one non-admin route the engine reaches AUTH_DB and cairnBackend
    // from (loadPreview, spec part 3): it needs the SAME fakeAuthDb instance previewMintAction
    // wrote its row into (both admin and preview must share this one process-lifetime store, or
    // a minted token would never resolve) and the same in-memory repo, but never the owner
    // session bypass below, which is admin-only.
    const isPreview = path === '/preview' || path.startsWith('/preview/');
    if (!isAdmin && !isMedia && !isPreview) return resolve(event);

    // The dev Backend rides event.locals.cairnBackend, the per-request channel the engine
    // resolves (locals.cairnBackend ?? runtime.backend.connect(env)). It replaces the retired
    // global-fetch patch: the engine's reads and commits hit the in-memory repo through this
    // object.
    (event.locals as { cairnBackend?: Backend }).cairnBackend = backend;

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
      // Mirrors the guard, which sets locals.cairnAccess immediately after minting
      // locals.cairnEditor on a guarded admin path, and defaults an absent declaration to {} the
      // same way, so a site's own route gates and section actions read the same declaration under
      // either hook branch.
      event.locals.cairnAccess = config.runtime.access ?? {};
    }
    // The binding doubles ride the Worker env the way the Cloudflare adapter would supply the real
    // ones, through withEnv, so the engine's reads and a site's own `cloudflare:workers` reads see
    // them alike for the rest of this request. AUTH_DB serves /admin and /preview (loadPreview's
    // own binding read); MEDIA_BUCKET serves the upload action under /admin and the delivery route
    // under /media. ANTHROPIC_API_KEY is a dummy presence flag: the tidy action refuses before
    // building a client when it is absent, so the value is set even though the fake client
    // (fake-anthropic.ts) never reads it. APP_DB is the developer-binding example: a custom admin
    // screen reads and writes its own D1 binding the engine never touches, so this handle supplies
    // a fake for it the same way it does AUTH_DB. Both AUTH_DB and APP_DB stay admin-only
    // otherwise: /preview needs only AUTH_DB, never the tidy stub or the developer's own binding.
    //
    // The current env is spread first, so every var (PUBLIC_ORIGIN among them) and every binding
    // an outer handle already layered survives, and the doubles win on a name collision. A handle
    // sequenced after this one layers its own withEnv over this set the same way.
    const doubles = {
      ...(isAdmin || isPreview ? { AUTH_DB: fakeAuthDb } : {}),
      ...(isAdmin ? { APP_DB: fakeAppDb, ANTHROPIC_API_KEY: 'sk-showcase-stub' } : {}),
      MEDIA_BUCKET: fakeR2,
    };
    // workers-types declares withEnv's return as unknown; it returns the callback's own value.
    return withEnv({ ...env, ...doubles }, () => resolve(event)) as ReturnType<typeof resolve>;
  };
}

// WATCH: a copy of the engine's isBuilding (src/lib/sveltekit/building.ts), which no public
// subpath exports. Change the two together.
/**
 * Read SvelteKit's `building` flag. The import is dynamic and wrapped in `try`/`catch`, the same
 * form the engine uses, so a bundler with no SvelteKit plugin degrades to `false` rather than
 * failing on the virtual module.
 */
async function isBuilding(): Promise<boolean> {
  try {
    const { building } = await import('$app/env');
    return building;
  } catch {
    return false;
  }
}
