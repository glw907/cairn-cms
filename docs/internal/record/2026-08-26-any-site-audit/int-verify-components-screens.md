
# Fresh-context verification — components-screens (2026-08-26)

Verified against `main`, file-by-file. Verdicts: CS-01 stands, CS-02 stands with tier
revised down, CS-03 stands, CS-04 stands.

## CS-01 — CairnMediaLibrary.svelte: STANDS (rewrite)

Confirmed. 3,159 lines. Six feature dialogs at 1954/2043/2300/2571/2802/3103, six open/close
controller pairs each over its own `$state` cluster.

Corrections to the evidence, none fatal:
- `openDeleteDialog` (:302) does NOT use the `void tick().then(...)` shape. It is
  `confirmSlugInput = ''; flushSync(); deleteDialog?.showModal();`. The `tick()`-vs-`flushSync`
  divergence is deliberate and documented at :882 (Svelte's `flush_sync_in_effect` guard rejects
  `flushSync` inside an effect). So the repeat count for that literal block is 5, not 6 — and the
  divergence is itself an argument FOR a `createDialogController()` that owns the choice once.
- `openOrphanScan` (:1199) focuses `orphanTitle`, not a cancel button. Five of six focus a cancel
  button.
- The footer literal is UNDERSTATED, not overstated: `justify-end gap-2.5 border-t
  border-[var(--cairn-card-border)] pt-3.5` occurs 13 times (2025, 2135, 2234, 2284, 2514, 2555,
  2665, 2763, 2787, 2857, 2902, 2958, 3087), in three near-variants (`flex` / `mt-4 flex` /
  `mt-4 flex items-center`). That variance is exactly the drift a shared footer snippet stops.

Deliberate-design check: `code-idioms.md:168` and `ROADMAP.md:1609` both record the deferral, and
both frame it as "its own designed pass", not a sanction. `ROADMAP.md:1609` characterizes the file
in the finding's own terms. Under the standing ruling (churn free until beta, pre-beta is when the
engine gets perfected), a filed future pass is a reason to schedule, not a reason to drop.

Remediation note: the plan's per-dialog child components must reckon with the `$effect` at :885
that re-opens the delete dialog from a server `form` failure — that cross-component re-entry is the
one non-mechanical part of the split.

## CS-02 — HelpHome.svelte: STANDS, tier REVISED rewrite -> refactor

The duplication is real; the "rewrite / port the whole screen" framing is not supported.

What holds:
- Style block is 344-844 (501 lines, finding said 495 — immaterial).
- `.sr-only` (:350) is a genuine shadow. `src/lib/components/**` IS an `@source` root
  (`scripts/build/admin-css.input.css:14`), so Tailwind's `sr-only` compiles into the shipped
  sheet, and 17 other components in `src/lib/components` + `src/lib/admin-toolkit` use it as a
  utility. HelpHome is the only local re-implementation.
- `.eyebrow` (:373) is a genuine shadow: byte-equivalent to what `PageHeader.svelte:66` emits
  (`type-label font-semibold uppercase tracking-[0.08em] text-muted`), and HelpHome imports and
  mounts `PageHeader` (:24).
- `.card` (:411) is a genuine shadow of the `card-shell` utility
  (`admin-css.input.css:168`, `rounded-box border border-[var(--cairn-card-border)] bg-base-100`)
  plus `card-shadow`.

What does NOT hold, and is why the tier drops:
- **The scoped `<style>` block is a documented, ratified decision, not drift.**
  `docs/internal/admin-design-system.md:880-886` states the Help home recipe explicitly: "it
  carries no `data-theme` wrapper and imports no CSS; it consumes the Warm Stone tokens through
  its scoped `<style>`", and goes on to specify the progress rail, the step-box ring contrast
  (`color-mix(... 55% ...)`, the WCAG 1.4.11 floor), and the three non-color done cues at that
  level of detail. The `@component` block (:9) says the three sections "stay their own
  hand-written recipe this wave". A finding that reads the scoped block itself as the defect is
  arguing against a written ruling.
- **"admin-icons.ts already exports Lucide equivalents for every one of them" is false for 4 of 7.**
  The seven SVGs are: the cairn mark (:132, four stacked ellipses — a bespoke brand glyph with no
  Lucide equivalent, correctly inline), check (:164), check (:180), chevron-right (:196),
  info-circle (:254), mail (:307), external-link (:323). `admin-icons.ts` (32 lines, read in full)
  exports `CheckIcon` and `ChevronRightIcon` — so 3 of 7 are importable today. There is no
  `MailIcon`, no `ExternalLinkIcon`, no `InfoIcon`. Converting those three would mean ADDING
  exports to the fixed icon set, which that file's own header describes as deliberate
  ("The fixed set of Lucide glyphs the admin chrome uses ... so only these ship").
- **`.kbd` is a four-way fork engine-wide, not a HelpHome sin.** `TidyReview:302` uses DaisyUI
  `.kbd`; `CairnAdminShell:681` and `EditPage:2692` each hand-roll their own inline-utility kbd;
  HelpHome:739 scopes a fourth. Naming HelpHome as the deviant misreads which file is out of step.

Revised shape of the true finding: converge the three shadowed recipes (`.sr-only`, `.eyebrow`,
`.card`) onto the engine's, import `CheckIcon`/`ChevronRightIcon`, and keep the rest of the scoped
block as the design system already ratifies it. That is a refactor. (A separate, real, out-of-scope
finding surfaced here: the admin has four kbd idioms and no ruling.)

## CS-03 — the announce-nonce block: STANDS (refactor)

Confirmed and, on the strong half, understated.

Five byte-comparable blocks: `ConceptList:267`, `ManageEditors:68`, `CairnTidySettings:77`,
`NavTree:111`, `VocabularyAdmin:139` (fn renamed `errorNonce`). Each carries the same `$state(0)`,
the same `% 2 === 0 ? '' : '​'`, the same non-reactive `lastSubmit` guard, the same `$effect`,
the same `liveError` `$derived` — AND a near-identical five-line explanatory comment, so the
comment prose is copy-pasted too.

The three conflicting exemplar citations are real and verbatim: "(the MediaPicker discipline)"
ConceptList:265; "(the ConceptList discipline)" ManageEditors:65, NavTree:109, CairnTidySettings:75;
"(the NavTree/ConceptList discipline)" VocabularyAdmin:136. A new developer following the trail
lands somewhere different depending on which file they open first, which is precisely the
bar-clause-2 cost.

One correction: `TidyReview:146-153` is NOT byte-comparable. It is a plain `let announceNonce = 0`
(no `$state`), no `$effect`, no `lastSubmit`, and increments inside the getter
(`announceNonce++ % 2`), because it serves two message regions on every action rather than an error
on submit. So the count is 5 identical + 2 legitimate variants (TidyReview's per-call pulse,
VocabularyAdmin:94's `announce()`/`pulse`).

Deliberate-design check, the strongest counter available: `code-idioms.md:156` (S4) says error
surfacing "follows `ConceptList.svelte`'s live-region shape", i.e. the charter chose a
shape-to-imitate over a helper-to-import, and the live-region block is absent from S3's enumerated
extraction list. That is the argument for "deliberate". It does not survive S3's own general rule
("the repeated in-file idioms extract to one home each, `src/lib/components/` internals") plus the
outcome: naming a file as an exemplar produced three mutually inconsistent citations and a rename,
which is the failure mode S3 exists to prevent. S4 is best read as pre-dating the fifth copy.

Remediation correction: the helper must be `live-announce.svelte.ts`, not `.ts` — `$state`/`$effect`
outside a component require the rune-aware module extension. Its shape needs to cover both the
submit-identity-guarded error nonce and the per-call pulse, or it will grow a third variant.

## CS-04 — tab indentation vs M4: STANDS (refactor)

Fully confirmed, mechanically.

- `code-idioms.md:77` (M4): "Indentation is 2-space everywhere; the tab-indented `doctor/` tree and
  its test cluster converge, and an `.editorconfig` records it."
- `.editorconfig:1-3` names M4 in its own header comment and sets `indent_style = space`,
  `indent_size = 2`.
- Tab-indented line counts match the finding exactly: `tidy-categorize.ts` 302, `tidy-diff.ts` 130,
  `tidy-validate.ts` 81.
- Repo-wide, exactly 8 files under `src` are tab-indented: the three above plus
  `src/lib/diagnostics/error.ts`, `src/lib/diagnostics/conditions.ts`,
  `src/lib/sveltekit/tidy-prompt.ts`, `src/lib/components/chrome-guard.ts`,
  `src/lib/components/editor-tidy.ts`. The finding's "five more siblings" is exact.
- No gate exists. `package.json` contains no `prettier` dependency and no `format` script (grep
  exit 1); `eslint.config.js` has no `indent` or `no-tabs` rule (grep exit 1);
  `scripts/checks/check-comments.sh` runs ESLint for TSDoc structure and the em-dash ban only.
  `.editorconfig` is editor-advisory and nothing in CI reads it.

No ruling anywhere sanctions tabs. Note the pass-partition line `code-idioms.md:193` assigns
"M1/M2/M4 (tabs)" to cluster 7 (`auth-github` + `tooling` + `scripts`) — the sweep converged the
`doctor/` tree M4 names and never reached these eight, so this is unfinished M4 work, not a
carve-out. The finding's own framing (make M4 falsifiable with a `check:format` in the CI gate list)
is the right shape and matches the repo's stated watch-item doctrine: convert a watch into a failing
gate rather than a prose note.
