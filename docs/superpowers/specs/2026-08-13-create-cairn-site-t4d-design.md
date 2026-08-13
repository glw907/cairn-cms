# create-cairn-site Pass T4d: the localhost console (design)

**Status: approved design, 2026-08-13 Fable sitting, revised at the adversarial gate the same
day** (three lenses: wrong-premise, conformance, deletion-test; 24 ranked findings, 6 blocking,
all folded below). The T4d brief in `2026-08-11-create-cairn-site-t4a-design.md` (as amended
through 2026-08-13) remains the provenance record; this spec is the buildable design and
**corrects the brief on one point of fact** (the loopback core's security properties, below).
The sitting ran the same day Task 8's live e2e completed; every wait number is a Task 8
observation.

**The estate fact, checked per the brief's instruction:** `~/.config/cairn/sites/` holds
`t5-scratch-a32510.json` at `builds-live`. Case 1 holds: T4d inherits the live site
(`carin-test.org` / `t5-scratch.glw907.workers.dev`), the fifth GitHub App
(`cairn-t5-scratch`, id 4585219), and the saved state record, and owns the single estate
teardown at its close (the table lives in `docs/internal/2026-08-13-t5-task8-live-e2e.md`).

## What T4d ships

A server-rendered localhost console that makes a run's waits watchable: live state during held
waits, guidance pages while the console is up, and auto-resume when a held wait's probe clears.
Plus three extract-and-reuse moves (the loopback core, the authoritative-DNS resolver machinery
already in `records.mjs`, the fake HTTP plumbing) and the `hostname.mjs` diagnosis upgrade that
closes carry-forward 1.

## Decision record (this sitting, revised at the gate)

1. **Park semantics: hybrid by wait class.** Two wait classes are **held** in-process with the
   console up: hostname propagation (Task 8 measured 27 minutes of resolver negative cache on
   a hostname whose authoritative answer was live the whole time, certificate issuance inside
   that window) and the Builds watch (queue lag plus build, minutes; `build-not-started` is
   RULED a member of this held class, polled on the discovery route within the budget, rather
   than the immediate park it is today). The registrar delegation wait (minutes to 48 hours)
   stays a true park. The survey (web-verified 2026-08-13): builds are held with streaming
   nearly everywhere (Netlify, flyctl, Railway, wrangler; `vercel deploy` parks by default,
   holds under `--wait`); cert/DNS waits are parked everywhere, with re-check verbs
   (`fly certs check`, `vercel domains verify`) or, in wrangler's custom-domain SSL case, no
   verb at all; `gh run watch` (a 3-second poll, cheaply re-attachable) is the strongest
   model; no surveyed tool resumes multi-hour orchestration without a daemon.
2. **Holding is a deliberate contract change at two named seams, not a wrapper.** Today both
   "held" waits are immediate parks (`cutOverHostname` returns its wait outcome one-shot;
   chapter 3's discovery branch logs and returns `build-not-started`), and the T4a contract
   ("a wait-class outcome is returned, never thrown, never advances `step`") governs them.
   T4d threads an optional injected `waitForClear(probe)` into exactly two places:
   `cutOverHostname` around `confirmOrThrow` (the attach stays OUTSIDE the loop), and
   `watchAndComplete` around build discovery (composing with, never duplicating, the existing
   `pollBuildToStop` loop). Default absent = today's park, so every other caller and test is
   untouched. Per hold: the attach runs exactly once, the hop title prints exactly once.
3. **The marker pair stays the sole authority for `live`.** The authoritative-DNS answer
   upgrades the *diagnosis*, never the *verdict*: an attach writes the apex records
   immediately (the proxied `100::` AAAA mechanism `hostname.mjs` documents), so
   authoritative-present says nothing about serving. The probe splits today's
   `hostname-propagating` into "records not created" versus "created; your machine's resolver
   is behind (a self-clearing wait)", and the held loop re-runs the normal marker confirm
   each interval; `live` is only ever the marker pair's conclusion. Certificate issuance is
   unpollable with this token (the `hostname.mjs` header records why), so the cert cell
   renders what is knowable (HTTPS marker outcome), never a fabricated status.
4. **One probe owner.** The hold loop polls; the console renders the loop's last observation
   plus its timestamp and never issues an API or DNS call at render time. The `meta refresh`
   interval is a display cadence, explicitly decoupled from the poll interval (poll: chapter
   3's existing constants for the build class; 30s for propagation; display: ~5s build, ~30s
   propagation).
5. **Budgets and the non-interactive rule.** Propagation hold: 40 minutes (chosen against the
   27-minute observation). Build hold: chapter 3's existing budget constants. Expiry falls
   back to today's park verbatim (same catalogue row, same printed re-entry, exit 0). A run
   that is `--yes`, non-TTY, or has `CI` set never holds: it parks exactly as today.
6. **Interrupt contract (new work, not today's behavior).** No SIGINT handling exists in the
   package today; an interrupt during a hold would die at exit 130 with nothing saved. The
   hold loop installs SIGINT and SIGTERM handlers for the hold's lifetime: close the console
   server, persist what the loop has learned (the discovered build uuid, the last probe
   observation), print the identical park row and re-entry command the expiry path prints,
   exit 0. Handlers are removed when the hold resolves.
7. **The hold's exit render.** On probe-clear, the console serves one final page with no
   refresh meta ("cleared; the run is continuing in the terminal"), holds the server for a
   short grace window (one fetch or a few seconds) so an in-flight refresh lands on it, then
   shuts down. Any hop that needs stdin ends the console; the console never proxies prompts.
8. **No retrofit of the GitHub chapter's one-shot pages** (research: cosmetic; Task 8:
   chapter 1's trips were the fast part).
9. **The console is the watch surface; re-running the CLI is the re-attach verb.** Nothing
   daemon-shaped, nothing outliving the run.

**The post-fix wait inventory, stated against finding 6 of the gate:** after decision 3's
classifier, what remains is the certificate wait (unobservable, still gates the HTTPS
marker), the resolver lag itself (still gates the marker probe, which resolves through the
OS), and the build queue. The propagation hold therefore still earns the primary view: the
27-minute class is exactly what it dissolves, by self-clearing the moment the resolver
catches up instead of asking the admin to guess when to re-run.

## Architecture

Three pieces; the runtime library (`src/lib`) is untouched; everything lands in
`packages/create-cairn-site`.

**The loopback core, extracted and completed.** The brief claimed the core "already keeps its
path secret and guards Host"; **the code has neither** (fixed literal paths `/callback` and
`/manifest`; no read of the Host header anywhere). The extraction therefore ADDS three
things: a routing layer (path -> handler map), a per-start secret mount prefix
(`randomBytes(16).toString('base64url')`, carried by every console URL), and a Host
allowlist (`127.0.0.1[:port]`, `localhost[:port]`, `[::1][:port]`; 403 otherwise). The Host
guard is a deliberate behavior change for the GitHub chapter too (its callback carries
GitHub's `code` and today answers any Host); the chapter's registered redirect URIs are
`127.0.0.1` literals, so real flows pass. Acceptance criterion 2 is scoped to behavior: the
chapter's existing tests pass with at most mechanical URL-prefix threading.

**The shared DNS helper (reuse, not reinvention).** `records.mjs` already carries the
authoritative-versus-recursive machinery (`defaultResolve`, `firstAuthoritativeAddress`, the
`lowConfidence` flag), written for this same negative-cache defect. It lifts into a shared
helper consumed by `readCurrentRecords`, the console's propagation probe, and `hostname.mjs`'s
diagnosis split. The `lowConfidence` flag rides into what the console renders: an answer read
through the recursive fallback is labeled as such, never presented as authoritative evidence.
This is deliberately a third extraction; the pass accepts three reuse moves and still
excludes the `runStep` hoist (carry-forward 13) as a fourth.

**The console module.** Server-rendered HTML from two inputs: the state record and the hold
loop's last observation. Rendering happens from an explicit allowlist of record fields per
view, never a record spread or `JSON.stringify(record)`; the state record holds live tokens
across exactly the parks the console is up for, and the no-secrets rule is enforced by the
sentinel test in the acceptance criteria. Every page carries a one-line chapter/hop header
and the serves-during-a-run-only sentence. Unguessable prefix and Host guard from the core;
loopback bind only.

**The hold loop.** As decided above (seams, budgets, interrupt contract, exit render). The
helper lives beside `runner.mjs` and is called by the two seams only.

## Views

1. **Propagation (primary).** Both DNS answers honestly labeled (authoritative per the zone's
   own nameservers beside the system resolver, `lowConfidence` surfaced), the marker-probe
   outcome, and what each means. During the delegation park this page is what a re-entered
   run shows while it re-checks; during the held propagation wait it live-updates until
   auto-resume.
2. **The Builds watch.** Build state from the hold loop's reads: discovery via
   `listBuildsForWorker` (the route Task 8's evidence method confirmed), state via
   `getBuild`; queued -> running -> outcome, and the commit it matched.
3. **Park guidance, with its serving window stated.** Park pages exist only while the console
   is up: a park reached during a held wait (expiry, interrupt, or a park-class outcome
   surfacing mid-hold) renders its page for the same grace window as the exit render, then
   the process exits 0 as today. The delegation park reached without a console (today's
   normal path) prints text only. Page content is composed from the same catalogue rows as
   the printed text, one source, proven by the output-equality criterion below.

## Testing and CI

- Unit tests against fixture state records for routing, each view, the park pages, and the
  hold loop's transitions (probe injected; no network): probe-clears -> resume, budget
  expiry -> park verbatim, `--yes`/non-TTY/`CI` -> never holds.
- A child-process test drives the real signal path: spawn the CLI against the fakes into a
  held wait, wait for the printed console URL, fetch it (asserting state-derived content:
  the fixture's domain, both nameservers, the hop header), send SIGINT, assert the park row,
  the exit code 0, and the state save.
- The loopback core's own tests: bind, secret-prefix refusal (a request without the prefix
  404s), Host-guard refusal (403), shutdown, and the grace-window exit render.
- **The secret-sentinel sweep:** a fixture record carries distinctive sentinels in
  `apiToken` and every credential-shaped field; every route (including 403/404 and error
  pages) renders with zero sentinel occurrences in the response bytes, and the sweep also
  covers the printed console-URL line. Falsified once by interpolating the record whole.
- **Park-page equality and completeness:** for every park code the two chapters can return,
  a parameterized test builds the catalogue row and asserts the rendered page contains that
  row's exact message and `Next:` line; the completeness half enumerates the catalogue and
  fails when a code has no page.
- **Carry-forward 7 rides along:** the fake HTTP plumbing shared by `test/fake-github.mjs`
  and `test/fake-cloudflare.mjs` extracts into one helper (the console tests would otherwise
  mint a fourth copy). Fakes keep refusing what the real service refuses.
- **The CI probe keeps the brief's lock with a defined mechanism:** `create-site.yml` (which
  has the full checkout beside the packed CLI) seeds `CAIRN_STATE_DIR` with a fixture at
  `delegated`, points `CAIRN_CLOUDFLARE_API_BASE` at the repo's fake, runs the packed CLI
  into the held wait, fetches the printed console URL asserting state-derived body content,
  flips the fake's probe state, and asserts the changed cell on re-fetch (proving
  re-render, not a stub 200). The package `test` script's explicit per-directory glob list
  gains the new directory.
- **The live proof, with its provocation named:** against the inherited estate, kick the
  trigger (or push a trivial commit to `glw907/t5-scratch`) so a real queued build exists,
  re-enter with `--connect` into the held build watch with the console up; expect a fresh
  token paste if the terminal outcome cleared the saved one. Evidence: the console URL
  line, one re-render showing state change, the auto-resume line, and a raw
  `builds/workers/{tag}/builds` read matching the same `build_uuid`. Teardown after, per
  the Task 8 table.

## Documentation (pass dimension)

`packages/create-cairn-site/README.md` gains the console section (what it is, when it
serves, the during-a-run-only fact, the non-interactive rule); the `## Unreleased` changelog
entry finalizes with no version bump; the gate list at close is re-derived with
`grep -l pull_request .github/workflows/*`, never restated. Carry-forward 6 still applies
(this package has no comment or type gate), so the new modules' TSDoc shape rides the
reviewer gate deliberately.

## Deliberately out of scope

The one-shot page retrofit. The four-module `runStep` hoist (carry-forward 13: three
extractions are accepted this pass; a fourth is accretion — it stays filed). Daemon
semantics or anything outliving the run. Anything TUI-shaped (the Go successor pre-design
owns that horizon). The email chapter. Proxying interactive prompts through the console.

## Acceptance criteria

1. A run entering a held wait prints the console URL, serves the matching view on loopback
   under the secret prefix, refuses non-loopback Hosts (403) and unprefixed paths (404),
   auto-resumes when the injected probe clears (serving the exit render through the grace
   window), and honors the budget by parking verbatim as today.
2. The GitHub chapter's behavior is unchanged on the extracted core (its tests pass with at
   most mechanical URL threading), and the core's own tests cover prefix, Host guard, and
   shutdown.
3. `hostname.mjs` splits `hostname-propagating` into records-absent versus
   resolver-lagging, with the disagreement fixture red before the change and green after;
   `live` remains exclusively the marker pair's verdict.
4. Park text and park page render from one composed source, proven by output equality over
   the enumerated park-code catalogue, including completeness.
5. The interrupt contract holds in a child-process test: SIGINT during a held wait closes
   the server, saves state, prints the park row, exits 0.
6. The secret-sentinel sweep passes over every route and the printed URL line.
7. Every rendered view and the park's final printed line carry the
   serves-during-a-run-only sentence, asserted by test.
8. A `--yes`, non-TTY, or `CI` run never holds (parks as today), asserted by test.
9. The full gate is green with the PR-gating list re-derived at close, the package test
   glob covers the new directory, and the `create-site.yml` probe passes with its
   state-derived assertions.
10. The pass performs the API-deletable teardown rows itself (verified by re-listing),
    hands the browser-only rows to STATUS's hand-step list, and updates the App ledger
    note to five hand-deleted.

## Standing input honored

The Go successor pre-design's "tune for the port" section applies: the hold loop, probe,
and console modules keep orchestration decisions out of prompt plumbing, state their
contracts in portable prose, and treat the state record as the versioned contract it is.
