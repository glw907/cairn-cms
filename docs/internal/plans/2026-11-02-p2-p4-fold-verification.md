# p2-p4 fold verification

Read of the uncommitted revision of `2026-11-02-p2-p4-plan.md` and `-design.md` against the fold
record and the three reviews, at base `6c4ed71fd`.

**Counts:** 0 blocker, 3 major, 9 minor. No finding changes the design, so another read isn't due.

## The four questions

- **Did each blocker and major close at the cited location?** Yes for all 4 blockers (B1, B2, C1, D1) and
  every major in the three reviews (M1 to M9, C2 to C13, D2 to D5). One minor did not close as
  recorded: D6, finding 8 below.
- **Did the fold add a contradiction or an unbuildable order?** One unbuildable instruction, finding 1.
  The task order and pairs hold, and the arithmetic holds: path 580, 565 under a Cleanup ruling, 42 and
  16 + 10 images.
- **Is every new mechanism quoted or proven?** The devalue envelope, `refreshAll`, `cancel()`, and the
  `error` path match the source (Kit 3.0.1, peer `^3`). A mocked envelope has no `location`, and
  `client.js:89-99` then goes straight to `applyAction`, so the two mocks hold. The sticky cue's
  geometry reproduces with the real `padding: 4px; margin: -4px`. Two claims fail: findings 2 and 3.
- **Can `cairn-cms-9b` rule S1 and S2?** Yes. S1's options and costs are right, apart from finding 11's
  wording downstream. S2's arithmetic and May-not framing are right, and `golden-path.spec.ts:785,790`
  does stay unbroken. S2 should carry finding 3's extra line, which doesn't change the recommendation.

**Spot-check:** 49 of 52 quoted lines match. The two wrong ones are in finding 10. `golden-path.spec.ts:785`
is a line reference, and it pins what the plan says.

**`small-api` overlaps:** `origin/worktree-small-api-run` is still `e31dfdb83`. `ContentFormFailure` is at
`index.ts:36` and `runtime.email` at `auth-routes.ts:240`, as stated. Two touched files have no table
row, `auth-error-codes.ts` and `content-routes-settings.ts`, but their hunks don't meet this pass's lines,
so nothing is owed.

## Major

### 1. Major, `correctness`. T1 tells the executor to nest a marker pair, and the emitter throws

**Location:** `2026-11-02-p2-p4-plan.md:205-207`, against `:191-192`; `scripts/build/emit-template.mjs:45`;
`examples/showcase/src/hooks.server.ts:22-27`.

**Defect:** the plan lists "the call at `:26`" among pieces that take "their own marker pairs". Line 26
already sits inside the block at `:22-27`, as `:191-192` says. `stripMarkedBlocks` throws
`nested cairn-template:exclude-start` on a second start inside a block, so followed literally, T1's
`npm run emit:template` acceptance fails. The fold added this while closing M3.

**Fold:** say "Two more excluded pieces go in their own marker pairs": the import and the `app.d.ts`
line. Add that the call at `:26` changes in place inside the existing block.

### 2. Major, `correctness`. `refusal.ts` can't hold a flag that the buttons read

**Location:** `2026-11-02-p2-p4-plan.md:107,373,396-400,409,687`; `2026-11-02-p2-p4-design.md:104,118`.

**Defect:** the factory "holds that form's pending flag", and each button takes `disabled` and
`aria-busy` from it. A flag the template reads must be `$state`, and runes compile only in `.svelte`
and `.svelte.ts` files. That's why this directory has `tidy-controller.svelte.ts`,
`editor-preferences.svelte.ts`, and `figure-editor.svelte.ts`. T6's Files name `refusal.ts`, and
`cairn-implementer` commits listed files only. ManageEditors also has no home for its flags: three of
its four forms repeat per row inside `{#each}` (`ManageEditors.svelte:119-150`), so "one per form" is
one per row.

**Fold:** rename the module `refusal.svelte.ts` at each cited line and in the design, with a getter for
`pending`. State the per-row home: a `SvelteSet` of pending keys in ManageEditors, keyed by action and
email, with the factory taking the key. The alternative is a plain `refusal.ts` whose factory takes an
`onPending(boolean)` setter, leaving each screen its own `$state`. Either is fine; the plan must name
one.

### 3. Major, `correctness`. `scroll-padding-right` doesn't move the case #276 is about

**Location:** `2026-11-02-p2-p4-plan.md:538,548`; fold record `:32`; `ListToolbar.svelte:267`.

**Defect:** the plan says the padding means "a focused option clears" the cue. The fold's probe measured
only scroll positions, never focus. I ran one in Chromium on a 286 wide row, with the real padding and
margin, and the option partly visible as `Pub` is:

| Case | `scrollLeft` | Last option's right edge | Row's right edge |
| --- | --- | --- | --- |
| Tab to a partly visible option, with the cue | 0 | 377 | 299 |
| Tab to a partly visible option, no cue | 0 | 377 | 299 |
| Tab to a wholly hidden option, with the cue | 234 | 263 | 299 |
| `scrollIntoView({ inline: 'nearest', block: 'nearest' })` on the partly visible option, with the cue | 114 | 263 | 299 |

Chromium doesn't scroll a partly visible element on focus, so `scroll-padding` never applies. A keyboard
editor who arrows to **Published** selects it clipped, now under the gradient too. This is the item's own
complaint, and the T8 acceptance can pass by scrolling the row by script.

**Fold:** add to T8, after `radios[next]?.focus()` at `ListToolbar.svelte:267`:
`radios[next]?.scrollIntoView({ inline: 'nearest', block: 'nearest' })`. It honors the padding, as the
last table row shows. T8's test drives the keys: focus the checked option, press End, and assert the
option's right edge sits left of the cue's. Add one clause to S2's recommended text, with no change to
its 20 minutes.

## Minor

### 4. Minor, `correctness`. T8's cue test passes today

**Location:** `2026-11-02-p2-p4-plan.md:547-549`.

**Defect:** `publish filter shows its cue` asserts that the last option fits at scroll end and is
reachable. Both are true with no cue, so the test can't fail for a missing cue.

**Fold:** also assert computed `::after` `position` is `sticky` at 320 and `content` is `none` at 768.

### 5. Minor, `correctness`. The e2e line's quoting breaks on a `--grep`

**Location:** `2026-11-02-p2-p4-plan.md:156-162,224,267,550`.

**Defect:** the whole command is one double-quoted string, and the tasks give `--grep "…"`. Pasted in,
the inner quotes end the string, and T8's `|` becomes a shell pipe.

**Fold:** add to the e2e line's paragraph: inside it, write `--grep` values in single quotes.

### 6. Minor, `correctness`. T9's grep hits its own required mock

**Location:** `2026-11-02-p2-p4-plan.md:572,578`.

**Defect:** the acceptance greps the file for `click` and `fill`, and T9 requires `page.route` with a
fulfill, so `route.fulfill` matches. The fold added the mock.

**Fold:** grep for `\.click\(|\.fill\(`.

### 7. Minor, `correctness`. T1 skips the rule the fold record leans on, and the busy row omits T4

**Location:** `2026-11-02-p2-p4-plan.md:142,177-183`; fold record `:73`; `pass-core` "On an `auth-data` task".

**Defect:** O3 was refused because `pass-core` requires a per-commit `standards:diff-reviewer` on an
`auth-data` task, and T4 and T5 carry it. T1 is `auth-data` and doesn't, though it holds this pass's only
real `hooks.server.ts` change. `pass-core` also bars `RUN_GATE_IF_BUSY=defer` on any `auth-data` task,
and the row names only T1 and T5.

**Fold:** add the review sentence to T1, and write "never T1, T4, or T5".

### 8. Minor, `correctness`. D6 is recorded as folded with a select assert, and there is none

**Location:** `2026-11-02-p2-p4-plan.md:424,446-447`; fold record `:119`.

**Defect:** the outcome says the `<select>` returns to the row's role, with no mechanism and no criterion.
`refreshAll` won't do it: the data doesn't change, so Svelte won't rewrite `selected`, and Kit resets a
form on `success` only (`client.js:84`). The showcase uses the default vocabulary, so no e2e reaches this
arm.

**Fold:** in the role form's failure branch, call `formElement.reset()`, which restored the default
selection in a probe of server-shaped HTML. Add a `ManageEditors.test.ts` case with a custom vocabulary.
That case must also show that an option created on the client keeps its default.

### 9. Minor, `correctness`. T7 names the wrong `form` and leaves the banner's action ungated

**Location:** `2026-11-02-p2-p4-plan.md:491,495-496`; `EditPage.svelte:129,1980`.

**Defect:** in `EditPage`, `form` is the action-data prop, and the element is `editForm`. Separately, the
banner mounts on every `formError`, so a plain mount-time action also fires when a control exists, and the
two focus moves race.

**Fold:** write `editForm.elements.namedItem(field)`. Apply the action to the banner only when no control
matched, and let T7's acceptance fail if the banner holds focus in the named-control case.

### 10. Minor, `correctness`. Two quoted lines are wrong, one through the fold

**Location:** `2026-11-02-p2-p4-plan.md:48,189`; fold record `:68`.

**Defect:** the trim is `src/lib/content/fieldset.ts:128`. Line 127 is the number branch, so m12's
correction from `:128` was wrong. The `fake-github.ts` quote is at `:45`, not `:46`.

**Fold:** correct both numbers, and correct the record's `:127`.

### 11. Minor, `correctness`. T11's changelog line doesn't branch on S1

**Location:** `2026-11-02-p2-p4-plan.md:613`.

**Defect:** "under S1, that a too-long value is reported rather than truncated" is false under trim or
defer, the two rulings that keep `maxlength`.

**Fold:** write "under warn, either form".

### 12. Minor, `optional`. T2's new focus promise has no criterion

**Location:** `2026-11-02-p2-p4-plan.md:247,261-262`.

**Defect:** the fold added "moves focus to its label input" (m13), and nothing tests it.

**Fold:** add one clause to the NavTree component acceptance.
