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

## Immediate next action (2026-08-02: the C2 audit sweep is DONE and appended to the agenda; next
is the C2 sitting on Fable)

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

**NEXT: phase C2, now widened to the breaking-window pass** (ROADMAP, "The pre-beta pass series and
the two-release shape"). The full agenda is consolidated at
`docs/superpowers/specs/2026-08-02-c2-breaking-window-agenda.md` (DRAFT, adjudication pending): the
rename set, the `locals` namespace policy, the subpath taxonomy, the event-shape trio, the
env-genericity decision whole, the log-event vocabulary, the deprecated-alias sweep,
`AdminActionError`'s residual identity, `SectionActionConfig.resolveDb`'s shape, the built-in
actions' refusal pattern, and reserved vocabulary for the F features. The refusal-channel
convergence above was filed as a C2 input; it is done and removed from the agenda's list, since it
changed what `AdminActionError` means and the naming pass should not name a symbol mid-change, which
is why this pass ran first.

**Sequencing, per the agenda:** the read-only adversarial audit sweep ran 2026-08-02 as the
opted-in workflow (five Opus-pinned lenses over the settled surface; 46 raw findings, 42 after
dedup, every one adversarially verified, 31 confirmed and 11 refuted). The confirmed findings are
appended to the agenda spec under "Audit-sweep evidence (2026-08-02)", grouped by agenda item.
Items 5 and 11 drew no findings; five findings fit no existing item and sit under "New findings".
The sweep is records, not adjudication. Next the Fable sitting reads
`docs/internal/api-surface.md` (C1 corrected it; it now records nullability for the first time)
plus the full agenda, evidence included, and adjudicates every in-window item. Execution stays one
pass, one diff, one `Consumers must:` list, the only genuinely breaking pass in the series.

**Resume prompt** (Fable planning sitting, from `~/Projects/cairn-cms`, on `main`): "Run the C2
breaking-window sitting. Read
`docs/superpowers/specs/2026-08-02-c2-breaking-window-agenda.md` in full, the audit-sweep evidence
section included, plus `docs/internal/api-surface.md`. Adjudicate every in-window item (silence is
not a decision) and write the execution plan. The sitting ends at plan approval; execution runs in
a fresh Opus 5 session on a worktree off `main` (the stack is collapsed), lands ONE diff with one
`Consumers must:` list, and holds unpublished at close unless a consumer needs it."

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
