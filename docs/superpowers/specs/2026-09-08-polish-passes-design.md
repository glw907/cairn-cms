# Polish passes design (audit remediation, slices 11 through 14)

**Status:** revision 2, 2026-09-08. Drafted from the brainstorm with Geoff, then folded from a
three-lens adversarial review (grounding, risk and sizing, charter and precedent; reports at
`docs/internal/record/2026-09-08-polish-inputs/spec-review-*.md`) and Geoff's four rulings on
the questions the review raised. Awaiting Geoff's read. Plans follow through `writing-plans`,
one per pass.

**Numbering.** This spec proposes the slice numbers; STATUS stops at slice 7 and HISTORY
numbers chassis-A as 8. Chassis-B1 and B2 are 9a and 9b, the identity seam is 10, and the four
polish passes are 11 (A), 12 (B), 13 (D), and 14 (C). STATUS adopts the numbering when the
first polish plan is committed.

**Inputs.** The routed inventory (eighteen items ROADMAP, STATUS, the pass plans, and the
rulings ledger route to polish), the friction log (one open entry, owned by the identity
seam), and the three sweeps run during planning, banked at
`docs/internal/record/2026-09-08-polish-inputs/`: `exports-sweep.md` (21 findings, F1 to
F21), `docs-sweep.md` (30, D1 to D30), and `admin-sweep.md` (30, A1 to A30; source read only).
Every sweep anchor is against `main` at `f3f24b9f` and is re-verified at dispatch (see
Sequencing).

## The aim

Polish closes the audit ledger. Every item carried to it lands or retires with a written
reason, so the initiative ends with an empty carry list, a clean STATUS, and, if the window
still warrants it at the end of polish-C, one release cut. The mandate STATUS gave the slice
(the exports read as a family, the docs cover to cover, the rendered admin against the design
system) ran during planning, so the plans carry concrete tasks and execution has no discovery
phase.

Three things bound the scope. Polish takes nothing the sweeps did not find or the ledger did
not route. It takes no item whose fix needs a consumer site's evidence the repo does not hold
(the ambient-defaults floor recalibration stays out for that reason). And the older "pre-beta
polish" bullets in ROADMAP's Next tier are a different track and do not join.

Every sweep finding is either scoped below or named in "Findings not taken" with its reason,
so the carry list can be checked empty.

## Decisions (Geoff, 2026-09-08)

1. **Aim:** close the ledger, not 1.0 readiness and not a fresh quality sweep.
2. **The sweeps ran during planning.** Their records are inputs; the plans carry fix tasks.
3. **Both monoliths split** (F-assessment, corrected by the grounding review): four modules
   from `content-routes-entry.ts` and four plus a shared module from
   `content-routes-media.ts`. Details under polish-A.
4. **The front door lands as its own small pass, polish-D**, as drafted at its full length
   with both figures. The cost sentence aligns to decision 10.
5. **The dev package gains a `cairnAccess` seam**, then the showcase's signups page adopts
   `createSectionAction`. The seam reads the site's own `access` declaration, never a copy
   derived from the session (decision 11).
6. **The breaking window takes the whole family set** (Geoff, on "the best long-term
   architecture": no grandfathered exceptions on a surface heading for a 1.0 promise, in the
   one window where every rename is free). One exception, argued on semantics by the ledger
   and kept: `entry.*` names entry outcomes and `publish.*` names publish-machinery faults
   (`audit-log-entry-published`, keep). The list is enumerated under polish-C.
7. **Busy idiom, ruled as architecture.** Two shapes, both already in the design system: a
   control that stays on screen while a short round trip runs takes native `disabled` plus
   an always-mounted status region; a guarded control, available in principle but refused
   with a reason, keeps `aria-disabled` with the `cairn-btn-guarded` marker so its tooltip
   survives. The upload recipe's replace-the-control-with-a-status-panel shape stays that
   recipe's own case, promoted to a family shape when a second instance appears.
   `ShareLinkPanel` converges on the first shape. The design system is the rule's one home;
   the ledger row records the verdict and points at it.
8. **OfficeList retires.** `AdminTable` is the sole scroll owner. The extend track's custom
   screen example composes `PageHeader` beside `AdminTable` inside the design system's card
   recipe, so the card frame the removal drops has a named replacement. A new ruling row in
   the full format supersedes the closed `audit-admin-officelist` row and overrules, in text,
   the component's own "both stay" sentence. The removal is a `Consumers must:` line.
9. **Four passes.** Polish-A (engine and admin, non-breaking), polish-B (docs), polish-D
   (the front door), polish-C (the breaking window and the cut). A and B run in parallel; D
   follows B; C follows every other merge.
10. **Workers Paid stays "from first deploy"** (Geoff, reaffirming the 2026-08-19 ruling:
    the cost is trivial either way, and one plain instruction beats a conditional). The one
    page that drifted (`own-your-domain.md`) is corrected back, and the front-door draft's
    "from the first editor who signs in" aligns to it.
11. **Factory arity, ruled on architecture.** One shape for every route factory: a single
    config bag, with `runtime` a required member of the bag where the factory needs one.
    Positional runtimes go. This makes the ruled "`*Config` is the primary bag" the whole
    rule with no arity clause, and no factory takes a parameter it ignores. Four factories
    change signature (`createContentRoutes`, `createCairnAdmin`, `createNavRoutes`,
    `createMediaRoute`).
12. **The README drops its site count.** Whether two or four sites run cairn in production
    is not the front door's claim to make.

## Dispositions of the routed inventory

| Item | Disposition |
|---|---|
| Engine `src/lib/components/*.svelte` Svelte lint wiring | Polish-A: parser wired, the zero-to-three gate errors cleared. The 317-comment register sweep the wiring does not gate is a ROADMAP Later line, not polish |
| `ShareLinkPanel` busy idiom | Ruled (decision 7); polish-A converges the component; the ledger row points at the design system |
| `OfficeList`/`AdminTable` scroll ownership | Ruled (decision 8); polish-B rewrites the example, polish-C removes the export with the ruling row |
| `formatTimestamp` accept-set widening | Polish-A, as a new proposal against the closed `audit-admin-formattimestamp` row, with the three forms named and the row superseded |
| Command palette live region and roving focus | Polish-A, as the full combobox recipe (A4) |
| `logCommitFailed` call-style split | Polish-A, inside the media split: the media modules gain the direct import |
| `createSectionAction` adoption on signups | Polish-A, after the `cairnAccess` seam |
| The showcase's single-theme identity | Retired: a recorded boundary observation, never a defect |
| The root 404 baseline | Landed in chassis-B1 Task 2; retired |
| The second-menu editing consultation | Retired from the ledger; stays a consultation candidate in ROADMAP's Later tier |
| `.cairn-card` no-real-use | Recorded in the B1 harvest; it becomes the card recipe the custom-screen example uses (decision 8) |
| The front-door landing | Polish-D |
| The full-surface sweep mandate | Executed during planning; the three records are the evidence |
| Ambient-defaults floor recalibration | Out; needs consumer measurement access the repo lacks |
| `content-routes-media.ts` monolith | Polish-A |
| `content-routes-entry.ts` monolith | Polish-A (four modules, not the ROADMAP line's two-way cut; the sweep's seams are finer and each is one commit) |
| `edit-page-state-reset-coverage.test.ts` generic-comma regex gap | Polish-A |
| Release gate, one cut after polish | Polish-C's last step through `cairn-release`, conditional on the window |

## Polish-A: engine and admin, non-breaking (slice 11)

**Shape.** Engine runtime code, the admin components, the dev package, the showcase's admin
routes, and the tests. `check:surface` byte-identical; F2 is resolved by amending the barrel
sentence, never by a re-export. `docs/reference` changes only where a renamed internal type
(`MediaDeleteRefusal`) or a corrected JSDoc appears in generated text; every reference-prose
finding belongs to polish-B. Polish-A owns no shared ledger file except `CHANGELOG.md`, where
it appends one bullet at the end of the Unreleased block, and `docs/HISTORY.md`, where it adds
its own entry; the friction log and ROADMAP are polish-B's (decision 9's contention rule).

**Tasks.**

1. **The entry split.** `content-routes-entry.ts` becomes four modules along the corrected
   seams: read (`createAction`, `editLoad`, `historyLoad`, lines 424 to 750), write
   (`saveAction`, `publishAction`, `publishAllAction`, `discardAction`, 751 to 1169, with
   `saveToBranch` and `saveRefusal`), destructive (`deleteAction`, `listDeleteAction`,
   `renameAction`, 1170 to 1487, with `deleteEntry` and `DeleteRefusal`), and revert
   (`revertAction`, 1489 to 1616, with `draftExistsFailure`, `revertSchemaDrift`, and
   `BUILTIN_FRONTMATTER_KEYS`, which only it uses). `draftFromBranchHead` is the one
   cross-cluster helper and goes to a shared module. `content-routes.ts` keeps its literal
   merge key order (no gate pins order; the acceptance is the literal unchanged), the type
   re-exports re-source, the eleven engine-internal importers and the test files repoint.
   One commit per cluster so the reviewer diffs moves. `DeleteRefusal` renamed
   `DeleteFailure` (F1). The two conflict refusals at the old `:922` and `:1013` lose
   "Reload" (D11, the engine half) in this task, since the strings move anyway, with the ten
   sibling `Reload and` strings across `refusal-codes.ts`, `content-routes-media.ts`,
   `nav-routes.ts`, `content-routes-settings.ts`, and `CairnHistory.svelte` swept in the same
   commit and their three test files updated.
2. **The media split.** `content-routes-media.ts` becomes library read, ingest, delete and
   orphans, and metadata rewrite, plus `content-routes-media-shared.ts` for the module-level
   primitives. `MediaDeleteRefusal` to `MediaDeleteFailure` and `BulkDeleteSkip` to a field
   (F1); the two reference pages naming `MediaDeleteRefusal` updated. The media modules import
   `logCommitFailed` directly. `VocabularyAdmin.svelte`'s three "posts" strings become
   "entries" (D12, the engine half) here, with `check:editor-quotes` in the gate.
3. **The shell's keyboard blockers (A1, A2, A14, A24, A25).** The editor's chord handler stops
   propagation for every chord it consumes and the shell's window handler yields on
   `defaultPrevented` and on editable targets. The drawer toggle becomes a real button with
   `aria-expanded` and `aria-controls`, the checkbox kept as the CSS mechanism. The palette
   trigger carries `aria-haspopup="dialog"`, results key on the command label, the dialog and
   its input take distinct names.
4. **The command palette as a combobox (A4).** `role="combobox"`, `aria-expanded`,
   `aria-controls`, `aria-activedescendant`, arrow traversal, Enter on the active option, an
   `aria-live` result count and a live "No matches", in the shape `MediaPicker` implements.
5. **Pressed state and focus (A3, A6, A16).** `segmentTintClass`'s ring raised to the locked
   55 percent mix. The plan computes the mix's contrast from the design system's tokens at
   authoring time and states whether the density toggle also needs a check glyph, so the task
   ships one deliverable. `scroll-margin-bottom` for the fixed bottom bar. `MediaHeroField`'s
   dropzone on `outline-hidden` with the sheet's 2 px ring.
6. **The busy recipe in the design system (decision 7).** The two shapes written into
   `admin-design-system.md` with the rule's reason and the upload recipe's own case noted.
   A doc-only task, ahead of the convergence, so the rule exists before the code matches it.
7. **Live regions and the convergence (A5, A7, A19, A26, A27).** The five conditionally
   mounted `role="status"` regions hoisted and content-gated. `ShareLinkPanel` on native
   `disabled` for busy, the guarded marker dropped, the Clipboard-absent path selecting the
   field. The login page's misplaced status role removed. `check:custom-surface` in the gate.
8. **Chip vocabulary and the SSR flash (A8, A15).** The desk band's publish-state pill routed
   through `StatusChip`. The narrow-width composition rendered as both branches disambiguated
   by `hidden` and `inert` (the markup option; a server-read viewport hint is a new mechanism
   and is not taken).
9. **Login page and small conformance, first half (A17, A18, A20).** The bracketed var and
   inline style onto tokens with `check:custom-surface` proving it; the escape-hatch link
   underlined at rest; the redundant `aria-label` removed.
10. **Small conformance, second half (A21, A22, A28, A30).** Decorative glyphs `aria-hidden`
    (the plan enumerates the count by grep at authoring time); `scope="col"` on sortable
    headers; the shell's body-margin style scoped to the admin root; the reduced-motion rule
    reaching the theme root.
11. **The `cairnAccess` seam.** `devBackendHandle` takes the same `access` and roles
    declaration the site hands `createAuthGuard` and attaches `locals.cairnAccess` verbatim;
    the showcase passes one shared declaration to both branches of its hook. The
    `web-auth-security-reviewer` runs inside this task's chain. `check:dev-package` in the
    gate. The plan states whether the new dev-package parameter is disclosed surface owed a
    changelog line (it is additive; the changelog names it, no `Consumers must:`).
12. **The signups exemplar (A9 to A13).** `createSectionAction` adopted with the shared
    access map; stacked label register; per-row `aria-label` on Delete; confirm through
    `DeleteDialog`; `flex-col sm:flex-row` composition; a `role="status"` region for both
    actions; `templates/waymark` re-emitted; a render at 320 and 390 in both schemes read by
    the reviewer.
13. **Engine Svelte lint wiring.** `eslint.config.js`'s `.svelte` block reaches
    `src/lib/components/**/*.svelte`; the zero-to-three errors the risk review measured are
    cleared; `check:comments` green. The register sweep is not this task.
14. **JSDoc residuals (F4, F5, F6, F2's sentence).** The `createSiteIndexes` doc stops naming
    an internal symbol; six paraphrase one-liners state the contract; `EntryData` and
    `MediaEntry` members documented with the reason each projection exists; the `/sveltekit`
    barrel sentence names its two documented exceptions.
15. **Two small engine items.** `formatTimestamp` accepts the no-seconds variant, the basic
    offset form, and lowercase `z`, with the superseding ruling row; the state-reset coverage
    test's regex matches a generic comma.
16. **Records.** The busy-idiom and `formatTimestamp` rows in `engine-rulings.md`; the
    CHANGELOG bullet appended; the HISTORY entry; STATUS present tense. ROADMAP and the
    friction log are not touched (polish-B's).

Sixteen tasks; the plan marks 3 through 10 and 13 through 15 independent of the splits, so
the chain order puts the splits first and the rest after, and the checkpoint interval is
four.

**Gate, per task.** `npm run check`, `npm test` exit 0, `check:comments`, `check:reference`,
`check:reference:signatures`, `check:surface` unchanged, `check:custom-surface`,
`check:dev-package`, `check:package`, `check:docs`, `check:snippets`, `check:transcripts`,
`check:symbols`, `check:editor-quotes`, `check:template`, `check:consumers`, the
create-cairn-site suite, and `CI=1` showcase e2e with every baseline unchanged. The CLI suite
and `check:template` run per task because a file move can carry pinned text (chassis-A's
lesson). Pass end fans out `svelte-reviewer`, `daisyui-a11y-reviewer`, and
`web-auth-security-reviewer`.

**Render proof.** A3, A12, and A16 rest on token arithmetic. Their tasks end with a render at
the named widths in both schemes through the chassis-B capture tool against the showcase's
admin routes, scheduled at a checkpoint so a build never runs beside two gates, and the
reviewer names the tiles read.

**Ceiling.** 7M tokens, checkpoint every four tasks.

## Polish-B: docs (slice 12)

**Shape.** The four published tracks, `README.md`, and the reference pages' prose. No engine
code: the two product-copy changes moved to polish-A. Polish-B owns the friction log and
ROADMAP. Docs gate only.

**Tasks.**

1. **Money and prerequisites (D1, D2, decision 10).** `own-your-domain.md` corrected back to
   the first-deploy form and its "free-until boundary" cross-reference removed; the invite
   prerequisites in `before-you-start.md` become three; `money.mjs`'s preamble confirmed on
   the same form.
2. **The doctor transcript (D5, D6, D10, D27).** Both doctor fixtures re-recorded against the
   current tool; "three zone-derived checks" becomes two; the troubleshooting step names the
   printed title; the fifth condition joins the router with `check:readiness` green; the
   staleness disclosure deleted.
3. **Extend-track correctness (D3, D4, D7, D8, D9, D13, D14, D19, D28).** The fragments guide
   declares its title field; `share-a-draft-preview.md` and `add-a-second-audience.md` gain
   precondition lines and `wire-the-delivery-surface.md`'s points at the page that produces
   `$theme` and `siteConfig`; the CSRF check claim corrected; the scaffold tree lists the test
   files; the migration count and the nonce migration corrected; `ORIGIN` against
   `PUBLIC_ORIGIN` in one sentence; the audit migration's directory distinction front-loaded.
4. **Extend-track shape (D15, D17, D18).** `**Contract:**` on every task guide; "adapter" in
   the track's defined sense only; the README's vocabulary before its first use.
5. **Reference conformance (D20, D22, D23, D24, D25, D29, F7, F8, F9, F10).** `## Types` last
   on `render.md`; `## Exit codes` on the manifest CLI page; six second-person sentences
   recast; the contrast frame and the two "simply" removed; the migration-notes count
   matched to its bullets; the false "every content action" claim corrected with
   `RevertFailure` named; `/delivery/head` on the reference README; `render.md` retitled to
   what the subpath holds; one section grammar for export-keyed pages with `check:reference`
   asserting a `## Types` section wherever the subpath exports types.
6. **Editors track (D11 doc half, D12 doc half, D30).** `when-something-goes-wrong.md`
   simplified once the copy no longer says "Reload"; "entry" in the vocabulary page; the
   README's arrival sentence describes the section.
7. **Admin track vocabulary (D26) and the design-system pointer (A29).** "concepts" out of
   operator prose; `admin-design-system.md`'s four references to `AdminLayout.svelte` point
   at `CairnAdminShell.svelte`.
8. **The custom-screen example (decision 8).** `add-a-custom-admin-screen.md` and the
   `CustomScreen` reproduction compose `PageHeader` beside `AdminTable` inside the card
   recipe, with no `OfficeList`, ahead of polish-C's removal. The reproduction test's
   assertions follow. This task alone runs the component suite.
9. **Records.** The friction log triaged whole; ROADMAP's docs items closed and the
   component-comment register sweep filed to Later; CHANGELOG bullet; HISTORY; STATUS.

**Gate.** `check:docs`, `check:vale`, `check:reference`, `check:reference:signatures`,
`check:snippets`, `check:transcripts`, `check:readiness`, `check:editor-quotes`,
`check:arm-indexes`, `check:rulings-format`, plus `npm run check` and the component suite on
Task 8. Pass end runs `prose-voice-reviewer` over the changed pages.

**Ceiling.** 4M tokens.

## Polish-D: the front door (slice 13)

**Shape.** One authored public page, two figures with their alt, caption, and text
alternative, the README and cairn.pub forms, and the gate that keeps the figures fresh. Docs
only. Runs after polish-B merges so the cost wording and the vocabulary fixes are in place.

**Pre-dispatch.** The substrate is uncommitted on Geoff's main checkout: the proposal
(`docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md`),
`docs/extend/assets/*.{md,svg}`, `docs/internal/site-figures.*`,
`scripts/figures/build-site-figures.mjs`, the `check:figures` script in `package.json`, and
its CI step in `test.yml`. The conductor commits that set to `main` before the polish-D
worktree branches, with the two writer-facing `assets/*.md` files moved to
`docs/internal/figures/` in the same commit so `check:arm-indexes` is green on `main`.

**Tasks.**

1. **The page.** Section A lands as `docs/why-cairn.md` at its drafted length, the cost
   sentence on the first-deploy form, the author's own account of the drivers
   (`front-door-author-brief.md` in the polish inputs: one integrated surface, a bombproof
   admin, low cost, and what WordPress and the static generators taught) folded into the
   opener and the setup section as first-person record, the concept figure embedded with its
   alt and caption,
   `check:docs` green with the links resolving from their real path. `cairn-register-editor`
   and `prose-voice-reviewer` read it against the no-pitch keystone; their findings fold in
   one round.
2. **The figures.** The anatomy figure on the architecture page with its alt, caption, and
   text alternative; the concept figure's text alternative reachable from the front door;
   `check:figures` green.
3. **The forms and the README.** Section B's one-sentence and one-paragraph forms on
   `README.md` and in cairn.pub's copy; the README's site-count sentence removed (decision
   12); `docs/README.md`'s six-route order reconciled with the register's five or the
   deviation recorded in `docs-register.md`.
4. **Records.** ROADMAP's front-door line closed; STATUS's cairn-case track closed; CHANGELOG;
   HISTORY.

**Gate.** `check:docs`, `check:vale`, `check:figures`, `check:arm-indexes`,
`check:rulings-format`. Geoff reads the rendered page on the PR.

**Ceiling.** 2.5M tokens.

## Polish-C: the breaking window and the cut (slice 14)

**Shape.** Every rename and removal the family read found, in one branch, with one
`Consumers must:` list, the scaffolder and the migration notes updated in the same pass, the
ledger annotated, and the release cut through `cairn-release` as its last step if the window
still warrants one. Nothing else joins: a non-breaking fix found during C goes to a follow-up
line, never into the window.

**The consumer list, enumerated.** The plan carries the exact old-to-new table; the spec
fixes the set.

| Line | Change | Consumer action |
|---|---|---|
| 1 | Route factories take one config bag; `runtime` is a required member for `createContentRoutes`, `createCairnAdmin`, `createNavRoutes`, `createMediaRoute` (decision 11) | Wrap the runtime into the bag at four call sites |
| 2 | `AuthGuardOptions` to `AuthGuardConfig`, `RendererOptions` to `RendererConfig`, `FieldsetOptions` to `FieldsetConfig` (F17) | Rename type imports |
| 3 | `NavLoadData` to `NavData`, `VocabularyLoadData` to `VocabularyData` (F14) | Rename type imports |
| 4 | `serializeManifest` to `formatManifest`; `parseManifest` also published on `.` (F3) | Rename one call |
| 5 | `deriveExcerpt` to `buildExcerpt`, `diffNewlyPublished` to `buildNewlyPublished` (F21) | Rename calls |
| 6 | Seven noun-first functions renamed (F20): the plan proposes each verb-first name against `convention-verb-rules` and Geoff reads the list at plan review; `githubApp` and `previewLoad` are the two consumers meet in route and config files | Rename calls in `cairn.config.ts` and the preview route |
| 7 | `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `RevertFailure` onto `{ outcome }` as `*Outcome` (F18); the discriminant value casing follows the ruled kebab grammar; the no-roster-leak encoding (`sent` for an unknown contact) and challenge-required-is-a-retry survive verbatim | Switch on `outcome`; a site's login form branches on `form.outcome` |
| 8 | `EditorRow` becomes `Omit<Editor, 'capability'>` under a name the plan fixes (F19); `listEditors`'s result stays nameable | Rename one type import |
| 9 | Log vocabulary (F11, F13): `refused` for a policy decision and `failed` for a fault, the four outliers renamed; `taxonomy.field_unmarked` to `content.field_unmarked`; the audit sink under one area and verb; the events header admits a dotted subject so `auth.channel.session.*` stays | A subscriber switching on the strings renames; none in-tree |
| 10 | `OfficeList` removed from `/admin-toolkit` (decision 8) | Compose `PageHeader` beside `AdminTable` |

Ten lines. The publish-area merge (F12) is not taken; its keep row stands.

**Tasks.**

1. **The bag (line 1).** Four factories on one config bag; the showcase, the template, and
   every extend guide follow; `convention-parameter-bags` amended with a quoted, dated clause
   naming Geoff's 2026-09-08 ruling.
2. **Bags and load data (lines 2, 3).** The three `*Config` renames and the two load-data
   renames; the factory-`Config` versus per-call-`Options` split written into the same row
   with its source.
3. **Verbs and codecs (lines 4, 5, 6).** The manifest codec, the two one-off verbs, and the
   seven noun-first names; the scaffolder's `finalize.mjs` pinned literal, its tests, the
   template, and the showcase in the same task; `audit-sveltekit-adminactionoptions`
   dispositioned (the rename does not reshape `adminAction`'s signature; the retire stays
   open, stated in the row).
4. **Outcomes (lines 7, 8).** The four results onto the outcome grammar; the outcome-idiom
   row widened to the whole surface with a quoted, dated clause; the two closed auth-channel
   rows superseded explicitly with the encoding named; `audit-sveltekit-requestresult`
   annotated with the new discriminant so its any-site case reads true.
5. **Log vocabulary (line 9).** The renames, the header's verb table and dotted-subject
   clause, `log-events.md` regenerated; `audit-log-taxonomy-unmarked-field` superseded with
   the reason (one area for content, the second rename inside the same unpublished window).
6. **OfficeList removed (line 10).** The export, the component, its test, its reproduction
   story and test assertions, and its reference section; the `gap-0` class leaving the shipped
   sheet as a deliberate CHANGELOG-carried removal with `admin-sheet-inventory.test.ts`
   updated; the reference page's "both stay" sentence and the component's own doc sentence
   overruled in the new row's text; `AdminTable`'s wrapper the one scroll owner.
7. **`createMediaRoute` recorded (F15).** One sentence in the `/sveltekit` barrel under the
   interop carve-out.
8. **The ledger.** Every ruling row whose subject this window renames annotated with the new
   name and "verdict unchanged" (seventeen rows the charter review enumerates); the stale-open
   `f1-return-position-leak-sanction` closed against the rider's row; the ledger header's
   allowlist count corrected. A grep for each old name across `engine-rulings.md` is in the
   gate.
9. **The consumer list and the cut.** `CHANGELOG.md`'s Unreleased entry carries the ten
   lines; `docs/extend/migration-notes.md` gets the window's entry; `api-surface.md`
   regenerated and committed; every reference page and extend guide grep-swept for each old
   name; `check:snippets` green against the built package; ROADMAP's audit-remediation entry
   closes; the four consumer sites' upgrade named in STATUS as the next action; the free
   number verified with `npm view @glw907/cairn-cms versions --json`; then `cairn-release` if
   the window warrants it.

**Gate.** The full engine gate with `check:surface -- --update` committed, `check:snippets`,
the create-cairn-site suite, the from-scratch showcase e2e, and a scaffold proof against the
packed tarballs. Pass end fans out all four reviewers; the security reviewer reads the auth
renames and the outcome re-key.

**Ceiling.** 7M tokens.

## Findings not taken

- **A23** (Pagination's color-only selected state): already filed to ROADMAP Next by the
  design system; stays there.
- **F12** (publish events into one area): the `audit-log-entry-published` keep row argues the
  semantic split; stands.
- **F16's positional shape**: superseded by decision 11.
- **The 317-comment register sweep** the lint wiring exposes: a ROADMAP Later line, filed by
  polish-B.
- **D16's placement** is done at polish-D's pre-dispatch commit, not as a task.
- **D21** (site count): the sentence goes rather than the number changing (decision 12).

Every other F, D, and A number appears in a task above.

## Sequencing and budgets

Polish-A and polish-B branch from `main` after the identity seam and chassis-B2 merge. The
first step of each plan is anchor reconciliation: every `file:line` the sweeps and this spec
cite is re-verified against post-merge `main` and the plan's Reconciliation block records
each move. They run as two chains in one `pass-execute-chains` workflow with separate
worktrees. Contended resources, named: `CHANGELOG.md` (each appends one bullet at the end of
Unreleased), `docs/HISTORY.md` (each adds its own entry; the merge conflict is positional and
trivial), `docs/STATUS.md` (the conductor edits it at merge, never a task), the friction log
and ROADMAP (polish-B only), and `docs/reference` (polish-B only, except the two
`MediaDeleteRefusal` mentions polish-A renames). Merge order is A then B with B rebased.
Machine ceiling: two concurrent full gates; polish-B's docs gate is light, its Task 8 takes a
full-gate slot, and polish-A's render proofs run at checkpoints.

Polish-D branches after polish-B merges and its substrate commit lands. Polish-C branches
after A, B, and D have merged.

Ceilings: A 7M, B 4M, D 2.5M, C 7M; checkpoint every four tasks. Attended time: one plan
review per pass (four), Geoff's read of the verb-first names inside C's plan review, and
Geoff's read of the front door on D's PR. The four either-or choices the review found are
ruled above (A5's glyph decided at plan authoring, A8's markup option, F2's sentence,
decision 11), so execution carries no known pull-in.

## Risks

- **The monolith splits move a lot of text.** One commit per cluster, `check:surface`
  byte-identical, the merge literal unchanged, and the CLI suite per task so moved pinned text
  is caught.
- **The admin sweep never rendered.** Three findings rest on arithmetic; their tasks end with
  a render and a tile read, and a finding the render refutes retires with the tile named.
- **The window touches 365 in-tree files and four sites' route files.** One list of ten
  lines, one release, the sites named as the next action, `check:snippets` against the
  built package, and the ledger annotated so no row names a dead symbol.
- **Seven verb-first names are the one taste call.** The plan proposes each against the
  ruled vocabulary; Geoff reads the list at C's plan review.
- **Polish-A's sixteen tasks are the largest pass since the internals pass.** The
  independent block is marked so the workflow can take it in parallel with the splits if the
  machine allows, and the 7M ceiling carries one escalation.

## Amendment 2026-09-08

The docs standard initiative (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`) changes
what three of these passes should carry. This amendment is a **precondition of the initiative**, not
a record written afterwards: it must be on `main` before polish-B's plan is authored, since two of
its three clauses instruct passes that would otherwise already have run. Each clause carries its
reason.

**1. Polish-C lands entirely before the docs harvest branches.** Polish-C renames and removes across
365 in-tree files, and every rename invalidates a fact-ledger entry in exactly the class the ledger
exists to guarantee. The harvest therefore runs after polish-C, never between the harvest and the
rewrite and never concurrently with either. Polish-C lands before stage one's harvest branches and
does not gate pass 2a; the order is A, B, D, 2a, C, then stage one.

**2. Polish-B splits.** Its code work keeps tasks 2, 8, and 9 and the `check:reference` change in
task 5, and merges before the harvest branches. **Its prose findings are not run as edits.** They
become authoritative input to the fact ledgers, where the ledger records the true claim with its
proving source and marks the old page's claim superseded. The reason: a rebuild from a correct
ledger emits the corrected page once, whereas editing a page now and rebuilding it in the rewrite
pays for the same correction twice and leaves the edited text to be quarantined from the drafter
anyway. Polish-B's findings are numbered 1 through 30 in `docs-sweep.md` with no prefix, and F7
through F10 live in `exports-sweep.md`; the toolset pass's preflight re-resolves every number and
records which, if any, polish-B applied as an edit before this amendment landed.

**3. Polish-D splits.** Its substrate commit and its figure and form tasks stay where they are, and
the substrate commit now lands before the toolset pass's preflight rather than before that pass's
figures task, because `docs/extend` is in `package.json`'s `files` array and the commit changes the
published-page count every later chain derives from. **Its task 1, `docs/why-cairn.md`, moves to the
rewrite as the rewrite's LAST stage.** Amended 2026-09-08: an earlier wording made it the rewrite's
first page. Two reasons overturn that. Authoring the front door in polish-D repeats the exact failure
the standard exists to stop, since the rejected front-door draft is what produced the initiative, and
that half stands unchanged. But the front door is also the hardest thing in the published set to
write: a mixed evaluator audience, the strictest register ruling, and every claim traced to the owner
brief rather than to code. The rewrite now runs as five stages ordered by difficulty of writing the
track well, easiest first, each closing with a tuning checkpoint that amends the templates, the
schemas, and the gate thresholds. The front door therefore meets the standard after four stages have
tuned it, not while the tooling is still being corrected. Its `docs/README.md` route-order item
becomes an index-page question the standard governs, answered in that same last stage.

**The cost of clause 3, named.** The front door stays as it is until **stage five** of the rewrite
lands, which is the end of the initiative rather than its first page, and any cairn.pub work
depending on new front-door copy waits with it. That is a longer wait than the earlier wording
implied, and it is the deliberate price of letting the hardest page set be written by a tuned
system.

Nothing here changes polish-A's or polish-C's own task lists.
