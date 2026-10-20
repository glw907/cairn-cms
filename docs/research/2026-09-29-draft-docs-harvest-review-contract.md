# Draft docs harvest: contract-and-criteria review

**Lens:** contract and criteria. **Targets:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md`
(spec) and `docs/superpowers/plans/2026-09-29-draft-docs-harvest.md` (plan), at `7e57601d`.
**Counts:** 2 blocker, 5 major, 6 minor. No owner forks: every finding has one correct answer.

Evidence was checked against the worktree: the page count (9 + 8 + 30 + 2 = 49) is right; the
facts gate's pointer resolution (`scripts/checks/check-facts.mjs` `validatePointer`); the kept
pages' links; the discovery grep's actual hits.

## Blockers

### CC-1 (blocker): the verifier cannot tell a complete ledger from a token one

**Location:** spec:79-92 (the verifier), spec:13 (H1); plan:101-112 (task 1).

**Defect.** Every verifier rule checks a claim that is present: it has a disposition, its id
resolves, its tag is citable. No rule checks that the claims cover the page. A ledger holding
three claims for a 300-line page passes, and so does `claims: []`, since "no claim lacks a
disposition" holds trivially. H1 promises that the harvest is *proven* before deletion. That
promise rests on this script, and the script checks only the ledger's internal consistency. The
per-batch `diff-reviewer` spot-traces five `fact` dispositions (plan:76-78). That tests mapping
accuracy only. No reviewer or check looks for claims that were left out. An omitted claim is the
one failure the deletion makes expensive: drafters never read old pages, so an omitted fact is
gone from every later stage unless someone digs it out of git.

**Fold.** Add a `lines: [start, end]` field to each claim, giving the claim's span on the audited
blob. Add one verifier rule: every non-blank line of the page falls inside at least one claim's
span. Headings and link-only lines are covered by `cut: navigation` claims. Fail an empty
`claims` array outright. Add two fixture cases: a ledger that leaves one paragraph uncovered
(fails, names the page and the uncovered line range) and an empty-claims ledger (fails). The
cost is a few tokens per claim for the auditor. In return, "every claim disposed" can be
checked mechanically instead of taken on trust. Update the schema in
`docs/internal/record/harvest/README.md` in the same task.

### CC-2 (blocker): two kept pages link to deleted pages, and the plan forbids editing them

**Location:** plan:56 ("The three kept extend pages are never audited, edited, or deleted");
spec:94-109; plan:195-231 (task 8).

**Defect.** Links from the kept pages into the deletion list:
- `docs/extend/upgrade-cairn.md:7` to `./README.md#operate-across-versions`
- `docs/extend/upgrade-cairn.md:19` to `../admin/what-to-run-and-when.md`
- `docs/extend/upgrade-cairn.md:70` to `./debug-your-site.md`
- `docs/extend/choose-an-ai-posture.md:8` to `./wire-the-delivery-surface.md#feed-sitemap-and-robotstxt`
- `docs/extend/choose-an-ai-posture.md:131` to `../admin/is-it-working.md#make-the-stated-ai-posture-effective`

After the deletion, `docs-links` fails on each of these links. Task 8's gate therefore cannot
go green while the global constraint holds. `choose-an-ai-posture.md` is a rebuilt page with a
brief, and its brief carries the same two links in its sentences
(`docs/internal/briefs/extend/choose-an-ai-posture.json:9,177`). Editing the page alone
therefore also breaks `check:provenance`.

**Fold.** Narrow the constraint at plan:56 to "never audited or deleted; task 8 edits only the
link lines that target a deleted page". For `choose-an-ai-posture.md`, apply the facts README's
"Edits after the chain" rule. Update the brief's matching `sentences` in the same change. A pure
link substitution or removal needs no review. Record each of the five links in `relink.json` with
its restoring stage (2a or 2b for the extend targets, 3 for the admin targets).

## Majors

### CC-3 (major): a scoped verifier run can pass with no ledgers at all

**Location:** plan:104-106 ("with no flag it checks all 49 and fails on any missing ledger");
plan:116-117, 132-133, 143-144, 155-156, 171 (the audit-task gates).

**Defect.** The plan states the missing-ledger failure only for the unscoped run. Each audit
task's gate is a scoped run (`--arm admin`, `--pages <15 paths>`). If a scoped run checks only
the ledgers it finds, task 2 goes green with 8 of 9 ledgers, or with none. A `--pages` list with
a typo'd path, or a path off the deletion list, silently scopes the run to fewer pages. The plan
also leaves some input states without a named report: the record directory absent, a ledger
file that is not valid JSON, a ledger whose `page` field disagrees with its file location, two
ledgers for one page, and many failures in one run.

**Fold.** Add these task 1 outcomes, each with a fixture case:
- A scoped run fails on a missing ledger for any page in its scope.
- `--pages` with a path that is not on the deletion list exits non-zero, naming the path.
- An absent record directory fails.
- Malformed JSON fails, naming the file.
- A `page` field that does not match the ledger's location fails.
- A duplicate ledger for one page fails.
- The run reports every failure, not just the first.

### CC-4 (major): a `duplicate-of:<id>` cut escapes every id check, and the parallel chains make that likely

**Location:** spec:43-48 (dispositions), spec:86-88 (verifier rules); plan:165-167, 180-181
(the chain Y/Z split).

**Defect.** The verifier resolves ids only for `fact` and `new-fact`. It checks a `cut` reason
against the list, so `duplicate-of:f:zzzzzz`, whether it names a missing bullet, a `[candidate]`,
or an id another chain deletes, passes as long as the prefix is on the list. The chain split
makes this likely. Suppose a chain Y claim matches a `[candidate]` bullet in a section chain Z
owns. Y may not resolve that bullet (plan:166-167), and a `fact` disposition would fail Y's
gate. `duplicate-of` is then the path that goes green. Chain Z then deletes the candidate as a
cut, and the claim is disposed against nothing. The spec also gives no rule for choosing
`fact <id>` over `cut duplicate-of:<id>`, since both mean "the container already holds it."

**Fold.** Pick one of these; both are within Claude's call:
- Drop `duplicate-of` and use `fact <id>` for every claim already in the container. This is the
  simpler option.
- Keep it, and have the verifier resolve its id under the same citable-tag rule.

Either way, add a fixture case with a dangling `duplicate-of` id. State the cross-chain rule for
the auditors: when the only matching bullet is a `[candidate]` in another chain's section, file a
verified `new-fact` in the auditor's own section. The task 7 unscoped run is then the check that
nothing points at a bullet another chain deleted.

### CC-5 (major): task 8's grep post-condition cannot be met as written, so it will be waived

**Location:** plan:79-81 (review focus 3), plan:201-210, plan:228-231 (task 8 acceptance).

**Defect.** The acceptance says the discovery grep returns only `relink.json`, `CHANGELOG.md`,
the ledgers, and Go constants naming `cairn.pub` anchors. Four problems with that:
- The grep already excludes `docs/internal/record`, `CHANGELOG.md`, and `docs/superpowers`, so
  three of its four allowed items can never appear.
- Hits the list does not allow must survive:
  - every facts file's section headings (`docs/internal/facts/admin.md:6` is
    `## docs/admin/before-you-start.md`, and the stage outlines key on these sections);
  - the dated archives in `docs/internal/history/` and `docs/internal/feedback/`;
  - about 37 design and review docs under `tool/docs/`;
  - `tool/testdata/copy.golden.md:362`;
  - `scripts/checks/shipped-anchors.json`'s `_note`;
  - `tool/internal/doctor/check_referrer.go:36`, a shipped constant spelled as a repo-relative
    path (`docs/admin/is-it-working.md#...`), not a `cairn.pub` URL, which plan:66-67 forbids
    changing.
- The companion basename grep cannot be read literally. Basenames such as `README`,
  `architecture`, `content-model`, and `security-model` match all over the repo
  (`security-model` alone hits 88 files).

A post-condition that cannot be met gets waived by whoever runs it, which makes it vacuous. That
is review focus 3's own risk.

**Fold.** Enumerate the allowed residue by path class, with the reason for each:
- facts section headings, since those sections are the harvest's key;
- `docs/internal/history/**`, `docs/internal/feedback/**`, and `tool/docs/**`, as dated records,
  with a stated edit-or-leave rule;
- tool goldens and shipped tool constants, both the `cairn.pub` form and the repo-relative form;
- `shipped-anchors.json`;
- the parent spec.

Scope the basename grep to link-shaped matches: `<basename>.md`, `<basename>.md#`, and
`/<basename>)`. Have the implementer print the residue and classify each line against the
list, and give the task's `diff-reviewer` that printout.

### CC-6 (major): twelve `[verified]` facts cite a deleted page by line, so `check:facts` goes red at deletion

**Location:** spec:92 ("`npm run check:facts` stays green throughout"); plan:63; plan:209-210.

**Defect.** Twelve `[verified]` bullets carry a `Source:` pointer of the form
`docs/<arm>/<page>.md:<line>` into a deletion-list page. Examples:
- `docs/internal/facts/admin.md`: `create-your-site.md:70-72`, `invite-editors.md:35-37`,
  `own-your-domain.md:81`, `troubleshooting.md:121-123`
- `docs/internal/facts/editors.md`: `when-something-goes-wrong.md:74`

`validatePointer` in `scripts/checks/check-facts.mjs` reports `unresolved path` for each one once
the file is gone. Nothing in the audit rules or the verifier rules flags them. Task 8's discovery
grep will surface them, but the plan's repair verbs cover prose links, code comments, and
fixtures, not a fact's evidence. An implementer who strips the page pointer changes a verified
fact's source after the verifier ran. Some of these bullets are claims about the page's own
wording (`f:3jjrzt` in `admin.md:35`), and those become meaningless once the page is gone.

**Fold.** Handle this in the audit, not in task 8. The auditor drops any `Source:` pointer into a
deletion-list page from a bullet that also cites code. A bullet whose claim is about the page
itself is retagged `[rejected: describes a deleted page]` or retraced. Add a verifier rule, with
a fixture: no bullet that a ledger resolves, and no bullet in an audited section, carries a
`Source:` pointer into a deletion-list page.

### CC-7 (major): "passes on an empty arm" is undefined for `docs/extend/`, which keeps three pages

**Location:** spec:105-109; plan:217-218, 228-229.

**Defect.** Every narrowing is "scoped to the arm's absence" and pinned by a test that "passes
on the empty arm". `docs/extend/` is never empty: three pages stay. `check:arm-indexes`
(`ARMS` includes `docs/extend`, index `docs/extend/README.md`) will see three pages and no index.
It fails, or the implementer keys the narrowing on "README absent". That condition keeps the gate
silent after stage 2a writes pages and forgets the README. That is review focus 4's exact risk,
and the both-ways test the plan specifies would not catch it, since both of its states are
built on the wrong trigger. `check:package-files` has the same issue with its `docs/extend/`
prefix and its front-door list.

**Fold.** Define the re-arm trigger per arm as "any page exists in the arm outside the kept set",
not "the directory or index exists". Have each both-ways test use three fixtures:
- the extend arm holding only the three kept pages (passes);
- the extend arm plus one new page with no index (fails);
- the same with the index present (passes).

Name the kept set once, as the constant task 1 exports alongside the deletion list.

## Minors

### CC-8 (minor): the hardcoded deletion list can drift from the tree

**Location:** plan:102-103, 213.

**Defect.** A page that pass C or a site pass adds to an arm while this pass runs is not on the
49-item constant. It is never audited, and task 8's "nothing else under `docs/` is deleted"
leaves it stranded in an arm the gates treat as empty.

**Fold.** Add a verifier rule, with a fixture: the constant equals the glob of every `.md` file
under the three arms, minus the kept set, plus the two front-door files. A new page then fails at
task 7 by name.

### CC-9 (minor): the blob check guards only up to task 7, and the verifier cannot be re-run after the deletion

**Location:** plan:73-75, 185-193, 240.

**Defect.** `main` can still edit an old page between the task 7 merge and the PR merge. The
later merge then raises a modify/delete conflict, and a conductor resolving it the obvious way
("delete wins") drops the edit unaudited. Separately, acceptance line spec:154 is a pre-deletion
fact: once the pages are gone, re-running the verifier fails every blob check.

**Fold.** Add a rule to task 8 and task 9: a modify/delete conflict on a deletion-list page at
any later merge stops the merge, and that page's diff against its ledger `blob` goes to a
re-audit. Record the commit SHA the full verifier passed on in the pass record, so the result can
be reproduced with `git checkout <sha>`.

### CC-10 (minor): a stale-blob re-audit can bump `blob` without being reviewed

**Location:** plan:188-190.

**Defect.** The task 7 re-auditor updates the ledger, and the verifier then only checks that
`blob` matches. The plan runs no `diff-reviewer` on the re-audit, so bumping the blob and nothing
else goes green.

**Fold.** Give any re-audit's diff one `diff-reviewer` read, or have the conductor confirm that
the ledger diff touches claims in the changed line ranges. If CC-1's `lines` field lands, that
check is mechanical.

### CC-11 (minor): the tarball outcome is in the review focus but not in task 8's acceptance

**Location:** plan:84-86 (review focus 5) against plan:228-231.

**Defect.** `check:package` green does not prove the three kept extend pages still ship. An
implementer who drops `docs/extend` from `package.json` `files` because the arm is deleted
passes `check:package` after narrowing it. Consumer sites and cairn.pub then lose
`migration-notes.md` and `upgrade-cairn.md`.

**Fold.** Add an acceptance line to task 8: the `npm pack --dry-run` docs list is exactly
`docs/reference/**` plus the three kept pages.

### CC-12 (minor): the committed anchor list's fixture states are unnamed

**Location:** spec:117-122 (H5); plan:218-219.

**Defect.** The list-mode check needs the same guards the page mode has. The input states: the
list absent, empty, or malformed; a live `docsAnchor` not in the list; and the page reappearing,
which must switch modes. `fixes_test.go` has a "found no headings" guard, and list mode needs its
equivalent, or an empty list passes. "Built from ... today's live anchors" must also mean frozen
into the committed file, never recomputed from the live registry at test time. A recomputed list
is tautological.

**Fold.** Add a task 8 acceptance line naming these fixture states for both `check:readiness` and
the Go test. State that the list is written once from the page's `##` heading slugs at deletion
time, and is thereafter append-only like `shipped-anchors.json`.

### CC-13 (minor, execution risk): task 8 is two tasks with different review bars

**Location:** plan:195-231.

**Defect.** Task 8 combines two different kinds of work:
- correctness-critical gate logic, about nine gates with both-ways tests, `engine-logic` plus
  `tool`;
- a mechanical sweep over about 150 files outside the facts container (relinks, comments,
  CLAUDE.md, CHANGELOG, `relink.json`).

It runs as one Opus implementer dispatch and one `diff-reviewer` read. The reviewer cannot
give the gate logic an engine-logic read inside a diff that size. A context-exhausted
implementer also leaves a red tree with 49 deletions staged.

**Fold.** Split it:
- 8a: the narrowings, test-first against fixtures, while the pages still exist. Opus
  implementer, full gate.
- 8b: the deletion, the relink sweep, and `relink.json`. Sonnet implementer, full gate.

8a's fixtures make its tests independent of the real tree, so the split costs one extra review
read and removes most of the re-dispatch risk.

## Checked and sound

- The page count and the deletion list: 49, matching the tree.
- The class and gate for tasks 2 to 6. A docs class gated by `check:facts` plus the scoped
  verifier fits a diff of ledgers and facts bullets, once CC-3 closes the vacuity.
- The rate checkpoint after task 2, and the three-chain split. The chains' facts sections are
  disjoint, and minted ids cannot collide.
- Task 1 at `engine-logic`, test-first. The verifier is the pass's only mechanical guard, so the
  full bar is proportionate.
