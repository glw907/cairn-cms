# Draft docs harvest: fold verification

**Targets:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` (spec) and
`docs/superpowers/plans/2026-09-29-draft-docs-harvest.md` (plan), at `da3a923b`.
**Read against:** the fold record, the four reviews, the parent spec, `docs/STATUS.md`,
`~/.claude/workflows/pass-execute-chains.js`, the facts container, `docs/internal/docs-register.md`,
cairn-pub's tree, and the scripts the targets name.
**Bar:** only gaps that affect correctness or the stated requirements.
**Counts:** 1 blocker, 4 major, 7 minor.

## Q1. Did each blocker and major close at the cited location?

| Review finding | Closed? | Where |
| --- | --- | --- |
| CC-1, DR-1 (blocker): coverage | Yes | spec:49-53, 122-123; plan:155-160 |
| CC-2, MF-1 (blocker): kept pages must be edited | Yes | spec:34-37; plan:94-95, 267, 293-295 |
| MF-2 (blocker): `check:facts` red at deletion | Mostly; see FV-1 (the new rule blocks the scoped gates) and FV-7 (what "names" matches) | spec:91-99, 127; plan:232-235 |
| DR-2, CO-2, MF-3 (blocker/major fork): theme lineage | Yes, as a hold | spec:20, 224-236; plan:29-31. See FV-11 on how it was ruled |
| CC-3: scoped run with no ledgers | Yes | spec:118-119, 129-130; plan:149-160 |
| CC-4, DR-5: `duplicate-of`, cuts unsampled | The disposition half closed (spec:56-63, 81-83). The sample half did not reach the reviewer; see FV-2 |
| CC-5, DR-4, CO-4, MF-4: residue post-condition | Partly; the class list still leaves live hits unclassifiable; see FV-3 |
| CC-6, DR-3, CO-1: facts citing deleted pages | As MF-2 |
| CC-7, MF-6: extend's partial state, two missing gates | Yes | spec:140-154; plan:262-275. Front door gap: FV-9 |
| MF-5: `docs-links` on historical files | Yes | spec:162-165 |
| MF-7: create-cairn-site coupling | Yes | spec:173-175; plan:279-281 |
| DR-6: blob check expires | Yes | plan:311-313 |
| DR-7: readiness re-arm | Yes | spec:156-161 |
| DR-8, CO-5: cairn.pub pin | The premise is corrected (spec:201-203). The ceiling lands in a file no cairn-pub pass is routed to; see FV-5 |

## Findings

### FV-1 (blocker): the container-wide `Source:` rule makes every scoped audit gate unpassable

**Location:** spec:127 and 129-130; plan:149-150, 164-165, 185-186, 196-197, 208-209, 223.

**Defect.** The verifier rule reads "no bullet anywhere in the container names a deletion-list
page in its `Source:`". The spec scopes a run by pages (`--arm`, `--pages`), and it says a scoped
run still enforces the missing-ledger rule. It never says the `Source:` rule narrows. Built as
written, task 2's gate (`--arm admin`) fails on every editors, extend, and front-door bullet that
still cites an old page. A probe of today's container finds such bullets in `editors.md` (6),
`extend.md` (30), and `front-door.md` (2). Chains X, Y, and Z then run in parallel, and each
chain's gate needs the other chains' step 5. Task 6's owned sections (the kept pages', and bullets
outside any section) also fail tasks 2 to 5. So each audit task consumes output from a later task
or a sibling chain.

**Fold.** Add one sentence to spec "The verifier" and to task 1's outcomes. In a scoped run, the
`Source:` rule covers the bullets in the scoped pages' own facts sections. The unscoped run (task
7) covers the whole container. Add a fixture case: a scoped run passes while an out-of-scope
section still cites a deletion-list page.

### FV-2 (major): the reviewer's sample is not where the reviewer reads

**Location:** spec:101-105; plan:122-124 (Review focus 3), plan:179-181 (task 2 acceptance), and
plan:190, 201, 218, 232 ("as task 2").

**Defect.** DR-5's fold puts the sample in two places: the spec's reviewer paragraph and the
plan's "Review focus". `pass-execute-chains.js:369` tells the reviewer to read "the plan's 'Task
N' section … plus the 'Global constraints' section". It hands over nothing else except
`t.criteria`. Task 2's outcomes point at "the spec's 'The audit' section (all five steps)", and
the sample is not one of the five steps. Nothing that reaches a chain's `diff-reviewer` asks for
the sample. It covers five judgment cuts, every `[rejected]` retag, and fan-in ids. It is the only
check on a true claim that was cut or rejected, since the verifier cannot see one.

**Fold.** Move the sample into task 2's **Acceptance**, which tasks 3 to 6 inherit ("the batch's
`diff-reviewer` reads: …"). Or put it under Global constraints. The launch args' per-task
`criteria` string for tasks 3 to 6 should carry it too.

### FV-3 (major): the allowed-residue classes still leave live grep hits unclassifiable

**Location:** spec:180-187; plan:283-289 and 303-305.

**Defect.** The acceptance reads "no line is unclassified". Task 9's discovery grep
(`docs/(admin|editors|extend)/|why-cairn|docs/README`) also matches lines that point at no deleted
page, and at records that should not be rewritten. None of these fits a class:

- Arm-directory names used as concepts, which survive the deletion. Examples:
  `docs/internal/docs-register.md:39-45` (the track table), `:618`, `:643`, `:667`, and the gate
  scripts' arm prefixes.
- Kept-set paths, such as every mention of `docs/extend/migration-notes.md` in `CLAUDE.md` and the
  facts README.
- Dated evidence in the rulings ledger. `docs/internal/engine-rulings.md` carries 25 hits, for
  example `:654` (`docs/extend/restrict-admin-access.md:14` instructed importing …). That ledger
  is "the evidence that would reopen each" ruling. Retargeting or removing those hits corrupts
  it.
- Forward references in the register's briefs. `docs-register.md:751` and `:763` name
  `docs/why-cairn.md` and `docs/editors/welcome.md` as the pages a reader must reach. These are
  inputs for the stage that rebuilds them.

The implementer faces the same choice CC-5 named: it rewrites the rulings and the briefs to empty
the grep, or it fails acceptance.

**Fold.** Add three classes to spec:180-187:
- a hit that names an arm directory or a kept-set page, not a deleted page;
- non-link mentions in `docs/internal/engine-rulings.md` and `docs/internal/consultations/**`,
  kept as dated evidence (their Markdown links are still repaired);
- a register or brief line naming a page a stage will rebuild, left in place and entered in
  `relink.json` against that stage.

### FV-4 (major, hidden owner fork): the register names a deleted page as a ratified front-door exemplar

**Location:** `docs/internal/docs-register.md:216-217` ("The post-sweep `docs/README.md` is the
third exemplar") and `:226-227`; `:220` ("A drafter reads each exemplar whole"). Parent spec:37
(R6, "The existing exemplar corpus stays") and :113-114 (the draft step uses "the register's
exemplars only"). Harvest spec:27-32 deletes `docs/README.md`.

**Defect.** The deletion removes an exemplar that Geoff ratified, which the front-door stage
drafts against. The register quotes the why-cairn opener inline, so that one survives. It only
names `docs/README.md`. No review found this, and the fold does not mention it. Task 9 would meet
the line as an unclassified hit and would "retarget or remove" it. That settles a taste question
(does the front door keep this exemplar?) as a side effect of link repair.

**Fold.** Add R2 to "Rulings for Geoff". (a) Before task 9 deletes the page, capture
`docs/README.md` verbatim into `docs/internal/exemplars/`, where the Google captures already
live, and repoint the register there. (b) Drop it from the register's exemplar list. Recommend
(a). It keeps R6, and the register's inline why-cairn quote is the precedent for an old-page
exemplar the drafters are allowed to read.

### FV-5 (major): the pin ceiling lands in a record no cairn-pub pass is routed to

**Location:** spec:204-206 ("the record a cairn-pub pass reads"); plan:318-319; fold record row
DR-8, CO-5 ("No cross-repo edit or new mechanism").

**Defect.** The claim that a cairn-pub pass reads the handoff is stated, never shown. A probe of
`~/Projects/cairn-pub` (all `*.md`, `node_modules` excluded) finds no reference to
`2026-09-22-cairn-pub-docs-handoff.md`. cairn-pub's own `docs/STATUS.md:84-85` instead says:
"The pin is exact … **Return it to `^0.94.0` when the stable lands.**" The handoff itself says
"Nothing here is a cairn-cms task" and addresses "whoever conducts the next cairn-pub pass". No
pointer routes that conductor to it. CO-5's exposure therefore stays open: a later repin past the
last pre-deletion release relaunches cairn.pub with the reference arm only. This breaks "a rule
lives where it executes".

**Fold.** Task 10 also adds one line to cairn-pub's `docs/STATUS.md`: a pointer to the handoff,
plus the pin ceiling. That is a one-line cross-repo commit. Or it lands the line in pass C's
cairn-pub repoint, if pass C has not closed yet. Correct spec:206 either way.

### FV-6 (minor): a `[rejected: describes a deleted page]` bullet has no legal `Source:`

**Location:** spec:93-95 (step 5), spec:127.

**Defect.** `check-facts.mjs:728-729` fails a bullet with no `Source:`. The new verifier rule fails
a `Source:` that names the page. The spec never says what a bullet about the page's own wording
cites instead.

**Fold.** Such a bullet cites its ledger (`docs/internal/record/harvest/<arm>/<page>.json`). The
facts README already permits a pointer into that directory (README:172).

### FV-7 (minor): "names a deletion-list page" is undefined, so the rule catches some cases and misses others

**Location:** spec:91-95 and 127.

**Defect.** Today's container cites pages in forms a path match misses:
- bare basenames, such as `f:rbm80t` (`editors.md:11`, `[verified]`, "exact string in
  when-something-goes-wrong.md");
- "page text" or "page's own" inside a deletion-list page's section, such as `extend.md:57`
  (`[verified]`, "Source: page's root-layout example").

Such a bullet keeps a citable tag whose only evidence is gone. In the other direction,
`f:p3vmug` (`reference.md:60-70`) names `docs/extend/build-a-site-by-hand.md` only inside its
`[candidate: …]` qualifier. It sits in a reference section that no task owns. If the verifier
reads the `Source:` field through to the end of the bullet, task 7 fails with no recovery path.

**Fold.** Define the match: a repo path, an arm-relative path, or a bare basename of a
deletion-list page, read in the `Source:` field up to the tag. "Page text" or "page's own" in a
deletion-list page's section counts as naming that page. Tag qualifiers are out of scope.

### FV-8 (minor): the spec orders gate narrowing after the verifier; the plan runs it before

**Location:** spec:138-140 ("After the verifier passes, the deletion runs in two steps", with
narrowing as the first); plan:40-43 and 71-72 (task 8 runs beside the chains, before task 7).

**Defect.** The plan's header says "Where this plan and the spec disagree, stop and report". An
Opus task 8 implementer that reads the spec in full, as the plan tells it to, has grounds to halt.

**Fold.** Spec:138: "Gate narrowing runs beside the audit, while the pages exist; the pages are
deleted only after the verifier passes."

### FV-9 (minor): the front door has no arm state

**Location:** spec:145-154; plan:262-263.

**Defect.** The three states are defined per arm directory. The front-door files still need a
state: `check-visuals.mjs` reads `docs/README.md` (it throws ENOENT, per MF-6), and
`check-package-files.mjs` carries a front-door list. Without one, the narrowing of those two gates
has no defined trigger.

**Fold.** The shared function also reports the front door (`docs/README.md`, `docs/why-cairn.md`)
as absent or rebuilt.

### FV-10 (minor): the hold's STATUS write is on the wrong branch to trigger the resume

**Location:** plan:67 ("after task 1 (STATUS written, then the hold)"); plan:29-31.

**Defect.** The resume trigger is "theme lineage merged", and it has to be visible where the next
session starts. That is `main`'s STATUS. The spec and plan exist only on this branch. `main`'s
STATUS:47-60 still says to brainstorm this pass. Pass C's close rewrites `main`'s STATUS. A
STATUS write on this branch also conflicts at the post-hold merge of `main`, and the merge agent's
rule stops on any non-facts conflict.

**Fold.** The task 1 checkpoint writes `main`'s STATUS. The write names this branch, the plan
path, and the trigger (B and C merged). The branch's STATUS stays untouched until task 10.

### FV-11 (minor, Q4): the fold reversed an approved flagged call without listing it for Geoff

**Location:** spec:20 (H5); fold record row DR-2, CO-2, MF-3; plan:75-84.

**Defect.** Three reviewers marked the sequencing an owner fork. The fold ruled it and kept it out
of "Rulings for Geoff". On the merits it is settled: STATUS:55 records "Pass C's `0.98.0` cut is
first" as settled, option (b) needs a new reconciliation mechanism, and the hold costs clock time
only. Even so, it reverses a call Geoff approved, and H5's table cell is the only place it shows.

**Fold.** Add one confirm line under "Rulings for Geoff", with no new analysis: "H5's third call
is reversed (hold for the theme lineage), per the evidence in spec 'Timing'; confirm."

### FV-12 (minor): task 9 has to reconstruct task 8's `relink.json` entries

**Location:** plan:299-300.

**Defect.** Task 9 records "narrowed assertion (from task 8)" entries. Task 8's Opus implementer
knows each narrowing and its re-arming stage, while task 9's Sonnet implementer has only the diff.

**Fold.** Task 8 writes its own narrowing entries to `relink.json`. Task 9 appends the link
repairs.

## Q4. The rulings section

R1 (the token ceiling) is a genuine budget fork, and the evidence supports ruling on it. The
derivation adds up: 0.5 + 3.4 to 5.1 + 0.3 + 1.0 + 1.3 + 1.0 + 0.3 = 7.8 to 9.5M. The audit rate
reproduces: 7770 lines (probed) at 0.38 to 0.57k per line, plus 15 percent. And 9.5M sits under
80 percent of 12M. Under "No", the stop fires only in the upper half of the range: the spend
through S3 is about 5.1 to 6.8M against a 5.6M stop. That is close enough to the stated
consequence. Nothing listed there is actually settled. Two items that belong there are missing:
FV-4 (a genuine taste fork) and FV-11 (a confirm).

## Q3. Mechanisms checked empirically

- Held: 49 pages and 7770 lines. `shipped-anchors.json` states "Append-only".
  `tool.yml:20,34` holds the two path filters. `migration-notes.md:263` is a code-span path.
  `substitute.mjs` has its two tests. cairn-pub pins `0.94.0-rc.1`, and
  `https://cairn.pub/docs/admin/is-it-working` returns 404.
- Held: the scripts `test:node-projects`, `test:emit`, and create-cairn-site `prepack` exist.
  `check:provenance` and `check:facts` run with no local `node_modules` (probed: exit 0).
  `classifier`, `gateLane`, and per-task `gate` are real runner arguments. Go tests read no
  deletion-list page.
- The light lane for `check:close` holds but is tight. `svelte-check` alone peaks at 1.68 GB RSS
  (measured), against the light lane's 2G high and 3G max (`cairn-run-gate:60`). No finding: an
  OOM fails loudly and re-runs.
- Unproven: "the record a cairn-pub pass reads" (FV-5).

## Plan-as-code and over-ceremony

No implementation code. The discovery grep and the pre-merge `git diff` are discovery inputs,
which is acceptable. No over-ceremony worth cutting: the 16 verifier fixtures are cheap, and each
maps to a named failure.
