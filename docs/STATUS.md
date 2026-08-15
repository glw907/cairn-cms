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


## Immediate next action (2026-08-15: Pass D is DONE; next is release one)

**Pass D, the documentation reset, is complete across all three phases.** Phase 1 (PR #34) and
Phase 2 (PR #35) merged earlier; Phase 3 (Tasks 9 through 14) closes the pass. The published
corpus is now four audience tracks, counted as files including each arm's index:
`docs/admin/` at 8, `docs/editors/` at 8, `docs/extend/` at 31, and the kept `docs/reference/`
arm at 24 (its 23 pages plus the index), alongside `docs/why-cairn.md` and the rewritten front
doors. The old guides, tutorial, and explanation arms are deleted, every
published path redirected, and every gate in the cutover bill rewired and proven red once.
Plan and post-mortem: `docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md`.

**The Task 13 production gate ran all five stages and its findings are folded.** 118 findings:
114 folded as CONFIRMED or NARROWED, 3 refuted, 1 with no owning fold (its target is outside
this repo). Three routed to `ROADMAP.md` as engine or cross-repo fixes rather than docs fixes.
The four blind persona walks all failed their first run, which was the gate's highest-value
result, and each failure is fixed in its own track: the editors track now says where the sign-in
page is, `is-it-working.md` separates the checks an admin can run from the ones nobody can,
`restrict-admin-access` states the roles precondition `defineAccess` needs, and the reference arm
settles which config key names the code actually uses. Record with per-finding dispositions:
`docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md`.

**One lesson from the close worth carrying, since it cost a whole extra round.** Two fold agents
reported completion for nine CONFIRMED or NARROWED findings they never applied, and the close-out
caught it only by grepping the tree for each finding's quoted text instead of reading the fold
reports. All nine are folded and grep-verified now. **A fold report is a claim; confirming a fold
landed costs one grep against the text the finding said was there.** The re-fold dispatches
carried that proof requirement, and `ROADMAP.md` keeps the caution rather than the work.

### Release one is next, and the editors read is ON HOLD behind a visual-layer decision

**The editors-track read is deferred, not skipped (Geoff, 2026-08-15).** On first contact with the
finished track he asked why the docs carry no images or diagrams, and the answer changes the pages
themselves rather than adding to them: the corpus ships zero visuals, the screenshot half was a
real ruling whose live-reproduction replacement was never built, and the diagram half was never
decided at all (eight diagrams went out with the deleted arms). **Prose written to stand alone
without a picture is substantially different prose**, so pages like
`write-in-the-editor.md`'s `## The screen`, which is a screenshot rendered in words, get rewritten
and shortened rather than illustrated. Reading the track closely now would grade prose that is
expected to change. The full finding, the evidence, and what the decision owes are the
visual-layer entry at the top of `ROADMAP.md`'s Now tier.

**The open question, and it is Geoff's alone: does release one cut on the prose corpus as it
stands, with the visual layer landing in a later release, or does it wait for the rewrite?** Both
are defensible. The corpus is correct, gated, and shippable as prose today, and four consumer sites
are waiting on the window; against that, a first published docs corpus is a first impression, and
the rewrite changes pages a reader would have already read. **Nothing else blocks the cut**, so
this answer alone decides whether the next action is `cairn-release` or a docs visual pass.

**When the read does happen**, record it here as a line reading `Editors-track read: done <date>`,
immediately below this paragraph, before `cairn-release` is invoked. No agent pass substitutes for
it; a cold session that finds no such line treats the read as outstanding and stops, rather than
re-asking or standing in for it.

**Release one is cut directly from `main`**, which is where this doc and the whole window now
live; the `cairn-release` skill needs no worktree of its own, unlike a development pass. **Then
invoke `cairn-release`**, verifying the next number is free first
(`npm view @glw907/cairn-cms versions --json`; numbers are immutable). Release one rolls this
window plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs
reset. **Its same-cut obligations, all four in one publish**, so no shipped page describes
tooling that is not installable: the engine window, `create-cairn-site`,
`@glw907/cairn-cms-dev`, and the template repo, plus T5a' (the public repo, the first sync, the
button spike, the C3 check). Task 7's staged button block consumes the button spike.

**A defect owed BEFORE release one: a tarball-installed scaffold ships NO `.gitignore`.** npm
drops the file from every tarball, the baked template carries none, and `scaffold.mjs` never
writes one, so `pushScaffold`'s ignore-honoring silently no-ops and `.dev.vars`/`.wrangler` sit
one `git add -A` from a push. Re-verified 2026-08-14. Tool code, deliberately outside Pass D's
docs scope, so it rides its own small pass or the release-one sitting checks it off first.

Queue: **release one -> the three-site walk -> P.**

### cairn-pub is PREPARED and deliberately not merged

Branch `pass-d-docs-tracks` at `e7218a4` in `~/Projects/cairn-pub`, **local only, never pushed**
(plan ruling 3). Proven against a packed tarball: 81 prerendered pages, zero broken links, a
clean rebuild. **The site walk merges it after release one**, and the ordering is forced rather
than a preference: that branch reads the docs payload out of its installed
`@glw907/cairn-cms`, and the published `0.94.0-rc.1` predates the restructure, so a build against
the registry fails on the pages the restructure added until release one ships the new payload. It also fixed a defect the rebuild
introduced there: the reference index's new "also for site admins" grouping relists three pages
and the loader walked every bullet list, so the second occurrence won the prev/next map. Its
link policy is a build-time throw.

### Hand steps for Geoff, independent of the queue above

These are not gated on release one, the site walk, or each other. Item (1) in particular should be
actioned now rather than batched with the rest; it is listed first because it is a live credential
exposure, not because it is first in any sequence.

**NINE outstanding, one urgent.** (1) **URGENT: rotate the estate
Cloudflare token** (`Cloudflare Admin 2026-07`), leaked into a transcript and still active; mint
a replacement, run `~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, delete the
old one. (2) Delete the GitHub App `cairn-t4b-live-03cd31`. (3) Revoke the T4c spike API token
`d07b2a25f05151591830c45053186979`, then `rm -f ~/.config/cairn/t4c-spike-token
~/.config/cairn/store-t4c-token.sh`. (4) 907-life's push-to-deploy has been broken since
2026-07-14. (5) Mint the fine-grained `TEMPLATE_REPO_TOKEN` PAT at release one. (6) The button
spike's browser moment, owed at release one with T5a'. (7) Delete the GitHub App
`cairn-t5-scratch` (id 4585219), which uninstalls installation 153531337 with it; with (2) the
ledger stands at two Apps awaiting deletion. (8) Revoke three Cloudflare API tokens at
dash.cloudflare.com/profile/api-tokens, all named for `create-cairn-site`: T5 run 1's five-key
token, T5 run 2's eight-key token, and the eight-key token minted 2026-08-13 for T4d's live proof
and teardown. (9) Check the Workers Paid opt-in taken at T5 run 2's prompt, in case the account
was not already on it via 907-life.

**Carry-forwards (the tool initiative), verified against this list, not a remembered one.**
(1) An externally registered domain still owes the branches the scratch domain cannot reach.
(2) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(3) `check:comments` and the root type-check cover `src/lib` only, so `packages/create-cairn-site`
has neither a comment gate nor a type gate; its own `npm test` is the real gate. (4) The
`paid-plan-missing` mapping keys on entitlement wording rather than a code. (5) The deferred
defect list per the T4a spec's ruling 2. (6) Root `CLAUDE.md` has no context headroom left; the
next addition there must trim first. (7) `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved token
that fails validation throws rather than re-validating, a deliberate narrowing. (8) `runStep`
exists as an identical one-liner in four modules; the hoist is right but is a cross-cutting
refactor of pre-existing code. (9) A first `--yes` run cannot reach `builds-live`, since the
reconcile hash gate has no prior hash. (10) The bake couples the template's installability to the
publish window. (11) No gate proves a scaffold against the registry. (12) The console scenario is
mirrored in `test/console-hold.test.mjs` and `.github/workflows/create-site.yml` with nothing
linking them. (13) No spawned-child test covers the pre-first-probe interrupt window. **CLOSED by
Pass D:** the browser-moment counts (the admin track's domain page states them) and the
umbrella's resume table (now `docs/admin/setup-recovery.md`).

## Standing state (release ordering, consumers, open items, carry-forwards)

**The whole `create-cairn-site` initiative is shipped history**, T4a through T4d plus T5: the
detail lives in each plan's post-mortem and the archived entries. The T4c live spike at
`docs/internal/record/2026-08-12-t4c-builds-spike.md` stays the fixture source for every Builds
fake body and carries its teardown table. Pass D is now history too, on the same terms; the
entry above holds what release one still needs from it.

**Release one is the next cut** (ordering amended by Geoff 2026-08-09, and Pass D was the last
gate on it). The entry above carries the same-cut obligations and the one human read still owed.

**cairn-pub's open item, not yet resolved:** the `cairn-cms` GitHub App installation does not
carry `glw907/cairn-pub`, so a save or publish on that site cannot commit. Adding a repository to
an App installation needs a token that can modify the App (the `gh` OAuth token and the stored bot
PAT both refuse), which needs Geoff, in a browser, at the App's own installation settings.

**One registry loose end, not acted on.** A stale `rc` dist-tag still points at `0.6.0-rc.1` from
the pre-rebuild era, so `npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses
`next`, so `rc` should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an
outward-facing registry change nobody asked for.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**FOUR consumer sites.** ASC is current on `^0.94.0`; the other three sit on their own `0.x`
carets and move only by migration (a caret admits only its own minor in `0.x`), which waits for
release one per the ordering above:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `0.94.0-rc.1` (pinned exact) | this window only. **Corrected 2026-08-14 at Pass D Task 12**, which found this row claiming `^0.87.4`: a prior pass already landed the full upgrade, so the six-minor gap this table asserted does not exist. The `Consumers must:` work is done, blocked only on the GitHub App item above |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site.** It is current on the engine, pinned at
`0.94.0-rc.1`; what it is behind on is the docs restructure, which its prepared
`pass-d-docs-tracks` branch carries and the site walk merges.

**Two worktrees survive the Pass D cleanup, and neither is live work.**
`.claude/worktrees/wayfinder-retheme-lab` and `.claude/worktrees/wayfinder-fixtures` hold
token-layer design experiments from 2026-07-02, left unmerged on purpose as a reference for a
later retheme. Nothing branches from them and no executor runs in them; the one-executor-per-worktree
check clears against them trivially. Every other worktree and every merged branch was pruned at the
Pass D close, so `main` plus these two is the whole local picture.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock. **One docs-rendering carry-forward retired here:** the section-index
breadcrumb duplication rode the old arm structure, so it re-verifies against the rebuilt cairn-pub
loader at the site walk rather than standing as a known defect. **The mermaid-legibility item is
moot for the wrong reason, and the reason is now the open item** (see the visual-layer entry in
`ROADMAP.md`): no published page carries a diagram because the rebuild deleted all eight along
with the arms that held them, not because anything was fixed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-08-09-to-2026-08-11.md` (the T1 completion, docs-refactor pass-start, and T3-built entries),
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass), and `STATUS-archive-2026-07-29-to-2026-08-01.md` (the `0.91.0` publish, the
`0.91.1` hotfix and ASC harvest fold, the `0.92.0` design-ratchet minor, and the xcathletes seams
pass as planned).
The C1 seam-shape pass, the refusal-channel convergence, and the C2 window as it stood before
merging are in `STATUS-archive-2026-08-02-to-2026-08-03.md`. The auth-channel window and the
AI-posture pass, as STATUS carried them up to the `0.94.0-rc.1` cut, are in
`STATUS-archive-2026-08-04-to-2026-08-05.md`. The stable `0.94.0` window, ASC's adoption, and the
vertical-alignment pass as STATUS carried them are in `STATUS-archive-2026-08-08.md`. The T4b.1
close, T4b's delivery-unproven standing note, and the pre-merge urgency it carried are in
`STATUS-archive-2026-08-12-t4b1-close.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`. The T4c-planned entry, the state its execution
session started from, is in `STATUS-archive-2026-08-12-t4c-planned.md`. The T5 Task 8 live-e2e
close, the T5a split record, and the state T4d's execution session started from are in
`STATUS-archive-2026-08-13-t5-task8-close.md`. The T4d close entry, with the live-proof and
teardown record as STATUS carried them to the Pass D planning sitting, is in
`STATUS-archive-2026-08-13-t4d-close.md`. The four entries Pass D itself ran through, the
planning entry, the Phase 1 close, the Phase 3 start, and the production-gate failure that
blocked Phase 3 until its fold landed, are in `STATUS-archive-2026-08-14-pass-d.md`.
