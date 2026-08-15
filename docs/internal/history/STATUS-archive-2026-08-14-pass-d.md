# STATUS archive: Pass D, the documentation reset (2026-08-14 to 2026-08-15)

The four entries `docs/STATUS.md` carried through Pass D, oldest last: the production-gate
failure that blocked Phase 3, the Phase 3 start entry, the Phase 1 close entry, and the
planning entry the pass began from. Superseded 2026-08-15 by the Pass D close.

## Immediate next action (2026-08-14: Pass D's production gate FAILED; fold it before anything else)

**Phase 3 is NOT merged and must not be, until the fold below lands.** Branch
`pass-d-phase-3` (worktree `.claude/worktrees/pass-d-phase-3`) carries Tasks 9 through 13:
the mining sweep, the cutover, the outside edges, cairn-pub, and the production gate. Every
gate is green and `npm test` is 5310 at exit 0, so the tree is mechanically sound. **It is
the gate's human-facing findings that block, not a red build.**

**Resume prompt:** "Fold the Pass D Task 13 production-gate findings
(`docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md`), then close the pass."
Launch inside `.claude/worktrees/pass-d-phase-3`.

### What the gate found

**All four blind persona walks failed to reach their goal.** These are the highest-value
findings in the record, because a walk is completion-measured rather than opinion-measured, and
because knowledge suppression caught what four earlier review rounds could not: every earlier
reviewer already knew the missing facts.

| Track | Stopped at | The gap |
|---|---|---|
| editors | `welcome.md`, sign-in step 1 | The track never says where the sign-in page IS. Verified: zero mentions of `/admin`, an address bar, or a bookmark across all 8 pages. |
| admin | `is-it-working.md`, "Running the check" | The page says the credential-bearing checks skip and that a skip is not a pass, then never says how to make them run. |
| extend | `add-a-custom-admin-screen.md`, "Gate it" | `requireAccess` 403s every session including the owner without an access map, and `defineAccess(roles, map)` needs a `roles` declaration no earlier page produces. |
| reference | `core.md`'s adapter surface | `media`/`assets` and `editor.nav`/`navMenu` name the same config key two different ways across pages. |

**118 findings, of which only 24 were independently verified: 19 confirmed, 3 narrowed, 2
refuted.** The cap is a conductor error worth knowing about rather than a property of the
findings: the workflow's verify stage was written `verifiable.slice(0, 24)` and took findings
in array order, so it consumed three of the four claims sweeps and reached **no walk, fishtank,
or register finding at all**. A 79% confirmation rate on what was checked is the reason to
treat the remaining 94 as likely-real. Sample across lenses, not off the front of the array.

### What the fold owes

1. The four walk failures. These are structural gaps, not line edits.
2. The 19 confirmed and 3 narrowed findings, each carrying the verifier's file-and-line
   evidence in the record.
3. Verification of the 94 unverified findings, or an explicit decision to ship without it,
   recorded either way.
4. The record's dispositions section, deliberately left empty for this.
5. **Geoff's own read of the editor track**, which the methodology names as the
   novice-comprehension instrument no LLM pass substitutes. Still owed. The track is 8 pages
   and is deliberately the smallest because it carries the highest novice-gap risk.
6. Task 14: ROADMAP reconciliation, the post-mortem, this file's rewrite, the memory refresh,
   then the Phase 3 PR, merge, and cold-start test.

**Release one does not cut until the blocking findings fold and that human read happens.**

### Task 12: cairn-pub is prepared, and NOT merged (ruling 3)

Branch `pass-d-docs-tracks` at `e7218a4` in `~/Projects/cairn-pub`, **local only, never
pushed**. Proven against a packed tarball: 81 prerendered pages, zero broken links, a clean
rebuild. The site walk merges it after release one. It also found a real defect the rebuild
introduced, now fixed there: the reference index's new "also for site admins" grouping relists
three pages, and the loader walked every bullet list, so the second occurrence won the prev/next
map. Fail-loud link policy is a build-time throw.

**A stale premise this corrected:** cairn-pub is pinned at `0.94.0-rc.1`, NOT the `^0.87.4` the
consumer table below has carried. A prior pass already landed that upgrade, so there is no
six-minor gap and the only consumer-facing change left is the docs restructure itself.

## Superseded: the Phase 3 start entry (2026-08-14)

**Phase 2 landed** (PR #35, squashed to `main` at `55bf8184`, all six checks green). The four
tracks are written clean-room and sit BESIDE the old arms, which stay canonical in the tarball
until the Phase 3 cutover, so `main` stays releasable right now. Page counts hit their targets
exactly: `docs/admin/` 8, `docs/editors/` 8, `docs/extend/` 31, plus `docs/why-cairn.md` and the
rewritten front doors.

**Next: Phase 3** (Tasks 9 through 14), in the worktree `pass-d-phase-3` off the merged `main`.
Task 9 is the mining sweep, the FIRST and ONLY task permitted to read the old arms, and it runs
now that the new tracks are baked. Then Task 10 the cutover, Task 11 the outside edges, Task 12
cairn-pub prepared but NOT merged (ruling 3), Task 13 the five-stage production gate, Task 14
the close.

**Phase 2 was run as a Workflow** (Geoff opted in, 2026-08-14): 16 agents, no errors, four tracks
written in parallel with one fresh reviewer per track and a barrier before the front doors. The
per-track review gate did real work; the admin reviewer's 16 findings all survived verification,
including 15 recovery-table rows that had silently dropped their instruction and a `d1 execute`
command that bypasses migrations.

**Two things Phase 2 changed that Phase 3 must not re-derive.**
(1) **`check:snippets` now covers `docs/extend`, `docs/admin` and `docs/editors`.** The extend
track's blocks had never been typechecked, which the extender profile's success criterion
forbids; widening found 98 errors, three of them real API defects. **Task 10 still owns removing
the dying directories from `DOC_DIRS`**, so its gate-bill item is half done, not done.
(2) **`docs/README.md` and `docs/reference/README.md` each carry a short "superseded" section**
naming the old pages that still exist until cutover. `check:arm-indexes` requires every page in
an arm to be indexed, and the front door is the tutorial arm's index. **Task 10 deletes both
sections along with the pages they name.**

**Also carried:** `@sveltejs/kit`'s devDependency moved to `^2.68.0` (the peer floor stays
`^2.12`); `docs/reference/supported-toolchain.md` had already claimed cairn was tested against
`2.68.0` while the tree installed `2.61.1`. Root `CLAUDE.md` still sits a few tokens over its
context budget, and Task 11 owes it a trim of at least as much as it adds.

## Superseded: the Phase 1 close entry (2026-08-14)

**Pass D Phase 1 landed** (branch `pass-d-phase-1`, four commits, full gate green including
the two gates it adds). Tasks 1, 2, 3a and 3b are done; Task 3 was split once, into the prose
standards layer and the two mechanical gates, which is Pass D's first task split (a second
means proposing a pass split, not absorbing it).

**Next: Phase 2, the clean-room build**, in a fresh worktree off the merged `main`. Geoff
opted into the Workflow tool (2026-08-14) and asked that the parallelizable work run in
parallel, so Phase 2 runs as a workflow: **the admin, editors, extend and reference tasks
(4, 5, 6, 8) run concurrently, each a three-stage pipeline of write, fresh-context review
against its audience profile, then fold**, with **one real barrier before Task 7**, since the
front doors route five ways by name into pages the other tracks create and `check:docs` fails
on a link to a page that does not exist yet. Writers run the non-packaging gates only:
anything invoking `npm run package` writes `dist/` and cannot run concurrently, so
`check:snippets`, `check:reference`, `check:readiness` and `check:surface` run once at the
phase close. Every writing dispatch carries ruling 7 verbatim plus that page's input list from
the manifest. The conductor reads each track's diff as it lands.

**Three Phase 1 findings that change what Phase 2 and 3 build against.**
(1) **A current `sv create` (0.17.0) emits no `svelte.config.js` at all**, wiring the adapter
inside `vite.config.ts`; verified by running the tool, not by reading this repo's showcase.
The extend track's deep path must stop telling readers to edit a file they do not have.
(2) **The doctor's CSRF-handoff check silently skips on every current scaffold**
(`src/lib/doctor/checks-local.ts`, reads `svelte.config.js`, returns `skip` when absent), so
the run reads clean while the check never executed. Filed to `ROADMAP.md` Now as engine work,
deliberately not fixed in a docs pass; `admin/is-it-working.md` must not claim coverage it
does not deliver. (3) **Vale was installed in CI and never invoked**, so the Google standard
had never been enforced there. `check:vale` now runs at error tier, proven red before trusted
green; both pre-existing error-tier findings were false positives, and the register standard
now carries the rule that a wrong Vale finding gets a scoped suppression or corrective markup,
never a content change that alters a citation or a literal string.

**The standards and targets Phase 2 consumes**, all on `main` now: the rewritten
`docs/internal/docs-register.md` (four track registers with the audience profiles folded in as
grading rubrics, the page anatomies encoded, five-route front-door register), the target
manifest at `docs/internal/record/2026-08-14-pass-d-target-manifest.md` (74 target pages with
contracts and clean-room input lists, the 50-page deletion list paired 1:1 with its redirect
map, the cutover gate bill re-derived), and three new gates: `check:vale`, `check:symbols`
(the hallucinated-symbol sweep, scoped to the new tracks plus the kept reference arm so
Phase 2's pages are born under it, with a unit test pinning all five token classes), and the
non-recursive `docs/internal` arm-index entry. **`docs/internal`'s 49 dated artifacts moved to
`docs/internal/record/`**; a link to one of them needs the new path.

**Carried out of Phase 1:** root `CLAUDE.md` now sits a few tokens over its context budget
after a link repoint, and Task 11 already owes it a trim of at least as much as it adds.

## Superseded: the Pass D planning entry (2026-08-14)

**PR #33 is MERGED** (`ea3be5ee`), so `main` now carries T4d and the whole tool initiative
through the localhost console. T4d's close entry, with the live-proof and teardown record,
is archived at `docs/internal/history/STATUS-archive-2026-08-13-t4d-close.md`.

**Next: execute Pass D, the documentation reset.** The plan is
`docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md` (Fable planning sitting,
2026-08-14), against the umbrella spec's Part 2
(`docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`). Execution runs
in a fresh Opus 5 session in its own worktree off `main`, task-by-task through
`cairn-implementer`, per the plan's header. **The pass is a ground-up REBUILD (Geoff,
2026-08-14): the old guides, tutorial, and explanation arms are deleted at cutover, never
repaired or mined during writing; the reference arm is the kept exception; the new tracks
are written clean-room from the code and the recorded runs, and a mining sweep reads the
old corpus only after the new docs are fully baked.** Three phases, each its own worktree
and merge: Phase 1 (Tasks 1-3) standards and targets (friction-log triage first,
self-contained; the target manifest; the register standard rebuilt on the profiles and
anatomies); Phase 2 (Tasks 4-8) the clean-room build, landing the new tree beside the old
so `main` stays releasable; Phase 3 (Tasks 9-14) the mining sweep, the cutover with every
gate rewired and proven red once, the outside edges, the prepared cairn-pub branch, the
five-stage production gate (Task 13, per the review methodology, with Geoff's
editor-track read), and the close. Seven rulings sit at the top of the plan for approval
or veto at the gate.

**The sitting extended past the plan commit (2026-08-14, Geoff's direction) and banked
four governing inputs,** all committed under `docs/internal/`: the review methodology
(`2026-08-14-docs-review-methodology.md`, the five-stage Claude-reviews-Claude gate
sequence researched against measured LLM-docs failure modes and LLM-as-judge bias;
governs the Phase 2 per-track reviews and the Task 13 production gate, adds the symbol
sweep and transcript gates, and names Geoff's editor-track read as the
novice-comprehension instrument),
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

**The docs friction log is TRIAGED (Task 1, done).** All 19 findings were verified against
current code and dispositioned: nine promoted to `ROADMAP.md` with triggers, two folded into
existing entries, three closed as superseded by the rebuild with the new extend-track pages
that inherit their jobs named, one deleted as already fixed, one converted to a `// WATCH:`
comment. Only the setup-walk record stays open, by design; Task 14 closes it. The
refused-action editor cluster's written recommendation is a Next-tier roadmap entry: it earns
its own small pass, since all five screens share one root cause (no `use:enhance`, so a
refused POST re-renders a fresh document with no state to preserve and nothing to announce).

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

