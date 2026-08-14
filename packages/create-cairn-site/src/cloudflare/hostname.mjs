// The rollback-safe cutover: attach the admin's domain to the already-deployed Worker, confirm
// it actually serves this site, then move the site's own recorded origin over and redeploy.
// Every finding below traces to the T4a domain spike (docs/internal/2026-08-11-t4a-domain-spike.md),
// particularly its Step 4 and "Addendum 2: the scratch domain".
//
// This attaches a Workers CUSTOM DOMAIN (`PUT /accounts/:id/workers/domains`), never a Workers
// Route: a route is a pattern match applied to traffic that already reaches Cloudflare, so a
// route with no DNS record behind it resolves to nothing and a confirm against it can never
// pass. A Custom Domain is the mechanism that both creates the DNS record and issues the
// certificate.
//
// The attach writes a proxied AAAA at the apex pointing at 100:: (the IPv6 discard prefix) and
// no A record; that is the mechanism behind "Cloudflare will create DNS records on your
// behalf". records.mjs's carry-over gate already warns an admin whose apex carries an existing
// address record about this collision; this module does not repeat that warning, since by the
// time it runs the carry-over gate has already been shown and answered.
//
// The attach is IDEMPOTENT (Addendum 2, observed live): an identical second PUT returns HTTP 200
// with the same domain id and cert_id, not a duplicate error. api.mjs's own error mapping
// already turns any failed attach into 'custom-domain-failed', so this module adds no
// duplicate-error branch of its own; a retry after a failure simply re-attaches.
//
// THE CONFIRM IS THE HARD PART. Addendum 2 observed, on a zone minutes old, immediately after a
// successful attach: HTTPS fails the TLS handshake (an OpenSSL "sslv3 alert handshake failure")
// while plain HTTP serves the site's marker pair correctly. The certificate is issued
// asynchronously after the attach, so a confirm that only tries HTTPS fails on every new zone,
// and fails with a transport error rather than an HTTP status. confirmHostname therefore falls
// back to HTTP whenever HTTPS fails at the transport level, and reads what HTTP shows to tell
// "certificate still issuing" apart from "genuinely not serving": if HTTP answers the marker
// pair, only the certificate is missing (certificate-pending, a wait row, not a broken site); if
// HTTP does not connect either, the hostname has not finished propagating; and if HTTP connects
// but answers something else, the hostname resolves to something that is not this site
// (hostname-not-serving, the observed shape being a 522 with a 16-byte plain-text body, "error
// code: 522", not an HTML page).
//
// THE PROPAGATION SPLIT (Task 2, closing carry-forward 1): a live run measured 27 minutes parked
// on this last "not connecting at all" case while the zone's authoritative nameservers were
// already serving the apex AAAA record the whole time, a resolver-side negative cache, not a
// records problem. When neither http nor https connects at all, confirmHostname reads the apex
// AAAA record against the zone's own authoritative nameservers (the same negative-cache-immune
// read records.mjs and dns.mjs's header both document): present there but still unreachable
// means only the caller's resolver is behind (hostname-resolver-lagging, a self-clearing wait);
// absent there too means the record genuinely has not been created or propagated to the zone's
// own nameservers yet (hostname-records-absent). The DNS context is optional and absent-safe: a
// caller that passes none (chapter3.mjs's own call site, untouched by this split) gets the
// conservative default with no lookup attempted at all, never a crash and never a real DNS call
// it did not ask for. Either way, this only ever refines WHICH wait row is reported: the marker
// pair above stays the sole authority for `live`, and a DNS presence never overrides a failing or
// mismatched marker probe.
//
// THE HOLD SEAM (Task 4a): the propagation wait above is one of the two classes this tool holds
// in process with a console up rather than parking on. The seam is one optional injected
// `waitForClear`, threaded around the PRE-REDEPLOY confirm only; see cutOverHostname's own doc
// block for why the re-check after the redeploy stays one-shot. The attach sits outside the loop
// (it is idempotent, but re-attaching per poll would be pointless traffic), and absent the
// injection every path here is byte-identical to what it was before the console existed.
//
// Certificate issuance CANNOT be polled through the Cloudflare API with this token: both
// GET /zones/:id/ssl/certificate_packs and GET /zones/:id/ssl/verification returned 9109
// Unauthorized even with SSL and Certificates Edit granted at Zone scope. Progress is observed
// by probing the hostname itself, which is exactly what confirmHostname does.
import { deployWorker } from './deploy.mjs';
import { writePublicOrigin } from './config.mjs';
import { cloudflareError } from './catalogue.mjs';
import { readAuthoritativeAndRecursive } from './dns.mjs';

/** The path the site-specific marker's `/admin` redirect must land on. */
const ADMIN_LOGIN_PATH = '/admin/login';

/**
 * Probe one origin for the site-specific marker pair: `/` answers 200, and `/admin` answers 303
 * to `/admin/login`. `/admin` is fetched with `redirect: 'manual'` so the 303 itself is read
 * rather than followed, since a status-only check on the followed response could not tell this
 * site's redirect from any other 200.
 * @param {string} origin the scheme and hostname to probe, no trailing slash (`https://example.com`)
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @returns {Promise<boolean>} true when both markers match
 */
async function matchesMarker(origin, fetchImpl) {
  const root = await fetchImpl(`${origin}/`);
  const admin = await fetchImpl(`${origin}/admin`, { redirect: 'manual' });
  if (root.status !== 200 || admin.status !== 303) return false;

  const location = admin.headers.get('location');
  if (!location) return false;
  return new URL(location, origin).pathname === ADMIN_LOGIN_PATH;
}

/**
 * Probe one origin, distinguishing a transport-level failure (no listener, DNS not resolved yet,
 * TLS handshake failure) from a real answer that simply does not match the marker.
 * @param {string} origin the scheme and hostname to probe
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @returns {Promise<{ reachable: boolean, matches: boolean }>} `reachable` false means the probe
 *  never got an HTTP response at all; `matches` is only meaningful when `reachable` is true
 */
async function probeOrigin(origin, fetchImpl) {
  try {
    return { reachable: true, matches: await matchesMarker(origin, fetchImpl) };
  } catch {
    return { reachable: false, matches: false };
  }
}

/**
 * @typedef {object} DnsContext
 * @property {(servers?: string[]) => object} [resolve] resolver factory forwarded to the shared
 *  DNS helper (`dns.mjs`'s `readAuthoritativeAndRecursive`); when omitted, the unreachable-case
 *  diagnosis below is skipped entirely and confirmHostname reports its conservative default
 *  (`hostname-records-absent`) with no DNS lookup attempted at all
 * @property {string[]} [nameServers] the zone's own nameserver hostnames, when already known
 *  (for example a saved `record.cloudflare.nameServers`); skips the NS discovery lookup the
 *  helper otherwise makes
 */

/**
 * @typedef {object} DnsReading
 * @property {unknown[] | null} authoritative the apex answer read against the zone's own
 *  nameservers; `null` when no authoritative source could be found
 * @property {unknown[] | null} recursive the same answer through the ordinary recursive resolver;
 *  `null` when no lookup was attempted at all, which is how a caller tells "not read" from "read,
 *  and empty"
 * @property {boolean} lowConfidence whether the authoritative read fell back to the recursive
 *  resolver, so its answer is not authoritative evidence
 */

/** What a confirm reports when it never needed a DNS lookup to reach its verdict. */
const NO_DNS_READING = Object.freeze({ authoritative: null, recursive: null, lowConfidence: false });

/**
 * Diagnose the "neither http nor https connects at all" case: read the apex AAAA record (the
 * same record the Custom Domain attach itself writes, per this module's header) against the
 * zone's own authoritative nameservers, which no recursive negative cache sits in front of.
 * Present there means only the caller's own resolver has not caught up yet, a self-clearing
 * wait; absent there too means the record genuinely is not there yet. Never throws: a DNS hiccup
 * during this best-effort diagnosis falls back to the conservative records-absent default, the
 * same as no DNS context being given at all.
 *
 * The reading itself is returned beside the outcome, not just the code it implies: a held
 * propagation wait renders both answers in its console view, and the loop that polls is the one
 * process allowed to read DNS (the console never looks anything up at render time), so the read
 * this call already made is the one the view must be built from rather than a second one.
 * @param {string} domain the domain to probe, no scheme
 * @param {DnsContext} dns the DNS context; absent-safe (see `confirmHostname`)
 * @returns {Promise<{ outcome: 'hostname-resolver-lagging' | 'hostname-records-absent',
 *  reading: DnsReading }>} the split outcome and the answers it was concluded from
 */
async function diagnoseUnreachable(domain, { resolve, nameServers } = {}) {
  if (!resolve) return { outcome: 'hostname-records-absent', reading: NO_DNS_READING };

  const reading = await readAuthoritativeAndRecursive({
    domain,
    name: domain,
    method: 'resolve6',
    nameServers,
    resolve,
  });
  const authoritativePresent =
    Array.isArray(reading.authoritative) && reading.authoritative.length > 0;
  return {
    outcome: authoritativePresent ? 'hostname-resolver-lagging' : 'hostname-records-absent',
    reading,
  };
}

/**
 * Confirm the domain answers with this site, distinguishing every outcome the spike observed.
 * HTTPS is tried first; only when it fails at the transport level (no HTTP response reached at
 * all, whether from a missing certificate, DNS not yet resolving, or a refused connection) does
 * this fall back to plain HTTP, which needs no certificate and so isolates whether the site
 * itself is reachable. Exported for chapter3.mjs's own live check (the first Builds deploy's
 * completion), which reuses this rather than rebuilding it; a workers.dev origin needs its scheme
 * stripped by the caller, since this takes a bare domain, no scheme.
 *
 * When neither http nor https connects at all, `dns` (optional, absent-safe) refines which wait
 * row is reported (see this module's header for the propagation split); the DNS answer only ever
 * upgrades that diagnosis, never the verdict: a DNS presence never overrides a failing or
 * mismatched marker probe, so `live` stays exclusively the marker pair's own conclusion.
 * @param {string} domain the domain to probe, no scheme
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @param {DnsContext} [dns] the optional DNS context for the unreachable-case diagnosis
 * @returns {Promise<'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending' | 'hostname-not-serving'>} the catalogue code the probes point at, or
 *  `'live'`
 */
export async function confirmHostname(domain, fetchImpl, dns = {}) {
  const { outcome } = await confirmWithDiagnosis(domain, fetchImpl, dns);
  return outcome;
}

/**
 * Confirm the domain and report the DNS answers the confirm read, when it read any. The whole of
 * `confirmHostname`'s logic lives here; that export is this call with the reading dropped, kept
 * as the narrow contract every existing caller already holds.
 * @param {string} domain the domain to probe, no scheme
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @param {DnsContext} [dns] the optional DNS context for the unreachable-case diagnosis
 * @returns {Promise<{ outcome: string, reading: DnsReading }>} the catalogue code the probes point
 *  at (or `'live'`), and what DNS showed while reaching it
 */
async function confirmWithDiagnosis(domain, fetchImpl, dns = {}) {
  const https = await probeOrigin(`https://${domain}`, fetchImpl);
  if (https.reachable) {
    return { outcome: https.matches ? 'live' : 'hostname-not-serving', reading: NO_DNS_READING };
  }

  const http = await probeOrigin(`http://${domain}`, fetchImpl);
  if (!http.reachable) return diagnoseUnreachable(domain, dns);
  return {
    outcome: http.matches ? 'certificate-pending' : 'hostname-not-serving',
    reading: NO_DNS_READING,
  };
}

/**
 * Confirm the domain, applying the catalogue's own kind split to what the probes found: the one
 * act-kind outcome is thrown here, so every caller is left holding a wait-kind outcome or `'live'`
 * and the split is stated once rather than repeated at each confirm.
 * @param {string} domain the domain to probe, no scheme
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @param {string} dir the `--dir` value, interpolated into the row raised here
 * @param {DnsContext} [dns] the optional DNS context; absent (chapter 2's own call today) the
 *  diagnosis stays conservative and `hostname-resolver-lagging` is never reached from here
 * @returns {Promise<'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending'>} the outcome to hand back to the admin
 */
async function confirmOrThrow(domain, fetchImpl, dir, dns) {
  const outcome = await confirmHostname(domain, fetchImpl, dns);
  if (outcome === 'hostname-not-serving') {
    throw cloudflareError('hostname-not-serving', { dir, domain });
  }
  return outcome;
}

/**
 * The pre-redeploy confirm, held when the caller injected a `waitForClear` and one-shot when it
 * did not. This is the whole of the hold seam in this module: the loop polls the confirm and
 * nothing else, so the attach above it runs once per cutover and the hop line prints once, no
 * matter how long the wait runs.
 *
 * A `hostname-not-serving` reading mid-hold is an ordinary not-cleared observation, recorded and
 * retried: on a zone minutes old, an edge answering 522 for a moment is the same self-clearing
 * shape as a resolver still catching up. It becomes the throw it is today only when it is still
 * the verdict when the hold ends.
 * @param {object} args
 * @param {string} args.domain the domain to probe, no scheme
 * @param {typeof fetch} args.fetchImpl the fetch implementation to probe with
 * @param {string} args.dir the `--dir` value, interpolated into any row raised here
 * @param {DnsContext} [args.dns] the optional DNS context, forwarded to each confirm
 * @param {(probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>} [args.waitForClear] the injected hold
 * @returns {Promise<'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending'>} the outcome to hand back to the admin
 */
async function confirmBeforeRedeploy({ domain, fetchImpl, dir, dns, waitForClear }) {
  if (!waitForClear) return confirmOrThrow(domain, fetchImpl, dir, dns);

  const observation = await waitForClear(async () => {
    const { outcome, reading } = await confirmWithDiagnosis(domain, fetchImpl, dns);
    // `hostname-not-serving` is an act-kind code (confirmOrThrow throws it below once it is still
    // the verdict at hold's end), never a page a console should show while telling the admin the
    // hold is still just waiting; the other three non-live outcomes are wait-kind and get one.
    const hasParkPage = outcome !== 'live' && outcome !== 'hostname-not-serving';
    return {
      cleared: outcome === 'live',
      detail: {
        authoritative: reading.authoritative,
        recursive: reading.recursive,
        lowConfidence: reading.lowConfidence,
        markerOutcome: outcome,
      },
      // The row the caller would print for this verdict, composed here because this is the site
      // that knows both the code and its params; an interrupted hold prints it rather than
      // leaving an admin with nothing.
      park: outcome === 'live' ? undefined : cloudflareError(outcome, { dir, domain }).message,
      // The same verdict, as a catalogue code and params rather than pre-rendered text: what a
      // console still up when the hold ends un-cleared renders as its own park page.
      parkCode: hasParkPage ? outcome : undefined,
      parkParams: hasParkPage ? { dir, domain } : undefined,
    };
  });

  const outcome = observation.detail.markerOutcome;
  if (outcome === 'hostname-not-serving') {
    throw cloudflareError('hostname-not-serving', { dir, domain });
  }
  return outcome;
}

/**
 * Reduce a caught error's own message down to the part above its "Next:" line, when it has one.
 * `deployWorker` throws an already-catalogued error (deploy-failed, subdomain-unregistered), and
 * that message ends with its own "Next:" line; embedding it whole as this row's `detail` would
 * feed catalogue.mjs's `extractNext` a line that is not this row's own, since it takes the FIRST
 * "Next:" line in the built message, which would then be the nested one instead of
 * cutover-deploy-failed's real next step.
 * @param {string} message the inner error's message
 * @returns {string} `message` with its own trailing "Next:" line and everything after it removed
 */
function stripNestedNext(message) {
  const lines = message.split('\n');
  const nextIndex = lines.findIndex((line) => line.startsWith('Next:'));
  if (nextIndex === -1) return message.trim();
  return lines.slice(0, nextIndex).join('\n').trim();
}

/**
 * @typedef {object} CutOverResult
 * @property {'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending'} outcome `'live'` once the domain serves this site over HTTPS and the
 *  redeploy under its real origin has succeeded; the others are wait outcomes, returned rather
 *  than thrown per the catalogue's own convention (`ChapterErrorInfo`'s `kind` doc: a 'wait' row
 *  is returned by its caller, not thrown). `hostname-resolver-lagging` is reachable only when a
 *  caller supplied a DNS context
 */

/**
 * Cut the admin's domain over to the already-deployed Worker: attach the Custom Domain, confirm
 * the existing deployment answers there, then move the site's recorded origin and redeploy once.
 * A confirm failure that means the site is simply not there yet (still propagating, or the
 * certificate has not issued) is returned as a wait outcome; a confirm failure that means
 * something else is answering there (`hostname-not-serving`) is thrown, the same as the attach
 * itself failing (`custom-domain-failed`) or the redeploy failing (`cutover-deploy-failed`).
 *
 * A redeploy failure restores the origin on disk to the pre-cutover workers.dev URL before
 * throwing, so a failed cutover never leaves the site's own config pointing at an origin the
 * Worker was never redeployed under.
 * @param {object} args
 * @param {object} args.record the site's in-memory state record; reads `record.dir` and
 *  `record.cloudflare.{domain,zoneId,workerName,accountId,url}`
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {typeof fetch} [args.fetchImpl] the fetch implementation the confirm probes with;
 *  defaults to the global `fetch`, overridden in tests
 * @param {(line: string) => void} args.log receives one printed line per call
 * @param {DnsContext} [args.dns] the optional DNS context, forwarded to every confirm here
 * @param {(probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>} [args.waitForClear] the hold seam. Absent
 *  it, this behaves exactly as it did before the console existed: one confirm, then today's park.
 *  Given one, the PRE-REDEPLOY confirm is polled until it clears or the hold's budget runs out.
 *  The re-check after the redeploy stays one-shot on purpose: a completed redeploy has already
 *  proven this hostname serves the site once, so a park there is both rare and terminal, and
 *  holding on it would keep a console up over a wait nothing is expected to clear.
 * @returns {Promise<CutOverResult>} the outcome
 */
export async function cutOverHostname({ record, api, fetchImpl = fetch, log, dns, waitForClear }) {
  const { dir } = record;
  const { domain, zoneId, workerName, accountId, url: workersDevUrl } = record.cloudflare;

  await api.attachCustomDomain({ hostname: domain, zoneId, service: workerName });
  log(`Connected ${domain} to your site; checking that it answers there.`);

  const beforeRedeploy = await confirmBeforeRedeploy({ domain, fetchImpl, dir, dns, waitForClear });
  if (beforeRedeploy !== 'live') return { outcome: beforeRedeploy };

  await writePublicOrigin(dir, `https://${domain}`);

  try {
    await deployWorker({ dir, log, accountId });
  } catch (err) {
    // The site is still live and working on its workers.dev address; the redeploy under its new
    // origin is what failed, so the origin on disk is restored rather than left pointing at a
    // Worker that was never actually redeployed to serve it.
    await writePublicOrigin(dir, workersDevUrl);
    throw cloudflareError('cutover-deploy-failed', { dir, detail: stripNestedNext(err.message) });
  }

  log(`Re-checking ${domain} after redeploying.`);
  const afterRedeploy = await confirmOrThrow(domain, fetchImpl, dir, dns);
  if (afterRedeploy !== 'live') return { outcome: afterRedeploy };

  log(`${domain} is live.`);
  return { outcome: 'live' };
}
