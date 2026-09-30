# Keeping developer docs in sync with code: prior art for cairn

Research date 2026-09-30. Question: which published, proven methods keep developer documentation
in sync with code over time, catching **drift** (a doc claim the code stopped honoring) and
**omission** (new or changed behavior that never reached the docs)? How do they map onto
cairn's four candidate mechanisms?

1. every changelog entry cites the fact ids it creates or changes, gated;
2. a per-fact hash of the cited symbol's source, so a code change marks the fact stale until re-verified;
3. a configuration-surface coverage gate generated from the TypeScript types;
4. a windowed gap sweep before each release.

Scope addition (Geoff, 2026-09-30): cairn's docs are written and maintained by agents
(page-inputs, drafter, fact read, register editor) and reviewed by humans. The survey therefore
also covers agent-first practice, and every method is marked for whether its assumptions
**hold**, **strengthen**, or **break** when agents run it.

Every claim was checked against its cited URL on the research date unless marked otherwise.
The OpenAI harness-engineering post returned 403 to direct fetch, so its quotes were read
through a verbatim mirror.

## What the research says the problem is

- **Omission and drift are the top defects.** Aghajani et al. built a 162-type taxonomy from 878
  artifacts, with outdated and incomplete information among the most common
  (ICSE 2019, https://2019.icse-conferences.org/details/icse-2019-Technical-Papers/49/Software-Documentation-Issues-Unveiled).
  Uddin and Robillard surveyed 323 developers, who ranked ambiguity, **incompleteness**, and
  **incorrectness** the severest API-doc failures
  (IEEE Software 2015, https://www.cs.mcgill.ca/~martin/papers/ieeesw2015.pdf).
- **Drift has a measured cost.** Wen et al. studied 1.3 billion AST-level changes across 1,500
  systems. Code changes that left comments inconsistent were about 1.5 times more likely to be
  bug-introducing
  (ICPC 2019, https://conf.researchr.org/details/icpc-2019/icpc-2019-Technical-Research/23/A-Large-Scale-Empirical-Study-on-Code-Comment-Inconsistencies).
- **Name-resolution checks catch only deletion.** Tan, Wagner, and Treude scanned over 3,000
  GitHub projects. Most had, at some point in their history, a code-element reference that
  outlived every instance of that element in the code (EMSE 2023,
  https://arxiv.org/abs/2212.01479). ReCite (2026) found 869 stale function references in
  Linux kernel comments; maintainers accepted 50 of 75 patches
  (https://arxiv.org/abs/2608.03734). Neither method sees a reference that still resolves while
  the behavior behind it changed. That is exactly the class cairn's sweep found: a fact whose
  `Source:` line still resolved while its claim had gone stale.
- **Docs without owners and a review mechanism die.** At Google, around 90% of wiki documents
  had no views or updates in the previous few months. Moving docs into source (g3doc), with
  owners and freshness dates, improved them. Google says same-change code+doc updates are "a
  practice for which we're still trying to improve adoption"
  (Software Engineering at Google, ch. 10, https://abseil.io/resources/swe-book/html/ch10.html).

## Agent-first practice and evidence

**Published practice from the model vendors.**

- **OpenAI, "Harness engineering"** (Codex team, three engineers, roughly 1,500 merged PRs,
  about a million lines; https://openai.com/index/harness-engineering/, read via the mirror
  https://jaytaylor.com/notes/node/1770842156000.html):
  - `AGENTS.md` is a ~100-line "table of contents", and a structured `docs/` directory is the
    system of record.
  - "Dedicated linters and CI jobs validate that the knowledge base is up to date, cross-linked,
    and structured correctly."
  - "A doc-gardening agent scans for stale or obsolete documentation that does not reflect the
    real code behavior and opens fix-up pull requests."

  This is the closest published analog to cairn's setup: mechanical gates plus a recurring
  agent sweep. It is a single-team report, not a measured study.
- **Anthropic, Claude Code best practices**
  (https://code.claude.com/docs/en/best-practices):
  - "Give Claude a check it can run", and use a verification subagent so "the agent doing the
    work isn't the one grading it".
  - Hooks are "deterministic and guarantee the action happens", unlike advisory CLAUDE.md
    instructions.
  - It warns that a gap-finding reviewer "will usually report some, even when the work is sound"
    and that "chasing every finding leads to over-engineering".

  **Anthropic, "Effective context engineering"**
  (https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) favors
  just-in-time retrieval by lightweight identifiers (paths, queries) over preloading. cairn's
  `Source:` pointers are exactly such identifiers.
- **AGENTS.md** was released by OpenAI in August 2025 and donated to the Linux Foundation's
  Agentic AI Foundation in December 2025. OpenAI and the Linux Foundation report adoption by
  60,000+ projects
  (https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation,
  https://openai.com/index/agentic-ai-foundation/). **llms.txt** (Jeremy Howard, September 2024,
  https://llmstxt.org) spread when Mintlify enabled it for every hosted docs site. Both are
  *delivery* conventions for agents that read docs, not sync mechanisms. llms.txt has no
  governance body and no measured-effect study
  (https://www.mintlify.com/blog/what-is-llms-txt). Neither addresses cairn's problem. cairn's
  facts container already plays the "system of record" role OpenAI describes.

**Evidence on agent context files.**

- *Agent READMEs* studied 2,303 context files from 1,925 repos. The files "evolve like
  configuration code through frequent, small additions", which is the append-only rot cairn's
  STATUS rules guard against (TOSEM, https://arxiv.org/abs/2511.12884).
- *Evaluating AGENTS.md* (ETH, 2026) found that context files, whether LLM-generated or written
  by developers, "do not generally improve task success rates" and add over 20% inference cost.
  Agents did follow their *instructions* well, while descriptive repository overviews did not
  help (https://arxiv.org/abs/2602.11988).
- *From Agent Behaviour to Agent-Friendly Documentation* (2026) found agents' doc interactions
  are 60.5% instruction files and working notes versus 10.6% classical technical docs. It also
  found a near-zero adjacent link from reading docs to editing code
  (https://arxiv.org/abs/2608.20195).
- Implication for cairn: an agent is steered by *instructions and checks*, not by descriptive
  prose it was handed. Gates and dispatch-prompt rules are the lever, and background prose is
  not.

**Evidence on hallucination and grounding.**

- **Fabrication is frequent.** Spracklen et al. generated 2.23M code samples from 16 models;
  19.7% contained a hallucinated package, and 38% of those merged two real names (USENIX
  Security 2025 Distinguished Paper,
  https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen). Conflation, where
  a plausible name is built from real parts, is the documentation analog of a
  plausible-but-wrong option path.
- **Grounding helps where the model is weakest and hurts when retrieval is bad.** Jain et al.
  (AWS) found GPT-4o valid on only 38.58% of low-frequency API invocations. Documentation-augmented
  generation raised that to 47.94%, but a sub-optimal retriever caused a 39.02% absolute drop on
  high-frequency APIs. Retrieving only when uncertain gave +8.2% overall
  (https://arxiv.org/abs/2407.09726). cairn's APIs are low-frequency by definition, since no
  model was trained on them, so grounding is mandatory. A **stale** grounding source actively
  misleads, which is the agent-era case for candidate 2.
- **Self-checks fail; independent checks work.** Huang et al.: without external feedback, LLMs
  "struggle to self-correct", and performance "even degrades after self-correction" (ICLR 2024,
  https://arxiv.org/abs/2310.01798). Chain-of-Verification's *factored* variant answers
  verification questions without conditioning on the draft, so the model cannot copy its own
  hallucination, and it reduces hallucination across tasks (ACL Findings 2024,
  https://arxiv.org/abs/2309.11495). This is the published basis for cairn's independent fact
  read.
- **Long contexts degrade.** Chroma tested 18 models: performance grows "increasingly
  unreliable as input length grows", even on simple tasks
  (https://www.trychroma.com/research/context-rot). A whole-codebase sweep in one context is the
  wrong shape; fan out per declaration or per page.
- **Agent sweeps work with a judge.** DocPrism reports precision 0.62 at a 15% flag rate
  (https://arxiv.org/abs/2511.00215). Cascade generates tests from docs and cross-checks them,
  reaching precision 0.88 (https://arxiv.org/abs/2604.19400). READU is a per-commit
  filter-then-judge pipeline: 75% precision at under $0.01 and under a minute per commit; of 66
  README bugs reported, maintainers confirmed 44 and fixed 26
  (https://arxiv.org/abs/2607.15780).
- **Postmortem: the Cursor support agent, April 2025.** With no authoritative source retrieved,
  the agent invented a one-device login policy, and users cancelled before staff retracted it
  (AI Incident Database #1039, https://incidentdatabase.ai/cite/1039/;
  https://www.theregister.com/special-features/2025/04/18/cursor-ai-support-bot-hallucinated-its-own-company-policy/1015579).
  The failure mode is "no fact found → plausible fill". cairn's `check:provenance` (every
  sentence cites a fact) is the structural defense.

**Vendor tooling.** Mintlify Workflows reads merged diffs or runs on cron, drafts doc updates,
and opens a PR for human review (https://www.mintlify.com/blog/autopilot,
https://www.mintlify.com/library/how-to-stop-documentation-drift). Swimm's Auto-sync is covered
in the table. I found no published measurement of either product's effect. I also found no
published Google account of LLM-assisted doc sync and no GitHub Copilot docs-sync feature with
evidence; GitHub Next's "Copilot for Docs" preview was not verified as current. These are
recorded as absent, not assumed.

## Methods table

Key: **D** = drift, **O** = omission. "Runs at": authoring (editor or agent step), CI (per
change), release. "Under agents": whether the method's assumptions **hold**, **strengthen**, or
**break** when agents write and maintain the docs.

| Method | Catches | Runs at | Evidence of use / effect | Cost | Under agents | cairn mapping |
|---|---|---|---|---|---|---|
| **Executable examples**: Rust doctests (https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html), Python `doctest` / `sphinx.ext.doctest` (https://docs.python.org/3/library/doctest.html), Go `Example` with `// Output:` (https://go.dev/blog/examples) | D (behavior an example exercises) | CI | Toolchain default in Rust and Go. Go: executable docs "guarantee that the information will not go out of date as the API changes" | Low per example | **Strengthens.** It is external feedback (Huang), and agents write tests cheaply (Cascade). | `check:snippets` typechecks but does not execute or assert output. Missing: behavior facts (defaults, errors) have no executable pin. **New candidate 5.** |
| **Typechecked doc code**: Twoslash (https://www.typescriptlang.org/dev/twoslash/); typescript-eslint typechecks every `ts` fence in rule docs, validates example options against the rule schema, and snapshots ESLint's output (`packages/eslint-plugin/tests/docs.test.mts`) | D (signatures, option shapes) | CI | TS handbook, typescript-eslint | Low | **Strengthens.** It catches conflated names in snippets (Spracklen's class). | Present: `check:snippets`. Refinement: examples' config objects typed against the real config type, never widened to `any`. |
| **Undocumented-export lints**: rustdoc `missing_docs` + `#![deny]` (https://doc.rust-lang.org/rustdoc/lints.html), TypeDoc `validation.notDocumented` + `requiredToBeDocumented` + `treatValidationWarningsAsErrors` (https://typedoc.org/documents/Options.Validation.html), API Extractor `ae-undocumented`, `sphinx.ext.coverage` (report only; https://www.sphinx-doc.org/en/master/usage/extensions/coverage.html) | O (symbol granularity) | CI | Ubiquitous. TypeDoc's `requiredToBeDocumented` includes `Property`, so members count | Very low | **Holds.** It is deterministic, so the author does not matter. | Present at export level: `check:reference`, `jsdoc/require-jsdoc`. Confirms candidate 3's shape one level down. |
| **Per-option coverage from a schema**: typescript-eslint's docs test fails when an options-schema property has no `` `option` `` heading under `## Options`, or that heading has no Correct/Incorrect example (`docs.test.mts` ~l.305–360, read via `gh api` 2026-09-30). A separate test requires a `description` on every schema property (https://github.com/typescript-eslint/typescript-eslint/pull/9896). Generalized by eslint-doc-generator (https://github.com/marcalexiei/eslint-doc-generator) | O (config options, the class cairn missed) | CI | A widely used TS project with hundreds of rules | Low, plus a named allowlist (`rulesWithComplexOptionHeadings`) | **Strengthens.** Agents map every path without fatigue, and the gate stops them from inventing a path. | **Confirms candidate 3** almost exactly. |
| **Generate-then-diff reference**: Terraform `tfplugindocs`; HashiCorp's scaffold CI runs `make generate` then `git diff --exit-code` (https://github.com/hashicorp/terraform-provider-scaffolding-framework, https://github.com/hashicorp/terraform-plugin-docs). Stripe's reference comes from its OpenAPI spec (https://github.com/stripe/openapi) and is built with Markdoc, whose build-time validation fails on broken structure (https://stripe.dev/blog/markdoc). ReadMe `rdme` (https://docs.readme.com/main/docs/rdme) | O and D, for the generated slice | CI | Terraform providers, Stripe | Low, but covers only what the schema expresses | **Strengthens.** Generated inventory is fabrication-proof input, the ideal just-in-time identifier list. | Refines candidate 3. Generate an option *inventory* for page-inputs to consume, not prose; cairn's provenance model keeps prose fact-cited. |
| **Public-surface golden file**: API Extractor `.api.md` tracked so "changes to an API signature will appear as diffs", plus CODEOWNERS on API change (https://api-extractor.com/pages/setup/configure_api_report/); Go `api/*.txt` (https://github.com/golang/go/tree/master/api) | D (signature level), and a disclosure moment | CI | rushstack and Microsoft TS packages; Go stdlib | Low | **Holds**, with one agent risk: an agent runs `--update` reflexively. The human diff read is the safeguard. | **Present**: `check:surface` (`docs/internal/api-surface.md`), `check:reference:signatures`. It sees shapes, not bodies, which is the gap candidate 2 fills. |
| **Surface change → release-note linkage**: Go requires each `api/next/*.txt` line to have a `doc/next/*-stdlib/*-minor/` fragment named by proposal number; `relnote`'s `CheckAPIFile` verifies it exists with content, enforced by a cmd/relnote test (https://pkg.go.dev/golang.org/x/build/relnote, https://go.dev/doc/next) | O (API change without a note) | CI | Go stdlib | Low | **Holds.** It is mechanical and keyed by a stable id. | **Refines candidate 1.** Trigger from the surface diff, not "every entry cites ids". |
| **Fragment-per-change changelogs**: changesets bot (https://github.com/changesets/bot), towncrier `check` (Twisted, pytest, pip, attrs; https://towncrier.readthedocs.io/en/stable/), CPython `Misc/NEWS.d` (https://devguide.python.org/core-team/committing/index.html) | O (change level, not doc level) | CI | Very wide | Low | **Holds.** | Adjacent to candidate 1; cairn's `Consumers must:` rule already covers it. |
| **Version annotations on the doc**: CPython `versionadded`/`versionchanged`, where the what-changed argument is mandatory (https://devguide.python.org/documentation/markup/); Django requires docs, the annotations, and a release note for any feature or behavior change (https://docs.djangoproject.com/en/dev/internals/contributing/writing-code/submitting-patches/); GitLab "introduced in" lines (https://docs.gitlab.com/development/documentation/workflow/) | O | Review checklist | CPython, Django, GitLab | Low per change, but human-enforced | **Breaks as a checklist** (agents follow gates, not ritual; ETH), **holds as a gate**. | The conventional practice behind candidate 1. The change marker sits on the doc item, as cairn's would sit on the fact. |
| **Docs as a merge or release precondition**: Rust stabilization needs a lang-docs-approved Reference PR before merge (https://rustc-dev-guide.rust-lang.org/stabilization-guide.html); Kubernetes needs a docs placeholder PR by the release deadline or "the feature may be removed from the milestone" (https://kubernetes.io/docs/contribute/new-content/new-features/); GitLab definition of done plus a `docs-missing` label | O | Merge / release | All three | Process cost | **Strengthens.** An agent can draft the doc in the same change at near-zero marginal cost, which removes the excuse that made GitLab relax it. | Confirms cairn's "not done until its reference page matches". Kubernetes' release deadline is the conventional shape of candidate 4. |
| **Code-coupled docs with drift detection**: Swimm Auto-sync runs on every PR, updates trivial changes itself, and flags significant ones. It weighs line markers, tokens, change size, and file history (https://swimm.io/blog/how-does-swimm-s-auto-sync-feature-work) | D | CI | Commercial; vendor claims only | Medium: heuristics, because a naive hash flags too much | **Strengthens:** agents re-verify a flagged fact cheaply. **Breaks if** the flagged agent may re-bless the hash itself (self-correction without external feedback, Huang). | **Confirms candidate 2**, normalized, with the bump reserved to an independent reader. |
| **Reference-resolution checks**: rustdoc `broken_intra_doc_links`, TypeDoc `invalidLink`, Sphinx `nitpicky` (https://www.sphinx-doc.org/en/master/usage/configuration.html#confval-nitpicky), Tan et al., ReCite | D (deleted or renamed ids only) | CI | Default-on in rustdoc | Very low | **Strengthens.** It is the direct defense against conflated or fabricated identifiers (Spracklen). | Partial: `check:facts` resolves `Source:`, `check:symbols` covers CLI flags in shell fences. **Missing**: every backticked identifier in page prose and fact claims. |
| **Docs as tests (product level)**: Doc Detective runs markdown procedures against UI, CLI, and API (https://docs.doc-detective.com/) | D (procedures) | CI | Tech-writer community; no measured-effect study | Medium to high (brittle UI) | **Holds.** Agents can author the steps, but brittleness is unchanged. | Later, for admin and editors procedures; `check:transcripts` is the lighter cousin. |
| **Agent drift sweeps**: OpenAI's doc-gardening agent; Mintlify Workflows; READU, DocPrism, Cascade | D and O | Per merge, cron, or release | OpenAI team report; research precision 0.62–0.88; READU confirmed and fixed real bugs | Tokens per run; needs a judge | **Native to agents.** Cost per commit is cents (READU); whole-context runs rot (Chroma). | **Confirms candidate 4.** Diff-windowed, fanned out per declaration, with an independent judge. |
| **Independent verification**: factored Chain-of-Verification; writer/reviewer split (Anthropic); CODEOWNERS on API reports | D (fabrication at authoring) | Authoring | CoVe measured; Anthropic guidance | One extra agent call per claim batch | **Strengthens** and is required, since self-correction fails (Huang). | **Present**: the fact read is independent of page-inputs and the drafter. Keep it factored: the reader sees the claim and the source, never the draft's reasoning. |
| **Freshness metadata and owners**: Google freshness dates and owners; Write the Docs docs-as-code (https://www.writethedocs.org/guide/docs-as-code/) | D (by time) | Scheduled | Google internal | Low | **Weakens.** Agents have no tacit awareness of age; a code-keyed trigger replaces time. | Use only for `[external]` vendor facts that have no code to hash. |
| **Agent context files**: AGENTS.md, CLAUDE.md, llms.txt | Neither (delivery) | — | 60k+ repos; ETH: no success gain, +20% cost | Low to write, high to keep lean | **Breaks as a sync mechanism.** It rots like config and helps only as instructions. | Keep CLAUDE.md and briefs as instructions plus pointers; never a place for facts. |
| **Prose linting**: Vale (https://vale.sh/docs/); Diátaxis (https://diataxis.fr/) | Neither (style, structure) | Authoring / CI | Wide | Low | **Holds.** | Present. It does not count as sync coverage. |

## Conventional practice for each cairn candidate

**Candidate 1: changelog cites fact ids.**
- **Conventional form.** The closest analog is Go's `api/next` ↔ `doc/next` check: keyed by a
  stable id, triggered by the machine-readable surface diff. Django's and CPython's
  `versionchanged` plus release-note rule is the reviewer-enforced form. Neither asks *every*
  entry to carry doc ids.
- **Verdict: refine.** Trigger from the change (a `check:surface` diff, or a stale-fact event
  from candidate 2) and require the `## Unreleased` entry to cite the affected fact ids. Exempt
  docs-only and internal entries, as changesets and CPython do.
- **Agent note.** Ritual rules decay under agents unless gated. Make this a check, not a
  checklist line.

**Candidate 2: per-fact source hash.**
- **Conventional form.** Swimm's snippet coupling, and API Extractor's golden report as the
  signature-level ancestor. cairn already has the golden report (`check:surface`). The hash adds
  what the report cannot see: **declaration bodies**, where defaults and error paths live.
- **Verdict: confirm, with Swimm's lesson.**
  - Hash a *normalized* AST of the cited declaration, with comments and whitespace stripped,
    using the compiler-API lookup `check:facts` already has for `path#Symbol`.
  - Store the hashes in a sidecar lockfile, not in the bullet.
  - `path:line` sources (Svelte, `package.json`, `tool/`) hash the cited range and accept more
    noise.
- **Agent note.** This is the mechanism agents need most: Jain et al. show stale or wrong
  grounding *hurts*, and an agent trusts a cited fact more than a human with tacit memory would.
  The hash bump must belong to the independent fact read, never to the agent that edited the
  code or drafted the page. That keeps it external feedback in Huang's sense, not a
  self-correction.

**Candidate 3: type-derived config-surface coverage.**
- **Conventional form.** typescript-eslint's docs test: every schema property gets its heading,
  with a named allowlist. TypeDoc `requiredToBeDocumented: [Property, …]` and Terraform's
  generate-then-diff come at it from the generation side.
- **Verdict: confirm, sourced from `api-surface.md`.**
  - Walk option-bearing types to member paths.
  - Require each path in a fact claim or reference entry.
  - Keep the allowlist with a reason per entry.
- **Defaults.** Types do not carry defaults. The conventional home is TSDoc `@defaultValue`,
  which API Extractor and TypeDoc render. Requiring it on optional members of public options
  types would make "default never documented" a source-level omission. This is contestable: it
  moves doc text into source comments, which `check:comments` already governs.
- **Agent note.** It strengthens under agents: exhaustive mapping is free for them, and a
  generated path list removes the conflation risk (Spracklen) from the one place it would do most
  harm.

**Candidate 4: windowed pre-release sweep.**
- **Conventional form.** Kubernetes' release docs deadline and Rust's docs-before-stabilization
  gate. OpenAI's recurring doc-gardening agent, READU, and Mintlify Workflows are the mechanized
  forms.
- **Verdict: confirm as a backstop.**
  - Window it by the git range since the last release tag.
  - Fan it out per changed declaration and scaffold file, one short context each (Chroma).
  - Add an independent judge before filing, since published precision tops out around
    0.75–0.88.
- **Yield as the metric.** The 140-gap sweep shows this catches what per-change gates missed.
  Its yield per release is the metric that shows whether 1–3 work.

## What prior art treats as standard that cairn lacks

1. **Executable pins for behavior claims** (doctest, Go examples, typescript-eslint output
   snapshots, Cascade).
   - `check:snippets` proves a snippet compiles, not that a stated default or error path holds.
   - Lean form: an optional `Test:` pointer on a behavior fact (default, error, limit) naming an
     existing test that asserts it, checked to resolve.
   - Under agents this is the strongest external feedback available, and agents can write the
     test when none exists.
2. **Resolution of every code element in prose** (rustdoc intra-doc links, Sphinx nitpicky).
   - Extend `check:symbols` to every backticked identifier in published pages and fact claims,
     resolved against the export surface, the CLI manifest, and candidate 3's member paths.
   - It is the cheapest deterministic defense against fabricated or conflated names.
3. **Schema-validated options in examples** (typescript-eslint). Confirm `check:snippets` types
   config objects against the real config types.

## Recommendation: the lean set, ranked

1. **Config-surface coverage gate (candidate 3) on `api-surface.md`.**
   - Highest-yield omission catcher for the sweep's main class, with the most direct prior art.
   - The enumerator already exists in `check-surface.mjs`.
2. **Per-fact normalized source hash (candidate 2).**
   - It is the only mechanism here that catches "Source resolves, claim stale", and the one
     agents most need.
   - The bump belongs only to the independent fact read.
3. **Code-element resolution in prose (new).** Deterministic, nearly free, and it removes the
   rename, delete, and fabrication class.
4. **Surface-triggered changelog linkage (candidate 1, on Go's model).** Build it after 2,
   since the stale-fact event is its trigger.
5. **`Test:` pointers on behavior facts (new, optional).** Add them wherever a test exists; do
   not mandate them.
6. **Windowed release sweep (candidate 4).** It is the backstop, fanned out with a judge. Its
   falling yield is the success metric for 1–5.

### What agents make cheap that humans never could afford

- **Re-verifying every fact against its source every release.** It is a fan-out of short
  contexts, not a person-week. The hash gate narrows it to changed declarations, and a full
  re-verify becomes an occasional audit rather than a heroic one.
- **Per-commit or per-merge drift sweeps.** READU runs at under $0.01 per commit, and OpenAI
  runs a recurring doc-gardening agent. Humans only ever managed release-time reviews.
- **Exhaustive surface mapping.** Every option path mapped to a fact or an exclusion at
  page-inputs. typescript-eslint needed a test to force this on humans; for an agent it is the
  natural input shape.
- **Writing the executable pin.** An agent can turn a behavior fact into a test (Cascade's
  method), where a human writer would skip it.
- **Same-change docs.** Drafting the doc in the code change costs an agent little, so the Rust
  and Kubernetes precondition can be strict where GitLab had to relax it.

### Which human-era safeguards matter more with agents

- **Independent verification over self-review.** Self-correction degrades (Huang); factored
  verification works (CoVe). The fact read's independence from page-inputs and the drafter is
  load-bearing. So is the rule that only it bumps hashes.
- **Deterministic gates over instructions.** Agents follow instructions but gain nothing from
  descriptive context (ETH), and hooks guarantee what CLAUDE.md only advises (Anthropic). Every
  rule in this set should be a gate, not a brief paragraph.
- **A single system of record, with "no fact, no sentence".** The Cursor postmortem is the
  failure mode when retrieval returns nothing: plausible fill. `check:provenance` is the
  defense; keep it absolute.
- **Grounding freshness.** Stale grounding is worse than none on familiar APIs (Jain), so the
  hash gate matters more for agents than for humans.
- **Human review of the disclosure diff.** An agent will run `--update` on a golden file or a
  hash lockfile to turn a gate green. A human (or an independent agent) reads the `api-surface.md`
  and lockfile diffs; CODEOWNERS is the API Extractor precedent.
- **Short contexts.** Context rot (Chroma) argues for one declaration or one page per agent,
  never a whole-codebase pass in one window.
- **Restraint.** Anthropic warns that gap-finding reviewers over-report and drive
  over-engineering, and the two agent-first studies show context files rot like config. The
  lean set is six items for that reason. Allowlists stay named and small.

### Cheapest to build inside the page chain (while agents author)

- **Hash capture at the fact read.** The reader already opens each cited declaration, so writing
  its normalized hash then costs one call. It also makes the hash mean "an independent reader
  verified this against this code". A bootstrap script would claim a verification that never
  happened.
- **Option inventory at page-inputs.** Hand the step the generated member paths for its subpath.
  It maps each to a fact, files a new one, or records an exclusion. This is fabrication-proof
  input, and it follows the "front-load into infrastructure, hand agents one flat input" rule.
- **`Test:` pointer at filing.** When page-inputs files a behavior fact and a test already
  asserts it, the citation is free.

### Build as standalone gates (in `check:close`)

- The coverage gate (1). Omission happens in code changes that touch no doc, so it runs on every
  change.
- The staleness gate (2). A hash mismatch fails, and the stale fact ids are the worklist.
- Code-element resolution (3), extending `check:symbols`.
- Changelog linkage (4), reading the surface diff and the staleness output.
- The release sweep (6), as a `cairn-release` step outside `check:close`, fanned out with a
  judge.

### Risks the prior art names

- **Hash noise → rubber-stamping** (Swimm's reason for heuristics). Mitigate by normalizing and
  reserving the bump.
- **Allowlist creep.** Keep allowlists small and named, with a reason per entry (the
  `check:reference:signatures` ALLOWLIST pattern).
- **Same-change rules erode** (Google, GitLab). Gates hold where checklists slip, which is doubly
  true for agents.
- **Judge precision.** Sweep findings are candidates until the independent judge confirms them
  against source.
