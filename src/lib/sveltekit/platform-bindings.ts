// The Cloudflare binding shape cairn requires of a site's Worker. A site's `Env` comes from
// `wrangler types`, generated from its own `wrangler.jsonc` and secrets file, and the engine reads
// the same bindings from the Worker env at runtime; these interfaces state what that generated
// `Env` must carry, so a site checks it at compile time. Split in two so the required-members rule
// still fires on a text-only site: `CairnPlatformBindings` names the bindings every site needs, and
// `CairnMediaBindings` adds the bucket a media-enabled site binds.
import type { D1Database } from '@cloudflare/workers-types';
import type { EmailSender } from '../email.js';

/**
 * The Cloudflare bindings and vars every cairn site's Worker needs, required (not optional) so a
 *  binding a site forgets to wire fails its type check rather than surfacing as a runtime
 *  `config.bindings-missing` error. A site's `wrangler types` `Env` satisfies it:
 *
 * ```ts
 * import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';
 *
 * // A compile error here names the binding wrangler.jsonc or the secrets file is missing.
 * ({}) as Env satisfies CairnPlatformBindings & CairnMediaBindings;
 * ```
 *
 * Generate `Env` with the secret names included (`wrangler types --env-file .dev.vars.example`),
 *  since `GITHUB_APP_PRIVATE_KEY_B64` is a secret `wrangler.jsonc` never lists.
 *
 * A media-enabled site also checks {@link CairnMediaBindings}, since `MEDIA_BUCKET` exists only
 *  on a site that turns media on. The GitHub App's id and installation id are not runtime bindings:
 *  they name which App the commit signer authenticates as, so the adapter passes them as compile-time
 *  config to `createGithubApp({ appId, installationId })`, constructed at module scope before any
 *  request runs. Only the private key is a Worker secret the engine reads at runtime.
 */
export interface CairnPlatformBindings {
  /** The self-owned magic-link auth store: the allowlist, sessions, and single-use tokens. */
  AUTH_DB: D1Database;
  /** Cloudflare Email Sending binding for the magic-link message. */
  EMAIL: EmailSender;
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
 * The R2 binding a media-enabled site adds, checked alongside {@link CairnPlatformBindings}. A
 *  text-only site (no `assets` block on its adapter) omits it.
 */
export interface CairnMediaBindings {
  /**
   * The bucket the `/media` route and the upload action read and write; the adapter names the
   *  binding. Typed by the methods the engine calls on it rather than as workers-types' `R2Bucket`:
   *  a generated `Env` names the runtime's global `R2Bucket`, whose `Headers`-typed members differ
   *  from the package's own declaration of them under a DOM lib, so the two declarations of one
   *  binding are not assignable to each other.
   */
  MEDIA_BUCKET: {
    get(key: string): Promise<unknown>;
    head(key: string): Promise<unknown>;
    put(key: string, value: ArrayBuffer): Promise<unknown>;
    delete(keys: string | string[]): Promise<void>;
  };
}
