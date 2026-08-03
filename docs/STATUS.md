# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-08-02: C2 is IN FLIGHT on a worktree; finish Task 14 and close it out)

**DO NOT START C2 FROM SCRATCH, AND DO NOT BRANCH OFF `main` FOR IT.** Every code task in C2 has
already landed on the worktree `.claude/worktrees/c2-breaking-window` (branch
`c2-breaking-window`, pushed to origin, off `main` at `d57e7c94`). 200 files changed, tree clean,
all gates green at every commit. `main` itself is unchanged, so a cold session that branches off
`main` by default will rebuild work that already exists.

**What remains in C2: Task 14 (the docs correction batch) and the close-out ritual.** The
per-task commit table, the TS2578 tripwire evidence, the five deviations from the plan's literal
text, and the five items Task 14 carries beyond its written file list are all recorded in the
plan's own **Execution record** section
(`docs/superpowers/plans/2026-08-02-c2-breaking-window.md`). Read that section first; it is the
handoff.

**Task 12 is NOT in C2.** Geoff took the pre-approved cut mid-execution (2026-08-02): C2 carries
Tasks 1-11, 13, 14; **Task 12, the refusal-channel convergence, is pass C2b** on its own worktree
off `main` after C2 merges, in the same unpublished window, appending its own `Consumers must:`
entries so the consumer still absorbs one batch. C2b also inherits one finding routed to it: **the
authorization asymmetry this pass introduced**, where `createSectionAction` now derives `target`
from `event.route.id` while `guard.ts`'s `requireAccess` still defaults to the attacker-influenceable
`event.url.pathname`. Whoever runs C2b should read
`docs/internal/2026-08-01-asc-consumer-brief.md`'s seam 2 first: ASC hand-rolled `club-action.ts`
because neither `adminAction` nor `requireAccess` served it, so the fix and the seam request may
want shaping together.

**Resume prompt** (fresh Opus 5 session, launched from `~/Projects/cairn-cms`):
"Finish the C2 breaking-window pass. Invoke `cairn-pass`, read
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md` in full including its Execution record
section, and work in the EXISTING worktree `.claude/worktrees/c2-breaking-window` (branch
`c2-breaking-window`) rather than creating a new one. Tasks 1-11 and 13 are done and committed;
run Task 14 via a `cairn-implementer` dispatch, including the five carried items the Execution
record lists, then the close-out ritual: code-simplifier over the changed code, the reviewer
fan-out, the from-scratch showcase `npm install` plus e2e as the migration-list completeness
proof, `api-surface.md` regenerated, post-mortem appended to the plan, STATUS updated, PR merged,
hold unpublished. Then C2b."

**Three consumer sites, not two.** `aksailingclub-org` carries `"@glw907/cairn-cms": "^0.91.1"`,
which on `0.x` admits only `>=0.91.1 <0.92.0`, so ASC is behind `0.92.0` and `0.93.0` as well and
migrates across this whole window in one jump. It is also the first admin-extension consumer, so
it exercises what C2 reshaped more than the two content sites do. `CLAUDE.md` still says "Two
production sites"; Task 14 corrects it.

**The lowest-friction order after C2** (worked through with Geoff 2026-08-02): finish C2 → C2b →
publish the window as one release with one combined `Consumers must:` list → migrate the three
sites **from their own repos**, ASC first (a site's own gate is the only real proof, and the
engine repo's own proof is `examples/showcase`) → phase P overlapping that migration, since P's
gates are worth most *before* the next new surface arrives → feature execution after P, with the
design sittings run during it. The scaffolder and Topo go late: the scaffolder emits from the
engine's surface, and Topo is a docs shell C2 has churned hard. Migration findings flow back here
(friction log, ROADMAP), never patched around site-side.

## Superseded (kept for the C2 window's context)

**THE STACK IS COLLAPSED. `main` IS CURRENT.** PRs #16 (ASC seams pass two) and #17 (phase C1, the
seam-shape pass) both merged to `main` on 2026-08-02. A cold session branches off `main` again by
default, and `main` now carries the `./cloudflare` subpath, `createD1AuditSink`, the corrected
surface snapshot, and every C1 ruling.

**Phase C1, the seam-shape pass, and the refusal-channel-convergence pass are both DONE and HOLD
UNPUBLISHED.** C1 landed all five of its ROADMAP contract entries: the surface snapshot's
nullability fix (`| undefined` was stripped unconditionally, corrected across 27 entries and 8
subpaths), the env-genericity sweep (no type changed, scoped to a site that intersects
`CairnPlatformBindings`), the function-color rulings, the refusal-channel documentation, and the
supported-toolchain matrix plus `engines: { node: ">=22" }`. One C1 entry has real consumer
content: **a site's `App.Platform['env']` must intersect `CairnPlatformBindings`**, previously only
a recommendation. Its post-mortem is appended to
`docs/superpowers/plans/2026-08-01-pre-beta-c1-seam-shape.md`.

C1 also found, and deliberately did not fix, a defect this pass then closed: `AdminActionError`'s
`status` never reached the browser, since SvelteKit derives a response status only from its own
`HttpError`/`SvelteKitError`, so a plain `Error` subclass always rendered 500 regardless of the
status it carried. **The refusal-channel-convergence pass converged `adminAction`'s two
authorization refusals onto SvelteKit's own native shapes**: a missing editor now redirects to
`/admin/login` (matching `requireSession` exactly), a CSRF mismatch throws `error(403, ...)`
(logging the new `admin.action.csrf_rejected` event first), and `AdminActionError` stays exported
but now means only the dev-only unaudited-action defect signal. The docs rewrite dropped the
`handleError` requirement everywhere it was stated (the reference, the custom-admin-screen guide),
and the showcase's `hooks.server.ts` had its `handleError` hook deleted entirely, restoring
SvelteKit's default: the strongest demonstration that cairn needs no mapping. The window (still
`## Unreleased`, `release-size: minor`) now carries the ASC seams pass two, C1, and this
convergence pass together.

**NEXT: execute phase C2, the breaking-window pass.** The Fable sitting ran 2026-08-02 and
adjudicated every in-window item and all 31 confirmed audit findings. The rulings AND the
execution plan live in **`docs/superpowers/plans/2026-08-02-c2-breaking-window.md`** (fourteen
tasks; the agenda spec is now historical input). The design bar Geoff set for the sitting: a
truly beautiful API surface, no compatibility hedging for current sites, judged for a human
developer and an AI coding agent at once. Headline rulings: one `CairnEvent<Env>` replaces the
four named plus five inline event shapes; `AuthEnv`/`BackendEnv` collapse into `CairnEnv` with
structural email-binding acceptance (the env-genericity tripwire is the proof); `locals` keys
take the flat `cairn*` prefix with no aliases; role names widen to `string` (capabilities stay
closed); one naming grammar covers members, facade keys, bags, and factory verbs;
`/admin-fields` merges into `/admin-toolkit`; `adminNav` retires (`navLayout` is the one nav
seam); `AdminActionError` becomes `UnauditedActionError`; six log events rename and every
`reason`/`scope` value goes snake_case; the refusal channel converges on `fail()` plus a
bounded error-code union (closing the `?error=` phishing surface); every type named in a public
signature becomes exported.

**PLAN APPROVED 2026-08-02 (Geoff), Task-12 split PRE-APPROVED:** if the pass bursts,
execution cuts at Task 12 (the refusal-channel convergence) into pass C2b on its own judgment,
same unpublished window, one combined `Consumers must:` list at the cut, no further ask.

**Resume prompt** (fresh Opus 5 execution session, from `~/Projects/cairn-cms`, on `main`):
"Execute the C2 breaking-window pass. Invoke `cairn-pass`, read
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md` in full, create a worktree off
`main`, and run the fourteen tasks in order via `cairn-implementer` dispatches, reviewing each
diff and confirming the full gate between tasks. Task 1's tripwire proof gates the pass:
if `BareWranglerSiteEnv` does not fail TS2578, stop and report. The Task-12 contingency split
into C2b is pre-approved; exercise it if the pass bursts. One PR (two if split), one
`Consumers must:` list assembled task by task, hold unpublished at close."

**Open question for Geoff, still unanswered and now due.** Where the two feature design sittings
(history/revert, preview) slot against the standing template queue (the optical-centering ratchet,
the cairn.pub voice sitting, the ASC Assets trial, Topo, the scaffolder). C1 said this call comes due
after it. It is now after it.

**A process finding worth keeping.** C1's review gate found five real defects with every gate green,
three of them the species pass two named: a claim the code makes about itself, invisible to every
mechanical check. The most important was that Task 2's compile fixtures built their site env from
cairn's own types, so part of what they proved was circular. A negative control (which C1 ran, and
which passed) proves a fixture CAN fail; it does not prove the fixture models the real input.
**When a fixture stands in for a consumer, build its input from the consumer's sources, not from the
library's own types.**

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; cairn-side mitigation weighed in ROADMAP); mermaid
diagrams near-illegible at 320/390 (candidate: the Topo pass); section-index breadcrumbs duplicating
the arm name; the cairn.pub live admin smoke (Geoff's magic link plus publish round-trip) is owed;
the `/admin/help` first-steps card overlap (ROADMAP, Now); the `sideEffects` coverage gate filed as
mechanical hardening. ASC's own retrofits run in that repo on its own clock, both seams passes now
landed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass), and `STATUS-archive-2026-07-29-to-2026-08-01.md` (the `0.91.0` publish, the
`0.91.1` hotfix and ASC harvest fold, the `0.92.0` design-ratchet minor, and the xcathletes seams
pass as planned).
