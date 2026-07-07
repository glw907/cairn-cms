/**
 * REFERENCE IMPLEMENTATION (Fable, 2026-07-06) — Stripe webhook verification for the
 * phase-2 payments absorption (pass 2.2 lifts this; the old ops code's hand-rolled
 * verify at aksailingclub-org/src/lib/stripe.js is the behavioral reference — this is
 * its clean re-derivation with the same guarantees, Workers-native.
 *
 * Guarantees: signature verified over the RAW body (never a re-serialization);
 * constant-time digest comparison; a bounded replay window; multiple v1 signatures
 * tolerated (Stripe sends several during secret rotation); fail-closed everywhere.
 */

const REPLAY_WINDOW_SECONDS = 300;

export interface VerifiedStripeEvent {
  event: unknown;          // the parsed event; caller narrows by type
  timestamp: number;       // the verified header timestamp
}

export async function verifyStripeWebhook(
  rawBody: string,          // MUST be await request.text(), untouched
  signatureHeader: string | null,
  webhookSecret: string,    // the whsec_... value, used verbatim as UTF-8 key bytes
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<VerifiedStripeEvent> {
  if (!signatureHeader) throw new Error('missing Stripe-Signature header');

  // Header shape: t=1699999999,v1=hex,v1=hex,v0=...
  const parts = new Map<string, string[]>();
  for (const seg of signatureHeader.split(',')) {
    const i = seg.indexOf('=');
    if (i < 1) continue;
    const k = seg.slice(0, i).trim(), v = seg.slice(i + 1).trim();
    parts.set(k, [...(parts.get(k) ?? []), v]);
  }
  const t = Number(parts.get('t')?.[0]);
  const v1s = parts.get('v1') ?? [];
  if (!Number.isFinite(t) || v1s.length === 0) throw new Error('malformed Stripe-Signature');
  if (Math.abs(nowSeconds - t) > REPLAY_WINDOW_SECONDS) throw new Error('signature outside replay window');

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`),
  ));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');

  // Constant-time compare against EVERY provided v1 (rotation tolerance);
  // accumulate so match-position never shortcuts.
  let anyMatch = 0;
  for (const sig of v1s) {
    let diff = sig.length ^ expected.length;
    const len = Math.max(sig.length, expected.length);
    for (let i = 0; i < len; i++) {
      diff |= (sig.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
    }
    anyMatch |= diff === 0 ? 1 : 0;
  }
  if (anyMatch !== 1) throw new Error('signature verification failed');

  return { event: JSON.parse(rawBody), timestamp: t };
}

/* ---- Acceptance tests (pass 2.2 makes these real) ----
 * 1. A Stripe-CLI-generated fixture verifies end to end.
 * 2. Tampered body (1 byte) -> throws; tampered timestamp -> throws.
 * 3. t outside ±300s -> throws (both directions).
 * 4. Rotation: [bad v1, good v1] verifies; [bad, bad] throws.
 * 5. Missing header / malformed header / non-numeric t -> throws.
 * 6. The caller contract: rawBody must be the exact text() — a test that re-stringifies
 *    JSON.parse(rawBody) and fails verification documents WHY the contract exists.
 * 7. Dispatch pattern downstream (from the old worker, kept): branch on
 *    session.metadata.type / metadata.assignment_id; unknown metadata -> log + 200
 *    (ack, don't retry-loop) but NO state change.
 */
