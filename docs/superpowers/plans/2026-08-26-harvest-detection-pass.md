# Harvest Detection Pass (ASC harvest absorption, detection and docs half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (seven tasks, all
> independent of each other). `cairn-implementer` per task, `diff-reviewer` per diff, the full
> gate inside the chain. Steps use checkbox (`- [ ]`) syntax. No task needs a model upshift.

**Token ceiling:** 1.5M. **Checkpoint interval:** four tasks. **Worktree:** `harvest-detection`
off `main` at `0d500e4f` (rebase onto the toolkit-seams merge if that pass lands first; nothing
here depends on it).

**Status: DRAFT, held; re-reviewed against the consultation standard, 2026-08-26.** The
`engine-triage` re-review ran with the any-site audit's rulings in hand
(`docs/internal/engine-rulings.md`, audit section;
`docs/internal/record/2026-08-26-any-site-audit.md`). Per-task verdicts and the required
revisions are appended at the end of this file ("Re-review verdicts"); the triage's
recommendation is not-approved-as-drafted: re-issue as six tasks (Task 4's parity bullet
drops on a falsified premise; Task 2 rewrites to the ledger's ruled `sheet`-as-list
shape). Headline: Task 6 stands (two adjustments); Tasks 1, 3, 5, 7 revise with named
changes; every new rule names its tier and carries a no-false-positive fixture. Re-derive
the header's independence claim and the ceiling after the cut.

**Goal:** absorb the detection-and-docs half of the 2026-08-26 ASC harvest triage
(`docs/internal/record/2026-08-26-asc-harvest-triage.md`): the mechanically detectable
mechanics become `cairn-audit` rules or doctor checks, the guard's misconfiguration trap gets
detected rather than the guard loosened, and the chassis and docs items land where the charter
puts them. Every rule is generic to any cairn site; none encodes a site's domain.

**Standing constraints (every task):** test-first; new audit and doctor rules must be
falsifiable, with a fixture that reds and a fixed twin that greens (break-the-rule proof in the
task report). Full gate: `npm run check` 0/0, `npm test` exit 0, plus the CI-derived gate list
re-derived from `.github/workflows/` before the first commit. Docs pages updated in the same
task (`check:reference` for reference pages, Vale clean on published arms). CHANGELOG under
`## Unreleased` per task. No version bump, no publish.

---

## Task 1: Doctor rule for the blanket `no-referrer` trap; guard docs constraint

**Files:** `src/lib/doctor/checks-local.ts` (beside the existing CSRF-handoff check at
`checks-local.ts:66`–`101`), doctor tests, `docs/reference/doctor.md`,
`docs/extend/security-model.md` (or the page `docs/reference/sveltekit.md` points at for the
guard; put the constraint where the guard's own docs live).

**Evidence:** `originMatches` is a strict compare (`src/lib/sveltekit/csrf.ts:23`). Under a
site-wide `Referrer-Policy: no-referrer`, the Fetch spec makes a plain same-origin top-level
POST carry `Origin: null`, so every unenhanced non-admin form 403s. Confirmed live on a
consumer (member sign-in 403 on dev; curl: `Origin: null` rejected, real origin accepted).

- [ ] **The guard does not change.** `originMatches` stays strict; the triage record carries the
      security reasoning (some consumer routes have no second CSRF layer).
- [ ] A new local doctor check flags a site-wide `Referrer-Policy: no-referrer` (read
      `src/hooks.server.ts` for a blanket `setHeaders`/response-header write, the same
      heuristic-text-read style the CSRF-handoff check uses). Failure text names the mechanism
      (`Origin: null` vs the guard) and the remedy: serve `strict-origin-when-cross-origin` (or
      `same-origin`) as the site default and scope `no-referrer` to the token-bearing routes it
      exists for.
- [ ] Falsifiability: a fixture hooks file with the blanket header reds; a fixture with a
      per-route scoped `no-referrer` stays green; a hooks file with no referrer policy stays
      green.
- [ ] The guard's docs gain the constraint paragraph (consuming sites must not ship blanket
      `no-referrer`; what happens if they do; the scoped remedy).
- [ ] Acceptance: full gate green; `docs/reference/doctor.md` lists the new check with its
      condition id.

## Task 2: `no-uncompiled-class` learns site-compiled sources

**Files:** `src/lib/audit/config.ts` (mirror the `static.paletteFiles` list handling at
`config.ts:160`), `src/lib/audit/rules/static/no-uncompiled-class.ts`, rule tests,
`docs/reference/cairn-audit.md`.

**Evidence:** the rule checks only the packaged `cairn-admin.css`, so a class genuinely
compiled by a site's own stylesheet needs case-by-case exemption; one consumer closed a pass
carrying six known-false-positives for classes its own sheet compiles.

- [ ] `cairn-audit.config.json` gains `static.compiledClassSources`, a path list of additional
      stylesheets whose selectors count as compiled, parsed with the same path-list validation
      `paletteFiles` uses.
- [ ] Tests: a class defined only in a registered site sheet passes; the same class with no
      registration still fails; a missing listed file is a config error, not a silent skip.
- [ ] Acceptance: full gate green; the reference page documents the key with a one-line example.

## Task 3: Static audit rules: stripe/trim parity and `font: inherit` clobber

**Files:** two new rules under `src/lib/audit/rules/static/`, registered in
`rules/static/index.ts`; rule tests; `docs/reference/cairn-audit.md`.

**Evidence:** a striped row plus an unconditioned `:first-child`/`:last-child` padding trim
clips the stripe fill on even-count groups (the parity-scoped trim
`:last-child:nth-child(odd)` is the fix); under the no-Preflight admin, `font: inherit` in a
scoped style (0,2,0) silently beats font utility classes (0,1,0) on the same element, and only
a measured render caught the resulting 24px/700 heading.

- [ ] Rule A: a selector applying a striped background (`nth-child` background pattern or
      `.table-zebra`-style class) co-occurring with an unconditioned first/last-child padding
      trim on the same row class yields a finding whose message names the parity-scoped form.
- [ ] Rule B: `font: inherit` in a component's scoped style on an element whose markup also
      carries font-affecting utility classes (`text-*` size, `font-*` weight/family) yields a
      finding; the message names the stable idiom (typography on the ancestor the control
      inherits from).
- [ ] Both rules: red fixture, green fixed-twin fixture, and a no-false-positive fixture (a trim
      with no stripe; `font: inherit` with no font utilities).
- [ ] Acceptance: full gate green; both rules listed in the reference page.

## Task 4: Static audit rules: hover-parity bare-tag gap, DaisyUI dead class, listless `<ul>`

**Files:** the existing hover/focus-parity rule (locate it under `src/lib/audit/rules/`; the
harvest names the site probe's `checkHoverFocusParity`, and the audit carries the family
equivalent), plus two new static rules; tests; `docs/reference/cairn-audit.md`.

**Evidence:** the parity check keys a rule on the last compound's own classes, so
`.ev-title a:hover` (bare tag under a classed ancestor) is skipped, and the one link family
without `:focus-visible` sailed through. Separately, `class="collapse collapse-arrow"` compiled
to zero rules because `collapse` is on the DaisyUI exclude list, and nothing flagged it until a
screenshot read. And any Tailwind-styled `<ul>` loses `list-style`, so Chrome and VoiceOver stop
announcing it as a list without `role="list"`.

- [ ] Parity fix: a hover rule whose last compound is a bare tag under a classed ancestor is
      treated as checkable; the previously invisible case gets a red fixture.
- [ ] Dead-class rule: a class attribute token that matches the DaisyUI vocabulary but produces
      zero rules in the compiled sheet (cross-reference the exclude list and the packaged CSS,
      plus Task 2's registered site sources) yields a finding.
- [ ] Listless-`<ul>` rule: in admin scope, a `<ul>`/`<ol>` carrying any utility class and no
      `role="list"` yields a finding naming the WebKit semantics-strip reason.
- [ ] All three: red fixture, green twin, no-false-positive fixture.
- [ ] Acceptance: full gate green; reference page rows.

## Task 5: Rendered audit rule: panel width at the narrow viewports

**Files:** a new rule under `src/lib/audit/rules/rendered/` (the viewport machinery in
`viewport-overflow.ts` is the sibling to imitate), tests, `docs/reference/cairn-audit.md`.

**Evidence:** the column-drop recipe failed at its third consumer: a 640px summary row inside a
356px wrapper at 390, the expanded panel cut mid-word. The mechanical contract:
`scrollWidth === clientWidth` for table rows at the family's narrow viewports.

- [ ] At 320 and 390, every row of an admin table that contains a form control asserts
      `scrollWidth === clientWidth` (row and expanded panel both); a violation names the row and
      the overflowing cell.
- [ ] Falsifiability: a fixture screen with a wide inline control reds; the column-dropped twin
      greens.
- [ ] Acceptance: full gate green; reference page row.

## Task 6: Falsify every rendered contrast rule on oklch

**Files:** tests beside each rendered contrast rule (`border-contrast.ts`,
`interactive-contrast.ts`, `chip-ground-collision.ts`, and any sibling `grep` finds computing a
contrast ratio), fixes where a rule still text-parses colors.

**Evidence:** the family's site probe parsed only `rgba()`, returned `null` for
`oklch()`/`oklab()`, fell back to black-on-white, and passed everything;
`interactive-contrast.ts:21` records the same trap was found in the ported parser. Whether every
sibling rule was fixed has not been proven.

- [ ] For each rendered rule that computes a contrast ratio: a break-the-rule test renders a
      surface whose colors are declared in `oklch()`/`color-mix()` at a failing contrast and
      asserts the rule reds. Any rule that stays green gets fixed (resolve via canvas readback
      or an equivalent real-pixel path, the method `interactive-contrast` documents).
- [ ] The task report lists each rule with its verdict: already sound, or fixed here.
- [ ] Acceptance: full gate green; every contrast rule has a standing oklch red-path test.

## Task 7: Chassis and docs items

**Files:** the showcase chassis (`examples/showcase` styles and config; the smooth-scroll rules
live beside its base sheet), `docs/extend/debug-your-site.md` or the best-fit extend page for
the testing pattern, `docs/extend/add-a-custom-admin-screen.md` for the two admin recipes.

**Evidence:** ASC carried the reduced-motion half of smooth scrolling for weeks with smooth
never on; the origin constant pointed at dev in production metadata; date-rendered pages break
visual baselines on a calendar day with no commit; the dialog-form failure contract and the
load-when-the-panel-opens shape were each hand-derived at review cost.

- [ ] The chassis ships the smooth-scroll triple: `html { scroll-behavior: smooth }`, the
      `prefers-reduced-motion: reduce` override to `auto`, and `scroll-padding-top` reading a
      header-height token the site sets once.
- [ ] The chassis makes `PUBLIC_ORIGIN` (from `platform.env`) the single origin source for
      canonical/og/feed URLs; verify where the showcase reads an origin today and collapse to
      one path with a documented fallback.
- [ ] Docs, fixed clock: the extend docs name the pattern for date-dependent tests: a
      fixed-today env seam read only from `platform.env`, so CI baselines pin the calendar.
- [ ] Docs, two admin recipes in `add-a-custom-admin-screen.md`: the dialog-form failure
      contract (`use:enhance`; on failure keep the dialog open, focus a dialog-local
      `role="alert"`; on success `update({ reset: false })` then close), and the
      load-when-the-panel-opens convention (stream or fetch panel-only data on open rather than
      shipping it in every list load). Both are recipes, deliberately not components (triage
      ruling: a primitive waits for a second consumer).
- [ ] Acceptance: full gate green; the showcase visual suite passes at all five widths; Vale
      clean on the touched extend pages; `check:docs` green.

---

## Self-review notes

Coverage: triage survivors 11–15 map onto Tasks 1–7 (survivor 13's six rules split across Tasks
3–5). Every rule task carries the falsifiability requirement from the standing
gates-must-be-falsifiable rule. No cross-task type dependencies; Task 4 consumes Task 2's
registered-sources surface only if it lands, and must degrade to the packaged sheet alone when
the config key is absent.

---

## Re-review verdicts (`engine-triage`, 2026-08-26, against the any-site audit rulings)

Recorded from the triage dispatch; fold into the task bodies before approval. Overall:
not approved as drafted; re-issue as six tasks per the cuts below.

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
