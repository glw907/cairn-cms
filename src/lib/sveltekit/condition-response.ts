// The runtime renderer leg of the diagnostics model: map a condition to the Response the guard
// serves. Re-homes the three rejection responses guard.ts built inline, keyed by condition id, so
// the guard's reason, the registered condition, and the served page stay in step.
import { brandedAdminPage } from './admin-response.js';
import { httpsRequiredPage } from './https-required-page.js';
import { csrfRequiredPage } from './csrf-required-page.js';
import { identityUnresolvedPage } from './identity-unresolved-page.js';
import { identityUnknownPage } from './identity-unknown-page.js';
import { escapeHtml } from '../escape.js';
import { renderStaticAdminPage } from './static-admin-page.js';
import { condition, type CairnCondition } from '../diagnostics/index.js';

/** The guard.rejected reasons, each mapped to its registered condition id. */
export const REASON_CONDITION = {
  https: 'edge.https-not-forced',
  csrf: 'auth.csrf-token-invalid',
  origin: 'auth.csrf-origin-mismatch',
  bindings: 'config.bindings-missing',
  identity: 'auth.identity-unresolved',
} as const;

/**
 * The unrostered-identity condition id, spelled once here so the guard's second identity-branch
 * switch case and this renderer never drift onto different strings. It carries no `guard.rejected`
 * reason: an unrostered but resolved identity refuses through its own path, not the reason table
 * above.
 */
export const IDENTITY_UNKNOWN_CONDITION = 'auth.identity-unknown' as const;

/**
 * A branded page for an operator fault, built straight from the registered condition's fields so
 * the served copy, the doctor's report, and the readiness checklist say the same thing.
 */
function conditionFaultPage(cond: CairnCondition): string {
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    Site setup required
  </span>
  <h1>${escapeHtml(cond.title)}</h1>
  <p>${escapeHtml(cond.why)}</p>

  <div class="fix">
    <h2>If you run this site</h2>
    <p>${escapeHtml(cond.remediation)}</p>
  </div>`;
  return renderStaticAdminPage({ title: `${cond.title} · Cairn`, innerHtml: inner });
}

/** Render the Response the guard serves for a rejection, by its condition id. */
export function renderConditionResponse(
  id: string,
  ctx: { url?: URL; email?: string; label?: string } = {},
): Response {
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
    case REASON_CONDITION.bindings:
      // An operator fault, not a request fault: the Worker deployed without its bindings.
      return brandedAdminPage(500, conditionFaultPage(condition(id)));
    case REASON_CONDITION.identity:
      return brandedAdminPage(403, identityUnresolvedPage(ctx.label));
    case IDENTITY_UNKNOWN_CONDITION:
      return brandedAdminPage(403, identityUnknownPage(ctx.email ?? '', ctx.label));
    default:
      throw new Error(`no runtime renderer for condition: ${id}`);
  }
}
