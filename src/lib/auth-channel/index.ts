// cairn-cms: the public `/auth-channel` barrel, a server-only subpath (types plus a default
// condition, no browser or svelte condition) per the design spec
// (docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md). `createAuthChannel` is the
// whole surface: a site supplies delivery, roster lookup, identifier shape, and a bot challenge,
// and the factory owns every security discipline (mint, consume, budgets, sessions, revocation).
// Nothing here imports `$app/*`.
export { createAuthChannel } from './factory.js';
export { CHANNEL_SCHEMA_SQL } from './store.js';
export type {
  AuthChannel,
  AuthChannelConfig,
  AuthChannelEvent,
  DeliverContext,
  ChannelRequestResult,
  ChannelConfirmResult,
} from './factory.js';
// Canonical home `/cloudflare`; a recorded R4 re-export here because `AuthChannelConfig`'s own
// challenge budget field names it.
export type { RateLimitLike } from '../cloudflare/rate-limit.js';
