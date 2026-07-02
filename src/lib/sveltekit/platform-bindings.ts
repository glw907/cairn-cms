// The Cloudflare binding shape a site's `app.d.ts` declares for `App.Platform.env`. `/ambient`
// augments `App.Locals`, never `App.Platform`, since a second `interface Platform` declaration
// would collide with a site's own through TypeScript's interface merging; a site instead
// intersects this type into its own `env` block. Split in two so the required-members rule
// still fires on a text-only site: `CairnPlatformBindings` names the bindings every site needs,
// and `CairnMediaBindings` is a second intersection member a media-enabled site adds.
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { AuthEnv } from '../auth/types.js';

/**
 * The Cloudflare bindings and vars every cairn site's Worker needs, required (not optional) so a
 *  binding a site forgets to wire fails `app.d.ts` at compile time rather than surfacing as a
 *  runtime `config.bindings-missing` error. Intersect it into `App.Platform.env`:
 *
 * ```ts
 * // src/app.d.ts
 * import type { CairnPlatformBindings } from '@glw907/cairn-cms/sveltekit';
 *
 * interface Platform {
 *   env: CairnPlatformBindings & { APP_DB: D1Database };
 * }
 * ```
 *
 * A media-enabled site also intersects {@link CairnMediaBindings}, since `MEDIA_BUCKET` exists only
 *  on a site that turns media on. The GitHub App's id and installation id are not runtime bindings:
 *  they name which App the commit signer authenticates as, so the adapter passes them as compile-time
 *  config to `githubApp({ appId, installationId })`, constructed at module scope before
 *  `platform.env` exists. Only the private key is a Worker secret the engine reads at runtime.
 */
export interface CairnPlatformBindings {
  /** The self-owned magic-link auth store: the allowlist, sessions, and single-use tokens. */
  AUTH_DB: D1Database;
  /** Cloudflare Email Sending binding for the magic-link message. */
  EMAIL: NonNullable<AuthEnv['EMAIL']>;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN: string;
  /** The GitHub App's private key, base64 of the PEM on one line, decoded with `atob()` before signing. */
  GITHUB_APP_PRIVATE_KEY_B64: string;
  /**
   * The Anthropic API key the tidy action reads at runtime, present only on a site that opts
   *  into tidy. Optional, unlike the bindings above every site needs.
   */
  ANTHROPIC_API_KEY?: string;
}

/**
 * The R2 binding a media-enabled site adds, intersected alongside {@link CairnPlatformBindings}. A
 *  text-only site (no `assets` block on its adapter) omits it.
 */
export interface CairnMediaBindings {
  /** The bucket the `/media` route and the upload action read and write; the adapter names the binding. */
  MEDIA_BUCKET: R2Bucket;
}
