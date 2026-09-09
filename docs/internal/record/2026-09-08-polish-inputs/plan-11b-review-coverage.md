# Polish-11b plan review, coverage and grounding lens

Adversarial read of `docs/superpowers/plans/2026-09-08-polish-11b-pass.md` (uncommitted, 1,838
lines) against `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4, the admin
sweep `docs/internal/record/2026-09-08-polish-inputs/admin-sweep.md`,
`docs/internal/admin-design-system.md`, and `docs/internal/engine-rulings.md`. Fresh context,
read-only, Opus, effort high. Measured against `main` at `f944ca4e`; the plan measured at
`4453f540`, two commits earlier, both of them docs-only, so no source anchor moved between the two
points and every disagreement below is the plan's, not drift.

Sixteen findings. Coverage is complete: every A finding, every spec task, and every Dispositions
row routed to 11b has a plan task with a checkable criterion, and the exports-sweep absence claim
holds. The findings are all grounding and classification defects, three of which would ship a
defect or a false proof if executed as written.

## Ranked findings

**1. Plan:777, :788, :802 (Task 5, step 5 and acceptance) -- taking `outline-hidden` while dropping
`ring-1` leaves the hero dropzone with no focus indicator at all.** The plan's decision reads
"`MediaHeroField.svelte:450` takes `focus-visible:outline-hidden` and drops the `ring-1` override
entirely, letting the sheet's 2 px brand `:focus-visible` ring at `cairn-admin.css:566` apply". The
sheet's rule is an OUTLINE, not a ring: `src/lib/components/cairn-admin.css:566-569` is
`:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) :focus-visible { outline: 2px
solid var(--color-primary); outline-offset: 2px; }`. Tailwind 4's `outline-hidden` sets
`outline-style: none`, and the utility (`.focus-visible\:outline-hidden:focus-visible`, one class
plus one pseudo-class) outranks a `:where()`-zeroed selector carrying one pseudo-class, so the
utility wins and the sheet's outline never paints. Sweep A16
(`admin-sweep.md:41`) offered two alternatives, "`outline-hidden` and `ring-2`, or drop the override
entirely"; the plan took the first half of one and the second half of the other. The acceptance
cannot catch it: it asserts only that `outline-none` and `focus-visible:ring-1` are gone, both of
which are true of the broken shape. WCAG 2.4.7 regression on the only focusable element in an
otherwise empty field, and Step 7's render proof asks the reviewer whether "the hero dropzone's
focus ring matches its siblings" when the answer would be that there is none.
**Correction.** Take the second alternative whole: remove every `focus-visible:outline-*` and
`focus-visible:ring-*` utility from `:450` so the sheet's outline applies, and write the acceptance
as `grep -n "focus-visible:outline" src/lib/components/MediaHeroField.svelte` returning nothing.

**2. Plan:453-455 and constraint 13 (:385-394) -- two paint tasks the plan rules capture-free do
reach the capture tool's one admin surface.** The plan rules "Tasks 13 and 14 are the two that reach
`signups`, so they are the two that capture". Task 10 rescopes the shell's body-margin reset
(`src/lib/components/CairnAdminShell.svelte:553`) and the plan itself calls that "the paint risk,
since it changes where a `margin: 0` applies" (:1124-1125). `CairnAdminShell` wraps every admin
route including `/admin/signups`, the one admin entry in the capture matrix
(`examples/showcase/scripts/capture-surfaces.mjs:104-109`), and the signups baselines run five
widths in two schemes. Task 2 has the same reach: it replaces the drawer opener at `:635` with a
button and states "the toggle's box may move at the widths that render it" (:538), and the hamburger
renders at 320, 390 and 768 on the signups screen. Under constraint 13's own text ("A task that
moves `signups` paint takes the full protocol with a capture pair") both tasks owe a capture pair.
**Correction.** Give Tasks 2 and 10 the capture pair, or rewrite constraint 13 so the capture
obligation follows the PRODUCED moved list rather than a pre-assigned task pair, which is the
protocol's own principle everywhere else.

**3. Plan:449-452 -- Tasks 3, 4 and 15 are put on the no-rendered-surface branch, and all three
touch rendered surfaces.** The protocol reserves that branch for "A task that touches NO rendered
surface" (:441-446). Tasks 3 and 4 both edit `src/lib/components/CairnAdminShell.svelte`, which
renders in all twenty-eight admin baselines; their paint is very likely neutral, but the protocol's
neutral branch requires baselines unchanged AND `magick compare` AE 0 per tile, not the `git status`
proof the no-surface branch takes. Task 15 is worse: its own Files block concedes "a seeded date that
previously rendered unchanged would now render formatted. The task reports whether any baseline seeds
such a value" (:1509-1510), which is an admission of paint reach inside a branch that captures
nothing, and the acceptance then asserts `CAPTURES: none (no rendered surface touched)` for a
different task while Task 15 carries no capture line at all.
**Correction.** Move Tasks 3, 4 and 15 to the paint-neutral branch. That also turns Task 15's
"reports whether any baseline seeds such a value" into a produced result rather than an implementer's
assertion.

**4. Plan:188-193, :1057-1067, :1585-1589 -- the bracketed-fill-tone population is 27 lines across
nine files, not "18 sites across six files".** Measured with the budget file's own regex shape,
`\[[^\][]*var\(--color-[a-z0-9-]+\)[^\][]*\]|style="[^"]*var\(--color-`, over
`src/lib/components/*.svelte` and `src/lib/admin-toolkit/*.svelte`: CairnTidySettings 1,
ComponentInsertDialog 2, EditPage 2, LoginPage 2, MediaBulkDeleteDialog 2, MediaHeroField 8,
MediaOrphanTools 5, RepeatableField 2, TidyReview 3. Twenty-seven lines, forty-one occurrences, nine
files. The plan's per-file figures match on four files and miss three files entirely
(CairnTidySettings, MediaBulkDeleteDialog, RepeatableField) while undercounting MediaOrphanTools
(3 against 5) and TidyReview (1 against 3). The wrong figure rides into Task 9's decision text, Task
16's acceptance ("carries the bracketed-fill-tone sweep in Later with its count, its six files"),
and the hand-forward list at :1827-1829, which exists precisely so a later pass does not re-measure.
**Correction.** Re-measure at dispatch with the regex above and state the number as measured, or drop
the count and file the trigger instead.

**5. Plan:1174 (Task 10 acceptance) -- "The four `ConceptList` sortable headers carry `scope="col"`
and keep their `aria-sort`" cannot be satisfied.** `src/lib/components/ConceptList.svelte` holds
exactly four `<th>` elements, at `:370`, `:383`, `:395` and `:396`. Only `:370` (Title) and `:383`
(Date) carry `aria-sort`; `:395` is the Status header and `:396` is the Actions header, neither
sortable and neither carrying the attribute. The sweep's own A22 wording carried the same error
(`admin-sweep.md:53`) and the plan repeated it rather than correcting it, which is what the
Reconciliation block exists to do (its own row for A22 checked only the line numbers).
**Correction.** Split the criterion: all four headers gain `scope="col"`; the two that carry
`aria-sort` keep it.

**6. Plan:868-871, :897-898 (Task 6) -- the LoginPage comment named for rewriting does not surround
the role being removed.** The plan says "The component's own comment near `:136` already concedes the
title is what announces", and the acceptance is "the surrounding comment states that the heading
announces". Measured, `src/lib/components/LoginPage.svelte:133-136` is the comment on the message
PANELS in the `{:else}` sign-in-form branch ("tabindex=\"-1\" on every message panel below, without
exception ... the title above is what announces the state a redirect landed in"). The `role="status"`
being removed is at `:104`, inside the `(form?.status === 'sent' || form?.sent) && !dismissed` branch
that opens at `:101` and closes at `:130`; its own comment is at `:102-103` and says nothing about
announcement. Rewriting a comment about the form branch's panels to record the confirmation
heading's announcement puts the reason in the wrong branch.
**Correction.** Name `:102-103` as the rewrite target and state plainly that no comment surrounds the
removed role today, so the task writes one rather than repurposing another branch's.

**7. Plan:1537-1538, :1548-1549 (Task 15) -- the widening reaches past the guarantee its own
rationale rests on.** `ISO_WITH_ZONE` (`src/lib/admin-toolkit/format.ts:72`) admits only the
ECMAScript Date Time String Format, which is why `new Date(input)` at `:90` is deterministic across a
Worker's SSR and a browser's hydration, the invariant the doc block at `:74-82` states. The basic
offset form (`+0000`) and a lowercase `z` are both outside that format, so `Date.parse` falls to
implementation-defined behavior for exactly the two new shapes, and the rule the ledger row would
state ("every shape that names its own zone") stops being what the code proves. The no-seconds
variant is inside the format and is fine.
**Correction.** Normalize before parsing rather than widening the regex alone: insert the colon into
a basic offset and uppercase a trailing `z`, then feed the canonical string to `new Date()`. Add an
acceptance that each new shape yields the same rendered text as its canonical spelling.

**8. Plan:1521-1527, :1556-1557 (Task 15) -- the superseding row names only one of the two lines
carrying the false claim.** `docs/internal/engine-rulings.md:2670` is
`audit-admin-formattimestamp`. Its `Reopens on:` line at `:2674` says `formatTimestamp` "now accepts
any Date-parseable timestamp", which the plan correctly refutes. Its `Shape:` line at `:2675` carries
the identical claim: "Take any Date-parseable timestamp (ISO with offset included)". The plan's
acceptance names only the `Reopens on:` sentence as superseded, so the row keeps a second live copy
of the same wrong statement.
**Correction.** The new row names both lines.

**9. Plan:482-486 (Task 1) -- decision 7's promotion condition is amended without being declared.**
Decision 7 (spec `:86-93`) says the replace-the-control shape is "promoted to a family shape when a
second instance appears". Task 1 writes "the condition as a second instance OUTSIDE the media upload
family", because the sweep already counts four (`admin-sweep.md:86`). The narrowing is defensible and
probably right, but it changes a ruled decision's text and it does not appear in the plan's own
"Corrections this plan makes to the spec, knowingly" section (:201-234), which is the section whose
whole purpose is to surface exactly this.
**Correction.** Move it into that section with its reasoning, so the ledger row Task 1 writes cites a
declared amendment rather than a silent one.

**10. Plan:227-228, :931 (Task 7) -- both StatusChip citations point at the wrong lines, and the
component's own new-call-site check is not carried.** The plan cites
`src/lib/admin-toolkit/StatusChip.svelte:33-51` for "publishes `label`, `size`, `register`, and a
detail prop, and no `role` or `aria-label`"; the Props interface is at `:62-85` and `:33-51` is the
`@component` block's prose about padding and sizes. It cites `:38-46` for "the register's documented
case" for `outline`; the `outline` register is documented at `:55-56` (the module type) and `:67-76`
(the prop), while `:38-46` is the `sm`/`xs` sizing prose. Both content claims are true. Separately,
the prop doc at `:73-76` says `outline`'s "hairline inherits its color from the chip's own ancestor,
so it can drop under the audit's 3:1 border-contrast floor inside a muted-text ancestor (verify a new
call site)". The Hidden badge at `EditPage.svelte:1425` is a new outline call site and Task 7 carries
no such verification.
**Correction.** Repoint both anchors, and add an acceptance that the Hidden chip's hairline is
verified against the 3:1 floor in its actual ancestor at both schemes, named in the task's render
report.

**11. Plan:118, :730-731 -- every `segmented-control.ts` anchor is off by one.** Measured:
the `//` header comment runs `:1-6`, the TSDoc block runs `:8-15`, `export function segmentTintClass`
is at `:16`, and the active string carrying `ring-base-content/20` is at `:18`. The Reconciliation
row says "the doc block runs `:8-16`, `segmentTintClass` opens at `:17`, and the active string ... is
at `:19`", and Task 5's Files block repeats "the doc block at `:8-16` and the active string at
`:19`". The Reconciliation block flagged the sweep's drift and then introduced its own.
**Correction.** `:8-15`, `:16`, `:18`.

**12. Plan:864-867, :895-896 (Task 6) -- the Clipboard acceptance is already true and the comment
anchor is wrong.** The acceptance is "its comment says the fallback covers denied and unavailable".
`src/lib/components/ShareLinkPanel.svelte:121-123` already reads "A denied or unavailable clipboard
falls back to selecting the field's text, so a manual copy still works", which is the sweep's whole
point (A26: the comment claims it, the code does not do it). The criterion therefore passes without
any change. The plan also puts that comment at `:124-126`; `:124-126` is the function's own opening
lines (`function copyShareUrl() {`, the guard, the `const url`).
**Correction.** Make the acceptance behavioral: `navigator.clipboard` undefined selects the field,
asserted by a test, and the comment carries the reason for the guard rather than the claim it already
makes. Repoint the comment to `:121-123`.

**13. Plan:218-224 -- one of the four "Corrections this plan makes to the spec, knowingly" corrects
nothing in the spec.** The section's preamble says "Each supersedes a sentence the spec states, on
measurement." The A15 bullet says the opposite in its own text: "The spec rules the markup option
anyway, and it is right." What it overrules is an in-code comment, and the plan already records that
in the semantic column at :250-251. Listing it twice, once as a correction to the spec, inflates a
list whose value is that every entry is a real disagreement. (Note for the record: the section holds
four bullets, not seven; the other measurement corrections live under "Counts and claims that
measurement corrects" at :159-199, which is the right home for them.)
**Correction.** Drop the A15 bullet from the corrections list and leave it in the semantic column.

**14. Plan:1317-1321, :1343-1355 (Task 12) -- the fail-closed premise is right but cites the wrong
row, and the 403 it introduces has no reader.** `createSectionAction`'s denial is `fail(403, { error:
opts.deniedMessage ?? DENIED_MESSAGE })` at `src/lib/sveltekit/section-action.ts:216-220`. The row
that establishes the fail-closed posture for a site-authored POST is
`access-semantics-documented-divergence` (`docs/internal/engine-rulings.md:5374-5382`: "an unmapped
target refuses"), not `audit-sveltekit-requireaccess` (`:2522`), which is a keep row carrying no 403
semantics at all. The plan asserts the posture as a decision and cites neither. Downstream, Task 13's
live region is specified to carry "the created and removed outcomes and the `fail(400, { error:
'missing' })` path" (:1388-1390), so after Task 12 lands a 403 denial renders nothing on a screen the
same pass just gave an announced outcome.
**Correction.** Cite `access-semantics-documented-divergence` in Task 12's decisions, and widen Task
13's region to any `form.error`, not the 400 path alone.

**15. Plan, Reconciliation table and several Files blocks -- five anchor slips a dispatch
re-verification should catch, none load-bearing on its own.** LoginPage's escape-hatch button runs
`:123-129`, not the `:124-130` at :138 and :1043. The shell's body-margin rationale comment opens at
`:548`, not the `:550` at :146 and :1119-1120. `format.ts`'s `formatTimestamp` doc block is `:74-82`,
not the `:75-82` at :1503. `SectionActionOptions` closes at `:70`, not the `:69` at :1299.
`DeleteDialog`'s Props run `:12-35` and carry eight members (`conceptId`, `id`, `singular`,
`inboundLinks`, `inboundKind`, `pending`, `trigger`, `onsubmitting`), not the four at `:12-34` the
plan names at :207-208 and :1447-1448. The last one matters most to the argument it supports: the
unnamed `trigger?: boolean` prop is the closest thing `DeleteDialog` has to a host-supplied-trigger
escape hatch, and an adversarial reader will ask about it before accepting that the component cannot
serve. The hardcoded `action="?/delete"` at `:103` and the fixed `aria-labelledby` id at `:71` both
verify, so the correction's conclusion stands.
**Correction.** Name `trigger` and dismiss it explicitly (it changes the trigger, never the posted
action or the dialog's label id), and repoint the five anchors.

**16. Plan:161-166, :1110-1117, :1155-1156 (Task 10) -- "26 sites" is right as a line count and wrong
as an attribute count, and Step 1's stop condition is written against the ambiguous number.** The
enumeration matches my re-measure exactly, line for line, all twenty-six. Three of those lines carry
two glyphs each: `CairnAdminShell.svelte:705` (`MoonIcon` and `SunIcon` in one ternary),
`CairnMediaLibrary.svelte:1170` (`TriangleAlertIcon` and `Trash2Icon`), and
`MediaReplaceDialog.svelte:365` (`TriangleAlertIcon` and a sibling). The fix therefore writes 29
`aria-hidden` attributes across 26 lines. Step 1 orders a re-grep and rules "A count other than 26 is
a stop-and-report", which a per-occurrence grep returns as 29 and halts the task on a correct
measurement. The two named false positives both verify: `CairnLogo.svelte:21` sets its own, and
`CairnAdminShell.svelte:892` carries `aria-hidden` on `:894`.
**Correction.** State the population as 26 lines carrying 29 glyphs, and write the stop condition
against the line list rather than a bare count.

## Measurements verified

| Claim | Plan's figure | Measured at `f944ca4e` | Verdict |
|---|---|---|---|
| A21 bare-glyph population | 26 sites, enumerated | 26 lines, exactly the enumerated set; 29 glyph instances | Agrees (see finding 16) |
| `segmentTintClass` callers | Six, not the sweep's three | Six: `CairnTidySettings:329,:334`, `TidyReview:277`, `CairnMediaLibrary:609`, `EditPage:477,:482` | Agrees |
| `guard.ts` `cairnAccess` attach sites | `:348` plus a second at `:368` | Both present, each immediately after minting `locals.cairnEditor` | Agrees |
| 20 percent mix contrast | 1.492:1 light, 1.773:1 dark | `admin-design-system.md:224` and `:233`, same numbers | Agrees |
| 55 percent mix contrast | 3.586:1 light, 4.959:1 dark | `admin-design-system.md:227` and `:235`; `:1013` "about 3:1 on base-100" | Agrees |
| Busy idiom, native `disabled` | 3 components / 8 sites | `EditPage:1463,1590,1597,1935,2318,2323`; `ConceptList:509`; `MediaOrphanTools:386` | Agrees |
| Busy idiom, `aria-disabled` | 1 component / 2 sites | `ShareLinkPanel:184`, `:193`, the only two | Agrees |
| Guarded `aria-disabled` (not busy) | 6 sites, settled | `EditPage:1587,1870,1959,2315`, `VocabularyAdmin:297`, `EntryPicker:150` | Agrees |
| Task 6's convergence list | `ShareLinkPanel` alone | The sweep's table names no other busy defector | Agrees |
| `AdminLayout` references | 8, at `:128,:135,:532,:543,:565,:1001,:1005,:1184` | `grep -n AdminLayout` returns exactly those eight | Agrees |
| `admin-visual.spec.ts` baselines | 28, enumerated | 18 non-signups plus 10 `admin-signups-{light,dark}-{320,390,768,1440,2560}` | Agrees |
| Capture matrix | 6 surfaces at `:59-109`, `signups` the one admin route | `home`, `article`, `styleguide`, `archive2`, `error404`, `signups` | Agrees |
| Admin `retiredTokenPattern` | Matches only `--color-muted` and `--color-subtle` | `custom-surface-budget.json` `trees/admin/retiredTokenPattern`, exactly that | Agrees |
| Bracketed fill-tone population | 18 sites across six files | 27 lines (41 occurrences) across nine files | **Disagrees** (finding 4) |
| `segmented-control.ts` anchors | doc `:8-16`, fn `:17`, ring `:19` | doc `:8-15`, fn `:16`, ring `:18` | **Disagrees** (finding 11) |
| `StatusChip` props anchor | `:33-51` | `:62-85` | **Disagrees** (finding 10) |
| `DeleteDialog` props | four, `:12-34` | eight, `:12-35`; `?/delete` at `:103` and fixed label id at `:71` both confirmed | Partly disagrees (finding 15) |
| `formatTimestamp` domain | Two shapes, everything else returned unchanged | `format.ts:87-93` exactly so; `:83`, `:87`, `:89`, `:92`, `:93` all confirmed | Agrees |
| Closed ledger row's false claim | `Reopens on:` says "any Date-parseable" | True at `:2674`, and the `Shape:` line at `:2675` repeats it | Agrees, incompletely (finding 8) |
| Ledger row lines | `audit-admin-officelist` `:2662`, `audit-admin-formattimestamp` `:2670` | Both exact; ROADMAP `:350` cites `2660-2666`, off by 2 as the plan says | Agrees |
| Template byte-identity | `templates/waymark` signups identical to the showcase's | `diff -r` reports identical | Agrees |
| Exports sweep routing to 11b | None; F1-F21 land in 11a, polish-C, the rewrite, or not taken | Spec `:182-220`, `:392-402`, `:358-366`, `:482-484` account for all 21, none in 11b | Agrees |
| `check:figures` in the gate | Absent from committed `test.yml` | `git show HEAD:.github/workflows/test.yml` has zero hits; the script is a working-tree addition | Agrees |
| Gate string, 31 `npm run` gates | Derived from committed workflows | 31 unique `npm run` invocations; the twelve package-chaining wrappers decompose exactly as the plan states, `check:surface` correctly expanded to its two nodes | Agrees |

## Checked and found true

- **Coverage of the admin sweep is complete.** A1 through A30 each land: A1 and A2 in Task 2; A3, A6
  and A16 in Task 5; A4 in Task 4; A5, A7, A19, A26 and A27 in Task 6; A8 in Task 7; A9, A12 and A13
  in Task 13; A10 and A11 in Task 14; A14, A24 and A25 in Task 3; A15 in Task 8; A17, A18 and A20 in
  Task 9; A21, A22, A28 and A30 in Task 10; A29 in Task 1. A23 is in the spec's "Findings not taken"
  and no task touches Pagination. Every one carries at least one grep-, test- or diff-checkable
  acceptance criterion, with the two exceptions named in findings 5 and 12.
- **Every spec 11b task is represented, and the split arithmetic is right.** Spec task 1 becomes plan
  Tasks 2 and 3; spec task 6 becomes 7 and 8; spec task 10 becomes 12, 13 and 14; spec task 4 moves to
  first position without splitting. Twelve plus three splits is sixteen. No spec task is dropped and
  no deliverable is silently added.
- **All four Dispositions rows routed to 11b are carried:** the `ShareLinkPanel` busy idiom (Tasks 1
  and 6), the `formatTimestamp` widening (Task 15), the command palette live region (Task 4), and the
  `createSectionAction` adoption after the dev-handle parity task (Tasks 11 then 12, with the ordering
  dependency stated at :1686-1690).
- **The `cairnAccess` seam matches decision 5 and the guard.** Task 11 reads the site's own
  declaration and never a session-derived copy, states it as a decision (:1233-1236) and enforces it
  as acceptance ("No access map is derived from the minted session anywhere in the diff"). The change
  is confined to `packages/cairn-cms-dev/` and the showcase, so the dev package's remit holds and
  `check:surface` stays byte-identical. The mirror target is correct: `guard.ts:348` and `:368` each
  attach `cairnAccess` immediately after minting `locals.cairnEditor`, and the dev handle mints its
  owner editor at `handle.ts:132` on the same `isAdmin` condition, so "the same requests on which it
  mints `event.locals.cairnEditor`" is a faithful reading of both branches. `AccessMap` and
  `RolesDeclaration` are exported from `src/lib/index.ts:25` and `:20` as claimed;
  `DevBackendOptions` is at `handle.ts:26-34`, `devBackendHandle` at `:46`, the type re-export at
  `packages/cairn-cms-dev/src/index.ts:7`. `hooks.server.ts:20` and `:32` are exact, `defineAccess`
  appears nowhere under `examples/showcase/src`, and line 20 sits outside the
  `cairn-template:exclude` fence (which covers only `:21-30`), so the scaffolded site does receive
  the wiring the plan promises.
- **Task 1 satisfies decision 7's "one home" requirement.** The recipe text restates decision 7
  faithfully on both shapes, native `disabled` plus an always-mounted status region for a control
  that stays on screen and `aria-disabled` with `cairn-btn-guarded` for a guarded control whose
  tooltip must survive DaisyUI's pointer-events kill, and the upload recipe's replace-the-control
  shape is kept as its own case. The ledger row is ruled not to restate the recipe and to point at
  the design system by section name (:480-481, :512-515), which is exactly what decision 7 requires.
  The one deviation is the promotion condition, finding 9. The guarded passages the busy text sits
  beside verify at `admin-design-system.md:547-551` and `:843-849`.
- **The `DeleteDialog` correction is justified.** `action="?/delete"` is hardcoded at
  `DeleteDialog.svelte:103` while the signups row posts `?/remove`
  (`examples/showcase/src/routes/admin/signups/+page.svelte:36`), and the dialog is labelled by the
  fixed id `cairn-delete-dialog-title` at `:71`, which cannot serve one dialog per row. The
  route-local alertdialog follows the design system's own safe-delete recipe at
  `admin-design-system.md:917-923`, verified present and matching, and the per-row `aria-label` shape
  at `ManageEditors.svelte:147` verifies.
- **The narrow-pill correction is justified.** `StatusChip` publishes `label`, `size`, `register` and
  `legend` and no `role` or `aria-label`; `EditPage.svelte:1413` carries both plus an inline
  `EyeOffIcon` at `:1414`. Keeping the role and the composed name on a wrapper is the only shape that
  does not add public surface under constraint 5.
- **The contrast correction is justified and needs no re-derivation.** Both the old and the new mix's
  measured figures are already in the document at the lines the plan cites.
- **The render-proof arithmetic is right.** The spec names three arithmetic findings; A3 and A16 land
  in Task 5 and A12 in Task 13, so two tasks end with a render, not three.
- **Ordering and ledger hygiene hold.** Task 1 precedes Task 6, satisfying the spec's own constraint
  that the rule exists before the code converges. Tasks 1 and 15 locate ledger rows by slug rather
  than by line, which is correct given 11a writes the same file. The intended-moves manifest carries
  headings at `:7`, `:42`, `:233`, `:244` and `:286` with no `## Polish-11a`, as stated. The friction
  log reads "None open." at `:25` and `:60`. `ROADMAP.md`'s polish sub-bullet runs `:342-361`.
- **Constraint 7 rests on a verified fact.** `templates/waymark/src/routes/admin/signups/` and
  `examples/showcase/src/routes/admin/signups/` are byte-identical today.
- **Task 2's `check:custom-surface` exposure is real and correctly bounded.** The two pinned
  `drawer-open` selectors at `custom-surface-budget.json:15-16` key off
  `.drawer-toggle ~ .drawer-side`, which the plan preserves by keeping the checkbox; and the
  `cairn-btn-guarded` selector at `:13` survives Task 6, since `cairn-admin.css:750` and
  `EditPage.svelte:1587` keep it in use.
- **Scope additions are two and both are cheap.** Task 16 files the bracketed-fill-tone sweep to
  ROADMAP's Later tier, which the spec routed to no pass, and Task 3 adds a palette label-uniqueness
  assertion the sweep did not ask for. Neither warrants a split; the second is a stop-condition worth
  keeping.
