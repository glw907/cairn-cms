// cairn-cms: the public `/auth-crypto` barrel. Anything proposed here must be a stateless Web
// Crypto primitive (a token, hash, compare, or cookie-name function) a second-audience login flow
// would otherwise copy by hand from `../auth/crypto.js`; a stateful provisioning read or write
// belongs on `/auth-store` instead, even one built on the same hashes this barrel produces. What
// stays out: the TTL constants and `SEND_COOLDOWN_MS` (a TTL is a site's own ruling), the engine's
// own cookie-name functions (they are internal, and colliding with them is the two-stores blur the
// `cairn_` namespace reservation warns against), and every auth-flow and store function; audience
// semantics, the store schema, and the two-stores-never-blur rule stay site-owned.
export { generateToken, generateSessionId, generateCsrfToken, hashToken, tokensMatch, cookieName } from '../auth/crypto.js';
