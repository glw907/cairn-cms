# cleanup plan fold verification

Target: `2026-11-02-cleanup-plan.md` at `7a6408643`, read against the fold record and the three reviews. Line
numbers are that commit's. Nothing was built. Web quotes were fetched today.

**Verdict line is at the end.** One check was refused and left: see "Refusal in this read".

## Refusal in this read

The credential grep over the plan, design note, sweep, and state read was refused by the PreToolUse Proton Pass
hook ("Proton Pass access denied"). The command's pattern named that tool's CLI, which is the likely trigger, but
the hook didn't say so. It was a stop for that check, so I didn't rerun it in another form and didn't scan those
files or the `BACKLOG.md` diff for the same terms by other means.

- **Covered by reading:** the plan and design note, read in full before the refusal. Neither holds a route to a
  credential. `plan:169` says "No task reads a credential", S5 (`plan:121`) has lost its fallback, and design call 5
  (`design.md:45`) says only that #211 moves. `BACKLOG.md:131-133` (#211) names no key.
- **Not covered:** the sweep, the state read, and the rest of the `BACKLOG.md` diff. So mechanics 14's sweep half
  (the "Could not settle" line, and T15's brief quoting sweep Groups I and J) is unverified. The conductor should
  have that grep run by a session that may run it, with a pattern that doesn't name the CLI.

## Findings

### 1. T12 has no answer for a refused probe, and the standing rows point the wrong way

**Severity:** blocker. **Tag:** correctness. **Location:** `plan:828-831`, `:833`, `:221`, `:223`, `:139-144`.

**Defect:** T12 says "The plan's fold couldn't run this probe (the worktree guard refused it), so this is its first
run" and then only "A pattern that fails its probe is fixed before the suite starts." It has no branch for a refusal.
The rows that would catch it don't hold:

- `:223` makes a stop of "A refusal of any kind other than the shell guard". The worktree guard is the shell guard
  (`BACKLOG.md:102-103`, #250), so that row exempts this very refusal.
- `:221` then applies only to "A compound shell line", and says to run it plainly or use Read and Write. A
  single-line `claude -p` refused by the guard has no row at all.
- The obvious next move is the route-around. `:833`'s next line starts `node .../run.mjs`, which spawns `claude -p`,
  and `BUILD_TOOLS` (`run.mjs:53`) shows an eval case can run `node` and `npx`. A probe wrapped in a script, in
  `cairn-run-gate`, or added as an eval case gets the refused effect another way. The launch rule: "A refusal is a
  stop: never get the refused effect another way".
- T12 goes to a `cairn-implementer` worktree subagent (`:242-243`), where #250 records the same guard refusing "in
  all four `cairn-implementer` dispatches". A refusal in the run is likely, not remote.
- Pre-flight says "No sign-in, secret, dialog, or new permission rule is needed" (`:139`) and doesn't list the probe,
  though it's a known refusal. The launch prompt requires Pre-flight to name auto-mode gaps, and the ledger's
  cutover entry (`ledger.md:73`) says a permission step "is settled before launch, never at a mid-pass set point".

**Proposed fold:** in T12, after the probe bullet:

> The session runs the probe once, as one plain `claude -p` line. If it's refused in any form, that's a stop for the
> probe: never retry it through a script, `run.mjs`, an eval case, `cairn-run-gate`, or a subagent. Set aside #191's
> deny list and its `ALLOWED_TOOLS` change, list the refusal in `## Tooling`, and keep #191 open with that remainder.
> The judge fence, `cp -a`, and #188 still land, and the suite still runs as it has.

Change T12's acceptance to "the probe's denials are recorded, or the refusal is". Name the probe and the `run.mjs`
start in Pre-flight as a known gap, and say the session, not the implementer, runs both, since a background command
started by a subagent is the subagent's. Reword `:223` so no row exempts a refusal of a non-compound command.

### 2. OWNER FORK: S1's option (a) changes a ceiling Geoff approved

**Severity:** major. **Tag:** correctness. **Location:** `plan:63-89`, `fold-record:6-7`, `fold-record:57`.

**Defect:** S1 is one clear question, and the evidence is enough to choose. What it doesn't settle is who may choose.
The ceiling is Geoff's: "ceilings twice each estimate and 2,900 actual minutes" (`ledger.md:96`), and the sheet says
a plan "stops only if still over" (`run-sheet.md:221`). His Brief set it in plan minutes: "The design totals about 2,900
plan minutes" (`run-sheet.md:37`). S1 itself says a factor "changes the ceiling's unit". Mechanics 5 marked this an
owner fork ("it must be his word or a ledger ruling"), and the fold record reports "0 owner forks", citing "ruling 1".
No numbered ruling appears in the plan, the design note, or the ledger, so this read can't see what was ruled.

**Options:**

- **A.** Geoff's word on (a), or a ledger ruling that a plan may be calibrated against its ceiling. It means one
  question reaching him before the release, which the Brief promised to avoid.
- **B.** The conductor rules (a), on the sheet's "recent passes ran at 0.2 to 0.5 of plan path", and records it for the
  next record packet.
- **C.** The conductor rules (b), which needs no change to the ceiling.

**Recommendation:** A if the conductor has no ruling in hand; otherwise record that ruling in the plan and the ledger.
The cost of (b) is 339 path minutes at reader size moved after the release, including all of T1 and T2. Evidence for the ruling
beyond S1's text:

- `plan:75`'s 0.7 is approximate: 839 / 1,173 is 0.715. At strict 0.7 the path is 821.
- S1's ratio range (0.35 to 0.74) sits above the Brief's (0.2 to 0.5). At the range's top, 1,173 is 868 actual, over 840.
- With 839 against 840, the pace trigger (`:226`) fires on any net overrun above one minute, starting at T1 and T2's
  close. At 0.58 of reader size that won't bind, but it's a tight trigger with one-way effects.

### 3. T11 keeps a stale second acceptance

**Severity:** minor. **Tag:** correctness. **Location:** `plan:796-798`.

**Defect:** The fold rewrote T11's acceptance at `:791-794` and left the old block under it. The old block drops
`media-library.spec.ts` from Test, the 7 of 15 comparison, and the "masked by re-click" label, so it undoes contract 6.

**Proposed fold:** delete `:796-798`.

### 4. T12's deny list leaves working write flags

**Severity:** minor. **Tag:** correctness. **Location:** `plan:820-822`, `run.mjs:41`, `:46`, `:48`.

**Defect:** `sed` holds: `Bash(sed *)` denies a piped use too, per "Deny and ask rules apply when any subcommand
matches them". The rest is uneven.

- `run.mjs:41` allows `Bash(git -C * grep *)`, and T12 denies `-O` only under plain `git grep`, so #191's own form
  survives through `git -C`.
- `git show --output=/dev/null HEAD` and `git log -1 --patch --output=/dev/null` both exited 0 here, and
  `Bash(git show*)`, `Bash(git log*)`, and their `-C` forms stay allowed.
- `sort -uo /dev/null /dev/null` exited 0, and `Bash(sort *-o*)` needs `-o` adjacent, so a clustered flag gets past it.
  The same pattern also denies a plain `sort a-one.txt`, the over-match T12 rejected for `sed`.

An abbreviation isn't a gap: `git diff --outpu=/dev/null` is rejected ("invalid option"). `BACKLOG.md:200` says the
fixture sandbox is the boundary, so this is a tidiness gap and not a hole.

**Proposed fold:** add the `git -C * grep` forms, and `*--output*` for `git show`, `git log`, and their `-C` forms.
Rule patterns have only `*`, so widen `sort` to `Bash(sort *-*o*)`, which over-matches, as `sed`'s whole deny does. A
denied filter isn't a fault under `NEEDED_COMMAND`, and a pipe's bare `sort` still works.

### 5. T9's stderr-only finding can read as non-blocking

**Severity:** minor. **Tag:** optional. **Location:** `plan:681`, `:694-695`.

**Defect:** All three T9 quotes are exact, but the hooks page adds a case the plan doesn't quote: "when your hook exits
2 with nothing on stdout and its stderr says a file is missing, such as `No such file or directory`, Claude Code treats
the run as a non-blocking error." A `check:cairn` finding about a missing file could trip it.

**Proposed fold:** the wrapper prints one short line to stdout as well, and T9's test covers a finding with that text.

### 6. The claim writer can still reach the unblind result

**Severity:** minor. **Tag:** correctness. **Location:** `plan:969-971`, `:1010`.

**Defect:** Contract 1's blocker closed for the brief, the judge, and the freeze. T15's implementer works in a tree
holding this plan and the state read, though, and `:971`'s list of what it opens names neither. `:1010` and state read
`:289` both carry "nine of nine".

**Proposed fold:** add "this plan, and the state read outside `:264-267`" to `:971`'s list, or move the sentence to the
PR text the session writes after the grade.

### 7. T16 doesn't say what a judge that left the directory means

**Severity:** minor. **Tag:** correctness. **Location:** `plan:1003`.

**Defect:** Step 4 records that no read left the directory, and that's the only enforcement of blindness. There's no
branch for a read that did.

**Proposed fold:** "A read outside it voids that grade: one fresh agent reruns it, and a second breach records #207 as
ungraded."

### 8. T11 and the Tasks intro disagree on where #208 closes

**Severity:** minor. **Tag:** correctness. **Location:** `plan:246`, `:753`, `:784-785`.

**Defect:** "BACKLOG closes in T17, in one edit", while T11 lists `BACKLOG.md` and says "#208 closes".

**Proposed fold:** T11 writes the evidence on #208, and T17 closes it.

### 9. Pre-launch records are short

**Severity:** minor. **Tag:** correctness. **Location:** `plan:65`, `design.md:36-45`, `fold-record:54`.

- The launch prompt says to "write one question to your branch's docs/STATUS.md". `git grep -E "S1|cleanup" --
  docs/STATUS.md` prints nothing.
- `git branch -r --contains 7a6408643` prints nothing, by local refs, and T0 merges `origin/worktree-cleanup`. This may
  just be the planner's hand-off still to come.
- The design note's calls stop at S5. S6 and S7 are missing, though S6 is the pass's one out-of-scope landing.
- The fold record cites rulings 1, 3, 4, 5, 6, 7, 10, and 13 with no source a reader can open, and F1 and F2's "Not a
  fork" rest on them.

**Proposed fold:** add the STATUS line, push, add S6 and S7 to the design note, and quote the rulings in the record.

### 10. Option (b) has two consequences it doesn't state

**Severity:** minor. **Tag:** optional. **Location:** `plan:79-84`.

**Defect:** (b) splits ergonomics 7 from `/styleguide`, which the sheet joins ("`/styleguide` leaves the scaffold's
production build in pass 8, with ergonomics 7", `run-sheet.md:260`). It also spends the whole Set-aside order, so the
pace trigger has nothing left if the run overruns.

**Proposed fold:** one sentence in (b) naming both, so the ruling sees them.

## Ask 1: blockers and majors at their locations

Plan text spot-checked, not the record's claim. All closed, with the residues noted.

| Finding | Location | Result |
| --- | --- | --- |
| Mechanics 1 | `:208` | Closed |
| Mechanics 2, contract 5, data 2 | `:442`, `:469-476` | Closed. Header read, absent header skips |
| Mechanics 3, contract 4, data 1, 5, 9 | `:459-468`, `:486-488` | Closed. `git grep` finds no session SQL outside the named sites |
| Mechanics 4 | `:1071-1073` | Closed. Proxy and seeded name |
| Contract 1 | `:967-971`, `:993-1003` | Closed, with finding 6's residue |
| Mechanics 5, data 8 | S1 | Text closed. Authority is finding 2 |
| Mechanics 6, 7 | `:226`, `:87` | Closed |
| Mechanics 8, contract 7 | `:839-844`, `:1035` | Closed |
| Mechanics 9 | `:820-831` | Patterns named, with finding 1 and 4's residue |
| Mechanics 10, 11, 12, 13, 15 | `:993`, `:667-682`, `:209`, `:646`, `:521` | Closed |
| Mechanics 14 | `:121` | Plan and design closed. Sweep half unverified (refusal) |
| Contract 2, 3, 6, 8, 9, 10, 11, 12, 13, 14 | `:1004-1009`, `:449-452`, `:778`, `:1051`, `:1069-1070`, `:1105`, `:989`, `:884`, `:866`, `:646-652`, `:595` | Closed |
| Data 3, 4, 6, 7, 10, 11 | `:472-476`, `:322`, `:1042-1045`, `:1055`, `:453`, `:975-978` | Closed |

## Ask 2: path, S1, and build order

- **Tasks path:** 10 + 88 + 80 + 108 + 103 + 110 + 69 + 70 + 34 + 77 + 90 = 839. It matches the header (`:16`), S1, and
  the Tasks intro (`:249`). Each pair is its longer task: T5 105 + 3 for the session's event.
- **Reader figure:** 825 + 14 of additions is 839, and 1,153 + 20 (14 at 0.7) is 1,173. It matches.
- **S1 (b):** 1,173 - 116 = 1,057; - 126 = 931; - 37 = 894; - 60 = 834. Each step checks against sizes:
  - The 13: R8 shards 15 and ergonomics 14's 10 take T10 and T9 to 142 and 144, so the pair falls 13.
  - The 116: 13, plus 45 for T3 and T4 (114 to 69 without #265, #260, #281), plus about 58 for T5 and T6. T7+T8 and
    T11+T12 save 0, since each item sits in the shorter task.
  - The 126 is T2's reader size. The 60 is ergonomics 1, 7, and #203 at 15, 30, 15.
  - **May-not:** respected. No listed item is R1, R3, R9, a #196 major, a measure, T11's trace, or #271.
- **Order:** builds. The claims commit (T15) precedes the grade (T16), and T10's report change precedes T11. Pairs are
  disjoint but for generated files, which a row covers. `hasOpenEmailDecline` is already exported, so T7 needs no
  `chapter2.mjs` edit. The one text contradiction is finding 8, the one leftover is finding 3.

## Ask 3: new mechanisms

| Mechanism | Result | Source |
| --- | --- | --- |
| `cf-connecting-ip` | Proven. `CairnEvent` has no member, per the reviews | `phonebook/node_modules/@sveltejs/adapter-cloudflare/files/worker.js:91-93`: `return /** @type {string} */ (req.headers.get('cf-connecting-ip'));`. The worktree and main checkout have no install, so the copy is phonebook's, as the fold says |
| `Object.hasOwn` fallback | Proven as stated. `constructor`: owner `true` at `:185`, editor `true` via `:199`, `none` `false` at `:181`. `requireAccess` and `admin-action.ts:135` run `hasAccessRule` first, so they stay refused. Only `requireEngineAccess` (`guard.ts:493`) moves from a 500 to admit, which is its documented floor, and `:452` names it for T18 | `access.ts:176`, `:179-199` |
| Stop hook | Proven, quotes exact. See finding 5 | code.claude.com/docs/en/hooks, Stop input and Stop decision control |
| `tool/v2` paths | Proven. `tool/Makefile:7`, `tool.yml:176`, and the three non-import strings exist. `git grep` shows no other reader, and `make build` writes `tool/cairn` (`Makefile:27`). "Unstamped with no error" is an inference from the `-X` text, and T15's `--version` check tests it | `go doc cmd/link`, quote exact |
| `sed` deny | Proven as a rule, not as a run. The four permission quotes are exact, and the live proof is T12's probe | code.claude.com/docs/en/permissions lines fetched |
| T16 grade beside CI | Sound. `04c6036ac` exists, the three transcripts and `brief-map.md` are readable, and the session has Agent. See finding 7 | `git cat-file`, `ls` |
| Wrangler `--check` | Proven against the page. The plan's first quote stops short of the page's "and runtime inputs", and the second of "or regenerate the file", which changes nothing. `--env-file` isn't listed, as the plan says. The installed version wasn't checked: the pin is `^4.148.0` | developers.cloudflare.com/workers/wrangler/commands/workers/ |

## Ask 4: refusals

T12 fails: finding 1. The grep is refused and partial: "Refusal in this read".

## Ask 5: the conductor's question

- **Can the conductor rule S1 on the evidence?** On the evidence, yes, and the (b) list holds. On authority, not clearly:
  finding 2.
- **Is it one question?** Yes. S2 to S7 are framed as readings with no pre-launch need, and `:93-95` says so.
- **Anything else needing an answer before launch?** The plan frames nothing else that way, but finding 1's Pre-flight
  gap is one in fact: `:139`'s "Nothing for Geoff" is true only once T12's refused probe has its answer. That answer is
  a plan edit, not a question.

**Verdict:** 1 blocker and 1 major remain (finding 2 is an owner fork); the credential grep over the sweep, state read,
and `BACKLOG.md` diff was refused and is still open.
