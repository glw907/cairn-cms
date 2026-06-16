// The pure upload-envelope to outcome mapper. The insert popover's optimistic loop posts the bytes
// and reads back a SvelteKit form-action result (or a manual-redirect Response shape); this turns
// that raw shape into the one decision the popover acts on: insert the reference, show a typed
// failure card, or treat the session as expired. Keeping it pure lets the branch logic unit-test
// without a browser or a real fetch.
//
// Node-safe (no @codemirror, no DOM): it imports only the MediaEntry and UploadResult types, which
// are erased at build time.
import type { MediaEntry } from '../media/manifest.js';
import type { UploadResult } from '../sveltekit/content-routes.js';
import type { IngestFailureKind } from './client-ingest.js';
import { mediaToken } from '../media/reference.js';

/** A failure the card surfaces. The ingest taxonomy plus a `generic` catch-all for a refuse reason
 *  with no specific author-facing card (a binding-missing, a length-required, a parse miss). */
export type UploadFailureKind = IngestFailureKind | 'generic';

/** The outcome the popover acts on. `inserted` swaps the placeholder for the reference and records
 *  the entry; `failed` cancels the placeholder and shows the typed card; `session-expired` cancels
 *  the placeholder and tells the author to sign in again. */
export type UploadOutcome =
  | { kind: 'inserted'; reference: string; record: MediaEntry; reused: boolean }
  | { kind: 'failed'; failure: UploadFailureKind }
  | { kind: 'session-expired' };

/** The shape the popover hands in: either a parsed SvelteKit action result (success or failure) or a
 *  bare response signal for the redirect and network-error cases. The popover deserializes the body
 *  for the success and failure cases and passes the raw `response.type`/`response.status` for the
 *  redirect case, so this one mapper covers every branch. */
export type UploadEnvelope =
  | { type: 'success'; status?: number; data: UploadResult }
  | { type: 'failure'; status?: number; data?: { error?: string } }
  | { type: 'redirect'; status?: number }
  | { type: 'error'; status?: number }
  | { type: 'opaqueredirect'; status?: number };

// The server refuse reasons mapped to a card kind. `too-large` keeps its own card; an unsupported
// type reads as a decode failure to the author (the bytes the browser sent are a type the server
// will not store); `session-expired` is its own outcome. Every other reason (binding-missing,
// media-disabled, csrf, length-required, hash-collision) is an operational refusal with no
// author-actionable specifics, so it collapses to the generic card.
const REFUSE_TO_FAILURE: Record<string, UploadFailureKind | 'session-expired'> = {
  'too-large': 'too-large',
  'unsupported-type': 'decode-unsupported',
  'session-expired': 'session-expired',
};

/**
 * Map a parsed upload envelope to the single outcome the popover acts on. A success envelope yields
 * an `inserted` outcome carrying the reference, the record, and the dedup flag. A failure envelope
 * maps its refuse reason to a typed card, with `session-expired` lifted to its own outcome. An
 * opaque or status-0 response (the guard's `redirect: 'manual'` 303) is a session-expired signal, as
 * is any redirect-typed result. An error-typed result with a real status is a generic failure.
 */
export function uploadOutcome(envelope: UploadEnvelope): UploadOutcome {
  switch (envelope.type) {
    case 'success':
      return {
        kind: 'inserted',
        // Re-derive the reference from the validated record fields rather than trusting the loose
        // server `reference` string: the token is inserted unescaped into the markdown URL slot, so
        // the insert depends only on grammar-constrained fields (a 16-hex hash, a slugified slug)
        // instead of an arbitrary server string. Defense in depth, in case a future server path
        // returns a reference that does not match the record.
        reference: mediaToken({ slug: envelope.data.record.slug, hash: envelope.data.record.hash }),
        record: envelope.data.record,
        reused: envelope.data.reused,
      };
    case 'failure': {
      const reason = envelope.data?.error ?? '';
      const mapped = REFUSE_TO_FAILURE[reason];
      if (mapped === 'session-expired') return { kind: 'session-expired' };
      return { kind: 'failed', failure: mapped ?? 'generic' };
    }
    case 'redirect':
    case 'opaqueredirect':
      return { kind: 'session-expired' };
    case 'error':
      // A manual-redirect Response surfaces as type 'opaqueredirect' or status 0; a status-0 error
      // is that same expired-session signal. A real error status is a genuine transport failure.
      return (envelope.status ?? 0) === 0 ? { kind: 'session-expired' } : { kind: 'failed', failure: 'generic' };
  }
}
