# Design: the auth-channel consumer proof (pass 2)

Date: 2026-08-04. Status: approved design, pre-plan. Author: Fable sitting with Geoff.

Pass 1 (`2026-08-03-auth-channel-factory-design.md` v3.1, merged to `main` at `06b3470d`) shipped
`createAuthChannel` and proved it against the engine's own integration harness on real miniflare
D1. Nothing yet proves the built package through a consumer's bundler, which is why the factory
pass declared itself not releasable. This pass is that proof: the showcase `/members` fixture, its
D1 plumbing, the scaffolder exclusion that keeps the fixture out of every generated site, and the
e2e that drives a real request-confirm-session round trip through built dist.

## What this is

Four deliverables, sized at the factory pass's own scope boundary and the ROADMAP Now-tier entry:

1. A channel-DB double in `@glw907/cairn-cms-dev`: real SQLite behind the D1 interface.
2. A showcase `/members` fixture wired exactly as `docs/guides/add-a-login-channel.md` instructs a
   consumer, doubling as the guide's living exemplar.
3. Scaffolder exclusion of the whole fixture, proven by a test over the actually emitted tree, plus
   a marker-strip mechanism in `scripts/emit-template.mjs` for the two touch points path exclusion
   cannot reach.
4. The e2e specs (round trip plus the two consumer-breakable negatives) and the dev-fold grep
   markers, de-duplicated into one file both workflows consume.

The window context: xcathletes Task 4 has not run (`~/Projects/xcathletes-org` does not exist;
ecxc-ski's team-platform pass 1 execution session has not started), so the seam's window is open.
After this pass the unpublished window becomes releasable on the auth-channel work.

## The acceptance test

A fresh `npm run test:e2e` in `examples/showcase` completes a member login end to end (request,
code readback, confirm, gated page, logout, revocation) against the built package, and the emitted
template contains no trace of the fixture: no members route, no readback route, no
`migrations-members/`, no `MEMBER_DB` binding, no leftover strip markers. The second half is the
load-bearing security property. `scripts/emit-template.mjs` copies the showcase verbatim minus
exclusions, so an unguarded fixture ships a code-readback oracle into every scaffolded site. A test
must prove the absence; the emitter does not read comments.

## The harness truth this design corrects

The factory pass's Pass 2 sketch assumed a wrangler-backed e2e ("migration-apply step plus
`.wrangler/state` reset"). The harness does not work that way. The showcase e2e runs
`VITE_CAIRN_E2E=1 npm run build && npm run preview` (`examples/showcase/playwright.config.ts`) in
plain node: no miniflare, no workerd, no `.wrangler/state` anywhere in the repo. The dev backend
synthesizes `platform.env` with in-memory fakes, and admin auth is injected directly by
`devBackendHandle` rather than minted through D1. So `MEMBER_DB` in e2e cannot be a real wrangler
D1, and the two obvious substitutes both fail:

- Extending `fake-auth-db`'s SQL-string-matching pattern would mean reimplementing the channel
  store's conditional upserts, sliding windows, and `DELETE ... RETURNING` semantics in JavaScript.
  That is the circular fixture the fixture-inputs rule forbids: the double would mirror the
  implementation instead of exercising it.
- Switching the e2e web server to wrangler/workerd would put real D1 in play at the cost of
  rehosting the entire dev-backend mechanism and 29 existing specs. Oversized for one fixture.

The correction: a real SQL engine behind the D1 interface. Node's built-in `node:sqlite`
(`DatabaseSync`, in-memory) executes the store's actual statements, so lockout, cooldown, and
consume semantics are real, while the harness stays in node where it already lives.

## The channel-DB double (`@glw907/cairn-cms-dev`)

New export `createChannelDb(schemaSql: string)`: applies the given schema and returns a
D1Database-shaped double over one in-memory `node:sqlite` database. It lives in the dev package,
not the showcase chassis, because it is exactly what any consumer needs to test its own channel
wiring; xcathletes Task 4 is the first external customer.

Contract:

- Implements the surface the channel store touches: `withSession('first-primary')` returning a
  session-shaped object over the same database (single-node SQLite satisfies first-primary
  trivially), `prepare(sql).bind(...)` with `first()`, `run()` (including `meta.changes`), and
  `all()`, plus `batch()`. Unknown SQL executes rather than throwing; this double runs real SQL,
  the deliberate opposite of `fake-auth-db`'s string dispatch, and the two patterns coexist
  because the things under test differ (a roster UI's four statements versus atomic SQL whose
  semantics are the point).
- `node:sqlite` loads by dynamic import inside the factory, so the workerd-target e2e build never
  resolves it at bundle time. The factory is therefore async. Fallback if the adapter build still
  trips: a vite `ssr.external` entry, decided at plan execution, not here.
- Node floor: `node:sqlite` is unflagged from node 22.13 (CI's `node-version: 22` resolves above
  it; local is 24). The dev package states the floor in `engines` and the factory fails with a
  clear message on older nodes.
- Dev-package tests prove D1-shape fidelity where the store depends on it: `first()` null on no
  row, `meta.changes`, `RETURNING` rows, batch order.

## The showcase fixture, built the way the guide says

The fixture is the guide's exemplar, so it follows `docs/guides/add-a-login-channel.md` exactly
(the fixture-inputs rule: a consumer stand-in uses the consumer's sources). Components:

- **Binding and migration.** `MEMBER_DB` in `examples/showcase/wrangler.jsonc` with a placeholder
  id (the `AUTH_DB`/`APP_DB` house pattern) and its own `migrations-members/0000_channel.sql`,
  copied byte-for-byte from `CHANNEL_SCHEMA_SQL`. An engine test asserts the file equals the
  export, the same drift guard the guide's DDL block already has.
- **Channel config.** A members module at `examples/showcase/src/members/` (one dedicated
  directory, excludable as a unit) calling
  `createAuthChannel`: `resolveDb` reads `platform.env.MEMBER_DB`; `lookup`/`normalize` run
  against a static demo roster of a handful of `@showcase.test` contacts (enough for one contact
  per e2e spec, which is what keeps specs order-independent on a shared in-memory database);
  `challenge` is a minimal form-token presence check, with a comment pointing at the guide's
  Turnstile section as the real implementation.
- **Delivery: the capture transport.** The site-authored `deliver` records the last code and a
  delivery count per contact in module state. A dev-gated readback route under the
  already-excluded `src/routes/test/` (following the `/test/last-commit` precedent) returns both.
  The route is double-guarded: `devBackendEnabled` folds it out of default builds, and the
  template exclusion keeps its source out of scaffolded sites.
- **Routes.** Login (request + confirm forms), a gated members page rendering the resolved
  subject, logout, all under `src/routes/(site)/members/`, in the site theme, meeting the
  five-viewport responsive bar. A dev-gated test route invokes `revokeSessions` so the e2e can
  prove revocation.
- **Dev wiring.** Under `devBackendEnabled`, the chassis injects
  `platform.env.MEMBER_DB = await createChannelDb(sql)` where `sql` is the migration file imported
  `?raw`, so the harness applies the same bytes a consumer's `wrangler d1 migrations apply` would.

## Template exclusion and the marker mechanism

Path exclusions added to `examples/showcase/.cairn-template.json`: `src/members`,
`src/routes/(site)/members`, and `migrations-members`. `src/routes/test` and `e2e` are already
excluded.

Two touch points live in shared files that path exclusion cannot reach: the `MEMBER_DB` block in
`wrangler.jsonc` and the fixture's injection lines in kept chassis files. For these,
`emit-template.mjs` gains marker-based line stripping: lines between `// cairn-template:exclude-start`
and `// cairn-template:exclude-end` (JSONC comment form in `wrangler.jsonc`) are dropped from
copied text files. This is in-pattern with the emitter's existing `package.json` rewrite. The
design constraint it enforces, stated for the implementer: member wiring is a closed subgraph
reachable only from excluded files plus marker-stripped lines, because a kept file importing an
excluded file breaks the emitted build.

The emitted-template test grows real teeth: today `scripts/emit-template.test.mjs` unit-tests
`transformPackageJson` and `isExcluded` only, and the actual filesystem copy is proven nowhere
outside CI's scaffold workflow. The new test runs `emitTemplate()` to a temp directory and asserts
the acceptance list above (no members routes, no readback route, no `migrations-members`, no
`MEMBER_DB`, no marker comments left in any emitted file).

Rejected alternative: leaving a placeholder `MEMBER_DB` block in the emitted `wrangler.jsonc`. A
scaffolded site would inherit a binding it never asked for and a deploy that fails until the owner
deletes it. The marker mechanism is new emitter surface, but it is small, tested, and the emitted
tree stays clean.

## Fold markers, de-duplicated

The dev-elimination grep list is currently pasted twice, in `.github/workflows/e2e.yml` and
`.github/workflows/scaffold.yml`, which is the exact drift shape that dropped `check:consumers`
from retyped gate lists last pass. The fixture's new dev-only symbols (`createChannelDb`, the
capture-transport names, `last-otp`, the demo contacts) join the list, and the list moves to one
file, `scripts/dev-fold-markers.txt`, consumed by both workflows via `grep -f`, so it can no
longer fork. Both workflows keep failing when any marker appears in the deployable Worker output.

## E2E specs

One members spec file, one roster contact per spec, `workers: 1` as today. Scope is the round trip
plus the two negatives a consumer's wiring could plausibly break; the engine suite owns the deeper
security matrix (lockout regression, decoy equivalence, expiry, atomicity) and re-proving it
through a browser would be slow, order-sensitive duplication.

1. Golden path: request, read the code back, confirm, the members page renders the subject,
   logout, and the gated page refuses after.
2. Wrong code: the error renders, then the correct code still completes (no attempt wasted by the
   consumer's form wiring).
3. Cooldown resend: a second request inside the cooldown answers sent, and the delivery count
   stays 1.
4. Revocation: the test route revokes the subject; the live session dies and the gated page
   refuses.

## Documentation, changelog, tracking

The guide gains a "prove your channel" section: the double, the capture-transport pattern, and the
fixture as its worked exemplar. The dev package's reference page picks up `createChannelDb`. The
changelog entry is additive under `## Unreleased`, no version bump. ROADMAP prunes the Now-tier
pass 2 entry. STATUS at close records that the auth-channel work is releasable when a release is
independently warranted, and names the AI-posture pass as next.

## Review gate

`web-auth-security-reviewer` is mandatory and its brief carries two extra charges beyond the pass
diff: read the factory post-mortem's execution-locked decisions list (the `requester_bucket`
column, sweep-on-mint, the escalation-refund exits, the backwards-timestamp guard; none has had an
adversarial round) against the shipped factory code, and attack the new surfaces, the readback
route's fold and the exclusion-as-oracle-guard. `svelte-reviewer` covers the fixture routes. A
scaled-down adversarial find-and-verify workflow at the gate is worth its cost here; Geoff's
opt-in call at execution time.

## Risks, named

- `node:sqlite` behind the workerd-target bundle: mitigated by dynamic import, with
  `ssr.external` as the fallback; the e2e build itself is the test.
- Marker stripping is new emitter behavior: gated by the emitted-template test and CI's scaffold
  workflow, which builds the emitted tree from packed tarballs.
- In-memory state spans the whole e2e run: handled by one roster contact per spec, never by
  ordering assumptions.

## Out of scope

No release cut (the window holds unpublished at `0.93.0` until independently warranted). No
xcathletes work. No engine `src/lib` changes beyond tests. No admin UI. No new engine log events:
the fixture logs nothing of its own, and the factory's twelve events already cover the flows.
