# Theme identity pass C plan review: contract and criteria

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md` at `1ed7e232`, against
`docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`. **Lens:** is every promise
testable, can any criterion pass vacuously, does every check name its report per state and every proof
its fixture state, does every pass C spec promise land in a task's acceptance, and do the classes,
gates, and owner time fit the risk (pass-core table).

**Counts:** 0 blockers, 10 majors (one an OWNER FORK), 14 minors.

## Where the plan is sound

- **The spec-to-plan trace mostly holds.** Every pass C bullet under "The contract", "Status inks",
  "Levers", "The guard", "Where the guidance lives", "Proof", and "Documentation and records" maps to
  a task outcome or to the close. The dropped promises are C7 (the three rules on the fixture) and the
  scheme-name independence in C5.
- **Task 1.** It uses table-driven comment positions, runs a regression over the real `theme.css` and
  `tokens.css`, and states a mutation. It also reports fused-declaration counts before and after.
- **Task 2's equivalence ordering.** The expectation is committed before any CSS moves, the commit is
  quoted, and the dropped-import mutation must name the first differing key. This is the right
  primary proof.
- **The fixture lists for tasks 7, 8, and 9.** Each criterion says "exactly the named finding" and
  pairs its fixtures with passing ones, and Review focus 1 and 3 are pinned. The gaps are the missing
  cases in C4, C5, M3, and M4.
- **Anti-vacuity on the public-scope runs.** Task 7 requires a scanned count that includes
  `PreviewBanner.svelte`, probe 2 a count that covers every file it touched, probe 3 a nonzero count,
  task 12 fails on an empty parse, and task 9's pack test mutates culori back to a devDependency.
- **Class choices.** `paint` for tasks 2 to 5 and 10, `engine-logic` for 1 and 6 to 9, Opus on
  task 9, and the close's union (simplifier, full gate, Svelte and daisyUI a11y reviewers,
  `visual-verifier` at S1, the owner sitting) all fit the pass-core table. I found no over-ceremony
  worth its fold cost.

## Majors

**C1. major: `check:surface` goes red on CI from the segment B push to the close, and the
expected-red set does not cover it.** Location: plan lines 454-455 (the "`check:surface` is
regenerated only at the close" constraint), lines 162-170 (the expected-red set), and task 6 at lines
795-849.
- **Defect.** `test.yml:67` runs `npm run check:surface` on every push. `check-surface.mjs` snapshots
  every `exports` entry that has `types`, and the root barrel is one of them. Task 6 adds
  `previewMarkdown` to the root barrel. The local engine string does not include `check:surface`, so
  every task gate stays green while CI fails at the segment B, C, and D boundaries. The boundary rule
  then re-dispatches task 6 for a red the plan itself caused. (The `./cairn-public.css` export has no
  `types`, so task 2 is unaffected.)
- **Fold.** Task 6 runs `npm run check:surface -- --update` and commits
  `docs/internal/api-surface.md`, and its acceptance gains "`check:surface` green". Drop the
  close-only constraint, or restate it as "the close re-verifies". The alternative, adding
  `check:surface` to the expected-red set, leaves three boundaries reading a known red. It is worse.

**C2. major: task 4's literal check is satisfied by today's file, so it passes vacuously, and nothing
proves the banner now reads the theme.** Location: lines 733-739.
- **Defect.** Today every `PreviewBanner` literal already sits inside a `var()` fallback
  (`var(--cairn-preview-bg, #fff6dd)` and the others, `PreviewBanner.svelte:94-117`). "No color
  literal outside a `var()` fallback" therefore holds before the task starts.
- **Defect.** The spec requires the fallbacks themselves to be tokens ("whose fallbacks are tokens").
- **Defect.** The e2e contrast check also passes on today's palette. The task's core outcome, that
  the banner reads contract tokens and follows the theme, has no failing-first assertion.
- **Fold.** The source assertion becomes "no color literal anywhere in the file, fallbacks included".
- **Fold.** `public-preview-tokens.spec.ts` asserts that the banner's computed `background-color`
  and `color` equal the computed values of the named contract tokens the task chooses, in light and
  dark, so today's `#fff6dd` would fail.
- **Fold.** Name the fixture state. Say how the spec reaches the draft state and the published state:
  the minted-token and publish flow that `preview.spec.ts` uses, or a component test that loads the
  real stylesheet.

**C3. major: task 4's preview-ground e2e names an ambiguous comparison and a state the frame cannot
reach, and it has no mutation.** Location: lines 736-739 and the spec's F7 check.
- **Defect.** The preview srcdoc's `<html>` carries `data-cairn-preview` and no `data-theme`
  (`preview-doc.ts:94`). "Waymark dark" inside the frame can therefore only come from the OS
  preference. The explicit-choice state never reaches it.
- **Defect.** "The page's computed `--color-base-100`" is ambiguous. On the admin page it is the
  admin theme's value, not Waymark's.
- **Defect.** The reset `<style>` comes before the site's `<link>`s. If the site sheet paints `body`
  itself, the check passes with or without the fix.
- **Fold.** Emulate a dark OS, and compare the frame `body`'s computed `background-color` with the
  frame document's own resolved `--color-base-100`.
- **Fold.** Assert that the value is not `rgb(255, 255, 255)`.
- **Fold.** Add a mutation to the ledger: revert the reset to `#fff` and the spec fails.

**C4. major: task 3's selection rule can choose an `N` that fails the spec's standing case, which
surfaces only in task 9.** Location: decision 1 (lines 249-260), task 3 acceptance (lines 697-705),
and task 9 (lines 1003-1005).
- **Defect.** The spec fixes two cases. "Waymark with its four ink overrides stripped passes
  [`theme-contrast`] in both schemes" is a `test:reskin` standing case, and decision 18 needs the
  fixture palette to pass `theme-contrast`.
- **Defect.** Decision 1 maximizes the stock-theme pass count and does not make either case a hard
  constraint. A chosen `N` that fails stripped Waymark on one ground is discovered six tasks later,
  after tasks 4 to 8 were built on it.
- **Fold.** Make "stripped Waymark and the fixture pass every pair in both schemes, on all three
  grounds" a hard constraint of the selection.
- **Fold.** Task 3's acceptance asserts it from the measurement record. When no `N` satisfies it,
  task 3 stops and reports; decision 18's "a finding about `N`" then fires at task 3, not task 9.

**C5. major: `theme-contrast`'s "schemes come from the daisyUI blocks, never hard-coded names" is
untestable as planned, and its zero-finding runs can pass on zero pairs.** Location: lines 986-990,
1011-1018, and 1042-1048.
- **Defect.** Every theme the plan exercises is named `cairn` and `cairn-dark`: the showcase, the
  overlay, and the fixture ("It keeps the names"). A resolver that hard-codes those names passes
  every acceptance item.
- **Defect.** "Zero findings over the showcase" is also true when the rule finds no scheme and
  measures no pair.
- **Fold.** Add a fixture with blocks named, for example, `acme` (`default: true`) and `acme-night`
  (`prefersdark`), with one failing ink in `acme-night`. Assert that the finding names
  `acme-night`.
- **Fold.** Add a fixture for the secondary block's fallback to the default block's `:where(:root)`
  values, and one for the `prefersdark` media rule.
- **Fold.** Each zero-finding run reports its per-scheme measured-pair count, and the acceptance
  requires it to be nonzero and equal to the expected pair list's length.

**C6. major: nothing proves the successor `check:public-tokens` fails.** Location: lines 1000-1003
and 1017-1018.
- **Defect.** "All three fail CI from day one" rests on `check-public-scope.mjs` exiting nonzero on a
  finding (decision 14). The acceptance tests only the green path.
- **Defect.** A wrapper that swallows the audit's exit code, or filters to error tier, where the
  three rules are advisory, would stay green forever. The retired script had a unit test; its
  successor has none.
- **Fold.** Add a mutation to the ledger. A planted sub-AA ink, then a planted `#hex` in a chassis
  `<style>`, each make `npm run check:public-tokens` exit nonzero and name the rule. Reverted.
- **Fold.** A unit test for `check-public-scope.mjs`'s exit logic covers each of the four states:
  no finding, an advisory finding, an error finding, and a suppressed finding.

**C7. major: the spec's "the three rules must pass on [the fixture]" has no command in any
acceptance.** Location: task 10 outcome (lines 1047-1048), acceptance (lines 1061-1069), and
decision 18.
- **Defect.** `check:public-tokens` covers the showcase and the `cairn-theme` overlay only (task 9),
  and `reskin-fixture.mjs` measures contrast only.
- **Defect.** No step runs `public-literals`, `theme-conformance`, and `theme-contrast` over the
  fixture. Decision 18's "a fixture palette that fails `theme-contrast` in task 9 or 10 is a finding
  about `N`" therefore has no trigger.
- **Fold.** `check:public-tokens` gains a third variant: the showcase with
  `scripts/lab/theme-fixture/theme.css` in place of `theme.css`.
- **Fold.** Task 10's acceptance quotes that variant's zero findings and its scanned count and pair
  count. Placing the check in the harness's showcase arm works equally well, but one home is enough.

**C8. major: task 10's ink assertions can compare a string with itself.** Location: lines 1052-1054
and the spec's "Proof" harness list.
- **Defect.** For an unregistered custom property, `getComputedStyle` returns the token string with
  `var()` substituted and the `color-mix()` unevaluated. "A derived ink equals its `color-mix`
  result" is vacuous if it reads `--cairn-info-ink` and compares it with the formula.
- **Defect.** "The nested region recomputes its derived ink" does not say what it compares.
- **Fold.** Measure rendered colors. An element painted with the ink has its computed `color`
  compared with a sibling reference element whose `color` is the literal
  `color-mix(in oklab, <resolved fill> N%, <resolved base-content>)`, so Chromium evaluates both.
- **Fold.** For nesting, the ink-painted element inside the injected `data-theme="cairn"` region has
  a computed `color` that differs from the same element outside it and equals the value on the
  light page.
- **Fold.** Add a mutation. Removing `[data-theme]` from the `cairn-public.css` selector fails the
  nesting assertion.

**C9. major: the probes' harness uses are not supported by task 10's harness as specified.**
Location: probe 2 (lines 1206-1209), probe 3 (lines 1210-1214), task 10 (lines 1049-1058), and
decision 19 (lines 380-385).
- **Defect (probe 2).** Probe 2 needs "a clean `test:theme-fixture` build with its theme as the
  harness's theme path". Task 10's showcase-arm assertions are fixture-specific: `--radius-box` is
  `0`, the weight is 800, the case is `uppercase`, and the tag pill is `0`. Any other theme fails
  them.
- **Defect (probe 2).** The theme input is "a theme path", but probe 2 also writes "its own chrome"
  under `src/theme/components`. That is a directory, not one file.
- **Defect (probe 3).** Probe 3 needs computed color and radius from a page served in the template
  arm. Decision 19's template arm only compiles CSS and greps for a sentinel utility, and it serves
  no page.
- **Consequence.** Both probes would fail at S2 for harness reasons and be misread as guidance gaps.
  That costs a retry, then a question to Geoff.
- **Fold.** Task 10 gives the harness a `--theme-dir <dir>` overlay onto `src/theme` and a
  `--build-only` mode (build plus smoke loads, no fixture-value assertions). Probe 2 uses both.
- **Fold.** The template arm serves each build on `THEME_FIXTURE_PORT` and accepts an optional
  `--probe <route> <selector>` that reports computed `color` and `border-radius`. Probe 3 uses it.
- **Fold.** Task 10's acceptance adds one run of each mode.

**C10. major, OWNER FORK: the projection sits at 98 percent of the ceiling, and the plan moves the
80 percent question from the global rule's segment boundary to S3.** Location: lines 102-133.
- **Defect.** The projection is 23.5M against a 24M ceiling. The flag at 19.2M will trip around
  segment D. The global rule is "at 80% ... ask one combined question at the next segment boundary";
  the plan instead waits for S3, two segments later, with 0.5M of headroom for a pass that budgets
  2.0M for fix rounds.
- **Why it is a fork.** Budget is Geoff's call.
- **Option A (recommended).** Set the ceiling at about 29M, which puts the projection near 81
  percent, and keep the global rule unchanged. This is honest about a 13-task pass that also
  carries a release.
- **Option B.** Keep 24M and move the release (1.5M) out to its own session after the merge.
- **Option C.** Keep the plan as written. Geoff pre-approves the deferral at plan approval, so S3's
  question is the sanctioned one.

## Minors

**C11. minor: the equivalence expectation can hold empty values.** Location: lines 284-294 and
652-655.
- **Defect.** Tailwind v4 emits an `@theme` variable only when something uses it. A key that computes
  to `""` before and after the move proves nothing about that key.
- **Fold.** The spec iterates the committed expectation's keys, never a list re-parsed from the moved
  files. It also asserts that the expectation holds no empty value, or lists each empty key with its
  reason.

**C12. minor: task 7 has no test for four of its stated behaviors.** Location: lines 866-884 and
894-901.
- **Fold.** Add a per-form table for the detection core: `hsl()`, `hwb()`, `lab()`, `lch()`,
  `oklab()`, `color()`, named colors, and the non-literals `transparent`, `currentColor`, `inherit`,
  and `unset`.
- **Fold.** Add a mixed `style="color: #abc; width: {w}px"` fixture that proves the static-part
  offsets.
- **Fold.** Test that a configured missing root throws and a default missing root is skipped.
- **Fold.** When a site configures overlapping scopes, a file both scopes would read raises only
  `public-literals`, never `token-colors` as well. This is the spec's "never double-fires".

**C13. minor: the unchanged-`token-colors` check is likely vacuous.** Location: lines 902-903.
- **Defect.** The showcase's admin scope gates clean, so the "committed pre-change list" is probably
  empty.
- **Fold.** Require `token-colors.test.ts` to pass unmodified.
- **Fold.** Add one case asserting that `oklch(60% 0.12 200)` is flagged by `public-literals` and not
  by `token-colors` (decision 15).

**C14. minor: task 8 lacks fixtures for its guard and message states.** Location: lines 930-936 and
949-955.
- **Defect.** The spec promises "fails loudly when the key list is empty or lacks `--color-base-100`
  or `--radius-box`". That is the rule's own anti-vacuity guard, and nothing tests it.
- **Fold.** Inject an empty key list, then one missing `--radius-box`, and assert the named error.
- **Fold.** Add one fixture each for a hole in the default block and a hole in a secondary block,
  asserting the two message variants.
- **Fold.** Add a no-theme-block finding and a `--tw-*` pass case.

**C15. minor: task 9 has no role-pair fixture.** Location: lines 1011-1013.
- **Fold.** Add one failing role and `-content` pair (for example `primary` on `primary-content`
  below AA), since the pair list includes those roles.

**C16. minor: `check:audit-pack` does not name its fixture state.** Location: lines 386-393.
- **Defect.** A minimal site with no public files hits the empty-scope error before peer resolution,
  so "the named message" for missing peers is never reached.
- **Fold.** The fixture site carries a `src/theme/theme.css` with one daisyUI block. The clean run
  reports a nonzero scanned count.
- **Fold.** State whether a run that selects no public rule succeeds without the peers. By decision
  16's logic it should.

**C17. minor: two task 10 checks are weak.** Location: lines 1052 and 1066.
- **Defect.** "The fixture face is in `font-family`" passes on any stack that contains the face.
- **Fold.** Assert the first family, and assert that it differs from Waymark's.
- **Defect.** "Leaves no `.cairn-theme-fixture-*`" is checked only after a green run.
- **Fold.** Check it after the `--radius-box: 0.5rem` mutation run too, since decision 4 promises
  cleanup on failure.

**C18. minor: task 6 misses two checks.** Location: lines 836-843.
- **Fold.** Grep that the "auto-themes with your system light or dark setting" sentence is gone.
- **Fold.** The radius sweep asserts that each of the three named exceptions is still found, so a
  stale exception entry fails, and reports its scanned-file count.

**C19. minor: task 12 has no check for the routing line or for the compile's sources.** Location:
lines 1131-1146.
- **Fold.** Grep that `skills/cairn-extend/SKILL.md` names `cairn-public`.
- **Fold.** State that the coverage gate's Tailwind compile uses the showcase's own sources only.
  If the skill's snippet files became a scanned source, every valid utility would compile and the
  class check would pass vacuously.

**C20. minor: task 2 conflicts with a global constraint.** Location: lines 454 and 635-636.
- **Defect.** The global constraint says "each public export adds its reference entry in the same
  task". Task 2 adds `./cairn-public.css`, and its page, `public-css.md`, lands in task 11.
  `check:reference` is `.d.ts`-driven, so no gate breaks.
- **Fold.** Add one sentence recording task 11 as the sanctioned exception, so the reviewer does not
  flag task 2.

**C21. minor: `paint` has no owner glance mid-pass.** Location: decision 24 (lines 413-417).
- **Defect.** The pass-core `paint` row calls for "an async owner glance at captures mid-pass". The
  plan has only S3, after segment E. The banner palette (task 4) and the styleguide kit (task 6) are
  the taste changes.
- **Fold.** At the segment B boundary, publish a non-blocking Artifact with the banner before and
  after in both schemes and the new styleguide kit. Geoff answers at leisure, and S3 folds any reply.
  The cost is about 0.1M and no attended time is required.

**C22. minor: task 4's "states stay visually distinct" has no check.** Location: line 727.
- **Fold.** Assert that the draft and published banners' computed `background-color` differ in each
  scheme, or leave it to S3 and say so.

**C23. minor: task 13's README grep is unspecified.** Location: line 1179.
- **Fold.** Replace "no 'three' collision count" with the exact superseded sentence, grepped.

**C24. minor: task 9's `.d.ts` promise has no check.** Location: lines 996-997.
- **Defect.** "No shipped declaration references a culori type" names no check.
- **Fold.** `check:audit-pack` runs `tsc --noEmit` over a one-line consumer import in the install,
  or greps `dist/**/*.d.ts` for `culori`. The dependency survey record's presence also belongs in the
  acceptance.
