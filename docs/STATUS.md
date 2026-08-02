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

## Immediate next action (2026-08-01: pass one SHIPPED and PUBLISHED as `0.93.0`; next is pass two)

**ASC engine-seams pass one is DONE, merged, and published.** `0.93.0` is `latest` on npm, cut
because ASC and ecxc need the seams now (release trigger 1). The window carried the `./auth-store`
and `./auth-crypto` subpaths, `createSectionAction`, the `publishedAt` manifest stamp with
`newlyPublishedEntries`, and the CodeMirror bump; a minor because it added two public export
subpaths. `Consumers must: nothing` on every entry. Merged as PR #15 (`af939d0f`) with all five CI
checks green, `e2e` included, so the consumer build is proven on a real checkout. The post-mortem
is appended to `docs/superpowers/plans/2026-08-01-asc-engine-seams-1.md`.

**One design decision changed during the pass, and pass two inherits it.** The pass-end adversarial
review found that the spec's check order let a refused session read deployment state off the status
code, so `resolveDb` now runs AFTER every authorization check. The spec's "Pass-end review record"
section carries the amended order and the two deliberately non-adopted suggestions (throwing rather
than `fail(...)`, and rest-parameter route detection). The packaged audit sink's reference in pass
two must describe denials as arriving before any binding resolution.

**NEXT: ASC engine-seams pass two.** Seams 3, 4, and 5 are fully designed in
`docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md` (sections "Pass two, seams 3 and 4"
and "Pass two, seam 5"), so this needs NO second design sitting, only its just-in-time plan written
from the spec by the executing session. Contents: a new server-only `./cloudflare` subpath carrying
`verifyTurnstile` plus `checkRateLimit`/`checkRateLimitKeys` (typed against the same structural
`RateLimitLike` pass one shipped, one shared type, not two), and the packaged D1 audit sink
(`createD1AuditSink(db, waitUntil)` on `./sveltekit`, plus a packaged migration). Two things the
planning session must settle at plan time:

1. **Claim the migration number against the queue.** The audit migration wants the next free number,
   `0002` today, but the queued `COLLATE NOCASE` auth migration (ROADMAP, Next) may claim it first.
   Check before writing the plan.
2. **The `./cloudflare` charter line is load-bearing.** Cloudflare-native platform primitives are
   in-stack; third-party verifiers (Stripe, Discord, and their kin) are not, and must never ride the
   Turnstile precedent in. The subpath exists partly to make that boundary physical.

**Resume prompt**, from `~/Projects/cairn-cms`: "Execute ASC engine-seams pass two per `cairn-pass`.
The spec designs it fully (`docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md`, the two
pass-two sections); write the just-in-time plan from it first, then execute on a feature worktree off
`main`, dispatching each task to `cairn-implementer`. `web-auth-security-reviewer` and
`cloudflare-workers-reviewer` are both mandatory at the pass-end fan-out. Hold unpublished at close
unless a consumer needs it."

**The pre-beta work is now organized (Geoff, 2026-08-01).** ROADMAP's "Toward 1.0" carries a new
section, "The pre-beta pass series and the two-release shape": phases C (contract), F (the three core
features), then RELEASE ONE as the last substantial `0.x`, then phase P (polish and docs), the
go-public pass, the dress rehearsal, and RELEASE TWO as `1.0.0-beta.1`. Three features are ratified
as beta-gating and bundle into one release: entry history, revert, and public preview for a
non-editor, all promoted to ROADMAP's Now tier, each needing its own design sitting before a plan.
Nineteen pre-beta entries file in Next across four clusters (contract, polish, design, DX). **Open
question for Geoff, deliberately not answered:** where the two design sittings slot against the
standing queue (the optical-centering ratchet, the cairn.pub voice sitting, the ASC Assets trial,
Topo, the scaffolder). The natural reading is that the contract cluster front-runs the feature
passes, since the features build on the very shapes a naming or genericity sweep may move. The
two-release shape itself is RECOMMENDED, not ratified; flipping to a single beta moves only the
release-one boundary and leaves every pass invariant.

Two carry-notes from this pass, both worth keeping:

1. **A plan's file list is a starting point, not a contract.** Three separate implementer dispatches
   found the plan wrong by verifying rather than complying: the `check-reference-signatures.mjs`
   instruction was backwards in both tasks that carried it (that list is an EXEMPTION allowlist, so
   following it would have skipped the signature check for exactly the exports this pass added), and
   Task 3's file list omitted two compile necessities. Dispatch prompts should keep saying so.
2. **`npm test | tail` masks the gate.** A run here captured `tail`'s exit status instead of npm's;
   the real check is an unpiped run or `PIPESTATUS`. The shell-gate-hygiene rule already names this.

**Published state:** `0.93.0` is `latest`, published 2026-08-01. The unpublished window on `main` is
now EMPTY. `0.94.0` is the next free number; verify with `npm view @glw907/cairn-cms versions --json`
at the next cut, never before.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; cairn-side mitigation weighed in ROADMAP); mermaid
diagrams near-illegible at 320/390 (candidate: the Topo pass); section-index breadcrumbs duplicating
the arm name; the cairn.pub live admin smoke (Geoff's magic link plus publish round-trip) is owed;
the `/admin/help` first-steps card overlap (ROADMAP, Now). ASC's own retrofits (its
`member-auth/lib/crypto.ts` reducing to imports, and `club-action.ts`'s `resolveCairnAccess` cast
disappearing into the factory) run in that repo on its own clock, now unblocked by `0.93.0`.

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
