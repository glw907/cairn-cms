# Adversarial review of the design-infrastructure spec (2026-07-27)

A clean-context Fable 5 review of
`docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`, commissioned by
Geoff before plan-writing, with a two-part mandate: research prior art for making a design
language reproducible by non-designer builders (human or AI), and attack the spec against
its own success criterion. The reviewer had no involvement in the spec's authorship. All
findings were folded into the spec the same day; this file is the durable record.

## 1. Prior-art findings that should change the spec

**1.1 The one direct practitioner test of this exact design splits the spec's stack in
half.** Builder.io documented an attempt to make coding agents follow their design system
through a long written rules file and abandoned it: "models weight examples over
instructions," and rules files grew to hundreds of lines without stopping repeated
mistakes. What worked: mechanical lint restrictions the agent cannot argue with, type-level
constraints that make bad choices fail to compile, forced token-only values
(`declaration-strict-value`), and a "golden directory" of reference implementations, since
"copying a known-good template is the one thing these models do almost perfectly." They
also flagged screenshots as actively misleading (a panel "looked right" while using
deprecated patterns). Source:
https://www.builder.io/blog/how-to-make-ai-agents-follow-your-design-system. Implication:
the spec's layers 1, 2, and 6 (tokens, primitives, audit) and the annotated exemplar half
of layer 3 are on validated ground. The prose halves (standard doc, craft chapter as
written rules) are the components a scaled practitioner tried and demoted. The spec's own
working hypothesis already predicts this ordering; the spec should act on its own
hypothesis by budgeting the prose small and pushing every rule that can be mechanical into
the audit or manifest, treating prose as the connective tissue only.

**1.2 The LLM grader is the field's known-worst judging configuration as specced.**
Multimodal LLM-as-judge studies show significant bias, hallucination, and inconsistency in
absolute pass/fail scoring (https://mllm-judge.github.io/); even at temperature 0,
borderline verdicts flip across identical runs, and temperature control is being deprecated
on newer Claude models (https://arxiv.org/html/2606.26185v1); "coherence/harmony" sits at
the low end of even human inter-rater agreement (kappa 0.37-0.63 range,
https://arxiv.org/pdf/2607.12835); and a same-family builder and grader carries documented
self-enhancement bias. The spec makes a single fresh-context read both the trial's primary
metric and the shipped extension-grammar gate. The corpus itself shows the operational
fragility: Members refinement attempts 1-4 died before any verdict. One mitigation is free
and specific to this project: the archive holds labeled captures with known verdicts.
Calibrate the shipped grader prompt against those before the trial, and run the trial's
reads as k=3 with a consensus verdict and the tell union reported. Without this, a one-read
delta from baseline is indistinguishable from grader noise.

**1.3 No major design system has ever shipped mechanical composition rules; the spec's
rendered tier is genuinely unprecedented.** Primer, Atlassian, Polaris, and SLDS all
enforce exactly one layer mechanically: token identity and API correctness. None ships
anything like `one-filled-action`, `relational-spacing`, or `screen-anatomy` (sources:
https://github.com/primer/eslint-plugin-primer-react,
https://atlassian.design/components/eslint-plugin-ui-styling-standard/,
https://polaris-react.shopify.com/tools/stylelint-polaris,
https://developer.salesforce.com/docs/platform/slds-linter/guide/reference-rules.html). The
nearest analog, axe-core, tops out at 30-57% of WCAG coverage after a decade, with focus
behavior explicitly manual-only. This does not mean the rendered rules are wrong to
attempt; cairn has two advantages the vendors lack (a closed anatomy it fully controls, and
an agent audience that tolerates noisier findings than human PR reviewers do). It does mean
the rendered composition rules are experiments with no failure-mode literature. Ship the
compositional ones advisory, measure false-positive rate on cairn's own screens and ASC's
existing screens during Pass 2, and promote by evidence — the graduation ratchet applied to
the audit's own rules.

**1.4 The norms manifest has no prior art at all.** Superposition extracts tokens from live
sites (one-time, no enforcement); Project Wallace/CSS Stats compute aggregate CSS hygiene.
Nothing found derives numeric bands from a component library and gates new components
against them. The unstudied risks need first-principles handling: survivorship of
accidents, band degeneracy at n≈10 components, and no mechanism distinguishing "outside the
band because wrong" from "outside because legitimately novel."

**1.5 Every successful non-designer design system codifies a page-genre layer above
components; the spec deferred exactly that artifact.** GOV.UK's success with non-designer
teams rests on patterns and page templates, one level above components
(https://design-system.service.gov.uk/patterns/, adoption at 400+ services in year one).
Atlassian ships `PageLayout` regions and systemizes sub-header variants per screen genre.
Brad Frost's "recipes" names the identical gap
(https://bradfrost.com/blog/post/the-art-of-design-system-recipes/). The Members-era
failures the seed diagnoses (buried primary action, sibling screens disagreeing, screen
anatomy) are all genre-layer failures. The strongest prior art says the anatomy-shaped miss
is the expected first failure.

**1.6 Default-regression is the specific slop mechanism to guard against.** The shadcn/v0
story shows constrained vocabulary works partly as a training-distribution effect, and its
documented failure mode is agents shipping stock defaults wherever the rules are silent
(https://www.builder.io/blog/figma-to-code-visual-copilot,
https://medium.muz.li/why-every-ai-built-app-looks-the-same-and-how-to-escape-ai-slop-919bf2dc6fc0).
cairn's admin deviates from stock DaisyUI deliberately and pervasively. Stock daisy is
in-distribution; cairn's deviations are not. An agent under pressure will regress to stock
daisy and pass `no-uncompiled-class` doing it, since stock classes compile fine. A
deliberate "known stock-default hazards" rule family converts the admin-design-system doc's
hardest-won rulings into mechanical floors.

**1.7 Retrieval beats bulk context in every shipped AI-facing design system.** Figma Dev
Mode MCP/Code Connect, Carbon MCP, and Nord's llms.txt all work by structured lookup, never
by loading a full standard into context
(https://www.figma.com/blog/design-systems-ai-mcp/,
https://github.com/carbon-design-system/carbon-mcp, https://nordhealth.design/ai/).
Combined with instruction-following decay past roughly 3K tokens of rules and
lost-in-the-middle retrieval bias (https://arxiv.org/pdf/2310.20410,
https://redis.io/blog/context-rot/), this argues the skill should be a thin always-loaded
core plus on-demand artifacts, and the norms manifest should be queryable rather than
inlined JSON.

**1.8 Palette-swap theming breaks structurally, not just in values.** Material's dark theme
needed a different elevation mechanism (overlays), not different shadow values, because
shadows stop working on dark grounds; DaisyUI's own tracker shows theme customization
breaking at exactly the divergence points
(https://medium.com/androiddevelopers/dark-theme-with-mdc-4c6fc357d956,
https://github.com/saadeghi/daisyui/issues/3921). cairn's craft is full of palette-coupled
mechanisms: warm-tinted shadows at hue 75, the `bg-primary/10` active-nav pair sitting at
~4.5:1 "near the floor," the ink story's opacity-blend prohibition, `--cairn-warning-ink`
derivations.

**1.9 Compliance and register are separable, and Polaris proves it.** Shopify's own
retrospective describes years of fully token- and component-compliant screens that
merchants rated "dull" and "bland"
(https://medium.com/shopify-ux/uplifting-shopify-polaris-7c54fc6564d9). A green
`cairn-audit` plus in-band norms will still not carry "warm, refined, editor-first."
Audit-green must never be presented as "design done," only as "vocabulary clean."

## 2. Deficiencies, ranked

### CRITICAL

**C1. The verdict logic cannot indict the thesis, because category (a) is always
available.** Capture completeness is unbounded: for any tell, someone can always name a
token, rule, or band that did not exist, so every tell is classifiable as capture-gap and
the trial can only ever conclude "ordinary iteration." Unfalsifiable by construction, with
the classification performed post hoc by the same initiative that built the capture. Fix:
pre-register a coverage contract before the trial; tells inside a claimed area are
covered-but-missed even if no specific rule named the exact miss.

**C2. Reads-to-PASS = 1 is not measurable by a single grader run.** The target metric's
entire resolution (1 vs 2) is one binary verdict from an instrument with documented
run-to-run flips on borderline cases, scoring the most subjective category there is, with a
FAIL threshold of one tell. The corpus shows the grader process also injects noise: Classes
read 2 failed on tells the fix round itself introduced, so reads-to-PASS partially measures
fix-round hygiene, not capture. Fix: k=3 grader consensus per read against the pinned
shipped prompt and pinned model version; calibrate the prompt once against the archived
labeled captures; elevate first-read tell count to co-primary.

**C3. The rendered audit is not in the build loop, so the spec's best rules fire one round
too late.** The rules carrying the strongest evidence lineage are all rendered-mode:
`viewport-overflow` (the tell that recurred at two consumers), `one-filled-action`,
`chip-ground-collision` (the invisible Overdue chip), `screen-anatomy` (the buried primary
action). If those run only at the trial's coherence read, their catches ARE the refinement
round, and the mid-build-catches metric is structurally starved. Fix: the done-gate
mandates a rendered pass against the dev server, both themes, before a screen is declared
done. This single change buys more first-read tells than any prose artifact.

**C4. The trial's genre does not match the capture's genre, so a predictable failure is
built into the experiment.** The annotated exemplar is Members, a list screen. The Assets
screen is grid-, detail-, and form-heavy, and the toolkit has no form primitives. The
"nothing speculative" gap-closure list also excluded concrete, already-filed gaps: the
card-shell string copied verbatim a fourth time (Classes harvest finding 9), the in-card
empty-notice recipe reinvented three times (finding 10), and the form-row/label register
(the ClassForm label-wrap defect is on-record debt). Every form-layout and detail-anatomy
decision in the Assets build would be an invention, graded FAIL, and classified as a
capture gap. Fix: extend the capture to the genres Assets actually needs (a
detail/slide-over exemplar and a minimal form-anatomy contract; the two-level label
register ruling in ASC's decisions.md is the raw material).

### MAJOR

**M1. No token budget or load tiering for the skill.** The current internal standard alone
is roughly 30K tokens; the skill proposed standard + exemplar + craft chapter + ladder +
manifest + grader prompt in-context, on top of the plan and the site's code.
Instruction-following decays sharply well below that. Fix: hard per-artifact budgets, core
in the low thousands of tokens, on-demand loading, manifest queried through the CLI.

**M2. The norms manifest encodes accidents as norms with no provenance channel.** Generated
from the toolkit as-is, it will faithfully measure unratified state: the
`--cairn-card-border` 1.11:1 hairline is explicitly an OPEN design question, yet the
generator would ship it as a measured norm the skill hands to builders as ground truth.
With roughly ten toolkit components, many "bands" will be single observations wearing the
costume of a distribution. Fix: per-entry provenance (ratified vs observed-only), minimum
observation counts, exclusion of open items.

**M3. First divergent-brand consumer breaks the palette-coupled half of the capture.** The
manifest generates from Warm Stone, while the spec sanctions consumer palette re-tuning.
Every color-adjacent band, plus the craft rules coupling to specific lightness values,
silently invalidates under a re-tuned palette. Fix: store palette-dependent norms as
relationships (role, mix formula, required floor) rather than resolved values; document
palette re-tuning as a constrained operation whose acceptance test is a clean consumer-side
rendered audit in both themes.

**M4. `weight-budget` at error tier fails cairn's own flagship screens.** The documented
type recipes use four weights on one office route: body 400, inactive nav 500,
eyebrows/active nav 600, page heading 700. "At most two distinct font-weights per surface"
as a route-level rendered rule is refuted by the design system it is meant to protect. Fix:
scope to content region and ship advisory.

**M5. Several rendered rules lack the definitions that determine their false-positive
rate.** `one-filled-action`: "surface" undefined across layers (modal, slide-over, expanded
panel), and "filled" must distinguish the accent fill from the sanctioned ink fills.
`screen-anatomy`: desk routes have no PageHeader by design. `relational-spacing`: inferring
hierarchy from an arbitrary live DOM is unsolved in general. Fix: define surface partition
(topmost open layer wins), define filled (accent-filled), exempt desk routes, start
`relational-spacing` advisory.

**M6. The static substrate needs the built sheet, and the token-authoring interface is
undefined.** The admin is utility-class-driven, so `type-scale`, `gap-scale`, and
`focus-parity` cannot be evaluated from the Svelte AST alone; font sizes live in Tailwind
classes that must be resolved through the compiled `cairn-admin.css`, and hover states live
as `hover:` utilities inside class strings. The spec never said what a builder writes to
"pick label, never 11px": the role-utility route is the established repo idiom and makes
the audit's resolution tractable. Fix: name the interface (named role utilities) and state
the substrate is AST plus built-sheet resolution.

**M7. Skill delivery inside the trial's builder sessions was unspecified, and the control
rule made it ambiguous.** A packaged SKILL.md does not self-load into a subagent; something
must instruct the load, and the "no ad-hoc design coaching" control could be read to forbid
exactly that instruction. Fix: the dispatch protocol ("load the cairn admin-screen skill")
is sanctioned process; any design content beyond the pointer is coaching. Record what each
builder had in context, and note the Members/Classes baselines were never zero-capture
(their builders had ASC's decisions.md and repo docs); the trial measures packaging plus
enforcement.

**M8. No suppression discipline for unattended builders.** The audit's primary audience is
an agent under completion pressure, and agents silence gates. Fix: the report counts
suppressions prominently; the skill forbids adding one without flagging it; the trial adds
"suppressions added" as a fourth metric.

### MINOR

- **m1.** The craft-chapter acceptance test was unfalsifiable as written; define the
  protocol (fixed fixture, before/after renders, pinned grader prompt, k runs, pre-stated
  pass condition).
- **m2.** Wiring the norms generator into the package build adds a rendering step to a
  script the repo runs constantly; generate at publish/CI with a freshness check.
- **m3.** The rendered matrix undershot the family's five-viewport bar; add 320 to
  `viewport-overflow` and name wide-composition in the grader prompt.
- **m4.** Static-mode scoping for consumer repos was unstated; default to the site's admin
  routes plus imported components, configurable.
- **m5.** Theme matrix for rendered rules was unstated; every rendered rule runs both
  themes.
- **m6.** Interaction and motion capture is static-only; the capture recipe gains an
  interaction state and the grader prompt carries interaction judgment explicitly.

## 3. What the spec got right (attacked and survived)

- Evidence-per-rule discipline: every rule cites an observed failure; no surveyed vendor
  system does this.
- The regex-to-AST substrate ruling, with the graduation gated on the swap.
- The ESLint rejection reasoning (silent-green on zero matched files is intolerable for an
  unattended agent gate) and the pure rule core preserving the plugin option.
- Suppressions as co-located commented directives with dead-directive detection.
- The graduation ratchet: composition rules are discovered, then mechanized — the same
  maturity model that made GOV.UK's pattern library work, and the honest answer to
  "enforcement can't carry composition."
- Pixel-identical token migration with visual baselines as the no-drift proof.
- cairn as the audit's first consumer (dogfooding surfaces the definitional defects before
  any consumer does).
- Advisory-by-principle tiering, correctly reasoned.
- The honest empiricism of the thesis framing; the deficiencies are about making the test
  capable of failing.

## 4. Verdict on the bet

Achievable in a strong-but-not-literal form. Prior art validates every individual
mechanism: constrained token vocabularies reliably kill off-scale choices; strong component
defaults carry look by training-distribution gravity; golden exemplars are the one thing
agents copy almost perfectly; lint-in-the-loop is the proven delivery vehicle. cairn's own
corpus shows the same split: contracted decisions repeated across three uncoordinated
sessions, precedent-only decisions reinvented every time. What no one has ever
demonstrated, anywhere, is first-shot compositional harmony on a novel screen from packaged
capture alone; the composition layer in every successful precedent is carried by genre
templates plus a judged iteration loop. "Lands resolved on its first coherence read" is
reachable only if the resolving happens inside the build.

The single change that most improves the odds: move the full gate into the build loop
(static audit, rendered audit both themes, self-run grader prompt) with the external
fresh-context read as independent verification, and pre-register coverage so a first-read
FAIL can genuinely indict the thesis. That redefinition is legitimate, not rigged: the
thesis is "a developer gets design for free," and a developer's agent that converges
unattended inside one build session delivers exactly that; the baseline's refinement rounds
were expensive precisely because they crossed session, grader, and human boundaries.

## Disposition

All findings accepted and folded into the spec on 2026-07-27 (C4 resolved by extending the
capture, not narrowing the trial). The spec's inline "adversarial review" references point
here.
