// cairn-cms: the public `/auth-channel` barrel, a server-only subpath (types plus a default
// condition, no browser or svelte condition) per the design spec
// (docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md). `createAuthChannel` is the
// whole surface: a site supplies delivery, roster lookup, identifier shape, and a bot challenge,
// and the factory owns every security discipline (mint, consume, budgets, sessions, revocation).
// Nothing here imports `$app/*`.
//
// The channel's D1 schema is a packaged migration file (`migrations-channel/0000_channel.sql` in
// the tarball), never an export: a site points its channel binding's own `migrations_dir` at it,
// the same way `migrations/` already serves AUTH_DB. `store.ts` stays internal alongside it, since
// every statement it holds is a request-path detail the factory owns; the one value a site could
// want, the schema version, is in the migration it applies.
export { createAuthChannel } from './factory.js';
export type {
  AuthChannel,
  AuthChannelConfig,
  DeliverContext,
  ChannelRequestResult,
  ChannelConfirmResult,
} from './factory.js';
// Canonical home `/cloudflare`; a recorded R4 re-export here because `AuthChannelConfig`'s own
// challenge budget field names it.
export type { RateLimitLike } from '../cloudflare/rate-limit.js';
// Canonical home `/sveltekit`; a recorded R4 re-export here because `AuthChannelConfig`'s
// `challenge` and `rateLimit.key` callbacks name it, and it replaced the retired
// `AuthChannelEvent` this subpath used to declare itself.
export type { CairnEvent } from '../sveltekit/types.js';
