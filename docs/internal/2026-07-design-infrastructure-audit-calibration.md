# cairn-audit calibration, the promotion evidence base (design infrastructure Pass 2, Task 17)

> **INTERIM CAVEAT, added 2026-07-28, before acting on anything below.** This calibration never
> measured ASC's authenticated admin, and that is the one corpus the promotion question most needed:
> the only living extended cairn interface, cairn's own components underneath and roughly 31
> custom admin routes on top, and the same interface whose Members diagnosis produced this
> initiative. The verdicts below therefore rest on cairn's own showcase plus a consumer's public
> marketing pages and login screen. Treat them as provisional.
>
> The reason recorded in section 7, that the admin was structurally unreachable, is also wrong. ASC's
> `wrangler.toml` declares `AUTH_DB = cairn-asc-auth` and its `src/hooks.server.ts` names the working
> path (seed a local D1 session row per `docs/internal/admin-smoke-test.md`); the run used `vite dev`,
> which loads no bindings, and stopped there. The corpus is being closed under
> `docs/superpowers/plans/2026-07-28-asc-admin-corpus-calibration.md`, which rewrites this document's
> corpus B material and re-examines all five verdicts against real evidence.

**What this is.** The measured evidence that decides whether any of `cairn-audit`'s five compositional
rendered rules may leave the advisory tier. Two corpora were audited and every finding classified true
positive or false positive by eye against the live element. The verdicts are in section 5; the numbers
that produce them are in sections 3 and 4.

**What this is not.** It is not a defect list, though it surfaced several (section 8), and it is not a
rule-quality review. A rule can be well engineered and still fail the promotion bar, and two of them do.

**Status of the numbers.** Every count in this document was re-derived from the raw audit output rather
than taken from a report. Section 10 records exactly what was verified and what rests on a single
agent's judgment, because the distinction matters for a later pass reading this to make a call.

---

## 1. The promotion bar

The bar lives in the design spec, `docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`,
section 6.1 ("Mechanics"), under **Tiers**. Quoted exactly:

> **Tiers.** `error` exits nonzero; `advisory` reports and never gates. Compositional
> rendered rules START advisory and promote to error by measured evidence (no design system
> anywhere has shipped mechanical composition rules; the false-positive literature does not
> exist, so cairn's own screens and ASC's are the calibration corpus during Pass 2). This is
> the graduation ratchet applied to the audit's own rules.

Three things follow from the exact wording, and all three shaped this document.

**The bar names both corpora by name.** "cairn's own screens and ASC's" is not a suggestion about where
to look. A rule measured on only one of them has not met the bar as written, whatever its rate. This is
why section 7's coverage gap is stated as a limit on the evidence rather than as a footnote.

**The bar sets no numeric threshold.** It says "measured evidence" and stops. No false-positive
percentage is named anywhere in the spec. This document therefore does not invent one and does not
promote anything on a threshold it made up. It happens not to matter: every one of the five rules fails
on any reading of the bar a reasonable person would propose, so the missing number never becomes the
deciding question. A later pass that wants to promote a rule after fixing it will need to rule on a
threshold, and that ruling does not exist yet.

**"Compositional" is the spec's own word for these five.** Section 6.3 lists them as the advisory tier:
`relational-spacing`, `screen-anatomy`, `weight-budget`, `border-contrast`, `norms-bands`. The last two
carry extra conditions in 6.3 that bear on their verdicts. `norms-bands` is "advisory by principle",
which is a standing disqualification rather than a calibration question. `border-contrast` was advisory
pending a design ruling that has since landed as Ruling 2.

**Where section 6.3 is superseded.** Two rows of the 6.3 table no longer describe the shipped rules,
because Task 16b's rulings changed them. `touch-targets` reads "44px at 390" in the spec; Ruling 1 set
the floor to 24x24, WCAG 2.5.8 AA, and the rule implements 24. `border-contrast`'s row says the hairline
question is "open on Geoff's queue, so the rule reports without gating until ruled"; Ruling 2 ratified
the hairline and its 1.15 floor. Read 6.3 through the rulings, not on its own.

---

## 2. The two corpora

| | Corpus A: cairn's own admin | Corpus B: ASC, a live consumer |
| --- | --- | --- |
| What | `examples/showcase` admin, the engine's own screens | `~/Projects/asc-site`, HEAD `55578d78`, installing `@glw907/cairn-cms` **0.90.1 from npm** |
| Surface | 6 default admin routes x 2 themes | 10 pages x 2 themes |
| States | rest, plus menu-open where a rule declares it | rest, plus focus-visible |
| Engine under test | the worktree build (unreleased) | the worktree build, invoked by absolute path |
| Static mode | 50 files, 9 rules | not run (out of scope for promotion, which is a rendered-tier question) |

Corpus B's composition is the fact that governs how its numbers read. Of its ten pages, **nine are ASC's
own public pages** (home, post index, an article, events, join, contact, donate, my-account, members) and
exactly **one, `/admin/login`, renders inside cairn's admin theme**. That single page is the only
apples-to-apples surface between the corpora. Section 7 explains why the rest of the admin was
unreachable and what that costs the evidence.

Corpus B was run against the committed `40cb6d77` state, before the `border-contrast` fix described in
section 9 landed in the working tree. Corpus A is reported at both baselines, since the fix moved 14
findings.

### Reproducing each run

Corpus A. Package first, always, because the bin runs from `dist`:

```
npm run package
cd examples/showcase && VITE_CAIRN_E2E=1 npm run build
CAIRN_DEV_BACKEND=1 npm run preview -- --port 4173
npx cairn-audit --rendered      # from the worktree root
```

`CAIRN_DEV_BACKEND=1` on the *build* fails prerender with `dev_backend_in_prod`; omitting
`VITE_CAIRN_E2E=1` makes `/admin` return 503. Kill the preview afterwards and confirm nothing answers on
4173, or the `BASE_URL` contract test fails.

Corpus B. The invocation must name the worktree's own `dist/audit/bin.js` by absolute path. `npx
cairn-audit` from the ASC checkout resolves ASC's installed 0.90.1 bin and would measure the published
engine instead of the pass's:

```
npm run package                                     # in the cairn worktree
cd ~/Projects/asc-site && npm run dev -- --port 4180 --strictPort
BASE_URL=http://localhost:4180 node <worktree>/dist/audit/bin.js --rendered --config <abs>/asc-audit.config.json
```

The working directory must be the ASC checkout, because `bin.ts` calls `loadConfig(process.cwd(), ...)`.
Playwright resolves from the executing `dist` file, so ASC needs no Playwright install. ASC's tree was
clean at start and byte-identical clean at end, HEAD unmoved, no D1 writes.

---

## 3. Headline counts

**Corpus A, rendered, before the section 9 fix:** 20 errors, 228 advisories, 116 suppressed, exit 1.
**Corpus A, rendered, after the fix:** 20 errors, 214 advisories, 130 suppressed, exit 1. Errors
unchanged and byte-identical, verified line by line.
**Corpus A, static:** 1 error, 0 advisories, 5 suppressed, exit 1. The error is `stock-default-hazards`
on `EditPage.svelte:989` (`badge-ghost`), the pass's known carry-forward. The 5 suppressed are the
ratified `type-scale` exceptions.
**Corpus B, rendered:** 39 errors, 283 advisories, 2 suppressed, exit 1.

Classification totals:

| Corpus | Tier | Findings | True positive | False positive | FP rate |
| --- | --- | ---: | ---: | ---: | ---: |
| A (cairn) | error | 20 | 20 | 0 | **0%** |
| A (cairn) | advisory | 214 | 172 | 42 | **19.6%** |
| B (ASC) | error | 39 | 36 | 3 | **7.7%** |
| B (ASC) | advisory | 283 | 2 | 281 | **99.3%** |

The advisory row is the promotion-relevant one, and the gap between 19.6% and 99.3% is the whole
finding. The compositional rules are close to calibrated against the codebase their authors wrote and
close to useless against the first outside codebase they met.

**The suppression collapse.** Corpus A suppresses 130 `border-contrast` findings. Corpus B suppresses 2,
and both of those are on `/admin/login`, which is cairn's own markup. No ASC-authored element is
forgiven by any exemption in the engine. Section 5.1 traces the mechanism.

---

## 4. Per-rule false-positive rates

Rates are stated with their denominators, since a rate without one is not evidence. A dash means the
rule produced no findings on that corpus, which is **not** a 0% false-positive rate and is treated as
unclassified throughout.

### Advisory tier, the five promotion candidates

| Rule | A: findings | A: TP | A: FP | A: FP rate | B: findings | B: TP | B: FP | B: FP rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `border-contrast` | 196 | 154 | 42 | 21.4% | 175 | 0 | 175 | **100%** |
| `weight-budget` | 4 | 4 | 0 | 0% | 44 | 2 | 42 | **95.5%** |
| `screen-anatomy` | 2 | 2 | 0 | 0% | 36 | 0 | 36 | **100%** |
| `relational-spacing` | 0 | – | – | unclassified | 20 | 0 | 20 | **100%** |
| `norms-bands` | 0 | – | – | unclassified | 8 | 0 | 8 | **100%** |

Corpus A figures are post-fix. Pre-fix, `border-contrast` read 210 findings with the same 42 false
positives, a 20.0% rate; the fix moved 14 true positives into suppression and so raised the rate while
improving the rule.

### Error tier, for comparison and for one demotion question

| Rule | A: findings | A: TP | A: FP | A: FP rate | B: findings | B: TP | B: FP | B: FP rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `touch-targets` | 10 | 10 | 0 | 0% | 36 | 36 | 0 | **0%** |
| `viewport-overflow` | 4 | 4 | 0 | 0% | 0 | – | – | – |
| `chip-ground-collision` | 4 | 4 | 0 | 0% | 0 | – | – | – |
| `one-filled-action` | 2 | 2 | 0 | 0% | 0 | – | – | – |
| `interactive-contrast` | 0 | – | – | unclassified | 3 | 0 | 3 | **100%** |
| `focus-renders` | 0 | – | – | unclassified | 0 | – | – | – |

`chip-ground-collision` also produced 12 advisory-tier findings on corpus A, all true positives, all the
honest indeterminate refusal described in section 8.

---

## 5. Verdicts

All five compositional rules **stay advisory**. None is a promotion candidate. Each fails for an
independent, separately measured reason, which is the useful part: this is not one systemic problem
wearing five hats.

### 5.1 `border-contrast` stays advisory

**Decided by:** 175 findings on corpus B, 175 false positives, 100%.

The deciding measurement is the contrast distribution. Every one of the 175 ASC findings was parsed for
its best-of-two ratio, and the distribution is:

| Ratio | 1.19 | 1.30 | 1.36 | 1.39 | 1.49 | 1.50 | 1.55 | 1.62 | 1.64 | 1.68 | 1.75 | 1.77 | 1.97 | 2.33 | 2.55 | 2.58 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Count | 4 | 72 | 2 | 4 | 1 | 9 | 62 | 8 | 1 | 3 | 1 | 1 | 1 | 2 | 1 | 3 |

The minimum is **1.19**. `RATIFIED_HAIRLINE_FLOOR` is **1.15**. Not one ASC border falls below the floor
cairn ratified for its own hairline, so every one of these 175 findings would be suppressed if the
exemption keyed on the measurement Ruling 2 actually ratified. It does not. `RATIFIED_TOKEN` is the
literal string `--cairn-card-border`, proved by sentinel substitution on that exact custom property, and
ASC paints every hairline from its own `--color-card-border`, using `--cairn-card-border` only as a
border shorthand. The exemption is structurally unreachable by any consumer.

That is the clearest single instance in this audit of a rule calibrated only for the codebase its authors
wrote, and it is why 130 findings are forgiven on corpus A against 2 on corpus B. The section 9 fix
widens that asymmetry rather than narrowing it: it makes the exemption catch more of cairn's own borders
while a consumer's stay at 2.

A second, independent disqualifier. The finding message asserts the element "renders no visible boundary
on either side" at ratios up to 2.58, where the boundary is plainly visible on screen. The same defect
appears on corpus A at 2.84. A consumer who checks one such finding by eye has grounds to disbelieve the
other 174, and an error-tier rule that can be disbelieved is worse than no rule.

On corpus A its 21.4% comes from exactly two mechanical shapes, both fixable without touching the rule's
premise: 28 findings applying a UI-component standard to a decorative non-interactive pill, and 14
declining a ground the rule could have measured. Neither was fixed in this task, because neither
adjudication concluded the rule was wrong and advisory findings cannot change the exit code.

**What would move it:** rekey the exemption onto the ratified measurement rather than cairn's private
token name, fix the message's false claim, and re-measure both corpora. The 100% consumer rate is an
artifact of a fixable mechanism, not of the rule's premise, so this is the most promotable of the five
after repair.

### 5.2 `weight-budget` stays advisory

**Decided by:** 44 findings on corpus B, 42 false positives, 95.5%.

The false positives fall into three separable groups, and one of them is disqualifying on its own. Twelve
findings fire on markdown-rendered prose where the third weight is `<strong>`: "400 (p, li); 500 (a); 700
(strong)". The rule counts an author's semantic emphasis in a content file as a design-language
violation. cairn is a CMS. Breaking on the exact content the product exists to render is not a
calibration gap, it is a scope error, and it stayed invisible on corpus A only because the admin's
measured regions contain chrome rather than prose.

Eight more are the honest "rendered only chrome, an empty result here means unmeasured, not clean"
non-answer, which is correct engineering but is not a finding about the interface. The remaining 22
accurately count ASC's deliberate 400/500/600/800 type ramp. The 2-weight budget is admin doctrine; a
consumer's brand never agreed to it, and the rule offers no opt-out short of allowlisting every section
heading on the site.

This rule produced the corpus's **only two true-positive advisories**, and they are worth keeping: on
`/admin/login` it reports "renders no `<main>` landmark and no open dialog layer", which is a real
accessibility defect in cairn's own shipped `LoginPage` (verified: zero `<main>` and zero `<header>` in
the component). The rule is finding real things. It is not ready to gate a consumer's build.

**What would move it:** exclude author-content regions from the weight census, or decline to measure
prose regions, then re-measure. The doctrine-versus-brand problem needs a config surface or a ruling that
the budget applies only inside cairn's own admin.

### 5.3 `screen-anatomy` stays advisory

**Decided by:** 36 findings on corpus B, 36 false positives, 100%.

The root cause is stated in the rule's own source rather than inferred. `screen-anatomy.ts:105-106`:

> A page with no drawer is not running inside the shell, so it is judged as an office screen.

Every page outside cairn's admin has no `.drawer`, so **every consumer page in existence is judged an
office screen** by default. The findings then assert admin doctrine at ASC's marketing pages ("this
office route renders no `.card-shell` region inside `<main>`") and cite
`docs/internal/admin-design-system.md`, an internal cairn document a consumer cannot read and was never
given. The scope predicate is inverted: absence of evidence is treated as proof of the positive case.

The most instructive detail is that its one working exemption is accidental. `/admin/login` escapes only
because `readScreenAnatomy` opens with `if (!mainEl) return null` (line 99) and cairn's login page happens
to render no `<main>`. That is the same markup `weight-budget` correctly reports as a defect two rows
above. **Two rules in the same run hold opposite positions on whether that missing landmark is a bug.**
Fixing cairn's login landmark, which section 8 recommends, will immediately produce 2 new false positives
on cairn's own login page unless `screen-anatomy` gets a real scope predicate first. Sequence the two
fixes accordingly.

**What would move it:** a positive scope predicate (the admin theme root, or the shell's own marker)
rather than an inverted one, plus a re-measure on an authenticated consumer admin per section 7.

### 5.4 `relational-spacing` stays advisory

**Decided by:** 20 findings on corpus B, 20 false positives, 100%, and zero demonstrated true positives
anywhere.

Two defects, either sufficient. The first is scope: the rule has no page-scope predicate, so it reports
"could not resolve" on 100% of pages outside the admin theme root, and its remedy text instructs the
consumer to declare cairn's internal grammar tokens on their own marketing site. A rule that cannot
answer should decline, not report.

The second is worse and is the cleanest single finding in this audit. Its four `--cairn-gap-*` tokens
**do not exist in any published cairn build**. Verified both directions: ASC's installed
`@glw907/cairn-cms@0.90.1/dist/components/cairn-admin.css` returns 0 matches for `--cairn-gap-label`, and
the worktree's sheet declares them at `cairn-admin.css:74`. So the rule cannot answer against a released
engine on any page, including cairn's own admin screens as a consumer actually receives them. **Its score
of 0 on corpus A is an artifact of the authors running the unreleased build**, not evidence of health.

That makes its corpus A result unclassified in the strongest sense: the rule has never been shown to
produce a true positive on any surface. Promotion is not a close question.

**What would settle it:** publish the grammar tokens, then measure the rule on an authenticated consumer
admin where the tokens are in scope and the drawer is present. Until it has produced a true positive
somewhere, there is nothing to promote.

### 5.5 `norms-bands` stays advisory

**Decided by:** 8 findings on corpus B, 8 false positives, 100%. Also disqualified by principle, per spec
6.3.

Spec 6.3 already settles this one: "Advisory by principle: a legitimately novel component may step
outside a band deliberately; the grader judges whether the step was earned, and the advisory finding
ensures it was seen." A rule whose whole purpose is to make a deliberate choice visible cannot gate a
build. It is listed here for completeness and because the measured evidence independently agrees.

The measurement is worth recording anyway, because it names a metric defect. Four of the eight findings
report `padding-block` of 0.0px against a band of 1px. The probed button computes padding
`0px/16px/0px/16px` while rendering 300x40px with a 21px line-height: it takes its vertical size from
`height` plus flex centering, which is how daisyUI v5 sizes `.btn`. The rule uses `padding-block` as its
proxy for vertical breathing, so **any height-sized control reports 0.0 and falls outside the band by
construction**. That is a measurement defect, not a design observation, and it will misfire on every
daisyUI consumer. The other four accurately measure ASC's deliberate `--radius-box`, which is a brand
decision and not a defect.

**What would move it:** nothing. It is advisory by principle. Fix the `padding-block` proxy so its
advisories are trustworthy, but do not queue it for promotion.

### 5.6 Not a promotion question: `interactive-contrast` should be considered for DEMOTION

This rule is **error tier today** and it produced 3 gating false positives on a consumer's home page while
producing zero findings on the codebase its authors wrote. That is the inverse of the promotion
question and it belongs in this document because it gates.

All three are `a.wdwd-panel-link`, **light theme only**, reported at contrast 1.00 with color
`rgb(255,255,255)` against a composited background of `rgb(255,255,255)`. The theme asymmetry is the
tell: identical markup passes in dark. The panel renders white links on a navy gradient scrim over a
photo, entirely legible. An ancestor probe found `a.wdwd-panel-link` and **all eight of its ancestors** at
`rgba(0,0,0,0)` with `backgroundImage: none`. The navy comes from a sibling `<div class="wdwd-panel-scrim">`
and an `<img>` stacked underneath via CSS grid. The rule composites ancestor `background-color` only, so
it walks past the scrim and the image and lands on the document's white.

It is measuring the wrong surface in **both** themes and only gets caught in one, where the document
background happens to be light. The photo-hero idiom is on the front page of most consumer sites, so this
is an error-tier rule that fails a common composition. A later pass should either teach it stacking
contexts or demote it until it handles them.

---

## 6. Corpus asymmetries

This is the most important signal in the document, and it is more diagnostic than any single rate.
**Five rules fire in only one direction, and the direction says how each was built.**

| Rule | Corpus A (cairn) | Corpus B (ASC) | Reading |
| --- | ---: | ---: | --- |
| `viewport-overflow` | 4 err | 0 | Fires only on the authors' own code |
| `chip-ground-collision` | 4 err + 12 adv | 0 | Fires only on the authors' own code |
| `one-filled-action` | 2 err | 0 | Fires only on the authors' own code |
| `interactive-contrast` | 0 | 3 err | Fires only on the consumer |
| `relational-spacing` | 0 | 20 adv | Fires only on the consumer |
| `norms-bands` | 0 | 8 adv | Fires only on the consumer |
| `touch-targets` | 10 err | 36 err | **Fires on both, true positives on both** |

**The three that fire only on cairn's own admin are healthy.** `viewport-overflow`,
`chip-ground-collision` and `one-filled-action` found real debt in the engine's own house and passed a
consumer's screens cleanly, with real candidates present to judge. `viewport-overflow` is the sharpest
example of the reverse asymmetry: ASC has been through the family's five-viewport responsive standard and
cairn's own admin has not. The rule is working; the engine is the one failing it. `chip-ground-collision`
was checked specifically for a scope miss, since a rule keyed to daisyUI's `.badge` would simply not see
a consumer's chips, and it is not one: the rule detects a chip as a rendered shape, ASC renders such
chips, and they were evaluated and passed.

**The three that fire only on the consumer were never calibrated; they were fitted.** Each traces to a
specific mechanism, named in section 5: ancestor-only compositing blind to a stacked scrim, unpublished
tokens, and `padding-block` as a proxy for height-sized controls. A rule that is silent on the codebase
it was written against and loud on the first outside codebase it meets has not been tested, it has been
overfit to one tree.

**`touch-targets` is the only rule that earns its error tier on this evidence.** It fired 10 times on
corpus A and 36 on corpus B, and every one of the 46 was classified a true positive against the rule's
stated contract. That is what calibration looks like. It carries one disclosed gap, in section 8.

---

## 7. What corpus B could not cover

Stated plainly, because it limits what this evidence proves.

**The entire authenticated admin was unreachable.** Every `/admin/*` route on ASC returns 303 to
`/admin/login`, verified individually. That means zero coverage of two things. First, cairn's own admin
office and desk screens as installed on a consumer. Second, and more costly, **ASC's 31 custom admin
routes under `src/routes/admin/club/**`**: members, classes, events, money, email, documents, committees,
assets, settings.

Group two is the corpus this task most wanted. It is the extending developer's own markup rendering
inside cairn's shell through `CairnAdminShell`, with the drawer present, the theme root mounted and the
gap tokens in scope. That is exactly where the compositional rules are designed to apply, and it is where
they were never measured.

**Why it was unreachable.** ASC ships no dev-auth backend, deliberately and documented at
`hooks.server.ts:2-5`: `@glw907/cairn-cms-dev` is a monorepo-only devDependency, unpublished by design,
and a local admin smoke test seeds a D1 session row directly instead. Seeding a session row is a database
write, which this task's constraints forbid, and adding a switch would have meant modifying the thing
being measured.

**What that costs the verdicts.** Someone will reasonably object that `screen-anatomy`'s 36/36 and
`relational-spacing`'s 18-of-20 are manufactured by pointing an admin rule at a marketing page. Three
reasons the finding survives the objection.

First, `rendered.pages` is a documented consumer-owned config surface, and a consumer with 31 custom admin
routes must name their own pages. This is the intended usage, not an abuse of it.

Second, none of these rules carries any scope predicate. They do not decline, they assert, and they
assert citing an internal cairn document the consumer has never seen. A rule that cannot tell it is out
of scope has no defence against being run out of scope.

Third, the in-scope slice points the same way. On the one cairn-theme page in the corpus, `/admin/login`,
the engine still produced 6 findings: 2 real (the missing `<main>`), 2 version skew against its own
unpublished tokens, and 2 an unsuppressed hairline. Small, but not clean.

**What would complete the evidence.** Reaching ASC's `/admin/club/**` routes. Every scope objection above
evaporates there and both directions of the calibration question get a clean answer. The cheapest honest
path is not a dev backend in ASC but publishing `@glw907/cairn-cms-dev`, or shipping a documented
audit-only session seeder in the engine. That is itself a finding: **today a consumer cannot run
`cairn-audit --rendered` against their own admin at all** without hand-writing a D1 row, and if they try,
section 8's redirect defect gives them a clean-looking report of the login screen measured six times.

---

## 8. Defects surfaced, as a by-product

These are not the promotion question. They are recorded here because this measurement is where they
surfaced and they need homes in the roadmap or the friction log.

### In the engine's own interface (corpus A, all true positives)

- **`touch-targets`**: `/admin/media`'s per-card selection checkbox renders 20x20 with no associated
  label (`cb.labels` is empty), inside a `span` that already reserves 24x24. The affordance is drawn and
  the input does not fill it. Cheapest fix in the set.
- **`touch-targets`**: the column sort button on `/admin/posts` and `/admin/pages` renders 62x16, and the
  row title link renders 41x19 and 109x19 inside a 49px-tall row, for the primary action of the row.
- **`viewport-overflow`**: `/admin/media`'s `div.join.toolkit-toolbar-segmented` renders 335px wide inside
  a 320px viewport, taking `document.scrollWidth` to 351 against `innerWidth` 320 with no containing
  scroller. The page scrolls horizontally at 320, which breaks the family responsive standard's hard rule.
- **`chip-ground-collision`**: `/admin/media`'s "Not referenced" badge on the broken-image card reads 1.11
  dark and 1.03 light against the empty thumbnail well. Six of seven cards show a pill and the seventh
  shows bare text. `/admin/vocabulary`'s count pill reads 1.12 in both themes, far below Ruling 3's 1.5.
- **`one-filled-action` + `screen-anatomy`, one defect found by two rules from different premises**:
  `/admin/vocabulary` renders two `btn-primary` controls, and "Save changes" sits outside the header and
  outside every `.card-shell`. Nothing on the screen says which is the page's primary action. Two rules
  converging on one element from unrelated directions is what makes this a real defect rather than a
  scoping artifact of either.
- **`border-contrast`**: form control boundaries read 1.49 light and 1.77 dark against WCAG 1.4.11's 3:1
  (26 findings, the most defensible accessibility finding in the corpus); the segmented filter buttons
  carry daisyUI's stock `--btn-border`, a 5% darkening of their own fill, reading 1.01 in dark (36
  findings); table row dividers are base-content at 5% alpha reading 1.10 light and 1.14 dark (70
  findings, the single largest class).
- **`weight-budget`**: `/admin/login` renders no `<main>` landmark. Reproduces on every consumer install.
  **Fix `screen-anatomy`'s scope predicate first**, per section 5.3.
- **Static, already carried**: `badge-ghost` on `EditPage.svelte:989`, the design call held open.

### In the rules themselves

Beyond the disqualifiers already argued in section 5:

- **`touch-targets` does not implement WCAG 2.5.8's spacing exception, and this is the most consequential
  calibration gap in the pass**, because the rule is error tier and gates. Its header cites 2.5.8 and
  discloses the omission in TSDoc (lines 32-33). Its **message**, which is what a developer reads in CI,
  says only "renders 62x16px against the 24x24px floor". The nearest-target centre distance for both
  table shapes measured 47px, clear of the 24px-circle test, so **8 of its 10 corpus A errors would not be
  2.5.8 violations**. Enforcing a stricter house bar than the criterion it names is a legitimate choice.
  The message should say so.
- **`chip-ground-collision`'s remediation text misdirects on the indeterminate path.** It says "Give the
  surface a solid background-color" to a chip that already carries a 0.9-alpha fill. The unmeasurable
  thing is the ground, a user-uploaded image, not the chip. All 12 advisories give advice that cannot be
  acted on as written. The refusal itself is correct and is the honest form: a chip over user imagery has
  no determinable ground, so the rule declines rather than guessing.
- **`border-contrast` report legibility.** A finding prints "contrast 1.15" while the suppressed block
  prints "ratified floor 1.15" and still reports, because the true value is about 1.1497 and `toFixed(2)`
  rounds up. A reader comparing the two printed numbers concludes Ruling 2's exemption is broken.
- **`weight-budget`'s CHROME set is keyed purely on platform semantics** (`nav`, `button`, `summary`,
  `thead`, `[role=columnheader]`), so a toolbar that is a bare `<div>` with a `<p role="status">` count
  line has that count counted as body content. Ruling 4's intent was to exclude toolbar chrome. It did not
  change the `/admin/media` verdict, since an independent 400 witness exists, so this is latent rather
  than active.
- **`runRendered` follows redirects and validates only the final status.** `page.goto()` follows the
  chain and the runner checks `response?.status()` with no comparison against the requested path
  (`rendered.ts:717-722`). On any auth-gated site a configured `/admin/posts` returns 200 having landed on
  `/admin/login`, and every finding from that visit is labelled with the route the consumer asked for.
  `DEFAULT_RENDERED_PAGES` is five gated admin routes plus `/admin/login`, so **a consumer running the
  default config without a live session audits the login screen six times and gets a clean-looking
  report.** That is silent-green of exactly the kind this engine exists to prevent. The fix is to compare
  the final URL against the requested path and fail loudly, the same way a non-2xx already does.
- **Four rules returned zero on corpus A and are unclassified, not verified clean**: `focus-renders`,
  `interactive-contrast`, `relational-spacing`, `norms-bands`. A rule that cannot fire and a rule with
  nothing to find produce the same number. None should be considered for promotion without a live-fire
  check on a manufactured input. Corpus B partially answers three of them, badly, per sections 5.4, 5.5
  and 5.6; `focus-renders` remains with no signal in either direction.

---

## 9. The two adjudications resolved during measurement

Both concern `border-contrast` and both were resolved with measurement rather than argument. They are
recorded here in full because the point of banking them is to stop the next agent re-litigating.

### 9.1 The `.btn` border case: the rule was wrong, and it was blind to a CSS transition

**Verdict:** the button is not defective. Its authored intent renders exactly as written, and the
derivation probe was defeated by a transition.

The measurement, on `/admin/media` in Chromium, both themes:

| | Light | Dark |
| --- | --- | --- |
| `transition-property` | `color, background-color, border-color, box-shadow, transform` | same |
| `transition-duration` | 0.2s | same |
| `borderTopColor` before | `oklch(0.93 0.008 75)` | `oklch(0.3 0.014 75)` |
| `--cairn-card-border` | `oklch(93% .008 75)` | `oklch(30% .014 75)` |
| `borderTopColor` synchronously after substituting `rgb(1,2,3)` | `oklab(0.93 0.00207055 0.00772741)` (what the rule read) | |
| `borderTopColor` 600ms later | `rgb(1, 2, 3)` (what it becomes) | |
| `borderTopColor` sync-after, transitions disabled | `rgb(1, 2, 3)` | |

Two things prove it. The border color **before** the probe is byte-identical to the token in both themes,
so daisyUI's `.btn` plainly does not win the cascade over the authored
`border-[var(--cairn-card-border)]`. `--btn-border` computes to `color-mix(in oklab, oklch(96.5% .006 75),
#000 5%)`, a different value that never appears. And the tell is the serialization flip from `oklch` to
`oklab`: that is the same color re-expressed in the space Chromium interpolates in, which is what
`getComputedStyle` returns while a transition is in flight. One synchronous tick after substitution the
transition sits at progress 0, so the reported value is still the old color and the sentinel never
appears.

**The fix**, the smallest one that is correct: `derivedSides` saves `transition-property`, forces it to
`none !important` for the duration of the synchronous probe, and restores it. Nothing else in the
derivation test changed. It does not widen the exemption, since `color-mix(in oklab, rgb(1,2,3) 70%,
transparent)` still does not equal `rgb(1,2,3)`, which section 9.2's re-run confirmed.

**A second defect fell out of the fix, and the existing restore fixture caught it.** Restoring
`transition-property` before the color had settled started a 0.2s transition running back from the
sentinel, leaving the element repainting while later rules measured it. The rule now reads a resolved
value, which flushes the pending recalc, while transitions are still off, so the sentinel-to-original
change commits under `transition-property: none` and starts nothing. Without that ordering the audit
repaints the page it is about to measure.

**Cost of the defect, every movement explained:** 228 to 214 advisories, 116 to 130 suppressed, errors
unchanged at 20 and byte-identical. Exactly 14 findings moved, all `border-contrast`, all on `<button>`
elements, all painted in the exact ratified token bytes, all clearing the 1.15 floor. Four are the
`/admin/media` "Find orphaned files" button this adjudication is about. The other ten are the same latent
defect on a second element nobody went looking for: `CairnAdminShell.svelte:623`'s command-palette
trigger, which carries `border-[var(--cairn-card-border)]` and `transition-colors`, on 5 routes x 2
themes. Regression fixtures pin a transitioned button, a non-transitioned control, and the restore.

### 9.2 The color-mix boundary: the rule correctly reports, do not extend the exemption

**Verdict:** a color-mix-derived hairline does not inherit Ruling 2's exemption. Recorded as a named
boundary in `RATIFIED_SENTINEL`'s TSDoc with both mix shapes, and pinned by two fixtures.

**The measured population is zero**, which is what made the decision easy rather than close. The brief's
premise was that six color-mix-through-the-token declarations currently report. They do not. A probe
walked every bordered element on all 6 routes x 2 themes, substituted the sentinel, and looked for the
signature of a pass-through: a border color that **moves but does not become** the sentinel. Zero hits,
both themes, all routes. Tracing the six declarations to source explains it: they live in `HelpHome`
(`/admin/help`, not in the rendered page list), the media library's orphan-scan result list (mounts only
after clicking "Find orphaned files"), `TidyReview`, `CairnTidySettings`, `ComponentInsertDialog`, and
`ListToolbar`'s active-facet edge. None renders at rest on an audited route. The conservative answer
costs zero findings today and closes a future hole.

**The distinction that matters**, both halves now named in the TSDoc:

A mix that only **dims** the token, `color-mix(in oklab, var(--cairn-card-border) 70%, transparent)`,
still renders the ratified color, only quieter. Ruling 2 ratified a measurement, not a color, so a weaker
rendering of the same color sits outside it on exactly the grounds an opacity-dimmed hairline already
does. Admitting it to identity would only move the decision onto `RATIFIED_HAIRLINE_FLOOR`, which is
where a dimmed hairline belongs anyway.

A mix that **blends** the token with a different color (`--cairn-warning-ink`, `--color-error`,
`--color-primary`) is a different design element making a different claim, and it fails on identity,
correctly. This is the half that has to hold. Nobody ratified a warning-tinted or accent-tinted edge, and
the mix percentage is free to run up, so "mentions the token" would eventually exempt a border painted
essentially in error red. Widening identity to any expression naming the token has no defensible
stopping point.

**A correction worth banking.** The first hypothesis was that the 70 table-divider findings were this dim
color-mix shape, and the arithmetic was plausible. Probing the declaration refuted it: those dividers
compute to `oklch(0.93 0.006 75 / 0.05)`, base-content at 5% alpha, unrelated to `--cairn-card-border`.
That wrong measurement had already been written into the rule's TSDoc and a test comment as though it
were fact, and both were replaced with the traced source locations. A banked false measurement in a
document that exists to stop the next agent re-litigating a ruling is worse than no document.

---

## 10. Reconciliation: what was verified, and what rests on judgment

Both agents' numbers were treated as inputs, not facts. This is what was independently checked while
writing this document.

**Re-derived from raw audit output and confirmed exact:**

- Corpus B totals (39 / 283 / 2) and every per-rule count, weighted for the report's `(xN)` collapse.
  Advisory rules sum to 283 and error rules to 39.
- Corpus A pre-fix totals (20 / 228 / 116) and every per-rule count.
- Corpus A post-fix totals. **The rendered audit was re-run for this document** (package, showcase build,
  preview on 4173, `npx cairn-audit --rendered`) and returned `20 errors, 214 advisories, 130 suppressed`,
  exit 1, matching the reported figures exactly. Per-rule: `border-contrast` 196 advisory + 130
  suppressed, `chip-ground-collision` 4 error + 12 advisory, `touch-targets` 10, `viewport-overflow` 4,
  `one-filled-action` 2, `weight-budget` 4, `screen-anatomy` 2.
- The claim that the fix left errors untouched. The 20 error lines were extracted from both runs, sorted
  and diffed: **byte-identical**.
- Corpus A static (1 error, 0 advisories, 5 suppressed), the error being `badge-ghost` on
  `EditPage.svelte:989` and all 5 suppressed being `type-scale`.
- Section 5.1's contrast distribution, parsed from all 175 ASC `border-contrast` messages. Minimum 1.19,
  maximum 2.58, total 175.
- The preview was killed and port 4173 confirmed free, so the `BASE_URL` contract test is unaffected.

**Structural claims verified against source:**

- `RATIFIED_TOKEN = '--cairn-card-border'`, `RATIFIED_SENTINEL = 'rgb(1, 2, 3)'`,
  `RATIFIED_HAIRLINE_FLOOR = 1.15`.
- `screen-anatomy.ts:105-106` carries the drawer-absence comment quoted in 5.3, and `readScreenAnatomy`
  guards `if (!mainEl) return null` at line 99.
- `DEFAULT_RENDERED_PAGES` is five gated admin routes plus `/admin/login`.
- `LoginPage.svelte` contains zero `<main>` and zero `<header>`.
- `--cairn-gap-label` is declared at `cairn-admin.css:74` in the worktree and returns **0 matches** in
  ASC's installed `@glw907/cairn-cms@0.90.1` sheet. Installed version confirmed 0.90.1.
- `touch-targets` sets `TARGET_MIN = 24` per Ruling 1 and discloses the unimplemented 2.5.8 spacing
  exception in TSDoc at lines 32-33.
- `rendered.ts:717-722` calls `page.goto()` and checks `response?.status()` with no final-URL comparison.

**One discrepancy, resolved.** A first pass at the contrast distribution produced 1.30 x76 and no 1.39
bucket, against the reported 1.30 x72 and 1.39 x4. The cause was an off-by-one in the ad-hoc parser that
truncated the final digit of the second ratio, not an error in the reported figures. Corrected, the
distribution matches the reported one exactly, bucket for bucket. Nothing else failed to reconcile.

**What rests on single-source judgment, and is not independently verified.** The true-positive and
false-positive **classifications** themselves are each one agent's eye judgment against a live element and
a screenshot. What was verified is that the denominators are real, that the arithmetic is internally
consistent (corpus A: 154 + 12 + 4 + 2 = 172 true positives against 214 findings, so 42 false positives
and 19.6%; corpus B: 175 + 42 + 36 + 20 + 8 = 281 against 283, so 2 true positives and 99.3%), and that
each classification's stated reasoning is consistent with the rule's source. The in-page probes reported
in sections 5.6 and 9.1, and the 47px nearest-neighbour measurement in section 8, were not re-run. A later
pass that intends to promote a rule on the strength of a specific classification should re-measure that
class rather than take this table's word for it.

**A note on baselines.** Corpus B was measured against committed `40cb6d77`, before the section 9.1 fix.
Where this document compares the corpora directly, corpus A's pre-fix column is the like-for-like one.
The fix does not change any comparison's direction; it widens the suppression asymmetry from 116-versus-2
to 130-versus-2.

---

## 11. Summary of verdicts

| Rule | Tier today | Verdict |
| --- | --- | --- |
| `border-contrast` | advisory | **Stays advisory.** 100% FP on the consumer; the exemption keys on cairn's private token name and is structurally unreachable. Most repairable of the five. |
| `weight-budget` | advisory | **Stays advisory.** 95.5% FP on the consumer; counts markdown `<strong>` as a design violation. Produced the corpus's only true-positive advisories. |
| `screen-anatomy` | advisory | **Stays advisory.** 100% FP on the consumer; judges every non-admin page an office screen by an inverted predicate. |
| `relational-spacing` | advisory | **Stays advisory.** 100% FP on the consumer; its tokens are unpublished, so it cannot answer against any released engine. No true positive demonstrated anywhere. |
| `norms-bands` | advisory | **Stays advisory**, and by principle per spec 6.3. Also 100% FP, via a `padding-block` proxy that misreads every height-sized daisyUI control. |
| `interactive-contrast` | **error** | **Demotion candidate.** 3/3 gating FPs on a consumer home page, 0 findings on cairn's own; composites ancestors only and cannot see a stacked scrim. |
| `touch-targets` | error | **Keep at error.** The only rule that fired true positives on both corpora (10 and 36, 0% FP). Disclose the unimplemented 2.5.8 spacing exception in the message. |
| `viewport-overflow`, `chip-ground-collision`, `one-filled-action` | error | **Keep at error.** True positives on cairn's own admin, clean passes with real candidates present on the consumer. |
| `focus-renders` | error | **No signal.** Zero findings on both corpora. Needs a live-fire check on a manufactured input before any claim about it. |
