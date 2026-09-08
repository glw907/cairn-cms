# Polish passes design (audit remediation, slices 11, 12, and 13)

**Status:** drafted 2026-09-08 from the brainstorm with Geoff, revision 1, awaiting adversarial
review and Geoff's read. Plans follow through `writing-plans`, one per pass. Polish-A and
polish-B execute in parallel worktrees once the identity seam and chassis-B2 have merged;
polish-C follows their merge and ends at the release cut that closes the audit-remediation
window.

**Numbering.** STATUS numbers the slices as executed: chassis-B1 is 9a, chassis-B2 is 9b, the
identity seam is 10. Polish-A, polish-B, and polish-C are 11, 12, and 13.

**Inputs.** The routed inventory (every item ROADMAP, STATUS, the pass plans, and the rulings
ledger route to polish, seventeen items), the friction log (one open entry, owned by the
identity seam), and the three sweeps run during planning, banked at
`docs/internal/record/2026-09-08-polish-inputs/`: `exports-sweep.md` (the export surface read
as a family, 21 findings), `docs-sweep.md` (the four published tracks read cover to cover, 30
findings), and `admin-sweep.md` (the rendered admin against its design system, 30 findings,
source read only). Finding numbers below (F1 to F21, D1 to D30, A1 to A30) are those records'.

## The aim

Polish closes the audit ledger. Every item carried to it lands or retires with a written
reason, so the initiative ends with an empty carry list, a clean STATUS, and one release cut.
The mandate STATUS gave the slice, the exports read as a family, the docs cover to cover, and
the rendered admin against the design system, ran during planning rather than inside the
pass, so the plans carry concrete tasks and execution has no discovery phase.

Three things bound the scope. Polish takes nothing the sweeps did not find or the ledger did
not route. It takes no item whose fix needs a consumer site's evidence the repo does not hold
(the ambient-defaults floor recalibration, ROADMAP's calibration corpus C, stays out for that
reason). And the older "pre-beta polish" bullets in ROADMAP's Next tier are a different track
and do not join.

## Decisions (Geoff, 2026-09-08)

1. **Aim:** close the ledger, not 1.0 readiness and not a fresh quality sweep.
2. **The sweeps ran during planning.** Their records are inputs; the plans carry fix tasks.
3. **Both monoliths split.** The exports sweep found both splits mechanical: four files from
   `content-routes-entry.ts`, four from `content-routes-media.ts` plus a `-media-shared.ts`,
   every private helper used by exactly one cluster, the merged return object's key order
   pinned by `check:surface`, and seven engine-internal importers to repoint.
4. **The front door lands in polish-B as drafted**, both figures, 1,619 words, with one
   correction folded: the Workers Paid cost begins with the second editor, not the first
   deploy (D1).
5. **The dev package gains a `cairnAccess` seam**, then the showcase's signups page adopts
   `createSectionAction`.
6. **Every breaking family fix rides the release cut** as one `Consumers must:` list: the
   cheap renames, the outcome grammar, the log vocabulary, the route-factory arity, and the
   seven noun-first functions including `githubApp`.
7. **Busy idiom, ruled as architecture.** Three named shapes, each with a semantic reason. A
   short round trip on a control that stays on screen takes native `disabled` plus an
   always-mounted status region announcing the outcome. A long operation with progress
   replaces the control with a status panel. A guarded control, available in principle but
   refused with a reason, keeps `aria-disabled` with the `cairn-btn-guarded` marker so its
   tooltip survives. `ShareLinkPanel` converges on the first shape.
8. **OfficeList retires.** `AdminTable` is the sole scroll owner. The extend track's custom
   screen example composes `PageHeader` beside `AdminTable`, the composition every shipped
   screen already uses. A new ruling row supersedes the closed `audit-admin-officelist` row.
   The removal is a `Consumers must:` line in polish-C.
9. **Three passes.** Polish-A (engine and admin, non-breaking), polish-B (docs), polish-C (the
   breaking window and the cut). A and B run in parallel; C waits for both.

## Dispositions of the routed inventory

Each routed item lands in a named pass or retires here with its reason.

| Item | Disposition |
|---|---|
| Engine `src/lib/components/*.svelte` Svelte lint wiring | Polish-A |
| `ShareLinkPanel` busy idiom | Ruled (decision 7); polish-A converges the component and writes the rule into the design system |
| `OfficeList`/`AdminTable` scroll ownership | Ruled (decision 8); polish-C removes the export, polish-B rewrites the example, the ruling row lands with polish-C |
| `formatTimestamp` accept-set widening | Polish-A |
| Command palette live region and roving focus | Polish-A, as the full combobox recipe (A4) |
| `logCommitFailed` call-style split | Polish-A, inside the media split |
| `createSectionAction` adoption on signups | Polish-A, after the `cairnAccess` seam |
| The showcase's single-theme identity | Retired: a recorded boundary observation, never a defect; the chassis spec carries the record |
| The root 404 baseline | Landed in chassis-B1 Task 2; retired |
| The second-menu editing consultation | Retired from the ledger; stays a consultation candidate in ROADMAP's Later tier until a consuming site asks |
| `.cairn-card` no-real-use | Recorded in the B1 harvest; no action |
| The front-door landing | Polish-B (decision 4) |
| The full-surface sweep mandate | Executed during planning; the three records are the evidence |
| Ambient-defaults floor recalibration | Out; needs consumer measurement access the repo lacks; ROADMAP line stays |
| `content-routes-media.ts` monolith | Polish-A (decision 3) |
| `content-routes-entry.ts` monolith | Polish-A (decision 3) |
| `edit-page-state-reset-coverage.test.ts` generic-comma regex gap (internals-B carry) | Polish-A, one test fix |
| Release gate, one cut after polish | Polish-C's last step through `cairn-release` |

## Polish-A: engine and admin, non-breaking (slice 11)

**Shape.** Engine runtime code, the admin components, the dev package, the showcase's admin
routes, and the tests. `check:surface` unchanged except where a task says otherwise (none
do). Every change is additive or internal. Reference pages change only where a JSDoc one-liner
or a member doc changed the shipped `.d.ts` text, and `check:reference:signatures` proves
nothing else moved.

**Scope, grouped as the plan's tasks will be.**

1. **The entry split.** `content-routes-entry.ts` becomes four sibling modules along the
   sweep's seams (read: `createAction`, `editLoad`, `historyLoad`; write: `saveAction`,
   `publishAction`, `publishAllAction`, `discardAction`; destructive: `deleteAction`,
   `listDeleteAction`, `renameAction`; revert: `revertAction`), each with the private helpers
   only it uses, `BUILTIN_FRONTMATTER_KEYS` in the shared module, `content-routes.ts` keeping
   its literal merge key order, the type re-exports re-sourced, the seven engine-internal
   importers repointed. `check:surface` byte-identical. The `DeleteRefusal` rename (F1) rides
   this task since the type moves anyway.
2. **The media split.** The same for `content-routes-media.ts`: library read, ingest, delete
   and orphans, metadata rewrite, plus `content-routes-media-shared.ts` for the module-level
   primitives. `MediaDeleteRefusal` and `BulkDeleteSkip` renamed (F1). The `logCommitFailed`
   call at the old `:668` converges on the module import.
3. **The shell's keyboard blockers (A1, A2, A14, A24, A25).** The editor's chord handler stops
   propagation for every chord it consumes and the shell's window handler yields on
   `defaultPrevented` and on editable targets, so Ctrl+B no longer toggles the drawer while
   bolding. The drawer toggle becomes a real button with `aria-expanded` and `aria-controls`,
   the checkbox kept as the CSS mechanism. The palette trigger carries `aria-haspopup="dialog"`,
   results key on the command label, the dialog and its input take distinct names.
4. **The command palette as a combobox (A4).** `role="combobox"`, `aria-expanded`,
   `aria-controls`, `aria-activedescendant`, arrow traversal, Enter acting on the active
   option, an `aria-live` result count and a live "No matches", in the shape `MediaPicker`
   already implements. The ROADMAP polish bullet's "own live region" item closes here.
5. **Pressed state and focus (A3, A6, A16).** `segmentTintClass`'s ring raised to the
   already-locked 55 percent mix, re-measured, with the density toggle given a check glyph if
   the ring alone still fails 1.4.11; `scroll-margin-bottom` for the fixed bottom bar;
   `MediaHeroField`'s dropzone on `outline-hidden` with the sheet's own 2 px ring.
6. **Live regions and the busy idiom (A5, A7, A19, A26, A27).** The five conditionally mounted
   `role="status"` regions hoisted and content-gated. `ShareLinkPanel` on native `disabled`
   for busy, the guarded marker dropped, the Clipboard-absent path selecting the field. The
   login page's misplaced status role removed. The three busy shapes written into
   `admin-design-system.md` as a named recipe with the rule's reason.
7. **Chip vocabulary and the SSR flash (A8, A15).** The desk band's publish-state pill routed
   through `StatusChip` so the three states render one vocabulary; the narrow-width
   composition resolved at SSR from a server-read hint, or both branches rendered and
   disambiguated by `hidden` and `inert`, whichever the implementer proves flash-free.
8. **Small admin conformance (A17, A18, A20, A21, A22, A28, A30).** The login page's bracketed
   var and inline style onto tokens; the escape-hatch link underlined at rest; the redundant
   `aria-label` removed; decorative glyphs `aria-hidden`; `scope="col"` on sortable headers;
   the shell's body-margin style scoped to the admin root; the reduced-motion rule reaching
   the theme root. A21's glyph sweep is enumerated by grep at dispatch.
9. **The signups exemplar (A9 to A13) and the `cairnAccess` seam.** The dev package's handle
   attaches `locals.cairnAccess` resolved from the dev owner session in the engine's shape;
   the showcase's signups page adopts `createSectionAction` with an access map admitting the
   same role set as today's `requireOwner`; the page takes the stacked label register, a
   per-row `aria-label` on Delete, a confirm through `DeleteDialog`, `flex-col sm:flex-row`
   composition proven at 320 and 390 by render, and a `role="status"` region for both actions.
   `templates/waymark` re-emitted.
10. **Engine Svelte lint wiring.** `eslint.config.js`'s `svelte-eslint-parser` block reaches
    `src/lib/components/**/*.svelte`; findings fixed to the same standard chassis-A applied to
    the showcase; `check:comments` green. A finding count past what one task absorbs splits
    the task, never the standard.
11. **Non-breaking export residuals (F2, F4, F5, F6, F8, F9, F10).** The `/sveltekit` barrel
    either re-exports `PublicRoutesConfig` and `EntryData` with the usual per-name reason or
    names the two documented exceptions; the `createSiteIndexes` doc stops pointing at an
    internal symbol; six paraphrase one-liners state the contract; `EntryData` and
    `MediaEntry` members documented with the reason each projection exists; the false
    "every content action" claim corrected with `RevertFailure` named; `/delivery/head` on the
    reference README; `render.md` retitled to what the subpath holds.
12. **Two small engine items.** `formatTimestamp` accepts the no-seconds variant, the basic
    offset form, and lowercase `z`; the state-reset coverage test's declared-state regex
    matches a generic comma.
13. **Records.** `docs/internal/engine-rulings.md` gains the busy-idiom ruling row; ROADMAP's
    polish bullet loses every item polish-A landed; CHANGELOG under Unreleased; the friction
    log triaged whole; HISTORY entry; STATUS present tense.

**Gate.** The engine gate plus the showcase e2e (`npm run check`, `npm test` exit 0,
`check:comments`, `check:reference`, `check:reference:signatures`, `check:surface` unchanged,
`check:package`, `check:docs`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:template`, `check:consumers`, the create-cairn-site suite, `CI=1` showcase e2e with
every baseline unchanged). Pass end fans out `svelte-reviewer`, `daisyui-a11y-reviewer`, and
`web-auth-security-reviewer` (the seam and the section action touch authorization).

**Render proof.** Three admin findings rest on token arithmetic (A3, A12, A16). Their tasks
end with a render at the named widths in both schemes and a read of the tiles, using the
chassis-B capture tool against the showcase's admin routes, and the reviewer names the tiles
read.

## Polish-B: docs (slice 12)

**Shape.** The four published tracks, `why-cairn.md`, `README.md`, and the writer-facing
figure copy. No engine code except two product-copy strings the editors track exposed (D11,
D12), which are engine `.svelte` and `.ts` string changes with no behavior change; their
transcripts and editor quotes re-verified through `check:editor-quotes`. Docs-only gate
otherwise.

**Scope.**

1. **Money and prerequisites (D1, D2).** Workers Paid becomes a second-editor cost in
   `before-you-start.md`, `create-your-site.md`, `own-your-domain.md`, and `why-cairn.md`, and
   the invite prerequisites become three. `packages/create-cairn-site`'s `money.mjs` preamble
   checked for the same claim and aligned if it states the first-deploy form.
2. **The doctor transcript (D5, D6, D10, D27).** `03-doctor-credentialed.txt` and
   `02-doctor-bare.txt` re-recorded against the current tool; "three zone-derived checks"
   becomes two; the troubleshooting step names the printed title; the fifth condition joins the
   router; the three-paragraph staleness disclosure deleted. `check:transcripts` green.
3. **Extend-track correctness (D3, D4, D7, D8, D9, D13, D14, D19, D28).** The fragments guide
   declares its title field; preconditions stated on the three pages lacking them; the CSRF
   check claim corrected; the scaffold tree lists the test files; the migration count and the
   nonce migration corrected; `ORIGIN` against `PUBLIC_ORIGIN` in one sentence; the audit
   migration's directory distinction front-loaded. `check:snippets` green.
4. **Extend-track shape (D15, D17, D18).** `**Contract:**` on every task guide; "adapter"
   used only in the track's defined sense; the README's vocabulary placed before its first
   use.
5. **Reference conformance (D22, D23, D24, D25, D29, F7).** `## Types` last on `render.md`;
   `## Exit codes` on the manifest CLI page; six second-person sentences recast; the contrast
   frame and the two "simply" removed; one section grammar for export-keyed pages with
   `check:reference` asserting a `## Types` section wherever the subpath exports types.
6. **Editors track (D11, D12, D30).** The two conflict refusals lose "Reload" in engine copy
   and the doc simplifies; "post" becomes "entry" in the vocabulary page and
   `VocabularyAdmin.svelte`; the README's arrival sentence describes the section.
7. **Admin track vocabulary (D26).** "concepts" out of operator prose.
8. **The front door (decision 4, D16, D21).** Section A of the proposal lands as
   `docs/why-cairn.md` with the cost correction; the README and cairn.pub forms from Section
   B; the concept figure on the front door and the anatomy figure on the architecture page
   with their alt, caption, and text alternative; the two writer-facing `assets/*.md` files
   move to `docs/internal/figures/` so the published arm ships only reader pages;
   `check:arm-indexes` and `check:figures` green; "two sites" reconciled with the four
   production consumers.
9. **The custom-screen example (decision 8).** `add-a-custom-admin-screen.md` and the
   `CustomScreen` reproduction compose `PageHeader` beside `AdminTable` with no `OfficeList`,
   ahead of polish-C's removal, so the doc never teaches a retired export.
10. **Records.** The docs friction log triaged whole; ROADMAP's front-door and docs items
    closed; CHANGELOG; HISTORY; STATUS.

**Gate.** `check:docs`, `check:vale`, `check:reference`, `check:reference:signatures`,
`check:snippets`, `check:transcripts`, `check:editor-quotes`, `check:arm-indexes`,
`check:figures`, `check:rulings-format`, plus `npm run check` and the targeted component tests
for the two copy changes. Pass end runs `prose-voice-reviewer` and `cairn-register-editor` over
the front door, and the `docs-register.md` no-pitch keystone is the acceptance bar.

## Polish-C: the breaking window and the cut (slice 13)

**Shape.** Every rename and removal the family read found, in one branch, with one
`Consumers must:` list, the scaffolder and the migration notes updated in the same pass, and
the release cut through `cairn-release` as its last step. Nothing else joins: a non-breaking
fix found during C goes to a follow-up line, never into the window.

**Scope.**

1. **Route-factory arity (F16).** One shape, `(runtime, config = {})`, across
   `createAuthRoutes`, `createEditorRoutes`, `createPublicRoutes`, `createContentRoutes`,
   `createCairnAdmin`, `createNavRoutes`, and `createMediaRoute`; factories that need no
   runtime accept it optionally in the bag. The convention row `convention-parameter-bags`
   amended to carry arity.
2. **Bags and load data (F17, F14).** `AuthGuardOptions`, `RendererOptions`,
   `FieldsetOptions` to `*Config`; `NavLoadData` and `VocabularyLoadData` to `NavData` and
   `VocabularyData`. The factory-`Config` versus per-call-`Options` split written into the
   parameter-bags ruling row.
3. **Verbs and codecs (F3, F20, F21).** `serializeManifest` to `formatManifest` and
   `parseManifest` published beside it on `.`; `deriveExcerpt` and `diffNewlyPublished` onto
   `build`; the seven noun-first functions renamed (`cookieName`, `githubApp`, `adminAction`,
   `previewMint`, `previewRevoke`, `previewLoad`, `healthLoad`) with verb-first names the
   plan fixes at authoring time against `convention-verb-rules`. The scaffolder's
   `finalize.mjs` pinned `githubApp({...})` literal, its tests, the template, and the
   showcase follow in the same task.
4. **Outcomes (F18, F19).** `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`,
   and `RevertFailure` onto the `{ outcome }` grammar as `*Outcome`; `EditorRow` collapsed
   onto `Editor` through `Omit`, under a name in the family's vocabulary. The outcome-idiom
   ruling row's scope widened from "this pass introduces" to the whole surface.
5. **Log vocabulary (F11, F12, F13).** Two verbs for a refusal and a fault, the publish
   events in one area, `taxonomy` folded into `content`, one area and verb for the audit
   sink, the four-segment name flattened, the verb table in `events.ts`'s header,
   `log-events.md` regenerated.
6. **OfficeList removed (decision 8).** The export, the component, its reproduction story,
   and its reference section go; `AdminTable`'s wrapper is the one scroll owner; the new
   ruling row supersedes `audit-admin-officelist` and names the evidence (zero production
   callers, the double container).
7. **`createMediaRoute` recorded (F15).** The singular name and bare handler stay under the
   interop carve-out; one sentence in the `/sveltekit` barrel records why, so the next read
   does not re-file it.
8. **The consumer list and the cut.** `CHANGELOG.md`'s Unreleased entry carries one
   `Consumers must:` line per break; `docs/extend/migration-notes.md` gets the window's entry;
   `docs/internal/api-surface.md` regenerated and committed; every reference page and extend
   guide grep-swept for each old name; `check:snippets` green against the built package;
   `ROADMAP.md`'s audit-remediation entry closes; the four consumer sites' upgrade is named in
   STATUS as the next action; then `cairn-release`.

**Gate.** The full engine gate with `check:surface -- --update` committed, `check:snippets`,
the create-cairn-site suite, the from-scratch showcase e2e, and a scaffold proof against the
packed tarballs. Pass end fans out all four reviewers; the security reviewer reads the auth
renames.

## Sequencing and budgets

Polish-A and polish-B branch from `main` after the identity seam and chassis-B2 merge, so the
family read's assumptions hold (the identity seam adds an `AuthGuardOptions` member polish-C
renames with the bag). They run as two chains in one `pass-execute-chains` workflow with
separate worktrees; the contended resource is the reference pages, which A touches only
through generated signature text and B through prose, and the merge order is A then B with B
rebased. Polish-C branches from `main` after both merge.

Ceilings: polish-A 6M tokens, polish-B 4M, polish-C 5M, checkpoint every four tasks.
Attended time is one plan review per pass plus the C consumer list read; polish-B's front
door is Geoff's read on the PR.

## Risks

- **The monolith splits move a lot of text.** Mitigation: `check:surface` byte-identical is
  the acceptance, and each split is one commit per cluster so a reviewer diffs moves, not
  edits.
- **The admin sweep never rendered.** Three findings rest on arithmetic. Mitigation: their
  tasks end with a render and a tile read; a finding the render refutes retires with the
  tile named.
- **The lint wiring's finding count is unknown.** Mitigation: the task states an expectation
  and splits itself, never the standard, if the count exceeds one task.
- **The breaking window touches every consumer route file.** Mitigation: one list, one
  release, the four sites named in STATUS as the next action, and `check:snippets` against
  the built package as the documentation proof.
- **The verb-first names for seven functions are the one taste call the plan makes.**
  Mitigation: the plan proposes each name against the ruled verb vocabulary and Geoff reads
  the list at plan review.
- **Product copy changes ride a docs pass.** Mitigation: polish-B's two string changes run
  the component tests and `check:editor-quotes`, and the transcripts are re-recorded in the
  same pass.
