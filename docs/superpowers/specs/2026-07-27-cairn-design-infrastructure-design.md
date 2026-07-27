# Cairn design infrastructure — design spec (2026-07-27)

The design ratified in the 2026-07-22/27 brainstorm (opened in the ASC sitting, completed in
cairn-cms). Supersedes the seed at
`~/Projects/aksailingclub-org/docs/2026-07-22-cairn-design-infrastructure-brainstorm-seed.md`
for everything except the ASC evidence corpus it points to, which remains this initiative's
data. Implementation runs as three just-in-time pass plans under `docs/superpowers/plans/`.

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
resolved on its first coherence read. Members took two reads (FAIL with 8 tells, then PASS);
Classes took three (FAIL 4, FAIL 2, PASS). The target is one.

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
- **The palette/grammar boundary is written and audit-enforced.** A site re-tunes palette
  tokens (`--color-*`); it never redeclares a grammar token. The `grammar-boundary` audit
  rule (section 6.2) is the enforcement half.

## 5. Primitives, the standard, and the extension grammar (design section 2, approved)

**Primitives gap-closure, nothing speculative:** the destination-picker pattern and
PageHeader adoption. (EmptyState already shipped in `admin-toolkit` at 0.89.0.)

**The standard doc** is written for an agent's context window, with the annotated Members
exemplar as its load-bearing half: anatomy, the annotated screen, per-component contracts,
and the register rules (one filled action per surface, chip passivity, facet quietness).

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
- **Static substrate is `svelte/compiler`, not regexes.** An adversarial review proved the
  regex substrate the repo gates use today fails open on three common Svelte 5 idioms
  (single-quoted attributes, array classes, object classes) and false-positives on prose
  ("the white background"). Svelte is already a peer dependency, so the parser is guaranteed present in
  any consumer at zero dependency cost. **The graduation of the repo gates is gated on this
  swap**; the regexes never ship to consumers.
- **Suppressions are co-located comments** for static rules:
  `cairn-audit-disable-next-line <rule-id> -- reason`, with dead-directive detection. This
  replaces the file+token JSON allowlists, whose entries orphan silently on rename, exempt
  whole files rather than lines, and hide the reason in a file nobody opens. Rendered mode
  keeps a page+selector+reason JSON, since a live-page finding has no source line.
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
  admin routes) and the rendered-mode allowlist.
- **Tiers.** `error` exits nonzero; `advisory` reports and never gates.

### 6.2 Static rules, v1 (all error tier)

| ID | Checks | Evidence |
| --- | --- | --- |
| `no-uncompiled-class` | Every class token in admin markup exists in the built `cairn-admin.css` | Three real failures under green gates (invisible Overdue chip; silent `ml-1`/`divide-y`; unstyled stats strip) |
| `type-scale` | Every font-size resolves to a `--cairn-type-*` token | "Seven unrelated type sizes" on Members |
| `gap-scale` | Margin/padding/gap literals resolve to gap-role or spacing tokens | ~40 off-scale literals in the ASC mechanical audit |
| `token-colors` | No raw hex/rgb/named colors; no pure achromatics; neutrals derive from the palette's neutral role | Five literal-white declarations bypassing tokens; the craft chapter's neutral-derivation rule |
| `grammar-boundary` | Consumer CSS never redeclares a grammar token | The ratified palette/grammar boundary (section 4) |
| `focus-parity` | Every `:hover` selector carries a matching `:focus-visible` | Six hover-only families; ASC standing-gate candidate 1 |
| `motion-band` | Transition/animation durations in 150–250ms; no `transition: all` | Graduates from `check:invisible-craft` |
| `reduced-motion` | Every transition-bearing selector covered by `prefers-reduced-motion` | Passing today in ASC; locked as a regression gate |

### 6.3 Rendered rules, v1

Error tier:

| ID | Checks | Evidence |
| --- | --- | --- |
| `one-filled-action` | At most one filled control per surface | Ratified register rule ("the portal's first filled button") |
| `focus-renders` | Keyboard focus produces a real computed outline | The rendered half of focus-visible coverage |
| `interactive-contrast` | Interactive text vs its own composited background ≥ 1.5 | Graduates the existing probe (the invisible-CTA lesson) |
| `touch-targets` | 44px at 390, aware of `::before` inset hit-area expansion | Graduates the existing probe; the `.nav-caret` finding |
| `weight-budget` | At most two distinct font-weights per surface | The craft chapter's numeric rule; a "surface" is a rendered route, so this is rendered-mode work |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 | ExpandableRow overflow, rediscovered independently by two consumers |
| `chip-ground-collision` | Chip/badge background distinguishable from its row background | badge-ghost melting into the zebra stripe |
| `relational-spacing` | Gap monotonicity (section > group > label-to-control); labels at label-gap from their control; equal gaps for same-level siblings | The invisible-feel "spacing rhythm" item, made measurable |
| `screen-anatomy` | One PageHeader with one h1; primary action in the header slot; content in the card region | The mechanical floor under "buried primary action" |

Advisory tier:

- `border-contrast` — WCAG 1.4.11 boundary contrast (3:1). The ratified `--cairn-card-border`
  hairline currently measures 1.11:1 light / 1.43:1 dark, and that design question is open
  on Geoff's queue, so the rule reports without gating until ruled.
- `norms-bands` — a component's measurements (control heights, padding-to-type ratios,
  radii, border treatments) fall inside the manifest's observed bands (section 6.4).
  Advisory by principle: a legitimately novel component may step outside a band
  deliberately; the grader judges whether the step was earned, and the advisory finding
  ensures it was seen.

### 6.4 The norms manifest

A build-time script renders the toolkit and admin screens and extracts the observed norms
as data: control heights by role, padding-to-font-size ratios, the border treatment
vocabulary, corner radii, icon and chip metrics, and the computed styles of each semantic
role. Shipped in the package as JSON. It serves both directions: the skill feeds it to the
builder agent at build time (measured norms as data, never inference from screenshots), and
the audit checks novel components against its bands (`norms-bands`, advisory). Because it
is generated from the toolkit rather than authored, it tracks the toolkit as long as the
generator runs; the generator is wired into the package build so a cut cannot ship a stale
manifest.

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
It loads at build time: the standard doc, the annotated exemplar, the craft chapter, the
derivation ladder, the norms manifest, and the grader prompt, plus the instruction to run
`cairn-audit` (static) before declaring a screen done and the coherence-read gate for any
derivation.

## 8. Narrative deliverables

A rationale doc in cairn's docs stating the bet (section 1's thesis; ASC is the proof case)
and the condition (an agent composes from what is legible at build time). README
positioning distills from it, and cairn.pub's front page gets a treatment as an explicit
deliverable.

## 9. The Assets proof loop (design section 3c, approved)

**Setup.** The ASC Assets pass resumes only after the initiative's release is on the
registry. It runs under the same process that built Members and Classes (fresh builder
sessions, plan-driven, uncoordinated), with one change: builders carry the packaged capture
(the skill in-context, the audit mid-build). **Control:** the Assets plan must not smuggle
in ad-hoc design coaching beyond what the package ships; if the plan hand-holds the design,
the trial measures the plan.

**Measurement.** The grader recipe holds constant with the Members refinement rounds
(fresh-context Opus, multi-state captures, 390 and 1440, light and dark) so the numbers
compare. Three metrics:

1. **Reads-to-PASS** (primary). Baselines: Members 2, Classes 3. Target: 1.
2. **First-read tell count.** Baselines: 8 (Members), 4 (Classes). A graded result even on
   a miss.
3. **Mid-build audit catches**: findings the gates fired on during the build that never
   reached the coherence read — the evidence that capture moved failures upstream.

**Verdict logic.** On a first-read FAIL, every tell is classified before any conclusion:

- **(a) Capture-gap tells** — no token, rule, exemplar, or manifest band covered the miss.
  These indict the implementation's completeness; each feeds the ratchet as a new rule or
  token candidate.
- **(b) Covered-but-missed tells** — the capture existed, the agent had it in-context, and
  the screen still shipped wrong. Only these count against the thesis itself.

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
2. **Pass 2, enforcement.** The `cairn-audit` bin (svelte/compiler substrate, static and
   rendered rules, tiers, suppression idiom, graduation of the four repo gates; the new
   bin joins the `package` script's chmod list); the norms-manifest generator, wired into
   the package build; primitives gap-closure so the manifest measures a complete toolkit.
3. **Pass 3, capture.** The standard doc, exemplar, craft chapter, extension grammar, the
   packaged skill with the doctor freshness check (`skills/` joins the package `files`
   array, which today omits it), the rationale doc, and the README and front-page
   positioning.

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

1. Every static and rendered rule in sections 6.2–6.3 implemented on the svelte/compiler
   substrate with fixture tests; the four repo gates run as thin wrappers over the packaged
   engine with no behavior drift on cairn's own tree.
2. Toolkit and admin screens migrate to grammar tokens with zero visual-baseline drift.
3. The norms manifest generates from the toolkit, ships in the package, and the skill loads
   it.
4. `cairn-doctor` installs and freshness-checks the skill in a consumer repo.
5. The craft chapter passes its acceptance test: a fresh agent, a plain daisy component,
   and the chapter produce a measurable move toward the cairn feel without art direction.
6. The Assets trial runs with the section 9 measurement design and its verdict is recorded,
   classified (a) vs (b), in the initiative post-mortem.
