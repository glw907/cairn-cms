// cairn-cms: the public `/cloudflare` barrel. Cloudflare-native platform primitives two sites
// already copy by hand: Turnstile is the platform's own bot defense, and `RateLimit` is a
// platform binding. Anything proposed here must be a Cloudflare platform primitive itself; a
// third-party service verifier (a payment processor's webhook check, a chat platform's notifier)
// belongs to the site, whatever precedent Turnstile appears to set.
export { verifyTurnstile, type VerifyTurnstileOptions } from './turnstile.js';
export { resolveRateLimit, type RateLimitLike, type RateLimitOutcome } from './rate-limit.js';
