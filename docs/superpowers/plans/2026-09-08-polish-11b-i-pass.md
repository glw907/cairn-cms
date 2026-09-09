# Polish-11b-i Pass Implementation Plan (audit remediation, slice 11b-i: the design system and the engine admin surface, non-breaking)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential), launched as TWO
> workflow runs; see Execution. Steps use checkbox syntax for tracking. Every anchor is
> re-verified at dispatch against the branch HEAD, per the Reconciliation block below.

**Goal:** the admin's two keyboard blockers cleared, the command palette a real combobox, the
pressed-state cue raised above the non-text contrast floor, the busy idiom ruled in the design
system and the one defector converged onto it, the live regions always mounted, the desk band on one
chip vocabulary with no first-paint composition swap, the login page off its bracketed var and
inline style, and the small conformance sweep closed across the engine's admin components.

**Spec:** `docs/superpowers/specs/2026-09-08-polish-passes-design.md`, revision 4, section
"Polish-11b", with the Decisions block (5, 7, 8, 9, 11), the Dispositions table, "Sequencing and
budgets", and "Risks". **The spec's "Polish-11b" section is executed by two passes, this one and
polish-11b-ii.** This pass carries the spec's tasks 1 through 8 (the design system and the engine
admin surface). Polish-11b-ii carries the spec's tasks 9 through 12 (the `cairnAccess` seam, the
signups exemplar, `formatTimestamp`, and the records). Geoff ruled the split on 2026-09-08 at the
draft plan's run-two boundary.

**Folded 2026-09-08** from the three-lens adversarial plan review of the unsplit draft (records
under `docs/internal/record/2026-09-08-polish-inputs/`: `plan-11b-review-coverage.md`,
`plan-11b-review-executor.md`, `plan-11b-review-sequencing.md`; disposition per finding, with the
half it landed in, in `plan-11b-review-fold.md`).

**Inputs:** the admin sweep `docs/internal/record/2026-09-08-polish-inputs/admin-sweep.md` (A1 to
A30) and the design system `docs/internal/admin-design-system.md`. No finding from
`docs/internal/record/2026-09-08-polish-inputs/exports-sweep.md` routes to either 11b half; F1
through F21 land in 11a or in polish-C or defer, which the Reconciliation block records as a checked
absence rather than an omission.

**Task count:** eleven. Ten are the unsplit draft's Tasks 1 through 10, renumbered 1 to 10 with no
work added or removed. Task 11 is this half's own records task. **Why this half gets its own records
task rather than handing its records to 11b-ii:** 11b-i merges to `main` on its own, ahead of
11b-ii's branch, and the repo's ledger rule makes a merged pass with no `docs/HISTORY.md` entry and
with shipped ROADMAP items still listed a defect on `main` rather than a carry-forward. Two of the
four ROADMAP polish sub-bullets the unsplit draft closed are this half's (the `ShareLinkPanel`
busy-idiom ruling and the command palette's own live region), and a pass that did not ship them
should not be the one that closes them. The measurements a later pass would otherwise re-derive
(the 27-line bracketed fill-tone population, `segmentTintClass`'s six callers, the desk band's
attribute-driven SSR composition, and the design system's shifted anchors) are all this half's, and
they are worth the least the longer they sit unrecorded.

The three spec-task splits the draft made are preserved here, with no work added or removed. The
spec's task 1 (the shell's keyboard blockers) is Tasks 2 and 3, cut at the boundary between the
keyboard defects (A1, A2) and the palette's attribute conformance (A14, A24, A25). The spec's task 6
(chip vocabulary and the SSR flash) is Tasks 7 and 8, because its two deliverables are two unrelated
subjects in one file, one of which overturns a written in-code decision and needs its own reviewer
read. The spec's task 4 (the design system) moves from fourth position to first, since it is
doc-only and it corrects eight references to a component that does not exist; every later
implementer reads that document, so the correction is worth the most when it lands first. The spec's
own ordering constraint is preserved and strengthened: the busy rule exists before the code
converges onto it.

**Token ceiling:** 7.0M, superseding the unsplit draft's 7.5M for a sixteen-task shape and the
spec's 5.5M for a twelve-task shape. The arithmetic, with every line item named rather than folded
into a per-task band:

| Line item | Basis | Tokens |
|---|---|---|
| Eleven task chains | eleven gate-bearing units at the measured band's middle of about 450K | 4.95M |
| Re-dispatch reserve | two fix rounds, each a second implementer dispatch plus a second Opus review, about 0.6 of a unit | 0.55M |
| Pass-end `visual-verifier` | chassis-B1's measured rate, about 0.5M, over a bounded capture set | 0.5M |
| Reviewer fan-out | `daisyui-a11y-reviewer` and `svelte-reviewer`, plus `code-simplifier` over the pass's commits | 0.7M |
| Conductor CI regen waits and the render proof | one mid-chain regen, the pass-end regen, and Task 5's crop read | 0.3M |
| **Total** | | **7.0M** |

The band is the risk lens's measurement for this repo, 370K to 530K per task over four comparable
passes (conventions 4a about 530K, conformance 4b about 430K, chassis-A about 367K, internals-B
ceiling 8M over fourteen tasks with the spend unrecorded). The band's middle rather than its floor is
the right pick even though these tasks are smaller in code than 11a's monolith splits, because the
per-task cost here is dominated by the gate transcript and the reviewer turn, and both are the same
size for a three-line markup edit as for a module move. The repo's recorded overrun history is four
for four on the last comparable passes (`docs/HISTORY.md:343-344`, `:386`, `:448-449`, `:547`), so at
80 percent of the ceiling the conductor finishes the task, writes STATUS, and asks one combined
question.

**Checkpoint interval:** every four tasks, at 4 and 8, each writing STATUS (task ledger, decisions
taken, spend against the ceiling, next task). The run-one to run-two cut after Task 5 is a third de
facto STATUS write, and the pass close is a fourth.

**Execution:** sequential, one chain, in one worktree: `.claude/worktrees/polish-11b-i` on branch
`polish-11b-i`, branched from `main` after polish-11a merges. No parallel chains: the single
end-to-end slot, `CHANGELOG.md`, `docs/internal/engine-rulings.md`, and the one
`admin-visual.spec.ts-snapshots` directory are all contended. Open the PR after Task 1's commit.

**11b-i consumes nothing 11a produces in code.** It needs a clean base plus two things 11a leaves
behind, neither of them a dependency in the build sense. First, 11a's Task 10 widens
`eslint.config.js`'s `.svelte` glob to `src/lib/components/**/*.svelte` with `tsdoc/syntax` at
error, so from 11a on every comment this pass writes in an admin component fails `check:comments`
unless it is TSDoc-clean. This pass is eleven tasks of admin-component work, so this is the
constraint most likely to surprise it. Second, 11a reopens about fifteen files under
`src/lib/components/`, including `ShareLinkPanel.svelte`, which Task 6 rewrites, and
`CairnMediaLibrary.svelte`, which Tasks 5 and 10 touch. The passes are sequential, so each is a
re-read rather than a conflict. **`VocabularyAdmin.svelte` is 11a's, not chassis-B2's**, and this
pass touches it in no task: its only reach here is Task 9's read anchor at `:179`
(`cairn-text-success` as an existing adopter), and 11a's Task 7 rewrites eleven copy lines from
`:162` through `:347`, which brackets it, so Task 9 re-locates that adopter by grep rather than by
line.

**The chain runs as TWO workflow runs.** `pass-execute-chains.js` has no mid-run pause hook, and
the run that moves paint hands its baselines to a conductor CI regen. Run one is Tasks 1 to 5 and
run two is Tasks 6 to 11. Between the runs the conductor runs
`gh workflow run e2e.yml --ref polish-11b-i -f update_snapshots=true`, waits for it, pulls the
regenerated baselines into the worktree, and reads the CI diff against Tasks 2 to 5's
`INTENDED MOVES:` declarations. Run two's first act is to re-verify Task 6's anchors against the
pulled head. Run two's paint tasks (6 to 10) are covered by the pass-end regen, which is why Task 11
is ordered last: it is paint-neutral, so the run ends clean.

**Pre-dispatch, before run one.** All four are preconditions, not task steps, and none is true at
plan authoring:

1. Commit this plan onto `polish-11b-i`. The workflow's implement prompt names the plan as committed
   in the repo and orders a first read of its Global constraints, Ruled inputs, and Task section;
   an untracked plan means eleven dispatches that cannot follow instruction one.
2. Create the worktree `.claude/worktrees/polish-11b-i` on `polish-11b-i` off post-11a `main`.
3. Run a from-scratch `npm install` in that worktree's `examples/showcase`. A worktree's
   `examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:`
   deps to `main`'s build, so without the reinstall the e2e proves `main`'s engine rather than this
   branch's components.
4. Amend the spec's Sequencing ceiling line (both 11b halves and the new total, nothing else) in the
   same commit as the plan. Polish-11b-ii's plan does not re-amend it.

---

## Reconciliation at dispatch

Every `file:line` below is quoted as the sweep or the spec states it, with the value measured on
`main` at `f944ca4e` beside it. **Anchors are re-verified at each dispatch against the branch HEAD,
not against the branch point.** Two forces move them. Polish-11a merges between this plan's
authoring and this pass's branch and reopens about fifteen of the files this pass edits. And this
pass moves its own anchors: Task 1 inserts prose into `docs/internal/admin-design-system.md`, Task 2
edits `EditPage.svelte` above Task 7's and Task 8's anchors, and Task 7 wraps the narrow pill above
Task 8's anchors. Tasks 5, 7, 8, 9, 10 and 11 are therefore tasks whose anchors a predecessor inside
this same pass has already moved, and each re-measures rather than trusting the table.

### Line anchors

| Sweep or spec anchor | Measured at `f944ca4e` | Note |
|---|---|---|
| A1: `CairnAdminShell.svelte:254-262` (the window chord handler) | `onKeydown` opens at `:255`, the drawer toggle at `:258`, `openPalette()` at `:262`, the handler closes at `:264` | Drifted by 1 at the open |
| A1: `EditPage.svelte:1276-1294` (`onEditorKeydown`), attached at `:1272` | The function opens at `:1276` and closes at `:1295`; the attaching `$effect` runs `:1270-1275` with `addEventListener` at `:1273` | The attach anchor drifted by 1 |
| A1: `CairnAdminShell.svelte:497-503`, `:606` (the overlay focus and inert pair) | The drawer-content `inert={isDrawerOverlay}` is at `:610`; the focus effect sits inside `:497-545` | The inert anchor drifted by 4. Locate with `grep -n "inert={isDrawerOverlay}"` |
| A1: `editor-shortcuts.ts:27` and `:35` (Ctrl K named twice) | "Web link" `Ctrl K` at `:29`; "Command palette" `Ctrl K (global)` at `:36` | Drifted by 2 and 1 |
| A2: `CairnAdminShell.svelte:635` (the Open menu label), `:593-601` (the checkbox), `:814` (the Close menu label) | `:635`, `:594-601` with its comment opening at `:590`, and `:814` | The checkbox anchor drifted by 1 at the open |
| A3: `segmented-control.ts:16-20` | **The `//` header runs `:1-6`, the TSDoc block runs `:8-15`, `segmentTintClass` opens at `:16`, and the active string with `ring-base-content/20` is at `:18`** | The draft plan's own `:8-16`, `:17`, `:19` were each off by one and are corrected here (coverage finding 11) |
| A3: `CairnTidySettings.svelte:329,334`, `TidyReview.svelte:277` (callers that also render a glyph) | All three confirmed | No move |
| A3: `CairnMediaLibrary.svelte:608-609,690-695` (the icon-only density toggle) | `densityButtonClass` opens at `:608` with `segmentTintClass` at `:609`; the toggle group runs `:689-696` with the two buttons at `:690` and `:693` | Confirmed within one line |
| A3: two further `segmentTintClass` callers the sweep does not name | `EditPage.svelte:477` and `:482` | New measurement. Task 5's paint reaches the edit page because of these two |
| A4: `CairnAdminShell.svelte:721-732` (the palette input), `:744-773` (the results), `:775` (No matches), `:412-414` (`submitPalette`) | The dialog opens at `:726`, the input at `:730-740` with its `aria-label` at `:733`, the results `<ul>` at `:748`, the `{#each}` at `:749`, the No-matches `<p>` at `:775`, and `submitPalette` at `:394` | Drifted by about 5 in the markup and by 18 for `submitPalette` |
| A4: `MediaPicker` as the family's own combobox | Confirmed in the component: `role="combobox"` `:194`, `aria-expanded` `:198`, `aria-controls` `:199`, `aria-activedescendant` `:200`, the results-count region `:207`, the narration region `:211`, the always-rendered-listbox reason `:213-215`. In the design system, under **`## Component recipes`**, the bullet opening `**Media: the combobox picker (`MediaPicker`).**` | New measurement. Task 4 copies this shape |
| A5, A27: `ShareLinkPanel.svelte:184`, `:193`, `:183`, `:192` | `aria-disabled` at `:184` and `:193`, `cairn-btn-guarded` at `:182` and `:191`, `class:cursor-not-allowed` at `:183` and `:192`. The comment the task rewrites opens at `:176` and itself contains the string `aria-disabled` | The marker anchors drifted by 1; the comment's own `aria-disabled` is new and load-bearing on Task 6's acceptance |
| A5: `EditPage.svelte:1576-1578` (the rule in prose) | "Native disabled is reserved for" is at `:1576` | No move |
| A6: `cairn-admin.css:631-633` (the scroll-margin rule) | The comment runs `:628-630`, the selector is at `:631`, `scroll-margin-top: 5.5rem` at `:632`, the close at `:633` | No move |
| A6: `EditPage.svelte:2303-2306` (the fixed bottom bar) | The `{#if !prefs.zen && narrow}` gate is at `:2303` with its comment at `:2300-2302`, and the fixed class at `:2306` | No move. **The gate has two conditions**, which Task 8 preserves by name |
| A7: `MediaUploadDialog.svelte:264`, `MediaHeroField.svelte:496`, `MediaReplaceDialog.svelte:421`, `CairnTidySettings.svelte:347`, `NavTree.svelte:134` | All five confirmed | No move |
| A7: the two correct recipes, `EditPage.svelte:1751-1754` and `ShareLinkPanel.svelte:214-217` | `ShareLinkPanel`'s always-mounted region runs `:224-228`; `EditPage`'s sits near `:1751` | The ShareLinkPanel anchor drifted by about 10. Locate by the comment text |
| A8: `EditPage.svelte:836-840` (the `statusBadge` map), `:1413`, `:1423`, `:1425` | The map runs `:836-840` with `badge-warning` at `:837`, `badge-info` at `:838`, `cairn-chip-quiet` at `:839`; the narrow pill at `:1413`, the wide pill at `:1423`, `badge-neutral` at `:1425`. **A fourth site, `:832`, is a comment carrying `badge-warning/badge-info`** as the rationale this task overturns | The comment at `:832` is new and load-bearing on Task 7's acceptance grep |
| A8: `ConceptList.svelte:428-430` and its comment at `:423-427` | Confirmed | No move |
| A14: `CairnAdminShell.svelte:676-690` (the palette trigger), `:700` (the sibling that has `aria-haspopup`) | The trigger runs `:676-688` with no `aria-haspopup`; the Publish-site trigger with `aria-haspopup="dialog"` is at `:692` | The sibling anchor drifted by 8 |
| A15: `EditPage.svelte:869-878` (`narrow` and its effect), `:1567` (the wide branch) | `let narrow = $state(false)` at `:869`, the effect `:870-877`, its rationale comment `:865-868`, and the `{#if !narrow}` branch at `:1560` with its comment `:1561-1566` | The branch anchor drifted by 7 |
| A16: `MediaHeroField.svelte:450` | Confirmed. The class attribute carries `focus-visible:outline-none`, `focus-visible:ring-1`, `focus-visible:ring-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`, **and a fourth utility, `focus-visible:border-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`** | The third and fourth utilities are new. The three `outline`/`ring` utilities go; the border utility is a color recolor, not an indicator, and stays, since the sheet's 2px outline is the indicator either way and Task 5's computed-style assertion proves it regardless |
| A16: the three call sites already on `outline-hidden` (`MediaPicker.svelte:195`, `CairnMediaLibrary.svelte:747`, `ComponentInsertDialog.svelte:420`) | Confirmed | No move |
| A16: the sheet's own focus rule | `cairn-admin.css:566-569` is `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` | **New measurement, and it settles A16.** The sheet's rule is an OUTLINE, not a ring |
| A17: `LoginPage.svelte:78` (`text-[var(--color-success)]`), `:79` (the inline style) | `:107` and `:108` | Drifted by 29 |
| A18: `LoginPage.svelte:97-103` (Use a different email) | The button runs `:123-129` with `text-primary hover:underline` at `:125` | Drifted by 26 |
| A19: `LoginPage.svelte:79-104` (the `role="status"` block), conditionally mounted at `:76` | The `role="status"` div is at `:104`, its branch gate at `:101`, its own comment at `:102-103`, the block closes at `:130`. **The comment at `:133-136` belongs to the sign-in-form branch's message panels, not to this block** | Drifted by 25, and the comment target is corrected (coverage finding 6) |
| A20: `LoginPage.svelte:150` (the redundant `aria-label`), the visible label at `:145-146` | `aria-label="Email"` at `:172`; the label opens at `:165` with the visible `<span>Email</span>` at `:166` | Drifted by 22 and 20 |
| A17 companion: the third bracketed var in `LoginPage.svelte` | `rounded-[var(--radius-field)]` at `:116`, a radius token no step in this pass touches; and four `font-[family-name:var(--font-display)]` sites at `:81`, `:95`, `:112`, `:133` | New measurement. Task 9's acceptance grep is scoped to the fill tone because of these |
| A21: the roughly 25 bare Lucide glyphs | **26 lines carrying 29 glyph tags**, enumerated in Task 10's Files block. Three lines carry two glyphs each in an `{#if}`/`{:else}` pair: `CairnAdminShell.svelte:705`, `CairnMediaLibrary.svelte:1170`, `MediaReplaceDialog.svelte:365`. `CairnLogo.svelte:21` sets its own and is a false positive, as the sweep says; `CairnAdminShell.svelte:892` is also a false positive, since its `aria-hidden` sits on `:894` of a multi-line tag; `LoginPage.svelte:85,92` are now `:110` and `:117` | The sweep's list is otherwise exact. The 29-tag figure supersedes the executor lens's 28, which missed `CairnMediaLibrary.svelte:1170` |
| A22: `ConceptList.svelte:370`, `:381`, `:394`, `:395` (the sortable headers) | `:370`, `:383`, `:395`, `:396`. **Only `:370` (Title) and `:383` (Date) carry `aria-sort`; `:395` (Status) and `:396` (Actions) are not sortable and never carried it** | Three of four drifted by 1 to 2, and the sweep's own "keep their `aria-sort`" wording is corrected here (coverage finding 5) |
| A24: `CairnAdminShell.svelte:746` (`{#each ... (i)}`) | `:749` | Drifted by 3 |
| A25: `CairnAdminShell.svelte:717`, `:724`, `:726` (the three shared names) | The dialog `aria-label` at `:726`, the input `aria-label` at `:733`, the placeholder at `:734` | Drifted by 9, 9, and 8 |
| A26: `ShareLinkPanel.svelte:129` (the Clipboard short-circuit), its comment | `navigator.clipboard?.writeText(url)` at `:127`, the select fallback at `:133`, `copyShareUrl()` opening at `:124`. **The comment that already promises the fallback is at `:121-123`, above the function, not at `:124-126`** | The comment anchor is corrected (coverage finding 12) |
| A28: `CairnAdminShell.svelte:553` (the injected body style) | Confirmed at `:553`, inside a `<svelte:head>` closing at `:554`, with its rationale comment above opening at `:548` | The comment's open drifted by 2 |
| A29: the eight `AdminLayout` references at `:128`, `:135`, `:532`, `:543`, `:565`, `:1001`, `:1005`, `:1184` | All eight confirmed, exactly | No move. `grep -n AdminLayout docs/internal/admin-design-system.md` returns exactly those eight, so the spec's list is complete |
| A30: `cairn-admin.css:1111-1119` (the reduced-motion block) | The `@media` opens at `:1111`, the descendant-only selector pair at `:1112-1113`, the block closes at `:1119` | No move |
| Decision 8: the floating-card recipe | **The recipe's body is under `## Component recipes`, the bullet opening `**Floating card:** \`card-shell card-shadow\``, and the elevation pair it names is under `## The developer-facing vocabulary (the versioned seam)`, the bullet opening `**The theme-adaptive elevation pair**`** | The draft plan put the body at `:95`, which is a Load-bearing-rules bullet about borders and shadows. Corrected (sequencing finding 13). No task in this pass touches either; polish-C's task 1 does |
| `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` | Headings at `:7`, `:42`, `:233`, `:244`, `:286`; no `## Polish-11a` heading yet | 11a's Task 7 adds `## Polish-11a`; this pass adds `## Polish-11b-i` beneath it. If 11a's Task 7 did not add one, Task 2 adds only its own heading and says so |
| `examples/showcase/scripts/capture-surfaces.mjs`'s surface matrix | `const SURFACES` opens at `:59` today, and chassis-B2 has already landed an eleven-line addition above it (`4aac78db`), so any range anchor is stale. **Locate with `grep -n "const SURFACES" examples/showcase/scripts/capture-surfaces.mjs` and read the array from there** | New row (sequencing finding 9). The matrix itself is unchanged: `home`, `article`, `styleguide`, `archive2`, `error404`, `signups` |
| `scripts/checks/check-public-tokens.mjs` | Walks every `.svelte` under `examples/showcase/src` recursively and fails on a literal color or a hard-coded absolute font size. It is in `design.yml`, not in this pass's gate string | New row (sequencing finding 6). **No task in this pass edits a file it walks**, since this half touches no showcase route; it binds polish-11b-ii's signups tasks instead. Chassis-B2's Task 5 may have changed its shape, so 11b-ii re-reads it |
| `ROADMAP.md`'s polish sub-bullet | One prose bullet at `:342-361`, naming every polish item in sequence | Task 11 closes this half's two by name from within it |
| `docs/internal/docs-friction-log.md` | "None open." at `:25` (Live findings) and `:60` (Open findings) | Task 11 re-reads rather than assuming |

### Design-system anchors are located by section and quoted phrase, never by line

**Task 1 inserts prose into `docs/internal/admin-design-system.md` beside the guarded-button
passages, so every anchor below the first insertion point moves before Tasks 5, 9, 10 and 11 read
it.** The draft plan applied the by-slug discipline to `docs/internal/engine-rulings.md` and not to
the file its own first task rewrites. Global constraint 14 states the rule; this table is the
conversion, and the line numbers are informational only, measured before Task 1 runs.

| What a task cites | How to locate it | Line before Task 1 |
|---|---|---|
| The guarded-button passage the busy recipe sits beside | `## Component recipes`, the sentence opening "Otherwise it takes the guarded-button pattern" | `:547-551` |
| The second guarded passage (the Figure button's tooltip case) | `## Component recipes`, the sentence containing "DaisyUI 5.6 added `[aria-disabled=\"true\"]` to the `.btn` disabled selector" | `:843-849` |
| The reference-link recipe (Task 9) | `## Component recipes`, the sentence "A reference link (Markdown help) is a borderless underlined button, not a control." | `:574-576` |
| The 55 percent ring precedent (Task 5) | `### Help surfaces`, the sentence opening "The unchecked step-box ring is `color-mix(in oklab," | `:1013` |
| The `th scope="col"` precedent (Task 10) | `### Help surfaces`, the phrase "a real `<table>` with `th scope=\"col\"` and `th scope=\"row\"`" | `:1015` |
| The host-elements rule (Task 10) | `## Load-bearing rules (break these and the admin renders wrong)`, the bullet about the admin never resetting the host's elements | `:108-111` |
| The measured 20 percent and 55 percent contrast figures (Task 5) | `## Tokens (Warm Stone)`, the bullets **Unchecked checkbox/radio edge (2026-08-27)** and **Unfocused `.input`/`.select`/`.textarea` edge (2026-08-27...)**, which carry 1.492:1 light / 1.773:1 dark and 3.586:1 light / 4.959:1 dark | `:222-238` |
| `cairn-text-success` and `--color-positive-ink` (Task 9) | `## Tokens (Warm Stone)`, the bullet opening "`--color-positive-ink` is the green counterpart" | `:213-221` |
| The two-level form-label register (Task 9 reads, 11b-ii applies) | `## Type`, the "Form field labels, two-level register" passage | `:263-284` |
| The palette's command population (Task 3) | `## Component recipes`, the bullet opening `**Command palette:**` | `:531-535` |
| `MediaPicker` as the family's combobox (Task 4) | `## Component recipes`, the bullet opening `**Media: the combobox picker (\`MediaPicker\`).**` | `:802-808` |
| The zen ruling (Task 8) | `## The context model: office and desk`, the sentence ruling that zen drops the whole topbar and the persistent sidebar at every width | `:155` |

### Counts and claims that measurement corrects

- **A21's population is 26 lines carrying 29 glyph tags, not "roughly 25", and two of the sweep's
  hits are false positives.** Verified by `grep -rnoE "<[A-Z][A-Za-z0-9]*Icon\b" src/lib/components
  src/lib/admin-toolkit` followed by a three-line lookahead for `aria-hidden` on each hit, because
  several tags span lines. Three of the 26 lines carry an `{#if}`/`{:else}` glyph pair, so a
  per-occurrence grep honestly returns 29 where a per-line grep returns 26. `CairnLogo.svelte:21`
  and `CairnAdminShell.svelte:892` are false positives; `src/lib/components/admin-nav-icons.ts:46`
  is a `Record<NavIcon, Component>` type literal, not markup. The 26 lines are listed in Task 10's
  Files block, and Task 10's stop condition is written against that line list rather than against a
  bare count.
- **The 20-percent-to-55-percent contrast arithmetic is already measured in the repo, so Task 5
  re-derives nothing.** The design system records the 20 percent `base-content` mix against
  `base-100` at **1.492:1 light and 1.773:1 dark**, under the WCAG 1.4.11 3:1 non-text floor, and
  the 55 percent mix at **3.586:1 light and 4.959:1 dark**, in the two Tokens bullets the
  design-system anchor table names. The `### Help surfaces` section records the same 55 percent mix
  as "about 3:1 on base-100, the WCAG 1.4.11 floor for a control conveying state". The ring raise
  therefore clears the floor by measurement already in the document.
- **The density toggle does not also need a check glyph.** The spec directs the plan to state this at
  authoring time, and the answer is no. Once the ring reads at 3.586:1 light and 4.959:1 dark, the
  pressed state clears 1.4.11 on its own; the pair already carries `aria-pressed` at
  `CairnMediaLibrary.svelte:690` and `:693`, so assistive technology never depended on the ring; and
  a check glyph inside a 24px icon-only button would displace the glyph that names the control. The
  sweep offered the two fixes as alternatives, and the ring raise is the one that also fixes every
  other caller.
- **`segmentTintClass` has six callers, not the three the sweep names.**
  `CairnTidySettings.svelte:329` and `:334`, `TidyReview.svelte:277`, `CairnMediaLibrary.svelte:609`,
  and `EditPage.svelte:477` and `:482`. That is four caller FILES holding six call sites. Task 5's
  paint therefore reaches the edit page as well as the media library and the tidy screens.
- **`check:custom-surface` cannot prove A17, and widening it is not this pass's job.** The spec's
  task 7 says the login page's bracketed var and inline style land "onto tokens with
  `check:custom-surface` proving it". Measured, the admin tree's `retiredTokenPattern` in
  `scripts/checks/custom-surface-budget.json` matches only `--color-muted` and `--color-subtle`
  wrapped in a bracket utility or an inline style. `text-[var(--color-success)]` matches neither half
  of it. Widening the pattern to every `--color-*` fill tone would flag **27 lines (41 occurrences)
  across nine files** today, measured with the budget file's own regex shape
  (`\[[^][]*var\(--color-[a-z0-9-]+\)[^][]*\]|style="[^"]*var\(--color-`) over
  `src/lib/components/*.svelte` and `src/lib/admin-toolkit/*.svelte`: `CairnTidySettings` 1,
  `ComponentInsertDialog` 2, `EditPage` 2, `LoginPage` 2, `MediaBulkDeleteDialog` 2,
  `MediaHeroField` 8, `MediaOrphanTools` 5, `RepeatableField` 2, `TidyReview` 3. That figure
  supersedes the draft plan's "18 sites across six files", which missed three files entirely and
  undercounted two others. It is a sweep the spec routed to no pass. Task 9's acceptance is therefore
  a task-local, fill-tone-scoped grep over `LoginPage.svelte` plus `check:custom-surface` staying
  green, and Task 11 files the wider population to ROADMAP's Later tier with the measured figure.
- **`docs/internal/record/2026-09-08-polish-inputs/exports-sweep.md` routes no finding to 11b.** F1
  through F21 land in 11a (F1, F2, F4, F5, F6), in polish-C (F3, F11, F13, F14, F15, F17 to F21), or
  defer to the docs rewrite (F7 to F10); F12 and F16 are not taken. The spec's Dispositions table
  and its "Findings not taken" section agree. This row records the absence as checked rather than as
  an omission.

### Corrections this plan makes to the spec, knowingly

These are not gaps the spec left open. Each supersedes a sentence the spec states, on measurement.

- **The desk band's narrow pill keeps its own `role="status"` wrapper.** Spec task 6 says the
  publish-state pill routes through `StatusChip`. `StatusChip` publishes `label`, `size`, `register`
  and `legend` and no `role` or `aria-label` (its `Props` interface opens at
  `src/lib/admin-toolkit/StatusChip.svelte:62` and closes at `:85`), while `EditPage.svelte:1413`
  carries both plus an inline `EyeOffIcon` at `:1414`. Adding a prop is new public surface. Task 7
  therefore routes the chip itself through `StatusChip` and keeps the live-region role and the
  composed name on a wrapping element, with the draft glyph beside the chip rather than inside it.
- **Decision 7's promotion condition is narrowed, and the narrowing is declared here rather than
  written silently into the design system.** Decision 7 says the upload recipe's
  replace-the-control-with-a-status-panel shape is "promoted to a family shape when a second
  instance appears". The sweep already counts four components on that shape
  (`MediaUploadDialog`, `MediaHeroField`, `MediaReplaceDialog`, `MediaCaptureCard`), so a literal
  second instance arrived before the rule was written and the condition as stated is already spent.
  Task 1 writes the condition as **a second instance OUTSIDE the media upload family**, which is
  what decision 7 must have meant for the clause to do any work, and the ruling row cites this
  section as the declared amendment rather than presenting the narrowing as decision 7's own text.
- **The spec's Render-proof paragraph names three arithmetic findings and this half carries one
  render point.** A3 and A16 land in Task 5 here; A12 lands in polish-11b-ii. So this pass ends one
  task with a render and a crop read, and 11b-ii ends one with a render and a tile read.
- **A16 takes one of the sweep's two alternatives whole.** The sweep offered "`outline-hidden` and
  `ring-2`, or drop the override entirely". The draft plan took the first half of one and the second
  half of the other, which would have left the dropzone with no focus indicator at all: the sheet's
  rule at `cairn-admin.css:566-569` is an outline, Tailwind 4's `outline-hidden` sets
  `outline-style: none`, and the utility outranks a `:where()`-zeroed selector, so the sheet's
  outline would never paint. Task 5 takes the second alternative whole: every
  `focus-visible:outline-*` and `focus-visible:ring-*` utility leaves the dropzone trigger, and the
  sheet's 2px brand outline applies.

### The semantic column: decisions earlier passes landed that this pass overturns or depends on

- **Overturns the in-code rationale at `EditPage.svelte:865-868` and `:1561-1566`.** Both state in
  prose that the `{#if !narrow}` branch is required because two same-named live controls in the DOM
  at once are ambiguous to a role- or text-based locator regardless of which one CSS hides. The spec
  rules the markup option anyway, and it is right, because `inert` is exactly the disambiguation
  those comments say CSS alone cannot supply: it removes the branch from the accessibility tree and
  from Playwright's role locators. Task 8 rewrites both comments to carry the new reason rather than
  deleting them, and it states which attribute is load-bearing (see Task 8's Decisions block).
- **Overturns `segmented-control.ts`'s own doc claim.** The doc block at `:8-15` claims the 20
  percent ring as "a non-color, non-weight pressed cue (WCAG 1.4.11 non-text contrast)", which the
  measured 1.492:1 refutes. Task 5 rewrites the claim with the new mix and the measured numbers.
- **Overturns the rationale comment at `EditPage.svelte:832`.** It reads "Edited and New are
  attention states and stay on the stock daisyUI badge-warning/badge-info", which is precisely what
  Task 7 overturns. Task 7 rewrites it rather than leaving a comment that contradicts the code
  beneath it.
- **Overturns nothing in polish-11a.** 11a's subjects are `src/lib/sveltekit/*`,
  `packages/create-cairn-site/*`, the doctor fixtures, the JSDoc residuals, and the lint wiring. Its
  only overlap with this pass is the fifteen `src/lib/components/` files it reopens, and it lands no
  ruling this pass reverses. The spec's disjointness premise is false on file sets, as 11a's own
  plan records, and true on rulings, which is what matters here.
- **Overturns nothing in chassis-B2.** B2's Task 6 keep on the signups server, its `platform!`
  removal, and its `check-public-tokens.mjs` work are all polish-11b-ii's to reconcile. No task in
  this half opens `examples/showcase/src`.
- **`docs/internal/engine-rulings.md` is written by both 11a and this pass.** A row 11a inserts
  shifts every anchor below it. Task 1 therefore locates its insertion point by reading the file's
  own ordering, never by reusing a line number from this plan, and writes its heading in the
  ledger's own form.
- **Depends on 11a having appended to `## Unreleased`.** This pass appends beneath whatever 11a left
  and reconciles nothing above its own entries.
- **Hands forward to polish-11b-ii, not to polish-C directly.** The `## Unreleased` block, the
  intended-moves manifest's `## Polish-11b-i` heading, and the two ROADMAP sub-bullets that stay
  open all pass through 11b-ii.
- **`docs/STATUS.md` is never a task deliverable.** The conductor owns it and writes it at each
  checkpoint, the run cut, and at merge.

### The gate, re-derived

Derived at plan authoring from the committed `.github/workflows/` at `f944ca4e`, per the initiative
design's standing constraint at `2026-08-27-audit-remediation-initiative-design.md:138-140`. CI runs
`test.yml` (thirty-one `npm run` gates), `e2e.yml`, `design.yml`, `norms.yml`, `scaffold.yml`,
`create-site.yml`, `tsgo.yml`, and `publish.yml`. The derived list is identical to the one 11a
derived at `ac911ec3`, because the committed workflows did not change between the two derivations,
so the exact per-task string under "## Gate" below is 11a's, unchanged. `check:figures` is NOT in
the committed `test.yml`; it exists only in Geoff's uncommitted working tree, which decision 13
leaves unowned, so it is in no gate this pass runs.

---

## Ruled inputs (recorded; no task re-derives them)

- **The busy idiom is ruled architecture** (decision 7). Two shapes, both already in the design
  system. A control that stays on screen while a short round trip runs takes native `disabled` plus
  an always-mounted status region. A guarded control, refused with a reason, keeps `aria-disabled`
  with the `cairn-btn-guarded` marker so its tooltip survives. The upload recipe's
  replace-the-control-with-a-status-panel shape stays that recipe's own case and is promoted to a
  family shape only when a second instance appears outside the media upload family, per the declared
  amendment above. `ShareLinkPanel` converges on the first shape. The design system is the rule's one
  home; the ledger row records the verdict and points at it.
- **`OfficeList` retires in polish-C, not here** (decision 8). No task in this pass touches
  `OfficeList`, the custom-screen example, the `toolkit/custom-screen` reproduction, or the
  floating-card recipe.
- **`check:surface` stays byte-identical.** No task runs `check:surface -- --update`, and
  `docs/internal/api-surface.md` is in no task's diff. This forecloses every fix that would add a
  prop or an export, which is why Task 7 takes the shape its Decisions block names.
- **A23 is not this pass's.** Pagination's color-only selected state is already filed to ROADMAP
  Next by the design system and stays there.
- **No task dispatches a subagent.** `cairn-implementer` carries Read, Write, Edit, Bash, Grep and
  Glob and no Agent tool, so a step ordering a reviewer dispatch can only halt the chain, be skipped
  silently, or produce fabricated evidence. Every reviewer in this pass runs at the pass-end
  fan-out, and no acceptance criterion in any task names a reviewer's report. Acceptance is tests,
  greps, and the diff.
- **This window is non-breaking.** No entry this pass writes carries a `Consumers must:` line, and
  Task 11 checks the absence.
- **The conductor writes `docs/STATUS.md`, never a task** (spec, "Ledger ownership").
- **Release:** ONE cut, after polish-C. This pass does not bump `package.json`, does not tag, and
  does not publish. It appends to `## Unreleased` and stops. `docs/extend/migration-notes.md` is NOT
  written by this pass, since the window carries no consumer action and polish-C's task 14
  reconciles the whole section.
- **A finding a render refutes retires with the crop named** (spec, Risks). Task 5 ends with a render
  and a crop read. If the render shows a finding does not hold, the task reports the retirement with
  the crop that shows it, records the retirement in its `CHANGELOG.md` line, and does not ship a fix
  for it.

---

## Global constraints

These bind every task. An implementer reads them before its Files block.

1. **The em dash is banned** in every code comment and every doc this pass writes.
   `house/no-em-dash-in-comments` enforces it on `src/lib` and the showcase under `check:comments`;
   in prose it is a review finding.
2. **No process citations in shipped comments.** A comment states the contract and the reason. It
   does not name a pass, a plan, a ruling id, or a task number. Ledger rows and changelog entries
   carry that record instead, and the ledger's own `- **Note (<pass>, Task N):**` amendment line is
   the one place a pass name belongs.
3. **The gate is CI-derived, not remembered.** The exact string is under "## Gate". A task is not
   done until that string exits 0 in this worktree.
4. **One end-to-end slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173 with
   `reuseExistingServer: !process.env.CI`, so two `CI=1` runs cannot coexist and two non-`CI` runs
   silently share one preview server. Run the e2e suite alone in this worktree, and never beside
   another pass's. The from-scratch qualifier: the e2e proves this worktree's engine only after a
   from-scratch `npm install` in `examples/showcase` inside the worktree, which is a pre-dispatch
   step, not a task step.
5. **`check:surface` output is byte-identical.** `docs/internal/api-surface.md` is not regenerated
   and not committed by any task in this pass. A fix that needs a new prop, a new export, or a
   changed signature on a published symbol is out of scope, and the task reports it rather than
   taking it.
6. **The public site surface does not move.** No task changes a file
   `examples/showcase/e2e/site-visual.spec.ts` renders. `git status` showing any file changed under
   `examples/showcase/e2e/site-visual.spec.ts-snapshots/` is a blocking finding in every task.
7. **No task in this half opens `examples/showcase/src`.** The showcase's routes, its hook, and its
   template mirror are polish-11b-ii's whole subject. `npm run emit:template` is run by no task here,
   and `check:template` passing is a confirmation rather than a deliverable.
8. **TSDoc governs every comment.** Document the contract and the reason, never the type the
   signature already states, and never a paraphrase of the symbol name. An exported symbol keeps its
   minimal one-line doc even when self-evident, because `check:reference` and `jsdoc/require-jsdoc`
   want one; the write-only-when-it-helps judgment applies to internal symbols. Svelte `<script>`
   comments follow the same standard, with the `@component` convention for the component block.
   From polish-11a on, `eslint.config.js` globs `src/lib/components/**/*.svelte` with `tsdoc/syntax`
   at error, so a malformed code span or an unescaped brace in a comment this pass writes fails
   `check:comments`.
9. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`.
   The footer is exactly these two lines, and no other:

   ```
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_016oR8pMpc33qKYZtuMAeHfz
   ```

   One commit per Commit boundary named in a task; a task's boundaries are listed in its own Commit
   block. **A task that adds a test file commits that file**, which is why every test-bearing task
   below names its test path in its Files block rather than naming a suite in prose.
10. **Each task appends its own `CHANGELOG.md` line under `## Unreleased`** and closes or
    progress-notes any ledger entry it executes, per the initiative design's standing constraint at
    `2026-08-27-audit-remediation-initiative-design.md:141-144`. This window is non-breaking, so no
    entry carries a `Consumers must:` line. A ruling row this pass WRITES carries the full `Verdict`,
    `Reopens on`, `Shape`, `Record`, `Verified` block, since `check:rulings-format` ratchets only the
    truncated parentheticals. **A new row's heading takes the ledger's own form,
    `## <slug>: <Title>  (<verdict>, <date>, <source>)`**, because `check-rulings-format.mjs` parses
    headings as `/^## ([a-z0-9-]+):/` and never sees a bare-slug heading at all, so
    `check:rulings-format` passing proves nothing about a malformed new row. One task writes a new
    row: Task 1 (the busy idiom).
11. **The conductor writes `docs/STATUS.md`.** No task edits it.
12. **The paint protocol.** Adopted verbatim from chassis-B2 by way of polish-11a, whose Global
    constraints carry it, and it rides once in the args file's own `paintProtocol` field rather than
    inside each task's criteria. The text is under "## The paint protocol" below.
13. **Which paint branch a task takes follows capture REACH, not a pre-assigned pair.**
    `examples/showcase/scripts/capture-surfaces.mjs`'s surface matrix is `home`, `article`,
    `styleguide`, `archive2`, `error404`, and `signups`, and `signups` is the one admin route in it.
    `CairnAdminShell` wraps `/admin/signups`, and `cairn-admin.css` styles it, so **a task that
    changes `CairnAdminShell.svelte` or `cairn-admin.css` reaches the capture tool and takes the
    capture-pair branch**, even when its own change is expected to be paint-neutral, because the
    pair is what proves the neutrality. A task that touches only admin screens the capture tool
    cannot reach captures nothing: its evidence is the visual suite's PRODUCED `MOVED BASELINES:`
    list plus the regenerated `-linux.png` files themselves, which the `READ ME:` line names for the
    reviewer. A task that touches no rendered file at all captures nothing and proves it by
    `git status`. The per-task ruling is under "## The paint protocol".
14. **Anchors into `docs/internal/admin-design-system.md` are located by section heading and quoted
    phrase, never by line number.** Task 1 inserts prose into that file, so every pinned line below
    its insertion point is stale from Task 1's commit onward. Locate with
    `grep -n "^## <heading>" docs/internal/admin-design-system.md` and then the quoted phrase from
    the conversion table in the Reconciliation block. This is the same by-slug discipline the plan
    applies to `docs/internal/engine-rulings.md`, extended to the file this pass's own first task
    rewrites.
15. **Local and CI renders.** Every paint task regenerates its moved baselines locally by file path
    and then passes a local `CI=1` e2e in the same gate, while the repo's standing rule is that CI is
    the canonical renderer. Local and CI renders have matched on this machine through chassis-B. If a
    pulled CI baseline fails locally on a surface the task never touched, that is a renderer
    difference, not a finding: report it under `MOVED BASELINES:` with the note, do not regenerate
    it, and let the next conductor CI regen settle it.
16. **The gate builds the package twice, not once.** `npm run package` runs at the head of the gate
    string, and the string's last command is `CI=1 npm --prefix examples/showcase run test:e2e`,
    whose `pretest:e2e` is `npm --prefix ../.. run package`. The second build is what makes the e2e
    prove this tree. The twelve dependent checks in between are invoked at their node entry points
    against the first build, so no task re-runs `npm run package` between them.

---

## The paint protocol

Verbatim from polish-11a's Global constraints, which took it verbatim from chassis-B2, with the
cache path, the pass name, and the manifest heading replaced by this pass's. It is the whole paint
contract, and it rides once in the args file's `paintProtocol` field, which the runner appends to
every implement and review prompt.

> Capture directories are pinned: the PASS before set at `~/.cache/cairn-polish-11b-i/pass/before/`
> (it exists only if some task captured one, so a paint task captures its own before set at its
> parent commit); this task's before set at
> `~/.cache/cairn-polish-11b-i/task-<N>/before/` captured at the START of the task on the clean
> worktree at the task's parent commit with
> `node examples/showcase/scripts/capture-surfaces.mjs --out <dir>` (symlink the pass set if no
> predecessor moved paint, and say so) and its after set at
> `~/.cache/cairn-polish-11b-i/task-<N>/after/`; every directory is write-once (the tool refuses a
> non-empty target; report a collision). Images are TILES: the capture tool writes
> `full/<surface>-<scheme>-<width>.png` and `tiles/<surface>-<scheme>-<width>-<nn>.png` (bands of
> at most 1400 CSS px with a 60 px overlap) plus `manifest.json`; a grader reads tiles or named crops, never a
> full-page file. The intended-moves manifest is the committed file
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`: append this task's
> rows under the `## Polish-11b-i` heading in the same commit as its change (surface, width, scheme,
> what moves, why, the baseline names it moves); a task that moves a baseline without appending its
> row is a blocking finding. The moved-baseline list is PRODUCED, not asserted: before any
> regeneration run the visual suites unmodified
> (`CI=1 npx playwright test e2e/admin-visual.spec.ts`, inside `examples/showcase`) and paste the
> exact FAILING snapshot names under `MOVED BASELINES:`; for surfaces not yet baselined use
> `magick compare -metric AE before.png after.png null:` per tile as `TILE DIFF:`. Regenerate moved
> baselines locally with the mode pinned,
> `CI=1 npx playwright test e2e/admin-visual.spec.ts --update-snapshots=changed`, by FILE PATH. An
> empty produced list is a result, not a defect: a task that expected a mover and produced none
> reports `INTENDED MOVES: none` with the reason, rather than declaring a mover the suite does not
> see. The implementer summary carries verbatim and in order: `CAPTURES:` / `INTENDED MOVES:` (one
> `surface width scheme: what moves` per line) / `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at
> most twelve tile or crop paths). REVIEWER: read the tiles or crops named in the report's `READ ME:`
> line (at most twelve) and verify the report's `INTENDED MOVES:` list equals its `MOVED BASELINES:`
> list name for name; a name in one and not the other is blocking; a baseline moved with no manifest
> row is blocking; name each tile you read. A paint-neutral task that touches a rendered surface
> proves it at the floor-free level: every baseline unchanged AND `magick compare` AE = 0 for every
> before/after tile of every touched surface, reported per tile. A task that touches NO rendered
> surface captures nothing and requires no capture: its proof is that `git status` shows no file
> changed under `examples/showcase/e2e/*.spec.ts-snapshots/`, reported as
> `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, and the gate's own
> `CI=1 npm --prefix examples/showcase run test:e2e` is the confirming run.
> STOP-AND-REPORT: a baseline that moves for a change the report does not enumerate.

**Which branch each task takes, ruled here by capture reach so no implementer judges it.**

| Task | Subject | Branch |
|---|---|---|
| 1 | `admin-design-system.md`, `engine-rulings.md` | No rendered surface. Capture nothing; `git status` is the proof |
| 2 | `CairnAdminShell.svelte`, `EditPage.svelte`, `editor-shortcuts.ts` | **Capture pair.** The shell renders on `signups`, and the drawer opener renders at 320, 390 and 768 |
| 3 | `CairnAdminShell.svelte` (palette attributes and keying) | **Capture pair**, as the neutrality proof. The palette is closed in every baseline, so AE 0 on all six surfaces is the expected result |
| 4 | `CairnAdminShell.svelte` (the combobox) | **Capture pair**, same reason |
| 5 | `segmented-control.ts`, `cairn-admin.css`, `MediaHeroField.svelte` | **Capture pair.** The sheet styles `signups`; none of the six surfaces renders a segmented control or the hero field, so AE 0 on all six is the expected leak proof, and the moved baselines are the admin ones the suite produces |
| 6 | five media and nav components, `ShareLinkPanel.svelte`, `LoginPage.svelte` | Produced moved list plus the regenerated PNGs. No captured surface renders any of these |
| 7 | `EditPage.svelte` | Produced moved list plus the regenerated PNGs |
| 8 | `EditPage.svelte` | Produced moved list plus the regenerated PNGs |
| 9 | `LoginPage.svelte` | Produced moved list plus the regenerated PNGs, **plus one named by-hand capture** of the unbaselined confirmation state, whose recipe is inline in Task 9's Steps |
| 10 | `CairnAdminShell.svelte`, `cairn-admin.css`, `ConceptList.svelte`, media components | **Capture pair.** The body-margin rescope and the reduced-motion selector both reach `signups` through the shell and the sheet |
| 11 | records | No rendered surface |

---

## Task 1: The design system, the busy recipe and the shell's true name

**Deliverables: three.** The two busy shapes written into the design system with the rule's reason,
the busy-idiom ruling row, and the eight corrected `AdminLayout` references.

**Files:**
- Modify: `docs/internal/admin-design-system.md` (the busy recipe beside the two guarded-button
  passages, located by the quoted phrases in the Reconciliation block's design-system anchor table;
  the eight `AdminLayout` references, located with `grep -n AdminLayout`),
  `docs/internal/engine-rulings.md` (a new row), `CHANGELOG.md`
- Test: none. This task is doc-only.

**Interfaces:** none. No code changes.

**Decisions the plan makes:**
- The row's slug is `polish-busy-idiom`, its verdict is `accept`, and it is a new row rather than an
  amendment, because no existing row rules the busy idiom. Its heading takes the ledger's own form,
  `## polish-busy-idiom: the admin's busy idiom  (accept, 2026-09-08, polish-11b-i)`, because
  `check-rulings-format.mjs` parses headings as `/^## ([a-z0-9-]+):/` and a bare-slug heading is
  invisible to the gate. It cites this spec by path and date and quotes decision 7's text, per the
  spec's Decisions preamble. Where Geoff's own words do not exist, the clause names the spec as the
  ruling's record rather than inventing a sitting quotation, and says so.
- The row does not restate the recipe. The design system is the rule's one home, and the row's
  `Shape` line points at it by section name, so the two cannot drift into two rules.
- The upload recipe's replace-the-control-with-a-status-panel shape is written into the design
  system as that recipe's own case, with the promotion condition stated. The sweep counts four
  components on that shape (`MediaUploadDialog`, `MediaHeroField`, `MediaReplaceDialog`,
  `MediaCaptureCard`), so the document says four and names the condition as **a second instance
  OUTSIDE the media upload family**. This narrows decision 7's own clause, which is declared in the
  Reconciliation block's Corrections section, and the ledger row cites that declared amendment
  rather than presenting the narrowing as decision 7's text.
- `AdminLayout` is corrected to `CairnAdminShell`, with the file path
  `src/lib/components/CairnAdminShell.svelte` given once at the first reference and the bare
  component name used at the other seven.
- **This task moves every design-system anchor below its first insertion point.** It records that
  fact in its own report, naming the inserted line count, so the conductor can hand it to Tasks 5,
  9, 10 and 11 and to polish-C.

**Steps:**
- [ ] **Step 1:** read the two existing busy and guarded passages, located by the quoted phrases
  "Otherwise it takes the guarded-button pattern" and "DaisyUI 5.6 added", and confirm they state
  the guarded shape but not the busy shape. Report what is already there, so the new text adds a
  rule rather than repeating one.
- [ ] **Step 2:** write the two busy shapes into the design system, each with its reason and its
  boundary: native `disabled` plus an always-mounted status region for a control that stays on
  screen while a short round trip runs, and `aria-disabled` plus `cairn-btn-guarded` for a control
  refused with a reason whose tooltip must survive DaisyUI's pointer-events kill. Note the upload
  recipe's own case and its promotion condition, stated as a second instance outside the media
  upload family.
- [ ] **Step 3:** write the `polish-busy-idiom` row into `docs/internal/engine-rulings.md` in the
  full format, with `Verdict`, `Reopens on`, `Shape`, `Record`, and `Verified` lines under a heading
  in the ledger's own `## <slug>: <Title>  (<verdict>, <date>, <source>)` form. Place it by reading
  the file's existing ordering rather than by a line number from this plan.
- [ ] **Step 4:** correct all eight `AdminLayout` references.
- [ ] **Step 5:** report the inserted line count and the first insertion line, so every later task's
  design-system read is done against the new file. Append the `CHANGELOG.md` line (internal
  documentation, no consumer action). The full gate, with `check:rulings-format`, `check:docs`, and
  `check:vale` green. Commit.

**Acceptance criteria:**
- `grep -n "AdminLayout" docs/internal/admin-design-system.md` returns nothing, and the eight
  replacements each name `CairnAdminShell`, with the full path given exactly once.
- The design system carries a busy section naming both shapes, each with the condition that selects
  it and the reason, and naming the upload recipe's own case with its promotion condition stated as
  a second instance outside the media upload family.
- `docs/internal/engine-rulings.md` carries a row whose heading matches
  `^## polish-busy-idiom: ` and carries a title, a verdict, a date and a source in the ledger's own
  parenthetical, with all five labeled lines beneath it, whose `Shape` line points at the design
  system's busy section by name and does not restate the recipe, and which quotes decision 7 and
  cites `docs/superpowers/specs/2026-09-08-polish-passes-design.md` with its 2026-09-08 date.
- The row's text names the promotion-condition narrowing as an amendment declared in this plan,
  rather than attributing the narrowed wording to decision 7.
- `npm run check:rulings-format` passes.
- No file under `src/` or `examples/` is in the diff.
- The report names the inserted line count and the first insertion line.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs(admin): rule the busy idiom and name the shell correctly`.

---

## Task 2: The shell's keyboard blockers

**Deliverables: three.** The editor chord handler stopping propagation, the shell's window handler
yielding, and the drawer toggle as a real button.

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (`onEditorKeydown`, opening near `:1276`),
  `src/lib/components/CairnAdminShell.svelte` (`onKeydown` near `:255`; the Open menu label near
  `:635`; the Close menu affordance near `:814`; the checkbox near `:594` and its comment near
  `:590`), `src/lib/components/editor-shortcuts.ts` (the two rows that name `Ctrl K`, near `:29` and
  `:36`), `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`,
  `CHANGELOG.md`
- Test: `src/tests/component/CairnAdminShell.test.ts` and `src/tests/component/EditPage.test.ts`
  (the task adds the failing assertions named in Step 1 to whichever of these exists; if a file does
  not exist, create it in `src/tests/component/` and commit it).
  `examples/showcase/e2e/admin-shell-sidebar.spec.ts` is read, expected to keep passing, and not in
  the diff, since it exercises the drawer at its breakpoints
- Baselines: the toggle's box may move at the widths that render it. The produced list settles it,
  and an empty produced list is `INTENDED MOVES: none` rather than a defect.

**Interfaces:**
- Produces: no exported symbol changes. `CairnAdminShell`'s drawer toggle becomes a
  `<button type="button">` carrying `aria-expanded` and `aria-controls`, with the checkbox at
  `#cairn-shell-drawer` kept purely as the CSS mechanism DaisyUI's `drawer-open` classes key off.
- Consumes: nothing new.
- Unchanged: `check:surface`, the drawer's modal contract inside `CairnAdminShell.svelte` and its
  `inert={isDrawerOverlay}` binding, and every `drawer-open` selector pinned in
  `scripts/checks/custom-surface-budget.json`.

**Decisions the plan makes:**
- The shell's window handler yields on two conditions, both required: `e.defaultPrevented`, and an
  editable event target. Editable means an `input`, a `textarea`, a `select`, an element with
  `isContentEditable`, or an element inside one. `Ctrl+K` inside CodeMirror must open the Web link
  dialog and must not stack the palette on top of it, and CodeMirror's editable surface is
  `contenteditable`, so the target test is what covers it even when a handler forgets to prevent.
- The editor handler calls `stopPropagation()` on every chord it consumes, which is every branch that
  already calls `preventDefault()`. It does not call `stopPropagation()` on a chord it passes
  through, so `Ctrl+K` reaching the palette from outside the editor still works.
- The two `Ctrl K` rows in `editor-shortcuts.ts` stay two rows and stop reading as a contradiction.
  The "Web link" row keeps `Ctrl K`, and the "Command palette" row's key text says the palette chord
  is not available while the editor has focus. The exact wording is the implementer's, within that
  constraint.
- The Open menu label becomes a button unconditionally. The Close menu affordance is the
  `drawer-overlay` backdrop, a click-to-dismiss surface rather than a tab stop, so it becomes a
  button only if that does not put a second toggle in the tab order ahead of the drawer's own
  contents. The task reports which shape it took and why.
- The checkbox keeps `tabindex="-1"` and `aria-hidden="true"`, and its comment is rewritten to name
  the button as the real trigger instead of the label and the chord.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
  This task takes the capture-pair branch: the shell renders on `signups`.
- [ ] **Step 2:** the failing tests first. Add a component assertion that a `Ctrl+B` keydown
  dispatched on the editor card does not toggle the drawer, and one that the drawer toggle is
  reachable by role `button` with an accessible name and mirrors `aria-expanded`. Watch both fail.
- [ ] **Step 3:** `onEditorKeydown` calls `stopPropagation()` on every chord it consumes.
- [ ] **Step 4:** the shell's `onKeydown` yields on `defaultPrevented` and on an editable target.
  Rewrite the handler's own comment to state the two conditions and the reason.
- [ ] **Step 5:** the Open menu label becomes a `<button type="button">` with `aria-expanded` bound
  to `drawerOpen` and `aria-controls` naming the drawer's own element, flipping `drawerOpen`
  directly. Rewrite the checkbox comment. Decide and report the Close menu shape.
- [ ] **Step 6:** the two `editor-shortcuts.ts` rows.
- [ ] **Step 7:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming the toggle's box change and nothing else,
  regenerate any moved baseline locally by file path, and append the manifest rows under
  `## Polish-11b-i`. Report `TILE DIFF:` per captured surface. Append the `CHANGELOG.md` line. The
  full gate. Commit.

**Acceptance criteria:**
- `onEditorKeydown` calls `stopPropagation()` in every branch that calls `preventDefault()`, and in
  no branch that does not, verifiable line by line in the diff.
- `CairnAdminShell`'s `onKeydown` returns early on `e.defaultPrevented` and on an editable target,
  and its comment names both conditions.
- `src/lib/components/CairnAdminShell.svelte` contains no `<label for="cairn-shell-drawer">` that is
  the sole pointer trigger for opening the drawer; the opener is a `<button type="button">` with
  `aria-expanded` and `aria-controls`.
- The checkbox at `#cairn-shell-drawer` still carries `tabindex="-1"` and `aria-hidden="true"`, every
  `drawer-open` selector in `scripts/checks/custom-surface-budget.json` still resolves, and
  `npm run check:custom-surface` passes.
- The two new component assertions pass, their file is named in the diff, and
  `examples/showcase/e2e/admin-shell-sidebar.spec.ts` is not in the diff and passes.
- `grep -n "Ctrl K" src/lib/components/editor-shortcuts.ts` returns two rows that do not read as the
  same chord doing two things unconditionally.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, every moved baseline has a
  manifest row under `## Polish-11b-i` in the same commit, and no file under
  `examples/showcase/e2e/site-visual.spec.ts-snapshots/` changed.
- `npm run check:comments` passes.

**Commit:** one, `fix(admin): stop the editor chords colliding with the shell and make the drawer toggle a button`.

---

## Task 3: The palette's trigger, its keying, and its names

**Deliverables: three.** The `aria-haspopup="dialog"` on the palette trigger, the results keyed by
command label, and the dialog and its input given distinct accessible names.

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte` (the trigger near `:676`, the dialog's
  `aria-label` near `:726`, the input's `aria-label` near `:733` and its placeholder near `:734`,
  the `{#each}` key near `:749`),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` (only if a baseline
  moves), `CHANGELOG.md`
- Test: `src/tests/component/CairnAdminShell.test.ts`

**Interfaces:** none new. Every change is an attribute or a keyed-each expression.

**Decisions the plan makes:**
- The dialog is named "Commands" and the input keeps its own label, per the sweep's own fix. The
  placeholder stays the visible affordance text and stops being the third copy of one string,
  because the dialog's name changes.
- The `{#each}` keys on `cmd.label`, which the sweep names. The plan checks the population is unique
  rather than assuming it: the palette's commands are the nav destinations plus View site and theme,
  per the design system's `**Command palette:**` bullet, and a duplicate label would be a defect in
  the nav, not in the key. The task asserts uniqueness in the same test and reports a duplicate as a
  stop condition rather than silently falling back to the index.
- This task takes the capture-pair branch because it edits the shell, and its expected result is AE
  0 on every captured tile with no moved baseline. The pair is the neutrality proof, not a
  formality: an attribute change on a rendered element is exactly the class of edit that moves a box
  by accident.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
- [ ] **Step 2:** the failing tests first. Assert the palette trigger exposes
  `aria-haspopup="dialog"`, assert the dialog's accessible name differs from its input's, and assert
  the command labels are unique. Watch them fail.
- [ ] **Step 3:** add `aria-haspopup="dialog"` to the trigger, matching its Publish-site sibling.
- [ ] **Step 4:** name the dialog "Commands" and leave the input's own label and placeholder as the
  search affordance.
- [ ] **Step 5:** key the `{#each}` on `cmd.label`.
- [ ] **Step 6:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, which is expected to be empty because the palette dialog is closed in every
  baseline. Report `TILE DIFF:` per captured surface, expected AE 0 on all six. Append the
  `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- The palette trigger carries `aria-haspopup="dialog"`.
- The `<dialog>`'s `aria-label` and the input's `aria-label` are different strings, and neither
  equals the input's placeholder.
- The `{#each}` over the palette results keys on `cmd.label`, not on the index.
- The three new component assertions pass, including the label-uniqueness one.
- `TILE DIFF:` is AE 0 on every captured tile, `MOVED BASELINES:` is empty, and no file changed
  under either snapshots directory.

**Commit:** one, `fix(admin): name the palette dialog, key its results, and mark its trigger`.

---

## Task 4: The command palette as a combobox

**Deliverables: four.** The combobox ARIA on the input, the arrow and Enter keyboard model, the
result-count live region, and the live "No matches".

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte` (the input near `:730`, the results list near
  `:748`, the No-matches paragraph near `:775`, `submitPalette` near `:394`, and whatever state the
  active-option index needs),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` (only if a baseline
  moves), `CHANGELOG.md`
- Test: `src/tests/component/CairnAdminShell.test.ts`
- Read as the reference implementation, expected unchanged: `src/lib/components/MediaPicker.svelte`
  (`role="combobox"` `:194`, `aria-expanded` `:198`, `aria-controls` `:199`,
  `aria-activedescendant` `:200`, the results-count region `:207`, the narration region `:211`, the
  always-rendered-listbox reason `:213-215`). **Read it for the option id scheme and the listbox's
  own labeling as well as the ARIA**; those two are not restated here because `MediaPicker` answers
  them and a second answer would be a second idiom.

**Interfaces:** none new. The palette is internal to `CairnAdminShell`.

**Decisions the plan makes:**
- The shape is `MediaPicker`'s, not a fresh design. Focus stays in the input,
  `aria-activedescendant` moves the active option, and the listbox uses a roving descendant rather
  than a roving tabindex. `MediaPicker`'s two separate live regions become two here as well: one
  `role="status"` region reporting the result count, and one narrating the active option.
- The listbox renders even with no matches, for the reason `MediaPicker` states at `:213-215`: an
  `aria-controls` pointing at a node that does not exist fails WCAG 1.3.1 and 4.1.2. The "No
  matches" text moves inside it or beside it as live content, so a filter narrowing to zero
  announces.
- Enter activates the ACTIVE option, never the first DOM result. `submitPalette` changes shape to
  take the active index. An Enter with no active option keeps today's behavior of taking the first
  result, so a type-and-Enter user loses nothing.
- The results stay links and buttons as they are today. The `role="list"` and `role="listitem"` pair
  the file carries for the DaisyUI `.menu` flex defect is replaced by the listbox roles, and the
  comment explaining that defect is rewritten rather than deleted, since the same flex behavior
  applies to `option` roles.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
- [ ] **Step 2:** the failing tests first. Assert the input exposes `role="combobox"` with
  `aria-expanded`, `aria-controls`, and `aria-activedescendant`; assert ArrowDown moves the active
  option and Enter activates it rather than the first result; assert a query narrowing to zero
  produces live text. Watch them fail.
- [ ] **Step 3:** the combobox ARIA on the input and the listbox roles on the results, following
  `MediaPicker`'s shape, including its option id scheme and its listbox labeling.
- [ ] **Step 4:** the keyboard model. ArrowDown and ArrowUp move the active option with the wrapping
  behavior `MediaPicker` uses, Enter activates the active option, and Escape keeps its existing
  dialog-dismiss behavior.
- [ ] **Step 5:** the two live regions, both always mounted and content-gated, per the rule Task 1
  wrote into the design system.
- [ ] **Step 6:** the after capture set, the produced `MOVED BASELINES:` (expected empty, since the
  dialog is closed in every baseline), and `TILE DIFF:` per captured surface, expected AE 0. Append
  the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- The palette input carries `role="combobox"`, `aria-expanded`, `aria-controls`, and
  `aria-activedescendant`, and the controlled element exists in the DOM whether or not there are
  results.
- Enter with an active option activates that option, and the diff shows `submitPalette` reading the
  active index rather than the first DOM node.
- Two live regions exist, both mounted unconditionally, one carrying the result count and one the
  active-option narration.
- A query with no matches produces announced text, asserted by the component test.
- The comment about DaisyUI's `.menu` flex stripping the implicit list role is present and rewritten
  for the new roles.
- `TILE DIFF:` is AE 0 on every captured tile, `MOVED BASELINES:` is empty, and no file changed
  under either snapshots directory.
- `npm run check:comments` passes.

**Commit:** one, `fix(admin): make the command palette a real ARIA combobox`.

---

## Task 5: The pressed cue, the bottom-bar scroll margin, and the dropzone focus indicator

**Deliverables: three.** `segmentTintClass`'s ring raised to the locked 55 percent mix,
`scroll-margin-bottom` for the fixed bottom bar, and `MediaHeroField`'s dropzone returned to the
sheet's own focus outline.

**Files:**
- Modify: `src/lib/components/segmented-control.ts` (the TSDoc block at `:8-15` and the active string
  at `:18`), `src/lib/components/cairn-admin.css` (the scroll-margin rule at `:628-633`),
  `src/lib/components/MediaHeroField.svelte` (`:450`),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Read but expected unchanged, and named so the reviewer can check the ring raise reached every
  caller: the four caller files holding six call sites,
  `src/lib/components/CairnTidySettings.svelte:329` and `:334`,
  `src/lib/components/TidyReview.svelte:277`, `src/lib/components/CairnMediaLibrary.svelte:609`,
  and `src/lib/components/EditPage.svelte:477` and `:482`. `scripts/checks/custom-surface-budget.json`
  is also expected unchanged, but it is a gate input rather than a caller
- Test: `src/tests/unit/segmented-control.test.ts` for the ring assertion (no test covers
  `segmentTintClass` today, so this file is created and committed), and
  `src/tests/component/MediaHeroField.test.ts`, which exists, for the computed focus-outline
  assertion
- Baselines: `admin-edit-page-{light,dark,1440,768}`, `admin-media-{light,dark}`, and
  `admin-media-detail-{light,dark}` are the expected movers. The produced list settles it.

**Interfaces:**
- Produces: `segmentTintClass(active: boolean): string` keeps its signature and returns a ring at
  the 55 percent mix instead of `ring-base-content/20`.
- Unchanged: `check:surface`. `segmented-control.ts` is internal.

**Decisions the plan makes:**
- **The mix and its contrast are already measured in the repo, so the task derives nothing.** The 20
  percent `base-content` mix against `base-100` measures 1.492:1 light and 1.773:1 dark, under the
  WCAG 1.4.11 3:1 non-text floor, and the 55 percent mix measures 3.586:1 light and 4.959:1 dark.
  Both figures sit in the design system's two Tokens bullets that the Reconciliation block's
  design-system anchor table names, with the `### Help surfaces` section stating the same 55 percent
  mix as "about 3:1 on base-100". The task raises the ring to the 55 percent mix and cites those
  numbers in the doc block it rewrites, locating them by section and quoted phrase because Task 1
  has moved every line in that file.
- **The density toggle does not also need a check glyph.** The reasoning is in the Reconciliation
  block's counts section. The task ships one deliverable here, the ring raise, and does not touch
  `CairnMediaLibrary`'s toggle markup.
- The tinted band beside the ring, `bg-base-content/[0.07]`, is NOT raised. It is a wash rather than
  the 1.4.11-bearing cue, and raising it would change every caller's fill weight for no conformance
  gain. The doc block says so, so the next reader does not re-raise it.
- `scroll-margin-bottom` joins the SAME rule as `scroll-margin-top` at `cairn-admin.css:631-633`,
  rather than a new scoped rule. That rule sits inside `@layer components` (opened at `:529`), and
  `check:custom-surface`'s cap counts SELECTORS, not properties, so adding a property to an existing
  rule changes neither the selector count nor the unlayered set. The value is the bar's own height
  plus the slack the top margin carries; the task measures the bar at `EditPage.svelte:2306` and
  states the value it chose.
- **`MediaHeroField.svelte:450` takes the sweep's second alternative whole: every
  `focus-visible:outline-*` and `focus-visible:ring-*` utility leaves the dropzone trigger**, so the
  sheet's own `:focus-visible` rule applies. That rule, at `cairn-admin.css:566-569`, is
  `outline: 2px solid var(--color-primary); outline-offset: 2px` inside a `:where()` selector.
  Tailwind 4's `outline-hidden` sets `outline-style: none`, and the utility outranks a
  `:where()`-zeroed selector, so keeping `outline-hidden` while dropping the ring would leave the
  only focusable element in an otherwise empty field relying solely on the sheet's own rule for its
  focus indicator, a WCAG 2.4.7 regression if that rule did not apply. The class attribute today
  carries FOUR focus utilities: `focus-visible:outline-none`, `focus-visible:ring-1`,
  `focus-visible:ring-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`, and
  `focus-visible:border-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`. The three
  `outline`/`ring` utilities go; the border utility stays, since it recolors the border rather than
  supplying the indicator, and the sheet's 2px outline is the indicator either way.
  **The acceptance asserts a visible focus indicator by its computed style**: the trigger's
  `:focus-visible` computed `outline-style` is `solid`, its `outline-width` is `2px`, and its
  `outline-color` resolves to `--color-primary`.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
  This task takes the capture-pair branch: `cairn-admin.css` styles `signups`.
- [ ] **Step 2:** the failing test first. Assert `segmentTintClass(true)` returns a ring at the 55
  percent mix and no longer returns `ring-base-content/20`. Watch it fail.
- [ ] **Step 3:** raise the ring and rewrite the doc block with the measured numbers, the reason the
  wash is not raised, and no claim the measurement refutes.
- [ ] **Step 4:** add `scroll-margin-bottom` to the existing rule and extend its comment to name the
  bottom bar and WCAG 2.4.11.
- [ ] **Step 5:** drop the three `outline`/`ring` focus utilities from `MediaHeroField.svelte:450`,
  keep the fourth (`focus-visible:border-[color-mix(...)]`, a color recolor, not the indicator), and
  add a component assertion that the trigger's `:focus-visible` computed style carries a 2px solid
  primary outline. Watch it fail before the edit and pass after.
- [ ] **Step 6:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming each moved baseline and the ring raise that
  moves it, regenerate the moved baselines locally by file path, and append the manifest rows under
  `## Polish-11b-i`. Report `TILE DIFF:` for every captured surface, which must be AE 0 on all six,
  since none of them renders a segmented control or the hero field.
- [ ] **Step 7:** **the render proof, read as crops rather than full-page files.** A3 and A16 rest
  on token arithmetic and the sweep never rendered. A one-pixel inset ring on a 24px icon-only
  button is not legible in a downscaled full-page render, so the task crops the regenerated
  baselines with `magick <baseline> -crop <WxH+X+Y> +repage <out>.png` and names the crops in
  `READ ME:`: the density toggle's region out of `admin-media-light-linux.png` and
  `admin-media-dark-linux.png`, the editor footer's segmented controls out of
  `admin-edit-page-light-linux.png` and `admin-edit-page-dark-linux.png`, and the hero dropzone out
  of `admin-media-detail-light-linux.png` and `admin-media-detail-dark-linux.png`. The task reports
  the crop geometry it used for each. The reviewer reads the six crops and states whether the
  pressed segment is now distinguishable in both schemes and whether the hero dropzone reads as
  focusable. **If the render refutes either finding, the task retires it with the crop named and
  does not ship its fix.** Append the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- `segmentTintClass(true)` returns a ring at the 55 percent `base-content` mix, and the string
  `ring-base-content/20` appears nowhere in `src/lib`.
- The doc block states the measured 1.492:1 and 1.773:1 for the old mix and 3.586:1 and 4.959:1 for
  the new, states that the wash is deliberately not raised, and makes no contrast claim the
  measurement refutes.
- `bg-base-content/[0.07]` is unchanged in `segmented-control.ts`.
- `cairn-admin.css`'s existing scroll-margin rule carries both `scroll-margin-top` and
  `scroll-margin-bottom`, the rule's selector is unchanged, `componentsLayerSelectorCount` is
  unchanged, and `npm run check:custom-surface` passes.
- `grep -nE "focus-visible:(outline|ring)" src/lib/components/MediaHeroField.svelte` returns nothing
  on the dropzone trigger, and a component assertion reads the trigger's `:focus-visible` computed
  style as a 2px solid outline in `--color-primary`.
- The four read-but-unchanged caller files are not in the diff, and
  `scripts/checks/custom-surface-budget.json` is not in the diff.
- Every captured surface reports `TILE DIFF:` AE 0.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, and every moved baseline
  has a manifest row under `## Polish-11b-i` in the same commit.
- The `READ ME:` line names six crops with their geometry, not full-page PNGs, and the report states
  the render verdict for A3 and A16 separately.

**Commit:** one, `fix(admin): raise the pressed cue above the contrast floor and settle two focus edges`.

---

> **Run one ends here.** The conductor runs
> `gh workflow run e2e.yml --ref polish-11b-i -f update_snapshots=true`, waits for it, pulls the
> regenerated baselines into the worktree, and reads the CI diff against Tasks 2 to 5's
> `INTENDED MOVES:` declarations before run two launches. Run two's first act is to re-verify Task
> 6's anchors against the pulled head.

---

## Task 6: Live regions and the busy convergence

**Deliverables: four.** The five conditionally mounted status regions hoisted and content-gated,
`ShareLinkPanel` converged onto native `disabled` with its cargo-culted guarded marker dropped, the
Clipboard-absent path selecting the field, and the login page's misplaced status role removed.

**Files:**
- Modify: `src/lib/components/MediaUploadDialog.svelte` (`:264`),
  `src/lib/components/MediaHeroField.svelte` (`:496`),
  `src/lib/components/MediaReplaceDialog.svelte` (`:421`),
  `src/lib/components/CairnTidySettings.svelte` (`:347`),
  `src/lib/components/NavTree.svelte` (`:134`),
  `src/lib/components/ShareLinkPanel.svelte` (the two buttons at `:182-196`, their comment opening at
  `:176`, the Clipboard call at `:127-134`, and the comment at `:121-123` that already promises the
  fallback),
  `src/lib/components/LoginPage.svelte` (the `role="status"` at `:104` and **its own comment at
  `:102-103`**), `CHANGELOG.md`
- Read but expected unchanged, and named so the reviewer can check the recipe was copied rather than
  reinvented: `src/lib/components/ShareLinkPanel.svelte:224-228` (the correct always-mounted region)
  and the equivalent in `src/lib/components/EditPage.svelte` near `:1751`
- Test: `src/tests/component/LoginPage.test.ts`, `src/tests/component/MediaHeroField.test.ts`,
  `src/tests/component/NavTree.test.ts` and `src/tests/component/tidy-settings.test.ts` all exist
  and take their new assertions in place. `src/tests/component/ShareLinkPanel.test.ts`,
  `src/tests/component/MediaUploadDialog.test.ts` and `src/tests/component/MediaReplaceDialog.test.ts`
  do not exist and are created and committed. Name every file you create in the report
- Baselines: none expected. A hoisted region renders nothing when its content is empty, and the two
  `ShareLinkPanel` buttons keep their resting appearance. The produced list settles it.

**Interfaces:** none new. `ShareLinkPanel`'s props are unchanged, and no `role` moves onto a public
API.

**Decisions the plan makes:**
- Hoisting means the `role="status"` element is mounted unconditionally and only its CONTENTS are
  gated, which is the recipe `ShareLinkPanel.svelte:224-228` already carries with the reason in its
  own comment. Each of the five keeps the visual treatment it has today; only the mount point moves.
  `MediaReplaceDialog.svelte:355` already has a correct sr-only region, so `:421`'s hoist must not
  create a second announcer for the same event, and the task reports which region announces what.
- `ShareLinkPanel` takes `disabled={shareBusy}` and `disabled={revokeBusy}`, drops
  `cairn-btn-guarded` and `class:cursor-not-allowed` from both buttons, and drops the
  `aria-disabled` bindings. The early returns at `:77` and `:141` stay, since native `disabled`
  already makes the click inert and the guard is cheap. The comment opening at `:176` is rewritten to
  state the busy rule Task 1 wrote, without naming the pass. **That comment itself contains the
  string `aria-disabled` today, and a rewrite that contrasts the two attributes will contain it
  again**, so the acceptance greps for the attribute form `aria-disabled=` rather than for the bare
  word.
- **The Clipboard acceptance is behavioral, not a comment check.** The comment at `:121-123` already
  reads "A denied or unavailable clipboard falls back to selecting the field's text, so a manual
  copy still works", which is exactly A26's point: the comment claims it and the code does not do
  it. A criterion asserting that the comment says so is already true before any edit. The fix is a
  guard before the call rather than a `.catch`: when `navigator.clipboard` is undefined the panel
  selects the field and returns, and a component test asserts that. The comment at `:121-123` is
  kept and extended with the reason for the guard.
- **`LoginPage`'s `role="status"` at `:104` is removed outright rather than moved, and the comment
  the task writes is a new one at `:102-103`.** The block is conditionally mounted, so the role never
  fires. **The comment at `:133-136` belongs to the sign-in-form branch's message panels and is not
  this block's**, so rewriting it would put the reason in the wrong branch; the task leaves it alone
  and writes the confirmation block's own reason where the role used to be, recording that the
  heading carries the announcement.

**Steps:**
- [ ] **Step 1:** the failing tests first. Assert each of the five regions is present in the DOM
  before its content exists, assert `ShareLinkPanel`'s share button carries the native `disabled`
  attribute while busy and no `aria-disabled`, and assert a Clipboard-absent environment selects the
  field. Watch them fail.
- [ ] **Step 2:** hoist the five regions and gate their contents, one file at a time, reporting for
  each what announces and confirming no duplicate announcer.
- [ ] **Step 3:** `ShareLinkPanel` onto native `disabled`, with the marker, the cursor class, and the
  `aria-disabled` bindings dropped and the comment rewritten.
- [ ] **Step 4:** the Clipboard guard, with the comment at `:121-123` extended to carry the guard's
  reason.
- [ ] **Step 5:** remove `LoginPage`'s misplaced status role and write the confirmation block's own
  comment in its place. Leave the sign-in-form branch's comment alone.
- [ ] **Step 6:** run the visual suite unmodified to PRODUCE `MOVED BASELINES:`, which is expected to
  be empty. If any baseline moves, declare it in `INTENDED MOVES:` with its cause and append the
  manifest row. Append the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- Each of the five named lines carries a `role="status"` element that is outside every `{#if}` that
  used to wrap it, verifiable in the diff.
- `grep -n 'aria-disabled=' src/lib/components/ShareLinkPanel.svelte` returns nothing, and
  `grep -n "cairn-btn-guarded" src/lib/components/ShareLinkPanel.svelte` returns nothing.
- `cairn-btn-guarded` still appears in `src/lib/components/cairn-admin.css` and in `EditPage.svelte`,
  and `npm run check:custom-surface` and `src/tests/unit/admin-sheet-inventory.test.ts` pass.
- `ShareLinkPanel`'s copy path selects the field when `navigator.clipboard` is undefined, asserted by
  a component test.
- `grep -n 'role="status"' src/lib/components/LoginPage.svelte` returns no hit inside the
  confirmation block, a comment where the role used to be states that the heading announces, and the
  comment at `:133-136` (the sign-in-form branch's panels) is not in the diff.
- Every new component assertion passes, and every test file the task created is in the diff.
- `MOVED BASELINES:` is empty, or every entry is declared in `INTENDED MOVES:` with a manifest row.
- `npm run check:comments` passes.

**Commit:** one, `fix(admin): mount the live regions unconditionally and converge the busy idiom`.

---

## Task 7: Chip vocabulary on the desk band

**Deliverables: two.** The desk band's publish-state pills routed through `StatusChip`, and the
out-of-tier `badge-neutral` Hidden marker with them.

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the `statusBadge` map at `:836-840`, **the rationale
  comment at `:832`**, the narrow pill at `:1413` with its comment at `:1408-1412`, the wide pill at
  `:1423`, the Hidden badge at `:1425`),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Read but expected unchanged: `src/lib/components/ConceptList.svelte:423-430` (the ratified reason
  and the three-register mapping this task copies), `src/lib/admin-toolkit/StatusChip.svelte` (its
  `Props` interface opens at `:62` and closes at `:85`; the `outline` register is documented at
  `:55-56` on the module type and `:67-76` on the prop)
- Test: `src/tests/component/EditPage.test.ts`
- Baselines: `admin-edit-page-{light,dark,1440,768}` are the expected movers.

**Interfaces:**
- Consumes: `StatusChip` from the admin toolkit, already imported by `ConceptList`.
- Unchanged: `check:surface`. `StatusChip` gains no prop.

**Decisions the plan makes:**
- **All three publish states take `register="quiet"`**, matching `ConceptList.svelte:428-430` and its
  ratified reason at `:423-427`, "the label text itself as the distinguishing signal". This is the
  whole point of A8: the two surfaces stop speaking two vocabularies for the same three states.
  `badge-warning` and `badge-info` leave the edit page.
- **Hidden takes `register="outline"`.** A hidden entry is a reversible absence, which is the
  register's documented case in `StatusChip.svelte`'s prop doc at `:67-76`. `badge-neutral` leaves
  the edit page.
- **The `outline` register carries a stated verification duty at a new call site**, and this is one.
  Its prop doc at `:73-76` says the hairline "inherits its color from the chip's own ancestor, so it
  can drop under the audit's 3:1 border-contrast floor inside a muted-text ancestor (verify a new
  call site)". The Hidden badge's ancestor on the desk band is not the same ancestor `ConceptList`
  uses, so the task verifies it rather than assuming the register transfers.
- **The narrow pill keeps its own `role="status"` and `aria-label` on a wrapping element**, and the
  draft `EyeOffIcon` sits beside the chip rather than inside it. `StatusChip` publishes no `role` and
  no `aria-label` prop, and adding one would be public surface this pass may not add. The wrapper
  keeps the composed name the comment at `:1408-1412` explains, and that comment is rewritten to say
  the chip is now the toolkit's with the live-region role on the wrapper.
- **The rationale comment at `:832` is rewritten, not left behind.** It reads "Edited and New are
  attention states and stay on the stock daisyUI badge-warning/badge-info", which is exactly the
  decision this task overturns, and it is the fourth hit the acceptance grep returns.
- `statusBadge` retires as a function if nothing else calls it. The task greps and reports either
  way.

**Steps:**
- [ ] **Step 1:** the failing test first. Assert the edit page's publish-state pill renders
  `StatusChip`'s quiet register and that neither `badge-warning`, `badge-info`, nor `badge-neutral`
  appears in the edit page's rendered output. Watch it fail.
- [ ] **Step 2:** route the wide pill and the Hidden marker through `StatusChip`.
- [ ] **Step 3:** route the narrow pill through `StatusChip` inside a wrapper carrying
  `role="status"` and the composed `aria-label`, with the draft glyph beside it, and rewrite the
  comment at `:1408-1412`.
- [ ] **Step 4:** rewrite the rationale comment at `:832` to state the quiet register and the
  label-as-signal reason.
- [ ] **Step 5:** grep for remaining `statusBadge` callers and retire the function if there are none;
  report either way.
- [ ] **Step 6:** run the visual suite unmodified to PRODUCE `MOVED BASELINES:`, declare
  `INTENDED MOVES:` naming the four edit-page baselines and the chip re-registering that moves them,
  regenerate them locally by file path, and append the manifest rows under `## Polish-11b-i`. The
  `READ ME:` line names crops of the regenerated PNGs around the desk band's chip cluster, not the
  full-page files, and the report states the measured contrast of the Hidden chip's hairline against
  its actual ancestor in both schemes against the 3:1 floor. Append the `CHANGELOG.md` line. The full
  gate. Commit.

**Acceptance criteria:**
- `grep -nE "badge-(warning|info|neutral)" src/lib/components/EditPage.svelte` returns nothing,
  including the comment at `:832`.
- Both pills render `StatusChip`, the three publish states all with `register="quiet"` and Hidden
  with `register="outline"`.
- The report carries the Hidden chip's hairline contrast measured in its actual ancestor in both
  schemes, against the 3:1 border-contrast floor, with the crop that shows it.
- The narrow pill's `role="status"` and its composed accessible name survive, asserted by a component
  test that reads the accessible name.
- `src/lib/admin-toolkit/StatusChip.svelte` and `src/lib/components/ConceptList.svelte` are not in
  the diff, and `check:surface` output is byte-identical.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, and every moved baseline
  has a manifest row under `## Polish-11b-i` in the same commit.

**Commit:** one, `fix(admin): put the desk band's publish states on the toolkit's chip vocabulary`.

---

## Task 8: The desk band's first-paint composition

**Deliverables: two.** Both branches of the Save and Publish pair rendered at SSR with the inactive
one `hidden` and `inert`, and the two comments that argued the old shape rewritten with the new
reason.

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the `narrow` state and effect at `:869-877`, its
  rationale comment at `:865-868`, the wide branch at `:1560` with its comment at `:1561-1566`, and
  the bottom bar at `:2303-2326` with its comment at `:2300-2302`),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Test: `src/tests/component/EditPage.test.ts` for the width assertions, and
  `examples/showcase/e2e/admin-visual.spec.ts` is read, not edited. **A Playwright-layer assertion of
  the accessible-name count belongs in the engine's own component project, which runs in chromium
  and can set a viewport** (`src/tests/component/reproductions-containment.test.ts:60` shows the
  `page.viewport(w, h)` idiom); the task uses that idiom rather than inventing a harness
- Baselines: `admin-edit-page-{light,dark,1440,768}` are the expected movers.

**Interfaces:** none new.

**Decisions the plan makes:**
- **The spec ruled the markup option and forbade a server-read viewport hint**, which would be a new
  mechanism. This task takes the markup option and does not propose the hint.
- **`inert` is the load-bearing attribute, and `hidden` is a declaration of intent.** Both branches
  carry Tailwind display utilities (`flex` on the band pair, `fixed ... flex` on the bottom bar), and
  Tailwind 4 emits `[hidden]{display:none}` in the base layer while `flex{display:flex}` sits in the
  utilities layer, so the utility wins and the `hidden` attribute does not compute to
  `display: none` here. `inert` removes the subtree from the accessibility tree and from role
  locators on its own, independently of computed display, so the fix works for one reason rather
  than two. The comments the task rewrites say exactly this, so a later reader does not attribute the
  behavior to `hidden`.
- **Paint is governed by the responsive classes and interaction by `inert`.** Both branches render at
  SSR. The visual selection is a CSS breakpoint at the same `639.98px` boundary the effect reads, so
  the first paint on a phone is the narrow composition with no swap. The attributes track `narrow`
  and take effect at hydration.
- **`prefs.zen` survives as an `{#if}`.** The bottom bar's gate is `{#if !prefs.zen && narrow}`, and
  its comment says the bar is "Hidden under zen with the rest of the chrome, the same gate the band
  and the footer strip use"; the design system's context-model section ratifies that zen drops the
  whole topbar and the persistent sidebar at every width. Only the `narrow` half becomes
  attribute-driven. Deleting the whole `{#if}` would ship the bar under zen, and the acceptance says
  so explicitly.
- **The pre-hydration duplicate is harmless, and the plan says so rather than leaving it to be
  rediscovered.** Both Save controls are `type="submit" form="cairn-edit-form"` with no `name` and no
  `value`, and both Publish controls carry the same `formaction={publishFormAction}`. A submit from
  either produces the same request, so the brief window before `inert` applies cannot post the wrong
  thing. What it could do is expose a duplicate accessible name to a test, which is why the
  acceptance is written at both widths in a real browser.
- **No SSR assertion is written.** `grep -rn "svelte/server" src/tests src/lib` returns nothing, the
  component project is chromium browser mode, and nothing in the suite has ever rendered a component
  on the server. A client-render assertion labeled as SSR would prove nothing about the first-paint
  claim, so the claim rests on the responsive classes in the markup, which the diff shows, and on
  the width assertions in a real browser.
- `narrow` survives as state. It drives the attributes; it no longer drives DOM presence.

**Steps:**
- [ ] **Step 1:** the failing tests first, in the chromium component project with the viewport set.
  Assert that at a 390px width exactly one control named Save is reachable and it is the bottom-bar
  one, and that at 1440px exactly one is reachable and it is the band one. Assert the same for
  Publish. Watch them fail.
- [ ] **Step 2:** render both branches unconditionally, with the responsive classes selecting the
  visible one and `hidden` plus `inert` bound to `narrow` selecting the reachable one, keeping
  `{#if !prefs.zen}` around the bottom bar.
- [ ] **Step 3:** rewrite the two comments at `:865-868` and `:1561-1566` with the new reason,
  naming `inert` as the load-bearing attribute. Extend the bottom bar's comment at `:2300-2302` to
  record that the zen half of the gate stays an `{#if}` and why.
- [ ] **Step 4:** run the visual suite unmodified to PRODUCE `MOVED BASELINES:`, declare
  `INTENDED MOVES:`, regenerate locally by file path, and append the manifest rows under
  `## Polish-11b-i`. The `READ ME:` line names crops of the regenerated PNGs around the band and the
  bottom bar, and the report states explicitly whether `admin-edit-page-768` shows the same
  composition it showed before. Append the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- `EditPage.svelte` contains no `{#if !narrow}` gate around the band pair and no `narrow` condition
  in the bottom bar's `{#if}`; both render and are disambiguated by attributes.
- **`{#if !prefs.zen}` still gates the bottom action bar**, and the diff shows only the `narrow` half
  of the old two-condition gate becoming attribute-driven.
- The inactive branch carries both `hidden` and `inert`, bound to `narrow`.
- Exactly one Save control and one Publish control is reachable at each of 390px and 1440px,
  asserted in the chromium component project with the viewport set.
- The comments at the old `:865-868` and `:1561-1566` are present, rewritten, and name `inert` as
  the attribute that removes the branch from the accessibility tree and from role locators, with
  `hidden` named as intent under the display utilities.
- `check:comments` passes and no comment carries an em dash.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, and every moved baseline
  has a manifest row under `## Polish-11b-i` in the same commit.

**Commit:** one, `fix(admin): resolve the desk band composition at SSR instead of after mount`.

---

## Task 9: The login page's tokens and its two small conformance items

**Deliverables: three.** The bracketed var and the inline style onto tokens, the escape-hatch link
underlined at rest, and the redundant `aria-label` removed.

**Files:**
- Modify: `src/lib/components/LoginPage.svelte` (`:107` the bracketed var, `:108` the inline style,
  `:125` the escape-hatch link, `:172` the redundant `aria-label`), `CHANGELOG.md`
- Read but expected unchanged: the two existing `cairn-text-success` adopters, located by
  `grep -rn "cairn-text-success" src/lib` rather than by line, since polish-11a rewrites eleven copy
  lines in `VocabularyAdmin.svelte` that bracket its adopter at `:179`
- Test: `src/tests/component/LoginPage.test.ts`
- Baselines: `auth-login-{light,dark}` are the candidate movers. The confirmation block at `:101-130`
  is not baselined, so most of this task's paint is unbaselined and the by-hand capture at Step 4 is
  its evidence.

**Interfaces:** none new.

**Decisions the plan makes:**
- **`text-[var(--color-success)]` becomes `cairn-text-success`**, the documented on-surface ink
  utility. The design system documents it under `## Tokens (Warm Stone)` in the bullet opening
  "`--color-positive-ink` is the green counterpart", and `docs/reference/admin-grammar-tokens.md`
  maps the utility to `--color-positive-ink`. Two other components already use it, so this is
  adoption rather than invention.
- **The inline `style` at `:108` becomes theme-color utilities with opacity modifiers**, with no
  bracketed `var()` and no `style` attribute. The fill and the inset hairline both come off
  `--color-success` through the utility form the rest of the tree uses. The exact utilities are the
  implementer's, within the constraint that the diff adds no `style=` attribute and no
  `[var(--color-...)]` bracket to this component.
- **`check:custom-surface` cannot prove this, and the plan does not pretend it can.** The admin
  tree's `retiredTokenPattern` in `scripts/checks/custom-surface-budget.json` matches only
  `--color-muted` and `--color-subtle`. The acceptance below is therefore a task-local grep plus
  `check:custom-surface` staying green. **The grep is scoped to the fill tone**, because
  `LoginPage.svelte` carries two other bracketed vars this task does not touch and must not be
  forced to touch: `rounded-[var(--radius-field)]` at `:116` (a radius token on the help panel) and
  four `font-[family-name:var(--font-display)]` sites at `:81`, `:95`, `:112` and `:133`. **The gate
  is not widened in this task**, because widening it to every fill tone would flag 27 lines across
  nine files that the spec routed to no pass. Task 11 files that population to ROADMAP's Later tier.
- The escape-hatch button takes `underline underline-offset-2`, the ratified borderless-underlined
  reference-link recipe the design system carries under `## Component recipes` in the sentence
  "A reference link (Markdown help) is a borderless underlined button, not a control."
- The `aria-label="Email"` at `:172` is deleted, leaving the visible `<span>Email</span>` at `:166`
  as the accessible name.
- **This task takes the produced-moved-list branch, with one named exception.** `LoginPage` renders
  on no captured surface, so there is no capture pair. The confirmation state is genuinely
  unbaselined (`admin-visual.spec.ts` screenshots `/admin/login` in its form state only, and
  `auth-confirm-*` is the separate `/admin/auth/confirm?token=preview-token` page), so Step 4's
  by-hand capture is the one exception to the branch, and its recipe is inline in the step rather
  than in the pass-end verifier section the implementer is never told to read.

**Steps:**
- [ ] **Step 1:** the failing tests first. Assert the email input's accessible name comes from the
  visible label, and assert the confirmation mark's ink class is `cairn-text-success`. Watch them
  fail.
- [ ] **Step 2:** the bracketed var onto `cairn-text-success` and the inline style onto theme-color
  utilities.
- [ ] **Step 3:** the escape-hatch underline and the `aria-label` deletion.
- [ ] **Step 4:** **the by-hand confirmation capture, the one exception to this task's paint
  branch.** Start the showcase preview with the dev backend
  (`CI=1 npm --prefix examples/showcase run build && npm --prefix examples/showcase run preview`, on
  port 4173, with nothing else holding it), then for each of `cairn-admin` and `cairn-admin-dark`:
  set the `cairn-admin-theme` cookie to that value on the `baseURL` origin, call
  `page.emulateMedia({ colorScheme })` to match, `page.setViewportSize({ width: 390, height: 800 })`,
  navigate to `/admin/login`, submit the sign-in form once against the dev backend to reach the
  confirmation state, and screenshot with `fullPage: true` to
  `~/.cache/cairn-polish-11b-i/task-9/confirm-<scheme>.png`. This is the admin-visual spec's own
  idiom (`examples/showcase/e2e/admin-visual.spec.ts:17-21` and `:222-228`), and the reason the
  cookie rather than `emulateMedia` selects the SSR theme is in that file's comment at `:9-13`. Name
  both files in `READ ME:`.
- [ ] **Step 5:** run the visual suite unmodified to PRODUCE `MOVED BASELINES:`. Declare
  `INTENDED MOVES:`, regenerate any moved baseline locally by file path, and append the manifest
  rows under `## Polish-11b-i`. Append the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- `grep -nE 'style=|\[var\(--color-' src/lib/components/LoginPage.svelte` returns nothing.
- `rounded-[var(--radius-field)]` at `:116` and the four `font-[family-name:var(--font-display)]`
  sites are unchanged and out of scope.
- `LoginPage.svelte` uses `cairn-text-success` for the confirmation mark's ink.
- The escape-hatch control carries `underline` at rest, not only on hover.
- `grep -n 'aria-label="Email"' src/lib/components/LoginPage.svelte` returns nothing, and the input's
  accessible name is still "Email", asserted by a component test.
- `npm run check:custom-surface` passes and `scripts/checks/custom-surface-budget.json` is not in the
  diff.
- The `READ ME:` line names both by-hand confirmation-state captures, and the report states the
  reviewer's verdict on whether the mark still reads as a success mark in both schemes.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, with a manifest row for
  each mover.

**Commit:** one, `fix(admin): take the login page off its bracketed var and inline style`.

---

## Task 10: Small conformance, the second half

**Deliverables: four.** The 29 decorative glyph tags across 26 lines marked `aria-hidden`,
`scope="col"` on the four `ConceptList` headers, the shell's body-margin style scoped to the admin
root, and the reduced-motion rule reaching the theme root.

**Files:**
- Modify, the 26 glyph LINES carrying 29 glyph TAGS:
  `src/lib/components/MediaOrphanTools.svelte` (`:239`, `:259`, `:293`, `:337`, `:398`, `:495`),
  `src/lib/components/MediaAltFillDialog.svelte` (`:197`, `:234`, `:291`, `:350`),
  `src/lib/components/MediaBulkDeleteDialog.svelte` (`:294`, `:368`),
  `src/lib/components/CairnAdminShell.svelte` (`:636`, **`:705` two tags**, `:952`),
  `src/lib/components/MediaUploadDialog.svelte` (`:240`), `src/lib/components/ConceptList.svelte`
  (`:297`, `:360`), `src/lib/components/CairnMediaLibrary.svelte` (`:634`, `:661`, `:691`, `:694`,
  **`:1170` two tags**), `src/lib/components/MediaReplaceDialog.svelte` (**`:365` two tags**),
  `src/lib/components/LoginPage.svelte` (`:110`, `:117`)
- Modify, the rest: `src/lib/components/ConceptList.svelte` (the headers at `:370`, `:383`, `:395`,
  `:396`), `src/lib/components/CairnAdminShell.svelte` (the body style at `:553` and its comment
  opening at `:548`), `src/lib/components/cairn-admin.css` (the reduced-motion selector pair at
  `:1112-1113`), `scripts/checks/custom-surface-budget.json` (the one allowlist entry the
  reduced-motion selector change touches),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Test: `src/tests/component/CairnAdminShell.test.ts` for the body-margin assertion
- Baselines: none expected from the glyph and header work. The body-margin rescope is the paint risk,
  since it changes where a `margin: 0` applies; the produced list settles it.

**Interfaces:** none new.

**Decisions the plan makes:**
- **The population is 26 lines carrying 29 glyph tags, enumerated in the Files block so the task does
  not re-derive it.** Three of the 26 lines carry an `{#if}`/`{:else}` glyph pair, so a per-line grep
  returns 26 and a per-occurrence grep returns 29, and both are correct measurements of different
  units. **The stop condition is written against the LINE LIST, not against a bare count**: a
  re-grep whose line set differs from the enumerated 26 is a stop-and-report; a per-occurrence count
  of 29 is the expected result and is not a stop condition. Two hits a naive grep returns are false
  positives and stay: `CairnLogo.svelte:21` sets its own `aria-hidden`, and
  `CairnAdminShell.svelte:892` carries `aria-hidden` on `:894` of a multi-line tag.
  `src/lib/components/admin-nav-icons.ts:46` is a type literal, not markup.
- **No lint rule is added.** The sweep offers a rule as an alternative. A rule is new gate surface the
  spec did not route, and the task closes the population to zero, so a rule would have nothing to
  catch. Task 11 does not file one either.
- **`scope="col"` goes on all four `ConceptList` headers, and only the two that already carry
  `aria-sort` keep it.** The file holds exactly four `<th>` elements. `:370` (Title) and `:383`
  (Date) are the sortable pair and carry `aria-sort`; `:395` (Status) and `:396` (Actions) are not
  sortable and never carried it. The sweep's A22 wording said all four keep `aria-sort`, which is
  unsatisfiable, and this plan corrects it rather than repeating it. The showcase's own signups
  exemplar already writes `<th scope="col">`, and the design system ratifies it under
  `### Help surfaces` in the phrase "a real `<table>` with `th scope=\"col\"` and `th scope=\"row\"`".
- **The body margin is rescoped, not accepted.** The sweep offers accepting and rewording as an
  alternative. Zeroing the margin on the admin root's own containing block honors the governing rule
  the design system states under `## Load-bearing rules`, that the admin never touches the host's
  elements, and a reworded comment would record a rule violation rather than close it. The
  `{@html '<style>...'}` injection in `<svelte:head>` goes, and the reset moves to the admin root
  wrapper. The task reports the exact seam it closed, since the existing comment names a real 16px
  scroll seam the reset exists to prevent.
- **The reduced-motion selector gains the theme roots themselves**, becoming the root pair plus the
  descendant pair. `scripts/checks/custom-surface-budget.json`'s allowlist carries
  `"[data-theme='cairn-admin'] *, [data-theme='cairn-admin-dark'] *"` as one pinned selector, so
  changing that selector text requires an allowlist edit in the same commit. That is the one place
  this pass edits the budget file, and the task says so.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
  This task takes the capture-pair branch: the shell and the sheet both reach `signups`.
- [ ] **Step 2:** re-grep the glyph population with the three-line lookahead and report BOTH numbers,
  the line count and the tag count. Compare the line set against the 26 enumerated above. A
  differing line set is a stop-and-report; a tag count of 29 is expected.
- [ ] **Step 3:** mark all 29 tags `aria-hidden="true"` across the 26 lines.
- [ ] **Step 4:** `scope="col"` on all four `ConceptList` headers, with `aria-sort` untouched on the
  two that carry it and not added to the two that do not.
- [ ] **Step 5:** the failing test first for the body margin. Assert the admin's mount does not inject
  a `<style>` into the host document head. Then move the reset onto the admin root and rewrite the
  comment to name the seam it closes and the host-elements rule it now honors.
- [ ] **Step 6:** extend the reduced-motion selector to the theme roots and update the matching
  allowlist entry in `scripts/checks/custom-surface-budget.json` in the same commit.
- [ ] **Step 7:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`. Declare `INTENDED MOVES:` for anything the body-margin rescope moves,
  regenerate locally by file path, and append the manifest rows under `## Polish-11b-i`. Report
  `TILE DIFF:` per captured surface. Append the `CHANGELOG.md` line. The full gate, with
  `check:custom-surface` and `check:admin-css-classes` green. Commit.

**Acceptance criteria:**
- All 29 glyph tags across the 26 named lines carry `aria-hidden="true"`, and the re-grep with the
  three-line lookahead returns no bare decorative glyph in `src/lib/components` or
  `src/lib/admin-toolkit`.
- `src/lib/components/CairnLogo.svelte` is not in the diff, `CairnAdminShell.svelte:892` is
  unchanged, and the report names both as the false positives.
- All four `ConceptList` `<th>` elements carry `scope="col"`; `:370` and `:383` still carry
  `aria-sort`; `:395` and `:396` carry none.
- `grep -n "@html '<style>" src/lib/components/CairnAdminShell.svelte` returns nothing, and the reset
  applies to the admin root's own containing block.
- `cairn-admin.css`'s reduced-motion block matches both the theme roots and their descendants, and
  the corresponding entry in `scripts/checks/custom-surface-budget.json` is updated in the same
  commit.
- `npm run check:custom-surface` and `npm run check:admin-css-classes` pass, and
  `src/tests/unit/admin-sheet-inventory.test.ts` passes.
- No `eslint-disable` and no lint-rule addition is in the diff.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, with a manifest row for
  each mover, and `TILE DIFF:` is reported per captured surface.

**Commit:** one, `fix(admin): mark the decorative glyphs, scope the body reset, and reach the theme root`.

---

## Task 11: Records (last)

**Deliverables: four.** The HISTORY entry, the two ROADMAP sub-bullets this half shipped closed by
name with the bracketed-fill-tone sweep filed, the friction log verified, and a read of the
`## Unreleased` block.

**Files:**
- Modify: `docs/HISTORY.md` (the 11b-i entry, newest first), `ROADMAP.md` (the polish sub-bullet at
  `:342-361`, reconciled against post-11a `main`), `docs/internal/docs-friction-log.md` (verified
  still empty, or triaged if a task filed something), `CHANGELOG.md` (a read of this pass's window,
  no new entry)

**Interfaces:** none.

**Decisions the plan makes:**
- **The two ROADMAP sub-bullets this half closes by name** are the `ShareLinkPanel` busy-idiom ruling
  (Tasks 1 and 6) and the command palette's own live region (Task 4). The `formatTimestamp` widening
  and the `createSectionAction` adoption stay open, because polish-11b-ii ships them. The
  `OfficeList` and `AdminTable` scroll-ownership item stays open, since polish-C ships it. 11a closed
  two others; this task reconciles rather than assumes.
- **The bracketed-fill-tone population is filed to ROADMAP's Later tier**, stated as a measured count
  and a trigger. **27 lines, 41 occurrences, across nine files** reach a `--color-*` fill tone
  through a bracket utility or an inline style: `CairnTidySettings` 1, `ComponentInsertDialog` 2,
  `EditPage` 2, `LoginPage` 2, `MediaBulkDeleteDialog` 2, `MediaHeroField` 8, `MediaOrphanTools` 5,
  `RepeatableField` 2, `TidyReview` 3. The admin tree's `check:custom-surface` retired-token pattern
  reaches only `--color-muted` and `--color-subtle`. The filing names the measurement method (the
  budget file's own regex shape), the count, the nine files, and the gate change that would close it,
  so a later pass does not re-measure. It does not promise a pass.
- **No lint rule for decorative glyphs is filed.** Task 10 closed the population to zero, and a rule
  with nothing to catch is not the leanest form. The filing would be churn.
- If a task filed a friction entry, this task triages it complete-or-move rather than leaving it,
  which is the log's own rule.
- `docs/extend/migration-notes.md` is not written. See the Ruled inputs block.

**Steps:**
- [ ] **Step 1:** write the `docs/HISTORY.md` entry for 11b-i: what landed, what the gate caught, and
  what a later pass would be wrong to rediscover from scratch. Name at minimum the five items a later
  pass would otherwise re-derive: that `check:custom-surface`'s admin retired-token pattern reaches
  only muted and subtle with 27 bracketed fill-tone lines across nine files outside it; that
  `segmentTintClass` has six callers across four files, not the three the sweep named; that the desk
  band's SSR composition is now resolved by `inert` rather than by DOM presence, with `hidden`
  inert under Tailwind's display utilities; that the sheet's own focus rule is an OUTLINE, so an
  `outline-hidden` utility on an admin control silently removes its focus indicator; and that Task 1
  moved every `docs/internal/admin-design-system.md` anchor below its insertion point, with the
  inserted line count named.
- [ ] **Step 2:** reconcile the ROADMAP polish sub-bullet against post-11a `main`, close the two this
  half shipped by name, remove them from the live tier, and file the bracketed-fill-tone sweep to
  Later with its measured figure.
- [ ] **Step 3:** re-read both sections of the friction log and record them empty, or triage what is
  there.
- [ ] **Step 4:** read this pass's `## Unreleased` additions and confirm that none carries a
  `Consumers must:` line. Do not touch `package.json`. The full gate, with `check:docs`,
  `check:vale`, `check:version`, and `check:rulings-format` green. Commit.

**Acceptance criteria:**
- `docs/HISTORY.md` carries an 11b-i entry naming slice 11b-i, with the five named do-not-rediscover
  items.
- `ROADMAP.md` no longer lists the `ShareLinkPanel` busy-idiom ruling or the command palette live
  region in any live tier, and carries the bracketed-fill-tone sweep in Later with its count, its
  nine files, its measurement method, and the gate change that would close it.
- The `formatTimestamp` widening, the `createSectionAction` adoption, and the `OfficeList` and
  `AdminTable` item are all still listed, since polish-11b-ii and polish-C ship them.
- `docs/internal/docs-friction-log.md` has no untriaged entry.
- The string `Consumers must:` appears nowhere in this pass's `CHANGELOG.md` additions.
- `package.json` is not in the diff, `git tag --points-at HEAD` is empty, and no release exists.
- `docs/STATUS.md` and `docs/extend/migration-notes.md` are not in the diff.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs: close polish-11b-i's records`.

---

## Gate

Run this exact string at the end of every task, in the worktree, with nothing else bound to port
4173.

```
npm run package && npm run check && npm test && publint --strict && attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**It is the CI-derived list, not a shorter one.** The list is derived from the committed
`.github/workflows/` at `f944ca4e` and includes the six CI-only gates a local ritual skips
(`check:comments`, `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:reference:signatures`), plus `check:rulings-format`, which the spec names explicitly because
it is in neither `npm run check` nor `npm test` and is the only gate over `engine-rulings.md`. No
check is dropped for cost; the spec forecloses that. The string is byte-identical to the one
polish-11a derived at `ac911ec3`, because the committed workflows did not change between the two
derivations.

Per the spec's 2026-09-09 amendment ("The gate, all three passes"), the per-task gate for a
paint-neutral task is the fence's string with the trailing
`&& CI=1 npm --prefix examples/showcase run test:e2e` removed. This plan's paint tasks, per its
own paint-branch table (the capture-pair tasks 2, 3, 4, 5, 10 and the produced-moved-list tasks
6, 7, 8, 9), run the full fence string unchanged. Tasks 1 and 11 (no rendered surface) drop the
e2e clause. The pass-end ritual runs the full string regardless.

**What changed is the wrapper, not the list.** Twelve of the npm scripts in the derived list chain
`npm run package` as a prerequisite (`check:package`, `check:reference`,
`check:reference:signatures`, `check:surface`, `check:self-use`, `check:custom-surface`,
`check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:visuals`,
`check:snippets`, `check:consumers`), so the original string built the package thirteen times per
run. Each of the twelve is `npm run package && node scripts/checks/<name>.mjs`, except
`check:package`, which is `npm run package && publint && attw && check-package-files &&
check-skill-budget`. None of the underlying scripts rebuilds. The string above therefore runs
`npm run package` once at the head and invokes each dependent check at its node entry point, in the
derived order, against the same artifact. Every check still runs.

**The package builds twice per gate, not once.** The head build is one, and the string's last
command, `CI=1 npm --prefix examples/showcase run test:e2e`, has `npm --prefix ../.. run package` as
its `pretest:e2e`. That second build is what makes the e2e prove this tree rather than a stale
`dist`, so it is deliberate. No task re-runs `npm run package` between the twelve dependent checks.

`npm run check` must report 0 errors and 0 warnings, and `npm test` must exit 0; both are the floor
rather than the whole gate. `npm test` already runs the component suite, so no task claims to add it.
The CLI suite and `check:template` run per task, because a template-mirrored edit can carry pinned
text, even though no task in this half edits a template-mirrored file.

**Left to CI, deliberately.** `design.yml` (`check:public-tokens`, `test:reskin`, the styleguide
e2e), `norms.yml` (`norms:check`), `scaffold.yml` and `create-site.yml` (the packed-tarball scaffold
proofs), `tsgo.yml` (`svelte-check --tsgo`), and `publish.yml`. None of them is skipped as
unimportant; each needs a clean checkout, a browser matrix, or a full pack that a per-task local loop
cannot afford, and the PR's own CI run is the gate that clears them. Nothing merges on a red CI.
`design.yml` matters more to this pass than it did to 11a, since this pass moves admin CSS and
component markup, so a red `design.yml` on the PR is a blocking finding for the pass.
`check:public-tokens` itself walks only `examples/showcase/src`, which no task in this half touches.

**The pass-end run uses the npm-script form**, the original string with `npm run check:package` and
its eleven siblings called through their wrappers, so the wrappers themselves are proven at least
once before merge.

---

## Rollback and halt semantics

Every task ends with the full gate green and `check:surface` byte-identical, so the branch is
mergeable at each of the eleven commits **as far as the local gate goes**. Merging additionally
requires green CI, and locally regenerated baselines are not canonical, which is why the pass runs
in two runs with a conductor CI regen between them. The concrete halt states are therefore three:

- **After Task 5 and its conductor CI regen:** mergeable.
- **After Task 11 and the pass-end CI regen:** mergeable.
- **Anywhere else inside a run that moved paint:** red on `e2e.yml` until a regen runs. A mid-run
  halt owes a `gh workflow run e2e.yml --ref polish-11b-i -f update_snapshots=true` and a pull before
  merge, and the run's accumulated `INTENDED MOVES:` declarations are the record of what is owed.

Nothing in this pass leaves the tree in a half-migrated state the way a monolith split does, because
each task's subject is independent of the others'. One ordering dependency is real: **Task 1 before
Task 6**, because the design system must carry the busy rule before the code converges onto it,
which is the spec's own ordering constraint. Task 1 is the first task in the pass, so a halt cannot
violate it.

What a halt breaks for polish-11b-ii is small. 11b-ii's work is the dev package, the showcase's
routes, `format.ts`, and its own records, and the only 11b-i outputs it depends on are the
`## Unreleased` block, the intended-moves manifest's heading, and the two ROADMAP sub-bullets that
stay open.

---

## Pass-end ritual

1. **`code-simplifier`** over the code this pass changed, before the final commits. Apply its
   refinements, then re-run the gate.
2. **The full gate** above, green, in one uninterrupted run, in the npm-script form so the wrappers
   are proven.
3. **The six CI-only gates** confirmed green inside that run: `check:comments`, `check:surface`,
   `check:snippets`, `check:transcripts`, `check:symbols`, `check:reference:signatures`.
   `check:surface` must still be byte-identical to `main`'s, since no task updates it.
4. **The from-scratch consumer build.** A fresh `npm install` in the worktree's
   `examples/showcase`, then `npm --prefix examples/showcase run build` and the e2e suite, so the
   proof is against this branch's components and not `main`'s symlinked build.
5. **`design.yml` green on the PR.** This pass moves admin CSS and component markup, so the
   styleguide e2e and the public-token check are part of the merge evidence.
6. **The pass-end CI regen**, covering Tasks 6 to 10, and its diff read against their
   `INTENDED MOVES:` declarations.
7. **The reviewer fan-out**, named per what this pass touches. No task dispatched any of these; they
   all run here.
   - **`daisyui-a11y-reviewer`** over every markup and CSS change: `CairnAdminShell.svelte`,
     `EditPage.svelte`, `LoginPage.svelte`, `ShareLinkPanel.svelte`, `ConceptList.svelte`,
     `CairnMediaLibrary.svelte`, `MediaHeroField.svelte`, `MediaUploadDialog.svelte`,
     `MediaReplaceDialog.svelte`, `MediaAltFillDialog.svelte`, `MediaBulkDeleteDialog.svelte`,
     `MediaOrphanTools.svelte`, `NavTree.svelte`, `CairnTidySettings.svelte`, `cairn-admin.css`, and
     `segmented-control.ts`. It reads the combobox, the drawer button, the live regions, the chip
     registers, the pressed cue, and the dropzone focus indicator against WCAG 2.2 and DaisyUI 5.
   - **`svelte-reviewer`** over the same `.svelte` files, reading for reactivity defects introduced
     by Task 8's attribute-driven composition, Task 4's active-descendant state, and Task 6's
     hoisted regions.
   - **`web-auth-security-reviewer` does not run here.** This half changes no auth path; it runs at
     polish-11b-ii's pass end, over the `cairnAccess` seam and its adoption.
   - **`cloudflare-workers-reviewer` does not run.** No task in this pass changes Worker runtime
     code, a D1 query, or a binding.
8. **The fresh-context `visual-verifier`**, which must not be a context that built any of this work.
   It is bounded the way chassis-B1's was, and the bound is part of the ceiling.
   - **The before set, captured first.** Capture the same routes, schemes and widths at the pass's
     parent commit into `~/.cache/cairn-polish-11b-i/verify/before/`, using this plan's own recipe.
     The verifier is handed both sets as separate labeled blocks and never a composite. Without a
     before set the agent degrades to a subjective "does this look right", which is exactly the read
     the fresh-context gate exists to replace.
   - **Where it runs:** inside `examples/showcase`, using that directory's own
     `node_modules/@playwright/test`, against the preview server the suite already starts on port
     4173 with the dev backend active. Nothing else may hold that port.
   - **How it captures, per route:** set the `cairn-admin-theme` cookie on the `baseURL` origin
     (`cairn-admin` or `cairn-admin-dark`), call `page.emulateMedia({ colorScheme })` to match, set
     the viewport with `page.setViewportSize({ width, height: 800 })`, navigate, wait on the route's
     own settling locator, and screenshot with `fullPage: true`. This is the idiom at
     `examples/showcase/e2e/admin-visual.spec.ts:17-21` and `:222-228`, and the reason the cookie
     rather than `emulateMedia` selects the SSR theme is recorded in that file's comment at `:9-13`.
   - **The widths:** 320, 390, 768, 1440, 2560, the family five-viewport bar.
   - **Both schemes** at every width.
   - **The routes, cut to what this pass recomposes:** `/admin/posts` (the office shell,
     `ConceptList`'s headers), `/admin/posts/2026-06-hello` (the desk band, the composition, the
     segmented controls, the bottom action bar), `/admin/media` (the density toggle and the pressed
     cue), and `/admin/login`. Four routes at five widths in both schemes is forty captures per set.
   - **The two states the committed baselines do not reach**, which the verifier opens by hand at
     390 and 1440 only: the command palette (Cmd or Ctrl plus K from any admin route) and the login
     page's confirmation state (submit the sign-in form once against the dev backend).
   - **The read is bounded**, because nothing tiles a full-page verify capture and the paint
     protocol's own cap is twelve tiles per read. The verifier reads **one above-the-fold tile per
     capture, plus the tiles the `## Polish-11b-i` intended-moves rows name**, and nothing else.
     Output under `~/.cache/cairn-polish-11b-i/verify/after/<route>-<scheme>-<width>.png`, with one
     verdict per visual device and COSMETIC or STRUCTURAL on each.
   - **The loop is bounded:** verify, fix, fresh verify. A second FAIL halts and is the conductor's
     decision, never a third round.
9. **Docs this pass owns**, confirmed present: `docs/internal/admin-design-system.md` (Task 1, the
   busy recipe and the eight name corrections) and `docs/internal/engine-rulings.md` (Task 1). No
   published page under `docs/admin/`, `docs/editors/`, `docs/extend/`, or `docs/reference/`
   changes.
10. **`CHANGELOG.md` under `## Unreleased`**, finalized. **This window is non-breaking, so no entry
    carries a `Consumers must:` line**, and the absence is itself a checked acceptance in Task 11.
11. **`docs/extend/migration-notes.md` is untouched.** The window carries no consumer action and
    polish-C's task 14 reconciles the whole section.
12. **`docs/HISTORY.md`** carries the 11b-i entry (Task 11).
13. **`ROADMAP.md`** has the two shipped sub-bullets closed and removed from their live tier, and
    the bracketed-fill-tone sweep filed to Later (Task 11).
14. **The friction log** triaged whole in Task 11, complete-or-move, not appended to.
15. **The intended-moves manifest** carries a `## Polish-11b-i` heading whose rows account for every
    baseline this pass moved, verified by diffing
    `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` against `main` and matching each changed
    file to a row.
16. **The conductor writes `docs/STATUS.md`** at merge, never a task.
17. **No version bump, no tag, no publish.** The window holds for polish-C's single cut.
    **Geoff merges.**

---

## What this pass hands forward

- **To polish-11b-ii, a clean base and four things, none of them a code dependency.** 11b-ii
  branches from `main` after this pass merges.
  - The `## Unreleased` block, which 11b-ii appends beneath and reconciles nothing above.
  - The intended-moves manifest's `## Polish-11b-i` heading, beneath which 11b-ii adds
    `## Polish-11b-ii`.
  - Three open ROADMAP polish sub-bullets: the `formatTimestamp` widening and the
    `createSectionAction` adoption, both of which 11b-ii ships and closes, and the `OfficeList` and
    `AdminTable` item, which polish-C ships.
  - **A design system whose anchors have all moved.** Task 1 inserted prose beside the
    guarded-button passages, so every line anchor into
    `docs/internal/admin-design-system.md` below that point is stale. 11b-ii's signups tasks cite the
    safe-delete recipe and the two-level form-label register, and both are below the insertion.
    Locate them by section heading and quoted phrase: `## Component recipes` plus
    "**The safe-delete is a modal alertdialog with no light dismiss.**", and `## Type` plus the
    "Form field labels, two-level register" passage.
  - **A busy rule with one home.** 11b-ii's signups live region is content-gated and always mounted
    for the reason Task 1 wrote into the design system, not for a reason 11b-ii re-derives.
- **To polish-C, `OfficeList` untouched.** No task in this half opens
  `src/lib/admin-toolkit/OfficeList.svelte`, `docs/extend/add-a-custom-admin-screen.md`, the
  `toolkit/custom-screen` reproduction, or the floating-card recipe. The removal lands on the tree
  the spec described.
- **To polish-C, the floating-card recipe named by its class set rather than by a line.** The recipe
  is under `## Component recipes`, the bullet opening `**Floating card:** \`card-shell card-shadow\``,
  and the elevation pair it composes over is under
  `## The developer-facing vocabulary (the versioned seam)`, the bullet opening
  `**The theme-adaptive elevation pair**`. Both anchors have moved by Task 1's insertion, and
  polish-C re-measures rather than reusing any line from this plan.
- **To polish-C, one new ledger row to sweep for renames.** `polish-busy-idiom` (Task 1) names
  symbols the breaking window may rename (`ShareLinkPanel`, `cairn-btn-guarded`). Polish-C's task 13
  enumerates the ledger population by grep rather than by a pinned count, so this row joins that
  population automatically, and this line is the reminder that the count moved.
- **To polish-C, the design system as a rename target.** Task 1 rewrote eight references and added a
  busy section, so `docs/internal/admin-design-system.md` now names `CairnAdminShell`,
  `ShareLinkPanel`, and `cairn-btn-guarded` in more places than it did. Polish-C's grep sweep for
  each old name must include it.
- **To the docs rewrite, the design system's busy section.** It is an internal document, so it banks
  into no fact ledger, but the rewrite's admin and extend stages describe the same idiom and should
  read it rather than re-deriving the rule.
- **To any later pass, the five things this pass measured that a plan should not re-derive**, all of
  them recorded in Task 11's HISTORY entry: the 27-line bracketed fill-tone population and its nine
  files; `segmentTintClass`'s six callers across four files; that `inert` rather than `hidden` is
  what removes the desk band's inactive branch from the accessibility tree under Tailwind's display
  utilities; that the admin sheet's own focus rule is an outline, so an `outline-hidden` utility
  silently removes a control's only focus indicator; and that the decorative-glyph population is
  closed at zero, so a lint rule for it would catch nothing.
- **Release:** the window holds. ONE cut, after polish-C.

---

## Post-mortem

The `cairn-pass` ritual appends the post-mortem here at pass close, scoring both budgets against
the ceiling and the interaction counts.
