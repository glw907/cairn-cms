# Polish passes design (audit remediation, slices 11a, 11b, and 12)

**Status:** revision 4, 2026-09-08. Three passes remain, polish-11a, polish-11b, and polish-C.
Plans follow through `writing-plans`, one per pass.

**Revision history.**

- Revision 1: the draft from the brainstorm with Geoff, four passes.
- Revision 2: the three-lens adversarial review (grounding, risk and sizing, charter and
  precedent; reports at `docs/internal/record/2026-09-08-polish-inputs/spec-review-*.md`)
  folded with Geoff's four rulings on the questions it raised.
- Revision 3: the docs standard initiative's amendment and Geoff's docs-investment ruling
  folded into the body.
- Revision 4: the second three-lens review folded, 48 findings taken, 0 declined, with
  reasons in
  `docs/internal/record/2026-09-08-polish-inputs/spec-review-rev3-fold.md`. Two findings are
  superseded by Geoff's 2026-09-08 evening rulings, which also split polish-A into 11a and
  11b, dropped the front-door substrate commit, and returned the doctor-transcript re-record
  to polish.

**Numbering.** This spec proposes the slice numbers, and they are initiative slots rather than
merge order. STATUS stops at slice 7 and HISTORY numbers chassis-A as 8. Chassis-B1 and B2 are
9a and 9b, the identity seam is 10, polish is 11a and 11b, and polish-C is 12. Slice 10 merged
before slice 9b, so the sequence is not a merge log. Numbering the identity seam reclassifies
it as an audit-remediation slice, which STATUS does not do today, so the spec proposes that
too. Slices 13 and 14 are not used, since revision 2 held them for polish-B and polish-D and
both dissolve below. The conductor writes the numbering into `docs/STATUS.md` when the first
polish plan is committed, and 11a's records task retro-numbers the chassis-B1 and
identity-seam headings in `docs/HISTORY.md`, which carry no number today.

**Inputs.** The routed inventory (eighteen items ROADMAP, STATUS, the pass plans, and the
rulings ledger route to polish), the friction log (no open entries as of 2026-09-08, under
both Live findings and Open findings), and the three sweeps run during planning, banked at
`docs/internal/record/2026-09-08-polish-inputs/`: `exports-sweep.md` (21 findings, F1 to
F21), `docs-sweep.md` (30, D1 to D30), and `admin-sweep.md` (30, A1 to A30; source read only).
Every sweep anchor is against `main` at `f3f24b9f` and is re-verified at dispatch (see
Sequencing).

## The aim

Polish closes the audit ledger. Every item carried to it lands or retires with a written
reason, so the initiative ends with an empty carry list, a clean STATUS, and one release cut
at the end of polish-C. The mandate STATUS gave the slice (the exports read as a family, the
docs cover to cover, the rendered admin against the design system) ran during planning, so
the plans carry concrete tasks and execution has no discovery phase. The docs read is the one
part whose findings mostly do not become polish tasks. It ran during planning like the other
two, and its prose findings feed the rewrite's fact ledgers instead, under "Docs work defers
to the rewrite" below.

Three things bound the scope. Polish takes nothing the sweeps did not find or the ledger did
not route. It takes no item whose fix needs a consumer site's evidence the repo does not hold
(the ambient-defaults floor recalibration stays out for that reason). And the older "pre-beta
polish" bullets in ROADMAP's Next tier are a different track and do not join.

Every sweep finding is either scoped below, banked as fact-ledger input for the rewrite, or
named in "Findings not taken" with its reason, so the carry list can be checked empty.

## Decisions (Geoff, 2026-09-08)

Every amendment a task writes into `docs/internal/engine-rulings.md` or a conventions row
cites this spec by path and date and quotes the decision text below. Geoff's own words are
quoted as his where they exist (decision 6). Where they do not, the clause names this spec as
the ruling's record rather than inventing a sitting quotation, and says so.

1. **Aim:** close the ledger, not 1.0 readiness and not a fresh quality sweep.
2. **The sweeps ran during planning.** Their records are inputs; the plans carry fix tasks.
3. **Both monoliths split** (F-assessment, corrected by the grounding review): four modules
   from `content-routes-entry.ts` and four plus a shared module from
   `content-routes-media.ts`. Details under polish-11a.
4. **The front door lands in the rewrite's last stage** (amended 2026-09-08: no significant
   docs investment before the rewrite, so polish-D does not run as a pass). The drafted page,
   the figure placement, and the README and cairn.pub forms move to stage five. No polish pass
   commits a substrate for it. The cost sentence still aligns to decision 10.
5. **The dev handle reaches parity with the guard on the existing `locals.cairnAccess`**,
   then the showcase's signups page adopts `createSectionAction`. `locals.cairnAccess` is
   already engine-owned (`src/lib/ambient.ts:48`, attached by `createAuthGuard` at
   `src/lib/sveltekit/guard.ts:348`), so this adds no engine surface. The dev handle reads the
   site's own `access` declaration, never a copy derived from the session.
6. **The breaking window takes the whole family set** (Geoff, on "the best long-term
   architecture": no grandfathered exceptions on a surface heading for a 1.0 promise, in the
   one window where every rename is free). The set covers both published packages,
   `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, which ship as one release unit. One
   exception, argued on semantics by the ledger and kept: `entry.*` names entry outcomes and
   `publish.*` names publish-machinery faults (`audit-log-entry-published`, keep). The list is
   enumerated under polish-C.
7. **Busy idiom, ruled as architecture.** Two shapes, both already in the design system: a
   control that stays on screen while a short round trip runs takes native `disabled` plus an
   always-mounted status region; a guarded control, refused with a reason, keeps
   `aria-disabled` with the `cairn-btn-guarded` marker so its tooltip survives. The upload
   recipe's replace-the-control-with-a-status-panel shape stays that recipe's own case,
   promoted to a family shape when a second instance appears. `ShareLinkPanel` converges on
   the first shape. The design system is the rule's one home; the ledger row records the
   verdict and points at it.
8. **OfficeList retires.** `AdminTable` is the sole scroll owner. The extend track's custom
   screen example composes `PageHeader` beside `AdminTable` inside the floating-card recipe
   `docs/internal/admin-design-system.md:1215-1216` names, over `--cairn-shadow` and
   `--cairn-card-border`, so the dropped card frame has a named replacement in the admin's own
   design system. A new ruling row in the full format supersedes the closed
   `audit-admin-officelist` row and overrules, in text, the component's own "both stay"
   sentence. The removal is a `Consumers must:` line.
9. **Three passes** (amended 2026-09-08 evening: polish-A splits along the risk lens's cut).
   Polish-11a (engine and CLI code, non-breaking), polish-11b (the admin surface,
   non-breaking), and polish-C (the breaking window and the cut). They run in that order, each
   branching after the previous merges.
10. **Workers Paid stays "from first deploy"** (Geoff, reaffirming the 2026-08-19 ruling:
    the cost is trivial either way, and one plain instruction beats a conditional). The four
    CLI strings that contradict it are therefore the drift, and 11a corrects them. The one
    published page that drifted (`own-your-domain.md`) is corrected in the rewrite's admin
    stage, from the ledger entry D1 becomes. D1's proving source is the `owner` tier, citing
    the ruling as recorded at `docs/HISTORY.md:594-596`, so the entry carries a verdict tier
    rather than landing `unverified` and being dropped.
11. **Factory arity, ruled on architecture.** One shape for every route factory: a single
    config bag, with `runtime` a required member of the bag where the factory needs one.
    Positional runtimes go. This makes the ruled "`*Config` is the primary bag" the whole
    rule with no arity clause, and no factory takes a parameter it ignores. Four factories
    change signature (`createContentRoutes`, `createCairnAdmin`, `createNavRoutes`,
    `createMediaRoute`).
12. **The README drops its site count.** Whether two or four sites run cairn in production
    is not the front door's claim to make. The ruling stands; the removal executes in the
    rewrite's stage five with the rest of the front-door set.
13. **Geoff's uncommitted front-door files stay in his working tree, unowned by any pass**
    (Geoff, 2026-09-08 evening: "Those will be wholly redone with the documentation pass. I
    don't need the current versions."). `docs/extend/assets/`, `docs/internal/site-figures.*`,
    `scripts/figures/build-site-figures.mjs`, the `check:figures` script and its CI step, and
    `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md` are committed by no
    pass and are a precondition of none. The docs standard initiative produces its own figures
    and its own front door in its own stages.

## Dispositions of the routed inventory

| Item | Disposition |
|---|---|
| Engine `src/lib/components/*.svelte` Svelte lint wiring | Polish-11a: parser wired, the zero-to-three gate errors cleared. The 317-comment register sweep the wiring does not gate is a ROADMAP Later line, not polish |
| `ShareLinkPanel` busy idiom | Ruled (decision 7); polish-11b converges the component; the ledger row points at the design system |
| `OfficeList`/`AdminTable` scroll ownership | Ruled (decision 8); polish-C rewrites the example first, then removes the export with the ruling row |
| `formatTimestamp` accept-set widening | Polish-11b, as a new proposal against the closed `audit-admin-formattimestamp` row, with the accepted domain stated as a rule and the row superseded |
| Command palette live region and roving focus | Polish-11b, as the full combobox recipe (A4) |
| `logCommitFailed` call-style split | Polish-11a, inside the media split: the media modules gain the direct import |
| `createSectionAction` adoption on signups | Polish-11b, after the dev-handle parity task |
| The showcase's single-theme identity | Retired: a recorded boundary observation, never a defect |
| The root 404 baseline | Landed in chassis-B1 Task 2; retired |
| The second-menu editing consultation | Retired from the ledger; stays a consultation candidate in ROADMAP's Later tier |
| `.cairn-card` no-real-use | Retired as a recorded boundary observation, no action. It is a showcase chassis primitive (`examples/showcase/src/chassis/composition.css:20`) for a theme's own chrome and is absent from the shipped admin sheet, so decision 8 names the admin design system's floating-card recipe as the replacement frame instead |
| The front-door landing | The rewrite's stage five; no polish pass touches it (decision 13) |
| The full-surface sweep mandate | Executed during planning; the three records are the evidence |
| Ambient-defaults floor recalibration | Out; needs consumer measurement access the repo lacks |
| `content-routes-media.ts` monolith | Polish-11a |
| `content-routes-entry.ts` monolith | Polish-11a (four modules plus a shared module, not the ROADMAP line's two-way cut; the sweep's seams are finer and each is one commit) |
| `edit-page-state-reset-coverage.test.ts` generic-comma regex gap | Polish-11a |
| Release gate, one cut after polish | Polish-C's last step through `cairn-release` |

## Polish-11a: engine and CLI code, non-breaking (slice 11a)

**Shape.** Engine runtime code under `src/lib/sveltekit/`, the doctor fixtures, the
`create-cairn-site` CLI copy, the JSDoc on engine exports, and the tests. `check:surface`
byte-identical; F2 is resolved by amending the barrel sentence, never by a re-export.
`docs/reference` changes only where a renamed internal type (`MediaDeleteRefusal`) or a
corrected JSDoc appears in generated text. Two published docs pages change, each because a
gate forces it and neither as docs investment: `docs/editors/when-something-goes-wrong.md`
under `check:editor-quotes`, and `docs/admin/is-it-working.md` under `check:transcripts` and
`check:readiness`. Each task appends its own `CHANGELOG.md` line under `## Unreleased`, with a
`Consumers must:` line where consumer action is needed, and closes or progress-notes any
ledger entry it executes, per the initiative design's standing constraint at
`2026-08-27-audit-remediation-initiative-design.md:140-143`.

**Tasks.** Ten tasks. Each task's deliverable count is stated in the plan header.

1. **The entry split, read cluster and the shared module.** The four cluster ranges below are
   the cluster **bodies**. A module-level prelude at lines 1 to 423 holds the named helpers and
   is partitioned by them, not by line number: `DeleteRefusal` (`:222`) goes with destructive,
   `BUILTIN_FRONTMATTER_KEYS` (`:279`) and `revertSchemaDrift` (`:287`) go with revert,
   `draftFromBranchHead` (`:357`) is the one cross-cluster helper and goes to the shared module,
   and `saveRefusal` (`:416`) goes with write. This task lands the shared module and the read
   cluster (`createAction`, `editLoad`, `historyLoad`, 424 to 750), re-sources
   `content-routes.ts`'s type re-exports with its literal merge key order unchanged (no gate
   pins order; the acceptance is the literal unchanged), and repoints the eleven engine-internal
   importers and the thirteen test files that this cluster moves.
2. **The entry split, write cluster.** `saveAction`, `publishAction`, `publishAllAction`,
   `discardAction`, 751 to 1169, with `saveRefusal`.
3. **The entry split, destructive and revert clusters.** `deleteAction`, `listDeleteAction`,
   `renameAction`, 1170 to 1488, with `deleteEntry` and `DeleteRefusal`, the latter renamed
   `DeleteFailure` (F1); then `revertAction`, 1489 to the end of the file, with
   `draftExistsFailure`, `revertSchemaDrift`, and `BUILTIN_FRONTMATTER_KEYS`, which only it
   uses. One commit per cluster so the reviewer diffs moves.
4. **The media split.** `content-routes-media.ts` becomes library read, ingest, delete and
   orphans, and metadata rewrite, plus `content-routes-media-shared.ts` for the module-level
   primitives. `MediaDeleteRefusal` to `MediaDeleteFailure` and `BulkDeleteSkip` to a field
   (F1). Three in-tree naming sites follow the rename, not two: `docs/reference/components.md:233`,
   `docs/reference/sveltekit.md:213`, and `src/lib/components/CairnMediaLibrary.svelte:29`'s
   `@component` block. The media modules import `logCommitFailed` directly.
5. **The product-copy sweep.** Four string sets, swept together because each is shipped
   product copy a gate or a ruling already binds and none is prose improvement. First,
   "Reload" leaves the two entry conflict refusals at the old `:922` and `:1013` (D11, the
   engine half). Second, the eight sibling `Reload and` strings at `refusal-codes.ts:23`,
   `content-routes-media.ts:372` and `:378`, `nav-routes.ts:128` and `:155`,
   `content-routes-settings.ts:156` and `:403`, and `CairnHistory.svelte:56`, plus two more
   inside `content-routes-entry.ts` at the old `:1266` and `:1481` that the earlier count of
   ten missed. Third, `VocabularyAdmin.svelte`'s user-facing "post" and "posts" strings (D12,
   the engine half), enumerated by grep at plan authoring, since the count labels D12 calls
   the defect are not among the sweep's three anchors. Fourth, the four `create-cairn-site`
   strings that contradict decision 10 (`scaffold.mjs:248-250`,
   `cloudflare/chapter2.mjs:680`, `cloudflare/catalogue.mjs:541-551`, `money.mjs:32-34`), with
   the CLI suite in the gate. The task also rewrites the quotes at
   `docs/editors/when-something-goes-wrong.md:34`, `:39`, `:105`, and `:119` that
   `check:editor-quotes` grounds against shipped `src/lib` strings. That edit is gate-driven
   mechanical text: the gate fails the moment the strings change, so it belongs to the string
   change rather than to the docs, and the rewrite's drafter treats the page like any other.
6. **The doctor transcripts re-recorded.** Both fixtures, `02-doctor-bare.txt` and
   `03-doctor-credentialed.txt`, re-recorded against the current tool, with
   `docs/admin/is-it-working.md`'s quoted totals, its "three zone-derived checks" prose, and
   its three paragraphs of staleness apology at `:53-58` following (D5 and D27), and the
   missing fifth router jump-list row added (D10). `check:transcripts` and `check:readiness`
   green. D6 is a prose fix in a different file and is banked instead. The task sits in 11a on
   gate affinity: the doctor is engine CLI code, its fixtures are the only thing
   `check:transcripts` replays, and 11a already carries the pass's other gate-forced docs
   text.
7. **Engine Svelte lint wiring.** `eslint.config.js`'s `.svelte` block reaches
   `src/lib/components/**/*.svelte`; the zero-to-three errors the risk review measured are
   cleared; `check:comments` green. The register sweep is not this task.
8. **JSDoc residuals (F4, F5, F6, F2's sentence).** The `createSiteIndexes` doc stops naming
   an internal symbol; six paraphrase one-liners state the contract; `EntryData` and
   `MediaEntry` members documented with the reason each projection exists; the `/sveltekit`
   barrel sentence names its two documented exceptions.
9. **The state-reset coverage regex.** `edit-page-state-reset-coverage.test.ts`'s regex matches
   a generic comma.
10. **Records.** The HISTORY entry, with the chassis-B1 and identity-seam headings
    retro-numbered 9a and 10; ROADMAP's polish-slice sub-bullets that 11a ships closed by name
    (the `logCommitFailed` call-style contradiction and the engine Svelte lint wiring); the
    friction log verified still empty, with anything a polish task filed triaged in the task
    that filed it; the component-comment register sweep filed to ROADMAP Later; and a final read
    of the `## Unreleased` block the nine preceding tasks each appended to. The conductor writes
    `docs/STATUS.md`, never this task.

**Ceiling.** 4.5M tokens, checkpoint every three tasks. The number rests on the risk lens's
measured band for this repo, 370K to 530K per task over five comparable passes (conventions 4a
about 530K, conformance 4b about 430K, internals about 400K, chassis-A about 367K). Ten tasks
at the band's low-to-middle is 3.7M to 4.5M, and the lens's own arithmetic for this half was
4M over eight tasks before the doctor re-record and the CLI strings returned to it. The
interval is three rather than four because four of the ten tasks are move-heavy splits.

**Dependency.** 11a branches from `main` after chassis-B2 merges.

## Polish-11b: the admin surface, non-breaking (slice 11b)

**Shape.** The admin components, the dev package, the showcase's admin routes, the admin
design system, and the tests. `check:surface` byte-identical. Each task appends its own
`CHANGELOG.md` line and closes or progress-notes its own ledger row, under the same standing
constraint 11a follows.

**Tasks.** Twelve tasks. Each task's deliverable count is stated in the plan header.

1. **The shell's keyboard blockers (A1, A2, A14, A24, A25).** The editor's chord handler stops
   propagation for every chord it consumes and the shell's window handler yields on
   `defaultPrevented` and on editable targets. The drawer toggle becomes a real button with
   `aria-expanded` and `aria-controls`, the checkbox kept as the CSS mechanism. The palette
   trigger carries `aria-haspopup="dialog"`, results key on the command label, the dialog and
   its input take distinct names.
2. **The command palette as a combobox (A4).** `role="combobox"`, `aria-expanded`,
   `aria-controls`, `aria-activedescendant`, arrow traversal, Enter on the active option, an
   `aria-live` result count and a live "No matches", in the shape `MediaPicker` implements.
3. **Pressed state and focus (A3, A6, A16).** `segmentTintClass`'s ring raised to the locked
   55 percent mix. The plan computes the mix's contrast from the design system's tokens at
   authoring time and states whether the density toggle also needs a check glyph, so the task
   ships one deliverable. `scroll-margin-bottom` for the fixed bottom bar. `MediaHeroField`'s
   dropzone on `outline-hidden` with the sheet's 2 px ring.
4. **The design system: the busy recipe and the shell's true name (decision 7, A29).** The two
   busy shapes written into `admin-design-system.md` with the rule's reason and the upload
   recipe's own case noted, plus the busy-idiom ruling row, written here because this is the
   task that holds the argument. The same task corrects the document's eight references to an
   `AdminLayout.svelte` that does not exist (`:128`, `:135`, `:532`, `:543`, `:565`, `:1001`,
   `:1005`, `:1184`); the component is `src/lib/components/CairnAdminShell.svelte`. A29 is an
   internal document, not a published track, so it has no fact ledger to bank into and it
   lands in the one task that already opens the file, ahead of the tasks that dispatch
   implementers to read it. The task is doc-only and is ordered ahead of task 5's
   convergence, so the rule exists before the code matches it.
5. **Live regions and the convergence (A5, A7, A19, A26, A27).** The five conditionally
   mounted `role="status"` regions hoisted and content-gated. `ShareLinkPanel` on native
   `disabled` for busy, the guarded marker dropped, the Clipboard-absent path selecting the
   field. The login page's misplaced status role removed.
6. **Chip vocabulary and the SSR flash (A8, A15).** The desk band's publish-state pill routed
   through `StatusChip`. The narrow-width composition rendered as both branches disambiguated
   by `hidden` and `inert` (the markup option; a server-read viewport hint is a new mechanism
   and is not taken).
7. **Login page and small conformance, first half (A17, A18, A20).** The bracketed var and
   inline style onto tokens with `check:custom-surface` proving it; the escape-hatch link
   underlined at rest; the redundant `aria-label` removed.
8. **Small conformance, second half (A21, A22, A28, A30).** Decorative glyphs `aria-hidden`
   (the plan enumerates the count by grep at authoring time); `scope="col"` on sortable
   headers; the shell's body-margin style scoped to the admin root; the reduced-motion rule
   reaching the theme root.
9. **The dev handle's `cairnAccess` parity.** `devBackendHandle` takes the same `access` and
   roles declaration the site hands `createAuthGuard` and attaches `locals.cairnAccess`
   verbatim. The task also authors the showcase's first `access` declaration:
   `examples/showcase/src/hooks.server.ts:32` calls `createAuthGuard()` with no arguments and
   `defineAccess` appears nowhere under `examples/showcase/src`, so nothing exists to share
   until this task writes it, and what it writes is exemplar surface a scaffolded site copies.
   The showcase then passes that one declaration to both branches of its hook. The
   `web-auth-security-reviewer` runs inside this task's chain. The new dev-package parameter is
   additive disclosed surface: the changelog names it, with no `Consumers must:`.
10. **The signups exemplar (A9 to A13).** `createSectionAction` adopted with the shared
    access map; stacked label register; per-row `aria-label` on Delete; confirm through
    `DeleteDialog`; `flex-col sm:flex-row` composition; a `role="status"` region for both
    actions; `templates/waymark` re-emitted; a render at 320 and 390 in both schemes read by
    the reviewer. This task overrules chassis-B2 Task 6's deliberate keep by name; see
    Sequencing.
11. **`formatTimestamp` widened.** The accept set takes the no-seconds variant, the basic
    offset form, and lowercase `z`. The superseding row states the accepted domain as a rule,
    "every shape that names its own zone", and corrects the closed row's execution text, which
    claims `formatTimestamp` "now accepts any Date-parseable timestamp" when
    `src/lib/admin-toolkit/format.ts:87-93` accepts two shapes and returns every other input
    unchanged by design. All three new forms name a zone, so the widening sits inside the
    closed row's own rationale.
12. **Records.** The HISTORY entry; ROADMAP's polish-slice sub-bullets that 11b ships closed by
    name (the `ShareLinkPanel` busy-idiom ruling, the `formatTimestamp` widening, the command
    palette's live region, and the `createSectionAction` adoption with its dev-package seam);
    the friction log verified still empty; and a final read of the `## Unreleased` block. The
    conductor writes `docs/STATUS.md`, never this task.

**Render proof.** A3, A12, and A16 rest on token arithmetic. Their tasks end with a render at
the named widths in both schemes through the chassis-B capture tool against the showcase's
admin routes, scheduled at a checkpoint so a build never runs beside two gates, and the
reviewer names the tiles read. A finding the render refutes retires with the tile named.

**Ceiling.** 5.5M tokens, checkpoint every four tasks. The number rests on the same measured
band: twelve tasks at the band's middle of about 450K is 5.4M, and 11b carries the render
proofs and the three-reviewer fan-out that 11a does not.

**Dependency.** 11b depends on nothing 11a produces in code; the two halves touch disjoint
file sets, `src/lib/sveltekit/*` plus `packages/create-cairn-site/*` against
`src/lib/components/*` plus `examples/showcase/src/routes/admin/*`. It branches from `main`
after 11a merges so the shared ledger files have one writer at a time and the single e2e slot
is not contended.

## Docs work defers to the rewrite

**The ruling (Geoff, 2026-09-08).** No significant docs investment now that a rewrite is
planned. The docs standard initiative
(`docs/superpowers/specs/2026-09-08-docs-standard-design.md`) rebuilds every published page
from a per-track fact ledger, and its drafter never opens the page it replaces. Prose
corrected now is therefore paid for twice, and the corrected text is quarantined from that
drafter anyway. Polish-B dissolves as a pass on that reasoning.

**What survives, and where it goes.**

- **The records work** folds into 11a's and 11b's own records tasks, each closing the ROADMAP
  sub-bullets its pass ships.
- **The custom-screen example** moves into polish-C as that pass's Task 1, ordered ahead of
  the `OfficeList` export removal and carried in the same pass as the removal's
  `Consumers must:` line.
- **The two product-copy changes**, D11's and D12's engine halves, are 11a's task 5.
- **The doctor-transcript re-record** (D5, D10, D27) returns to polish as 11a's task 6, ruled
  back in on 2026-09-08 evening. The rewrite harvests a gated block's fence verbatim against
  the fixture its gate replays and never re-records one, so a stale fixture that passes its own
  gate would be re-emitted unchanged. Re-recording is fixture and gate work, not prose.

**What defers to the rewrite.** The `check:reference` `## Types` assertion (F7) stays deferred
on its own stated reason: it is a gate change forcing an ordering edit on the thirteen
reference pages stage one rebuilds, so running it now buys an edit the rewrite re-does. D6's
prose fix and every other prose fix the docs sweep found defer with it. The priced cost is that
`docs/reference/render.md:13` keeps a `## Types` section ordered against every sibling until
stage one, which no gate detects, by design.

**The findings stay banked as authoritative input.** `docs-sweep.md`'s findings 1 through 30
and `exports-sweep.md`'s F7 through F10 become fact-ledger entries, each recording the true
claim with its proving source and marking the old page's claim superseded, with four
qualifications so no number has two fates. D11, D12, and D1 bank their **docs halves only**,
since their engine, CLI, and ruling halves execute above. D21's sentence is removed at stage
five under decision 12 rather than corrected. D16 is moot, because the two figure copies it
concerns stay untracked (decision 13). A29 is not banked at all; it is an internal document and
lands in 11b's task 4. Pass 2a's preflight re-resolves every number against merged `main` and
writes the finding-to-track map, and its instruction to record which findings polish-B applied
as edits is amended to "none; polish-B dissolved".

## Polish-C: the breaking window and the cut (slice 12)

**Shape.** Every rename and removal the family read found, in one branch, with one
`Consumers must:` list, the scaffolder and the migration notes updated in the same pass, the
ledger annotated, and the release cut through `cairn-release` as its last step. Nothing else
joins: a non-breaking fix found during C goes to a follow-up line, never into the window. The
custom-screen example is the one docs item inside the pass, and it is not an exception to that
rule. It is the replacement the `OfficeList` removal's `Consumers must:` line points at, so it
ships in the same pass as the removal and is ordered ahead of it.

**The consumer list, enumerated.** The plan carries the exact old-to-new table; the spec
fixes the set.

| Line | Change | Consumer action |
|---|---|---|
| 1 | Route factories take one config bag; `runtime` is a required member for `createContentRoutes`, `createCairnAdmin`, `createNavRoutes`, `createMediaRoute` (decision 11) | Wrap the runtime into the bag at four call sites |
| 2 | `AuthGuardOptions` to `AuthGuardConfig`, `RendererOptions` to `RendererConfig`, `FieldsetOptions` to `FieldsetConfig` (F17), and `DevBackendOptions` to `DevBackendConfig` in `@glw907/cairn-cms-dev` (decision 6) | Rename type imports |
| 3 | `NavLoadData` to `NavData`, `VocabularyLoadData` to `VocabularyData` (F14) | Rename type imports |
| 4 | `serializeManifest` to `formatManifest`; `parseManifest` also published on `.` (F3) | Rename one call |
| 5 | `deriveExcerpt` to `buildExcerpt`, `diffNewlyPublished` to `buildNewlyPublished` (F21) | Rename calls |
| 6 | Seven noun-first functions renamed (F20): the plan proposes each verb-first name against `convention-verb-rules` and Geoff reads the list at plan review; `githubApp` and `previewLoad` are the two consumers meet in route and config files | Rename calls in `cairn.config.ts` and the preview route |
| 7 | `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `RevertFailure` onto `{ outcome }` as `*Outcome` (F18); the discriminant value casing follows the ruled kebab grammar; the no-roster-leak encoding (`sent` for an unknown contact) and challenge-required-is-a-retry survive verbatim | Switch on `outcome`; a site's login form branches on `form.outcome` |
| 8 | `EditorRow` becomes `Omit<Editor, 'capability'>` under a name the plan fixes (F19); `listEditors`'s result stays nameable | Rename one type import |
| 9 | Log vocabulary (F11, F13): `refused` for a policy decision and `failed` for a fault. Six event strings sit outside the two-verb vocabulary and all six are renamed: `preview.rejected`, `guard.rejected`, `admin.action.csrf_rejected`, `auth.access.denied`, `media.delete_blocked`, `media.replace_blocked`. The sweep's prose said "the four outliers" while enumerating six; six is the number. Plus `taxonomy.field_unmarked` to `content.field_unmarked`; the audit sink under one area and verb; the events header admits a dotted subject so `auth.channel.session.*` stays | A subscriber switching on the strings renames; none in-tree |
| 10 | `OfficeList` removed from `/admin-toolkit` (decision 8) | Compose `PageHeader` beside `AdminTable` |

Ten lines. The publish-area merge (F12) is not taken; its keep row stands.

**Tasks.**

1. **The custom-screen example (decision 8).** `add-a-custom-admin-screen.md` and the
   `CustomScreen` reproduction compose `PageHeader` beside `AdminTable` inside the design
   system's floating-card recipe, with no `OfficeList`. There is exactly one reproduction,
   `toolkit/custom-screen`, it is the doc snippet's mounted subject, and this task owns it;
   `src/tests/unit/reproductions-manifest.test.ts:41` pins the id list, so the story is
   rewritten and never deleted. This task lands before the export removal below.
2. **The bag (line 1).** Four factories on one config bag; the showcase, the template, and
   every extend guide follow; `convention-parameter-bags` amended with a dated clause quoting
   decision 11 and citing this spec.
3. **Bags and load data (lines 2, 3).** The three engine `*Config` renames, `DevBackendOptions`
   in the dev package, and the two load-data renames; the factory-`Config` versus
   per-call-`Options` split written into the same row with its source.
4. **Verbs and codecs (lines 4, 5, 6).** The manifest codec, the two one-off verbs, and the
   seven noun-first names; the scaffolder's `finalize.mjs` pinned literal, its tests, the
   template, and the showcase in the same task; `audit-sveltekit-adminactionoptions`
   dispositioned (the rename does not reshape `adminAction`'s signature; the retire stays
   open, stated in the row).
5. **Outcomes (lines 7, 8).** The four results onto the outcome grammar; the outcome-idiom
   row widened to the whole surface with a dated clause quoting decision 6 and citing this
   spec, in the same shape task 2's clause takes; the two closed auth-channel rows superseded
   explicitly with the encoding named; `audit-sveltekit-requestresult` annotated with the new
   discriminant so its any-site case reads true.
6. **Log vocabulary (line 9).** The six outlier renames, the taxonomy-to-content move, the
   header's verb table and dotted-subject clause, `log-events.md` regenerated;
   `audit-log-taxonomy-unmarked-field` superseded with the reason (one area for content, the
   second rename inside the same unpublished window).
7. **OfficeList removed (line 10).** The export, the component, its test, and its reference
   section, with the ```svelte fence at `docs/reference/admin-toolkit.md:669` deleted in the
   same commit as the export so `check:snippets` never sees the intermediate state. The task
   touches no reproduction; task 1 settled the only one. `docs/internal/admin-design-system.md:451`
   and `:476-480` are in the file list too, since they describe the component as a live recipe
   in the document `CLAUDE.md` makes mandatory reading before admin work. The reference page's
   "both stay" sentence and the component's own doc sentence are overruled in the new row's
   text. The `gap-0` class leaves the shipped sheet as a deliberate CHANGELOG-carried removal
   with `src/tests/unit/admin-sheet-inventory.test.ts` updated. `AdminTable`'s wrapper is the
   one scroll owner.
8. **`createMediaRoute` recorded (F15).** One sentence in the `/sveltekit` barrel under the
   interop carve-out.
9. **The ledger.** Every ruling row whose subject this window renames annotated with the new
   name and "verdict unchanged", types, functions, and log event names alike. The population is
   enumerated at plan time by the gated grep rather than pinned to a number: the seventeen
   type-and-function rows the charter review lists, plus every row naming a renamed event, which
   the charter review's list does not reach (`audit-log-preview-rejected`,
   `audit-log-guard-rejected`, `audit-log-admin-action-csrf-rejected`,
   `audit-log-auth-access-denied`, `audit-log-media-delete-blocked`,
   `audit-log-media-replace-blocked`, `audit-log-admin-action-sink-threw`,
   `audit-log-audit-sink-write-failed`, and `audit-log-auth-channel-session-created`, the
   four-segment name the header clause is written for). The stale-open
   `f1-return-position-leak-sanction` closes against the rider's row, and the ledger header's
   allowlist count is corrected. A grep for each old name across `engine-rulings.md` is in the
   gate.
10. **The consumer list and the cut.** `CHANGELOG.md`'s Unreleased entry carries the ten
    lines. `docs/extend/migration-notes.md`'s `## Unreleased` section is reconciled against
    every `Consumers must:` line in the whole changelog window, not only this pass's entry, and
    the order the four sites take the renames is stated. `api-surface.md` regenerated and
    committed; every reference page and extend guide grep-swept for each old name;
    `check:snippets` green against the built package; the `docs/HISTORY.md` entry for
    polish-C's window; ROADMAP's audit-remediation entry closes;
    the conductor names the four consumer sites' upgrade in STATUS at merge; the free number
    verified with `npm view @glw907/cairn-cms versions --json`; then `cairn-release`. The
    conductor writes `docs/STATUS.md`, never this task.

**The cut is the default, not a judgment call.** The initiative's publish ruling
(`2026-08-27-audit-remediation-initiative-design.md:122-124`) is unconditional: "**One cut,
after the polish slice.** Geoff's call: the whole remediation ships in a single release with
one `Consumers must:` list." A no-cut outcome needs Geoff's ruling at polish-C's plan review or
close, never the pass's own reading of whether the window warrants one.

**Ceiling.** 7M tokens, checkpoint every four tasks.

**Dependency.** Polish-C branches after 11b merges.

## Findings not taken

- **A23** (Pagination's color-only selected state): already filed to ROADMAP Next by the
  design system; stays there.
- **F12** (publish events into one area): the `audit-log-entry-published` keep row argues the
  semantic split; stands.
- **F16's positional shape**: superseded by decision 11.
- **The 317-comment register sweep** the lint wiring exposes: a ROADMAP Later line, filed by
  11a's records task.
- **D21** (site count): the sentence goes rather than the number changing (decision 12), in
  the rewrite's stage five.

Every other F and A number appears in a task above. The D numbers and F7 through F10 are
banked as fact-ledger input under "Docs work defers to the rewrite", with the four
qualifications stated there.

## Sequencing and budgets

**Three passes in order, one at a time.** 11a branches from `main` after chassis-B2 merges;
the identity seam is already merged as PR #53. 11b branches after 11a merges, and polish-C
after 11b merges.

**Anchor reconciliation is every pass's first step, not only 11a's.** Every `file:line` the
sweeps and this spec cite is re-verified against post-merge `main`, and the plan's
Reconciliation block records each move. Polish-C needs it most, because 11a deletes
`content-routes-entry.ts` and `content-routes-media.ts` into nine modules and polish-C renames
symbols that live in them. Polish-C's plan is therefore authored after 11a and 11b merge, with
the split's module map as its Reconciliation input. The dispositions table above is reconciled
the same way, since chassis-B2's Task 8 rewrites `ROADMAP.md`'s polish sub-bullet by name and
that bullet is the table's source.

**The Reconciliation block carries a semantic column, not only a `file:line` column.** Anchor
reconciliation moves line numbers; it does not detect a decision landed against the pass.
Chassis-B2's Task 6 modifies `examples/showcase/src/routes/admin/signups/+page.server.ts` and
states in its Files block that "the raw `requireOwner` shape and its comment kept", and the
comment it preserves at `:26-28` calls the shape deliberate because the route has no audit
requirement. 11b's task 10 replaces exactly that shape, by design, so its plan names and
overrules the comment rather than deleting it silently, and re-reads B2's pinned acceptance on
the custom-screen tests and the `signups-*` baselines at dispatch. Any other B2 ruling a
polish task overturns is listed in the same column.

**Ledger ownership.** Each pass owns `CHANGELOG.md`, `docs/HISTORY.md`, `ROADMAP.md`,
`docs/internal/engine-rulings.md`, and the friction log for its own window, which holds only
because the three passes are sequential and chassis-B2 merges before 11a branches. The
conductor edits `docs/STATUS.md`, never a task: it writes the slice numbering and the three
polish tracks when the first plan is committed, closes the cairn-case track's uncommitted list
as unowned working-tree state under decision 13, and updates the file at each merge.

**One end-to-end slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173
with `reuseExistingServer: !process.env.CI`, so two `CI=1` runs cannot coexist and two non-`CI`
runs silently share one preview server. Each pass therefore runs as a single chain, no task
that runs the e2e goes into a parallel block, and no two passes run the showcase e2e
concurrently. Every pass's
e2e line reads "the from-scratch showcase e2e", because a worktree's
`examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:`
deps to `main`'s build until a from-scratch `npm install` in the worktree's showcase repoints
them, which would prove `main`'s engine rather than the split modules. The reinstall is a
pre-dispatch step in each plan.

**Task order inside a pass.** The splits run first in 11a. In 11b, task 4 writes the busy rule
before task 5 converges the code onto it, so the block is internally ordered even where its
tasks are independent of each other's files.

**Pass 2a and the docs initiative.** Pass 2a may branch when the machine frees and is gated by
neither 11a nor 11b. Two constraints bind it. Its chain D rebuilds
`docs/extend/add-a-custom-admin-screen.md`, the page polish-C's task 1 rewrites, so chain D is
ordered after polish-C merges; otherwise the two branches conflict on one file, or 2a's rebuild
re-teaches `OfficeList` from a pre-removal ledger and turns `check:snippets` red on `main`
after the release is cut. And no polish pass commits a figures substrate, so 2a's preflight
hard stop on it is removed. Both changes are written into
`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` as a dated amendment.

**Polish-C lands entirely before the docs harvest branches.** Every rename invalidates a
fact-ledger entry in exactly the class the ledger exists to guarantee. **Then the rewrite's
stage one.**

Ceilings: 11a 4.5M, 11b 5.5M, C 7M, so 17M is the total on the table. Checkpoint intervals:
three tasks in 11a, four in 11b and C. Attended time: three plan reviews, one per pass, plus
Geoff's read of the verb-first names inside C's plan review. Polish carries no front-door read,
since that page moves to the rewrite's last stage. The either-or choices the review found are
ruled above (A5's glyph decided at plan authoring, A8's markup option, F2's sentence, decisions
6 and 11), so execution carries no known pull-in.

**The gate, all three passes.** The gate list is not enumerated here and is not written from
memory. Each plan re-derives it from `.github/workflows/` before its first commit and records
the derived list in its Reconciliation block, per the initiative design's standing constraint
at `2026-08-27-audit-remediation-initiative-design.md:137-139`; CI runs thirty-one checks today
against the seventeen revision 3 listed. Four requirements sit on top of the derived list.
`npm run check` 0/0 and `npm test` exit 0 are the floor, and `npm test` already includes the
component suite, so no task claims to add it. `check:rulings-format` is named explicitly,
because it is in neither of those and it is the only gate over `engine-rulings.md`, which all
three passes write; the full `Verdict`, `Reopens on`, `Shape`, `Record`, `Verified` block for
every non-keep row is a plan acceptance criterion, since the gate itself ratchets only the
truncated parentheticals. The CLI suite and `check:template` run per task, because a file move
can carry pinned text (chassis-A's lesson). Polish-C additionally commits
`check:surface -- --update` and runs a scaffold proof against the packed tarballs. Pass end
fans out `svelte-reviewer`, `daisyui-a11y-reviewer`, and `web-auth-security-reviewer` for 11b,
and all four for polish-C, with the security reviewer reading the auth renames and the outcome
re-key.

## Risks

- **The monolith splits move a lot of text.** One commit per cluster across three tasks,
  `check:surface` byte-identical, the merge literal unchanged, and the CLI suite per task so
  moved pinned text is caught.
- **The admin sweep never rendered.** Three findings rest on arithmetic; their tasks end with
  a render and a tile read, and a finding the render refutes retires with the tile named.
- **The breaking window's file reach is measured, not estimated.** Over `git ls-files` for the
  twenty-five identifiers the window renames or removes, 464 tracked files match, and 267 match
  excluding `docs/superpowers/` and `docs/internal/record/`, which are write-once archives no
  rename sweep touches. Polish-C's plan re-derives the count by the same method. The earlier
  "365 in-tree files" figure reproduced from nothing in the repo and is retired here and in
  `docs-standard-design.md`. The mitigation is one list of ten lines, one release, the sites
  named as the next action, `check:snippets` against the built package, and the ledger annotated
  so no row names a dead symbol.
- **The release body is the whole window, not this pass's ten lines.** The changelog window
  since the last published tag runs about 1,542 lines carrying 69 `Consumers must:`
  occurrences, roughly 39 of them actionable, across eleven merged passes plus chassis-A, B1,
  B2, the identity seam, 11a, 11b, and C. A site upgrading from `0.96.0` reads all of them,
  which is why polish-C task 10 reconciles the whole migration-notes `## Unreleased` section
  rather than appending one entry.
- **Seven verb-first names are the one taste call.** The plan proposes each against the ruled
  vocabulary; Geoff reads the list at C's plan review.
- **The custom-screen example sits inside the breaking pass**, so a docs-gate failure on it
  blocks the release cut. It is ordered first in polish-C and the component suite covers it, so
  the failure surfaces before the renames land on top of it.
- **A stale doctor transcript would survive a rewrite.** `check:transcripts` replays a page's
  block against a committed fixture rather than against the current tool, so a fixture that no
  longer matches the doctor stays green forever and the harvest would re-emit it verbatim. 11a's
  task 6 re-records both fixtures, which is why the item returned to polish rather than
  deferring.
