// cairn-cms: the showcase's members login channel, the worked exemplar for
// docs/guides/add-a-login-channel.md. Two named divergences from the guide, stated here so
// "living exemplar" does not overclaim: the module lives under src/members/ rather than
// src/lib/server/ (the showcase keeps no src/lib), and `challenge` is `insecureTestChallenge`
// rather than a real Turnstile verifier, since CI cannot reach challenges.cloudflare.com (see
// that function's own header comment). `deliver` is the capture transport
// (./capture-transport.js), the guide's own harness pattern. Every default clamp in
// AuthChannelConfig.ttl stays untouched, so this exemplar never becomes a set of loosened
// numbers a consumer copies.
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import type { AuthChannelEvent } from '@glw907/cairn-cms/auth-channel';
import { captureDeliver } from './capture-transport.js';
import { INSECURE_TEST_CHALLENGE_FIELD, INSECURE_TEST_CHALLENGE_TOKEN } from './challenge-token.js';

/**
 * The showcase's demo member roster: one `@showcase.test` contact per e2e spec plus one spare for
 * local reruns, mapped to an opaque subject id. No real contact information; the fixture carries
 * no PII beyond these six demo strings.
 */
export const MEMBER_ROSTER: ReadonlyMap<string, string> = new Map([
  ['golden-path@showcase.test', 'member-golden-path'],
  ['wrong-code@showcase.test', 'member-wrong-code'],
  ['cooldown@showcase.test', 'member-cooldown'],
  ['cross-browser@showcase.test', 'member-cross-browser'],
  ['revocation@showcase.test', 'member-revocation'],
  ['spare@showcase.test', 'member-spare'],
]);

/**
 * A stand-in `challenge` hook, named to be unmistakable about what it is not: CI has no route to
 * challenges.cloudflare.com, so the showcase cannot ship the real Turnstile verifier
 * `createAuthChannel` expects for this field. It checks only that the login form carries the
 * expected static token, never a real proof of humanity. A real site wires Turnstile here
 * instead, following the guide's "Wire Turnstile as the challenge hook" section
 * (docs/guides/add-a-login-channel.md); this function exists only so the fixture satisfies the
 * required `challenge` config field.
 */
export async function insecureTestChallenge<Env>(
  _event: AuthChannelEvent<Env>,
  form: FormData,
): Promise<boolean> {
  return form.get(INSECURE_TEST_CHALLENGE_FIELD) === INSECURE_TEST_CHALLENGE_TOKEN;
}

/** `normalize`: lowercase and trim, the guide's own shape. */
function normalizeContact(raw: string): string {
  return raw.trim().toLowerCase();
}

/** `lookup`: resolve a normalized contact against the static demo roster. */
async function lookupContact(contact: string): Promise<string | null> {
  return MEMBER_ROSTER.get(contact) ?? null;
}

/** The showcase's second-audience login channel: the guide's worked exemplar, live. */
export const memberChannel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: captureDeliver,
  lookup: lookupContact,
  normalize: normalizeContact,
  challenge: insecureTestChallenge,
  cookie: { name: 'member_session' },
});
