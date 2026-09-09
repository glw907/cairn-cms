# Polish-11b-i and 11b-ii plans, verification read

Fresh-context read, 2026-09-08, on the uncommitted plans
`docs/superpowers/plans/2026-09-08-polish-11b-i-pass.md` (eleven tasks, two runs) and
`docs/superpowers/plans/2026-09-08-polish-11b-ii-pass.md` (six tasks, two runs), their six args
files under `~/.cache/cairn-polish-11b-i/` and `~/.cache/cairn-polish-11b-ii/`, and the fold record
`plan-11b-review-fold.md` against its three lenses. Scope: fold fidelity, executability of the nine
named tasks, args fidelity, cross-plan consistency, and one spec edit.

**Result: eight failures, none blocking a dispatch after the fixes below are applied.** All fifty
fold dispositions were checked (coverage 1 to 16, executor 1 to 20, sequencing 1 to 14, both
superseded). Every one of the forty-eight taken findings is visibly corrected in the plan the fold
names, and the two superseded ones are honored as named ceiling line items. The mechanical checks
are clean: all six args files are jq-valid, every gate string is byte-identical to its plan's Gate
block, run splits match the plans' cuts (i 1 to 5 and 6 to 11; ii 1 to 4 and 5 to 6), each run file
is byte-identical per task to its `args.json`, `"model": "opus"` appears on 11b-ii Tasks 1 and 2 and
nowhere else, one `paintProtocol` field per args file with no task criteria repeating it, zero em
dashes in either plan, the spec, the fold record, or any args file, and no placeholder text.
Measured spot checks confirmed the plans' load-bearing anchors (`guard.ts:348` and `:368`,
`section-action.ts:219` and `:290`, `defineAccess`'s two-argument signature, `format.ts:65` through
`:93`, `engine-rulings.md:2670`, `:2674`, `:2675` and `:5374`, `custom-screen.spec.ts:32-33`,
`ConceptList`'s four `<th>` with `aria-sort` on `:370` and `:383` only, `cairn-admin.css:566-569` as
an outline, `hooks.server.ts:20` outside the template fence with `:32` inside the else branch).

## Failures

### 1. Both plans point at polish-C by three wrong task numbers

**Where:** 11b-i `:369`, `:1653`, `:1698`; 11b-ii `:265`, `:1153`, `:1175`, `:1188`.

**Asked:** the hand-forward sections point at polish-C by its real task numbers.

**Says:** "polish-C's task 10 reconciles the whole section" (migration notes), "Polish-C's task 9
enumerates the ledger population by grep", and 11b-ii `:1175` "polish-C's task 1 and task 7 find it
where the spec says it is" (the open `OfficeList` ROADMAP item).

**Measured** in `docs/superpowers/plans/2026-09-08-polish-c-pass.md`, read-only: Task 9 is `EditorRow`
and the `createMediaRoute` record, Task 10 is the log vocabulary's six refusal outliers, Task 7 is
the four preview and health names. Migration notes are reconciled by **Task 14** (the C plan says so
at its `:162`, `:628` and `:670`); the ledger rename sweep is **Task 13** (its `grep -n "<old name>"
docs/internal/engine-rulings.md` step is at `:2223`); the `OfficeList` removal is **Task 12** and the
ROADMAP reconciliation is **Task 15** (`:2439`). Only 11b-i `:180`, "polish-C's task 1 does" for the
floating-card recipe, is right (C Task 1 reads and composes against that recipe at its `:817` and
`:864`).

**Fix:** in both plans, task 10 becomes task 14 and task 9 becomes task 13. In 11b-ii `:1175`, "task
1 and task 7 find it" becomes "task 12 finds it where the spec says it is, and task 15 reconciles
ROADMAP". Note the origin: the spec itself carries the stale "polish-C task 10" at its `:611`, from
before C's plan folded to fifteen tasks; the plans inherited it. The spec line is outside this
read's one permitted edit and is left alone.

### 2. 11b-i Task 5 asserts an allowlist membership the scroll-margin rule does not have

**Where:** 11b-i `:882-886` (Decisions) and `:938-940` (Acceptance).

**Asked:** every acceptance grep is satisfiable.

**Says:** "That rule is one unlayered pinned selector already on the `check:custom-surface`
allowlist, and adding a property to it changes no selector, so the allowlist needs no edit", and the
acceptance "its selector is byte-identical to the one on the `check:custom-surface` allowlist".

**Measured:** `@layer components {` opens at `cairn-admin.css:529` and the scroll-margin rule sits
inside it at `:631-633`. `check-custom-surface.mjs` pins only rules OUTSIDE that block
(`pinnedUnlayeredRules`, `:83`), and the selector
`:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) :is(a, button, input, textarea,
select, summary, [tabindex])` is not among the seventeen `unlayeredAllowlist` entries in
`scripts/checks/custom-surface-budget.json`. A layered rule counts against `componentsLayerCap` by
selector, so the plan's conclusion holds, but an implementer told to verify allowlist byte-identity
finds no entry to compare against and stalls or reports a stop.

**Fix:** rewrite the decision to say the rule sits inside `@layer components`, that the cap counts
SELECTORS rather than properties, so adding `scroll-margin-bottom` to an existing rule changes
neither the selector count nor the unlayered set. Replace the acceptance criterion with "the rule's
selector is unchanged, `componentsLayerSelectorCount` is unchanged, and `npm run
check:custom-surface` passes". Mirror the wording into `~/.cache/cairn-polish-11b-i/args.json` and
`run1-args.json`, Task 5. Task 10's own claim about the reduced-motion selector is correct and needs
no change: that rule at `:1111-1119` IS unlayered and its selector IS allowlist entry six.

### 3. 11b-i Task 6 leaves a test file it must create unnamed, and there are two of them

**Where:** 11b-i `:984-988` (Files), `~/.cache/cairn-polish-11b-i/args.json` Task 6 `files`.

**Asked:** the four files named as created are named as creates; every test-bearing task names its
test file path in its Files block (Global constraint 9, fold executor 17).

**Says:** "`src/tests/component/ShareLinkPanel.test.ts` does not exist and is created and committed,
and so is a file for whichever of `MediaUploadDialog` and `MediaReplaceDialog` has none."

**Measured:** neither exists. `src/tests/component/` holds no `MediaUploadDialog.test.ts` and no
`MediaReplaceDialog.test.ts`. So the task creates THREE test files, not two, and two of the three
paths appear in neither the Files block nor the args `files` array. The other three creates are
correct and named: `src/tests/unit/segmented-control.test.ts` (Task 5),
`examples/showcase/src/access.ts` (11b-ii Task 1),
`examples/showcase/src/routes/admin/signups/actions.test.ts` (11b-ii Task 2).

**Fix:** name both paths explicitly in the Files block and in the args `files` array, and drop the
"whichever has none" clause for the measured fact that neither exists.

### 4. 11b-ii Global constraint 3 undercounts the `check:public-tokens` tasks

**Where:** 11b-ii `:286-288` against `:1044-1048`, `:621`, `:637`, and the Reconciliation row at
`:129`.

**Asked:** the fold's sequencing finding 6, which lands as "Tasks 2, 3 and 4 run `npm run
check:public-tokens` as a task step with its result in the acceptance".

**Says:** Global constraint 3 reads "Tasks 3 and 4 additionally run `npm run check:public-tokens`",
while the Gate section, Task 2's Step 5, Task 2's acceptance and the args all carry three tasks.

**Fix:** Global constraint 3 becomes "Tasks 2, 3 and 4". The task-level text and the args are already
right; this is the one place the constraint block contradicts them.

### 5. 11b-i counts three focus utilities on `MediaHeroField.svelte:450`; there are four

**Where:** 11b-i `:164` (Reconciliation, A16 row) and `:894-896` (Task 5 Decisions).

**Asked:** A16 takes one alternative whole with a visible focus indicator asserted.

**Says:** "The class attribute today carries three focus utilities, `focus-visible:outline-none`,
`focus-visible:ring-1`, and `focus-visible:ring-[color-mix(...)]`, and all three go."

**Measured:** the attribute also carries
`focus-visible:border-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`. That is a fourth
`focus-visible:` utility and the plan never rules whether it stays. It is outside the acceptance
grep (`focus-visible:(outline|ring)`), so the criterion is still satisfiable, but the implementer is
left to judge, and the plan's claim that dropping the ring alone would leave the trigger "with no
focus indicator at all" is overstated while that border rule survives.

**Fix:** name the fourth utility in the A16 row and rule it explicitly, keep or drop, with the reason.
The defensible reading is keep: a border recolor is not the indicator, the sheet's 2px outline is,
and the computed-style assertion the task already carries proves the outline either way.

### 6. 11b-i Task 8 cites the wrong line for the `page.viewport` idiom

**Where:** 11b-i `:1156-1158`.

**Says:** "`src/tests/component/reproductions-containment.test.ts:55` shows the `page.viewport(w, h)`
idiom".

**Measured:** `:55` is prose inside a doc comment. The call is at `:60`, inside `mountPosed`.

**Fix:** repoint to `:60`, or, in keeping with the plan's own by-symbol discipline, locate with
`grep -n "page.viewport" src/tests/component/reproductions-containment.test.ts`.

### 7. The args `paintProtocol` is not verbatim from the plans

**Where:** both plans' "## The paint protocol" blockquote against the `paintProtocol` field in all
six args files.

**Says:** the plans state the protocol "rides once in the args file's `paintProtocol` field" verbatim.
The one divergence: the plans read "a grader reads tiles, never a full-page file"; the args read "a
grader reads tiles OR NAMED CROPS, never a full-page file". Every other word matches.

**Fix:** the args wording is the correct one, since 11b-i Tasks 5 and 7 read crops by design (fold
executor 13). Amend the plans' blockquote sentence to match the args, not the reverse.

### 8. 11b-i Task 10 names its test files in prose rather than by path

**Where:** 11b-i `:1347-1348`.

**Says:** "Test: `src/tests/component/CairnAdminShell.test.ts` for the body-margin assertion, plus the
affected component test files under `src/tests/component/`."

**Asked:** Global constraint 9, every test-bearing task names its test file path in its Files block.
The trailing clause is a suite named in prose, which is the exact shape the constraint exists to
forbid. The args `files` array carries only `CairnAdminShell.test.ts`, so the args are stricter than
the plan.

**Fix:** either enumerate the affected paths or delete the clause and let the args' single path stand,
with the glyph work asserted where it already is.

## Held

- **11b-i Task 9's fill-tone grep passes the most likely regression.** The acceptance is `grep -nE
  'style=|\[var\(--color-' src/lib/components/LoginPage.svelte` returns nothing. Measured, that is
  satisfiable and correctly scoped past `rounded-[var(--radius-field)]` at `:116` and the four
  `font-[family-name:...]` sites. But the natural replacement for the `:108` inline style, given the
  tree's own precedent at `MediaHeroField.svelte:450`, is
  `bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)]`, which the grep does not match
  while being exactly the bracketed-var shape the task exists to remove. The Decisions block forbids
  it in prose ("the diff adds no `style=` attribute and no `[var(--color-...)]` bracket"), and the
  fold explicitly ruled this grep's scope (executor 6), so this is held rather than filed: a
  `diff-reviewer` reading the decision catches it. Tightening it to
  `grep -nE 'style=|\[[^][]*var\(--color-' would close it if the conductor wants the gate rather
  than the reviewer to hold it.
- **`StatusChip`'s `Props` interface opens at `:63`, not the `:62` the fold and both plans carry.**
  `export type StatusChipRegister` is at `:62`. The `outline` register anchors (`:55-56` on the
  module type, `:67-76` on the prop) verify exactly. Held because every anchor in these plans is
  re-verified at dispatch by the Reconciliation preamble's own rule, and this one is off by one line.
- **The spec's own `polish-C task 10` at `:611`** is the origin of failure 1's migration-notes
  number and is stale for the same reason. Out of scope for this read's single permitted spec edit;
  worth a one-word amendment when the spec is next opened.
- **11b-i Task 6's args criteria drop the plan's second read anchor** (`EditPage.svelte` near
  `:1751`, the other correct always-mounted region). `ShareLinkPanel.svelte:224-228` survives in the
  args and is the recipe the task copies, so nothing load-bearing is lost.
