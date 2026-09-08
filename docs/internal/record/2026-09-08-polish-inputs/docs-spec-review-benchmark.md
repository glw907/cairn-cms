# Benchmark review: the docs standard against programs with a public track record

Adversarial review of `docs/superpowers/specs/2026-09-08-docs-standard-design.md`, one lens only:
how the proposed infrastructure compares to documentation programs that publish their tooling and
have shipped under it for years. Read-only. Every claim below is checked against a live page and
cited; nothing is asserted from memory. Fetched 2026-09-08.

Baseline for proportion: 79 published Markdown pages under `docs/` outside `internal/` and
`superpowers/`, maintained by one owner and coding agents.

## What cairn runs today

For the comparison to be fair, here is the current state. `.vale.ini` vendors the community Google
and Microsoft packages, globs `docs/**/*.md` onto Google, overrides `docs/editors/**` onto
Microsoft, and exempts `docs/internal/**`, `docs/superpowers/**`, `STATUS.md`, and `HISTORY.md`.
Five Cairn rules exist, all small: `Announcement.yml`, `ContrastFrame.yml`, `Marketing.yml`,
`TwoHeadedHeading.yml`, `VirtueClaims.yml`, 53 lines in total. CI installs a pinned Vale 3.15.1 and
runs `check:vale` at `--minAlertLevel=error`, plus `check:docs` (internal link and anchor
resolution), `check:visuals`, `check:figures`, and `check:prose`. `measure-prose.mjs` is 102 lines
and is not wired into CI. There is no markdownlint, no external link checker, and no rendered
preview per branch.

## Comparison table

| Program | What it gates (fails the build) | What it only reports | Who reviews | Page-type registry | Exemplars or corpus | Measures cadence | Human sittings per page |
|---|---|---|---|---|---|---|---|
| **GitLab** | Vale **error** level only, scoped to branding, trademarks, and anything that renders wrong; markdownlint; `lint-doc.sh`; internal link and anchor validation; Mermaid syntax; Hugo build | Vale **warning** (shows in the MR diff, never fails) and **suggestion** (local only). `SentenceLength` (25 words) and `ReadingLevel` (Flesch-Kincaid, target grade 8) are both **suggestion** | Technical Writer assigned per docs area, one approval | No. Docs are organised by product area, not by page shape | No | Yes, but advisory only and never at any gating level | 1 |
| **Kubernetes (website)** | Netlify build; CLA; Hugo shortcode validity. No prose linter | Everything editorial | Anyone may review; SIG Docs reviewers and approvers via OWNERS. Tech review and docs review are separate roles. Reviewers are told to comment rather than block | **Yes, the strongest in the survey.** Four types: concept, task, tutorial, reference, each with a required section list (`overview`, `prerequisites`, `steps`, `discussion`, `objectives`, `lessoncontent`, `cleanup`, `whatsnext`) expressed as Markdown comments and Hugo `heading` shortcodes | Each type names a published example page | No | 1 to 2 |
| **Red Hat (vale-at-red-hat)** | 3 error rules only: Abbreviations, CaseSensitiveTerms, DoNotUseTerms. 1 warning rule | 36 of 40 rules at **suggestion**, including `SentenceLength` (average 32 words) and `ReadabilityGrade` (Flesch-Kincaid below 9) | Peer review plus product owner | Yes, through Modular Documentation: concept, procedure, reference modules with fixed shapes | No | Yes, at suggestion | 1 |
| **Microsoft Learn** | **Acrolinx score, minimum 80, required to merge** in the `microsoft-365-docs` repo (`.acrolinx-config.edn`); build validation on metadata and links | Sub-scores below the threshold | PubOps team plus content owner. A documented exception path exists: apply the `Sign off` and `Acrolinx exception` labels and PubOps reviews | Yes: quickstart, tutorial, how-to, concept, reference, with required metadata | No | Yes, readability is one component of the composite score | 1 |
| **GitHub Docs** | `markdownlint` plus **67+ custom GHD rules at error level**: frontmatter schema, heading increment, image alt text, internal link form, generic link text, table column integrity, Liquid syntax, deprecated syntax. Runs pre-commit and in CI | GHD038 and GHD039 (expired and expiring content) at warning | Docs team review | Frontmatter `type` and layout schema, validated | No | No | 1 |
| **Cloudflare Docs** | **One** required check: the site builds, internal links resolve, no redirect loops | Everything else | Auto-assigned CODEOWNERS; a Cloudflare org member reviews. Preview build per commit | Components and product templates, not a formal registry. Diátaxis is not cited | No | No | 1 |
| **Astro Docs** | `pnpm lint`, `format`, TypeScript. No prose linter | Style guidance is prose only. Hemingway App is *suggested*, not run | At least one LGTM from another Team Docs member | No | **Yes, heavily.** The style guide is built from paired good and bad examples | No | 1 |
| **SvelteKit / Svelte** | `pnpm format`, `lint`, `check`, unit tests. PR template checklist | Prose entirely | Maintainer review | No | No | No | 1 |
| **Django / Diátaxis adopters** | Sphinx build and doctests | Prose | Core reviewer, one approval | Taxonomy only: tutorial, topic guide, reference, how-to. Four types, no per-type section order, no tooling | No | No | 1 |
| **DigitalOcean Community** | None public | None public | **Paid staff editor: peer-edits and technically tests every tutorial on a fresh server before publication** | Yes, tutorial and conceptual article templates | No | No | 1 to 2, by paid staff |
| **Stripe / Twilio** | Nothing public. Stripe authors in Markdoc; Twilio built its own CMS and describes a docs-as-code review flow | Not published | Internal writers plus engineering co-owners | Not published | Not published | Not published | Not published |
| **cairn, as specified** | `check:vale` at error, `check:anatomy`, `check:headings`, `check:provenance`, `check:prose-read`, `check:figures` (7 assertions), `check:visuals`, `check:docs`; the 40-word ceiling and the 25-word track ceiling at error after clearing | `check:cadence`: average length, hinged-pair share, short-sentence share, all beside a corpus entry | Fresh reviewer in a different model family, plus outline reviewer, plus `figure-verifier`, plus owner | **Yes, eleven types**, each with a fixed section order in a template, machine-enforced | **Yes, a measured corpus with floor and ceiling** | **Yes, hinged pairs and short-sentence share, a measure no surveyed program uses** | Reader test on about 40 pages, one sitting each, plus outline reads |

## Ranked findings

Ordered by how far cairn sits from the surveyed consensus, heaviest deviation first.

### 1. Gating sentence length at error level is heavier than every program surveyed, and the evidence does not earn it

Not one program gates a sentence-length or readability number. GitLab's `SentenceLength` (25 words)
and `ReadingLevel` (Flesch-Kincaid) are both **suggestion**, the level GitLab defines as not shown
in CI output, not shown in the MR diff, and never failing a job. Red Hat's `SentenceLength` (32
words average) and `ReadabilityGrade` (grade below 9) are both **suggestion** among 36 of 40 rules
at that level. Microsoft is the only program with a merge-blocking prose score, and readability is
one weighted component of a composite, with a labelled exception path through PubOps.

The spec proposes moving the 40-word ceiling and a 25-word track ceiling to **error**, with zero
violations, as a unit 5 acceptance criterion. That is a stricter treatment of sentence length than
GitLab, Red Hat, Kubernetes, GitHub, Cloudflare, Astro, and SvelteKit combined. The spec's own
goals section already concedes the evidence: "Controlled studies since the 1960s found that
rewriting to a sentence-length number does not improve comprehension." A number the spec says does
not improve comprehension should not be the thing that fails a build.

The proposal's Prior Art section states this correctly ("No team in the survey gates on a cadence
number"), and then the spec gates two of them anyway. That is an internal contradiction, not a
disagreement with the survey.

**Recommendation: change.** Hold the 40-word and 25-word ceilings at **warning** permanently, with
no promotion path. Delete the unit 5 acceptance criterion "The 40-word ceiling and the 25-word track
ceiling are at error level, with zero violations" and the clearing work in decision 3 that exists
only to satisfy it. That decision is the spec's own "medium for clearing the 135 admin and 61
editors sentences", the single largest piece of mechanical work in the plan, bought to reach a state
no surveyed program is in. Touches: "The prose rules" table Status column, decision 2, decision 3,
Compatibility, unit 5 acceptance criteria.

### 2. Eleven page types for 79 pages is roughly four times the industry ratio

Kubernetes runs **four** content types across a docs set of well over a thousand pages, and those
four are the most rigorous page-type registry found anywhere. Django and the Diátaxis adopters run
four. Microsoft Learn runs about five. Red Hat's modular docs run three. cairn proposes eleven for
79 pages, of which four (condition entry, symptom row, reference table, index page) are table or
list shapes that the spec itself exempts from most of the prose rules.

Eleven types means eleven templates, eleven corpus entries at the floor (up to twenty two at the
ceiling), and eleven anatomy definitions to keep in sync, for a set where several types will hold
one or two pages each. A page type holding one page is a page, not a type.

**Recommendation: change.** Collapse to six: task guide, concept page (absorbing tutorial milestone
and architecture overview, since both are concept pages with a fixed opening), reference entry,
reference table (absorbing condition entry and symptom row, all three being table shapes),
index page, and front door. Keep proposal as the internal seventh. This removes five templates,
five to ten corpus entries, and five anatomy definitions from unit 3, and it removes the
"a page type with no approved exemplar has no draft" blocker from the types least likely to get one.
Touches: the page-type registry table, "The page" section orders, decision 4 and 4a, unit 2 and
unit 3 acceptance criteria.

### 3. Machine-enforcing body section order has no precedent, but it is the one heavy item the failure evidence earns

Kubernetes defines required sections per content type and enforces them with nothing but Markdown
comments, Hugo shortcodes, and a human reviewer's checklist item ("New pages using correct page
content type"). GitHub Docs' linter validates the **frontmatter** schema at error level and never
the body's section order. Nobody machine-checks heading order against a template.

So `check:anatomy` is genuinely novel. It is also the single control that answers the recorded
failure. The front door failed at the outline, and the spec's Background says so directly. Of all
the heavy items, this is the one where the evidence and the mechanism actually meet.

**Recommendation: keep**, with the type count from finding 2 reducing its cost. Keep the design
constraint that the templates are its only source, which is the right control against drift.
Touches: decision 4a, unit 3.

### 4. `check:prose-read` and the per-page receipt file have no precedent and double the docs set's file count

No surveyed program stores a per-page review artifact in the repository. The closest analogue is
Microsoft's Acrolinx score, which lives in the PR check and not in a committed file. GitLab,
Kubernetes, Cloudflare, and GitHub all let the review live in the pull request, where the review
happened.

A content-hash receipt beside each page means 79 new files that must be regenerated on every
substantive edit, a gate that fails the build whenever someone fixes a typo without re-running the
chain, and a strong incentive to re-stamp a receipt mechanically rather than re-review. That is the
failure mode the receipt exists to prevent.

**Recommendation: change.** Keep the receipt as a **PR artifact**, not a committed per-page file:
the reviewer's report, the measurement table, the corpus entry, and the reader result posted on the
branch. Replace `check:prose-read` with a lighter committed record: one `docs/internal/docs-ledger.md`
row per page carrying page type, corpus entry, last review date, and reader-test status, with a
gate that fails only when a page has **no row at all**. That gets the "somebody other than the
author read this" guarantee without a hash that goes stale on every edit.
Touches: review chain step 9, decision 8a, the scripts table, unit 3 and unit 5 acceptance criteria.

### 5. The reader test at forty owner sittings is the right practice at the wrong scale

DigitalOcean is real precedent and the spec cites it correctly: editors technically test each
tutorial on a fresh server before publication. The difference is who pays. DigitalOcean runs paid
staff editors as a business function. Kubernetes gets its second pair of eyes free from SIG Docs
volunteers. cairn has one owner, and the spec books forty of that owner's sittings against a docs
set of 79 pages.

The spec's own Risks section flags this ("A unit 5 plan that does not schedule those sittings will
stall at its last acceptance criterion"), which is a prediction that the plan will stall, written
into the plan.

**Recommendation: change.** Sample rather than sweep. Reader-test the front door, the two track
index pages, and the six task guides on the highest-traffic paths: nine sittings, not forty. Make
the rest a standing trigger rather than a batch: a page gets its reader test the next time it is
substantively rewritten. That is the watch-item discipline this repo's own CLAUDE.md already
prescribes, applied to attended cost.
Touches: "The reader test", decision 9, unit 5 acceptance criteria, Open items.

### 6. The hinged-pair measurement and the corpus bands are novel with no precedent, and the spec already knows the instrument is unsound

No program in the survey measures clause-joining cadence at all. GitLab and Red Hat measure
Flesch-Kincaid and average sentence length, both decades-old instruments with published validation,
and both hold them at suggestion. cairn proposes a measure invented for this document, whose
definition the spec records as having "moved twice during the proposal", each move "changed the
numbers by more than the width of the human band", and whose sentence-splitter change "moves a track
figure by 17 points".

The corpus itself is defensible and has partial precedent. Astro's writing style guide is built
almost entirely on paired good and bad exemplars, and that is the exemplar mechanism working. What
has no precedent is attaching **numbers** to the exemplars and comparing a draft's numbers against
them.

The spec handles this correctly on paper: `check:cadence` never gates, exits 0 regardless, and the
bands stay advisory until a track has twenty documents and three hundred sentences. That is the
right guard rail, and it is stricter than what GitLab and Red Hat apply to their own advisory
metrics.

**Recommendation: keep, with one change.** Keep the corpus. Keep `check:cadence` as report-only.
**Drop the hinged-pair share from the corpus manifest's recorded numbers** and keep it in the
scanner's report only. Recording an unsound number in a manifest that later units draft against
gives it an authority the spec elsewhere denies it. Also drop the "more than fifteen points above
the entry's is called out" trigger, since the spec's own evidence says a splitter change moves the
figure by seventeen. Touches: "The corpus" constraints, review chain step 5, unit 2 acceptance
criteria.

### 7. `check:provenance` has no precedent and is the second item the failure evidence earns

Nothing in the survey resolves claims to a source brief. Kubernetes' canonical-content rule is the
nearest neighbour and is a human policy about linking, not a gate. But the recorded failure was
half factual: the front door told a story about editors emailing the owner that never happened.
Vale cannot catch that and neither can any tool in the survey.

The risk is scope creep. Gating "every claim" on a rebuilt page against a ledger id turns every
sentence into a citation exercise and will produce footnote soup on a page whose whole job is to be
readable.

**Recommendation: keep, narrowed.** Gate provenance on claims **about the owner and about cairn's
stance**, on the front door and on `docs/why-cairn.md`, exactly as the front-door half of the rule
states. Drop the generalisation in step 6 ("On a rebuilt page the same check generalizes: every
claim must carry an id"). Fact coverage on the rest of the set is already carried by
`check:snippets`, `check:reference:signatures`, and `check:transcripts`, which are stronger than a
footnote because they execute. Touches: review chain step 6, decision 8a, unit 1 and unit 5
acceptance criteria.

### 8. The drafter-never-reads-the-old-page rule is unprecedented and is the highest-risk item in the spec

No documentation program rewrites from a fact ledger with the source page withheld. Every program
surveyed edits in place, and Kubernetes and GitLab both organise their entire review flow around
diffs of existing pages.

The spec's stated reason is prose infection, and it is a real effect. The cost is that a rebuild
of 79 pages must first produce a complete claim inventory of 79 pages, and the spec's own risk entry
concedes the hole: "A claim the harvest missed entirely is caught by nothing." The mitigation named
is that the harvest's first acceptance criterion is completeness, which is asserting the risk away.

Weigh that against the measured evidence for the rule, which is one data point: the proposal
converged in eight revisions when edited and three when drafted fresh. One document, and a document
of a type (an internal proposal with no prior version) that is not what unit 5 does.

**Recommendation: change.** Keep the fact ledger, which is valuable on its own and is the only part
of unit 1 with a durable payoff. Relax the rule from "never opens" to **"drafts the outline and the
first draft from the ledger and the exemplar, then diffs against the old page for fact coverage
before review"**. That keeps the structural benefit, which is where the front door actually failed,
and closes the missed-claim hole with the cheapest possible control. Touches: unit 1's "One rule
governs every later drafting dispatch", unit 5's second acceptance criterion, Risks.

### 9. cairn is lighter than the field on Markdown structure linting

Every surveyed program with any tooling runs a Markdown structural linter. GitLab runs
`markdownlint`. GitHub Docs runs `markdownlint` plus 67 custom rules **at error level**, covering
heading increment, table column integrity, code-fence language tags, list markers, spacing in links
and emphasis, and image alt text. cairn runs none. `check:docs` resolves links, and Vale reads
prose, and nothing checks the Markdown itself.

This is the clearest gap in the review, and it is cheap. `markdownlint-cli2` is a config file and a
CI line. Several rules the spec wants `check:headings` to hold are already stock markdownlint:
MD001 heading increment, MD024 duplicate headings, MD025 single H1, MD003 heading style.

**Recommendation: add.** Adopt `markdownlint-cli2` in unit 3 and let it carry heading increment,
single H1, and no skipped levels. Reduce `check:headings` to the three rules markdownlint cannot
express: sentence case, verb-first for task sections with noun phrases elsewhere, and sibling
parallelism. That is a smaller new script than the spec's eight-rule version and it inherits a
maintained ruleset. Touches: the scripts table, decision 4a, unit 3 acceptance criteria.

### 10. cairn is lighter than the field on rendered previews

Kubernetes reviews on Netlify previews and its review checklist explicitly asks reviewers to check
lists, code blocks, tables, notes, and images **in the preview**. Cloudflare publishes a preview
build for every commit and calls it the thing that lets reviewers see what will ship. GitLab builds
with Hugo in CI. cairn's docs render on cairn.pub only after a release and a pin bump, so the whole
review chain grades Markdown source that nobody has seen rendered.

This matters most for the part of the spec that is about figures. `check:figures` and
`check:visuals` assert mechanically, the `figure-verifier` agent grades by method, and no step in
the nine-step chain looks at a rendered page. The repo's own family-wide rule is that "nothing
deploys without a full-page render read by the main loop's own eyes."

**Recommendation: add.** Add a docs preview build to the branch CI, publishing the four arms as
static HTML to a preview URL, and make the outline review (step 3) and the figure grading read it.
Touches: the review chain, decision 5a, unit 3.

### 11. cairn is lighter on external link rot, which is a real risk given the corpus

Minor but worth a line. GitLab validates links across projects. The corpus will vendor excerpts from
eleven external sources with fetch dates, and `docs/**` already carries many external links. Nothing
checks that they still resolve.

**Recommendation: add**, cheaply. A scheduled (not per-PR) external link check, wired through the
`schedule` skill per this repo's watch-item rule rather than as a build gate. Touches: the scripts
table, unit 3.

### 12. Items where cairn matches the field, with no change needed

- **The severity contract.** Copied from GitLab and attributed correctly. GitLab's exact policy is
  "If you add an error-level Vale rule, you must fix the existing occurrences of the issue in the
  documentation before you can add the rule." **Keep.**
- **Must-fire fixtures per rule.** Precedent exists: the errata-ai style packages ship a `/fixtures`
  directory per rule. cairn's version is stricter and answers a reproduced version-skew bug.
  **Keep.**
- **A reviewer who is not the author.** Universal. Kubernetes formalises it into tech review and
  docs review as separate roles. The model-family-diversity requirement is cairn's own addition and
  is the correct adaptation for agent-drafted prose. **Keep.**
- **The two-round cap.** No docs precedent, but it is this workstation's existing code rule applied
  consistently, and it is a cost control rather than a quality claim. **Keep.**
- **The page brief.** Closest analogue is DigitalOcean's required proposal and outline before an
  author writes. **Keep**, and note it is four lines, which is genuinely cheap.
- **Outline-first review.** Matches DigitalOcean's proposal-and-outline stage exactly. **Keep.**
- **The figure rules.** Kubernetes publishes the most complete diagram guidance in the field and
  cairn's two tests are a reasonable extension. **Keep.**

### 13. One correction to the spec's own citations

The spec and the register treat the vendored Google package as the Google standard. The package
states in its own README: "This project is neither maintained nor endorsed by Google." Google
publishes the style guide under CC BY 4.0 and publishes no linting of its own docs repositories. The
"Google floor" cairn enforces is a community port's approximation of a guide, pinned at one version.
That is a fine floor. It should not be described as Google's own gate anywhere in the spec or the
register, because it is not one, and the spec's Prior Art already gets close to saying so ("neither
package holds a rule above the word").

**Recommendation: change** one line of Prior Art and the register's description of the packages.

## Verdict on proportion

**The infrastructure is not proportionate as specified, and the disproportion is concentrated in
five places rather than spread across the design.**

The parts that answer the recorded failure are proportionate and several are worth their weight even
at 79 pages. The fact ledger, the page brief, the outline-first review, `check:anatomy`, the
narrowed `check:provenance`, and the corpus as a qualitative exemplar set together cost roughly what
one program's tooling costs, and they close the three holes the front door fell through. Kubernetes
runs a page-type registry at a hundred times cairn's page count and would recognise most of this.

The parts that exceed the field are the ones bought with attended time and mechanical clearing work,
and none of them is what failed. Gating cadence numbers at error exceeds every surveyed program and
contradicts the spec's own goals section. Eleven page types is four times the industry ratio for a
set this size. A per-page receipt file with a content-hash gate exists nowhere and creates a
maintenance tax proportional to every future edit. Forty owner sittings is a paid-staff practice
booked against an unpaid single owner, and the spec predicts its own stall. The
drafter-never-reads-the-old-page rule rests on one data point from a document type unlike the ones
it governs, and its acknowledged hole is closed by assertion.

Applying findings 1, 2, 4, 5, and 8 removes the clearing work in decision 3, five templates and
five to ten corpus entries from units 2 and 3, one script from decision 8a, and thirty one of the
forty sittings, while leaving every control that addresses the recorded failure intact. Adding
findings 9, 10, and 11 closes the three places cairn is lighter than the field, for roughly a config
file, a CI job, and a scheduled routine.

The reduced shape lands cairn heavier than Cloudflare, Astro, and SvelteKit, about level with GitLab
and GitHub Docs on mechanical gates, lighter than Microsoft on prose gating, and comparable to
Kubernetes on structure. For a docs set that four production sites depend on and that is drafted
mostly by agents, that is the right place to sit.

## Sources

- [GitLab, Documentation testing](https://docs.gitlab.com/development/documentation/testing/)
- [GitLab, Vale](https://docs.gitlab.com/development/documentation/testing/vale/)
- [GitLab, documentation style guide word list](https://docs.gitlab.com/development/documentation/styleguide/word_list/)
- [Kubernetes, Reviewing pull requests](https://kubernetes.io/docs/contribute/review/reviewing-prs/)
- [Kubernetes, Page content types](https://kubernetes.io/docs/contribute/style/page-content-types/)
- [Kubernetes, Content guide](https://kubernetes.io/docs/contribute/style/content-guide/)
- [Vale at Red Hat, reference guide](https://redhat-documentation.github.io/vale-at-red-hat/reference-guide.html)
- [vale-at-red-hat repository](https://github.com/redhat-documentation/vale-at-red-hat)
- [MicrosoftDocs/microsoft-365-docs, .acrolinx-config.edn](https://github.com/MicrosoftDocs/microsoft-365-docs/blob/public/.acrolinx-config.edn)
- [Acrolinx, The Acrolinx Score explained](https://support.markup.ai/hc/en-us/articles/10210995244178-The-Acrolinx-Score-Explained)
- [Microsoft Learn, Contributor guide](https://learn.microsoft.com/en-us/contribute/)
- [GitHub Docs, Using the content linter](https://docs.github.com/en/contributing/collaborating-on-github-docs/using-the-content-linter)
- [Cloudflare Style Guide, Content reviews](https://developers.cloudflare.com/style-guide/how-we-docs/reviews/)
- [Cloudflare, Working in public: our docs-as-code approach](https://blog.cloudflare.com/our-docs-as-code-approach/)
- [Astro Docs Docs, Writing and style guide](https://contribute.docs.astro.build/guides/writing-style/)
- [Astro Docs Docs, Tips for maintainers](https://contribute.docs.astro.build/roles/maintainers/)
- [sveltejs/kit, CONTRIBUTING.md](https://github.com/sveltejs/kit/blob/main/CONTRIBUTING.md)
- [Django documentation](https://docs.djangoproject.com/en/6.1/)
- [Diátaxis](https://diataxis.fr/)
- [DigitalOcean, Technical writing guidelines](https://www.digitalocean.com/community/tutorials/digitalocean-s-technical-writing-guidelines)
- [DigitalOcean, Write for DOnations](https://www.digitalocean.com/community/pages/write-for-digitalocean)
- [errata-ai/Google Vale package](https://github.com/errata-ai/Google)
- [Twilio, A new era for Twilio's documentation](https://www.twilio.com/en-us/blog/developers/new-era-for-twilio-documentation)
