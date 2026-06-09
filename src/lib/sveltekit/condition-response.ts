// The runtime renderer leg of the diagnostics model: map a condition to the Response the guard
// serves. Re-homes the three rejection responses guard.ts built inline, keyed by condition id, so
// the guard's reason, the registered condition, and the served page stay in step.
import { brandedAdminPage } from './admin-response.js';
import { httpsRequiredPage } from './https-required-page.js';
import { csrfRequiredPage } from './csrf-required-page.js';
import { condition } from '../diagnostics/index.js';

/** The guard.rejected reasons, each mapped to its registered condition id. */
export const REASON_CONDITION = {
  https: 'edge.https-not-forced',
  csrf: 'auth.csrf-token-invalid',
  origin: 'auth.csrf-origin-mismatch',
} as const;

export type GuardReason = keyof typeof REASON_CONDITION;

/** Render the Response the guard serves for a rejection, by its condition id. */
export function renderConditionResponse(id: string, ctx: { url?: URL } = {}): Response {
  // Assert the id is registered before rendering, keeping the renderer in 1:1 with the registry.
  condition(id);
  switch (id) {
    case REASON_CONDITION.https: {
      const httpsUrl = new URL(ctx.url!);
      httpsUrl.protocol = 'https:';
      return brandedAdminPage(400, httpsRequiredPage(httpsUrl.toString()));
    }
    case REASON_CONDITION.csrf:
      return brandedAdminPage(403, csrfRequiredPage());
    case REASON_CONDITION.origin:
      return new Response('Cross-site POST form submissions are forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    default:
      throw new Error(`no runtime renderer for condition: ${id}`);
  }
}
