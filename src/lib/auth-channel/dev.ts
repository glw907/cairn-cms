// cairn-cms: the dev-only delivery transport for createAuthChannel. Prints the code to the
// console instead of sending it, so local development needs no real SMS or email provider. The
// refusal lives inside this function's own body, not in a caller's wrapper: a site writing
// `deliver: (c, code, ctx) => devDelivery(c, code, ctx)` still refuses at call time without the
// dev flag, the same failure mode v2 of the design left unclosed with a two-argument signature.
// Nothing here imports `$app/*`.
import type { DeliverContext } from './factory.js';

/**
 * Print a channel code to the console instead of delivering it, refusing unless
 * `ctx.env.CAIRN_DEV_BACKEND === '1'`, the same positive signal `createAuthGuard` reads
 * (`guard.ts`). A correctly built production deployment never sets this flag, so the refusal
 * runs at every call, not only when a site forgets to swap the transport.
 *
 * The printed line carries the code in plaintext by design (that is the whole point of a dev
 * transport) and deliberately bypasses the engine's structured `log` chokepoint, whose channel
 * events never carry a code or a contact.
 * @throws Error when `ctx.env.CAIRN_DEV_BACKEND` is not `'1'`.
 */
export async function devDelivery<Env extends { CAIRN_DEV_BACKEND?: string | boolean }>(
  contact: string,
  code: string,
  ctx: DeliverContext<Env>,
): Promise<void> {
  if (ctx.env?.CAIRN_DEV_BACKEND !== '1') {
    throw new Error(
      'devDelivery: refusing to deliver without CAIRN_DEV_BACKEND=1; this transport is dev-only',
    );
  }
  console.log(`[cairn-cms auth-channel] dev delivery to ${contact}: ${code}`);
}
