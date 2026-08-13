# STATUS archive: the T4c-planned entry (2026-08-12)

Superseded by the T4c-executed entry on 2026-08-13. Kept because it records the state the T4c
execution session started from, including the three sitting rulings and the carry-forward
numbering that entry used. Several of its claims were changed by the execution: the spike
deleted two planned deliverables, and carry-forward 7 (the `install.test.mjs` reauthorize
flake) was fixed rather than kept.

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
