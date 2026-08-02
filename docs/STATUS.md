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

## Immediate next action (2026-08-01: ASC seams pass two DONE and holding; next is phase C1)

**ASC engine-seams pass two is DONE on `asc-engine-seams-2`, and it HOLDS UNPUBLISHED.** The pass
shipped the `./cloudflare` server-only subpath (`verifyTurnstile`, `checkRateLimit`,
`checkRateLimitKeys`, and the consolidated `RateLimitLike`) and the packaged D1 audit sink
(`createD1AuditSink` on `./sveltekit` plus `migrations/0002_audit.sql`), closing the last three
seams of the ASC consumer brief. Both changelog entries are additive, `Consumers must: nothing`,
and the window sits at `release-size: minor`. No consumer is blocked on it, so it batches with the
next window rather than cutting a release; `0.94.0` is the next free number, verified at the cut and
never before. The post-mortem is appended to
`docs/superpowers/plans/2026-08-01-asc-engine-seams-2.md`.

**What that pass proved about the gates.** Every gate was green when the reviewer fan-out began, and
the pass still carried a defect in each of its two headline features: the audit sink's advertised
fail-open covered only a rejected promise (so an unbound binding turned a completed mutation into a
500 the editor would retry), and `verifyTurnstile`'s body guard checked that `success` existed and
then tested it for truthiness, so `{"success":"false"}` verified as a solved token. Both were
probe-confirmed by two independent reviewers. Neither was reachable by a test written first, because
both were failures of a claim the implementation made about itself. The mandatory
`web-auth-security-reviewer` plus `cloudflare-workers-reviewer` fan-out earned its place twice over.

**NEXT: phase C1, the seam-shape pass** (ROADMAP, "The pre-beta pass series and the two-release
shape"). It needs a design sitting only for what the entries leave open; its four contract entries
are already written in ROADMAP's Next tier. Contents, in this order:

1. **The `check-reference-signatures.mjs` `| undefined` fix, FIRST** (Geoff approved 2026-08-01).
   `normalizeSignature` strips `| undefined` unconditionally, so this pass's three
   deliberately-required `T | undefined` parameters (`createD1AuditSink`'s `waitUntil`, and
   `binding` on both rate-limit helpers) are recorded in `api-surface.md` as plain required
   parameters. It runs first because its blast radius is unknown until the snapshot regenerates, and
   because C2's naming sitting reads that snapshot as its review document. **If the regen cascades
   past a handful of signatures, split it back out to P1 rather than absorbing it.**
2. The env-genericity sweep of exported event and config types.
3. The function-color audit (`render(md)` sync, `AdminActionAuditSink`'s `(record) => void`), each
   ruling recorded on its reference page.
4. The refusal-channel ruling (`adminAction` throws, `createSectionAction` returns `fail(...)`):
   document the two-channel model in the `./sveltekit` reference or converge it.
5. The supported-toolchain matrix.

**Resume prompt**, from `~/Projects/cairn-cms`: "Execute phase C1, the seam-shape pass, per
`cairn-pass`. ROADMAP's Next tier carries its five entries; write the just-in-time plan from them
first, sequencing the `check-reference-signatures.mjs` fix FIRST and splitting it back out if its
snapshot regen cascades. Then execute on a feature worktree off `main`, dispatching each task to
`cairn-implementer`. Documentation goes LAST in any task where code is still moving. Hold
unpublished at close unless a consumer needs it."

**The process lesson pass two paid for, which the next pass inherits.** Documentation ran as a
sibling of code changes and therefore described a moving target: stale failure-mode lists, a stale
`created_at` format claim, and a retention command that silently never prunes its boundary day. Half
of the second review round was that self-inflicted staleness rather than new defects. **When code is
still moving, documentation goes last, not alongside**, and that holds within a single dispatch as
well as across them.

**The pre-beta shape is unchanged** (ROADMAP, "Toward 1.0"): phases C then F, RELEASE ONE as the
last substantial `0.x`, then phase P, the go-public pass, the dress rehearsal, and RELEASE TWO as
`1.0.0-beta.1`. **Open question for Geoff, still deliberately unanswered:** where the two feature
design sittings (history/revert, preview) slot against the standing template queue (the
optical-centering ratchet, the cairn.pub voice sitting, the ASC Assets trial, Topo, the scaffolder).
That call comes due after C1, not before it.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; cairn-side mitigation weighed in ROADMAP); mermaid
diagrams near-illegible at 320/390 (candidate: the Topo pass); section-index breadcrumbs duplicating
the arm name; the cairn.pub live admin smoke (Geoff's magic link plus publish round-trip) is owed;
the `/admin/help` first-steps card overlap (ROADMAP, Now); the `sideEffects` coverage gate filed as
mechanical hardening (the fix works today, nothing tests it, and the glob is depth-fixed). ASC's own
retrofits run in that repo on its own clock, both seams passes now landed.

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
