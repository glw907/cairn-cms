# Design: the auth-channel consumer proof (pass 2)

Date: 2026-08-04. Revised 2026-08-04 (**v2**, current). Status: approved design, pre-plan.
Author: Fable sitting with Geoff.

**v2 supersedes v1 in full** after a two-lens adversarial round (security attack, feasibility
refutation) run at Geoff's direction before planning. The round found two blockers, both in v1's
verification story: the dev-fold grep gate inspects a directory that contains no server code, and
the emitted-template test v1 called load-bearing would have landed in a file CI never runs. The
revision log at the end names every change.

Pass 1 (`2026-08-03-auth-channel-factory-design.md` v3.1, merged to `main` at `06b3470d`) shipped
`createAuthChannel` and proved it against the engine's own integration harness on real miniflare
D1. Nothing yet proves the built package through a consumer's bundler, which is why the factory
pass declared itself not releasable. This pass is that proof: the showcase `/members` fixture, its
D1 plumbing, the scaffolder exclusion that keeps the fixture out of every generated site, the e2e
that drives a real request-confirm-session round trip through built dist, and a repair to the
dev-fold gate the fixture's safety story leans on.

## What this is

Five deliverables. The fifth was not in the factory pass's sketch; the adversarial round showed it
is load-bearing and pre-broken, so it joins the pass rather than floating:

1. A channel-DB double in `@glw907/cairn-cms-dev`: real SQLite behind the D1 interface.
2. A showcase `/members` fixture wired per `docs/guides/add-a-login-channel.md`, with its
   divergences from the guide named and justified in place.
3. Scaffolder exclusion of the whole fixture, proven by a forbidden-token scan over the actually
   emitted tree running under vitest in CI, plus a fail-loud marker-strip mechanism in
   `scripts/emit-template.mjs` for the touch points path exclusion cannot reach.
4. The e2e specs (round trip plus the negatives a consumer's wiring could plausibly break) and the
   dev-fold marker list, corrected to two lists asserting two different propositions.
5. The dev-fold gate repair: point the grep at the bundle wrangler actually ships, with a positive
   control so the gate can never rot silently again.

The window context: xcathletes Task 4 has not run (`~/Projects/xcathletes-org` does not exist;
ecxc-ski's team-platform pass 1 execution session has not started), so the seam's window is open.
After this pass the unpublished window becomes releasable on the auth-channel work.

## The acceptance test

A fresh `npm run test:e2e` in `examples/showcase` completes a member login end to end (request,
code readback, confirm, gated page, logout, revocation) against the built package. And the emitted
template is provably clean, by a test that runs in CI's vitest suite: a walk over every emitted
file fails on any forbidden token (`MEMBER_DB`, `createAuthChannel`, `migrations-members`,
`last-otp`, each member-roster contact, the string `cairn-template:`; not `editor@showcase.test`,
which is the dev backend's and legitimately ships in the template), the emitted `wrangler.jsonc` parses
as JSONC with exactly the expected `d1_databases` membership, and every `.cairn-template.json`
exclude entry matches a path that exists in the showcase (which catches a fixture file moving out
from under its exclusion before the token scan has to). The token-scan form is deliberate: a
checklist of known-absent paths goes stale; a forbidden-token walk does not.

The emitter does not read comments, and `scripts/emit-template.mjs` copies the showcase verbatim
minus exclusions, so an unguarded fixture ships a code-readback oracle into every scaffolded site.
That is the security property this pass exists to hold.

## The harness truth this design corrects

The factory pass's Pass 2 sketch assumed a wrangler-backed e2e ("migration-apply step plus
`.wrangler/state` reset"). The harness does not work that way. The showcase e2e runs
`VITE_CAIRN_E2E=1 npm run build && npm run preview` (`examples/showcase/playwright.config.ts`) in
plain node: no miniflare, no workerd, and no `.wrangler/state` in the tracked tree (a local
`wrangler dev` leaves one; the harness never reads it). The dev backend synthesizes `platform.env`
with in-memory fakes, and admin auth is injected directly by `devBackendHandle` rather than minted
through D1. So `MEMBER_DB` in e2e cannot be a real wrangler D1, and the two obvious substitutes
both fail:

- Extending `fake-auth-db`'s SQL-string-matching pattern would mean reimplementing the channel
  store's conditional upserts, sliding windows, and `DELETE ... RETURNING` semantics in JavaScript.
  That is the circular fixture the fixture-inputs rule forbids: the double would mirror the
  implementation instead of exercising it.
- Switching the e2e web server to wrangler/workerd would put real D1 in play at the cost of
  rehosting the entire dev-backend mechanism and 29 existing specs. Oversized for one fixture.

The correction: a real SQL engine behind the D1 interface. Node's built-in `node:sqlite`
(`DatabaseSync`, in-memory) executes the store's actual statements, so lockout, cooldown, and
consume semantics are real, while the harness stays in node where it already lives. The
feasibility round proved this empirically: the full `CHANNEL_SCHEMA_SQL` applies in one `exec`,
and the conditional upserts, `RETURNING` reads, the charge cap, and the bound-`LIMIT` prune all
behave under node's SQLite.

## The dev-fold gate is vacuous today, and this pass repairs it

`@sveltejs/adapter-cloudflare@7` does not bundle. `.svelte-kit/cloudflare/_worker.js` is a loader
that imports `../output/server/index.js` by relative path; the server code wrangler actually
bundles and deploys lives in `.svelte-kit/output/server/**`, outside the tree both
`.github/workflows/e2e.yml` and `.github/workflows/scaffold.yml` grep. Verified: an e2e-flagged
build with the dev backend fully live passes today's grep, because the grepped directory holds
only the loader, client assets, and prerendered HTML. The comment claiming "the adapter prunes
from the deployable Worker" describes an adapter that no longer exists.

The repair: both workflows run `npx wrangler deploy --dry-run --outdir=<tmp>` (no credentials
needed) and grep the bundle wrangler emits, which is the artifact Cloudflare receives. Each gate
gains a positive control: a step asserting the markers ARE present in a deliberately flagged
(`VITE_CAIRN_E2E=1`) build's bundle, so a grep that can never match again fails loudly instead of
passing silently. A gate with no positive control is how this one rotted. The dry-run also
answers, on the record, whether the default build's dead-code elimination actually drops the dev
chunks; the pass records that answer, because the readback route's defense-in-depth story depends
on it.

## The channel-DB double (`@glw907/cairn-cms-dev`)

New export `createChannelDb(schemaSql: string)`: applies the given schema and returns a
D1Database-shaped double over one in-memory `node:sqlite` database. It lives in the dev package,
not the showcase chassis, because it is exactly what any consumer needs to test its own channel
wiring; xcathletes Task 4 is the first external customer.

Contract, from the store's actual call surface (enumerated during the round, nothing else is
used): the bare database exposes `prepare` (the gated-page path calls `db.prepare().bind().first()`
directly through `resolveChannelSession`) and `withSession('first-primary')`; the returned session
exposes `prepare` and `batch`. Statement results need `first()` and `run()`. No `raw()`, no
`exec()`, no bookmarks, no `served_by`: single-node SQLite satisfies first-primary trivially.

Normative invariants, each with the defect it prevents:

- **`first()` returns `null`, never `undefined`.** `mintCode` compares `row !== null` strictly; a
  passed-through `undefined` from node:sqlite's `get()` makes a cooldown-rejected mint report
  minted, and the factory then delivers a code that is not in the store. A dev-package test
  asserts `Object.is(result, null)`.
- **`batch()` runs its statements inside one transaction**, the closer analogue to D1's batch
  atomicity than a bare loop.
- **`run()` steps its statement to completion** (multi-row deletes in `pruneRequesterRows` and
  `sweep` must not stop at one row the way `get()` would).
- `node:sqlite` loads by dynamic import inside the async factory. Not for bundle avoidance: vite
  externalizes `node:*` in the SSR environment by default and no workerd-target bundle exists in
  this pipeline. The dynamic import exists so a node below the floor gets a clear version-check
  error instead of a resolution failure. Floor: `node:sqlite` is unflagged from node 22.13 (CI's
  `node-version: 22` resolves above it; local is 24); the dev package gains an `engines` field.
- Fidelity tests target what the store depends on: the `first()` null invariant, `RETURNING` rows
  read back through `first()`, batch ordering, and the conditional-upsert cooldown contract.

## The showcase fixture

The fixture follows `docs/guides/add-a-login-channel.md` with three named divergences, stated
here so "living exemplar" does not overclaim. The guide places the channel module in
`src/lib/server/`; the showcase keeps no `src/lib`, so the module lives at
`examples/showcase/src/members/` (one directory, excludable as a unit). The guide wires
`verifyTurnstile` as `challenge`; the fixture cannot reach `challenges.cloudflare.com` from CI, so
it ships `insecureTestChallenge`, named to be unmistakable, with a header comment saying why it
exists and pointing at the guide's Turnstile section as the shipped shape. The guide's `deliver`
is a real transport; the fixture's is the capture transport below. Everything else follows the
guide, most importantly the one thing it bolds: the `MEMBER_DB` block carries
`"migrations_dir": "migrations-members"`, because a channel database sharing the default
`migrations/` directory cross-applies schemas (pass 1's review major). The same pass gives
`AUTH_DB` and `APP_DB` their own `migrations_dir` entries, one line each in the same file, so the
exemplar consumers copy stops modeling the bug.

Components:

- **Binding and migration.** `MEMBER_DB` in `examples/showcase/wrangler.jsonc` with a placeholder
  id, `migrations_dir` as above, and `migrations-members/0000_channel.sql` copied from
  `CHANNEL_SCHEMA_SQL`. An engine test asserts the file equals the export, trimmed the same way
  the existing guide-DDL drift test trims (the constant opens with a newline).
- **Channel config.** The members module calls `createAuthChannel`: `resolveDb` reads
  `platform.env.MEMBER_DB`; `lookup`/`normalize` run against a static demo roster of `@showcase.test`
  contacts sized at one contact per e2e spec plus one for local reruns; `challenge` is
  `insecureTestChallenge`. The fixture keeps every default clamp, so the exemplar is not a set of
  loosened numbers a consumer copies. No member-facing mutation exists outside the channel's own
  actions: the showcase disables SvelteKit's origin check site-wide and the dev harness does not
  install `createAuthGuard`, so the factory's own unconditional origin check is the only one in
  play, and the fixture must not add a hand-rolled member POST handler.
- **Delivery: the capture transport.** The site-authored `deliver` records, per contact, the last
  code and a delivery count, in module state. It carries `devDelivery`'s in-body refusal
  (`ctx.env.CAIRN_DEV_BACKEND === '1'` checked inside the function, so a wrapper cannot bypass
  it), which also keeps a default showcase deploy from holding OTP codes in worker memory.
- **Routes.** Login (request + confirm forms), a gated members page rendering the resolved
  subject, and logout live at `src/routes/members/` with no route group, matching the guide's own
  layout and staying clear of the `(site)` group's every-route-prerenders convention. Every
  members route sets `export const prerender = false`; a prerendered gated page would be served by
  the asset layer with the Worker never running. The pages are in the site theme and meet the
  five-viewport responsive bar.
- **Dev wiring.** The double is a module-level lazy singleton: one database per server process,
  created once, or no code row survives from `request` to `confirm` (and the factory's cached
  salt would go stale against a per-request database). A members dev handle composed via
  `sequence()` **merges** `MEMBER_DB` into `event.platform.env` rather than assigning
  `event.platform` (`devBackendHandle` assigns wholesale and only for `/admin` and `/media`;
  ordering must not let either clobber the other). The schema SQL arrives by relative `?raw`
  import of the migration file, so the harness applies the same bytes a consumer's
  `wrangler d1 migrations apply` would. The synthesized platform exposes **no** `waitUntil`:
  the factory then awaits delivery inline, which is what makes code readback deterministic.
  `auth.channel.delivery_inline` warnings are expected in the harness, an implementer must not
  silence them by adding a stub `waitUntil`, and the e2e never polls for a code.

## Test routes: the discipline

Three dev-only routes live under the already-excluded `src/routes/test/`: code readback
(`last-otp`), revocation, and a state reset. Each carries its own body-level refusal, following
`devDelivery`'s precedent that the refusal lives inside the body, never in a caller's gate:
refuse unless `isLocalHost(event.url.hostname)` and `platform.env?.CAIRN_DEV_BACKEND === '1'`.
The build fold (`devBackendEnabled`) compiles to a runtime env read in an e2e-flagged build, so a
flagged build that reaches a deployed runtime with that var set would otherwise expose an
unauthenticated OTP oracle; the hostname check closes that path at zero cost, since the harness
is always `localhost:4173`.

Two of the routes get further constraints. The readback route is a roster oracle by construction
(delivery only runs for known subjects), so it exists only against the fixture roster; the guide's
"prove your channel" section states as a rule that capture transports and readback routes must
never run against a database holding real contacts. The revocation route revokes only the
caller's own resolved subject, never a request-supplied identity: an identity-keyed destructive
route is the exact shape pass 1's rule forbids, the guide's roster-removal exemplar is the
authorized shape, and the route's header comment says it is a harness affordance, not a pattern.
The reset route clears the channel tables so a locally reused preview server
(`reuseExistingServer`) does not accumulate hourly budgets across runs until specs answer
`throttled`; the e2e calls it once at suite start.

## Template exclusion and the marker mechanism

Path exclusions added to `examples/showcase/.cairn-template.json`: `src/members`,
`src/routes/members`, and `migrations-members`. `src/routes/test` and `e2e` are already excluded.
The stale `src/routes/(site)/calendar` entry (its path no longer exists) is pruned, and the new
exclude-entries-must-exist assertion keeps the file honest from here on.

Two touch points live in shared files that path exclusion cannot reach: the `MEMBER_DB` block in
`wrangler.jsonc` and the fixture's injection lines in kept chassis files. For these,
`emit-template.mjs` gains marker-based line stripping as a post-copy pass over the emitted tree
(the emitter currently stream-copies; the post-copy pass keeps its filter intact). The mechanism
is fail-loud, with each rule closing a named corruption:

- Markers match as substrings of a line, so `//`, `#`, `<!-- -->`, and `/* */` comment forms all
  carry them; the supported forms are documented in the emitter.
- An unterminated start, a nested start, or an end with no start **throws**; a silently dropped
  end marker would otherwise truncate `wrangler.jsonc` below the `MEMBER_DB` block, taking the R2
  binding and vars with it.
- The block's own delimiting comma lives inside the marked region, and the emitted-template test
  parses the emitted `wrangler.jsonc` (JSONC-aware) and asserts exact `d1_databases` membership,
  never just the absence of `MEMBER_DB`.
- The pass only rewrites a file whose content contains a start marker, and skips any file
  containing a NUL byte, so a future binary asset cannot be corrupted by a utf8 round trip.
- The emitted-tree scan greps for `cairn-template:` generally, catching mistyped or leftover
  markers, and the showcase's own tree is checked for balanced pairs.

The emitted-template assertions live in `src/tests/unit/` where vitest collects them in CI (v1
would have put them beside `scripts/emit-template.test.mjs`, whose `test:emit` script no CI
workflow runs; engine tests already read `examples/showcase` files, so the precedent is
established). The design constraint the mechanism enforces, stated for the implementer: member
wiring is a closed subgraph reachable only from excluded files plus marker-stripped lines,
because a kept file importing an excluded file breaks the emitted build.

Rejected alternative: leaving a placeholder `MEMBER_DB` block in the emitted `wrangler.jsonc`. A
scaffolded site would inherit a binding it never asked for and a deploy that fails until the
owner deletes it.

## Fold markers: two lists, two propositions

v1 merged the two workflows' grep lists into one file; the round showed the two gates assert
different things, and one list would have turned both permanently red (route paths appear in the
route manifest regardless of the fold, and demo-domain substrings match prerendered content).
The corrected shape:

- `scripts/dev-fold-markers.txt`: symbols that must vanish from a **default build's deployed
  bundle**, shared by `e2e.yml` (showcase) and `scaffold.yml` (emitted template): the existing
  list plus `createChannelDb` and only those fixture symbols reachable solely behind
  `devBackendEnabled`. The showcase's own default build legitimately contains the fixture
  (roster, capture transport, members routes); the showcase build is never deployed, and the gate
  must not pretend otherwise.
- The template-forbidden token list lives in the emitted-template vitest test (one home, one
  meaning): tokens that must be absent from the **emitted tree's source**, per the acceptance
  test above.

Both workflow greps use `grep -F -f` (the current `-e` patterns already leak regex through `.`),
and the pattern file carries one pattern per line, no blanks and no comments: under GNU grep a
blank line in a `-f` file matches everything and turns the gate red on every run. A trivial test
asserts the file has no empty lines.

## E2E specs

One members spec file, one roster contact per spec as a stated requirement (the escalation gate
and send ceiling key on the bare identity, so distinct contacts hold distinct budgets; CI retries
multiply each spec's charges by three), `workers: 1` as today, reset called once at suite start.
Scope is the round trip plus the negatives a consumer's wiring could plausibly break; the engine
suite owns the deeper security matrix (lockout regression, decoy equivalence, expiry, atomicity)
and re-proving it through a browser would be slow, order-sensitive duplication.

1. Golden path: request, read the code back, confirm, the members page renders the subject,
   logout, and the gated page refuses after. The unauthenticated gated page is asserted to be a
   Worker-rendered refusal, not a static asset (the prerender trap above).
2. Wrong code: the error renders, then the correct code still completes.
3. Cooldown resend: a second request inside the cooldown answers sent, and the delivery count
   stays 1.
4. Same-browser discipline: a confirm attempted from a second browser context answers
   `no-pending-request`. This is the property the guide most insists on and the one a consumer's
   form wiring most plausibly breaks (by adding a hidden contact field).
5. Revocation: the test route revokes the caller's own subject; the live session dies and the
   gated page refuses.

## Documentation, changelog, tracking

The guide gains a "prove your channel" section: the double, the capture-transport pattern with
its fixture-roster-only rule and the in-body refusal, the warning that wrapping `devDelivery` in
a deployed Worker with observability enabled lands plaintext OTPs in Workers Logs, the
no-mutations-outside-channel-actions constraint on sites that disable SvelteKit's origin check,
and the fixture as its worked exemplar with the divergences named (Turnstile is the shipped
`challenge`; the stub exists for the harness). `createChannelDb` is documented in that section
(the dev package has no reference page today and `check:reference` does not cover it; the guide
is where a consumer meets the double, and any fenced TS block typechecks under `check:snippets`
or carries the existing skip marker). The changelog entry is additive under `## Unreleased`, no
version bump. ROADMAP prunes the Now-tier pass 2 entry. STATUS at close records that the
auth-channel work is releasable when a release is independently warranted, and names the
AI-posture pass as next.

## Review gate

This design has now had its own two-lens adversarial round (v1 to v2); the execution review gate
remains. `web-auth-security-reviewer` is mandatory and its brief carries two extra charges beyond
the pass diff: read the factory post-mortem's execution-locked decisions list (the
`requester_bucket` column, sweep-on-mint, the escalation-refund exits, the backwards-timestamp
guard; none has had an adversarial round) against the shipped factory code, and attack the new
surfaces as built: the test routes' refusals, the marker mechanism, the repaired fold gate's
positive control. `svelte-reviewer` covers the fixture routes. A scaled-down adversarial
find-and-verify workflow at the gate is worth its cost here; Geoff's opt-in call at execution
time.

## Risks and residuals, named

- Whether the default build's dead-code elimination actually drops the dev chunks from the
  deployed bundle is unknown until the repaired gate's dry-run answers it; the pass records the
  answer.
- The e2e proves the inline-delivery path only; a consumer on real Cloudflare gets
  fire-and-forget delivery through `waitUntil`, which stays proven by the engine's unit suite.
- Cookie-prefix behavior (`__Host-`, `Secure`) is never driven through a real browser: the
  harness is plain-http localhost, so the bare cookie names are what the e2e exercises. Unit
  tests own the prefixed path; named here rather than papered over.
- Marker stripping is new emitter behavior: gated by the fail-loud rules, the emitted-template
  vitest test, and CI's scaffold workflow building the emitted tree from packed tarballs.
- In-memory state spans the whole e2e run and, locally, across runs via `reuseExistingServer`:
  handled by per-spec contacts, the suite-start reset, and never by ordering assumptions.

## Out of scope

No release cut (the window holds unpublished at `0.93.0` until independently warranted). No
xcathletes work. No engine `src/lib` changes beyond tests. No admin UI. No new engine log events:
the fixture logs nothing of its own, and the factory's twelve events already cover the flows.

## Revision log

**v2 (2026-08-04).** Folded the pre-plan adversarial round (security lens, feasibility lens; both
Opus, run at Geoff's direction). Blockers: the dev-fold grep gate greps `.svelte-kit/cloudflare`,
which under adapter-cloudflare 7 holds no server code, so the gate repair became deliverable 5
with a wrangler dry-run target and a positive control; the emitted-template test moved into
`src/tests/unit/` because `test:emit` runs in no CI workflow. Majors folded: the double's bare-db
`prepare`/`withSession` surface and the `first()` null-not-undefined invariant; the singleton +
`sequence()` + platform-merge injection contract; in-body refusals on all test routes (hostname +
env, the `devDelivery` precedent); the revocation route re-shaped to self-subject-only under pass
1's identity rule; the marker mechanism made fail-loud with a JSONC parse assertion; the marker
list split into two lists asserting two propositions, with `grep -F -f` and the blank-line trap
named; `insecureTestChallenge` named as such with the Turnstile divergence stated; the capture
transport's roster-oracle nature and plaintext-OTP logging hazard pushed into the guide as rules;
`migrations_dir` required on `MEMBER_DB` (and added to `AUTH_DB`/`APP_DB`); members routes moved
out of `(site)` with `prerender = false` mandatory; the same-browser negative added as spec 4;
the suite-start reset route added for warm-server budget accumulation; the dynamic-import
rationale corrected (no workerd bundle exists; vite externalizes `node:*`; the import guards the
node floor) and the `ssr.external` fallback dropped as a no-op; `createChannelDb` documented in
the guide rather than a nonexistent dev-package reference page; the stale
`src/routes/(site)/calendar` exclusion pruned with an entries-must-exist assertion; the
`.wrangler/state` claim narrowed to the tracked tree. Residuals added: DCE answer pending,
inline-delivery-only proof, cookie prefixes unproven in-browser.
