# Harvest Detection Pass (ASC harvest absorption, detection and docs half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (six tasks;
> Tasks 2, 3, and 4 all append rows to `docs/reference/cairn-audit.md`, so pipeline them in
> order or accept sequential merges on that page; no other files overlap).
> `cairn-implementer` per task, `diff-reviewer` per diff, the full gate inside the chain.
> Steps use checkbox (`- [ ]`) syntax. No task needs a model upshift.

**Token ceiling:** 1.3M. **Checkpoint interval:** four tasks. **Worktree:** `harvest-detection`
off the current `main` tip (rebase onto the toolkit-seams merge if that pass lands first; Task
3's list rule names a cross-pass dependency on its `.toolkit-list` opt-in).

**Status: REVISED 2026-08-26, awaiting approval.** The `engine-triage` re-review ran with the
any-site audit's rulings in hand (`docs/internal/engine-rulings.md`, audit section;
`docs/internal/record/2026-08-26-any-site-audit.md`) and ruled the seven-task draft not
approved as drafted; this file is the six-task re-issue it prescribed. The verdicts are
recorded verbatim at the end ("Re-review verdicts") and folded into the bodies: the former
Task 4's hover-parity bullet is DROPPED (premise falsified by `focus-parity.ts:36-50`), its
dead-class bullet folds into Task 2 as a `no-uncompiled-class` extension, and its list rule
folds into Task 3.

**Goal:** absorb the detection-and-docs half of the 2026-08-26 ASC harvest triage
(`docs/internal/record/2026-08-26-asc-harvest-triage.md`): the mechanically detectable
mechanics become `cairn-audit` rules or doctor checks, the guard's misconfiguration trap gets
detected rather than the guard loosened, and the chassis and docs items land where the charter
puts them. Every rule is generic to any cairn site; none encodes a site's domain.

**Standing constraints (every task):** test-first; new audit and doctor rules must be
falsifiable, with a fixture that reds, a fixed twin that greens, AND a no-false-positive
fixture (break-the-rule proof in the task report); every new rule names its tier (every
shipped rule declares one; exit 2 is never a design verdict). Full gate: `npm run check` 0/0,
`npm test` exit 0, plus the CI-derived gate list re-derived from `.github/workflows/` before
the first commit. A task that executes an open audit ruling closes its ledger entry in
`docs/internal/engine-rulings.md` in the same task. Docs pages updated in the same task
(`check:reference` for reference pages, Vale clean on published arms). CHANGELOG under
`## Unreleased` per task. No version bump, no publish.

---

## Task 1: Doctor rule for the blanket `no-referrer` trap; guard docs constraint

**Files:** `src/lib/doctor/checks-local.ts`, doctor tests, `docs/reference/doctor.md`,
`docs/extend/security-model.md` (or the page `docs/reference/sveltekit.md` points at for the
guard; put the constraint where the guard's own docs live).

**Evidence:** `originMatches` is a strict compare (`src/lib/sveltekit/csrf.ts:23`). Under a
site-wide `Referrer-Policy: no-referrer`, the Fetch spec makes a plain same-origin top-level
POST carry `Origin: null`, so every unenhanced non-admin form 403s. Confirmed live on a
consumer (member sign-in 403 on dev; curl: `Origin: null` rejected, real origin accepted).

- [ ] **The guard does not change.** `originMatches` stays strict; the triage record carries the
      security reasoning (some consumer routes have no second CSRF layer).
- [ ] A new local doctor check flags a site-wide `Referrer-Policy: no-referrer`. Do NOT copy
      the CSRF-handoff check's heuristic-text-read shape (the audit ruled it reshape for its
      silent skip, `audit-cli-config-csrf-disable-check`); land in the three-state result
      shape, with "could not find a header source to check" as a distinct INFO status, never a
      pass. Header sources: `src/hooks.server.ts` (a blanket `setHeaders`/response-header
      write) AND `static/_headers` (the usual source on Cloudflare). Failure text names the
      mechanism (`Origin: null` vs the guard) and the remedy: serve
      `strict-origin-when-cross-origin` (or `same-origin`) as the site default and scope
      `no-referrer` to the token-bearing routes it exists for.
- [ ] Falsifiability, four fixtures: a hooks file with the blanket header reds; a `_headers`
      file with the blanket header reds; a per-route scoped `no-referrer` stays green; no
      readable header source reports INFO.
- [ ] The guard's docs gain the constraint paragraph (consuming sites must not ship blanket
      `no-referrer`; what happens if they do; the scoped remedy).
- [ ] Acceptance: full gate green; `docs/reference/doctor.md` lists the new check with its
      condition id and the INFO state.

## Task 2: `no-uncompiled-class`: `sheet` becomes a source list; the DaisyUI dead-class extension

**Files:** `src/lib/audit/config.ts` (the `sheet` handling at `config.ts:154`, currently
failing "sheet must be a path"; mirror the `static.paletteFiles` list handling at
`config.ts:160`), `src/lib/audit/rules/static/no-uncompiled-class.ts`, rule tests,
`docs/reference/cairn-audit.md`, `docs/internal/engine-rulings.md`.

**Evidence:** the rule checks only the packaged `cairn-admin.css`, so a class genuinely
compiled by a site's own stylesheet needs case-by-case exemption; one consumer closed a pass
carrying six known-false-positives for classes its own sheet compiles. Separately,
`class="collapse collapse-arrow"` compiled to zero rules because `collapse` is on the DaisyUI
exclude list, and nothing flagged it until a screenshot read.

- [ ] The remediation shape is the ledger's, ruled twice: `sheet` itself becomes a list of
      compiled-class sources, exactly as `paletteFiles` and `cssFiles` already are. One edit;
      no third key (a separate `static.compiledClassSources` would contradict the
      one-concept-one-key constraint). A string `sheet` still parses (additive; rides the open
      audit-remediation `Consumers must:` window). Close both ledger entries as executed.
- [ ] Tests: a class defined only in a registered site sheet passes; the same class with no
      registration still fails; a missing listed file is a config error, not a silent skip; a
      string `sheet` behaves as a one-element list.
- [ ] Dead-class extension (former Task 4 bullet 2, re-derived): a narrow extension of this
      rule keyed on the DaisyUI exclude-list homographs (`collapse` is the motivating case): a
      class-attribute token that matches the DaisyUI vocabulary but produces zero rules in the
      compiled sources yields a finding. Registered site sources already cover excluded
      components by construction; do NOT parse a site's DaisyUI `exclude:` grammar, and do NOT
      re-flag the deliberate `class:disabled` exemption.
- [ ] Extension fixtures: `collapse` with zero compiled rules reds; the same class compiled by
      a registered site sheet greens; `class:disabled` stays green.
- [ ] Acceptance: full gate green; the reference page documents the list-valued `sheet` with a
      one-line example and the dead-class condition; tier named.

## Task 3: Static audit rules: stripe/trim parity, unlayered font clobber, marker-stripped lists

**Files:** three new rules under `src/lib/audit/rules/static/`, registered in
`rules/static/index.ts`; rule tests; `docs/reference/cairn-audit.md`.

**Evidence:** a striped row plus an unconditioned `:first-child`/`:last-child` padding trim
clips the stripe fill on even-count groups; the engine ships the parity interaction itself
(`ExpandableRow.svelte:153-183`), and the `container-inset-asymmetry` keep is the standing
precedent for a DaisyUI-plus-UA-default rule. Under the no-Preflight admin, a Svelte scoped
style is UNLAYERED while Tailwind utilities sit in `@layer utilities`, so ANY unlayered scoped
font declaration beats font utility classes at any specificity (cascade layers, not
specificity, are the mechanism); only a measured render caught the resulting 24px/700 heading.
And a Tailwind-styled `<ul>` can lose `list-style`, after which Chrome and VoiceOver stop
announcing it as a list without `role="list"`.

- [ ] Rule A (stripe/trim parity): a selector applying a striped background (`nth-child`
      background pattern or `.table-zebra`-style class) co-occurring with an unconditioned
      first/last-child padding trim on the same row class yields a finding whose message names
      the parity-scoped form (`:last-child:nth-child(odd)`).
- [ ] Rule B (unlayered font clobber): an UNLAYERED scoped declaration of
      `font-family`/`font-size`/`font-weight`/`font` on an element whose markup also carries
      font-affecting utility classes (`text-*` size, `font-*` weight/family) yields a finding;
      the message names layer precedence as the mechanism and the stable idiom (typography on
      the ancestor the control inherits from).
- [ ] Rule C (marker-stripped lists, former Task 4 bullet 3, narrowed): fire only on a
      `<ul>`/`<ol>` whose applied classes remove the marker or change used display, and that
      carries no `role="list"`; the message names the WebKit semantics-strip reason. The broad
      any-utility-class condition is rejected (the standing a11y ruling and the markdown
      wrapper both forbid it). Cross-pass note: the toolkit-seams pass ships an opt-in
      `.toolkit-list` (padding only, never `list-style: none`), which this rule must not flag.
- [ ] All three: red fixture, green fixed-twin fixture, and a no-false-positive fixture (a trim
      with no stripe; a LAYERED or utility-free font declaration; a marker-keeping styled
      list). Each rule names its tier.
- [ ] Scope statement: `DEFAULT_STATIC_SCOPE` includes `src/lib/components`, which in a
      consumer tree is that site's generic component directory. The three conditions are
      Tailwind-general, so the rules stand on a consumer's public-side components too; finding
      text must not assume the admin sheet. State this in the reference rows.
- [ ] Acceptance: full gate green; all three rules listed in the reference page.

## Task 4: Rendered audit rule: panel width at the narrow viewports

**Files:** a new rule under `src/lib/audit/rules/rendered/` (the viewport machinery in
`viewport-overflow.ts` is the sibling to imitate), tests, `docs/reference/cairn-audit.md`.

**Evidence:** the column-drop recipe failed at its third consumer: a 640px summary row inside a
356px wrapper at 390, the expanded panel cut mid-word. The membership case: this is a hole
`viewport-overflow` declines on purpose (its header skips children of deliberate scroll
containers), so the gap needs its own rule.

- [ ] The contract is narrowed to the cases with no legitimate reading: at 320 and 390, an
      EXPANDED row panel asserts `scrollWidth === clientWidth`, and a summary row is flagged
      only when it overflows while its wrapper does not scroll. A blanket every-row assertion
      is rejected: it fires on the engine's own sanctioned scrollable tables, the
      false-positive failure mode the `chip-ground-collision` reshape priced. A violation
      names the row and the overflowing cell.
- [ ] Falsifiability: a fixture screen with a wide inline control in an expanded panel reds;
      the column-dropped twin greens; a deliberately scrollable `AdminTable` stays green (the
      no-false-positive fixture). Tier named.
- [ ] Acceptance: full gate green; reference page row.

## Task 5: Falsify every rendered contrast rule on oklch

**Files:** tests beside each rendered contrast rule (`border-contrast.ts`,
`interactive-contrast.ts`, `chip-ground-collision.ts`, and any sibling `grep` finds computing a
contrast ratio), fixes where a rule still text-parses colors.

**Evidence:** the family's site probe parsed only `rgba()`, returned `null` for
`oklch()`/`oklab()`, fell back to black-on-white, and passed everything. The real scope, so an
"already sound" report reads correctly: `border-contrast` is the open rule
(`RATIFIED_SENTINEL = 'rgb(1, 2, 3)'` at `border-contrast.ts:159`); `interactive-contrast` and
`chip-ground-collision` already route through the shared canvas normalizer. Expected yield:
one rule fixed plus three standing tests.

- [ ] For each rendered rule that computes a contrast ratio: a break-the-rule test renders a
      surface whose colors are declared in `oklch()`/`color-mix()` at a failing contrast and
      asserts the rule reds. Any rule that stays green gets fixed (resolve via canvas readback
      or an equivalent real-pixel path, the method `interactive-contrast` documents).
- [ ] The task report lists each rule with its verdict: already sound, or fixed here. The
      `chip-ground-collision` reshape HOLD interacts: a standing oklch red-path test is
      compatible with the hold, but the report must not present that rule as sound and
      shipping.
- [ ] Acceptance: full gate green; every contrast rule has a standing oklch red-path test.

## Task 6: Chassis and docs items

**Files:** the showcase chassis (`examples/showcase` styles and config; the smooth-scroll rules
live beside its base sheet), `docs/extend/debug-your-site.md` or the best-fit extend page for
the testing pattern, `docs/extend/add-a-custom-admin-screen.md` for the two admin recipes.

**Evidence:** ASC carried the reduced-motion half of smooth scrolling for weeks with smooth
never on; date-rendered pages break visual baselines on a calendar day with no commit; the
dialog-form failure contract and the load-when-the-panel-opens shape were each hand-derived at
review cost. Already shipped, so NOT rebuilt here: `scroll-padding-top`, token-derived, at
`showcase/src/theme/site.css:43`; a single origin source at `chassis/content.ts:29`.

- [ ] The chassis adds only the missing smooth-scroll halves: `html { scroll-behavior:
      smooth }` and the `prefers-reduced-motion: reduce` override to `auto`. The existing
      token-derived `scroll-padding-top` stays as is.
- [ ] Origin sourcing is a docs note, not a chassis change (the collapse-to-one-path bullet
      was a no-op against `chassis/content.ts:29`): the extend docs note the decision, that
      canonical/og/feed URLs read one origin source, and that env-sourcing the origin collides
      with deterministic visual baselines.
- [ ] Docs, fixed clock: the extend docs name the pattern for date-dependent tests: a
      fixed-today env seam read only from `platform.env`, so CI baselines pin the calendar.
- [ ] Docs, two admin recipes in `add-a-custom-admin-screen.md`: the dialog-form failure
      contract (`use:enhance`; on failure keep the dialog open, focus a dialog-local
      `role="alert"`; on success `update({ reset: false })` then close), and the
      load-when-the-panel-opens convention (stream or fetch panel-only data on open rather than
      shipping it in every list load). Both are recipes, deliberately not components (triage
      ruling: a primitive waits for a second consumer). Write them in plain markup plus
      `FieldLabel`; do NOT use `TextInput`/`SelectInput` (both ruled retire), and leave the
      page's existing line 93 (which names them) to the remediation pass so two passes do not
      both edit it.
- [ ] Sequencing note (deliberate): the chassis bullets overlap the ROADMAP chassis
      improvement round but are independent of the audit reshapes; they stay here because the
      harvest is their evidence and the change is two rules.
- [ ] Acceptance: full gate green; the showcase visual suite passes at all five widths; Vale
      clean on the touched extend pages; `check:docs` green.

---

## Self-review notes

Coverage: triage survivors 11–15 map onto Tasks 1–6 (survivor 13's rules now split across
Tasks 2–4; the hover-parity item is dropped, premise falsified, and any real exact-string
matching gap in `focus-parity.ts` needs its own evidence and red fixture before it returns).
Every rule task carries the falsifiability-plus-no-false-positive requirement and names its
tier. File overlap: Tasks 2, 3, and 4 all append to `docs/reference/cairn-audit.md` (noted in
the header); Task 3's Rule C names the cross-pass dependency on toolkit-seams'
`.toolkit-list`. Task 2's extension consumes its own list-valued `sheet` in the same task, so
no cross-task type dependency remains.

---

## Re-review verdicts (`engine-triage`, 2026-08-26, against the any-site audit rulings)

Recorded from the triage dispatch; folded into the task bodies 2026-08-26 (this section is
the revision record; task numbers below are the seven-task draft's).

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
