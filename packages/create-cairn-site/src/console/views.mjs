// The console's two live views: propagation (the primary hold, watching a domain cut over) and
// the Builds watch (watching the first Workers Builds deploy). Both are pure functions of one
// HoldObservation (hold-loop.mjs's own contract, built through its makeObservation factory in
// every caller and fixture) and the state record, read only through render.mjs's pickAllowlist.
// Neither view issues an API or DNS call of its own; the hold loop is the one probe owner
// (hold-loop.mjs's own header), and a view here only reads what it was last handed.
import { BUILD_HOLD_CLASS, DISPLAY_REFRESH_SECONDS, PROPAGATION_HOLD_CLASS } from '../hold-loop.mjs';
import { escapeHtml, pickAllowlist } from './render.mjs';

/** The record fields the propagation view is allowed to read. */
const PROPAGATION_RECORD_FIELDS = ['cloudflare.domain'];

/** The record fields the Builds view is allowed to read. */
const BUILDS_RECORD_FIELDS = ['cloudflare.domain', 'cloudflare.workerName'];

/**
 * What each marker-probe outcome means, in plain terms, for the propagation view's own
 * explanatory line. `hostname-not-serving` never mid-hold surfaces to `live`; hostname.mjs's own
 * hold seam retries it as an ordinary not-cleared observation, so it is still worth naming here
 * for the rare case the console renders one final frame at expiry.
 */
const MARKER_OUTCOME_MEANINGS = {
  live: 'Your site answers correctly over HTTPS.',
  'hostname-records-absent':
    'Your domain does not resolve yet, even at its own nameservers. This is a normal step right after connecting a domain.',
  'hostname-resolver-lagging':
    "Your domain already resolves at its own nameservers; only your machine's resolver has not caught up yet.",
  'certificate-pending': 'Your domain answers over plain HTTP; the HTTPS certificate has not finished issuing yet.',
  'hostname-not-serving': 'Your domain resolves and answers, but what answers is not your site.',
};

/**
 * Format one DNS answer array for display: `null` means no lookup was attempted, an empty array
 * means the lookup ran and found nothing, and a populated array is rendered as its raw records.
 * @param {unknown[] | null} answer the answer to format
 * @returns {string} a plain-text rendering
 */
function formatDnsAnswer(answer) {
  if (answer == null) return 'not read';
  if (answer.length === 0) return 'no record found';
  return answer.map((entry) => JSON.stringify(entry)).join(', ');
}

/**
 * The certificate cell's own text, driven solely by the marker outcome. Certificate issuance
 * cannot be polled with this token (hostname.mjs's own header), so anything but the two outcomes
 * that settle it one way or the other reports the honest "not knowable yet" rather than a status
 * this view would have to invent.
 * @param {string | null} markerOutcome the marker probe's own conclusion, or `null` when no probe
 *  has run yet
 * @returns {string} the sentence the certificate cell renders
 */
function certificateText(markerOutcome) {
  switch (markerOutcome) {
    case 'live':
      return 'Issued (your site answers over HTTPS).';
    case 'certificate-pending':
      return 'Not yet issued (your site answers over plain HTTP).';
    default:
      return 'Not yet knowable: this only becomes readable once the site answers at all.';
  }
}

/**
 * Render the authoritative-DNS row. When the read fell back to the recursive resolver
 * (`lowConfidence`), the answer is explicitly labeled as unavailable rather than shown, since
 * presenting a recursive-fallback answer under the "authoritative" heading is exactly the
 * mislabeling this view exists to prevent.
 * @param {{ authoritative: unknown[] | null, lowConfidence: boolean }} detail the propagation detail
 * @returns {string} one paragraph of body HTML
 */
function renderAuthoritativeRow({ authoritative, lowConfidence }) {
  const reading = lowConfidence
    ? 'not available; the read fell back to the recursive resolver (low confidence)'
    : escapeHtml(formatDnsAnswer(authoritative));
  return `<p class="cairn-console-dns-authoritative">Authoritative (your domain's own nameservers): ${reading}</p>`;
}

/**
 * Render the propagation view: both DNS answers honestly labeled, the marker-probe outcome and
 * what it means, and a certificate cell driven solely by the marker outcome, never a fabricated
 * status (certificate issuance is unpollable with this token; see hostname.mjs's own header).
 * @param {import('../hold-loop.mjs').HoldObservation} observation the hold loop's last observation
 * @param {object} record the full state record, read only through the allowlist above
 * @returns {import('./server.mjs').ConsoleView} the view to render
 */
export function renderPropagationView(observation, record) {
  const safe = pickAllowlist(record, PROPAGATION_RECORD_FIELDS);
  const domain = safe.cloudflare?.domain ?? 'your domain';
  const detail = observation?.detail ?? {};
  const markerOutcome = detail.markerOutcome ?? null;

  const certText = certificateText(markerOutcome);

  const markerMeaning = markerOutcome
    ? (MARKER_OUTCOME_MEANINGS[markerOutcome] ?? markerOutcome)
    : 'Not checked yet.';

  const bodyHtml = [
    `<h1>Watching ${escapeHtml(domain)}</h1>`,
    renderAuthoritativeRow(detail),
    `<p class="cairn-console-dns-recursive">Recursive (your machine's resolver): ${escapeHtml(formatDnsAnswer(detail.recursive))}</p>`,
    `<p class="cairn-console-marker">Marker probe: ${escapeHtml(markerOutcome ?? 'not checked yet')}. ${escapeHtml(markerMeaning)}</p>`,
    `<p class="cairn-console-cert">Certificate: ${escapeHtml(certText)}</p>`,
  ].join('\n');

  return { title: 'Watching your domain', bodyHtml, refreshSeconds: DISPLAY_REFRESH_SECONDS[PROPAGATION_HOLD_CLASS] };
}

/**
 * Render the Builds watch view: discovery (no build matched yet) versus a discovered build's own
 * state, queued through running to its settled outcome, and the commit it matched.
 * @param {import('../hold-loop.mjs').HoldObservation} observation the hold loop's last observation
 * @param {object} record the full state record, read only through the allowlist above
 * @returns {import('./server.mjs').ConsoleView} the view to render
 */
export function renderBuildsView(observation, record) {
  const safe = pickAllowlist(record, BUILDS_RECORD_FIELDS);
  const workerName = safe.cloudflare?.workerName ?? safe.cloudflare?.domain ?? 'your site';
  const detail = observation?.detail ?? {};

  const heading = `<h1>Watching the Workers Builds deploy for ${escapeHtml(workerName)}</h1>`;
  const rows = detail.buildUuid
    ? [
        `<p class="cairn-console-build-id">Build: ${escapeHtml(detail.buildUuid)}</p>`,
        `<p class="cairn-console-build-status">Status: ${escapeHtml(detail.status ?? 'unknown')}</p>`,
        `<p class="cairn-console-build-outcome">Outcome: ${escapeHtml(detail.outcome ?? 'not yet settled')}</p>`,
        `<p class="cairn-console-build-commit">Commit: ${escapeHtml(detail.commitSha ?? 'unknown')}</p>`,
      ]
    : ['<p class="cairn-console-build-discovering">Still discovering the build that matches your push.</p>'];
  const bodyHtml = [heading, ...rows].join('\n');

  return { title: 'Watching your build', bodyHtml, refreshSeconds: DISPLAY_REFRESH_SECONDS[BUILD_HOLD_CLASS] };
}
