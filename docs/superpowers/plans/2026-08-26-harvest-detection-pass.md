# Harvest Detection Pass (ASC harvest absorption, detection and docs half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (six tasks;
> Tasks 2, 3, 4, and 5 all append rows to `docs/reference/cairn-audit.md`, so run serially in
> numeric order; no other files overlap between tasks). `cairn-implementer` per task,
> `diff-reviewer` per diff, the full gate inside the chain. Steps use checkbox (`- [ ]`)
> syntax. No task needs a model upshift.

**Token ceiling:** 1.1M. **Checkpoint interval:** four tasks. **Worktree:** `harvest-detection`
off the current `main` tip. Ordering against the toolkit-seams pass: nothing here depends on
it. Rule C as narrowed cannot flag a padding-only opt-in class, so the earlier
rebase-if-it-lands-first instruction is retired; the REAL cross-pass direction is the
opposite, and it is toolkit-seams' problem, not this plan's (if this pass lands first, that
pass's in-tree list-class adoption must clear Rule C, noted in its Task 6).

**Status: REVISED 2026-08-26 (second round), awaiting approval.** Two adversarial reviews ran:
the `engine-triage` re-review against the any-site audit rulings, which ruled the seven-task
draft not approved and prescribed a six-task re-issue (verdicts appended verbatim, "Re-review
verdicts", numbered against the OLD draft), and a second `engine-triage` pre-approval review
of that re-issue (summary appended, "Second-round review record"). Both are folded in. The
second review's headline cuts: the oklch-falsification task is REMOVED as a proven no-op (its
deliverables already ship), and the dead-class extension is REMOVED as unbuildable on its own
motivating case; the oversized static-rules task split in two.

**Goal:** absorb the detection-and-docs half of the 2026-08-26 ASC harvest triage
(`docs/internal/record/2026-08-26-asc-harvest-triage.md`): the mechanically detectable
mechanics become `cairn-audit` rules or doctor checks, the guard's misconfiguration trap gets
detected rather than the guard loosened, and the chassis and docs items land where the charter
puts them. Every rule is generic to any cairn site; none encodes a site's domain.

**Standing constraints (every task):** test-first; new audit and doctor rules must be
falsifiable, with a fixture that reds, a fixed twin that greens, AND a no-false-positive
fixture (break-the-rule proof in the task report); every new rule names its tier (every
shipped rule declares one; exit 2 is never a design verdict). The doctor's three states are
`pass`/`fail`/`skip` (`src/lib/doctor/types.ts:7`); there is no INFO state, and no task
widens `CheckStatus`. Full gate: `npm run check` 0/0, `npm test` exit 0, plus the CI-derived
gate list re-derived from `.github/workflows/` before the first commit. A task that executes
an open audit ruling closes its ledger entry in `docs/internal/engine-rulings.md` in the same
task. Docs pages updated in the same task (`check:reference` for reference pages, Vale clean
on published arms). CHANGELOG under `## Unreleased` per task (the section does not exist,
`CHANGELOG.md:1` is `## 0.96.0`; the FIRST task creates it). No version bump, no publish.

---

## Task 1: Doctor rule for the blanket `no-referrer` trap; guard docs constraint

**Files:** `src/lib/doctor/checks-local.ts`, `src/lib/diagnostics/conditions.ts` (the
condition id registers there; pattern: `checks-local.ts:87` -> `conditions.ts:96`),
`src/tests/unit/conditions.test.ts`, doctor tests, `docs/reference/doctor.md`,
`docs/admin/is-it-working.md` (files every check by condition id, `:64-66`),
`docs/extend/security-model.md` (the guard's constraint paragraph lands there).

**Evidence:** `originMatches` is a strict compare (`src/lib/sveltekit/csrf.ts:23`). Under a
site-wide `Referrer-Policy: no-referrer`, the Fetch spec makes a plain same-origin top-level
POST carry `Origin: null`, so every unenhanced non-admin form 403s. Confirmed live on a
consumer (member sign-in 403 on dev; curl: `Origin: null` rejected, real origin accepted).

- [ ] **The guard does not change.** `originMatches` stays strict; the triage record carries the
      security reasoning (some consumer routes have no second CSRF layer).
- [ ] A new local doctor check flags a site-wide `Referrer-Policy: no-referrer`. The
      constraint is honesty, not mechanism: the check MUST NOT skip silently; a
      no-readable-source result is SKIP with remediation text, never PASS (the audit's
      reshape of the CSRF-handoff check, `audit-cli-config-csrf-disable-check`, ruled the
      silent skip, and `checks-local.ts:91` already models the honest form,
      `skip('svelte.config.js not found')`). A text read is fine and is the only available
      implementation; keep the existing "(heuristic text read)" honesty convention
      (`checks-local.ts:105`). Header sources: `src/hooks.server.ts` (a blanket
      `setHeaders`/response-header write) AND `static/_headers` (the usual source on
      Cloudflare). Failure text names the mechanism (`Origin: null` vs the guard) and the
      remedy: serve `strict-origin-when-cross-origin` (or `same-origin`) as the site default
      and scope `no-referrer` to the token-bearing routes it exists for.
- [ ] Falsifiability, four fixtures: a hooks file with the blanket header FAILs; a `_headers`
      file with the blanket header FAILs; a per-route scoped `no-referrer` stays PASS; no
      readable header source reports SKIP with the sources it looked for.
- [ ] The guard's docs (`docs/extend/security-model.md`) gain the constraint paragraph
      (consuming sites must not ship blanket `no-referrer`; what happens if they do; the
      scoped remedy).
- [ ] Acceptance: full gate green; the condition id registered in `conditions.ts` and covered
      in `conditions.test.ts`; `docs/reference/doctor.md` and `docs/admin/is-it-working.md`
      list the new check with its condition id and its SKIP condition.

## Task 2: `no-uncompiled-class`: `sheet` becomes a source list

**Files:** `src/lib/audit/config.ts` (the `sheet` handling at `config.ts:154`, currently
failing "sheet must be a path"; mirror the `static.paletteFiles` list handling at
`config.ts:160`), `src/lib/audit/rules/static/no-uncompiled-class.ts`,
`scripts/checks/check-admin-css-classes.mjs` (the twin implementation of the same contract,
run as `check:admin-css-classes`), rule tests, `docs/reference/cairn-audit.md`,
`docs/internal/engine-rulings.md`.

**Evidence:** the rule checks only the packaged `cairn-admin.css`, so a class genuinely
compiled by a site's own stylesheet needs case-by-case exemption; one consumer closed a pass
carrying six known-false-positives for classes its own sheet compiles.

- [ ] The remediation shape is the ledger's: `sheet` itself becomes a list of compiled-class
      sources, exactly as `paletteFiles` and `cssFiles` already are. One edit; no third key.
      A string `sheet` still parses as a one-element list (additive; rides the open
      audit-remediation `Consumers must:` window).
- [ ] Ledger hygiene, corrected scope: CLOSE `audit-cli-no-uncompiled-class-static-rule`
      (the one-edit entry this task executes). Do NOT close
      `audit-cli-cairn-audit-config-json-contract-scope-cssfiles-palettefiles`
      (`engine-rulings.md:3835-3838`): it is three edits and names the remediation pass as
      its closer; this task executes edit (b) only, so append a progress note.
- [ ] The twin stays coherent: `check-admin-css-classes.mjs` states the identical contract
      (`:3`); either it adopts the same source-list model or the task records why it stays
      packaged-sheet-only (it gates the ENGINE's own markup, where site sources cannot
      exist). One sentence in the task report; do not leave two silent divergent
      implementations.
- [ ] Tests: a class defined only in a registered site sheet passes; the same class with no
      registration still fails; a missing listed file is a config error, not a silent skip; a
      string `sheet` behaves as a one-element list.
- [ ] REMOVED, deliberately (second-round review): the DaisyUI dead-class extension. Its
      stated condition cannot fire: the packaged sheet ships the full collapse component, so
      `sheet.mentions('collapse')` is true and "produces zero rules in the compiled sources"
      is unreachable; the xcathletes failure was a false NEGATIVE (the consumer's own build
      excluded the component while the packaged sheet still mentions it), and a source-list
      union only moves detection further away. Detecting it needs an asymmetric source model
      no ruling authorizes. The item goes back to the friction log with that evidence
      requirement; it does not ship here.
- [ ] Acceptance: full gate green; the reference page documents the list-valued `sheet` with a
      one-line example; tier named.

## Task 3: Static audit rules: stripe/trim parity, unlayered font clobber

**Files:** two new rules under `src/lib/audit/rules/static/`, registered in
`rules/static/index.ts`; rule tests; `docs/reference/cairn-audit.md`.

**Evidence:** a striped row plus an unconditioned `:first-child`/`:last-child` padding trim
clips the stripe fill on even-count groups. The engine ships NO instance of that condition
(the sheet has no first/last-child trim, and `ExpandableRow.svelte:153-190` is a sticky-cell
zebra fix, a different mechanism), so the grounding is ASC's measured evidence plus the
`container-inset-asymmetry` keep as the standing precedent for a DaisyUI-plus-UA-default
rule; the engine-self-red risk is nil. Under the no-Preflight admin, a Svelte scoped style is
UNLAYERED while Tailwind utilities sit in `@layer utilities`, so ANY unlayered scoped font
declaration beats font utility classes at any specificity (cascade layers, not specificity,
are the mechanism); only a measured render caught the resulting 24px/700 heading. A scan of
`src/lib/admin-toolkit`, `src/lib/components`, and `src/routes/admin` found zero
co-occurrences, so Rule B does not red the engine's own tree.

- [ ] Rule A (stripe/trim parity): a selector applying a striped background (`nth-child`
      background pattern or `.table-zebra`-style class) co-occurring with an unconditioned
      first/last-child padding trim on the same row class yields a finding whose message names
      the parity-scoped form (`:last-child:nth-child(odd)`).
- [ ] Rule B (unlayered font clobber): an UNLAYERED scoped declaration of
      `font-family`/`font-size`/`font-weight`/`font` on an element whose markup also carries
      font-affecting utility classes (`text-*` size, `font-*` weight/family) yields a finding;
      the message names layer precedence as the mechanism and the stable idiom (typography on
      the ancestor the control inherits from).
- [ ] Both rules: red fixture, green fixed-twin fixture, and a no-false-positive fixture (a
      trim with no stripe; a LAYERED or utility-free font declaration). Each rule names its
      tier.
- [ ] Scope statement: `DEFAULT_STATIC_SCOPE` includes `src/lib/components`, which in a
      consumer tree is that site's generic component directory. Both conditions are
      Tailwind-general, so the rules stand on a consumer's public-side components too; finding
      text must not assume the admin sheet. State this in the reference rows.
- [ ] Acceptance: full gate green; both rules listed in the reference page.

## Task 4: Static audit rule: marker-stripped lists; the engine adopts `role="list"`

**Files:** one new rule under `src/lib/audit/rules/static/`, registered in
`rules/static/index.ts`; rule tests; `docs/reference/cairn-audit.md`; the engine's own
admin screens that use the `.list` idiom (add `role="list"`, `grep` for `class="list` /
`.list-row` under `src/lib` and `src/routes/admin`).

**Evidence:** a `<ul>`/`<ol>` whose markers are suppressed stops being announced as a list by
WebKit/VoiceOver unless it carries `role="list"`. Marker suppression arrives two ways: the
list's own classes (a `list-style`-removing utility) or its ITEMS' classes changing used
display away from `list-item` (the engine's own sanctioned idiom: DaisyUI `.list-row`
renders `display: grid`, documented at `cairn-admin.css:466-475`). The engine currently
carries zero `role="list"` (`grep -rn 'role="list"' src/lib src/routes` returns nothing), so
the narrowed rule correctly fires on the engine's own `.list` screens, and the engine
becomes the rule's first consumer.

- [ ] Rule C fires when BOTH hold: (a) the list's own classes remove the marker OR its
      items' classes change used display away from `list-item`, and (b) the list carries no
      `role="list"`. The broad any-utility-class condition is rejected (the standing a11y
      ruling and the markdown wrapper both forbid it). The message names the WebKit
      semantics-strip reason and the one-attribute remedy. Tier named.
- [ ] The engine adopts the remedy on its own screens in the same task: every in-tree
      `.list`/`.list-row` list gains `role="list"`, which is also the rule's
      dogfooding proof.
- [ ] Fixtures: a `.list-row`-style item-display case with no role FAILs; the same markup
      with `role="list"` greens; a marker-keeping styled list is the no-false-positive
      fixture. A padding-only opt-in class (the toolkit-seams list reset, whichever class
      that pass ships) must be covered by the no-false-positive set: it removes no marker
      and changes no display, so the rule must stay silent on it.
- [ ] Acceptance: full gate green; reference page row; the in-tree adoption verified by the
      rule itself running clean on the engine's screens.

## Task 5: Rendered audit rule: panel width at the narrow viewports

**Files:** a new rule under `src/lib/audit/rules/rendered/` (the viewport machinery in
`viewport-overflow.ts` is the sibling to imitate), tests, `docs/reference/cairn-audit.md`.

**Evidence:** the column-drop recipe failed at its third consumer: a 640px summary row inside a
356px wrapper at 390, the expanded panel cut mid-word. The membership case is structural, not
a threshold: `viewport-overflow.ts:64` short-circuits whenever the document itself does not
scroll horizontally, and `:75` skips any element under an `overflowX !== 'visible'` ancestor,
so a row clipped inside a non-scrolling wrapper reaches neither test and no shipped rule can
see it.

- [ ] The contract is narrowed to the cases with no legitimate reading, and BOTH halves carry
      the same qualifier: at 320 and 390, an expanded row panel or a summary row is flagged
      only when it overflows (`scrollWidth > clientWidth`) while no ancestor between it and
      the table wrapper scrolls. A deliberately scrollable descendant inside the panel is
      therefore exempt by the same test, symmetric with the summary-row half. A blanket
      every-row assertion is rejected: it fires on the engine's own sanctioned scrollable
      tables, the false-positive failure mode the `chip-ground-collision` reshape priced (24
      false errors of 40). A violation names the row and the overflowing cell.
- [ ] Falsifiability: a fixture screen with a wide inline control in an expanded panel reds;
      the column-dropped twin greens; a deliberately scrollable `AdminTable` stays green (the
      no-false-positive fixture). Tier named.
- [ ] Acceptance: full gate green; reference page row.

## Task 6: Chassis and docs items

**Files:** the showcase chassis (`examples/showcase` styles; the smooth-scroll rules land
beside its base sheet), `docs/extend/debug-your-site.md` or the best-fit extend page for
the testing pattern, `docs/extend/add-a-custom-admin-screen.md` (the two recipes AND a
one-line touch at `:93`), `docs/internal/engine-rulings.md`.

**Evidence:** ASC carried the reduced-motion half of smooth scrolling for weeks with smooth
never on; date-rendered pages break visual baselines on a calendar day with no commit; the
dialog-form failure contract and the load-when-the-panel-opens shape were each hand-derived at
review cost. Already shipped, so NOT rebuilt here: `scroll-padding-top`, token-derived, at
`showcase/src/theme/site.css:43` (and `grep` confirms no `scroll-behavior` anywhere in the
showcase); a single origin source at `chassis/content.ts:29`.

- [ ] The chassis adds only the missing smooth-scroll halves: `html { scroll-behavior:
      smooth }` and the `prefers-reduced-motion: reduce` override to `auto`. The existing
      token-derived `scroll-padding-top` stays as is.
- [ ] Origin sourcing: a docs note, not a chassis change, AND a ledger entry, because this
      declines triage survivor 15 ("`PUBLIC_ORIGIN` as the only origin source",
      `asc-harvest-triage.md:115-117`), not merely demotes it. The note: canonical/og/feed
      URLs read one origin source (`chassis/content.ts:29` already does); env-sourcing that
      origin collides with deterministic visual baselines. The ledger entry records the
      decline with its reopen trigger: a consumer shipping wrong-origin production metadata
      despite the note, or a fixed-env seam landing that reconciles env-sourcing with pinned
      baselines.
- [ ] Docs, fixed clock: the extend docs name the pattern for date-dependent tests: a
      fixed-today env seam read only from `platform.env`, so CI baselines pin the calendar.
- [ ] Docs, two admin recipes in `add-a-custom-admin-screen.md`: the dialog-form failure
      contract (`use:enhance`; on failure keep the dialog open, focus a dialog-local
      `role="alert"`; on success `update({ reset: false })` then close), and the
      load-when-the-panel-opens convention (stream or fetch panel-only data on open rather than
      shipping it in every list load). Both are recipes, deliberately not components (triage
      ruling: a primitive waits for a second consumer). Write them in plain markup plus
      `FieldLabel`. Deviation from the first-round verdict, deliberate: line `:93` (which
      recommends the retired `TextInput`/`SelectInput`) gets a MINIMAL one-line edit removing
      the two retired names, because shipping new recipes on a page that contradicts them in
      the same window is worse than a trivially mergeable one-line overlap; the remediation
      pass keeps ownership of the page's full sweep, and this deviation is recorded here so
      both passes know.
- [ ] Sequencing note (deliberate): the chassis bullet overlaps the ROADMAP chassis
      improvement round but is independent of the audit reshapes; it stays here because the
      harvest is its evidence and the change is two rules.
- [ ] Acceptance: full gate green; the showcase visual suite passes at all five widths; Vale
      clean on the touched extend pages; `check:docs` green.

## Removed: falsify the rendered contrast rules on oklch (former Task 6 of the first draft)

**Cut by the second-round review as a proven no-op; recorded so it is not re-proposed.** All
three contrast rules already route through the shared canvas normalizer
(`src/lib/audit/color.ts:1-12` records the fix; `border-contrast.ts:72,418` imports and calls
`resolveColors`), and the standing oklch red-path tests already exist:
`browser-regressions.test.ts:274,289` (interactive-contrast), `:570,575`
(chip-ground-collision), and `rulings.border-contrast.test.ts:272` (`color-mix` over an oklch
body). The `RATIFIED_SENTINEL` at `border-contrast.ts:159` is a paint-identity probe, not a
color parser, and its residual is fail-closed (extra findings, never silent passes). The
`chip-ground-collision` reshape hold stands unexecuted and unrelated: that rule must not be
described as sound-and-shipping, but that is the reshape's business, not a test gap.

---

## Self-review notes

Coverage: triage survivors 11–15 map onto Tasks 1–6 (survivor 13's rules now sit in Tasks
2–5; the hover-parity item stays dropped, premise falsified, with the real residual gap named
for when it returns: `focus-parity.ts:46` keys partners on `site.scope.file`, so a partner
declared in a different source file never counts; the oklch item is removed above; survivor
15 becomes a recorded decline in Task 6). Every rule task carries the
falsifiability-plus-no-false-positive requirement and names its tier. Deliverable counts per
task stay at or under roughly six (the first draft's thirteen-deliverable rules task is now
Tasks 3 and 4). File overlap: Tasks 2–5 all append to `docs/reference/cairn-audit.md`,
handled by serial order.

---

## Second-round review record (`engine-triage`, 2026-08-26, pre-approval)

Verdicts on the six-task re-issue: Task 4 (panel width) fix-one, Tasks 1, 2, 3, 6 fix, Task 5
(oklch) escalate as a no-op; the cut prescription and every finding are folded above. The
load-bearing findings: the oklch task's yield was falsified in both halves (already-shipped
normalizer plus already-standing red-path tests); the dead-class extension cannot fire on
`collapse` because the packaged sheet mentions it, and the xcathletes case was a false
negative needing an asymmetric source model no ruling authorizes (cut, back to the friction
log); the doctor's third state is `skip`, not INFO (all bullets rewritten against SKIP, no
`CheckStatus` widening); the heuristic-text-read prohibition was rewritten to the honesty
constraint the audit actually ruled; Task 2 would have closed a three-edit ledger entry the
remediation pass owns (now a progress note); Rule A's engine-grounding claim was false (the
engine ships no instance; restated); Rule C's element scope was ambiguous exactly at the
engine's own `.list` idiom (resolved: items' display counts, and the engine adopts
`role="list"` in the same task); the panel assertion lacked the scrollable-descendant
exemption (resolved: symmetric qualifier); the `.toolkit-list` cross-pass dependency ran the
wrong direction (retired from the header); `add-a-custom-admin-screen.md:93` would have
contradicted the new recipes for a full window (resolved: minimal one-line edit, deviation
recorded); `CHANGELOG.md` has no `## Unreleased` section (the first task creates it);
`check-admin-css-classes.mjs` is a twin implementation the plan omitted (added to Task 2).

---

## Re-review verdicts (`engine-triage`, 2026-08-26, against the any-site audit rulings)

Recorded from the triage dispatch; folded into the task bodies 2026-08-26 (this section is
the first-round revision record; task numbers below are the seven-task draft's).

### Task 1 (doctor rule, blanket `no-referrer`): REVISE, three changes

Membership holds on Arm A (the strict `originMatches` compare at `csrf.ts:22-24` is
engine-held knowledge; not loosening the guard is the correct half). Changes: (1) do NOT
copy the CSRF-handoff check's heuristic-text-read shape, which the audit ruled reshape for
its silent-skip (`audit-cli-config-csrf-disable-check`); land in the three-state result
with "could not find a file to check" as a distinct INFO status. (2) The header source is
usually not `src/hooks.server.ts` on Cloudflare: read `static/_headers` too, and report
INFO (never pass) when no header source is readable. (3) The fixture set follows: add a
`_headers` red fixture and a no-readable-source INFO fixture. The docs half stands.

### Task 2 (`no-uncompiled-class` site-compiled sources): REVISE; adopt the ruled shape

The need is settled (the rule's keep is emphatic), but the ledger rules the remediation
shape TWICE: make `sheet` a list of compiled-class sources, exactly as `paletteFiles` and
`cssFiles` already are (`config.ts:154` currently fails "sheet must be a path"). One edit.
The plan's third key (`static.compiledClassSources`) contradicts constraint 3 (one concept,
one key) and adds to coherence findings 4 through 6. Rewrite as the one-edit reshape, close
both ledger entries as executed, and confirm a string `sheet` still parses (additive,
rides the open `Consumers must:` window).

### Task 3 (stripe/trim parity; `font: inherit` clobber): REVISE

Rule A stands with better grounding: the engine ships the parity interaction itself
(`ExpandableRow.svelte:153-183`), and the `container-inset-asymmetry` keep is the standing
precedent for a DaisyUI-plus-UA-default rule. Rule B's stated mechanism is wrong: cascade
layers, not specificity, are the cause (a Svelte scoped style is unlayered; Tailwind
utilities sit in `@layer utilities`), so ANY unlayered scoped font declaration clobbers at
any specificity. Widen detection to unlayered scoped `font-family`/`font-size`/
`font-weight`/`font` on elements carrying font utilities and name layer precedence in the
message. Both rules: name the tier (every shipped rule declares one; exit 2 is never a
design verdict). Scope caveat: `DEFAULT_STATIC_SCOPE` includes `src/lib/components`, which
in a consumer tree is that site's generic component directory; state what the rules do on a
consumer's public-side component.

### Task 4 (hover parity; dead class; listless `<ul>`): REVISE; drop bullet 1

Bullet 1's premise is falsified by the code: `focus-parity.ts:36-50` does whole-string
swaps over every `:hover` selector (no last-compound keying), so `.ev-title a:hover` with
no focus sibling IS flagged today; the defect belongs to ASC's own probe. Drop it; a real
gap (exact-string matching missing differently-grouped partners) needs its own evidence
and red fixture first. Bullet 2 re-derives as a narrow extension of `no-uncompiled-class`
keyed on the `collapse` homograph (Task 2's registered sources already cover the excluded
components by construction; do not parse a site's DaisyUI `exclude:` grammar; do not
re-flag the deliberate `class:disabled` exemption). Bullet 3 stands narrowed: fire only on
lists whose applied classes remove the marker or change used display (the standing a11y
ruling and the markdown wrapper both forbid the broad condition), and name the cross-pass
dependency on the toolkit-seams scoped reset.

### Task 5 (rendered panel-width rule): REVISE

State the real membership case: this is a hole `viewport-overflow` declines on purpose
(its header skips children of deliberate scroll containers). Narrow the contract to the
cases with no legitimate reading (the expanded panel; a row overflowing while its wrapper
does not scroll): the drafted every-row `scrollWidth === clientWidth` assertion fires on
the engine's own sanctioned scrollable tables, the 60% false-positive failure mode the
`chip-ground-collision` reshape priced. Add the missing no-false-positive fixture (a
deliberately scrollable `AdminTable`) and name the tier.

### Task 6 (falsify contrast rules on oklch): STANDS, two adjustments

(1) State the real scope so an "already sound" report reads correctly: `border-contrast`
is the open rule (`RATIFIED_SENTINEL = 'rgb(1, 2, 3)'` at `border-contrast.ts:159`);
`interactive-contrast` and `chip-ground-collision` already route through the shared
canvas normalizer. Expected yield: one rule plus three standing tests. (2) Name the
interaction with the `chip-ground-collision` reshape hold: a standing oklch red-path test
is compatible with the hold, but the report must not present that rule as sound and
shipping.

### Task 7 (chassis and docs items): REVISE

Chassis bullet 1 would regress the existing half: `scroll-padding-top` ships today,
token-derived, at `showcase/src/theme/site.css:43`; add only what is missing
(`scroll-behavior: smooth` plus the reduced-motion override). Chassis bullet 2's
"collapse to one path" is a no-op (one origin source, `chassis/content.ts:29`); restate as
the env-sourcing decision (which collides with deterministic visual baselines) or demote
to a docs note. Docs bullet 4 targets a page teaching two retired exports
(`add-a-custom-admin-screen.md:93` names `TextInput`/`SelectInput`, both ruled retire);
write the recipes in plain markup plus `FieldLabel`, and leave line 93 to the remediation
pass so two passes do not both edit it. Sequencing: the two chassis bullets overlap the
ROADMAP chassis improvement round; they are independent of the reshapes, so keeping them
here is defensible, but say so.
