# STATUS archive: the T4b.1 close as STATUS carried it (2026-08-12)

Superseded the same day by the T4c planning-sitting entry. The merge, push, and CI
concerns recorded here were resolved that day; the carry-forward list moved forward
into the live entry.

## Immediate next action (2026-08-12: T4b.1 is COMPLETE; next is the T4c planning sitting)

**Pass T4b.1 is closed on branch `worktree-t4b1-defect-harvest`** (worktree
`.claude/worktrees/t4b1-defect-harvest`, off `main` at `78603466`). All four rulings shipped, the
package suite went 523 to 544 green, the root engine suite is untouched and exits 0 at 5274, and
every gate passes including the four CI-only ones. Each fix was verified by breaking it: the
evidence table is in the plan's post-mortem.

**The branch is NOT merged and NOT pushed.** It needs a merge to `main` before T4c branches off,
or T4c builds without these four fixes.

**One finding outside the plan, and it is the urgent one: CI has never run the merged T4b tree.**
`origin/main` is at `1415f48e`, five commits behind local `main`, so the T4b merge this file called
"the exact tree every gate passed" was never pushed and never gated. It would have failed: two
package tests read the gitignored, `prepack`-baked `template/`, and `test/../test.yml` had no bake
step, so they pass on any machine that has run the CLI and fail on every clean checkout. T4b.1 added
the bake step (the same substitution `create-site.yml` already makes) and verified it in both
directions. **Push and watch CI before trusting `main`.**

**Ruling 3 turned out to cover four copy sites, not two.** The plan named the email completion and
`printLiveInfo`; a sweep found the send hop's detail line and `printEmailLiveInfo` making the same
unproven delivery claim, the latter being what a resuming owner reads. All four changed, since the
ruling's own words are "anywhere". The published docs were swept and carry no such claim.

**New carry-forward: `CLAUDE.md` is at its context ceiling**, 5997 estimated tokens against a 6000
hook threshold. The `10204` amendment fit only after trimming its own paragraph. The next addition
to that file must trim before it adds.

**Resume prompt for the next session** (a Fable planning sitting; launch directory
`~/Projects/cairn-cms`): "Run the T4c planning sitting for the create-cairn-site umbrella (Builds
connect plus reconciliation; the brief is in the T4a spec). Read `docs/STATUS.md` and the T4b.1
post-mortem first. Merge `worktree-t4b1-defect-harvest` to `main` and push before planning, since
CI has not yet run the T4b or T4b.1 trees."

**What T4b left standing, still true.** The email half works end to end against the real platform.
Delivery is unproven and recorded as such: Cloudflare accepted every send, nothing arrived on a
day-old domain, greylisting and SPF were both refuted by experiment, and new-domain reputation is
the documented norm, which is exactly what ruling 8 predicted a CLI could not observe. T4b.1 has
now brought the tool's copy into line with that. The propagation park stays partially proven: the
condition was seen live in the spike, but the tool's own branch is unreachable on any domain this
account may touch, because sending authorization survives de-onboarding. Full evidence: the T4b
plan's post-mortems and the spike doc's "The live e2e" section.

Queue: T4c planning sitting (Fable; Builds connect + reconciliation, brief in the T4a spec) ->
T4d (the localhost console) -> T5 -> Pass D -> release one -> site walk -> P.

**Hand steps for Geoff, TWO outstanding, one urgent.** (1) **URGENT: rotate the estate Cloudflare
token** (`Cloudflare Admin 2026-07`): its value was leaked into a session transcript during the
e2e teardown and it is still active (verified). Mint a replacement, run
`~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, then delete the old one.
(2) Delete the GitHub App `cairn-t4b-live-03cd31` at github.com/settings/apps. Done already: the
run token (deleted, verified by elimination), the two older Apps, T2's scratch org.

**Standing note on e2e cost:** every live e2e mints a GitHub App only Geoff can delete (no REST
endpoint deletes an App, and the installation endpoint needs the key the tool deliberately
destroys). Four hand-deleted so far. If the tax keeps biting, reuse one long-lived test App: a
procedure change, not engine work.

**Carry-forwards raised by T4a, deliberately not fixed.** (1) The cutover confirm resolves through
`fetch` and the system resolver, so a stale negative DNS cache reports a serving hostname as
unpropagated and parks the owner. Observed live: the router answered empty while `1.1.1.1` served
the records and the site answered 200. This is amendment 15's defect class one layer up, and it
belongs to a pass owning `hostname.mjs`. (2) The prefill URL's permission keys are still
unverified against the live dashboard, so amendment 9's Task 7 obligation stands open; the run
supplied the token by env rather than the interactive paste. (3) An externally registered domain
still owes the branches this scratch domain cannot reach: zone creation and its birth state, the
records probe against a real pre-migration domain, the carry-over gate's confirm and caveat copy,
the delegation park, `propagating`, `wrong-nameservers`, `certificate-pending`, and the apex
address-record collision. (4) Chapter 2's browser-moment count is **one**, the token mint, and
Pass D's admin-track domain page should state it; that page does not exist yet, which is why T4a
did not write it. (5) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts`
versus spec 7.4). (6) `npm run check:comments` and the root type-check both cover `src/lib` only,
so `packages/create-cairn-site` has neither a comment gate nor a type gate; its own `npm test` is
the real gate. (7) `src/github/install.test.mjs`'s reauthorize race is still flaky. (8) The
deferred defect list per the T4a spec's ruling 2. (9) The umbrella's resume table, still unowned,
noted for Pass D. (10) **Restored by T4b, having been dropped in T4a's renumbering:**
`test/fake-cloudflare.mjs` still copies its HTTP plumbing from `test/fake-github.mjs`, so `compile`
and `sendJson` are defined twice; verified still true 2026-08-12. The extraction trigger is a
**third** fake server, and T4b extended the second rather than adding one, so it stays filed for
T4d. (11) T4b's own: the `paid-plan-missing` mapping keys on Cloudflare's entitlement wording
rather than a code, because the condition is unreachable on an account already on Workers Paid, and
the spike notes a plan-less account may return one of the sender-not-ready codes like every other
refusal, in which case the row never fires and the owner sees the fall-through carrying
Cloudflare's own message. (12) T4b.1's own: **`CLAUDE.md` has no context headroom left**, 5997
estimated tokens against the 6000 hook threshold, so the next addition there must trim before it
adds. (13) Also T4b.1's: `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved token that fails
validation now throws that failure rather than re-validating the same string. The old double
validation could mask a first failure if a second immediately succeeded, which cannot happen for a
catalogued auth refusal (`validateToken` rethrows anything without a `catalogue`), so this is
recorded as a deliberate narrowing rather than a behavior question left open.

**A numbering trap, worth naming because it nearly cost a live item.** T4b's plan and spec tell the
executor to "retire STATUS carry-forward 6" and "confirm carry-forward 7 still stands". Both numbers
were stale: they refer to the list as it stood at commit `c1d649e3`, and T4a's close-out rewrote the
list with new numbering. Following the instruction literally would have deleted the current (6), the
missing comment and type gate, which this pass does not resolve. The real referents were the
`carry-over-declined` exit-1 row, which Task 2 genuinely fixed, and the duplicated fake plumbing,
restored above as (10). This is the same failure class T4a's post-mortem recorded against its own
Task 14: **a task instruction naming a concrete document state is a claim to verify, not an
instruction to follow.**

T4b.1 hit the same class a third time, in a different disguise. Its plan told the implementer to
catch on `error.catalogue.code`; the real property is `error.cause.catalogue.code`, because
`runner.mjs:58` rewraps every hop's error with its action title. The implementer checked the
mechanism instead of trusting the plan, and the catch would have been silently dead code had it
not. The generalization is now worth stating plainly: **a plan naming a concrete code shape, path,
or document state is a claim to verify at the first task that touches it.**

