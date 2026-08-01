// cairn-cms: the public `/auth-crypto` barrel. A pure re-export of the Web Crypto primitives
// from `../auth/crypto.js`, server-only surface for a site authenticating a second audience
// (member magic-link sessions, offer tokens, an OTP flow) that would otherwise copy the engine's
// cryptography by hand. What stays out: the TTL constants and `SEND_COOLDOWN_MS` (a TTL is a
// site's own ruling), the engine's own cookie-name functions (they are internal, and colliding
// with them is the two-stores blur the `cairn_` namespace reservation warns against), and every
// auth-flow and store function; audience semantics, the store schema, and the two-stores-never-
// blur rule stay site-owned.
export { generateToken, generateSessionId, generateCsrfToken, hashToken, tokensMatch, cookieName } from '../auth/crypto.js';
