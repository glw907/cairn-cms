// cairn-cms: the public `/auth-channel` barrel, a server-only subpath (types plus a default
// condition, no browser or svelte condition) per the design spec
// (docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md). `createAuthChannel` is the
// whole surface: a site supplies delivery, roster lookup, identifier shape, and a bot challenge,
// and the factory owns every security discipline (mint, consume, budgets, sessions, revocation).
// Nothing here imports `$app/*`; `devDelivery`'s dev-backend refusal is a runtime check on
// `ctx.env.CAIRN_DEV_BACKEND`, matching `../sveltekit/guard.ts`.
export { createAuthChannel } from './factory.js';
export { devDelivery } from './dev.js';
export { CHANNEL_SCHEMA_SQL, CHANNEL_SCHEMA_VERSION } from './store.js';
export type {
  AuthChannel,
  AuthChannelConfig,
  DeliverContext,
  ChannelRequestResult,
  ChannelConfirmResult,
} from './factory.js';
export type { RateLimitLike } from '../cloudflare/rate-limit.js';
