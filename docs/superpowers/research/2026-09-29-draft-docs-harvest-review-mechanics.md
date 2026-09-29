# Draft docs harvest: mechanics and feasibility review

**Targets:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` (spec) and
`docs/superpowers/plans/2026-09-29-draft-docs-harvest.md` (plan), at `7e57601d`.
**Lens:** mechanics and feasibility. Every finding below comes from a probe. The deletion was
simulated in a scratch copy (`git archive HEAD` into `/tmp/claude-1000/sim`, the 49 pages removed,
the main checkout's `node_modules` symlinked in, and `npm run package` built). The gates were
then run against that copy. No repo file was modified.

**Counts:** 2 blockers, 5 majors, 8 minors (4 of the minors are over-ceremony). One OWNER FORK
(MF-3).

## Verified sound (no action)

- **Page count.** The page count is 9 admin, 8 editors, and 33 extend. Removing the 3 kept pages
  leaves 30 extend pages, and the two front-door pages bring the total to 49. The two extend
  halves match the 30 exactly (`diff` returned MATCH), at 2834 and 2744 lines.
- **`--mint`.** `node scripts/checks/check-facts.mjs --mint` prints `f:4sv4xu` and exits 0. The
  worktree has no `node_modules`, and `check:facts` still passes there. TypeScript is loaded
  lazily and resolves by walking up to `~/Projects/cairn-cms/node_modules/typescript`.
- **Blob stability.** `.gitattributes` sets `*.md text eol=lf`, and `git hash-object` applies that
  filter. For `docs/admin/README.md`, `git hash-object` equals `git rev-parse HEAD:<path>` equals
  the index blob (`a5466114`). A merge of `main` that changes a page therefore changes the hash.
- **`pass-execute-chains` args.** `classifier: false` (per chain or in args), `gateLane` (per
  task, per args, or per class), and per-task `gate` are all real arguments
  (`pass-execute-chains.js:30-34,262,282,418-423`). A `<placeholder>` in a gate string is matched
  by `gateMatches`. The runner never creates worktrees or merges: it only uses `chain.repo`, so
  the plan's conductor-creates and conductor-merges shape is correct. `args.gate`,
  `args.implementer`, and `args.planPath` are required even when every task carries its own gate
  (`:591`), so the launch args must name them.
- **`npm pack` and publint.** On the simulated tree, `npm pack --dry-run` tolerates the `files`
  entries for missing directories and packs `docs/reference/` plus the three kept extend pages.
  `publint --strict` reports "All good!". Leaving `docs/admin` and `docs/editors` in `files` is
  harmless and saves a re-arm edit later.
- **Vale.** The `.vale.ini` section globs for missing directories are inert, and the `vale docs`
  target still exists.

## Blockers

### MF-1 (blocker): the three kept extend pages must be edited, and the plan forbids it

**Location:** plan:56 ("never audited, edited, or deleted by this pass") against the task 8 gate.
**Evidence (simulated deletion):**
- `check-symbols`: `docs/extend/migration-notes.md:263 [file-path] docs/extend/security-model.md`
  (exit 1).
- `docs-links`: `docs/extend/upgrade-cairn.md` has 3 dead targets (`./README.md#operate-across-versions`,
  `../admin/what-to-run-and-when.md`, `./debug-your-site.md`), and
  `docs/extend/choose-an-ai-posture.md` has 2 (`./wire-the-delivery-surface.md#...`,
  `../admin/is-it-working.md#make-the-stated-ai-posture-effective`).

Task 8's gate cannot go green without touching these pages. The plan also says to stop where the
plan and spec disagree, so the implementer halts. `choose-an-ai-posture.md` is a rebuilt page with
a brief, and `check:provenance` requires the page's prose to equal the brief's sentences. A
reworded sentence therefore needs its brief updated in the same commit.
**Fold:** allow link-only edits to the three kept pages in task 8. Update
`docs/internal/briefs/extend/choose-an-ai-posture.json` in the same commit wherever sentence text
changes, and record each edit in `relink.json`. The migration-notes path mention is a code span,
so it can take the `check-symbols` allowlist treatment.

### MF-2 (blocker): `check:facts` goes red on deletion, and no audit re-sources fact bullets that cite a deleted page

**Location:** spec "The audit" (lines 61-77) and "The verifier" (81-92). Plan global constraint
line 63 ("`npm run check:facts` is green after every task").
**Evidence:** on the simulated tree, `check-facts` reports `12 defect(s)`, every one an unresolved
`path:line` pointer into a deleted page. They sit at `admin.md` 35/44/72/93, `editors.md`
68/69/88/96, and `extend.md` 13/67/143/216. Probe results:
- 36 fact bullets name a deleted page inside their `Source:` field.
- 19 name only a deleted page, with no code, vendor, or URL source. Twelve of those are
  `[external]` (for example `f:ixr3ny` and `f:gs23f`), and the verifier accepts `[external]` as
  resolved. After deletion, those facts cite nothing.
- `f:65atya`, which carries the pointer `docs/admin/is-it-working.md:338`, sits in the kept
  `choose-an-ai-posture.md` section. No audit task covers that section, and that page's brief
  cites the bullet.

The spec's audit step 4 resolves only `[candidate]` and `[docs-drift]` tags. The verifier checks
only bullets that a ledger claim resolves to.
**Fold:**
1. Add audit step 5. Every bullet in the arm file whose `Source:` names a deletion-list page is
   re-sourced (to a code path, a vendor URL, or the owner brief) or retagged, whether or not a
   claim maps to it.
2. Add a verifier rule. No bullet anywhere in the container may name a deletion-list path in its
   `Source:` field. The rule is container-wide, not limited to resolved ids.
3. Assign the kept-page sections (`choose-an-ai-posture`, `migration-notes`, `upgrade-cairn`) to
   task 6 for this re-sourcing only.
4. Add `node scripts/checks/check-provenance.mjs` to every audit gate. It is node-only and cheap.
   Three brief-cited facts (`f:wyrn4z` and `f:m4q02w` in the create-your-site section, `f:hkh101`
   in the define-an-adapter section) sit in audited sections. Retagging one of them to
   `[rejected]`, or leaving one as `[candidate]`, fails `check:provenance`, and no chain gate
   runs that check.

## Majors

### MF-3 (major, OWNER FORK): the "no ordering constraint" ruling is false against the unmerged theme lineage

**Location:** spec H5 (line 17) and "Timing" (141-144). Plan task 7 (lines 185-187).
**Evidence:** `git diff --stat main...theme-identity-c` shows 382 files changed; STATUS says pass
C branches from B, and A and B are unmerged too. Within that diff:
- 103 renames from `src/lib/components/` to `src/lib/admin/`.
- `docs/reference/components.md` renamed to `docs/reference/admin.md`.
- About 57 editors fact bullets rewritten in place (`-`/`+` pairs on the same ids, re-sourcing
  moved components). `reference.md` changes by 179 lines.
- Edits to three pages on the deletion list: `architecture.md`, `build-a-site-by-hand.md`, and
  `share-a-draft-preview.md`.

This is not "facts-file appends". Four consequences follow:
1. Task 7's rule "keep both sides' bullets" on a facts conflict produces two bullets with one id,
   which `check:facts` fails as a duplicate id.
2. New facts sourced to `src/lib/components/*` go unresolved once the lineage lands.
3. Task 8 retargets links to `docs/reference/components.md`, and those break on the rename.
4. If the harvest merges first, the lineage's own merge hits modify/delete conflicts on the three
   pages, and nobody's plan owns that resolution.

**Options:**
- (a) Run tasks 1-2 now. Hold tasks 3-8 until the A+B+C lineage merges to `main`, then merge
  `main` and branch the chains from there.
- (b) Proceed now, and add a task 7 reconciliation step. On a facts conflict, keep one bullet per
  id, taking `main`'s `Source:` path and the harvest's tag. Re-run the audits of the three
  C-edited pages, and retarget any `components.md` link after the lineage lands.
- (c) Rebase the whole pass onto `theme-identity-c`.

**Recommendation:** (a). The chains are the expensive part (about 3-4M tokens), and (a) is the
only option that audits the code the rebuilt arms will actually describe. The fix to task 7's
conflict rule is needed under every option.

### MF-4 (major): task 8's discovery grep is about 4x the plan's estimate, and its residue acceptance cannot be met

**Location:** plan:201-210 and :228-230. Spec budget line 148 ("about 1M for the deletion").
**Evidence:**
- The plan's own grep returns 204 files, against "about 45 live files outside `docs/`". Of those,
  88 live files outside `docs/` carry repo-path references (with `cairn.pub/docs/` URLs
  excluded). Examples: `docs-links.mjs` (29 hits), `ROADMAP.md` (26), the symbols allowlist (24),
  10 unit tests, 13 showcase source files, 9 engine `src/lib` comments, and 12 provenance
  fixtures. The remainder are tool goldens and design references carrying shipped `cairn.pub`
  URLs.
- The basename grep adds 37 more files the first grep misses. These include 13
  `docs/reference/*.md` pages with about 40 relative links (`../extend/x.md`), 3 integration
  tests, `tool/internal/spine/conditions.json`, `tool/internal/render/layout.go`, and the
  `shipped-anchors` fixtures.
- The acceptance residue ("only `relink.json`, `CHANGELOG.md`, the ledgers, and Go constants")
  cannot be met. `CHANGELOG.md` and `docs/internal/record` are excluded by the grep's own
  pathspecs, so they can never appear. Other matches must stay by rule: tool render and doctor
  goldens, `tool/docs/design/**`, `docs/internal/history/**`, `docs/STATUS.md` (conductor-only),
  the facts section headings (`## docs/admin/...`, 60-plus), `tool/internal/doctor/check_referrer.go`'s
  repo-path constant, and the test expectations that mirror it.

**Fold:**
- Define the residue by class: any `cairn.pub/docs/` URL, tool testdata and goldens,
  `tool/docs/design/`, `docs/internal/history/`, the facts section headings and harvest-record
  text, STATUS, and the pinned tool constants and their tests.
- Re-project task 8 at about 2x.
- Per the pass-sizing rule, cut task 8 in two. 8a covers the gates, tests, and `tool/`; 8b covers
  the prose relinks across the READMEs, the reference arm, the showcase, the templates, and the
  skill. Each half runs its own gate.

### MF-5 (major): `docs-links` scans files the plan says it will not repair

**Location:** plan:202 (the grep excludes `CHANGELOG.md` and `docs/internal/record`) against spec
line 106.
**Evidence (simulated deletion):**
- `CHANGELOG.md` has 11 dead links.
- `docs-links` reports 27 `LEGACY_PATH_MAP` problems, each sending an old path to a now-deleted
  page, for example "`docs/guides/add-an-image.md` to `docs/editors/add-an-image.md`, which no
  longer exists".
- Six `docs/internal/record/**` files and one `docs/internal/history/` archive have dead links.

The gate scans all of `docs/` minus `superpowers/` and exemplars, plus `CHANGELOG.md`
(`docs-links.mjs:18,50`). The plan names no treatment for historical files it will not edit.
**Fold:** specify the narrowing. While an arm is in its pending-rebuild state, `docs-links`
accepts a link from `CHANGELOG.md`, `docs/internal/record/`, or `docs/internal/history/` into a
deletion-list path, and it accepts a `LEGACY_PATH_MAP` entry whose target is a deletion-list
path. Key the rule to the committed deletion list, and re-arm it per stage through `relink.json`.

### MF-6 (major): the gate list misses two gates, and "scoped to the arm's absence" misses the extend arm's partial state

**Location:** spec lines 105-109. Plan:217.
**Evidence (simulated deletion):**
- `transcript-blocks.mjs` (`check:transcripts`, which runs in `check:close` and the docs gate)
  fails with `[page-below-floor] docs/admin/create-your-site.md ... floor 3`, the same for
  `is-it-working.md`, and three `[fixture-uncited]` create-cairn-site fixtures.
- `check-visuals.mjs` throws ENOENT on `docs/README.md`.

Neither gate is on the spec's list. `check-arm-indexes.mjs:98-102` throws when an arm directory
is missing. Git keeps no empty directories, so `docs/admin/` and `docs/editors/` vanish outright.
`docs/extend/` meanwhile keeps 3 pages with no `README.md`: it is neither empty nor indexed, so an
absence scope never fires for it. `check-package-files` also requires `docs/extend/README.md`
(`:74`).
**Fold:**
- Add `check:transcripts` and `check:visuals` to the spec's gate list.
- Define three arm states for every narrowed gate: arm directory absent, arm has pages but no
  index (extend until stage 2b), and arm fully indexed.
- Pin each state both ways in tests.

### MF-7 (major): task 8's gate skips the create-cairn-site suite, and one of its edits is a four-place exact-match coupling

**Location:** plan:197-199.
**Evidence:** `packages/create-cairn-site/src/substitute.mjs:62-68,79-82` holds the
`AI_POSTURE_COMMENT_BLOCK` constant. The substituter exact-matches that block against the
template's `src/theme/cairn.config.ts`, which is emitted from the showcase. The block contains
`docs/extend/wire-the-delivery-surface.md`, and `scaffold.test.mjs:108` and
`substitute.test.mjs:30` restate it. Retargeting only the showcase comment makes the substitution
silently miss, or throw. CI runs `npm --prefix packages/create-cairn-site test` after baking the
template (`test.yml:59-64`), and `npm run test:emit` (`:52`). The task 8 gate runs neither.
**Fold:**
- Add `npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test`
  and `npm run test:emit` to task 8's gate. Both are light lane.
- Name the four-place edit in the task notes: the showcase config, `emit:template`,
  `substitute.mjs`, and the two tests.

## Minors

### MF-8 (minor): the rate checkpoint cannot get tokens from the implementer, and per page is the wrong unit

**Location:** plan:40-47 and :127-128.
A subagent has no access to its own token count, so task 2's "the report gives ... the tokens the
dispatch used" would be invented. The conductor reads usage from the Agent tool's completion
result, and it must add the `diff-reviewer`'s usage. `pass-execute-chains` returns only a total,
`spent: budget.spent()` (`:608`). Its per-task records carry no token field (IMPL_SCHEMA,
`:46-79`). Per-task rows for tasks 3-6 therefore cannot be filled.

Admin averages 139 lines per page (1250 lines over 9 pages), while extend averages about 188 (5578
over 30). A per-page rate underprojects extend by about 35%.
**Fold:** the conductor takes tokens from the Agent usage block and re-projects per line. Tasks
3-6 go in the ledger as one row, using the workflow's `spent`.

### MF-9 (minor): the auditor's agent definition says to fix a wrong page, while the harvest says to reject the claim

**Location:** plan global constraints, against `~/.claude/agents/cairn-implementer.md` lines
111-115: "a deficiency you discover ... gets fixed on the page in the same task". An auditor
following its definition edits an old page mid-audit. That spends work on a page about to be
deleted, and it lands edits on files other chains may merge.
**Fold:** add one global constraint. No task edits a page on the deletion list before task 8. A
false claim is recorded as a `[rejected]` fact.

### MF-10 (minor, over-ceremony plus one gap): the installs are backwards

**Location:** plan:31.
The chains' gate (`check:facts` plus the verifier) runs without a local `node_modules`, as
probed. The per-chain `npm ci` is dead cost: minutes and gigabytes, three times.

This worktree has no `node_modules` at all. Here `@glw907/cairn-cms` resolves through the main
checkout's `node_modules/@glw907/cairn-cms`, which `readlink` shows points at
`/var/home/glw907/Projects/cairn-cms` itself. Task 8's `unit-dist-spawn`, `check:self-use`, and
showcase checks would then prove main's build: the durable gotcha, one level up.
**Fold:** drop `npm ci` from the chains. Run `npm ci` (root and `examples/showcase`) in this
worktree before task 1.

### MF-11 (minor, over-ceremony): task 8's gate over-runs

**Location:** plan:197-199.
`npm test` includes `test:component`, about 1,600 browser tests on the heavy lane (7 to 11
minutes per run, per `pass-gate-economy.md`). Task 8 changes no component behavior: two `.svelte`
files get comment edits, which `svelte-check` and lint cover, and no component test reads a
deleted page (grep: only `chrome-guard.test.ts` names `docs/admin-route-structure.md`, which
survives). `check:package` also runs twice, once on its own and once inside `check:close`. The
fix round repeats both costs.
**Fold:** the gate becomes `npm run test:node-projects && npm run check:close`, plus the MF-7
suites and `make -C tool check`, all on the light lane (`check:close` launches no browser). CI
runs the component suite.

### MF-12 (minor): task 7 puts the conductor in the diff, and `main` can move again after it

**Location:** plan:185-193.
Hand-resolving facts-file conflicts is diff reading and editing, which the thin-conductor rule
forbids. `main` can also change an old page between task 7 and the final merge. The verifier
cannot re-run after task 8 because its subject is gone.
**Fold:** dispatch the merge to an implementer, under the MF-3 conflict rule. At task 9, before
the merge, require `git diff <task-7 main sha>..origin/main -- <49 paths>` to be empty, and
re-audit any page that fails.

### MF-13 (minor): standing gates import from a one-shot script, and the verifier test must survive the deletion

**Location:** plan:102-103.
Task 8's gates reading the deletion list from `scripts/oneshot/verify-harvest.mjs` couples
standing gates to a script the spec calls one-shot. `npm test` runs after task 8, so the
verifier's unit test must use fixtures only and never assert against the real tree.
**Fold:** commit the list as `docs/internal/record/harvest/deletion-list.json`, which both the
verifier and the gates read, and state that the verifier test is fixture-only.

### MF-14 (minor): task 2's slug sources are incomplete, and the committed anchor list needs a CI trigger

**Location:** plan:123-125.
The anchor sources also include `tool/internal/health/fixes.go` (the `Anchor` fields),
`tool/internal/render/layout.go:24`, `src/lib/diagnostics/conditions.ts`, and
`tool/internal/doctor/check_referrer.go:36`. The probe found every live anchor already inside
`shipped-anchors.json`'s 20 entries, so the committed list is feasible. `check-readiness.mjs`'s
`checkShippedAnchors` shape already compares a list against a heading set, and
`fixes_test.go:153` can read a JSON list through `providers.RepoRoot()`.

`.github/workflows/tool.yml:20,34` triggers on `docs/admin/is-it-working.md`. The deletion PR
still triggers tool CI, but later edits to the new anchor list would not.
**Fold:** name "every anchor string under `tool/` or `src/lib/diagnostics/`", and add the list's
path to both `tool.yml` path filters.

### MF-15 (minor): chains Y and Z share hunks outside the page sections

**Location:** plan:60-61 and :180-181.
`extend.md`'s `## Harvest record` and `## Provenance` sections hold the per-slice harvest
counts. Two auditors updating them in parallel produce a guaranteed merge conflict. Separately,
the one `[candidate]` in the `migration-notes.md` section falls to no task. That is harmless
unless a claim cites it.
**Fold:** chains never edit outside page sections, and the counts live in the verifier output
and the pass record.
