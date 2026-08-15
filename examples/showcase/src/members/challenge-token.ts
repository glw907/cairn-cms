// cairn-cms: the two constants the login page and the challenge hook share, kept in a LEAF module
// on purpose. The login page is a `+page.svelte`, so anything it imports reaches the client bundle.
// Importing them from ./channel.ts instead pulls that module's whole graph into the browser: it
// calls createAuthChannel at module scope and imports the capture transport, so the demo roster,
// the subject ids, and the transport all shipped client-side. A real site doing the same would
// serve its member roster to every visitor. This module imports nothing, so it costs the page two
// strings.
//
// A shipped site has no equivalent of these: its `challenge` is Turnstile, whose site key is
// public by design (see docs/reference/auth-channel.md, the `challenge` config field). They exist
// only because CI cannot reach challenges.cloudflare.com.

/** The hidden form field the members login page embeds for `insecureTestChallenge` to read. */
export const INSECURE_TEST_CHALLENGE_FIELD = 'test-challenge';

/** The value `INSECURE_TEST_CHALLENGE_FIELD` must carry for `insecureTestChallenge` to pass. */
export const INSECURE_TEST_CHALLENGE_TOKEN = 'cairn-showcase-test-challenge';
