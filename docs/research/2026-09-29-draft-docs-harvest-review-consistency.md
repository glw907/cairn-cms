# Draft docs harvest: consistency review

**Lens:** consistency against ratified documents, citation spot-checks, and plan-to-spec coverage.
**Targets:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` (spec) and
`docs/superpowers/plans/2026-09-29-draft-docs-harvest.md` (plan), at `7e57601d`.
**Read against:** the parent spec (`2026-09-26-draft-docs-approach-design.md`), repo `CLAUDE.md`,
`docs/internal/facts/README.md`, `docs/internal/briefs/README.md`, `docs/STATUS.md`, `pass-core`,
`cairn-pass`, `site-pass`, `pass-execute-chains.js`, global `CLAUDE.md` "Conducting a pass", and
theme pass B (`theme-identity-b`) and pass C's plan (`theme-c-plan`).

Counts: 0 blocker, 5 major, 10 minor, 2 over-ceremony notes. Two owner forks (CO-2, CO-15).

## Verified correct (no finding)

- 49 pages: admin 9, editors 8, extend 33 minus 3 kept = 30, plus the two front-door files.
- Extend halves: 2834 and 2744 lines (plan says about 2830 and 2740).
- The three pages with no facts section today are `admin/README.md`, `editors/README.md`, and
  `extend/animate-a-custom-screen.md`.
- No old page carries a figure. `choose-an-ai-posture.md` has a brief
  (`docs/internal/briefs/extend/choose-an-ai-posture.json`).
- `scripts/checks/shipped-anchors.json`, `check-readiness.mjs`'s anchor assertion,
  `tool/internal/health/fixes_test.go`'s heading scan, and `tool/internal/spine/conditions.json`
  all exist as described. `check:close` includes `check:facts`, the docs-gate checks, and
  `check:package`.
- `pass-execute-chains.js`'s `docs` class uses an Opus reviewer and the bar "factual error against
  the code", which fits the audit tasks. H2 matches the parent's Budget and CLAUDE.md. H3 matches
  the parent's R5 order.

## Major

### CO-1 (major): `check:facts` goes red at the deletion, and no task owns the fix

**Location:** spec:92 ("`npm run check:facts` stays green throughout"); plan:63 (green after every
task); plan:228-231 (task 8 acceptance).

Twelve `[verified]` fact bullets carry a backticked `path:line` pointer into a page on the
deletion list in their `Source:`: `admin.md:35,44,72,93`; `editors.md:68,69,88,96`;
`extend.md:13,67,143,216`. `check-facts.mjs` resolves every such pointer (`validatePointer`,
line 694: `unresolved path`). Once task 8 deletes the pages, those twelve bullets fail. Audit step 4
(spec:68-71) touches only `[candidate]` and `[docs-drift]` bullets. The verifier (spec:81-88)
checks tags, not sources. Task 8's scope is inbound links, not fact sources. The facts container
also states the rule the other way round: "A bullet whose source names code AND a page keeps
`[verified]`" (facts README:88-89). That rule holds only while the page exists.

**Fold:** add a fifth audit step (spec "The audit", plan tasks 2 to 6). Every bullet in the arm's
file whose `Source:` names a page on the deletion list drops the page pointer when a code source
stands beside it. Otherwise the bullet is retraced or retagged. Add a verifier rule: no fact bullet
anywhere in the container has a backticked pointer into a deletion-list page. Unbackticked page
mentions are not checked by `check:facts` and can stay as history.

### CO-2 (major, OWNER FORK): "no ordering constraint" rests on a false premise

**Location:** spec:17 (H5, "no ordering constraint against theme pass C"); spec:141-144
("file-disjoint from theme pass C except for facts-file appends").

Pass B (PR #95, unmerged, pass C's base) edits `docs/extend/architecture.md`,
`build-a-site-by-hand.md`, and `share-a-draft-preview.md` (`git diff main...theme-identity-b`).
Pass C's task 13 edits `docs/extend/design-your-site.md`, the owner brief
`docs/internal/what-cairn-is-and-is-not.md` (the key-phrase source for owner-tier facts), and
re-emits `templates/waymark/**`. Task 8 also edits `templates/waymark/**`. All four pages are on
the deletion list. STATUS:55 still records "Pass C's `0.98.0` cut is first" as settled. Geoff
approved H5 as a flagged call on the disjointness premise, and that premise does not hold.

What breaks under each order:

- **Harvest merges first:** B and C hit modify/delete conflicts on four deleted pages. Their page
  edits are lost unless the resolver files facts for them. `0.98.0` then ships reference-only docs
  (see CO-5).
- **B and C merge first:** task 7's `blob` check catches the edited pages, and the re-audit covers
  them. This is the path the plan's review focus 1 already designs for.

**Options:**

- (a) B and C land first. Task 7 waits for them on `main`, and `0.98.0` carries the old arms one
  last time.
- (b) Keep "no constraint". Add a merge rule to pass C's plan: resolve a modify/delete conflict on a
  deletion-list page as delete, and file each changed claim as a fact.

**Recommendation:** (a). It matches STATUS's settled order, costs no new mechanism, and removes
CO-5's live-link risk. Either way, correct spec:141 to name B and C's actual overlap.

### CO-3 (major): the kept pages link into deleted pages, and the plan forbids editing them

**Location:** plan:56 ("The three kept extend pages are never audited, edited, or deleted by this
pass"); spec:24-28 (Scope); spec:96-109 (the deletion).

- `docs/extend/choose-an-ai-posture.md:8` links `./wire-the-delivery-surface.md#feed-sitemap-and-robotstxt`.
- `docs/extend/upgrade-cairn.md:7` links `./README.md#operate-across-versions`.
- `upgrade-cairn.md:70` links `./debug-your-site.md`.
- `migration-notes.md:263` names `docs/extend/security-model.md#recovering-whitelist-semantics`.

After the deletion, `docs-links` fails on the relative links, so task 8 must edit these pages, which
plan:56 forbids. The plan says "stop and report" on a disagreement, so the conflict costs a full
round. `choose-an-ai-posture.md` is also a briefed page. `check:provenance` requires the page's
prose to equal its brief's `sentences` exactly (`check-provenance.mjs:20-22`), so a link edit must
change the brief's sentence in the same commit. That is the parent's "Edits after the chain" rule,
with the link-substitution review exemption.

**Fold:** change plan:56 to say the three kept pages are never audited or deleted, and that task 8
repairs their inbound links. Add that the `choose-an-ai-posture.md` edit updates its brief's
matching sentence in the same change. Also add the kept pages to the spec's list of places whose
references are repaired (spec:99-101).

### CO-4 (major): task 8's post-condition cannot pass, and the grep count is about four times low

**Location:** plan:204 ("about 45 live files outside `docs/`"); plan:229-230 (the post-condition
allows only `relink.json`, `CHANGELOG.md`, the ledgers, and Go constants naming `cairn.pub`
anchors); plan:66-67 (shipped URLs never changed).

At `7e57601d`, the plan's own discovery grep returns 207 files: 182 outside `docs/` and 25 inside.
Of the 182, 102 are under `tool/`. Most of those are goldens and design records that print
`https://cairn.pub/docs/admin/is-it-working#...`:

- `tool/internal/render/testdata/golden/**`: about 56 files.
- `tool/docs/design/render-reference/`: 32 files.
- `tool/internal/doctor/testdata/golden/`: 3 files.
- `tool/testdata/copy.golden.md:362`.

The post-condition's residue list has other gaps. The grep's own exclusions (`CHANGELOG.md`,
`docs/internal/record`) already hide `relink.json` and the ledgers, so that part of the list can
never match. Other hits have to stay:

- `docs/reference/cli-cairn-doctor.md:97` and `cli-cairn-json-output.md:249,438`: shipped URLs
  documented by the reference arm.
- The facts files' `## docs/admin/...` section headings. Plan:60 tells auditors to file into these
  sections.
- `docs/internal/history/*` and STATUS.
- The per-version record `migration-notes.md`.

An implementer who meets the post-condition as written either edits shipped-contract goldens,
which violates plan:66, or rewrites history records. One who doesn't fails acceptance. The
undercount also weakens the deletion's 1M estimate (spec:148; plan:40).

**Fold:** limit the post-condition to repo-relative references: links and paths not prefixed by
`https://cairn.pub/`. State the allowed residue explicitly:

- every `cairn.pub/docs/...` URL and its goldens, testdata, and design records;
- `docs/internal/history/**` and `docs/HISTORY.md`;
- the facts files' page-path section headings, `## Harvest record`, and `## Provenance`;
- historical entries in `migration-notes.md`;
- STATUS.

Correct the count at plan:204, and re-derive the deletion's share at the task 2 rate checkpoint.

### CO-5 (major): the cairn.pub pin claim is wrong, and the no-break argument depends on it

**Location:** spec:117-118 ("cairn.pub stays pinned to `0.97.0`'s docs until the rebuilt arms ship,
so no shipped link breaks"); spec:124-127 (no `Consumers must:` because "cairn.pub's pin shields
readers"). The parent amendment makes the same claim (parent:116-117).

cairn.pub pins `@glw907/cairn-cms` at `0.94.0-rc.1` (`~/Projects/cairn-pub/package.json:15`). STATUS
records the same: "cairn.pub pins `0.94.0-rc.1`, un-pinnable since `0.95.0`" (STATUS:11). Two things
currently pull the pin forward:

- The cairn-pub docs handoff says "Fix the pin first" (`docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md:8-12`).
- STATUS:23 says pass C carries "the dotfiles and cairn-pub repoints".

If cairn.pub moves to a release cut after the deletion, such as a reference-only `0.98.0` under
CO-2's harvest-first order, every `Docs:` link a released `cairn doctor` binary prints returns a
404. Those links are `https://cairn.pub/docs/admin/is-it-working#...`, and a fragment link cannot
be redirected (parent:257-258). The rule "cairn.pub takes no docs past `0.97.0`" lives only in
cairn-cms specs. A cairn-pub pass never reads it. That breaks "a rule lives where it executes."

**Fold:** change spec:117 to say that cairn.pub pins `0.94.0-rc.1` today and must not move past the
last release that carries the old arms until the rebuilt arms ship. Land that ceiling where it runs:
cairn-pub's STATUS or its pin-fix task, and pass C's cairn-pub repoint. CO-2 option (a) makes that
ceiling `0.98.0` rather than `0.97.0`.

## Minor

### CO-6 (minor): the parent's `Consumers must:` rule is not engaged

**Location:** spec:124-127; parent:202-204 ("a `Consumers must:` line when a shipped skill,
`claude/` file, or scaffold template pointed at one").

The scaffold template ships `templates/waymark/.claude/skills/cairn-extend/SKILL.md:29-30` into
every new site. Its recipe column names
`node_modules/@glw907/cairn-cms/docs/extend/add-a-custom-admin-screen.md` and
`add-a-second-audience.md`. Both files leave the tarball. None of the four production sites or
cairn-pub carries a copy today, so the practical exposure is only sites scaffolded from a published
`create-cairn-site`. The spec's reason ("no consumer imports a doc path") does not address the
parent's trigger.

**Fold:** add one `Consumers must:` line for a scaffolded site's copied `cairn-extend` skill
(re-copy it from the package). If the owner prefers none, record the departure from parent:202-204
in the parent's Superseded paragraph.

### CO-7 (minor): the parent spec owes an erratum beyond the pointer that already exists

**Location:** spec:113-115 ("replaces the parent spec's per-stage contract table"); spec:131-137
(outline in `docs/internal/outlines/<arm>.json`); spec:159 (acceptance: the amendment "points here",
already true at `6dcb9038`).

The new spec changes parent text that a stage 2a planner reads as canonical. The parent's
Superseded paragraph (parent:123-125) does not list any of these changes:

- **Flow step 1 (parent:307-317).** The outline is "in the stage's plan". Its contract table is a
  repo-wide grep "against today's pages". The R10 fold "applies the diff to the plan". Now the
  outline is a separate JSON file. The R10 page shows rendered markdown cards, so no repo markdown
  exists to diff against, and the fold becomes a card-to-JSON translation that stage 0's round-trip
  proof did not cover.
- **Stages (parent:190-192).** "Each later stage's plan … carries that stage's outline, so plan
  approval is outline approval (R3)." The approval still holds only if the plan cites the JSON
  outline by path and commit.
- **Flow step 7 (parent:342-343).** Each stage keeps its arm README's links and `docs/README.md`'s
  links current. Those files are deleted now.
- **Stage 0 "Shipped anchors" (parent:256-257) and Stages (parent:202-204).** `check:readiness`
  fails when a listed anchor stops resolving in `is-it-working.md`, and every stage merge's
  changelog entry lists removed paths. The first is narrowed and the second is departed from
  (CO-6).

**Fold:** in task 9, or the task 8 docs edit, extend the parent's Superseded paragraph with these
four items. The acceptance line at spec:159 should require that edit, not the pointer that already
exists.

### CO-8 (minor): the freeze-language sweep covers two of the places that carry it

**Location:** plan:220-222 (task 8 edits only `CLAUDE.md` and the facts README).

Parent stage 0 (parent:208-216) lists every place that carries the freeze. The amendment supersedes
the freeze (parent:123-125), and these places still state it:

- `docs/internal/docs-register.md:498-500`: the still-frozen sweep line.
- `~/.claude/skills/cairn-pass/SKILL.md:82-86`: "Narrative arms are frozen…; a discovered
  deficiency … is fixed on the page". Every pass closes through this skill. After the deletion, it
  tells a pass to fix a page that no longer exists.
- `~/.claude/skills/site-pass/SKILL.md:33-43`: follow the admin and extend pages exactly as written.

H2's "the extend outline decides their final home" also leaves a trigger with no owner. The paths
`docs/extend/migration-notes.md` and `upgrade-cairn.md` are hardcoded in `cairn-pass:88`,
`CLAUDE.md`, and the facts README. A later move owes edits to all three.

**Fold:** widen task 8's outcome to the parent's full list. The two user-scope skills sit outside
the worktree, so name them as a task 9 step. Add a one-line watch to the stage 2a plan for the
record paths.

### CO-9 (minor): the candidate and drift scope differs between the spec and the plan

**Location:** spec:68-71 ("Resolves every `[candidate]` and `[docs-drift]` bullet in its arm's facts
file"); plan:148-151 (task 4 skips the `README.md` and `CLAUDE.md` sections); plan:165-167 and
180-181 (tasks 5 and 6).

The plan's reading is the sensible one: pages that are not deleted keep their open bullets. But it
contradicts the spec's wording. No task owns the sections of the kept extend pages
(`migration-notes.md`, `upgrade-cairn.md`, `choose-an-ai-posture.md`). The front-door owner-brief
section is also unassigned.

**Fold:** change spec:68 to "every `[candidate]` and `[docs-drift]` bullet in the sections of pages
on the deletion list". State that the kept pages' sections are out of scope.

### CO-10 (minor): "four independent batches" lists five

**Location:** spec:61-62. The list names admin, editors, two extend halves, and the front door,
which is five batches. The plan runs them as task 2, then three chains in which chain X serializes
editors and the front door. **Fold:** say "five batches, run as one rate-checkpoint batch and three
parallel chains".

### CO-11 (minor): the reviewer's spot-trace target differs

**Location:** spec:73-74 ("spot-traces a sample of new facts to source"); plan:76-78 (at least five
`fact` dispositions against the claim and the bullet).

Each check catches a different defect. The spec's check catches a new fact the auditor filed
without tracing it. The plan's check catches a near-miss mapping to an existing bullet. **Fold:**
the criteria for tasks 2 to 6 carry both, five of each.

### CO-12 (minor): task 7's conflict resolution is conductor work the global rule forbids

**Location:** plan:185-187 ("Conductor-led … A conflict in a facts file is resolved by keeping both
sides' bullets"). The global rule says the conductor "never reads a source file, a diff…; one
caught … grinding edits inline flags itself and dispatches". Resolving hunks is diff reading.
**Fold:** the conductor runs the merges. If any merge conflicts, it dispatches a Sonnet
implementer with the keep-both rule.

### CO-13 (minor): the close omits a class-union reviewer and does not record a waiver

**Location:** plan:233-240; `pass-core` close step 3 ("a mixed pass runs the union"; `tool` takes a
`go-architecture-reader` per touched package; `docs` takes the register chain).

Task 8 touches `tool/internal/health` and possibly `tool/internal/doctor`, but task 9 names no
`go-architecture-reader`. The plan waives the `docs` register chain without recording why.
`pass-core` says to "record the reason whenever the work departs". **Fold:** task 9 names one
`go-architecture-reader` per touched Go package. It records the register-chain waiver: the pass
drafts no published prose, and its link repairs follow the brief as agent-facing fixes.

### CO-14 (minor): task 8's light-lane wording can apply to `npm test`

**Location:** plan:197-199 ("… `npm run check:package`, and `make -C tool check` on the light lane,
each through `cairn-run-gate`"). `cairn-pass`:39-42 says: "The engine's root `npm test` drives
Chromium and is never light." **Fold:** attach `CAIRN_GATE_LANE=light` to `make -C tool check`
only.

### CO-15 (minor, OWNER FORK): the ceiling sits inside the plan's own range

**Location:** spec:148-150; plan:40 (ceiling 7M, flag at 5.5M; planned 5 to 6.5M).

The upper projection is 93 percent of the ceiling. The global 80 percent stop (5.6M) would fire on
a run that stays within plan. That costs an owner question. The parent sets the rule explicitly:
"The planned total must sit at or below 80 percent of the ceiling, … so the global 80 percent stop
fires only on an overrun" (parent:179-180). CO-4's undercount pushes the deletion's share up.

**Options:**

- (a) Raise the ceiling to about 8.2M, which puts 6.5M at 80 percent.
- (b) Keep 7M and plan to the low end, accepting that the stop may fire.
- (c) Decide at the task 2 rate checkpoint, which the plan already has.

**Recommendation:** (c), with the checkpoint question framed as (a) against (b). It measures before
asking, and it asks once.

## Over-ceremony (optional; low cost)

- **OC-1.** The verifier's unit test lives in `src/tests/unit/` and runs in `npm test` forever. The
  spec says the script "never becomes a standing gate" (spec:90-92). The cost is small (one Node
  test file), but it keeps a test of a script whose subject is gone. Optional: tag it for removal
  at the stage 5 close, or keep it as the record the spec intends.
- **OC-2.** The basename grep (plan:203) over 49 names includes `README.md`, `architecture.md`,
  `content-model.md`, and `security-model.md`. These also match surviving files, so the output is
  noisy and costs an Opus implementer context. Optional: grep for link forms (`](<name>`,
  `<name>#`, `/<name>`) rather than bare basenames.
