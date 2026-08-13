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

## Immediate next action (2026-08-12: T4c is PLANNED; next is executing it)

**T4b.1 is merged to `main` and pushed** (merge `be9c6d91`), and **CI ran the full T4b plus
T4b.1 tree green**: all six workflows passed, including `test` with the new template-bake step
and `e2e`. The "CI never ran this tree" urgency from the prior entry is resolved; `main` is
trusted. The superseded entry is archived at
`docs/internal/history/STATUS-archive-2026-08-12-t4b1-close.md`, including T4b's standing
delivery-is-unproven note, which remains true.

**The T4c planning sitting is done** (Fable, 2026-08-12). Spec:
`docs/superpowers/specs/2026-08-12-create-cairn-site-t4c-design.md`. Plan:
`docs/superpowers/plans/2026-08-12-create-cairn-site-t4c.md`. Both were amended at a
three-agent adversarial gate; the blockers folded in are recorded in the plan's preamble and
task text (catalogue-name collision, the union token key set, build discovery by commit, the
`bin.mjs` routing gap, `base_tree` on the reconcile commit, the stale-origin re-entry rule).
Geoff's three sitting rulings: reconcile via a fresh OAuth trip through the site's own App;
end-to-end first-build verification; flexible entry with `--connect`.

**Execute the T4c plan next, in a fresh Opus session, on a new worktree off `main`**:
task-by-task via `cairn-implementer`, test-first, full gate per task, Task 1 (the live spike)
first since it gates Tasks 2, 3, 4, 6, 7. Resume prompt (launch directory
`~/Projects/cairn-cms`): "Execute the T4c plan
(`docs/superpowers/plans/2026-08-12-create-cairn-site-t4c.md`) on a new worktree off `main`.
Read `docs/STATUS.md`, the T4c spec, and the plan in full first. Task 1 is a main-loop live
spike and gates the marked tasks."

Queue: T4c execution -> T4d (the localhost console; its brief in the T4a spec now gains two
T4c inputs, recorded in the plan's Task 11) -> T5 -> Pass D -> release one -> site walk -> P.

**Hand steps for Geoff, TWO outstanding, one urgent.** (1) **URGENT: rotate the estate
Cloudflare token** (`Cloudflare Admin 2026-07`): its value was leaked into a session
transcript during the e2e teardown and it is still active (verified). Mint a replacement, run
`~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, then delete the old one.
(2) Delete the GitHub App `cairn-t4b-live-03cd31` at github.com/settings/apps. Done already:
the run token (deleted, verified by elimination), the two older Apps, T2's scratch org.

**Standing note on e2e cost:** every live e2e mints a GitHub App only Geoff can delete (no
REST endpoint deletes an App, and the installation endpoint needs the key the tool
deliberately destroys). Four hand-deleted so far; T4c's e2e will add a fifth. If the tax
keeps biting, reuse one long-lived test App: a procedure change, not engine work.

**Carry-forwards (the tool initiative), renumbered this entry; verify against this list, not
a remembered one.** (1) The cutover confirm resolves through `fetch` and the system resolver,
so a stale negative DNS cache can park the owner on a serving hostname; belongs to a pass
owning `hostname.mjs`. (2) The T4a prefill URL's permission keys are verified, but amendment
9's Task 7 obligation (the interactive-paste path against the live dashboard) stands open.
(3) An externally registered domain still owes the branches the scratch domain cannot reach
(zone birth state, the real pre-migration records probe, the carry-over gate copy, the
delegation park family, the apex collision). (4) Chapter 2's browser-moment count is one (the
token mint) and Pass D's admin-track domain page should state it; T4c's chapter adds its own
count for the same page. (5) The engine committer-attribution drift from T3
(`src/lib/github/repo.ts` versus spec 7.4). (6) `npm run check:comments` and the root
type-check cover `src/lib` only, so `packages/create-cairn-site` has neither a comment gate
nor a type gate; its own `npm test` is the real gate. (7) `src/github/install.test.mjs`'s
reauthorize race is flaky, and T4c makes that machinery load-bearing: its plan's Task 5 must
fix or explicitly keep it. (8) The deferred defect list per the T4a spec's ruling 2. (9) The
umbrella's resume table, still unowned, noted for Pass D. (10) `test/fake-cloudflare.mjs`
copies its HTTP plumbing from `test/fake-github.mjs`; the extraction trigger is a third fake
server, T4c deliberately adds routes to the existing servers, and the extraction stays filed
for T4d, whose brief also gains the grown fake surface. (11) The `paid-plan-missing` mapping
keys on entitlement wording rather than a code (unreachable on this account; recorded in the
T4b spike). (12) Root `CLAUDE.md` has no context headroom left (5997 estimated tokens against
the 6000 hook threshold); the next addition there must trim first. (13) `--yes` with
`CAIRN_CF_API_TOKEN` equal to a saved token that fails validation throws that failure rather
than re-validating; recorded as a deliberate narrowing.

## Standing state (release ordering, consumers, open items, carry-forwards)

**T4c's spec and plan are BANKED** (2026-08-12, adversarially reviewed; approval state is in
the entry above). T4b and T4b.1 are shipped history: their detail lives in their plans'
post-mortems and the archived entries. Execution prerequisites the T4c plan names: the scratch
domain delegated and active, a scratch GitHub context for the refusal captures (T2's org was
deleted; Task 1 recreates one or captures best-effort), and the account's existing Builds
usage censused before any App-install cycling.

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
`STATUS-archive-2026-08-06-to-2026-08-07.md`.
