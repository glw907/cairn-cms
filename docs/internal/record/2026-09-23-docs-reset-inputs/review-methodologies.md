# Review: the docs-reset design against published agent-docs methodologies

Reviewer: Opus 5.5, adversarial and read-only, 2026-09-23. Under review:
`docs/superpowers/specs/2026-09-23-docs-reset-design.md`. The two research inputs already cover
persona limits, judge recall, Vercel, Stripe, Mintlify's llms.txt benchmark, Petrenko, and the
Opus 5.5 quirks, so this review does not restate them. **[Inference]** marks my own reasoning.

## Methodology comparison

| Method | What it does | Agrees | Diverges | Verdict |
|---|---|---|---|---|
| Anthropic skill authoring, eval-driven development ([best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) | Run Claude on real tasks with no skill, record the failures, build three evals from them, then write "minimal instructions" and iterate with Claude A and Claude B | Fresh reader agents; exemplars; always-loaded context | The spec builds seven components before any real page or job exists, and validates readers on planted defects, not observed failures | Defect (F1) |
| Anthropic `skill-creator` eval loop ([SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)) | Two or three test cases, a with/without baseline, assertion grading, a benchmark reporting mean ± SD, a blind comparator agent, a human review viewer, and iteration until feedback empties | A/B arms; deterministic checks | The spec specifies no variance reporting and no blind comparison, and it builds its own harness | Defect (F3, F5) |
| Anthropic `doc-coauthoring` ([SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/doc-coauthoring/SKILL.md)) | Context dump, then section-by-section drafting with the human curating each section, then Reader Testing: a fresh Claude answers 5 to 10 predicted questions and names its assumptions | The reader test and "assumed knowledge" are the same idea as the spec's reader shape | The human is in every section; the spec has no human read of any page | Defensible for pass 1. A gap for editors and evaluators (F6) |
| Anthropic "Demystifying evals" ([post](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)) and "A statistical approach to model evals" ([post](https://www.anthropic.com/research/statistical-approach-to-model-evals)) | Start with "20-50 simple tasks drawn from real failures", run several trials each, report SEM, use paired and clustered comparisons, read transcripts | Graded outcomes; transcript-shaped reader reports | The trial has 3 clusters and 2 drafts per cell, and its decision rule ignores variance | Defect (F2) |
| Diátaxis ([how to use](https://diataxis.fr/how-to-use-diataxis/)) | "Discourages planning and top-down workflows, preferring instead small, responsive iterations"; says not to create empty structures | Page types; one page, one job | Pass 2 produces a complete top-down outline of page contracts before a single page is drafted | Partly defensible (F4) |
| Google, "Using LLMs in technical writing" ([course](https://developers.google.com/tech-writing/two/llms)) | The LLM drafts; a human checks each response and perfects good-but-imperfect drafts; warns that an LLM "assumes that information in attachments is factual" | Facts-bullet IDs and the fact read | No human editing pass | Minor (F6) |
| Mintlify Workflows ([docs](https://www.mintlify.com/docs/agent/workflows); [blog](https://www.mintlify.com/blog/workflows)) | Agent runs triggered by a code merge, a schedule, or a webhook read the diff and open a docs PR; a weekly audit catches stale examples | The facts container as the source of truth | The spec has no drift mechanism after the reset | Defect (F7) |
| Cloudflare docs ([AI consumability](https://developers.cloudflare.com/style-guide/how-we-docs/ai-consumability/); [reviews](https://developers.cloudflare.com/style-guide/how-we-docs/reviews/); [how we AI](https://developers.cloudflare.com/style-guide/how-we-docs/how-we-ai/)) | Prompts built from content types and templates; humans review and publish; CI checks links; llms.txt and a Markdown delivery; "the primary answer ... in the main content flow" | Page types and templates; lead with the answer | Agent delivery format (llms.txt, `.md` routes on cairn.pub) is absent from the outline artifacts | Minor (F9) |
| Doc Detective ([docs](https://docs.doc-detective.com/); [agent-tools](https://github.com/doc-detective/agent-tools)) | Tests "CLI commands, API calls, and UI actions directly from your documentation" in Markdown, and ships Claude Code skills that write the tests | Docs-as-tests as the base layer | The spec grows a bespoke harness from `check:snippets` and `check:transcripts` and never evaluates Doc Detective | Needs a decision (F5) |
| Every, compound engineering ([guide](https://every.to/guides/compound-engineering)) | Plan and review take "80 percent" of the effort; every cycle ends with a compound step that feeds its lessons back into the system; "first attempts have a 95 percent garbage rate" | Heavy planning; the system improves itself | The spec has no compound step between drafting passes | Minor (F8) |
| Gao and Chen, agent documentation behavior ([arXiv 2608.20195](https://arxiv.org/abs/2608.20195)) | 557 sessions: instruction files and working notes make up 60.5% of agents' documentation interactions, classical docs 10.6%, API references 1.3%; reading a doc went with *less* immediate testing | Agent routing table | Ruling 4 spreads agent-readiness across every page and weights no entry point more than another | Major (F4b) |
| ReadMe, Fern, GitBook ([GitBook comparison](https://www.gitbook.com/blog/best-ai-documentation-tools); [Fern](https://buildwithfern.com/post/api-documentation-platforms-git-integration)) | Drift detection against the source, plus analytics on which agents and queries reach each page | Nothing | The spec has no production measure | Minor (F9) |

## Ranked findings

### F1 (critical): Pass 1 builds a writing system before any real failure exists

**Evidence.** Anthropic's own sequence starts from failures: "Run Claude on representative tasks
without a Skill. Document specific failures," then "Write minimal instructions." It says this
"ensures you're solving actual problems rather than anticipating requirements that may never
materialize" ([best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)).
`skill-creator` starts with two or three test cases and says "Remove things that aren't pulling
their weight." Pass 1 builds seven components: four reader classes, a drafter with a profile
scaffold, a revised chain, stable fact IDs, a docs-as-tests harness, and planted-defect
validation. None of them is exercised on a real cairn job until pass 2. Planted defects (a
removed step, a wrong flag) are the easy class. Pass A's 15 defects were subtler: wrapper and
parser gaps that only a real task surfaced.

**Proposed change.** Reorder pass 1 around a thin vertical slice. Take one real job per reader
class from the facts container, for example `schedule-a-check`, and draft it with the current
chain. Run a real reader and record its failures. Then build only the components those failures
justify. Keep planted defects as a regression floor added after the real-failure set exists.
Components that no failure demands, most likely the full-repository reader class and the Opus
`medium` arm, wait until one does.

### F2 (major): The calibration trial cannot distinguish its arms, and its rule decides in advance

**Evidence.** Each page gets two drafts per arm, read by two models, across three pages. That is
three clusters. Anthropic warns that clustered standard errors "can be over three times as large
as naive" and recommends paired comparisons and power analysis
([statistical approach](https://www.anthropic.com/research/statistical-approach-to-model-evals)).
Its eval guidance starts at "20-50 simple tasks"
([demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
The rule "O beats P or ties it, so operational contracts win" gives every tie to O. **[Inference]**
At n = 2 per cell almost every result is a tie, so the trial will return O whatever the drafts
say. That spends about 5M tokens, 36% of pass 2, to confirm a conclusion the research reports
already reach.

**Proposed change.** Pick one of two honest designs. (a) Call it a smoke test: one page, O only,
Sonnet and Opus readers, at about 1M tokens, run to catch surprises and not to adjudicate P
against O. (b) Make it a real test: pair P and O on the same 8 to 10 jobs, run at least three
reader trials per draft, report the mean difference with a clustered SE, and let a tie mean "no
evidence," not "O wins." Drop the Opus `medium` against `high` comparison, or pre-register it as
exploratory.

### F3 (major): The grader-replacement test has no reference set

**Evidence.** The rule "If the grader catches nothing the reader misses, the reader replaces it"
is measured on trial drafts whose true defect set nobody knows. Anthropic says model graders
"require calibration with human graders" and that you must "read the transcripts"
([demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
`skill-creator` adds a blind comparator for the same reason.

**Proposed change.** Run the grader and the reader over the pass 1 planted-defect pages and over
Pass A's 15 known defects, which already form a labeled set. Compare the two on recall and
precision, and have Geoff or a blind Fable comparator adjudicate every disagreement.

### F4 (major): The complete top-down outline runs against Diátaxis and against agents' real reading behavior

**Evidence.** (a) Diátaxis "discourages planning and top-down workflows"
([how to use](https://diataxis.fr/how-to-use-diataxis/)). Pass 2 ends in a full outline of page
contracts with six review lenses before any page is drafted. Part of that is defensible: the
pinned-anchor inventory and the retirement map must exist before pages move, because gates read
those paths. (b) In real sessions agents spent 60.5% of their documentation interactions on
instruction files and 10.6% on classical docs ([Gao and Chen](https://arxiv.org/abs/2608.20195)).
Vercel's compressed index in AGENTS.md beat skills (already in the inputs). **[Inference]**
Ruling 4 makes every page agent-actionable. That spreads effort over pages agents seldom open,
while the entry points get only a routing row.

**Proposed change.** Keep the anchor inventory, the retirement map, and the fact-ownership map as
whole-corpus artifacts. Scope full page contracts to the first drafting pass's pages, and give
the rest one-line slots that are refined as passes reach them. Promote the agent entry points
(scaffolded `CLAUDE.md`, the skills, `cairn help agents`) to first-class outline items, each with
its own reader job and done signal, ahead of per-page agent halves.

### F5 (major): Existing tools could replace two bespoke components

**Evidence.** Doc Detective executes CLI, API, and UI steps from Markdown and ships Claude Code
skills that write the tests ([docs](https://docs.doc-detective.com/);
[agent-tools](https://github.com/doc-detective/agent-tools)). `skill-creator` already provides the
with/without runs, assertion grading, mean ± SD benchmarks, the blind comparator, and a review
viewer that the trial would otherwise rebuild. Local precedent favors the convention: "take
convention where it exists."

**Proposed change.** Add a pass 1 decision task: a short spike that runs Doc Detective against
two cairn procedures, one CLI and one admin UI, next to the `check:snippets` and
`check:transcripts` growth path. Record the choice with its reason. Build the trial on
`skill-creator`'s eval layout, or record why that layout does not fit.

### F6 (major): Editors and evaluators get no human read in the schedule

**Evidence.** The spec concedes that human reads are "the gold standard" for editors and
evaluators, and the inputs show simulators are too cooperative. Google has a human perfect every
draft ([course](https://developers.google.com/tech-writing/two/llms)). `doc-coauthoring` keeps a
human in each section. The audience review checks profiles against "the club sites' real
editors," but only on paper.

**Proposed change.** Add one real-human job test per human-only audience to pass 2's audience
review: a club editor attempts one editor job from a scratch page, and Geoff or an outside
reader attempts one evaluator job. Record where each stalled. Use the result to calibrate the
agent reader's "assumed terms" floor for those two audiences.

### F7 (major): Nothing keeps the reset from drifting afterward

**Evidence.** Every platform method includes continuous maintenance. Mintlify triggers on code
merges and runs weekly audits ([workflows](https://www.mintlify.com/docs/agent/workflows)), and
Fern and GitBook detect drift against the source
([Fern](https://buildwithfern.com/post/api-documentation-platforms-git-integration)). The jobs
ledger "doubles as the docs' acceptance suite," but the spec never says it runs again after the
drafting passes. Anthropic separates regression evals, which should sit near 100%, from
capability evals ([demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Proposed change.** Add an outline-level artifact: the regression plan. Deterministic done
signals run in CI as a `check:*` gate. Reader jobs rerun on a schedule, or when a facts bullet
their page cites changes, flagged by the bullet ID.

### F8 (minor): There is no compound step and no kill criterion

**Evidence.** Compound engineering ends every cycle by feeding its lessons back into the system
([guide](https://every.to/guides/compound-engineering)). The spec has no step that folds each
drafting pass's reader failures back into the profiles and the chain, and no rule for when the
writing system itself counts as failed.

**Proposed change.** Give every drafting pass a close step that files its reader stalls against
the profile or the chain. State a stop rule, for example: the system fails if reader-clean pages
still draw more than N defects in a human read.

### F9 (minor): No production measure, and no agent delivery format

**Evidence.** Mintlify reports that agents make up 66% of measured traffic on its docs sites
([blog](https://www.mintlify.com/blog/agents-launch)), and ReadMe ships per-agent analytics
([GitBook comparison](https://www.gitbook.com/blog/best-ai-documentation-tools)). Cloudflare
serves llms.txt and per-page Markdown
([AI consumability](https://developers.cloudflare.com/style-guide/how-we-docs/ai-consumability/)).
The spec names no success measure for published pages, and its outline artifacts leave out how
agents fetch the docs (the tarball path, or cairn.pub).

**Proposed change.** Add both to the outline artifacts: how agents fetch the docs, and one
production signal (cairn.pub request logs by user agent, or issues tagged as doc gaps).

### F10 (minor): The spend is front-loaded well beyond any published practice

**Evidence.** Pass A cost about 900K tokens a page. The design phase costs 17M. **[Inference]**
That is about 19 drafted pages before any page ships. No published method front-loads this far.
Compound engineering's 80% is effort per feature, not a whole-corpus plan. Ruling 7 grants the
spend, so this is defensible as an owner choice. F1 and F2 would still recover most of the 5M
trial budget and part of pass 1.

**Proposed change.** Keep the ceilings, and add a checkpoint after the F1 vertical slice: if one
real page clears its reader, cut the trial to option (a) of F2.

### Considered and not a defect

The three owner stops suit a solo owner. `doc-coauthoring` asks far more of its human. The real
attended cost is reading volume, so each stop should lead with a one-page decision brief. The
ceiling-class readers do what the persona research supports: they bound project-specific
knowledge structurally. **[Inference]** They cannot remove general knowledge of SvelteKit or
Cloudflare, so a "non-coder operator" reader stays a coder. The spec already treats those
readers' reports as a floor, which is the right weight.
