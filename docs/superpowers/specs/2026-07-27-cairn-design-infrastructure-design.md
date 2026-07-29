# Cairn design infrastructure — design spec (2026-07-27)

The design ratified in the 2026-07-22/27 brainstorm (opened in the ASC sitting, completed in
cairn-cms). Supersedes the seed at
`~/Projects/aksailingclub-org/docs/2026-07-22-cairn-design-infrastructure-brainstorm-seed.md`
for everything except the ASC evidence corpus it points to, which remains this initiative's
data. Implementation runs as three just-in-time pass plans under `docs/superpowers/plans/`.
Revised 2026-07-27 after a clean-context adversarial Fable review with prior-art research;
the full report with sources is
[`docs/internal/2026-07-27-design-infrastructure-adversarial-review.md`](../../internal/2026-07-27-design-infrastructure-adversarial-review.md),
and the revision marks are noted inline where they changed a decision.

## 1. The question and the bet

**Can cairn's design language be captured so an AI agent reliably uses and repeats it?**
The question is empirical. The Members-era evidence already answers half of it: where the
language existed as written contract (color roles, the 11px label recipe, the shared
header-cell token), three uncoordinated build sessions produced screens the coherence reads
graded already-right. Where it existed only as rendered precedent (type scale, spacing rhythm,
focus vocabulary, screen anatomy, action placement), every builder invented: seven unrelated
type sizes, a buried primary action, sibling screens that disagreed.

The underlying bet becomes a written rationale doc in this initiative. Given agentic
coding, a developer can build a coherent suite of organization tools on cairn more easily
than by stringing together loosely connected hosted tools. The bet holds only if an agent
starting from base cairn produces work that integrates with the whole. An agent composes
from what is legible at build time (component defaults, tokens, written rules, checkable
gates), not from looking at rendered screens the way a human designer does. Making the
language legible at build time is this initiative's scope.

Working hypothesis on capture-form reliability, to be tested by the trial rather than
assumed: tokens and component contracts (layers 1–2) > canonical exemplars > written rules
> rendered precedent. Mechanical gates catch what no form carries, and in-context delivery
may matter as much as the capture itself.

**The thesis test:** the ASC Assets pass, built against the finished structure, lands
resolved on its first external coherence read, with the resolving happening INSIDE the build
(the builder converges against the packaged gates before declaring done; section 7). Members
took two external reads (FAIL with 8 tells, then PASS); Classes took three (FAIL 4, FAIL 2,
PASS). The target is one, measured by consensus reads with first-read tell count as
co-primary (section 9). No one has demonstrated first-shot compositional harmony from
packaged capture alone; a developer's agent converging unattended inside one session is the
form of the win the thesis actually needs.

## 2. Scope and audience

- **Package-shipped, not workstation-first.** The tokens, primitives, standard, norms
  manifest, skill, and audit all live in `@glw907/cairn-cms`, loadable by any consumer's
  agent.
- **Admin surfaces only.** Public-facing pages share the design cues in a later initiative.
- **Full structure before the trial.** The Assets pass stays paused until everything ships,
  so a trial failure indicts the idea rather than a half-built implementation.
- **The ASC corpus is the evidence base**, mined not re-summarized:
  `docs/design-benchmark/decisions.md` (ratified rulings with refuted alternatives),
  `docs/design-benchmark/ledger.md` (coherence reads and FAIL tells), the
  `docs/2026-07-2*-harvest-findings.md` files, and
  `docs/2026-07-15-asc-invisible-polish-brief.md` (all paths in aksailingclub-org).

## 3. The capture stack

Six layers, each carrying the design language in a different form:

1. **Grammar tokens** — the vocabulary an agent picks from by name (section 4).
2. **Primitives** — toolkit components that carry the language by default (section 5).
3. **The written standard and extension grammar** — the standard doc, annotated exemplar,
   craft chapter, and the derivation ladder for when no primitive fits (section 5).
4. **The norms manifest** — measured design norms, generated from the toolkit itself,
   feeding both the builder and the audit (section 6.4).
5. **The packaged skill** — in-context delivery at build time (section 7).
6. **`cairn-audit`** — the mechanical gate (section 6).

One framing rule binds every layer: **audit-green means vocabulary-clean, never design-done**
(Polaris spent years with fully token-compliant screens merchants rated bland; compliance and
register are separable). The skill and the trial never present a green audit as finished
design; composition and register stay with the exemplars, the ladder, and the grader.

The layers divide the novel-component problem three ways. The audit checks that a novel
component uses cairn's vocabulary. The derivation ladder and the coherence-read grader
judge whether it says something coherent in that vocabulary. The graduation ratchet turns
each novel genre's first coherence read into the next consumer's mechanical floor (the
ExpandableRow history is the model: a genre contract nobody could rule in advance,
rediscovered by two consumers, and generalized in this initiative into the
`viewport-overflow` rule, section 6.3).

## 4. Grammar tokens (design section 1, approved)

Type roles AND relational spacing roles ship as engine tokens:

- **Type roles** (`--cairn-type-*`): the ruled admin scale — 24 title / 14–15 subtitle /
  14 body / 13 meta / 11 label / 10 chip — as named roles, so a builder picks "label",
  never "11px".
- **Spacing roles** (`--cairn-gap-control`, `--cairn-gap-label`, `--cairn-gap-group`,
  `--cairn-gap-section`) plus indentation roles. Builders pick relationships by name,
  never pixel values.
- **Migration is pixel-identical.** The toolkit and admin screens move onto the tokens with
  the existing visual baselines as the no-drift proof.
- **The authoring interface is named role utilities**, extending the repo's existing
  `text-muted`/`text-subtle` idiom (frozen interface, standing build test), never bracketed
  `var()` wrappers in markup. The role-utility interface is also what makes the audit's
  static resolution tractable in a utility-class-driven codebase.
- **The palette/grammar boundary is written and audit-enforced.** A site re-tunes palette
  tokens (`--color-*`); it never redeclares a grammar token. The `grammar-boundary` audit
  rule (section 6.2) is the enforcement half. Palette re-tuning is a constrained operation:
  its acceptance test is a clean consumer-side rendered audit in both themes, because
  cairn's craft couples to the palette (warm shadows, near-floor contrast pairs) and a
  divergent brand must re-prove those relationships, not inherit Warm Stone's numbers.

## 5. Primitives, the standard, and the extension grammar (design section 2, approved)

**Primitives gap-closure, nothing speculative** — extended by the adversarial review's C4,
which surfaced filed gaps the original list missed: the destination-picker pattern,
PageHeader adoption, a card-shell primitive (the shell string is copied verbatim at four
sites; Classes harvest finding 9), the in-card empty-notice recipe (reinvented three times;
finding 10), and a form-row/label register contract (the ClassForm label-wrap defect is
on-record debt, and ASC's two-level label ruling in `decisions.md` is the raw material).
(EmptyState already shipped in `admin-toolkit` at 0.89.0.)

**The standard doc** is written for an agent's context window with a hard prose budget: a
thin core in the low thousands of tokens, since practitioner evidence says models weight
examples over instructions and long rules files fail (Builder.io's postmortem). Every rule
that can be mechanical moves to the audit or the manifest; prose is connective tissue. The
load-bearing half is the exemplars, now TWO genres per C4 (the trial's screens are grid-,
detail-, and form-heavy, and one list exemplar cannot carry them): the annotated Members
list screen and an annotated detail/slide-over screen, plus the form-anatomy contract above.
The doc carries anatomy, the annotated screens, per-component contracts, and the register
rules (one filled action per surface, chip passivity, facet quietness).

**The craft chapter** takes the hardest part of the capture question: whether the
invisible feel (spacing rhythm, font treatment, color tinting, indentation, optical
alignment) can be captured systematically. The ratified translation:

- Tokenize where tokenizable.
- Numeric rule where measurable but not tokenizable (two weights max per surface,
  tabular-nums on numeric columns, optical-alignment offsets as numbers, neutrals always
  derived from the palette's neutral role).
- Before/after paired renders where only demonstrable (assembled vs resolved, one line
  naming the difference).
- Audit rule where mechanical.

Source material: the ASC invisible-polish catalogue. **Acceptance test:** an agent that has never seen a cairn
screen, given a plain daisy component and the chapter, moves it measurably toward the cairn
feel without human art direction.

**The extension grammar**, for when no primitive fits: the derivation ladder, one worked
derivation shown step by step, the coherence-read gate shipped as a grader prompt in the
skill, and the graduation feedback loop so consumer inventions flow back to the toolkit.

## 6. cairn-audit (design section 3a/3b, approved with adversarial amendments)

### 6.1 Mechanics

- **Shape.** A per-command bin following the `cairn-doctor` precedent:
  `src/lib/audit/` with `bin.ts`, `run.ts`, `report.ts`, `types.ts`, and per-mode rule
  modules, exposed as `"cairn-audit": "./dist/audit/bin.js"`. A consumer runs
  `npx cairn-audit` (static) or `npx cairn-audit --rendered`.
- **One rule engine.** The four repo-internal gates (`check:invisible-craft`,
  `check:admin-css-classes`, `check:interactive-contrast`, `check:touch-targets`) graduate
  INTO the packaged engine; the repo scripts become thin wrappers. cairn-cms is the audit's
  first consumer, so every engine pass exercises the code a site runs.
- **Static substrate is `svelte/compiler` plus built-sheet resolution, not regexes.** An
  adversarial review proved the regex substrate the repo gates use today fails open on three
  common Svelte 5 idioms (single-quoted attributes, array classes, object classes) and
  false-positives on prose ("the white background"). And because the admin is
  utility-class-driven, font sizes and hover states live in class tokens, not style blocks:
  `type-scale`, `gap-scale`, and `focus-parity` evaluate class tokens through the compiled
  `cairn-admin.css`, not the AST alone. Svelte is already a peer dependency, so the parser is guaranteed present in
  any consumer at zero dependency cost. **The graduation of the repo gates is gated on this
  swap**; the regexes never ship to consumers.
- **Suppressions are co-located comments** for static rules:
  `cairn-audit-disable-next-line <rule-id> -- reason`, with dead-directive detection. This
  replaces the file+token JSON allowlists, whose entries orphan silently on rename, exempt
  whole files rather than lines, and hide the reason in a file nobody opens. Rendered mode
  keeps a page+selector+reason JSON, since a live-page finding has no source line.
  **Suppressions are counted, loudly:** the report and exit summary total them, and the
  skill forbids an unattended builder adding one without flagging it in its own report —
  agents under completion pressure silence gates, and a build that passes by suppression is
  a disguised failure (the trial counts suppressions as a metric, section 9).
- **Rendered mode never starts a server** (clear error if BASE_URL is not answering) and
  dynamically imports Playwright from the consumer's node_modules, exiting with a one-line
  install instruction if absent. cairn takes no browser dependency.
- **The rule core stays a pure module**, so exposing an ESLint plugin later is a packaging
  decision, not a rewrite. The plugin route was adversarially evaluated and rejected as the
  primary surface: the reference consumer has no lint config, a misconfigured ESLint that
  matches zero `.svelte` files exits 0 (silent green, the worst outcome for an unattended
  agent gate), and the ecosystem's headline benefits are weak for an agent audience:
  squiggles and caching do nothing in an unattended run, and autofix duplicates what an
  agent does from a report it already reads. Stylelint is rejected outright: the admin is
  utility-class-driven (8 scoped style blocks against ~1,900 class attributes).
- **Config.** One consumer-side file: the rendered-mode page list (defaulting to the core
  admin routes), the rendered-mode allowlist, and the static scan scope (defaulting to the
  site's admin routes plus their imported components).
- **Tiers.** `error` exits nonzero; `advisory` reports and never gates. Compositional
  rendered rules START advisory and promote to error by measured evidence (no design system
  anywhere has shipped mechanical composition rules; the false-positive literature does not
  exist, so cairn's own screens and ASC's are the calibration corpus during Pass 2). This is
  the graduation ratchet applied to the audit's own rules.
- **Both themes, always.** Every rendered rule runs light and dark; color-adjacent rules
  (`chip-ground-collision`, `interactive-contrast`, `focus-renders`) can pass one theme and
  fail the other.

### 6.2 Static rules, v1 (all error tier; nine rules)

| ID | Checks | Evidence |
| --- | --- | --- |
| `no-uncompiled-class` | Every class token in admin markup exists in the built `cairn-admin.css` | Three real failures under green gates (invisible Overdue chip; silent `ml-1`/`divide-y`; unstyled stats strip) |
| `stock-default-hazards` | Stock DaisyUI patterns cairn's recipes deliberately replace: `badge-ghost`, `.dropdown`, native `disabled` on guarded buttons, flat `base-300` card borders | The regress-to-stock failure mode (stock daisy is in-distribution for an agent; cairn's deviations are not); each hazard is a refuted alternative on record in `admin-design-system.md` |
| `type-scale` | Every font-size resolves to a `--cairn-type-*` token | "Seven unrelated type sizes" on Members |
| `gap-scale` | Margin/padding/gap literals resolve to gap-role or spacing tokens | ~40 off-scale literals in the ASC mechanical audit |
| `token-colors` | No raw hex/rgb/named colors; no pure achromatics; neutrals derive from the palette's neutral role | Five literal-white declarations bypassing tokens; the craft chapter's neutral-derivation rule |
| `grammar-boundary` | Consumer CSS never redeclares a grammar token | The ratified palette/grammar boundary (section 4) |
| `focus-parity` | Every `:hover` selector carries a matching `:focus-visible` | Six hover-only families; ASC standing-gate candidate 1 |
| `motion-band` | Transition/animation durations in 150–250ms; no `transition: all` | Graduates from `check:invisible-craft` |
| `reduced-motion` | Every transition-bearing selector covered by `prefers-reduced-motion` | Passing today in ASC; locked as a regression gate |

### 6.3 Rendered rules, v1

Error tier (value rules with settled definitions):

| ID | Checks | Evidence |
| --- | --- | --- |
| `one-filled-action` | At most one accent-filled control per surface. "Surface" = the topmost open layer (a modal, slide-over, or expanded panel wins over the page beneath), landmarks partitioning within a layer; "filled" = accent fill, so the sanctioned ink fills (ink-opener buttons, PageHeader's ink New) are exempt by ruling | Ratified register rule ("the portal's first filled button") |
| `focus-renders` | Keyboard focus produces a real computed outline | The rendered half of focus-visible coverage |
| `interactive-contrast` | Interactive text vs its own composited background ≥ 1.5 | Graduates the existing probe (the invisible-CTA lesson) |
| `touch-targets` | 44px at 390, aware of `::before` inset hit-area expansion | Graduates the existing probe; the `.nav-caret` finding |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 AND 320 (the family's composition floor) | ExpandableRow overflow, rediscovered independently by two consumers |
| `chip-ground-collision` | Chip/badge background distinguishable from its row background | badge-ghost melting into the zebra stripe |

Advisory tier (the compositional rules promote by evidence per 6.1; the last two are
advisory by principle):

- `relational-spacing` — gap monotonicity (section > group > label-to-control), labels at
  label-gap distance from their control, equal gaps for same-level siblings. The
  invisible-feel "spacing rhythm" item made measurable; advisory because inferring hierarchy
  from an arbitrary live DOM has no shipped precedent anywhere.
- `screen-anatomy` — one PageHeader with one h1, primary action in the header slot, content
  in the card region; desk routes exempt per the office/desk context model. The mechanical
  floor under "buried primary action".
- `weight-budget` — at most two distinct font-weights per content region, NOT per route:
  cairn's own flagship screens legitimately run 400/500/600/700 across body, nav, eyebrows,
  and heading chrome, which refutes the route-level form the brainstorm ratified. The craft
  chapter's numeric rule, scoped to where it is true.
- `border-contrast` — WCAG 1.4.11 boundary contrast (3:1). The ratified `--cairn-card-border`
  hairline currently measures 1.11:1 light / 1.43:1 dark, and that design question is open
  on Geoff's queue, so the rule reports without gating until ruled.
- `norms-bands` — a component's measurements (control heights, padding-to-type ratios,
  radii, border treatments) fall inside the manifest's observed bands (section 6.4).
  Advisory by principle: a legitimately novel component may step outside a band
  deliberately; the grader judges whether the step was earned, and the advisory finding
  ensures it was seen.

Rendered captures include an interaction state (an open menu, a focus-visible pass) so the
rules and the grader see behavior, not just rest states. Interaction and motion judgment
beyond `motion-band`/`reduced-motion` routes to the grader prompt explicitly.

### 6.4 The norms manifest

A generator renders the toolkit and admin screens and extracts the observed norms as data:
control heights by role, padding-to-font-size ratios, the border treatment vocabulary,
corner radii, icon and chip metrics, and the computed styles of each semantic role. Shipped
in the package as JSON, queryable through the CLI (`cairn-audit norms <selector-or-role>`)
rather than inlined into a builder's context — every shipped AI-facing design system works
by structured lookup, not bulk context. It serves both directions: the skill points the
builder agent at it (measured norms as data, never inference from screenshots), and the
audit checks novel components against its bands (`norms-bands`, advisory).

Three disciplines keep it honest (there is no prior art for gating on derived bands, so
these are first-principles guards):

- **Provenance per entry**: ratified-decision reference vs observed-only. Entries matching
  OPEN design questions (the `--cairn-card-border` hairline is on Geoff's queue today) are
  excluded or flagged, so the manifest never teaches an unsettled number as ground truth.
- **Minimum observation count**: with roughly ten toolkit components, a band below the
  threshold is flagged as a single observation, not presented as a distribution.
- **Palette-dependent norms store as relationships** (role, mix formula, required floor),
  never resolved Warm Stone values, so a consumer's re-tuned palette invalidates nothing
  silently; the consumer-side rendered audit in both themes is the re-proof (section 4).

The generator runs at publish/CI with a freshness check (`check:*` scripts invoke
`npm run package` constantly, and a Playwright render inside that hot path adds latency and
flake); a cut still cannot ship a stale manifest.

### 6.5 Deferred rule candidates

Held with their evidence lines, promoted only when a trial shows the gap: eyebrow
tracking-token conformance, tabular-nums column detection (needs a selector allowlist model),
faux-bold weight availability, `:active` existence, `text-wrap: balance` tier consistency,
autocomplete/inputmode presence, placeholder-only label detection (ASC's own audit says the
convention is not settled enough to gate), the view-transition ghost check, and disclosure
ARIA states (now encoded in the toolkit components themselves). The new-screen scaffold stays deferred until the trial shows an anatomy-shaped
miss; the `screen-anatomy` rule is its cheap half and ships now.

Not mechanically checkable, routed to the grader prompt: assembled-vs-resolved judgment,
AI-default/template-look detection, novel screen-anatomy correctness, sibling-screen
register agreement, whitespace-as-hierarchy, optical-centering tolerance calls, and dose
calibration.

## 7. The packaged skill

A SKILL.md under the package's `skills/`, installed and freshness-checked by `cairn-doctor`.
Delivery is tiered, not bulk (instruction-following decays well below the size of a full
standard, and every shipped AI-facing design system delivers by lookup): the always-loaded
core is the thin standard plus the derivation ladder pointer, within a hard token budget in
the low thousands; the exemplars, craft chapter, and grader prompt load on demand; the norms
manifest is queried through `cairn-audit norms`, never inlined. The rules a builder must
hold in working memory are only the few the audit cannot check.

**The done-gate lives in the build loop.** A builder declares a screen done only after, in
order: (a) the static audit passes; (b) the rendered audit passes against the running dev
server, both themes; (c) for any derivation or novel composition, the builder runs the
shipped grader prompt against its own multi-state captures and fixes what it finds. The
external fresh-context coherence read remains the independent verification, never the first
time the gates fire — the rules with the strongest evidence lineage are rendered-mode, and
running them only at review would make their catches the refinement round the initiative
exists to eliminate. A green audit is reported as vocabulary-clean, never as design-done
(section 3). Builder-added suppressions must be flagged in the builder's own report
(section 6.1).

## 8. Narrative deliverables

A rationale doc in cairn's docs stating the bet (section 1's thesis; ASC is the proof case)
and the condition (an agent composes from what is legible at build time). README
positioning distills from it, and cairn.pub's front page gets a treatment as an explicit
deliverable.

## 9. The Assets proof loop (design section 3c, approved)

**Setup.** The ASC Assets pass resumes only after the initiative's release is on the
registry. It runs under the same process that built Members and Classes (fresh builder
sessions, plan-driven, uncoordinated), with one change: builders carry the packaged capture
(the skill loaded, the full done-gate of section 7 in the loop). **Control:** the Assets
plan must not smuggle in ad-hoc design coaching beyond what the package ships. The
skill-load instruction itself is sanctioned process, not coaching — the dispatch protocol
("load the cairn admin-screen skill") ships with the process, and any design content beyond
that pointer is a control violation. The trial log records what each builder actually had
in context, and the record notes the baselines were never zero-capture either (the
Members/Classes builders had ASC's decisions.md and repo docs available): the trial
measures packaging plus enforcement, and says so.

**The pre-registered coverage contract, written before the trial starts.** A short document
enumerating what the capture claims to carry: the type and gap roles, the register rules,
the anatomy of the genres the exemplars cover (list, detail/slide-over, forms per section
5), and the craft chapter's named phenomena. This is what makes the verdict falsifiable —
without it, every tell is classifiable as a capture gap after the fact and the trial cannot
indict anything.

**Measurement.** The grader recipe holds constant with the Members refinement rounds
(fresh-context multi-state captures, 390 and 1440 plus an interaction state, light and
dark), with two hardenings against grader noise (LLM judges flip borderline absolute
verdicts run-to-run, and coherence sits at the low end of even human inter-rater
agreement): the shipped grader prompt is **calibrated once against the archived labeled
captures** (Members read 1 FAIL-8, the Classes reads, the refinement reads — known verdicts,
free calibration set), and every trial read runs **k=3 with a consensus verdict and the tell
union reported**, on a pinned prompt and pinned model version recorded in the ledger. Four
metrics:

1. **Reads-to-PASS** (co-primary). Baselines: Members 2, Classes 3. Target: 1.
2. **First-read tell count** (co-primary — it has the dynamic range a binary read lacks).
   Baselines: 8 (Members), 4 (Classes). A first read with one cosmetic tell is a
   substantial win, and the metric says so where reads-to-PASS cannot.
3. **Mid-build audit catches**: findings the gates fired on during the build that never
   reached the coherence read — the evidence that capture moved failures upstream.
4. **Suppressions added**: a build that passes by suppressing findings is a disguised
   covered-but-missed failure and counts as one.

**Verdict logic.** On a first-read FAIL, every tell is classified against the
pre-registered coverage contract, not against the rule inventory:

- **(a) Capture-gap tells** — the tell falls OUTSIDE the contract's claimed perimeter.
  These indict the implementation's completeness; each feeds the ratchet as a new rule or
  token candidate.
- **(b) Covered-but-missed tells** — the tell falls INSIDE a claimed area, even when no
  specific rule named the exact miss. The capture claimed this territory and the screen
  still shipped wrong; only these count against the thesis itself. (Classifying against
  the contract rather than the rule list closes the loophole where any tell can be excused
  post hoc by naming a rule that did not exist.)

A refinement round forced by incomplete capture is ordinary iteration. A round forced
despite complete capture is the result that counts against the thesis, recorded as its
(b)-classified tells.

**Riders.** Assets includes at least one composition the toolkit does not cover, giving a
first read on the novel-component path (ladder + manifest + grader). The build's token cost
is recorded against the Members and Classes builds, since the thesis is ultimately economic.

## 10. Sequencing and versioning (design section 3d, approved)

Three passes, each a worktree off `main`, each plan written just-in-time:

1. **Pass 1, grammar.** The token layers; pixel-identical toolkit and admin migration with
   visual baselines as the no-drift proof; the palette/grammar boundary written as contract.
2. **Pass 2, enforcement.** The `cairn-audit` bin (svelte/compiler-plus-built-sheet
   substrate, the nine static and eleven rendered rules with their tiers, the suppression
   idiom with counting, graduation of the four repo gates; the new bin joins the `package`
   script's chmod list); the norms-manifest generator with provenance and the CLI query,
   running at publish/CI with a freshness check; primitives gap-closure per section 5's
   extended list (destination-picker, PageHeader adoption, card-shell, empty-notice recipe,
   form-row register) so the manifest measures a complete toolkit. The compositional
   rendered rules calibrate their false-positive rate against cairn's and ASC's existing
   screens during this pass.
3. **Pass 3, capture.** The standard doc within its prose budget, the two annotated
   exemplars (Members list, detail/slide-over) and the form-anatomy contract, the craft
   chapter, the extension grammar, the packaged skill with the tiered loading and the
   done-gate (`skills/` joins the package `files` array, which today omits it), the grader
   prompt calibrated against the archived labeled captures, the pre-registered coverage
   contract for the trial, the rationale doc, and the README and front-page positioning.

**One release at the initiative boundary.** Passes accumulate under `## Unreleased`; no
per-pass publishes. The cut has a hard consumer trigger: ASC installs from the registry, so
the Assets trial cannot start before the publish. Minor under the 0.x scheme (a new bin, a
new packaged-skill surface, the token layer); the number derives at the cut. The trial then
runs in ASC's own sessions against the published version, and its classified verdict
returns here as the initiative's post-mortem.

## 11. Out of scope

- Public-facing design-cue sharing (later initiative).
- The new-screen scaffold (deferred until the trial shows an anatomy-shaped miss).
- An ESLint-plugin surface for the audit (kept possible by the pure rule core; not built).
- Any open-ended theming or design-system generalization beyond cairn's admin.

## 12. Acceptance criteria

1. Every static and rendered rule in sections 6.2–6.3 implemented on the
   svelte/compiler-plus-built-sheet substrate with fixture tests; the four repo gates run
   as thin wrappers over the packaged engine with no behavior drift on cairn's own tree;
   the compositional rules' false-positive rates are measured on cairn's and ASC's screens
   and recorded.
2. Toolkit and admin screens migrate to grammar tokens (via the named role-utility
   interface) with zero visual-baseline drift.
3. The norms manifest generates at publish/CI with per-entry provenance, ships in the
   package, and answers `cairn-audit norms` queries; no open design question ships as a
   norm.
4. `cairn-doctor` installs and freshness-checks the skill in a consumer repo, and the
   skill's always-loaded core fits its declared token budget.
5. The craft chapter passes its acceptance test under a defined protocol: a fixed
   plain-daisy fixture, before/after renders, the pinned calibrated grader prompt, k=3
   runs, and a pre-stated pass condition.
6. The grader prompt is calibrated against the archived labeled captures (reproduces the
   known Members/Classes verdicts) before the trial, and the coverage contract is written
   and committed before the trial starts.
7. The Assets trial runs with the section 9 measurement design (k=3 consensus reads, four
   metrics) and its verdict is recorded, classified (a) vs (b) against the coverage
   contract, in the initiative post-mortem.

## 13. Amendments

### 2026-07-27: the Pass 2 rulings (type scale completed)

Ratified at the Pass 2 brainstorm, calibrated against the Pass 1 deviations ledger
(`docs/internal/2026-07-design-infrastructure-pass-1-deviations.md`) and a call-site
measurement of the unruled named steps. Three rulings amend section 4:

1. **Type roles carry a ruled line-height.** Each `--cairn-type-*` role gains a paired
   leading token, measured from the role's dominant computed value (body takes `text-sm`'s
   20px, title takes `text-2xl`'s 32px; the small roles are measured in-pass). The role
   utilities set both properties and respect Tailwind's `--tw-leading` override, the same
   mechanism the named steps use, so an explicit `leading-*` still composes. This unblocks
   the 129 named-step sites and makes a role a complete recipe rather than a size alone.
2. **No 12px step.** The 120 twelve-pixel sites resolve onto meta (13px) or label (11px) by
   the relationship each expresses, with per-site judgment, never blanket substitution. A
   one-pixel interval expresses no hierarchy, and 39 of the 40 bracketed sites are one
   screen's local idiom.
3. **One heading role, plus named exceptions.** The scale admits a seventh role between
   subtitle (15px) and title (24px) for dialog and panel headings, unifying the two
   competing recipes the measurement found (16px semibold across the admin; 18px
   display-bold in the media library). The brand wordmark (22px, the K4 keming
   fix) and the EditPage document title (30px, an editor-canvas special) are ratified named
   exceptions the audit knows about; the media library's three 20px stat numbers resolve or
   join the exception list at migration.

   **Settled 2026-07-28 from the Task 2 rendered probe: the heading role is 18px, weight
   700, in `--font-display` (Bricolage Grotesque), with a 28px leading.** The probe rendered
   both candidates at real call sites in both schemes, and each mocked into the other
   family's context. The 16px semibold recipe reads as a large label rather than a heading.
   In the create dialog it sits so close to the field label beneath it that the dialog opens
   with almost no hierarchy, and mocked into the media library it lets the 36px icon tile
   outweigh the heading, so a decision dialog reads as a notice. The display face at 18px
   and weight 700 opens a real step above the 13px meta line in both contexts.

   The 28px leading is the measured value at the winning family's own sites rather than a
   derived one, so those thirteen sites stay pixel-identical and only the losing family
   moves. Its ratio (1.56) is looser than the title role's (1.33). That is a coherence
   question the scale can revisit if a later pass rules leading ratios as a family, and it
   is recorded here rather than silently harmonized, because this pass forbids inventing a
   token value.

   Consistent with the Pass 1 ruling that a role utility carries structure only,
   `type-heading` sets size and leading and nothing else. Weight and font family stay a
   component recipe, the same way the eyebrow's case and tracking do.

**Consequence for acceptance criterion 2.** Pixel identity was Pass 1's proof device, not a
standing vow. Pass 2's normalization applies these rulings, which moves pixels deliberately:
criterion 2's "zero visual-baseline drift" is amended to "zero drift outside the ratified
rulings; the visual baselines regenerate once at normalization end and the regenerated set
passes an eyes-on read." After normalization, cairn's own tree must pass the audit's
error tier with no suppressions beyond the ratified named exceptions above, each carried as
a counted, reasoned suppression directive at its call site.
