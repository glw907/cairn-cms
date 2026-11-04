// The rollback-safe cutover: attach the admin's domain to the already-deployed Worker, confirm
// it actually serves this site, then move the site's recorded origin over, rebuild, and redeploy.
// Every finding below traces to the T4a domain spike (https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-11-t4a-domain-spike.md),
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
// with the same domain id and cert_id, not a duplicate error. api.mjs's error mapping
// already turns any failed attach into 'custom-domain-failed', so this module adds no
// duplicate-error branch; a retry after a failure simply re-attaches.
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
// AAAA record against the zone's authoritative nameservers (the same negative-cache-immune
// read records.mjs and dns.mjs's header both document): present there but still unreachable
// means only the caller's resolver is behind (hostname-resolver-lagging, a self-clearing wait);
// absent there too means the record genuinely has not been created or propagated to the zone's
// nameservers yet (hostname-records-absent). The DNS context is optional and absent-safe: a
// caller that passes none gets the conservative default with no lookup attempted at all, never a
// crash and never a real DNS call it did not ask for. Either way, this only ever refines WHICH
// wait row is reported: the marker pair above stays the sole authority for `live`, and a DNS
// presence never overrides a failing or mismatched marker probe.
//
// THE PINNED CHECK: the recursive half of that read is pinned to public resolvers, not the host
// resolver `fetch` uses, so "lagging" can describe this machine alone while the site already
// serves. When the authoritative AAAA is present, the apex A is read authoritatively too and the
// marker probe reruns once through `node:https`, connecting to that address while SNI and `Host`
// stay the domain. A match is `live`, with one line saying this machine's resolver is behind; the
// marker is still the authority, only the address it is fetched from changes.
//
// THE HOLD SEAM (Task 4a): the propagation wait above is one of the two classes this tool holds
// in process with a console up rather than parking on. The seam is one optional injected
// `waitForClear`, threaded around the PRE-REDEPLOY confirm only; see cutOverHostname's doc
// block for why the re-check after the redeploy stays one-shot. The attach sits outside the loop
// (it is idempotent, but re-attaching per poll would be pointless traffic), and absent the
// injection every path here is byte-identical to what it was before the console existed.
//
// Certificate issuance CANNOT be polled through the Cloudflare API with this token: both
// GET /zones/:id/ssl/certificate_packs and GET /zones/:id/ssl/verification returned 9109
// Unauthorized even with SSL and Certificates Edit granted at Zone scope. Progress is observed
// by probing the hostname itself, which is exactly what confirmHostname does.
import { buildSite, deployWorker } from './deploy.mjs';
import { writePublicOrigin } from './config.mjs';
import { cloudflareError } from './catalogue.mjs';
import { readAuthoritativeAndRecursive } from './dns.mjs';
import { request as httpsRequest } from 'node:https';

/** The path the site-specific marker's `/admin` redirect must land on. */
const ADMIN_LOGIN_PATH = '/admin/login';

/** How long one pinned request may take before it counts as unreachable. */
const PINNED_TIMEOUT_MS = 15_000;

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
 * Send one GET over HTTPS to a pinned address. The `lookup` answers both forms Node calls it
 * with: `autoSelectFamily` makes Node pass `all: true` and expect an array, and a single
 * address there fails with `ERR_INVALID_IP_ADDRESS`.
 * @param {object} args
 * @param {string} args.domain the hostname kept as SNI and `Host`
 * @param {string} args.address the IPv4 address to connect to
 * @param {string} args.path the request path
 * @param {{ ca?: string | Buffer, port?: number, request?: typeof httpsRequest }} args.options
 *  test options; production passes none
 * @returns {Promise<{ status: number | undefined, location: string | undefined }>} the answer
 */
function pinnedGet({ domain, address, path, options }) {
  const { ca, port = 443, request = httpsRequest } = options;
  const requestOptions = {
    host: domain,
    servername: domain,
    port,
    path,
    method: 'GET',
    headers: { host: domain },
    agent: false,
    autoSelectFamily: true,
    timeout: PINNED_TIMEOUT_MS,
    lookup: (_hostname, opts, cb) =>
      opts?.all ? cb(null, [{ address, family: 4 }]) : cb(null, address, 4),
  };
  // Only a test's self-signed server needs a CA; production verifies against the system store.
  if (ca) requestOptions.ca = ca;
  return new Promise((resolve, reject) => {
    const req = request(requestOptions, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location });
    });
    req.on('timeout', () => req.destroy(new Error('pinned probe timed out')));
    req.on('error', reject);
    req.end();
  });
}

/**
 * Probe the marker pair over HTTPS at a pinned address, with SNI and `Host` kept as the domain,
 * so a site this machine's resolver cannot see yet is still checked against its real
 * certificate. This is the default `DnsContext.pinnedProbe`.
 * @param {{ domain: string, address: string }} target the domain and the address to reach it at
 * @param {{ ca?: string | Buffer, port?: number, request?: typeof httpsRequest }} [options] test
 *  options only: a CA for a local self-signed server, its port, and a request wrapper
 * @returns {Promise<{ reachable: boolean, matches: boolean }>} the same shape `probeOrigin` reports
 */
export async function pinnedMarkerProbe({ domain, address }, options = {}) {
  try {
    const root = await pinnedGet({ domain, address, path: '/', options });
    const admin = await pinnedGet({ domain, address, path: '/admin', options });
    if (root.status !== 200 || admin.status !== 303 || !admin.location) {
      return { reachable: true, matches: false };
    }
    const landing = new URL(admin.location, `https://${domain}`).pathname;
    return { reachable: true, matches: landing === ADMIN_LOGIN_PATH };
  } catch {
    return { reachable: false, matches: false };
  }
}

/**
 * The line a pinned `live` prints: the site answers, but this machine may not see it for a while.
 * @param {string} domain the domain that answered
 * @returns {string} the line
 */
function resolverLagLine(domain) {
  return `${domain} already serves your site, but this computer's DNS resolver may take up to 30 minutes to see it.`;
}

/**
 * @typedef {object} DnsContext
 * @property {(servers?: string[]) => object} [resolve] resolver factory forwarded to the shared
 *  DNS helper (`dns.mjs`'s `readAuthoritativeAndRecursive`); when omitted, the unreachable-case
 *  diagnosis below is skipped entirely and confirmHostname reports its conservative default
 *  (`hostname-records-absent`) with no DNS lookup attempted at all
 * @property {string[]} [nameServers] the zone's nameserver hostnames, when already known
 *  (for example a saved `record.cloudflare.nameServers`); skips the NS discovery lookup the
 *  helper otherwise makes
 * @property {(target: { domain: string, address: string }) =>
 *  Promise<{ reachable: boolean, matches: boolean }>} [pinnedProbe] the marker probe pinned to
 *  the authoritative A address; defaults to `pinnedMarkerProbe`, injected in tests since
 *  `node:https` bypasses the `fetchImpl` seam
 * @property {(line: string) => void} [log] receives the one line a pinned `live` prints; a
 *  caller that passes none prints nothing
 */

/**
 * @typedef {object} DnsReading
 * @property {unknown[] | null} authoritative the apex answer read against the zone's
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
 * zone's authoritative nameservers, which no recursive negative cache sits in front of.
 * Present there means only the caller's resolver has not caught up yet, a self-clearing
 * wait; absent there too means the record genuinely is not there yet. Never throws: a DNS hiccup
 * during this best-effort diagnosis falls back to the conservative records-absent default, the
 * same as no DNS context being given at all.
 *
 * The reading itself is returned beside the outcome, not just the code it implies: a held
 * propagation wait renders both answers in its console view, and the loop that polls is the one
 * process allowed to read DNS (the console never looks anything up at render time), so the read
 * this call already made is the one the view must be built from rather than a second one.
 *
 * When the AAAA is present, the apex A is read authoritatively and the marker probe reruns once
 * pinned to it (this module's header, "the pinned check"). Only a matching marker there turns
 * the wait into `live`; any other pinned answer leaves it `hostname-resolver-lagging`.
 * @param {string} domain the domain to probe, no scheme
 * @param {DnsContext} dns the DNS context; absent-safe (see `confirmHostname`)
 * @returns {Promise<{ outcome: 'live' | 'hostname-resolver-lagging' | 'hostname-records-absent',
 *  reading: DnsReading }>} the split outcome and the AAAA answers it was concluded from
 */
async function diagnoseUnreachable(
  domain,
  { resolve, nameServers, pinnedProbe = pinnedMarkerProbe, log } = {},
) {
  if (!resolve) return { outcome: 'hostname-records-absent', reading: NO_DNS_READING };

  const reading = await readAuthoritativeAndRecursive({
    domain,
    name: domain,
    method: 'resolve6',
    nameServers,
    resolve,
  });
  if (!hasAnswer(reading.authoritative)) return { outcome: 'hostname-records-absent', reading };

  const v4 = await readAuthoritativeAndRecursive({
    domain,
    name: domain,
    method: 'resolve4',
    nameServers,
    resolve,
  });
  if (!hasAnswer(v4.authoritative)) return { outcome: 'hostname-resolver-lagging', reading };

  const pinned = await pinnedProbe({ domain, address: v4.authoritative[0] });
  if (!pinned.reachable || !pinned.matches) return { outcome: 'hostname-resolver-lagging', reading };

  log?.(resolverLagLine(domain));
  return { outcome: 'live', reading };
}

/**
 * Whether a DNS answer carries at least one record.
 * @param {unknown[] | null} answer the answer, `null` when no source was read
 * @returns {answer is unknown[]} true for a non-empty array
 */
function hasAnswer(answer) {
  return Array.isArray(answer) && answer.length > 0;
}

/**
 * Confirm the domain answers with this site, distinguishing every outcome the spike observed.
 * HTTPS is tried first; only when it fails at the transport level (no HTTP response reached at
 * all, whether from a missing certificate, DNS not yet resolving, or a refused connection) does
 * this fall back to plain HTTP, which needs no certificate and so isolates whether the site
 * itself is reachable. Exported for chapter3.mjs's live check (the first Builds deploy's
 * completion), which reuses this rather than rebuilding it; a workers.dev origin needs its scheme
 * stripped by the caller, since this takes a bare domain, no scheme.
 *
 * When neither http nor https connects at all, `dns` (optional, absent-safe) refines which wait
 * row is reported (see this module's header for the propagation split); the DNS answer only ever
 * upgrades that diagnosis, never the verdict: a DNS presence never overrides a failing or
 * mismatched marker probe, so `live` stays exclusively the marker pair's conclusion.
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
 * Apply the catalogue's kind split to a settled confirm outcome: the one act-kind code throws,
 * and everything else is a wait-kind outcome (or `'live'`) the caller hands back. Stated once here
 * so the one-shot confirm and the held one below can never disagree on which outcome is a failure.
 * @param {string} outcome the outcome a confirm settled on
 * @param {string} dir the `--dir` value, interpolated into the row raised here
 * @param {string} domain the domain that was probed, interpolated into that same row
 * @returns {'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending'} the outcome to hand back to the admin
 */
function orThrow(outcome, dir, domain) {
  if (outcome === 'hostname-not-serving') {
    throw cloudflareError('hostname-not-serving', { dir, domain });
  }
  return outcome;
}

/**
 * Confirm the domain, applying the catalogue's kind split to what the probes found: the one
 * act-kind outcome is thrown here, so every caller is left holding a wait-kind outcome or `'live'`
 * and the split is stated once rather than repeated at each confirm.
 * @param {string} domain the domain to probe, no scheme
 * @param {typeof fetch} fetchImpl the fetch implementation to probe with
 * @param {string} dir the `--dir` value, interpolated into the row raised here
 * @param {DnsContext} [dns] the optional DNS context; absent (chapter 2's call today) the
 *  diagnosis stays conservative and `hostname-resolver-lagging` is never reached from here
 * @returns {Promise<'live' | 'hostname-records-absent' | 'hostname-resolver-lagging' |
 *  'certificate-pending'>} the outcome to hand back to the admin
 */
async function confirmOrThrow(domain, fetchImpl, dir, dns) {
  return orThrow(await confirmHostname(domain, fetchImpl, dns), dir, domain);
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
      // console still up when the hold ends un-cleared renders as a park page.
      parkCode: hasParkPage ? outcome : undefined,
      parkParams: hasParkPage ? { dir, domain } : undefined,
    };
  });

  return orThrow(observation.detail.markerOutcome, dir, domain);
}

/**
 * Reduce a caught error's message down to the part above its "Next:" line, when it has one.
 * `deployWorker` throws an already-catalogued error (deploy-failed, subdomain-unregistered), and
 * that message ends with its own "Next:" line; embedding it whole as this row's `detail` would
 * feed catalogue.mjs's `extractNext` a line that is not this row's, since it takes the FIRST
 * "Next:" line in the built message, which would then be the nested one instead of
 * cutover-deploy-failed's real next step.
 * @param {string} message the inner error's message
 * @returns {string} `message` with its trailing "Next:" line and everything after it removed
 */
function stripNestedNext(message) {
  const lines = message.split('\n');
  const nextIndex = lines.findIndex((line) => line.startsWith('Next:'));
  if (nextIndex === -1) return message.trim();
  return lines.slice(0, nextIndex).join('\n').trim();
}

/**
 * @typedef {object} CutOverResult
 * @property {string} outcome `'live'` once the domain serves this site over HTTPS and the
 *  redeploy under its real origin has succeeded; otherwise a wait outcome, returned rather than
 *  thrown per the catalogue's convention (`ChapterErrorInfo`'s `kind` doc: a 'wait' row is
 *  returned by its caller, not thrown): `hostname-records-absent`, `hostname-resolver-lagging`
 *  (reachable only when a caller supplied a DNS context), `certificate-pending`, or, through
 *  Workers Builds, the park `deployThroughBuilds` returned
 * @property {string} [message] the park's row, present only for a Workers Builds park, which the
 *  hop already printed
 */

/**
 * Cut the admin's domain over to the already-deployed Worker: attach the Custom Domain, confirm
 * the existing deployment answers there, then move the site's recorded origin, rebuild, and
 * redeploy once. A confirm failure that means the site is simply not there yet (still
 * propagating, or the certificate has not issued) is returned as a wait outcome; a confirm
 * failure that means
 * something else is answering there (`hostname-not-serving`) is thrown, the same as the attach
 * itself failing (`custom-domain-failed`) or the rebuild or redeploy failing
 * (`cutover-deploy-failed`).
 *
 * A failure writing the new origin, rebuilding, or redeploying restores the origin on disk to the
 * pre-cutover workers.dev URL before throwing, so a failed cutover does not leave the site's
 * config pointing at an origin the Worker was never redeployed under. When that restore fails
 * too, the thrown row keeps the original cause and says the files may still name the domain.
 *
 * On a site Workers Builds deploys, `deployThroughBuilds` replaces the rebuild and redeploy: the
 * origin is committed to the repository and the Builds deploy of that commit is watched. The
 * origin on disk is restored exactly when that commit did not land, and left once it did, since
 * the domain already answered and the repository now names it; the row then says the next
 * successful build serves it. A park the hop returns (the `--yes` reconcile park, or a build not
 * found yet or still running) also leaves the origin on disk for the next run to commit or watch.
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
 * @param {typeof writePublicOrigin} [args.writePublicOriginFn] writes the origin pair; a test seam
 *  defaulting to config.mjs's `writePublicOrigin`
 * @param {(onLanded: () => void) => Promise<{ parked?: Error & { catalogue: { code: string } } }>}
 *  [args.deployThroughBuilds] the Workers Builds hop (chapter3.mjs's `deployConfigThroughBuilds`),
 *  given on a site Builds deploys; it calls `onLanded` once the repository carries the new origin
 * @returns {Promise<CutOverResult>} the outcome
 */
export async function cutOverHostname({
  record,
  api,
  fetchImpl = fetch,
  log,
  dns: givenDns,
  waitForClear,
  writePublicOriginFn = writePublicOrigin,
  deployThroughBuilds,
}) {
  const { dir } = record;
  const { domain, zoneId, workerName, accountId, url: workersDevUrl } = record.cloudflare;
  // The pre-redeploy and post-redeploy confirms can both go through the pinned check; the
  // resolver line is said once per cutover.
  let resolverLineSaid = false;
  const dns = givenDns && {
    ...givenDns,
    log: (line) => {
      if (resolverLineSaid) return;
      resolverLineSaid = true;
      log(line);
    },
  };

  await api.attachCustomDomain({ hostname: domain, zoneId, service: workerName });
  log(`Connected ${domain} to your site; checking that it answers there.`);

  const beforeRedeploy = await confirmBeforeRedeploy({ domain, fetchImpl, dir, dns, waitForClear });
  if (beforeRedeploy !== 'live') return { outcome: beforeRedeploy };

  const domainOrigin = originFor(domain);
  let landed = false;
  try {
    // The forward write sits inside the try too: it writes two files, and a failure after the
    // first lands must restore the pair like any later failure. The origin in cairn.config.ts is
    // baked into the prerendered pages, so the rebuild is inside it for the same reason.
    await writePublicOriginFn(dir, domainOrigin);
    if (deployThroughBuilds) {
      const { parked } = await deployThroughBuilds(() => {
        landed = true;
      });
      if (parked) return { outcome: parked.catalogue.code, message: parked.message };
    } else {
      await buildSite({ dir, log });
      await deployWorker({ dir, log, accountId });
    }
  } catch (err) {
    const detail = stripNestedNext(err.message);
    // The repository already names the domain, so restoring the files on disk would only put
    // this checkout behind it; the next successful build serves the domain.
    if (landed) {
      // A token the build watch cannot use is the row to act on, and chapter 2 clears the token
      // from its code, which the committed wrapper would hide.
      if (err?.catalogue?.code === 'token-scope-missing' || err?.catalogue?.code === 'token-invalid') throw err;
      throw cloudflareError('cutover-deploy-failed', { dir, detail, buildsCommitted: true });
    }
    // The site is still live and working on its workers.dev address; the rebuild or redeploy
    // under its new origin is what failed, so the origin on disk is restored rather than left
    // pointing at a Worker that was never actually redeployed to serve it.
    try {
      await writePublicOriginFn(dir, workersDevUrl);
    } catch (restoreErr) {
      // The original failure stays the headline; the row then says the files may still name the
      // domain instead of claiming a restore that did not happen.
      throw cloudflareError('cutover-deploy-failed', {
        dir,
        detail,
        restoreFailed: stripNestedNext(restoreErr.message),
        domainOrigin,
      });
    }
    throw cloudflareError('cutover-deploy-failed', { dir, detail, viaBuilds: Boolean(deployThroughBuilds) });
  }

  log(`Re-checking ${domain} after redeploying.`);
  const afterRedeploy = await confirmOrThrow(domain, fetchImpl, dir, dns);
  if (afterRedeploy !== 'live') return { outcome: afterRedeploy };

  log(`${domain} is live.`);
  return { outcome: 'live' };
}

/**
 * Build the public origin for a stored domain. The URL parser's host lowercases and punycodes it,
 * so a record that predates normalization still cuts over to the bare form the checks expect.
 * @param {string} domain the domain on the record
 * @returns {string} the `https://` origin, falling back to a lowercased copy when the parse throws
 */
function originFor(domain) {
  try {
    return `https://${new URL(`https://${domain}`).hostname}`;
  } catch {
    return `https://${domain.toLowerCase()}`;
  }
}
