// cairn-cms: the public preview link's mint and revoke actions (spec part 3, "Public preview for a
// non-editor"). createPreviewActions closes over the shared ContentRoutesContext
// (content-routes-context.ts), built once per call by createContentRoutesInternal;
// createContentRoutes, the public entry point, is only a thin wrapper around it.
import { error, fail, type ActionFailure } from '@sveltejs/kit';
import { requireOrigin } from '../env.js';
import { previewMint, previewRevoke, type PreviewMintOutcome, type PreviewRevokeOutcome } from './preview.js';
import { isMissingTableError, type ContentFormFailure } from './content-routes-shared.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';

/**
 * A refused preview mint or revoke: `fail(400)` when a mint's entry carries no pending draft to
 *  share, or `fail(500)` when `AUTH_DB` is missing the `preview_tokens` table
 *  (migrations/0003_preview.sql not yet applied), an actionable message naming the fix rather
 *  than a raw D1 error. Both `previewMintAction` and `previewRevokeAction` answer the missing-
 *  table case with this same shape, since an upgraded, non-adopting site still ships the share
 *  affordance to every editor. Module-internal (`convention-internal-sibling-comment`): flattened
 *  into {@link ContentFormFailure}; stays only as a `satisfies` validation shape.
 */
interface PreviewMintFailure {
  /** The one-line human summary the edit screen's share panel shows on a refused mint or revoke. */
  error: string;
}

/**
 * The actionable refusal both `previewMintAction` and `previewRevokeAction` answer when
 *  `AUTH_DB` is missing the `preview_tokens` table (migrations/0003_preview.sql not yet applied),
 *  naming the fix rather than surfacing a raw D1 error.
 */
function missingPreviewTableFailure(): ActionFailure<ContentFormFailure> {
  return fail(500, {
    error: 'The preview_tokens table is missing. Apply migrations/0003_preview.sql to AUTH_DB, then try again.',
  } satisfies PreviewMintFailure);
}

/**
 * Build the public preview link's mint and revoke actions, closed over the shared content-routes
 *  context.
 */
export function createPreviewActions(ctx: ContentRoutesContext) {
  /**
   * Mint a public preview link for an entry's pending draft (spec part 3, "Public preview for a
   *  non-editor"). This action is the route half of `previewMint` (preview.ts): it names the
   *  target from the route's own params and dresses each outcome in the refusal this screen
   *  speaks, while the entry-scoped authorization, the draft check, the token hygiene, and the
   *  `preview.token.minted` log all live in `previewMint` itself, so the engine's own route and a
   *  site's custom mint run the identical sequence and log the identical event.
   *
   *  Returns the minted URL and expiry directly (no redirect), so the edit screen's share
   *  affordance can show and copy it in place. Refuses on the page when the entry carries no
   *  pending draft (there is nothing to share) or when `AUTH_DB` is missing the `preview_tokens`
   *  table, naming the migration to apply rather than surfacing a raw D1 error.
   */
  async function previewMintAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure> | { url: string; expiresAt: number }> {
    const env = event.platform?.env ?? {};
    const conceptId = event.params.concept ?? '';
    const id = event.params.id ?? '';

    // previewMint runs its own authorization sequence first (requireEditor, then
    // requireEngineAccess against the target concept), so a refused editor's outcome reaches them
    // before requireOrigin's site-misconfiguration throw ever runs. requireOrigin only guards the
    // URL this action addresses on success, so it waits until a mint actually succeeds. The trade:
    // a site with no PUBLIC_ORIGIN configured still lets previewMint write the preview-token row
    // before requireOrigin throws, so that row sits unreachable (no URL was ever returned to share
    // it) until its own TTL expires it, rather than the misconfiguration being caught up front.
    let result: PreviewMintOutcome;
    try {
      result = await previewMint(ctx.runtime, ctx.deps.preview ?? {}, event, { concept: conceptId, entryId: id });
    } catch (err) {
      if (isMissingTableError(err)) return missingPreviewTableFailure();
      throw err;
    }

    switch (result.outcome) {
      // The target came from the route's params, so a bad target is a bad address: both answer
      // exactly what `requireEntryFromParams` answers for the same fault on every other action.
      case 'unknown-concept':
        throw error(404, `Unknown content type: ${conceptId}`);
      case 'invalid-id':
        throw error(400, 'Invalid entry id');
      case 'no-draft':
        return fail(400, {
          error: 'This entry has no unpublished draft to share. Save an edit first.',
        } satisfies PreviewMintFailure);
    }

    const origin = requireOrigin(env);

    // The response body carries the bearer credential (the token, inside the URL); never let a
    // shared cache or intermediary retain it.
    event.setHeaders({ 'cache-control': 'no-store' });
    // Built from the configured origin, never event.url.origin (host-header-controlled on
    // Cloudflare): the token is never interpolated into anything but this return value, so it can
    // never reach an error message.
    return { url: `${origin}/preview/${result.token}`, expiresAt: result.expiresAt };
  }

  /**
   * Revoke every outstanding preview link for an entry: one delete by concept and id, the
   *  mis-shared-link remedy. This action is the route half of `previewRevoke` (preview.ts): it
   *  names the target from the route's own params and dresses each outcome in the refusal this
   *  screen speaks, while the entry-scoped authorization, the delete, and the
   *  `preview.token.revoked` log all live in `previewRevoke` itself, so the engine's own route and
   *  a site's custom revoke run the identical sequence and log the identical event. Idempotent:
   *  revoking with no minted links succeeds with a count of zero. The engine ships this affordance
   *  to every upgraded site's edit screen regardless of adoption, so a missing `preview_tokens`
   *  table answers the same actionable refusal minting does, naming the migration, rather than a
   *  raw D1 error.
   */
  async function previewRevokeAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure> | { count: number }> {
    const conceptId = event.params.concept ?? '';
    const id = event.params.id ?? '';

    // previewRevoke runs its own authorization sequence first (requireEditor, then
    // requireEngineAccess against the target concept), the same ordering previewMint runs, so a
    // refused editor's outcome reaches them before any D1 read.
    let result: PreviewRevokeOutcome;
    try {
      result = await previewRevoke(ctx.runtime, event, { concept: conceptId, entryId: id });
    } catch (err) {
      if (isMissingTableError(err)) return missingPreviewTableFailure();
      throw err;
    }

    switch (result.outcome) {
      // The target came from the route's params, so a bad target is a bad address: both answer
      // exactly what `requireEntryFromParams` answers for the same fault on every other action.
      case 'unknown-concept':
        throw error(404, `Unknown content type: ${conceptId}`);
      case 'invalid-id':
        throw error(400, 'Invalid entry id');
    }

    return { count: result.count };
  }

  return { previewMintAction, previewRevokeAction };
}
