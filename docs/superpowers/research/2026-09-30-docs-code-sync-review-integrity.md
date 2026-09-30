# Docs-code sync amendment: data integrity and failure-risk review

Reviewer lens: data integrity and failure risk (prefix DI). Target: `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` at `15a71698`, read with the parent spec (2026-09-26, errata applied), the harvest spec, the gap sweep and prior-art records, `docs/internal/facts/README.md`, `scripts/checks/check-facts.mjs`, and `~/.claude/workflows/docs-page-chain.js`. The lean guard (spec:49-60) was applied as part of the lens.

Counts: 1 blocker, 7 major, 4 minor. One OWNER FORK (DI1). DI2 to DI6 and DI10 to DI11 apply only if mechanism 2 is built; resolving DI1 as "defer" retires them.

## Evidence gathered

- Pointer mix in the container: 1,341 `src/...:line` pointers against 177 `path#Symbol` pointers. The most-cited files by line are `src/lib/diagnostics/conditions.ts` (64), `src/lib/sveltekit/guard.ts` (58), `src/lib/sveltekit/auth-routes.ts` (48), `src/lib/admin/EditPage.svelte` (42).
- Timing of the four corrected facts: the container landed 2026-09-15 (`b9282369`). Each cited source last changed before that: `signing.ts` on 09-04, `content-routes-entry-write.ts` on 09-14, `site-resolver.ts` on 09-04, `compose.ts` on 08-31. All four facts were wrong when filed. No code changed underneath any of them.
- The page chain runs up to three pages at once in one worktree (`docs-page-chain.js:783`), commits nothing (`:610`), and returns per-page records to the conductor rather than writing them to disk (`:17`, `:785-788`).
- The drafter already files design gaps straight into the friction log (`docs-page-chain.js:607-610`, `frictionFiled`).
- Tags interleave: `v0.98.0`, `v0.97.0`, `tool/v1.1.0`, `tool/v1.0.1`, `tool/v1.0.0`, `v0.96.0`, `v0.95.0`, `v0.95.0-rc.1`.
- A past mass move rewrote 84 `Source:` paths at one merge (`docs/HISTORY.md:61-63`).

## Findings

### DI1 (major, OWNER FORK): mechanism 2's named failures are verification errors, not drift

**Location:** `2026-09-30-docs-code-sync-design.md:104-109`, and the Brief at `:14-16`.

**Defect.** The spec says the staleness hash catches the four facts the sweep corrected, "each wrong while its `Source:` still resolved." Every one of those facts was wrong when it was filed, and its cited code has not changed since. A stamp taken at filing would have hashed the unchanged code and stayed green forever. The stamp would then have certified a wrong claim as "an independent reader verified this claim against this code." So the hash would not have caught any of the four. It would have made them look more trustworthy. What caught them was the code-first sweep's independent verifiers. That is mechanism 3 plus the planning-phase sweep, which the spec already builds. Lean guard condition 2 (spec:55) therefore fails for mechanism 2 as written, and the spec's own rule (spec:59) says to defer it.

**Options.**
- (a) **Defer mechanism 2 with a trigger:** "a fact read, the release sweep, or a site round finds a `[verified]` fact made wrong by a code change after it was filed." The release sweep's yield record (spec:140-142) is where that event would surface. This retires DI2 to DI6, DI10, and DI11 and saves the mechanism's share of the about 1.5M (spec:205).
- (b) **Keep it, with an honest condition 2.** First find a real code-after-filing drift instance in git history. A candidate class is version-floor facts such as `f:01tx08` (`package.json:220,222`), which a dependency bump would falsify while the line still resolves. Restate the failure the hash catches from that instance, and fold DI2 to DI6 before the plan.

**Recommendation:** (a). The container is two weeks old, and no drift has been observed yet. The guard exists for exactly this case. The prior art's agent argument (Jain, Huang) is a reason to build the hash when drift shows up, not ahead of it. Stamping on a first verification that may itself be wrong adds a false signal.

### DI2 (blocker, if built): line-range hashing at a literal line number stales dozens of facts on any edit above them

**Location:** spec:111-115.

**Defect.** Line pointers dominate: 1,341 line pointers against 177 symbol pointers. The spec hashes "the cited lines' normalized text." Read at the literal line number, one import added at the top of `guard.ts` changes the text at all 58 cited ranges in that file. Those facts then fail `check:facts`, even though the pointer check itself stays green inside its ten-line anchor window (`check-facts.mjs:46-57,100-101`). Every ordinary engine pass that touches a heavily cited file would then face tens of stale ids. That is the noise-driven rubber-stamping the prior art names as the mechanism's main risk (prior-art:170, :331). The failure lands on unrelated engine passes, which have no fact-read step and every reason to re-stamp blindly (see DI5).

**Fold.** Two changes. First, stamp only `path#Symbol` pointers, plus line ranges in files that cannot take a symbol pointer (`.svelte`, `package.json`, `tool/`). When the fact read stamps a fact whose `.ts` or `.js` source under `src/` is a line pointer, it converts the pointer to `#Symbol`, as the README already prefers (`facts/README.md:33-40`). Second, re-locate a line-range stamp by content before comparing it: the stamp is stale only if the stamped normalized text no longer appears within the existing anchor window. This is Swimm's line-marker-plus-token lesson at its smallest.

### DI3 (major, if built): a stamp survives an edit to the fact's own claim, and a pure path move stales it

**Location:** spec:111-126, against `facts/README.md:68-73`, where ids never change when the claim is edited.

**Defect.** The lockfile keys on the fact id and hashes only the source. A fact's claim can be rewritten in place under the same id, which is how the sweep corrected four facts and how the "Edits after the chain" rule and a hand fix work. After such a rewrite, the stamp still asserts that an independent reader verified this claim. Nobody verified the new text. A retag to `[candidate]` and back keeps the stamp too. The opposite failure also exists: a file move that rewrites `Source:` paths (84 at once in `HISTORY.md:61`) either breaks the lockfile's stored source or stales every moved fact, even though the code did not change.

**Fold.** Each lockfile entry stores two hashes: one of the claim text (the bullet minus its tag), and one per source pointer taken over the content only. `check:facts` treats a claim-hash mismatch as stale. It matches source hashes by content, not by path, so a pure move stays green and a changed declaration fails.

### DI4 (major, if built): concurrent stamps and a crash mid-write can lose or corrupt the lockfile

**Location:** spec:111, :116-118. Runner: `docs-page-chain.js:783`, three pages in flight in one worktree, fact reads running in parallel.

**Defect.** Three fact reads running the stamp command against one JSON lockfile do an unlocked read-modify-write, so a stamp can be lost. A crash or an interleaved write can leave a truncated file. `check:facts` would then fail for every in-flight page, and the runner's "another page's file" exemption (parent:373) does not cover the lockfile. The obvious recovery is to regenerate the file, and that recreates the bootstrap the spec forbids (spec:118-119). Across branches, one JSON object conflicts on adjacent lines, and a hand merge invites edited hashes.

**Fold.** The stamp command takes the same exclusive-create lock with a stale break that spec:198-200 already keeps for `cairn-docs-outline`, and writes through temp-then-rename. The format is one sorted line per fact id (JSONL or TSV), so git merges line by line. On a conflict, keep both sides' lines, and for the same id keep either one, because `check:facts` re-hashes against the merged code and decides. When the lockfile cannot be parsed, `check:facts` says "restore from git; never regenerate."

### DI5 (major, if built): nothing checkable backs a re-stamp, and deleting an entry turns the gate green

**Location:** spec:120-126.

**Defect.** Three gaps combine. (1) The diff-reviewer is told to check "each re-stamp against a fact-read record." The chain's records go back to the conductor and are never committed (`docs-page-chain.js:17`), and an engine pass has no records at all, so the reviewer has nothing to check. (2) "A fact-read dispatch over the named ids" has no definition outside the page chain. The fact-read prompt is page-scoped (`docs-page-chain.js:635-646`). In an engine pass, the agent actually holding the red gate is the `cairn-implementer`, which is the forbidden stamper. (3) "Unstamped facts are not failed" (spec:126), so the cheapest way to turn the gate green is to delete the stale entries. That is a silent loss of the only drift signal.

**Fold.** Name one standalone fact-read dispatch for stale ids: the page chain's fact-read prompt without the page, carried in `pass-core` or `cairn-pass`. Its report lists each id it verified. The stamp command takes a required `--by <report label>` and stores it on the entry. Give the diff-reviewer the rule outright: a lockfile entry that is changed or removed for a fact that still exists, with no fact-read report listing that id, is a `fix`.

### DI6 (major, if built): two green branches can merge to a red `main`, with no owner for the fix

**Location:** spec:120-122; parent:190-193 (one worktree per pass).

**Defect.** An engine pass branched before a docs stage's stamps landed can change a declaration those stamps cover. Each branch passes `check:facts` on its own, and `main` goes red after the second merge. The spec gives "the engine pass that changes a stamped declaration" the re-read, but that pass never saw the stamp. The reverse case also happens: a docs stage in flight meets stale ids from engine merges, and no share budgets for them.

**Fold.** Add one line to the close: the pass that merges second merges `main` in before its final gate and owns the re-reads through DI5's dispatch. Give the stage budget a line item for stale-id re-reads at merge.

### DI7 (major): `designFriction` entries can be lost, filed twice, or flood the log, and filing them breaks the thin-conductor rule

**Location:** spec:158-171; runner `docs-page-chain.js:607-610`.

**Defect.** (1) **Loss.** The entries ride returned per-page records held only in the conductor's context until "the next checkpoint." Compaction drops agent transcripts under the global compact instructions, and a crashed workflow returns nothing. (2) **Double filing.** The drafter already writes design gaps into the friction log directly (`frictionFiled`), and the spec adds a second route for the same thing through the conductor. (3) **Flood.** Four reporters on every page, across two rounds and about 30 pages, will report the same seam many times over. (4) **Role.** "The conductor files every entry ... verified against the code first" has the conductor reading code, which the global rule forbids.

**Fold.** The runner writes each page's record, with its `designFriction`, to a file in the worktree as the page finishes. At the checkpoint, one dispatched filer (Sonnet) dedupes the entries, verifies each against code, and files it, the same shape as the sweep's filer. Make `designFriction` the one route and drop the drafter's direct write. Over-ceremony: limit the reporters to page inputs and the fact read, which are the two agents that meet the code. The register editor's friction is prose-level, and the drafter's overlaps with page inputs'.

### DI8 (major): exclusions from option coverage have no home that keeps the baseline shrink-only

**Location:** spec:94-98.

**Defect.** Page inputs "records an exclusion with a reason." The gate only sees committed files, so an exclusion must live in the baseline, which then grows with every page (contradicting "may only shrink"), or the gate fails the page. "May only shrink" also has no mechanical check: a committed baseline can be edited in the same diff, and "needs a reason on the entry" is satisfied by any string. An engine pass that adds an option can baseline it with a reason instead of filing the fact that CLAUDE.md already requires.

**Fold.** Split the two lists. Exclusions go to a small named allowlist, one reason per entry, the typescript-eslint pattern the spec cites (spec:83-84). The baseline is frozen at creation, and the gate fails any baseline path absent from `main`'s committed option list (`git show main:<list>`), so a new option can never be baselined. The diff-reviewer reads both files' diffs.

### DI9 (minor): the committed option list can go stale without the gate noticing

**Location:** spec:90-92, :214.

**Defect.** If the gate reads the committed list, a pass that adds an option without regenerating the list passes uncovered. A merge conflict in a generated file also invites a hand merge.

**Fold.** The gate regenerates the list and fails on a diff (generate-then-diff, the Terraform form in the prior art at :164). On a conflict, regenerate, never hand-merge.

### DI10 (minor, if built): the fact read would stamp its own correction

**Location:** spec:116-118, with parent:377-380 (the fact read "fixes or retags" a stale fact).

**Defect.** When the fact read rewrites a stale fact and then stamps it, it vouches for its own text. That is the self-correction the spec cites Huang against (spec:70-71).

**Fold.** The fact read stamps only facts it verified unchanged. A fact it rewrote stays unstamped until a later read.

### DI11 (minor, if built): the stored "verified at" commit is misleading and fragile

**Location:** spec:111-112.

**Defect.** The chain commits nothing, and an engine-pass re-read runs over uncommitted code, so the recorded commit does not contain the code that was verified. A rebase also orphans it.

**Fold.** Drop the field, since the hashes carry the truth. It is also one fewer field to merge.

### DI12 (minor): the release sweep's window can be mis-scoped, and a skipped sweep loses its range permanently

**Location:** spec:137-139.

**Defect.** "The last published tag" is ambiguous among the interleaved `tool/v*` and `-rc` tags, so a `git describe` may window from `tool/v1.1.0`. A release cut without its sweep drops that range for good, because the next window starts at the newer tag.

**Fold.** Window from the last engine tag whose sweep yield `docs/HISTORY.md` records, matched as `v[0-9]*` with prerelease tags excluded. Name the branch that the sweep's filings land on before the version is set.

## Most important finding

DI1: the staleness hash would not have caught any of the four facts it cites, because all four were wrong when filed and their code has not changed since. A stamp would have certified them green. Under the spec's own lean guard, the mechanism should be deferred behind a drift trigger. If it is built anyway, DI2's line-pointer noise is a blocker that would push every engine pass toward rubber-stamping.
