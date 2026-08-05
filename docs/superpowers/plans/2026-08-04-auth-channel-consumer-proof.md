# The auth-channel consumer proof (pass 2)

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/auth-channel-2` (branch
> `auth-channel-2`, off `main`). The main loop reviews each diff and confirms the full gate between
> dispatches. Tasks specify outcomes, constraints, and acceptance criteria; the implementer writes
> the code test-first against them. Tell every dispatch to run its gates in the foreground (pass
> 1's dispatches parked themselves on background test runs until told this).

**Authority:** the approved design spec **v2**
[`2026-08-04-auth-channel-consumer-proof-design.md`](../specs/2026-08-04-auth-channel-consumer-proof-design.md).
Read it in full before the first dispatch. v2 folded a two-lens adversarial round; the revision
log names what v1 got wrong, and two of those wrongs (a vacuous CI gate, a test CI never runs)
are now deliverables here.

**Goal:** prove the shipped `./auth-channel` subpath through a consumer's bundler and a real
browser round trip, keep the fixture out of every scaffolded site by test rather than by comment,
and repair the dev-fold gate the safety story leans on. After this pass the unpublished window is
releasable on the auth-channel work.

**Sequencing pressure:** the seam's window closes the session xcathletes runs its Task 4. Confirm
that has not happened before starting (state lives in the ecxc-ski repo; as of 2026-08-04,
`~/Projects/xcathletes-org` does not exist).

**The rule carried from pass 1**, governing the two test routes this pass adds:

> **No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.**

## Global constraints (every task)

- The CI gate list, pasted from `.github/workflows/test.yml` (copy this block into dispatches; do
  not retype): `npm run check`, `npm test`, `check:package`, `check:reference`,
  `check:reference:signatures`, `check:surface`, `check:custom-surface`, `check:chassis-boundary`,
  `check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`, `check:readiness`,
  `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose`, `check:version`,
  `check:dev-package`, `check:consumers`, showcase `check`, `check:comments`. Per-task dispatches
  run the targeted tests plus `npm run check` and `npm test`; the CI-only four (`check:comments`,
  `check:reference:signatures`, `check:surface`, `check:snippets`) run at pass end and in any task
  touching what they gate.
- **Worktree showcase gotcha:** `examples/showcase/node_modules` symlinks back to the main
  checkout, so before trusting any showcase check or e2e in the worktree, run a from-scratch
  `npm install` in the worktree's showcase to repoint both `file:` deps. `pretest:e2e` already
  repackages the library.
- No engine `src/lib` changes except tests. No new engine log events. No version bump.
- Comments follow TSDoc per the ts-conventions skill (Svelte files per svelte-conventions); the
  em dash is banned in comments. `check:dev-package` runs ESLint over the dev package, so the new
  module takes the full treatment.
- No PII in anything logged or persisted by the fixture beyond the demo `@showcase.test` strings.
- The fixture keeps every factory default clamp; no loosened numbers.

## File map

| Path | Responsibility |
|---|---|
| `packages/cairn-cms-dev/src/channel-db.ts` | `createChannelDb`: the node:sqlite D1 double. |
| `packages/cairn-cms-dev/src/index.ts` | Barrel gains the export. |
| `scripts/dev-fold-markers.txt` | The one dev-fold marker list both workflows grep with `-F -f`. |
| `.github/workflows/e2e.yml`, `.github/workflows/scaffold.yml` | Repaired gate: wrangler dry-run bundle target plus positive control. |
| `examples/showcase/src/members/` | The fixture module: channel config, roster, capture transport, challenge, dev wiring. |
| `examples/showcase/src/routes/members/` | Login, gated page, logout. No route group; `prerender = false`. |
| `examples/showcase/src/routes/test/{last-otp,revoke-member-session,reset-members}/` | Dev-only harness routes, each with an in-body refusal. |
| `examples/showcase/wrangler.jsonc`, `examples/showcase/migrations-members/0000_channel.sql` | `MEMBER_DB` binding (marker-wrapped) and the channel migration. |
| `examples/showcase/.cairn-template.json`, `scripts/emit-template.mjs` | Exclusions plus the fail-loud marker-strip pass. |
| `src/tests/unit/auth-channel-migration-drift.test.ts`, `src/tests/unit/emit-template-tree.test.ts` | The drift guard and the emitted-tree scan, both collected by vitest. |
| `examples/showcase/e2e/members.spec.ts` | The five specs. |
| `docs/guides/add-a-login-channel.md`, `CHANGELOG.md`, `ROADMAP.md` | The docs arm. |

---

### Task 1: `createChannelDb`, the channel-DB double

**Files:** create `packages/cairn-cms-dev/src/channel-db.ts`,
`packages/cairn-cms-dev/src/channel-db.test.ts`; modify `packages/cairn-cms-dev/src/index.ts`,
`packages/cairn-cms-dev/package.json` (`engines` field).

**Interfaces produced (later tasks consume these exact names):**
`createChannelDb(schemaSql: string): Promise<ChannelDb>`, exported from the package barrel.
`ChannelDb` is structurally D1-compatible for the surface the channel store touches: on the bare
object, `prepare(sql).bind(...args)` with `first<T>(): Promise<T | null>` and
`run(): Promise<{ meta: { changes: number } }>`, plus `withSession(constraint?: string)` returning
a session object exposing the same `prepare` and `batch(statements): Promise<unknown[]>`. The
showcase wiring casts it to `D1Database` once at the injection site.

**Outcome:** the spec's double contract, proven by dev-package tests vitest already collects
(`packages/cairn-cms-dev/src/**/*.test.ts` is in the root config's unit project).

**Constraints:** one in-memory `node:sqlite` `DatabaseSync` per returned instance, schema applied
in the constructor via `exec`; `node:sqlite` loads by dynamic import inside the factory, and a
node below 22.13 gets a thrown error naming the floor (also stated in the new `engines` field);
**`first()` maps node:sqlite's `undefined` to `null`** (the store's `mintCode` compares
`row !== null` strictly; a passed-through `undefined` makes a cooldown-rejected mint report
minted); `run()` steps its statement to completion, never `get()`; `batch()` wraps its statements
in one transaction; `withSession` ignores its constraint argument (single-node SQLite satisfies
first-primary trivially) and shares the one database; unknown SQL executes rather than throwing,
the deliberate opposite of `fake-auth-db`'s string dispatch, and a header comment says why the
two patterns coexist.

**Acceptance:** tests prove `Object.is(await stmt.first(), null)` on a no-row query; a
`RETURNING` row reads back through `first()`; `meta.changes` reflects a multi-row delete;
`batch()` applies in order and atomically (a failing statement rolls back the batch); applying
`CHANNEL_SCHEMA_SQL` (test-only relative import from `src/lib/auth-channel/store.js`, the same
way engine tests import it; the dev package's runtime code must not depend on the engine)
succeeds and the mint
conditional-upsert contract behaves through the double (fresh mint returns a row, in-cooldown
mint returns null, post-cooldown mint returns a row); the thrown node-floor message names 22.13.
`npm run check:dev-package` and `npm test` green.

### Task 2: Repair the dev-fold gate

**Files:** create `scripts/dev-fold-markers.txt`, `src/tests/unit/dev-fold-markers.test.ts`;
modify `.github/workflows/e2e.yml`, `.github/workflows/scaffold.yml`.

**Interfaces produced:** the marker file, one `grep -F` pattern per line, no blanks, no comments:
the eleven existing patterns from `e2e.yml` plus `createChannelDb`.

**Outcome:** both workflows grep the bundle wrangler actually ships, with a positive control, so
the gate answers the question it claims to answer. This is the spec's deliverable 5: the current
gate greps `.svelte-kit/cloudflare`, which under adapter-cloudflare 7 holds only a loader, client
assets, and prerendered HTML, and passes on a build with the dev backend fully live.

**Constraints:** the deployable artifact is produced by
`npx wrangler deploy --dry-run --outdir=<tmp>` (no credentials needed) run in the built showcase
(and, in `scaffold.yml`, in the emitted tree); the negative check greps that outdir with
`grep -rlF -f scripts/dev-fold-markers.txt` after a **default** build and fails on any hit; the
positive control runs the same grep against a **flagged** (`VITE_CAIRN_E2E=1`) build's dry-run
outdir and fails if nothing matches, with a message naming it a gate self-test (a gate with no
positive control is how this one rotted); the stale "the adapter prunes" comment is replaced by
one stating what is actually measured; exit-code semantics stay `if grep ...; then fail` as
today; the workflows' existing step order otherwise stands, and `test:e2e`'s own webServer
rebuild is unaffected.

**Acceptance:** the marker-file test asserts no empty or `#`-prefixed lines; both workflow files
grep with `-F -f` and reference no inline `-e` pattern list; a local rehearsal of both greps
(default build clean, flagged build matching) is pasted into the task report, and the default
build's result is recorded in the pass notes as the answer to the spec's DCE residual. Worktree
CI green on the workflow changes.

### Task 3: The fixture module, binding, migration, and dev wiring

**Files:** create `examples/showcase/src/members/channel.ts`,
`examples/showcase/src/members/capture-transport.ts`,
`examples/showcase/src/members/dev-wiring.ts`,
`examples/showcase/migrations-members/0000_channel.sql`,
`src/tests/unit/auth-channel-migration-drift.test.ts`; modify
`examples/showcase/wrangler.jsonc`, `examples/showcase/src/hooks.server.ts`.

**Interfaces produced:** from `channel.ts`: `memberChannel` (the `createAuthChannel` instance)
and `MEMBER_ROSTER: ReadonlyMap<string, string>` (contact to subject; six `@showcase.test`
members: one per e2e spec plus one spare for local reruns), plus `insecureTestChallenge(event,
form)`. From `capture-transport.ts`: `captureDeliver(contact, code, ctx)` (the channel's
`deliver`), `readCapture(contact): { code: string, count: number } | null`, `resetCapture():
void`. From `dev-wiring.ts`: `membersDevHandle: Handle`.

**Outcome:** the spec's fixture components minus routes: a working channel config a later task's
routes call, injected `MEMBER_DB` in dev, and the migration with its drift guard.

**Constraints:** `resolveDb` reads `platform.env.MEMBER_DB` and the config follows the guide's
shape (`normalize` lowercases and trims, `lookup` reads `MEMBER_ROSTER`, `cookie.name` is not
`cairn_`-prefixed); `insecureTestChallenge` verifies presence of a form token the login page
embeds, is named exactly that, and its header comment says it exists because CI cannot reach
`challenges.cloudflare.com` and points at the guide's Turnstile section as the shipped shape;
`captureDeliver` carries the in-body refusal (`ctx.env.CAIRN_DEV_BACKEND === '1'` checked inside
the function, the `devDelivery` precedent, so a wrapper cannot bypass it) and keys both code and
count **per contact**; the `MEMBER_DB` block in `wrangler.jsonc` carries a placeholder id and
`"migrations_dir": "migrations-members"`, and `AUTH_DB` and `APP_DB` gain their own
`migrations_dir` entries in the same edit; the `MEMBER_DB` block and the `hooks.server.ts`
injection lines are wrapped in `cairn-template:exclude-start` / `cairn-template:exclude-end`
marker comments (stripped by Task 5; the block's delimiting comma sits inside the markers);
`dev-wiring.ts` holds the double as a **module-level lazy singleton** (one database per server
process; a per-request database loses the code row between request and confirm and stales the
factory's cached salt), imports the schema by relative `?raw` import of
`../../migrations-members/0000_channel.sql`, and **merges** `MEMBER_DB` into
`event.platform.env` without replacing `event.platform`; `hooks.server.ts` composes with
`sequence(membersDevHandle, ...)` under `devBackendEnabled` and the synthesized platform exposes
**no** `waitUntil` (inline delivery is what makes readback deterministic;
`auth.channel.delivery_inline` warnings are expected and must not be silenced); no member-facing
mutation exists outside `memberChannel.actions`.

**Acceptance:** the drift test asserts the migration file equals `CHANNEL_SCHEMA_SQL`, both
sides trimmed the way `auth-channel-guide-ddl.test.ts` trims (the constant opens with a
newline); showcase `npm run check` green (which proves the `@glw907/cairn-cms/auth-channel`
types resolve through the consumer's tsconfig); `npm test` green; one targeted existing admin
e2e spec (`golden-path.spec.ts`) green locally, proving the `sequence` change did not break
`/admin`'s platform injection.

### Task 4: Members routes and the three test routes

**Files:** create `examples/showcase/src/routes/members/+page.server.ts`, `+page.svelte`,
`login/+page.server.ts`, `login/+page.svelte`, and
`examples/showcase/src/routes/test/last-otp/+server.ts`,
`test/revoke-member-session/+server.ts`, `test/reset-members/+server.ts`.

**Interfaces consumed:** Task 3's `memberChannel`, `readCapture`, `resetCapture`, and the
dev-wiring singleton (the reset route needs the live database to clear tables).

**Interfaces produced (the e2e consumes these):** `GET /test/last-otp?contact=<c>` answering
`{ code, count }` or 404; `POST /test/revoke-member-session` revoking the **caller's own**
resolved subject; `POST /test/reset-members` clearing all channel tables and the capture map.

**Outcome:** the spec's routes: login (request and confirm forms posting to
`memberChannel.actions.request` / `.confirm`), a gated members page rendering the resolved
subject via `memberChannel.resolveSubject`, logout via `.logout`, and the three harness routes.

**Constraints:** every members route sets `export const prerender = false` (a prerendered gated
page is served by the asset layer with the Worker never running); an unauthenticated `/members`
redirects (303) to `/members/login`; the pages use the site theme and hold composure at 320, 390,
768, 1440, and 2560; the login form embeds `insecureTestChallenge`'s token and a resend control;
each test route's **body** refuses (404) unless the hostname is localhost (`localhost`,
`127.0.0.1`, `::1`; the engine's `isLocalHost` is internal, so the fixture writes its own
three-value check) **and** `platform.env?.CAIRN_DEV_BACKEND === '1'`, independent of
`devBackendEnabled` (the fold compiles to a runtime env read in a flagged build; the hostname
check closes the deployed-flagged-build path); the revocation route derives the subject from the
caller's session only, never from the request body (an identity-keyed destructive route is the
shape pass 1's rule forbids), and its header comment names it a harness affordance, not a
pattern; the readback route's header comment names the roster-oracle property and the
fixture-roster-only rule.

**Acceptance:** showcase `npm run check` green; `npm test` green; a manual `curl` transcript in
the task report showing each test route's 404 without the env flag and its refusal logic reading
the hostname; svelte-conventions followed in the `.svelte` files.

### Task 5: Template exclusion, marker stripping, and the emitted-tree test

**Files:** modify `examples/showcase/.cairn-template.json`, `scripts/emit-template.mjs`,
`scripts/emit-template.test.mjs`; create `src/tests/unit/emit-template-tree.test.ts`.

**Interfaces produced:** `stripMarkedBlocks(content: string, filePath: string): string` exported
from `emit-template.mjs` beside `isExcluded` and `transformPackageJson`, applied by
`emitTemplate()` as a post-copy pass.

**Outcome:** the emitted template provably carries no fixture: the spec's acceptance test, in a
file CI runs (vitest collects `src/tests/unit/**`; the existing `test:emit` script runs in no
workflow, which is why the new test does not live there).

**Constraints:** `.cairn-template.json` gains `src/members`, `src/routes/members`, and
`migrations-members`, and drops the stale `src/routes/(site)/calendar` entry; marker matching is
substring-of-line so `//`, `#`, `<!-- -->`, and `/* */` forms all carry it, with the supported
forms documented in the emitter header; an unterminated start, a nested start, or an end with no
start **throws** naming the file (a silently dropped end marker truncates `wrangler.jsonc` below
`MEMBER_DB`, taking the R2 binding and vars with it); the pass rewrites only files whose content
contains a start marker and skips any file containing a NUL byte; the post-copy pass runs inside
`emitTemplate()` so the CI scaffold workflow and the new test exercise the same code path.

**Acceptance:** the new vitest test emits to a temp directory and asserts: no emitted file
contains `MEMBER_DB`, `createAuthChannel`, `migrations-members`, `last-otp`, any
`MEMBER_ROSTER` contact, or the string `cairn-template:` (`editor@showcase.test` is exempt; it
is the dev backend's and legitimately ships); the emitted `wrangler.jsonc` parses as JSONC and
its `d1_databases` array is exactly `AUTH_DB` and `APP_DB`; every `exclude` entry in
`.cairn-template.json` matches an existing showcase path; the showcase's own tree has balanced
marker pairs. `scripts/emit-template.test.mjs` gains the `stripMarkedBlocks` unit cases
(unterminated throws, nested throws, orphan end throws, binary skip, non-marker file untouched).
`npm test` green.

### Task 6: The e2e

**Files:** create `examples/showcase/e2e/members.spec.ts`.

**Interfaces consumed:** Task 4's routes and readback shapes; the roster contacts from Task 3.

**Outcome:** the spec's five specs, driving the built package through a real browser.

**Constraints:** `test.beforeAll` posts `/test/reset-members` once (warm local servers accumulate
hourly budgets via `reuseExistingServer`); each spec uses its own roster contact, stated in a
comment as a requirement, not a convenience (identity-keyed budgets are per contact; CI's
`retries: 2` multiplies charges by three); the suite never polls or sleeps for a code (delivery
is awaited inline because the harness platform has no `waitUntil`; a poll would mask an ordering
regression); assertions go through rendered UI plus the readback route, never the database.

**Acceptance:** the five specs, all green under `npm run test:e2e` from the worktree's showcase
after its from-scratch `npm install`:

1. Golden path: request, `readCapture` code via `/test/last-otp`, confirm, `/members` renders
   the subject, logout, then `/members` answers the 303 refusal, asserted as a redirect rather
   than a static 200 (the prerender trap).
2. Wrong code: submitting a wrong code renders the error, then the right code still completes.
3. Cooldown resend: a second request inside the cooldown answers sent; `count` stays 1.
4. Same-browser discipline: a confirm from a second browser context answers `no-pending-request`.
5. Revocation: after login, `POST /test/revoke-member-session`; the session is dead and
   `/members` refuses.

### Task 7: The docs arm

**Files:** modify `docs/guides/add-a-login-channel.md`, `CHANGELOG.md`, `ROADMAP.md`.

**Outcome:** the guide's new "Prove your channel" section per the spec's Documentation section;
tracking updated.

**Constraints:** the section covers `createChannelDb` (its contract and the node 22.13 floor;
the dev package has no reference page and `check:reference` does not cover it, so the guide is
the double's documented home), the capture-transport pattern with the fixture-roster-only rule
and the in-body refusal, the plaintext-OTP warning (wrapping `devDelivery` in a deployed Worker
with observability enabled lands codes in Workers Logs, which the log-events contract promises
never happens), the no-mutations-outside-channel-actions constraint for sites that disable
SvelteKit's origin check, and the showcase fixture as the worked exemplar with its divergences
named (Turnstile is the shipped `challenge`; `insecureTestChallenge` exists for the harness);
fenced TS blocks typecheck under `check:snippets` or carry the existing skip marker; the prose
follows the guides-arm register in `docs/internal/docs-register.md` and passes Vale's Google
package; the changelog entry is additive under `## Unreleased`, no version bump; ROADMAP prunes
the Now-tier consumer-proof entry (the editor-default-to-codes question and the passkey layer
entries stay).

**Acceptance:** `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose` green, run by
name; the guide's new section cites the e2e spec file and the fixture paths that exist.

### Task 8: Pass close

The `cairn-pass` ending ritual, whole: code-simplifier over the pass's changes; the full gate
including the four CI-only checks by name; reviewer fan-out with `web-auth-security-reviewer`
mandatory and briefed with the spec's two extra charges (read the factory post-mortem's
execution-locked decisions list against the shipped factory code, since none has had an
adversarial round; and attack the new surfaces as built: the test routes' refusals, the marker
mechanism, the repaired gate's positive control), plus `svelte-reviewer` (fixture routes) and
`cloudflare-workers-reviewer` (workflow and wrangler changes), findings folded before merge; a
scaled-down adversarial find-and-verify workflow instead of the flat fan-out is worth its cost
here, on Geoff's opt-in; post-mortem appended to this plan; STATUS updated on `main` recording
that the auth-channel work is releasable when independently warranted and naming the AI-posture
pass next; worktree merged per Geoff's call; context-clear prep with the exact resume prompt.

**No release cut in this pass.** Releasability is what the pass proves, not what it exercises.

---

## Self-review (run at write time)

Spec coverage: deliverable 1 is Task 1; deliverable 2 is Tasks 3 and 4; deliverable 3 is Task 5;
deliverable 4 is Tasks 2 and 6; deliverable 5 is Task 2; the docs section is Task 7; the review
gate and residuals are Task 8 and the spec's own list. The spec's normative invariants
(first-null, singleton, merge-not-assign, in-body refusals, self-subject revocation, fail-loud
stripping, prerender false, default clamps) each appear verbatim in a task's constraints.

---

## Post-mortem (2026-08-05)

**Shipped, and the pass's goal is met:** the `./auth-channel` subpath is now proven through a
consumer's bundler and a real browser. Twelve commits on `auth-channel-2`, merged to `main`.

### What landed

- **Task 1**, `createChannelDb` in `@glw907/cairn-cms-dev`: an in-memory `node:sqlite` double behind
  the D1 surface the channel store touches. Its tests drive the engine's own `mintCode` and
  `CHANNEL_SCHEMA_SQL`, so the fidelity is non-circular. `first()` maps `undefined` to `null`,
  the invariant that keeps a cooldown-rejected mint from reporting success.
- **Task 2**, the dev-fold gate, repointed at a real `wrangler deploy --dry-run` bundle with a
  positive control, and the pattern list moved to `scripts/dev-fold-markers.txt`.
- **Task 2b (added mid-pass, Geoff's call)**, the fold repair. See below.
- **Task 3**, the fixture: channel config, six-contact roster, capture transport, `MEMBER_DB` with
  its own `migrations_dir`, and dev wiring reachable only through a dynamic import inside the
  build-time branch.
- **Task 4**, the members routes and three harness routes, each refusing in its own body.
- **Task 5**, `stripMarkedBlocks` plus the forbidden-token scan over the emitted tree, in
  `src/tests/unit/` where CI actually collects it.
- **Task 6**, five e2e specs. Full suite 118 passing.
- **Task 7**, the guide's "Prove your channel" section, changelog, ROADMAP, and the harvest.

### The pass's real story: a gate that had never been honest

Task 2 existed because spec v2's adversarial round found the dev-fold gate vacuous. Repairing it
turned it honest, and it immediately failed. A default build's deployable bundle carried the entire
dev backend, because `dev-gate.ts` exported one constant and told every call site to read it, "so
the fold has one module boundary to survive, not two." One is one too many: SvelteKit's SSR build
folds the constant inside its own chunk and never propagates the value across the boundary.

The code was unreachable behind the literal `false` and the engine's 503 tripwire still backstopped
it, so nothing was exploitable. Everything claiming the bundle was clean was wrong, including the
published dev-package README, the tutorial, and six code comments.

Geoff's call was to fix it in-pass rather than record it, which is what kept the pass coherent: its
whole purpose is proving an OTP oracle cannot ship. The fix is a Vite `define` substituted at each
call site. Verified both directions on the showcase and the emitted template.

**The general lesson, banked in the harvest:** a gate whose passing condition is an absence needs a
companion assertion that it can still detect a presence. Absence gates decay into no-ops when the
thing they inspect moves, and nothing announces it.

### The visual regression, and a lesson about "pre-existing"

Task 6 reported five failing `site-visual` specs as pre-existing and unrelated. They were neither.
Its evidence was that removing its own spec file left them failing, which proves only that its file
was not the cause. **The control for "did my work cause this" is the base branch.** A run on clean
`main` passed all eleven.

The cause was worth the hunt. `src/lib/render/rehype-dispatch.ts` writes `card-body` and `card-title`
into runtime-generated HTML. Tailwind scans source files and never runtime output, so DaisyUI ships
those base rules only when some source file happens to name the same class. A members login page
named `card-title` once, every callout on the public site picked up DaisyUI's card styling, a
heading wrapped to a second line, and 26px shifted down every page below it.

The fixture now uses plain utilities, which is the conservative fix, not the resolution. Whether the
chassis should safelist the classes the engine emits is filed to the roadmap's Now tier, routed
through the visual-fidelity gate, because resolving it moves the approved baseline.

### The review gate found three real defects its own verifiers refuted

A six-lens adversarial find-and-verify workflow ran at Geoff's opt-in: 43 agents, 37 raw findings,
and the workflow's own answer was zero survivors. That answer was wrong, and the fault is in how the
gate was written. The refutation prompt said "set refuted=true if you are uncertain," which is the
right instinct against false positives and, at 35 refutations out of 35, is evidence the bar was
mistuned rather than that the code was clean. Two more verifiers died on API errors, and their
findings were silently dropped by the survivor filter rather than surfaced as unjudged.

Reading the raw findings directly turned up three real defects:

1. **The login page shipped the channel module to the browser.** It imported two challenge constants
   from `channel.ts`, which calls `createAuthChannel` at module scope and imports the capture
   transport. The built client bundle carried `createAuthChannel`, `captureDeliver`, a roster
   contact, and a subject id. Contained in the showcase, which never deploys, but this is the
   exemplar consumers copy, and a real site would serve its member roster to every visitor. The
   constants moved to a leaf module; verified clean against a fresh default build.
2. **The changelog carried no entry for the dev-fold fix**, so the release body would have shipped
   without the one `Consumers must:` line the window most needs.
3. **`packages/cairn-cms-dev/src/handle.ts` still named the retired fold** as layer one of its fence,
   in the published package, after the pass claimed to have corrected every instance.

**The lesson for the next gate:** "refute if uncertain" plus "count only survivors" is a filter that
can return zero on a diff with real defects in it. Read the raw findings, not just the verdict, and
treat an all-refuted result as a signal to check the bar. Route a dead verifier to the orchestrator
as unjudged rather than letting a truthiness filter drop it.

### Scope and cost

Nine planned tasks became ten, plus three follow-on fixes. Every addition traced to one causal chain
from a single defect (the fold), and the pass was not split, which still looks right: Tasks 3 through
7 ran exactly as written.

Cost was dominated by one decision. The review workflow ran 43 agents for 3.1M tokens across roughly
7.8 hours of wall clock, and returned zero survivors that a direct read of its own raw output
overturned in minutes. **A smaller fan-out with the orchestrator reading raw findings would have
found the same three defects for a fraction of the spend.** Six lenses at high effort, each with
per-finding verifiers at high effort, is over-scaled for a diff this size.

Human interaction points: two. One genuine fork (the fold defect, correctly Geoff's call on pass
scope) and one check-in on elapsed time, which the runaway guard should have pre-empted with a
progress note rather than leaving Geoff to ask.

### Residuals

- The spec's DCE question is **answered**: a default build did NOT eliminate the dev chunks, and now
  does. Recorded here and in the harvest.
- The e2e proves the inline-delivery path only; `waitUntil` fire-and-forget stays covered by unit tests.
- Cookie prefixes (`__Host-`, `Secure`) are still never driven through a real browser: the harness is
  plain-http localhost.
- `scripts/emit-template.test.mjs` still runs in no CI workflow, so the new `stripMarkedBlocks` unit
  cases are not enforced there. The emitted-tree vitest test exercises the same code path and does
  run, so the mechanism is covered; the unit cases are not. Worth folding into the four-CI-gates
  consolidation already queued in phase P.
- The showcase's default deployable bundle measures ~3.17 MiB gzipped, over the Workers Free 3 MiB
  script limit. The showcase never deploys, so it gates nothing today, but a scaffolded site starts
  from this template. Filed here rather than fixed.

### Addendum: the workflow changes were never validated until they hit CI

The merge to `main` turned `e2e` and `scaffold` red, and the cause was in this pass's own Task 2
edit. A step name read `- name: Gate self-test: the markers ARE present ...`, and an unquoted
colon-and-space inside a plain YAML scalar is a mapping indicator, so both files stopped parsing.
Both workflows went dark on the same push.

Two things made this worse than an ordinary typo. First, an unparseable workflow fails as a run with
no jobs, no failed step, and no log: `gh run view --log-failed` answers "log not found" and the run
page explains nothing, so diagnosing it means parsing the YAML locally. Second, **nothing in the
repository read these files.** Task 2's acceptance line asked for "worktree CI green on the workflow
changes," which was never satisfiable without pushing the branch, and the local gate list has no
workflow-syntax check at all. The pass verified the greps by hand-running them and never verified
that the file declaring them could parse.

Fixed by quoting, and closed structurally: `src/tests/unit/workflow-yaml.test.ts` parses every
workflow and asserts it declares jobs. **A gate that can be taken fully offline by a syntax error is
worse than a gate that fails**, and this repo had no check standing between the two. Converting the
watch into a test is the standard already stated in `CLAUDE.md`; this is one more instance of it.

The irony is exact and worth recording: a pass whose central finding was "a gate with no positive
control rots silently" shipped a change that silently took two gates offline.
