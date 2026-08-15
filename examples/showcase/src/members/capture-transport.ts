// cairn-cms: the showcase's capture delivery transport, the harness pattern that proves a
// channel end to end (docs/extend/add-a-second-audience.md): instead of sending
// anything, it remembers the last code and a delivery count per contact in module state, so the
// /test/last-otp route (a later task) can read a code back without polling a real inbox or the
// database directly. It carries devDelivery's own in-body refusal
// (ctx.env.CAIRN_DEV_BACKEND === '1'), checked inside this function so a wrapper cannot bypass
// it, which also keeps a default showcase deploy from holding OTP codes in Worker memory.
import type { DeliverContext } from '@glw907/cairn-cms/auth-channel';

/** One contact's captured delivery: the last code sent and how many times a code was sent. */
export interface Capture {
  /** The most recently delivered code for this contact. */
  code: string;
  /** How many times a code has been delivered to this contact since the last reset. */
  count: number;
}

/** Captured deliveries, keyed by the normalized contact so each roster member's history is separate. */
const captures = new Map<string, Capture>();

/**
 * The member channel's `deliver`: records `code` for `contact` instead of sending it anywhere,
 * refusing unless `ctx.env.CAIRN_DEV_BACKEND === '1'` (mirroring `devDelivery`'s own precedent).
 * Keys both the code and the count per contact, so two roster members requesting concurrently
 * never see each other's code.
 * @throws Error when `ctx.env.CAIRN_DEV_BACKEND` is not `'1'`.
 */
export async function captureDeliver<Env extends { CAIRN_DEV_BACKEND?: string | boolean }>(
  contact: string,
  code: string,
  ctx: DeliverContext<Env>,
): Promise<void> {
  if (ctx.env?.CAIRN_DEV_BACKEND !== '1') {
    throw new Error(
      'captureDeliver: refusing to deliver without CAIRN_DEV_BACKEND=1; this transport is dev-only',
    );
  }
  const existing = captures.get(contact);
  captures.set(contact, { code, count: (existing?.count ?? 0) + 1 });
}

/** Read back the last captured code and delivery count for `contact`, or null when none exists. */
export function readCapture(contact: string): Capture | null {
  return captures.get(contact) ?? null;
}

/** Clear every captured delivery. The `/test/reset-members` route calls this between e2e runs. */
export function resetCapture(): void {
  captures.clear();
}
