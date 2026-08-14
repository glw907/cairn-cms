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


## Immediate next action (2026-08-14: Pass D is planned; execute it)

**PR #33 is MERGED** (`ea3be5ee`), so `main` now carries T4d and the whole tool initiative
through the localhost console. T4d's close entry, with the live-proof and teardown record,
is archived at `docs/internal/history/STATUS-archive-2026-08-13-t4d-close.md`.

**Next: execute Pass D, the documentation reset.** The plan is
`docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md` (Fable planning sitting,
2026-08-14), against the umbrella spec's Part 2
(`docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`). Execution runs
in a fresh Opus 5 session in its own worktree off `main`, task-by-task through
`cairn-implementer`, per the plan's header. **The plan is two phases, each its own worktree
and merge** (the sizing ruling, made at plan time rather than mid-flight): Phase 1 (Tasks
1-5) is the friction-log triage, the move manifest, the tree move with every gate rewired,
the readiness contract, and the standards layer; Phase 2 (Tasks 6-14) is the track content,
the prune, the prepared cairn-pub branch, and the close. Phase 1's first dispatch is the
friction-log triage (Task 1, self-contained). Five rulings made at plan time sit at the top
of the plan for approval or veto at the gate: the Microsoft Vale package on
`docs/editors/`, the resume table landing as the admin track's setup recovery page,
cairn-pub prepared-not-merged, no published Diátaxis citation, and explicit P6/P7
absorption in ROADMAP.

**The sitting extended past the plan commit (2026-08-14, Geoff's direction) and banked
three governing inputs for the content phase,** all committed under `docs/internal/`:
the competitor review (`2026-08-14-cms-docs-competitor-review.md`, ten web-researched
corpora with a what-users-say synthesis and eight adopted rules), the audience profiles
(`2026-08-14-audience-profiles.md`, the grading rubric for all four tracks, including
the extender-versus-contributor developer-flavor split), and the track outlines
(`2026-08-14-docs-track-outlines.md`, **revised at a five-reviewer adversarial gate**,
~60 ranked findings; the revision record lists adoptions and declines). The plan's
Tasks 2 and 5 through 10 now consume these by name. Standing rulings from the sitting:
tight beats sprawling (fewer, really well-written pages); page anatomies encoded so the
pattern is reproducible; the anti-fishtank coherence gate (index order reads as a
story, preconditions produced before use). The gate also surfaced two code-verified doc
defects (the edit-conflict prose contradicts the code; the bootstrap sign-in's
ten-minute TTL is documented nowhere) that the manifest files as fixes.

**Then release one, AFTER Pass D** (ordering unchanged): the engine window plus
`create-cairn-site`, `@glw907/cairn-cms-dev`, and the template repo publish in the same
cut, plus T5a' **including the button spike, which Task 7's staged button block consumes**.
Invoke `cairn-release`; verify the next number is free first.

**Restored to the ledger (held only in memory since T4d; a defect owed BEFORE release
one): a tarball-installed scaffold ships NO `.gitignore`.** npm drops the file from every
tarball, the baked template (`packages/create-cairn-site/template/`) carries none, and
`scaffold.mjs` never writes one, so `pushScaffold`'s own ignore-honoring silently no-ops on
a real scaffold and `.dev.vars`/`.wrangler` sit one `git add -A` from a push. Re-verified
2026-08-14 by inspecting the bake and the scaffold path. A small tool fix with a
packed-tarball-path test; it is tool code, deliberately not folded into Pass D's docs
scope, so it either rides its own small pass or the release-one sitting checks it off
first.

**The docs friction log (19 open findings, 367 lines) is Pass D Task 1**, a self-contained
first dispatch: verify all 19 against current code, complete-or-move, with an explicit
written recommendation on whether the refused-action editor cluster earns its own pass.

**Hand steps for Geoff, NINE outstanding, one urgent. T4d's teardown added three.** (1) **URGENT:
rotate the estate Cloudflare token** (`Cloudflare Admin 2026-07`), leaked into a transcript and still
active; mint a replacement, run `~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`,
delete the old one. (2) Delete the GitHub App `cairn-t4b-live-03cd31`. (3) Revoke the T4c spike API
token `d07b2a25f05151591830c45053186979`, then
`rm -f ~/.config/cairn/t4c-spike-token ~/.config/cairn/store-t4c-token.sh`. (4) 907-life's
push-to-deploy has been broken since 2026-07-14. (5) Mint the fine-grained `TEMPLATE_REPO_TOKEN` PAT
at release one. (6) The button spike's browser moment, owed at release one with T5a'.
**(7) NEW: delete the GitHub App `cairn-t5-scratch` (id 4585219)** at github.com/settings/apps, which
uninstalls installation 153531337 with it. **This is the fifth hand-deleted App**, and with (2) the
ledger stands at two awaiting deletion. **(8) NEW: revoke three Cloudflare API tokens** at
dash.cloudflare.com/profile/api-tokens, all named for `create-cairn-site`: T5 run 1's five-key token,
T5 run 2's eight-key token, and the eight-key token minted 2026-08-13 for T4d's live proof and
teardown (its local file is already deleted). **(9) NEW: check the Workers Paid opt-in** taken at T5
run 2's prompt, in case the account was not already on it via 907-life. Everything else in the T5
teardown table is done and verified.

**Carry-forwards (the tool initiative). CLOSED this pass: 1 (the resolver negative-cache
diagnosis) and 7 (the fake HTTP plumbing extraction).** Renumbered survivors: (1) an externally
registered domain still owes the branches the scratch domain cannot reach. (2) Chapter 2's
browser-moment count is one and chapter 3's is two; **owned by Pass D Task 8**, whose
admin-track domain page states both. (3) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(4) `check:comments` and the root type-check cover `src/lib` only, so `packages/create-cairn-site`
has neither a comment gate nor a type gate; its own `npm test` is the real gate, and this pass leaned
on that fact repeatedly. (5) The `paid-plan-missing` mapping keys on entitlement wording rather than
a code. (6) The deferred defect list per the T4a spec's ruling 2. (7) The umbrella's resume table, **now owned by Pass D
Task 8** as the admin track's setup recovery page. (8) Root `CLAUDE.md` has no context headroom left; the next addition
there must trim first. (9) `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved token that fails
validation throws rather than re-validating, a deliberate narrowing. (10) `runStep` exists as an
identical one-liner in four modules; the hoist is right but is a cross-cutting refactor of
pre-existing code, and this pass explicitly declined it as a fourth extraction. (11) A first `--yes`
run cannot reach `builds-live`, since the reconcile hash gate has no prior hash. (12) The bake couples
the template's installability to the publish window. (13) No gate proves a scaffold against the
registry. (14) **NEW: the console scenario is mirrored in `test/console-hold.test.mjs` and
`.github/workflows/create-site.yml` with nothing linking them.** (15) **NEW: no spawned-child test
covers the pre-first-probe interrupt window**; it is held by a unit test plus two composer wiring
assertions, and an end-to-end proof needs a latency proxy or a hang-the-first-request capability in
the fake.

## Standing state (release ordering, consumers, open items, carry-forwards)

**T4c is BUILT** (2026-08-13; the entry above carries its state, gaps, and hand steps). T4b and
T4b.1 are shipped history: their detail lives in their plans' post-mortems and the archived
entries. T4c's own execution record is its plan's post-mortem plus the live spike at
`docs/internal/2026-08-12-t4c-builds-spike.md`, which is the fixture source for every Builds
fake body and carries the teardown table.

**THEN release one, AFTER Pass D** (amended ordering, Geoff 2026-08-09): it rolls this window
plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs reset, and
**`create-cairn-site` and the template repo publish in the same cut** so no shipped page
describes an uninstallable tool. Invoke `cairn-release`; verify the next number is free first.

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
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window (migration ran against `rc.1`; the `Consumers must:` work is done, blocked only on the GitHub App item above) |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site**, a docs shell six minors behind the engine it
documents.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); mermaid diagrams near-illegible at 320/390;
section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock.

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
`STATUS-archive-2026-08-13-t4d-close.md`.
