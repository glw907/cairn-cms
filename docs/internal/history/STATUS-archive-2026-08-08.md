# STATUS archive: 2026-08-08 (the stable 0.94.0 window and the vertical-alignment pass)

Superseded by the cleanup pass entry in `docs/STATUS.md` on 2026-08-09. Kept because it records
the `0.94.0` promotion mechanics, ASC's adoption, and the vertical-alignment pass as STATUS
carried them. The pass's own detail lives in its plan post-mortem.

## Immediate next action (2026-08-08: stable `0.94.0` on `latest`; ASC adopted; the vertical-alignment pass is MERGED and unreleased; the CLEANUP PASS is SPECCED AND PLANNED, execution next, ahead of release one)

**The cleanup pass is ready to execute (2026-08-08, the Fable brainstorm sitting).** The spec is
[`2026-08-08-cleanup-pass-design.md`](../../superpowers/specs/2026-08-08-cleanup-pass-design.md) and the
plan is [`2026-08-08-cleanup-pass.md`](../../superpowers/plans/2026-08-08-cleanup-pass.md), both
committed. The sitting's rulings: **cairn-audit ships whole as consumer product** (the
hypothesized rule split dissolved on evidence: all 23 registered rules audit the `/admin` surface,
and a consumer's admin IS cairn's admin toolkit); the lab apparatus evicts from `src/lib` with a
registry-reachability gate in `check:package`; `@anthropic-ai/sdk` becomes an optional peer (the
pass's one `Consumers must:` line, batching into release one); and all three scope edges are in
(legacy/history pruning, theme-port relocation to a private `glw907/cairn-themes`, the SDK move).
**Execution runs in a fresh Opus 5 session**: launch in `~/Projects/cairn-cms`, invoke
`cairn-pass`, and execute the plan task-by-task on a feature worktree. Then release one.

**Stable `0.94.0` published 2026-08-07**, the content-identical promotion of `0.94.0-rc.2`: same
source, same exports, same breaking list, proven end-to-end by ASC's 75-spec Playwright run
against `rc.2` from the registry. `npm view` confirms `latest: 0.94.0`. (`next` still points at
`0.94.0-rc.2`, now behind `latest`; it sits there harmlessly until the next candidate replaces
it.) One mechanic to know when reading the history: the release targeted commit `1d415c1b` on
`release/v0.94.0`, a one-commit promotion branch off the `v0.94.0-rc.2` tag, NOT `main`'s tip,
because `main` already carried the history-revert window under `## Unreleased` for release one
and publish.yml ships whatever tree it checks out. The stable-cut renames (heading to
`## 0.94.0`, RC preambles dropped, per the rule now archived) landed twice, once on the
promotion branch and once on `main`; tag `v0.94.0` keeps the promotion commit alive.

**ASC's `0.94.0` adoption is COMPLETE and verified** (2026-08-07): the migration merged to that
repo's `main` via its PR #3 (merge `3e7d97d`), `origin/main` carries the `^0.94.0` pin, the
"Deploy to Cloudflare Workers" run on `main` completed green, and ASC's own STATUS records the
adoption merged, deployed, and smoked. Nothing in cairn waits on ASC.

**The remaining consumer migrations WAIT for release one (Geoff, 2026-08-07).** The vertical
alignment pass holds unpublished, so migrating now would make `907-life`, `ecxc-ski`, and
`cairn-pub` cross twice (to `0.94.0`, then again for the fix). Order, REVISED 2026-08-07 to put the
cleanup pass ahead of the cut: vertical alignment pass → cleanup pass → release one → each site
migrates ONCE, landing history/revert, preview, the alignment machinery and the settled package
surface in a single crossing, with the upgrade guide's `0.92.0` geometry note in place when they
cross the register flip. (cairn-pub's saves and publishes stay blocked on the GitHub App
installation item below regardless; its migration is not.)

**One finding came back with the verification**, filed to `ROADMAP.md`'s Now tier rather than left
in a report: the stacked register drops a field's control by the label's height, so a bare sibling
control in the same row no longer aligns with it (12.5px on ASC's season picker, both widths, both
themes). It sits beside the optical-centring default Geoff asked for on 2026-07-30, which was
refiled at the same time after being lost in a closed plan's next-pass-seed paragraph. They are one
class and are worth one pass.

**Both Phase F passes are DONE and MERGED to `main`.** Pass one (history and revert): merge
`55aaad28`, 2026-08-06, post-mortem in
[`2026-08-06-history-revert.md`](../../superpowers/plans/2026-08-06-history-revert.md). Pass two
(public preview): merge `e3db7de8` via PR #23, 2026-08-07, all five CI checks green on the
real merge ref, post-mortem in [`2026-08-06-preview.md`](../../superpowers/plans/2026-08-06-preview.md)
(the pass-end adversarial workflow refuted 34 of 41 findings and the 7 confirmed are fixed;
the live admin smoke and its transcript are in the post-mortem). Both hold under
`## Unreleased` for RELEASE ONE; no version bump. The spec, with its round 3 corrections and
the discard nuance, is
[`2026-08-06-history-revert-preview-design.md`](../../superpowers/specs/2026-08-06-history-revert-preview-design.md).

**Pass A is MERGED to `main` (`f5b9a301`, 2026-08-08) and holds unreleased under `## Unreleased`.**
Release one no longer gates on it; release one now follows the CLEANUP PASS, for the ordering
reason recorded above. Task 1's corrected inventory (5028 readings, 106 renders) found the
defect surface far smaller than the ratified cairn-wide design assumed: 5 confirmed admin rows, 0
public rows, 2 reviewed declines. Geoff's same-day rescope (recorded in the plan's own text) cut
the pass to what that inventory actually supported: task 2 (admin recipes, reduced to the 5
confirmed rows), the site-visual suite widened to the five-viewport bar as its own task, task 4
(the rendered `cairn-audit` rule) dropped entirely in favor of a new task 4b (a static, browser-free
guardrail for the one confirmed mechanic), and task 5 (docs). Full detail, including every
verified measurement, the two mechanisms locked in, and the pass's own cost accounting, is the
post-mortem appended to
[`2026-08-07-vertical-alignment-cairn-wide.md`](../../superpowers/plans/2026-08-07-vertical-alignment-cairn-wide.md).
The harvest, the "ink not boxes" lesson now folded into the `visual-fidelity` skill's trigger, and
the gate lessons (a passing visual baseline certifies stability never correctness; a conformance
fan-out cannot find a wrong premise) are banked in
[`2026-08-07-vertical-alignment-harvest-findings.md`](../record/2026-08-07-vertical-alignment-harvest-findings.md).

**Both open decisions the post-mortem raised are now RESOLVED.**

**`icon-baseline-synthesis` is REMOVED (Geoff, 2026-08-08), after the pass closed.** What the pass
ships is the recipes (`FieldRow`, `cairn-icon-label`, `cairn-line-slot`) and the vertical-alignment
doctrine in `docs/internal/admin-design-system.md`. The rule detected the one markup shape the same
pass eliminated: it fires on zero files across `src` and `examples/showcase/src`, and the showcase
declares `items-baseline` on no element, so its precondition never occurs. It had already been
demoted to advisory after failing `error` tier on five measured false positives. Under the charter
that is pure shipped surface, so the rule, its tests, its reference entry, its changelog and
upgrade-guide text, and the ROADMAP item for earning `error` tier are all deleted. The lesson is
banked in
[`2026-08-07-vertical-alignment-harvest-findings.md`](../record/2026-08-07-vertical-alignment-harvest-findings.md).

`.cairn-icon-label`'s wrapping-label gap is **fixed** (commit `524a76a8`): `align-self: start;
min-height: 1lh` takes a 3-line label from +16.71px to -0.29px against the first line's cap centre,
with the single-line case unchanged at a 0.00px baseline delta. `min-height`, not the reviewed
`height`: cascade layers put `utilities` after `components`, so a `height` written in
`@layer components` is a silent no-op against the glyph's own `h-3.5`. The same commit fixed the
recipe's comment, which stated a mechanism measurement refutes, and gave `FieldRow` the `var()`
fallback it needed to stop silently collapsing to `display: block` outside `[data-theme='cairn-admin']`.

**THE PASS IS MERGED.** `f5b9a301` on `main`, 2026-08-08, with the full gate verified on the merge
commit itself (`npm run check` 0/0, `npm test` 414 files / 5300 tests exit 0). Run `npm run package`
before `npm test` on a fresh checkout: several assertions read the BUILT package, and a stale `dist`
produced six phantom failures on this very merge before the rebuild cleared them.

CI regenerated both visual baselines on the canonical runner (run `31245114459`): 26 new site
baselines written, and **zero admin baselines changed**. That result is not evidence the fixes
failed, and the reason is the pass's most useful finding, recorded in ROADMAP's Now tier. The
baselines were read at the extremes in both themes and hold the five-viewport bar.

**One question is still open and it is Geoff's:** the plan's ratified rescope says
`text-box: trim-both cap alphabetic` ships, and it did not. The implementer declined it and a
verifier independently confirmed the evidence: it is inert where the spec wanted it (padded chip
23.00px unchanged, `.btn btn-sm` 32.00px unchanged) and where it does bite it breaks the published
grammar-tokens contract (`type-chip` 13.00 to 7.14px, `type-label` 14.00 to 7.86px, against a test
asserting each type role's declaration "and nothing else"). The decline looks right and the plan
text looks wrong, but the rescope was ratified, so Geoff rules. Nothing blocks on it.
4. Only after 1 through 3: merge.

**THEN THE CLEANUP PASS, NOT RELEASE ONE (Geoff, 2026-08-07).** The ordering changed once the
conflict surfaced: the cleanup pass settles whether `cairn-audit` is consumer product or engine
apparatus, and that is the only part of it that can REMOVE exports. Shipping release one first would
make `907-life`, `ecxc-ski` and `cairn-pub` cross once for release one and again for the surface
change, which is the exact double-crossing the current wait exists to prevent. So: cleanup pass →
release one → each site migrates once. The cleanup pass opens with a Fable-orchestrated brainstorm,
since its central question is a positioning call rather than a code change; its entry, the measured
baseline (2.5 MB packed, 7.0 MB unpacked, 739 files) and its three confirmed findings are in
`ROADMAP.md`'s Now tier.

