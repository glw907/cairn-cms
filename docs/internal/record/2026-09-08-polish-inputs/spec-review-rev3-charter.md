# Polish spec review, charter and precedent lens

Adversarial review of `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 3, the
uncommitted working-tree version, read in full against the rulings ledger, the charter, the
audit-remediation initiative design, the docs standard spec and its pass 2a plan, and the three
repo ledgers (Opus, `engine-triage`, fresh context, 2026-09-08). Revision 1's charter review
(`spec-review-charter-polish-passes.md`) was read first, and each of its twenty corrections is
graded held or not held in the last section. Revision 3 is materially better than revision 1 on the
ledger axis: seventeen of twenty corrections survived in substance, the `OfficeList` supersession
now has the shape the ledger requires, and the `cairnAccess` seam reads from the site's declaration
rather than from a session. The findings below are almost all new, and they cluster on one seam the
dissolution opened: polish-B and polish-D held work that two other approved artifacts still assign
to them, and revision 3 deletes the passes without amending those artifacts or naming a new owner.

## Ranked findings

**1. Docs work defers to the rewrite:252-253 -- the two code items deferred to the rewrite have no
receiving unit, and the docs standard spec says so in its own text.**
The docs standard spec, `2026-09-08-docs-standard-design.md:1099-1101`, reads: *"**Polish-B folds
here except its code half.** Tasks 2, 8, and 9 and the `check:reference` change in task 5 stay in
polish-B, which merges before the harvest branches."* Revision 2's polish-B task 2 is the doctor
transcript re-record (D5, D6, D10, D27), and the `check:reference` change in task 5 is F7's `##
Types` assertion. Revision 3 disposes of task 8 (to polish-C Task 1) and task 9 (to polish-A Task
16) correctly, then sends the other two to the rewrite at :252-253, which is exactly the half the
docs spec carved out as not folding there. Neither has a home in unit 5. Worse, unit 1's mechanism
actively preserves the defect: *"A gated block is its own entry kind. Its entry carries the fence
verbatim, its language tag, its marker comment, and the fixture path its gate replays against"*
(`docs-standard-design.md:938-941`), and unit 5's acceptance criteria run `check:transcripts` as an
existing gate rather than re-recording anything. A stale transcript that passes its fixture is
harvested verbatim and re-emitted verbatim. The `check:reference` change is a gate edit; unit 3a
and 3b enumerate the new gates and neither names it, and stage one edits reference pages *in
place*, so no drafting step would produce it either. Revision 2's polish-B task 2 also carried
`check:readiness` router work, which is code by any reading. **Correction: keep both code items in
polish-A as one task (the two doctor fixtures re-recorded against the current tool, the readiness
router condition, and `check:reference`'s `## Types` assertion), since neither is prose and neither
is paid for twice by a rewrite that never re-records a fence; and amend
`docs-standard-design.md:1099-1101` plus the toolset plan's steps at
`2026-09-08-docs-toolset-pass.md:195, 200, 440` in the same conductor commit that lands the
substrate, since revision 3 makes four lines of an approved plan and one paragraph of an approved
spec false and names no amender.**

**2. Docs work defers to the rewrite:255-256 -- A29 is banked into a fact ledger that will never
exist, while polish-A already opens the file it fixes.**
The spec banks *"`admin-sweep.md`'s A29"* as fact-ledger input. A29 is
`admin-sweep.md:67`: `docs/internal/admin-design-system.md` says the command palette is *"Built in
`AdminLayout.svelte`"* and names `AdminLayout` at `:128`, `:135`, `:532`, `:543`, `:565`, `:1001`,
`:1005`, `:1184`; no such file exists, the component is `src/lib/components/CairnAdminShell.svelte`.
The fact ledgers are per published track: *"one track at a time: reference, extend, admin, editors,
and the front door"* (`docs-standard-design.md:899-900`), and "Where each piece lives" scopes
cairn's half to *"every published page"* (`:676-679`). `docs/internal/admin-design-system.md` is
none of those; it is the agent-facing internal design system, excluded from Vale's published globs
by this repo's own `.vale.ini` policy. So A29 routes to a ledger that structurally cannot receive
it, and the misnaming stays live through polish-A, whose Tasks 3, 4, 5, 7, and 8 all dispatch
implementers to that document to work on the shell. **Correction: fold A29 into polish-A Task 6,
which already opens `admin-design-system.md` to write the busy recipe. It is a one-line find and
replace over eight references, it is not published-docs investment, and leaving it deferred hands
every polish-A implementer a doc that names a nonexistent file.**

**3. Dispositions:111 -- the card-frame replacement names a chassis class that does not exist
inside `/admin`.**
The row reads: *"`.cairn-card` no-real-use | Recorded in the B1 harvest; it becomes the card recipe
the custom-screen example uses (decision 8)."* `.cairn-card` is defined at
`examples/showcase/src/chassis/composition.css:20`, inside `@layer components` of the showcase's
site chassis, and its own comment fixes its scope: *"`.cairn-card` is the same recipe for a theme's
OWN chrome or composed-page markup, where the class name is free to pick."* It is a public-site
theme primitive, mirrored into `templates/waymark`, and it is not in the shipped admin sheet. The
custom-screen example is an admin screen: `docs/extend/add-a-custom-admin-screen.md:104` imports
from `@glw907/cairn-cms/admin-toolkit` and the reproduction renders inside the admin shell, styled
by `cairn-admin.css`. The admin's equivalent is a different artifact, the floating-card recipe named
at `admin-design-system.md:1215-1216` (*"A custom card gets the same lift through the floating-card
recipe"*) over `--cairn-shadow` and `--cairn-card-border`. Decision 8:77 itself says *"inside the
design system's card recipe"*, which is right; the dispositions row conflates it with the chassis
class. Two consequences: an implementer reading the row reaches for a class that resolves to nothing
in `/admin`, and revision 1's finding 10 (the removal points the anonymous consumer at nothing) is
answered only in appearance. `.cairn-card`'s no-real-use finding also returns to being an open
chassis disposition, since decision 8 does not give it a use. **Correction: amend :111 to name
`admin-design-system.md`'s floating-card recipe as the replacement frame, and restore `.cairn-card`
to the disposition table as a chassis item with its own answer (a B2 or chassis-follow-up line, or
"recorded boundary observation, no action" as revision 1 found it).**

**4. Polish-A Task 16:207-210 -- concentrating the ledger rows and the CHANGELOG line in one
terminal task contradicts two ratified standing constraints of this initiative.**
`2026-08-27-audit-remediation-initiative-design.md:140-143` binds every slice: *"every task adds its
`CHANGELOG.md` line under `## Unreleased` with a `Consumers must:` line where consumer action is
needed; a task executing a ruling closes (or progress-notes) its ledger entry in the same task."*
Polish-A's shape says the opposite twice: :127-128, *"It appends one bullet at the end of
`CHANGELOG.md`'s Unreleased block"*, and Task 16 collects *"The busy-idiom and `formatTimestamp`
rows in `engine-rulings.md`"*, though Task 6 writes the busy rule and Task 7 converges
`ShareLinkPanel` on it, and Task 15 executes the `formatTimestamp` widening. Polish-C honors the
constraint (Tasks 2, 3, 5, 6, and 7 each carry their own row work), which makes polish-A's shape the
outlier rather than a considered exception. The cost is not bookkeeping: a row written nine tasks
after the code it records is written by an implementer who no longer holds the argument, and a
single terminal CHANGELOG bullet for sixteen tasks is where `Consumers must:` omissions are born.
**Correction: move the busy-idiom row into Task 6 and the `formatTimestamp` row into Task 15, and
state per task that its CHANGELOG line lands with it, leaving Task 16 the HISTORY entry, ROADMAP,
the friction log, and the changelog block's final read.**

**5. Decision 10:83-86 -- reaffirming "from first deploy" leaves four non-doc sources contradicting
the ruling, and no artifact owns them.**
The decision names *"the one page that drifted (`own-your-domain.md`)"*. The sweep names four more,
none of them a published page: `docs-sweep.md:13` cites
`packages/create-cairn-site/src/scaffold.mjs:248-250` (*"sending sign-in email to anyone but
yourself **also** needs Workers Paid"*), `src/cloudflare/chapter2.mjs:680`, and
`src/cloudflare/catalogue.mjs:541-551` (declining leaves the site *"still working"*), plus
`money.mjs:32-34`, and its fix line says *"keep the tool's `costPreamble` wording aligned or fix
`money.mjs:32-34` too."* Under decision 10 those strings are now the drift, not the docs. They are
CLI code in `packages/create-cairn-site`, which no rewrite stage touches (the standard's scope is
published pages) and which polish-A could reach in one non-breaking task. Second half of the same
finding: `own-your-domain.md`'s correction is routed *"from the ledger entry D1 becomes"*, but the
harvest's admissible proving sources are *"a code path with its `file:line` and the commit sha, a
config key, a wrangler or Cloudflare record, a recorded test fixture, or a line in an owner brief"*
(`docs-standard-design.md:917-919`), and *"An `unverified` entry must not enter any brief"*
(`:924`). A Workers Paid billing instruction reaffirmed by Geoff on 2026-08-19 and 2026-09-08 has no
code path and no owner brief today, so D1 lands `unverified` and the corrected sentence is dropped
rather than written. **Correction: give the four CLI strings a polish-A task (they are code, they
contradict a reaffirmed ruling, and the CLI suite already runs per task), and name D1's proving
source explicitly in :83-86 (the `owner` tier, citing the 2026-08-19 ruling as recorded in
`docs/HISTORY.md:516-518`, or a line added to the front-door author brief) so the admin stage's
ledger entry can carry a verdict tier at all.**

**6. The aim:32-33 and Polish-C Task 10:370 -- making the cut conditional weakens a ratified owner
ruling that the spec does not cite.**
`2026-08-27-audit-remediation-initiative-design.md:122-124`: *"**One cut, after the polish slice.**
Geoff's call: the whole remediation ships in a single release with one `Consumers must:` list;
`main` stays releasable throughout and the already-open window (toolkit-seams, harvest-detection)
rolls into the same cut."* That ruling is unconditional and it is the initiative's publish ruling,
not a default. Revision 3 writes *"if the window still warrants it at the end of polish-C, one
release cut"* and *"then `cairn-release` if the window warrants it"*, and nowhere quotes or overrules
the 2026-08-27 text. This is the same defect as the convention-row widenings, in the opposite
direction: a pass adjusting a ruled item on its own authority. It is also unnecessary on the facts.
`docs/STATUS.md:13-19` records eleven unpublished passes, revision 3 adds two more plus a
ten-line `Consumers must:` list, and four production sites are named as the next action, so trigger
(2) of `CLAUDE.md`'s release rule is met by construction. Revision 1's finding 19 asked for
conditionality from the global rule and did not cite the initiative's own ruling, so the correction
was folded past the more specific text. **Correction: state the cut as the default the 2026-08-27
ruling fixes, with a no-cut outcome requiring Geoff's ruling at polish-C's plan review or close, not
the pass's own reading of "warrants". Keep the `npm view` free-number verification where it is.**

**7. Decision 6:62-66 and the consumer list:313-325 -- "the whole family set, no grandfathered
exceptions" excludes a published package the sweep never read, and polish-A edits it.**
The decision's own grounds are *"no grandfathered exceptions on a surface heading for a 1.0
promise, in the one window where every rename is free"*. The enumerated set covers `@glw907/cairn-cms`
only. `@glw907/cairn-cms-dev` is a published package on npm `latest` (`docs/STATUS.md:12-13`) and it
exports `DevBackendOptions` (`packages/cairn-cms-dev/src/handle.ts:26`, *"Options for the dev-backend
handle"*), a factory parameter bag of exactly the shape line 2 renames on the engine side
(`AuthGuardOptions`, `RendererOptions`, `FieldsetOptions` to `*Config`). The exports sweep never read
the package: its stated sources are `api-surface.md`, `package.json` exports, the `src/lib` barrels,
the reference pages, `events.ts`, and the conventions block, and the string `cairn-cms-dev` does not
appear in `exports-sweep.md`. Meanwhile polish-A Task 11 adds a member to that very bag. So the one
window that promises evenness leaves an `*Options` bag standing in a sibling published package, and
adds to it first. **Correction: either add `DevBackendOptions` to line 2 (the dev package takes the
same version and the same `Consumers must:` list, per the initiative's escape-hatch text, which
already treats both packages as one release unit), or state in decision 6 that
`convention-parameter-bags`' population is the engine package only and record why, so the exception
is argued rather than an artifact of the sweep's scope.**

**8. Polish-A gate:216-223 and Polish-C gate:372-375 -- enumerated gate lists violate the standing
constraint that forbids a memory-derived list, and drop the one gate over the file both passes
rewrite.**
`2026-08-27-audit-remediation-initiative-design.md:137-139`: *"the full gate is `npm run check` 0/0
plus `npm test` exit 0 plus the CI-derived gate list re-derived from `.github/workflows/` before the
first commit, never from memory."* Revision 3 enumerates seventeen gates for polish-A. CI runs
thirty-one (`.github/workflows/test.yml:62-111`); the list omits `check:self-use`,
`check:chassis-boundary`, `check:cm-internals`, `check:idioms`, `check:invisible-craft`,
`check:admin-css-classes`, `check:readiness`, `check:rulings-format`, `check:target-stack`,
`check:arm-indexes`, `check:visuals`, `check:figures`, `check:prose`, `check:version`, and
`check:vale`. Several bite directly: `check:admin-css-classes` and `check:invisible-craft` over
Tasks 3 through 10, `check:visuals` over the render proofs, `check:figures` over the substrate the
conductor commits. The sharpest omission is `check:rulings-format`, which is neither in `npm test`
(`vitest run --project unit --project unit-dist-spawn --project integration && npm run
test:component`) nor in `npm run check` (`svelte-check`), and which is the only gate over
`engine-rulings.md`, a file polish-A writes two rows into and polish-C rewrites across seventeen
rows plus a new full-format entry. Revision 2's polish-B and polish-D both named it in their gates;
it disappeared with them. **Correction: replace both enumerations with the standing constraint's
own instruction (the CI list re-derived at plan authoring, recorded in the plan's Reconciliation
block), and name `check:rulings-format` explicitly in both passes since it sits outside `npm test`
and `npm run check`.**

**9. Polish-A Task 16:210 against Sequencing:403 -- the spec contradicts itself on who writes
STATUS.**
Task 16 lists *"STATUS present tense"* among its deliverables. Sequencing says polish-A *"owns
`CHANGELOG.md`, `docs/HISTORY.md`, `ROADMAP.md`, and the friction log outright; the conductor edits
`docs/STATUS.md` at merge, never a task."* Both cannot hold, and the resolution matters because
STATUS is the file every fresh session reads first. **Correction: strike STATUS from Task 16 and keep
the Sequencing rule, which matches how the chassis and identity-seam passes actually ran, then say
in Sequencing what the conductor writes (the slice numbering, the polish tracks, and the cairn-case
lines named in finding 13).**

**10. Polish-A Task 16:207-210 -- the folded records work makes the pass's last task eight
deliverables against a norm of roughly four, by accretion rather than by sizing.**
Task 16 now carries two ledger rows, the CHANGELOG bullet, the HISTORY entry, STATUS, the friction
log triaged whole, ROADMAP's docs items closed, and the register sweep filed to Later, before the
two unnamed items in findings 12 and 14. `~/.claude/CLAUDE.md`'s pass-sizing rule names this shape
exactly: *"accretion by adjacency (work joins a task because it sits next to it, each addition
defensible alone and none weighed against the total)"*, with the practice *"State a task's
deliverable count at dispatch and say plainly when it passes roughly four."* The spec's sizing
sentence at :212-214 counts tasks and marks the independent block, and never counts this one. It is
also the pass's terminal task, where the 7M ceiling is most spent. **Correction: split Task 16 into
a ledger-and-changelog task (dissolved once finding 4's per-task placement lands) and a
records-and-roadmap task, and state the deliverable count for each in the plan header.**

**11. Polish-C Task 5:346-348 and decisions 6, 7, 11 -- three amendments are to be written as
"quoted, dated" clauses with no stated source holding a quote.**
Task 2:336 does this right: *"`convention-parameter-bags` amended with a quoted, dated clause naming
Geoff's 2026-09-08 ruling."* Task 5 says only *"the outcome-idiom row widened to the whole surface
with a quoted, dated clause"*, naming neither speaker nor record. The ledger's precedent is
uniform: every amendment quotes a source verbatim and names the sitting
(`convention-parameter-bags`, *"in Geoff's own ruling at the 2026-08-30 conventions-pass
plan-authoring sitting"*; `convention-identifier-grammar` cites the 2026-09-01 sitting;
`f1-return-position-leak-sanction` quotes Geoff at the foundations B checkpoint). Revision 3's
decisions 6, 7, and 11 are the spec author's prose under a section header attributing them to Geoff,
2026-09-08; decision 6 is the only one carrying quoted words (*"the best long-term architecture"*).
A plan told to write a quoted clause with nothing to quote either fabricates one or writes a weaker
amendment than the rows around it. **Correction: name the record that holds Geoff's 2026-09-08
rulings verbatim (a sitting record under `docs/internal/record/`, or the polish-C plan review
transcript recorded as one), cite it in decisions 6, 7, and 11, and make Task 5 name the same source
Task 2 does.**

**12. Numbering:15-19 -- the slice numbers the spec assigns have no writer, and one of them merges
out of order.**
The spec fixes chassis-B1 and B2 as 9a and 9b and the identity seam as 10. `docs/HISTORY.md`
numbers chassis-A (*"## Chassis-A (audit remediation slice 8, structural), merged 2026-09-08"*,
`:88`) and then stops: `:10` is *"## Chassis-B1, merged 2026-09-08"* and `:54` is *"## Identity
seam, code complete and reviewed 2026-09-08"*, neither carrying a number. Without a retro-edit the
ledger reads 8, then two unnumbered entries, then 11. Task 16 writes *"the HISTORY entry"*,
singular, its own. Separately, slice 10 (identity seam, merged as PR #53) landed before slice 9b
(chassis-B2, still executing per `docs/STATUS.md:28`), so the numbering does not track merge order
and a reader will assume it does. **Correction: name the retro-numbering of the chassis-B1 and
identity-seam HISTORY headings as explicit work in Task 16, and add one clause to :15-19 saying the
numbers are initiative slots rather than merge order.**

**13. Sequencing:395-411 and STATUS:58-84 -- the substrate commit strands two STATUS blocks with no
named owner.**
`docs/STATUS.md:58-72` describes polish as one slice (*"then the final **polish** slice"*, *"ONE
release cut after polish"*, *"`content-routes-media.ts` at 1,447 lines is the one file left from the
audit's monolith list"*), all of which revision 3 changes. `:73-84` describes the cairn case as
*"Waiting for Geoff's read, all UNCOMMITTED"*, naming the proposal, the figures, `scripts/figures/`,
and the `check:figures` line, with landing path *"a docs task in polish (or a small docs-only
pass)"*. The substrate commit at :262-272 lands exactly that set and moves the page to stage five, so
those twelve lines go false the moment the conductor commits, before polish-A branches. Task 16 is
the only STATUS writer named anywhere in the spec, and it runs at the end of a later pass.
**Correction: state in "The front-door substrate: one conductor commit" that the commit also
rewrites `docs/STATUS.md:58-84` (the polish tracks, the slice numbering, and the closure of the
cairn-case track's uncommitted list), since the conductor is the actor and the commit is the
trigger.**

**14. Polish-A Task 16:209 and Polish-C Task 10:369 -- polish-A ships six ROADMAP polish-slice
sub-bullets and closes none of them.**
`ROADMAP.md:342-360`'s polish-slice bullet enumerates the `ShareLinkPanel` busy-idiom ruling, the
`OfficeList` scroll question, the `formatTimestamp` widening, the command palette's live region, the
`logCommitFailed` call-style contradiction, the engine Svelte lint wiring, and the
`createSectionAction` adoption with its dev-package seam. Polish-A executes six of the seven. Task
16 closes only *"ROADMAP's docs items"*; the audit-remediation entry closes in polish-C Task 10, one
pass later. `CLAUDE.md`'s roadmap rule is the shipping pass's: *"a pass that ships a roadmap item
marks it done and removes it from the live tiers ... a pass that removes or renames a backlog item
is not done until the roadmap stops listing it."* **Correction: amend Task 16 to close the
polish-slice sub-bullets polish-A ships, naming them, and leave polish-C Task 10 the entry's final
close.**

**15. Polish-A Task 15:204-206 -- the `formatTimestamp` supersession should correct the closed row's
record, not only widen the set.**
`audit-admin-formattimestamp` (`engine-rulings.md:2670`) is closed with this execution text:
*"`formatTimestamp` now accepts any Date-parseable timestamp, including an ISO string with an
offset, WIDENING rather than swapping the input domain."* The code refutes the first clause:
`src/lib/admin-toolkit/format.ts:87-93` accepts exactly two shapes, `SQLITE_DATETIME` and
`ISO_WITH_ZONE`, and returns every other input unchanged, deliberately, per the comment at `:67-72`.
A zone-less near-ISO string is Date-parseable and is refused by design. So the recorded execution
overstates what landed, which is why the sweep found three legal zone-naming shapes it still
rejects. The ledger's premise, *"Read it before re-arguing a settled item"* (`:4-6`), only works if a
closed row's execution text is true. The good news for the verdict: all three new forms name a zone,
so the widening is inside the closed row's own rationale rather than against it, which makes the
supersession easy to argue. **Correction: state in Task 15 that the new row corrects the closed
row's "any Date-parseable" claim as well as widening the accept set, and that the accepted domain is
"every shape that names its own zone", so the row states a rule rather than a list of three.**

**16. Decision 5:59-61 -- "the dev package gains a `cairnAccess` seam" describes new surface where
none exists, which invites the wrong charter test.**
`locals.cairnAccess` already exists and is engine-owned: declared at `src/lib/ambient.ts:48` and
`src/lib/sveltekit/types.ts:90`, attached by `createAuthGuard` at `src/lib/sveltekit/guard.ts:348`
and `:368`, read by `admin-action.ts:307` and `section-action.ts:288`. What polish-A Task 11 builds
is dev-harness parity with that existing local, which is why it is charter-clean under the boundary
(the dev package is cairn's own harness for its own auth loop, `packages/cairn-cms-dev/src/handle.ts:1-9`)
and under `read-from-the-source-rule` (*"a fact with one source is read from that source, never
copied"*, `engine-rulings.md:39-41`). Calling it a new seam asks a reviewer to run the seam-versus-
feature test on something that adds no engine surface, and understates the one thing that is new:
an additive member on the published `DevBackendOptions` bag, which the task already handles.
**Correction: reword :59-61 as "the dev handle reaches parity with the guard on the existing
`locals.cairnAccess`", keeping the sentence about reading the site's declaration.**

**17. Inputs:22 -- "the friction log (one open entry, owned by the identity seam)" is false against
the file.**
`docs/internal/docs-friction-log.md:25` reads *"None open"* under Live findings, and `:60-62` reads
*"None open. The identity-seam pass's own two findings ... are cleared already"* under Open
findings. The log has zero open entries. Task 16's *"the friction log triaged whole"* is then
either a no-op or an invitation to invent work in a file whose header rules are complete-or-move.
**Correction: correct :22 to "the friction log (no open entries as of 2026-09-08)" and reduce Task
16's clause to a verification that the log is still empty at pass end, with any entry a polish task
files triaged in the task that filed it.**

## Corrections from revision 1 verified in revision 3

1. **F12 dropped or reopened on its own terms.** HELD. :326, *"The publish-area merge (F12) is not
   taken; its keep row stands"*, repeated at :383-384.
2. **Each convention widening arrives with a named source and date.** PARTIALLY HELD. Task 2 names
   Geoff's 2026-09-08 ruling; Task 5's clause names no source, and no record holds quotable text.
   See finding 11.
3. **`RequestResult` sequenced after the widening and its keep row annotated.** HELD. :321 and Task
   5, *"`audit-sveltekit-requestresult` annotated with the new discriminant so its any-site case
   reads true"*.
4. **Every renamed subject's ruling row annotated, with a grep in the gate.** HELD. Task 9, *"seventeen
   rows the charter review enumerates"*, and *"A grep for each old name across `engine-rulings.md` is
   in the gate"*.
5. **The two closed auth-channel rows superseded explicitly with the encoding named.** HELD. :321 and
   Task 5.
6. **Widen the events grammar rather than flatten the four-segment name; argue the taxonomy fold
   against its closed row.** HELD, both halves. :323, *"the events header admits a dotted subject so
   `auth.channel.session.*` stays"*; Task 6 supersedes the row with its reason. The reason's premise
   checks out: the 4b rename sits under `## Unreleased` (`CHANGELOG.md:340`, with the `0.96.0`
   boundary at `:1542`), so the second rename genuinely rides the same unpublished window.
7. **`cairnAccess` read from the site's declaration, not the session.** HELD. Decision 5 and Task 11,
   *"takes the same `access` and roles declaration the site hands `createAuthGuard` and attaches
   `locals.cairnAccess` verbatim"*. Wording caveat at finding 16.
8. **`check:dev-package` in the gate, and the surface question answered.** HELD. Task 11 and the gate
   list at :218; *"it is additive; the changelog names it, no `Consumers must:`"*.
9. **The `OfficeList` removal overrules the both-stay sentence, names the `gap-0` consequence, and
   writes a full-format row.** HELD in all three parts (decision 8:75-79, Task 7:353-356). One
   correction to revision 1's own text: `check:rulings-format` does not require the full format; it
   is a ratchet over the truncated `(shape: ...)` parentheticals only
   (`scripts/checks/check-rulings-format.mjs:9-13`), and its allowlist now holds one slug. The format
   therefore needs to be a plan acceptance criterion, and the gate needs to be in the gate list at
   all (finding 8).
10. **Name the replacement for the card frame.** NOT HELD in substance. See finding 3.
11. **Workers Paid wording and routing past Geoff.** SUPERSEDED, correctly: Geoff reaffirmed the
    2026-08-19 ruling, so the second-editor wording is moot. The residual is finding 5.
12. **The README site count evidenced or dropped.** HELD. Decision 12 drops the sentence; execution
    moves to stage five.
13. **The third busy shape recorded as the upload recipe's own case.** HELD. Decision 7:71-72.
14. **One home for the busy rule.** HELD. Decision 7:73-74, *"The design system is the rule's one
    home; the ledger row records the verdict and points at it."*
15. **The SSR flash constrained to the markup option.** HELD. Task 8, *"the markup option; a
    server-read viewport hint is a new mechanism and is not taken"*.
16. **`listEditors`'s result stays nameable.** HELD. :322.
17. **`f1-return-position-leak-sanction` closed against the rider's row.** HELD. Task 9.
18. **`audit-sveltekit-adminactionoptions` dispositioned.** HELD. Task 4, *"the retire stays open,
    stated in the row"*.
19. **The cut made conditional and the free number verified.** HELD, and over-held against the
    initiative's own publish ruling. See finding 6.
20. **The ledger header's allowlist count corrected.** HELD. Task 9.

## Checked and found consistent

- **Decision 8's supersession shape.** A new full-format row superseding a closed row is the ledger's
  own precedent (`audit-sveltekit-authroutes`'s annotation model, `engine-rulings.md:2004-2007`), and
  it is what `ROADMAP.md:349-353` instructed ruling-first: *"an outright retire there is a new
  proposal against a closed row, not a reopen"*. Polish-C Task 1 lands the replacement example ahead
  of Task 7's removal, which is the right order.
- **Polish-C's "Nothing else joins" rule is not violated by Task 1.** The rule as written bars *"a
  non-breaking fix found during C"* (:304-305). Task 1 is scoped up front, is the removal's named
  replacement, is ordered first, and runs the component suite so a docs-gate failure surfaces before
  the renames stack on it (:441-443). The defensive sentence at :306-308 argues against a rule that
  does not bite.
- **The custom-screen example's double payment is bounded.** Sequencing puts polish-C entirely before
  the docs harvest branches (:413-416), so the extend track's stage-two harvest reads the corrected
  page and the rewritten prose is fact-ledger input rather than wasted authoring.
- **The `cairnAccess` work is inside the dev package's remit and is the leanest form.** The dev
  package's own header calls it *"the local-dev substitute for the GitHub App commit pipeline and
  the magic-link auth loop"* (`packages/cairn-cms-dev/src/handle.ts:1-3`). Standing in for the guard
  includes standing in for what the guard attaches. The site passes one declaration to both branches
  rather than the harness deriving a second copy, which satisfies `read-from-the-source-rule`, and
  the charter's "seam, not feature" test does not fire because no new engine surface appears.
- **Decisions 4 and 10 resolve against a real stage.** The rewrite's five stages are *"reference,
  extend, admin, editors, then the front door"* (`docs-standard-design.md:1086-1088`), so "the
  rewrite's admin stage" and "stage five" both name something that exists, and the docs spec already
  moved polish-D's front-door task there (`:1094-1096`).
- **The monolith splits carry no charter surface.** Internal reorganization behind a byte-identical
  `check:surface`, as revision 1 found; nothing in revision 3 changes that.
- **The numbering claims check out.** `docs/HISTORY.md:88` numbers chassis-A as slice 8 and
  `docs/STATUS.md:58-59` stops its numbered list at 7, exactly as :15-19 states, and retiring 13 and
  14 rather than reusing them is the right call for a ledger other documents already cite. The
  writer for 9a, 9b, and 10 is the gap (finding 12).
