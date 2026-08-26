# Harvest Detection Pass (ASC harvest absorption, detection and docs half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (seven tasks, all
> independent of each other). `cairn-implementer` per task, `diff-reviewer` per diff, the full
> gate inside the chain. Steps use checkbox (`- [ ]`) syntax. No task needs a model upshift.

**Token ceiling:** 1.5M. **Checkpoint interval:** four tasks. **Worktree:** `harvest-detection`
off `main` at `0d500e4f` (rebase onto the toolkit-seams merge if that pass lands first; nothing
here depends on it).

**Status: DRAFT, held (Geoff, 2026-08-26).** The pre-pass engine consultation initiative
(`docs/internal/record/2026-08-26-engine-consultation-inputs.md`) runs first and may revise this plan;
re-review every task against its any-site and shape rulings before seeking approval.

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
