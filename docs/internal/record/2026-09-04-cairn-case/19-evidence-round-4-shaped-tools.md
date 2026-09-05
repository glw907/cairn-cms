# The cairn case: evidence, round 4, real-world records on shaped frameworks

Research date: 2026-09-04 (GitHub API reads carry 2026-09-04 and 2026-09-05 UTC timestamps).
This round collects documented practitioner records, team case studies, framework-conditioned
studies, and the counter-record for agent-assisted development on frameworks of cairn's shape.
It does not repeat round 3 (`15-evidence-round-3-shape.md`). Round 3 already holds the Rails
Foundation first report (2026-08-13), Phoenix's `AGENTS.md` default, Ash `usage_rules`, Charm
and Crush, Cloudflare's `workers-oauth-provider`, Celso Pinto's Rails rebuild, Supabase and
Ghostty trailer floors, Watanabe et al., AgentPack, and the rule-compliance paper. Where this
round adds to one of those, it says so and gives only the delta.

Method note. The session's web search budget was exhausted after two queries. The rest of the
round used direct fetches of primary pages, the arXiv site search, the GitHub search and
contents APIs through `gh`, and the MITRE CVE API. Coverage is therefore deep on known sources
and shallow on discovery. Items that a search would probably have found but a fetch could not
reach are listed under "Found nothing" with that caveat.

Commit-trailer method, as in round 3. GitHub commit search for `Co-Authored-By: Claude`
counts only commits carrying that trailer. It is a floor for one agent, never a share of agent
work. Denominators here are commit-search totals for the same date window, so numerator and
denominator come from one index.

Citability scale, as in round 3. High: artifacts and method public (a repository, a published
transcript, a benchmark harness, a CVE record, a paper with sample and method). Medium:
numbers stated but self-reported or read from an abstract only. Low: testimonial, marketing,
or an undisclosed method.

---

## Verdict

**Can claim.** Named practitioners and teams ship production work on Django, Rails, and
Next.js with agents and leave public artifacts: Simon Willison's transcripts and dollar costs
(sqlite-utils, and the Django `guides` app on his blog), Sentry's Django monorepo carrying a
Claude trailer on 19% of its 2026 commits, Basecamp's Fizzy at 8%, and two framework vendors
running public agent benchmarks on their own frameworks (Rails `lemans`, Vercel
`next-evals-oss`) with per-run cost.

**Can claim, with the qualifier attached.** On both vendor benchmarks the agent that knows
the framework wins, and a documentation index raises weaker models to the top tier (Next.js:
Kimi K3 85% to 92%, GLM 5.2 81% to 92%). The qualifier: at the top tier the index adds nothing
(three models at 92% with and without it, Opus 5 down from 92% to 88%), and an independent
two-agent ablation on real repositories found no measurable correctness gain from context
files at all.

**Cannot claim.** That a convention-heavy framework is easier for an agent than a minimal one.
The one independent study that conditions on framework (Constraint Decay, 2026-05) finds the
opposite on greenfield backend tasks: Express 51%, Flask 49%, Django 25%, FastAPI 24%. Its
explanation is that implicit conventions the agent must infer cost it. That result argues for
cairn's skill, doctor, and audit (conventions written where the agent reads them and checked
by a machine) and against any bare "conventions help agents" sentence.

**Cannot claim.** Any measured record for Laravel or Phoenix. Both ship agent tooling (Boost;
`AGENTS.md` from `phx.new`, Tidewave). Neither publishes a measurement, and no independent
study in reach conditions on either.

**Must revise in the case.** Leg 5 says "no cited study measures greenfield construction
against a scaffold." Constraint Decay measures 80 greenfield generation tasks across eight
frameworks. The sentence should say that no cited study measures construction against a
scaffold that carries auth, sessions, and the admin frame, which remains true.

---

## Section 1: practitioner records with artifacts

### 1.1 Simon Willison, sqlite-utils 4.0rc2 (Python library, Django co-creator)

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| What shipped | sqlite-utils 4.0rc2, a release candidate fixing transaction handling | https://simonwillison.net/2026/Jul/5/sqlite-utils-fable/ | 2026-07-05 | High |
| Scope | "37 prompts, 34 commits and +1,321 -190 code changes over 30 separate files" | same | 2026-07-05 | High |
| Cost | $141.02 main session plus four sub-agents ($2.40, $2.39, $1.72, $1.40); total $149.25, measured with `uvx agentsview --include-children` | same | 2026-07-05 | High (method stated, tool named) |
| Human time | prompting from a phone during a parade; final review in the GitHub PR interface | same | 2026-07-05 | Medium (no hours stated) |
| Artifacts | shared Claude Code transcript linked from the post; repository `simonw/sqlite-utils` | same | 2026-07-05 | High |
| Failure recorded | a `Table.delete_where()` bug leaving the connection `in_transaction=True`, found in review; two more issues from a GPT-5.5 cross-model review | same | 2026-07-05 | High |

Sentence supported: "One maintainer's published ledger for a library release: 34 commits over
30 files, $149.25 in model cost, the transcript public, and a data-loss bug caught in review."

### 1.2 Simon Willison, the `guides` Django app on his blog

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| What shipped | `Guide`, `Chapter`, `ChapterChange` models, views, admin, migrations, then a refactor into a separate Django app | `simonw/simonwillisonblog` PRs #613, #622, #623, #624 | 2026-02-23 to 2026-02-25 | High |
| Artifacts | each PR body links a Claude Code session (`claude.ai/code/session_…`) | PR bodies, read 2026-09-04 | 2026-02 | High |
| Repository floor | 85 Claude-trailer commits of 1,042 | GitHub commit search | read 2026-09-04 | High (floor) |
| What the framework carried | ORM, migrations, admin registration, auth | Django | | High |

Sentence supported: "A Django feature, models through admin and migrations, built in three
days of pull requests, each carrying its agent session link."

Note. A secondary blog (hashitosystem.com) attributes the models and views to Claude Opus 4.6
run from an iPhone. This round did not find Willison's own post making that statement. The PRs
and session links are the primary record and are sufficient.

### 1.3 Simon Willison, tools.simonwillison.net colophon

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Corpus | 228 tools, July 2024 to September 2026; "This page lists the commit messages for each tool, many of which link to the LLM transcript used to produce the code." | https://tools.simonwillison.net/colophon | read 2026-09-04 | High |
| Coverage | most entries link a transcript (Claude sessions, gists, ChatGPT shares) | same | | High |

Sentence supported: "228 small tools with their build transcripts published is the largest
single public ledger of agent-built software by one developer." This is tooling, not a
framework app, so it supports the practice of publishing transcripts, not the shape.

### 1.4 Basecamp, Fizzy (Rails 8, open source)

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| What it is | "Kanban as it should be. Not as it has been."; O'Saasy license; repository public with full PR history | https://world.hey.com/dhh/fizzy-is-our-fun-modern-take-on-kanban-and-we-made-it-open-source-54ac41b6; `basecamp/fizzy` | 2025-12-03 | High |
| Trailer floor | 125 Claude-trailer commits of 10,167 total; first 2025-09-24 | GitHub commit search | read 2026-09-04 | High (floor) |
| 2026 share | 104 of 1,370 commits, 2026-01-01 to 2026-08-31 (7.6%) | GitHub commit search | read 2026-09-04 | High (floor) |
| Agent instructions | `AGENTS.md` (2,384 bytes) naming the invariants: URL-based multi-tenancy, UUIDv7 keys, sharded search, streaming for imports; "Attack your own diff before calling it done." | `basecamp/fizzy/AGENTS.md` | read 2026-09-04 | High |
| The maintainer's practice | DHH "barely writes any code by hand" (round 3, Pragmatic Engineer) | round 3 | 2026-04-08 | Medium |
| What DHH's launch post says about AI | nothing | launch post | 2025-12-03 | High (absence) |

Sentence supported: "Basecamp's open-source Rails product carries an agent trailer on 8% of
its 2026 commits and ships an `AGENTS.md` that names the app's invariants, not its style."

### 1.5 Records carried from round 3, not repeated

Celso Pinto's Rails rebuild (713 commits, 55 days, ~95% agent-authored, medium), Kenton Varda's
`workers-oauth-provider` (high), Mitchell Hashimoto's Ghostty method (medium). See round 3 A2,
A3, A7.

---

## Section 2: company and team records with numbers

### 2.1 Sentry (Django backend, React frontend): the commit ledger

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Repository | `getsentry/sentry`, 109,769 commits, 44,732 stars | GitHub API | read 2026-09-04 | High |
| Trailer floor, all time | 2,575 Claude-trailer commits; first 2025-07-01; 16 in 2025, 2,559 in 2026 | GitHub commit search | read 2026-09-04 | High (floor) |
| 2026 share | 2,525 of 13,170 commits, 2026-01-01 to 2026-08-31 (19.2%) | GitHub commit search | read 2026-09-04 | High (floor) |
| Monthly trailer counts | Jan 62, Mar 454, May 361, Jul 358, Aug 132 (of Jan 1,460, Mar 1,840, May 1,607, Jul 1,627, Aug 1,551 total) | GitHub commit search | read 2026-09-04 | High (floor) |
| Agent instructions | `AGENTS.md` (7,503 bytes): "AGENTS.md files are the source of truth for AI agent instructions"; a devserver log teed to `.artifacts/dev.log` because "Agents can't see the devserver terminal"; a `setup-dev` skill | `getsentry/sentry/AGENTS.md` | read 2026-09-04 | High |
| The team's account | David Cramer, "Building an Intern": Sentry's Slack agent "Junior", ~100,000 lines of TypeScript over four months, Claude Sonnet default, `vitest-evals` rubric tests because unit tests "proved inadequate"; no adoption or cost numbers for the Sentry codebase itself | https://cra.mr/building-an-intern | 2026-07-02 | Medium |

Sentence supported: "Sentry's Django monorepo carries a Claude co-author trailer on 2,525 of
its 13,170 commits in the first eight months of 2026, and its agent instructions name the
framework's blind spots (the devserver the agent cannot see) rather than its style."

Counter-note. The August drop (454 in March to 132 in August, with total commits flat) is
unexplained. It could be a trailer-policy change, a tool change, or a real decline. Cite the
window, not the trend.

### 2.2 Vercel: the Next.js agent evals (framework vendor, public harness)

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Harness | `vercel/next-evals-oss`, MIT; "hands a coding agent a small Next.js app and a prompt, lets it work in an isolated sandbox, then runs withheld assertions"; 44 agent tasks (agent-000 to agent-043); fixtures synced from `vercel/next.js@canary` | https://github.com/vercel/next-evals-oss | read 2026-09-04 | High |
| Scoring | pass@4; "Infrastructure failures are discarded and rerun, never counted." | https://nextjs.org/evals | last run 2026-08-31 | High |
| Top tier | GPT 5.6 Sol (Codex) 92%, $0.354 per eval; Claude Fable 5 (Claude Code) 92%, $2.16; Claude Opus 5 92%, $2.68 | same | 2026-08-31 | High |
| Cost method | "mean cost per eval, from provider-reported token counts (including cache) at public list prices … A relative guide, not a bill." | same | 2026-08-31 | High |
| The AGENTS.md column | with the bundled docs index: GPT 5.6 Sol 92 to 92, Fable 5 92 to 92, Opus 5 92 to 88, Kimi K3 85 to 92, GLM 5.2 81 to 92, Sonnet 5 81 to 92, Cursor Composer 2.5 81 to 88, MiniMax M3 77 to 88 | same | 2026-08-31 | High |
| The earlier vendor post | Next.js 16 hardened suite of APIs absent from training data (`'use cache'`, `cacheLife`, `proxy.ts`, async `cookies()`): baseline 53%, skills default 53%, skills with instructions 79%, `AGENTS.md` docs index 100% | https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals | 2026-01-27 | Medium (model, run count, and task count not stated) |

Sentence supported: "On the framework vendor's own 44-task Next.js benchmark, a bundled
documentation index lifts mid-tier models to the top tier and does nothing for the models
already there." Second sentence: "The vendor publishes cost per solved task, from $0.35 to
$2.68, alongside the pass rate."

### 2.3 Rails Foundation: the second and third reports, and the harness (delta to round 3)

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Harness open-sourced | `rails/lemans`, MIT; "Every task ships a hidden `verification_test.rb` the agent never sees"; graded surfaces (`test/`, `bin/`, `config/environments/test.rb`) restored before verification | https://rubyonrails.org/2026/8/24/agents-on-rails-lemans; https://github.com/rails/lemans | 2026-08-24 | High |
| Third report | 17 models on 21 atomic Writebook tasks, 3 attempts each (63 runs per model) | https://rubyonrails.org/2026/9/2/agents-on-rails-claude-fable-5-1-and-glm-5-3-flash | 2026-09-02 | High |
| Top results with cost | Claude Fable 5.1 92% (58 of 63), $75 total, 5.4 min median; Claude Opus 5 92%, $120, 9.7 min; Claude Fable 5 90%, $146; GLM 5.3 Flash 83% (52 of 63), $3.31 total, about $0.05 per run | same | 2026-09-02 | High |
| API recall | Fable 5.1 41%, above the earlier 8% to 35% range; of 63 runs: 26 recalled unprompted, 9 found in output, 20 passed over, 8 hand-rolled | same | 2026-09-02 | High |
| The convention statement | "A hand-rolled replacement may pass the checks, but it isn't the Rails way." | same | 2026-09-02 | High |
| Stated limits | "These results come from a relatively small number of runs"; "The atomic corpus is starting to run out of room, so we're preparing larger, more realistic tasks for Stage 2" | same | 2026-09-02 | High |

Sentence supported: "The Rails Foundation now publishes cost per model alongside accuracy: the
top model solved 92% of 63 runs for $75, and a $3 open-weight run solved 83%." The recall
figure supports: "Even the best model reached for the framework's own API in fewer than half
its runs."

### 2.4 Laravel: Boost exists, no measurement

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| What Boost ships | an MCP server (application info, schema, query, logs, browser logs, `record-rule`, `search-docs`), version-scoped AI guidelines for 20 packages, 13 agent skills, `.ai/rules` project rules with an `infer-conventions` skill, a hosted documentation API of "over 17,000 pieces of Laravel-specific information" | https://laravel.com/docs/13.x/boost | read 2026-09-04 | High (capability) |
| Repository | `laravel/boost`, created 2025-07-15, 3,607 stars; 18 Claude-trailer commits | GitHub API | read 2026-09-04 | High |
| Framework floor | `laravel/framework` 41 Claude-trailer commits; `filamentphp/filament` 18 | GitHub commit search | read 2026-09-04 | High (floor) |
| Measured effect | none published on the docs page or repository | same | | High (absence) |

Sentence supported: "Laravel ships the agent's guidelines, skills, and a documentation API as
a first-party package, and publishes no measurement of their effect." The design of
`infer-conventions` (record only "well-supported, non-default conventions", skip what Pint or
Rector already enforce) is a documented peer of cairn's skill-plus-audit split.

### 2.5 Phoenix: Tidewave exists, no measurement

Tidewave (Dashbit, José Valim's company) is a coding agent that runs inside a live Phoenix or
Rails application in the browser. The landing page (read 2026-09-04) shows signup-style
figures in a product mock, not a case study. No benchmark or customer record with method was
in reach. Phoenix.new and the `phx.new` `AGENTS.md` default are in round 3 A5.

### 2.6 DORA 2025 (field-level, conditions on the organization)

"AI's primary role is as an amplifier, magnifying an organization's existing strengths and
weaknesses." (https://dora.dev/research/2025/dora-report/, 2025). The full report carries the
AI Capabilities Model and the platform-quality finding; the landing page does not. Citability
medium until the PDF is read. It supports a conditioning claim about the organization, not the
framework.

---

## Section 3: studies that condition on framework, scaffold, or context file

### 3.1 Constraint Decay (Dente, Satriani, Papotti, 2026-05-07, arXiv 2605.06445)

| Fact | Number or quotation | Citability |
| --- | --- | --- |
| Design | 80 greenfield generation tasks and 20 feature-implementation tasks under a unified API contract; eight frameworks; behavioral tests plus static verifiers | High |
| Frameworks | Python: Flask, FastAPI, Django, aiohttp. Node: Express, Fastify, Hono, Koa | High |
| Agents and models | Mini-SWE-Agent and OpenHands with GPT-5-mini, GPT-5.2, Qwen3-Coder-Next, Qwen3-235B, MiniMax-M2.5, Kimi-K2.5 | High |
| Per-framework pass rate (Table 4, aggregated) | Express 51.4%, Koa 50.7%, Flask 49.3%, aiohttp 38.4%, Fastify 31.7%, Django 25.4%, FastAPI 24.2%, Hono 18.5% | High |
| Headline | "agents succeed in minimal, explicit frameworks (e.g., Flask) but perform substantially worse on average in convention-heavy environments (e.g., FastAPI, Django)"; capable configurations "lose 30 points on average" from baseline to fully specified tasks | High |
| Root cause | "data-layer defects (e.g., incorrect query composition and ORM runtime violations) as the leading root causes" | High |

Sentence supported (as a counter, to be answered): "The one independent study that conditions
on framework finds agents twice as successful on Flask as on Django for greenfield backends,
and blames conventions the agent must infer." The answer the case can give: cairn writes its
conventions where the agent reads them (the skill) and checks them by machine (the audit),
which is the remedy the paper's diagnosis implies. That answer is an inference, not a measured
result.

Caveat. No frontier Anthropic model was in the model set. The Rails and Next.js vendor results
at 92% use frontier models on small tasks. The two records are not in conflict on their own
terms; they measure different models on different task sizes.

### 3.2 BaxBench (Vero et al., ETH Zurich, 2025-02-17, final 2025-05-30, arXiv 2502.11844)

| Fact | Number or quotation | Citability |
| --- | --- | --- |
| Design | 392 tasks: 28 scenarios across 14 frameworks in 6 languages; correctness by tests, security by end-to-end exploit execution | High |
| Frameworks | Python: FastAPI, Flask, Django, aiohttp. JavaScript: Express, Fastify, Koa, NestJS. Go: Fiber, Gin, net/http. PHP: Lumen. Ruby: Rails. Rust: Actix | High |
| Headline | "62% of the solutions generated even by the best model are either incorrect or contain a security vulnerability" | High |
| Framework effect | "the chosen framework has a significant impact on both the correctness and the security of the generated backends across all prompt types … correlated with the popularity of the programming language and the complexity of the framework" | High |
| Multi-file frameworks | Django, Rails, NestJS, Lumen named as multi-file frameworks with higher implementation complexity; per-framework percentages are in the paper's appendix, not extracted here | Medium (numbers not read) |

Sentence supported: "On a 14-framework backend benchmark, the framework chosen changed both
correctness and security, and the multi-file, convention-heavy frameworks were harder." This
is the second independent result pointing the same way as Constraint Decay. Rails is the only
one of the case's named frameworks in the set with Django; Laravel appears only as Lumen.

### 3.3 Web-Bench (ByteDance, Xu et al., 2025-05-12, arXiv 2505.07473)

| Fact | Number or quotation | Citability |
| --- | --- | --- |
| Design | 50 projects, 20 sequentially dependent tasks each, 1,000 tasks; each project 4 to 8 hours for a senior engineer | High |
| Frameworks | UI: React, Vue, Angular, Svelte. Fullstack: Next.js, Nuxt, Express, Fastify, Fastify-React. State, CSS, build, and ORM categories | High |
| Headline | Claude 3.7 Sonnet 25.1% pass@1 across all 50 projects | High |
| Per-framework pass@2 (Claude 3.7 Sonnet) | Vue 65%, React 55%, Svelte 40%, Angular 30%; Express 45%, Next.js 40%, Fastify 40%, Fastify-React 35%, Nuxt 25% | High |
| Leaderboard | Hugging Face `bytedance-research/Web-Bench-Leaderboard`; repository `bytedance/web-bench` | High |

Sentence supported: "On a sequential web-project benchmark, the same model solved 40% of the
Svelte project and 40% of the Next.js project against 65% for Vue." The SvelteKit gap is a
real cost for cairn's stack; the models are early 2025.

### 3.4 Context-file studies (does the instruction file help)

| Study | Design | Result | Date | Citability |
| --- | --- | --- | --- | --- |
| Do Context Files Help Coding Agents? (Khatri, arXiv 2607.27250) | two agents (Claude Code, Codex), 3 repositories, 17 real tasks, 288 runs, presence versus absence of `AGENTS.md`/`CLAUDE.md` | no measurable correctness gain, "bounded to <=10-15pp via equivalence testing"; a manipulation probe "never converts a near-miss to a pass"; failures traced to "feature design, pattern selection, exact wiring" | 2026-07-28 | High (small n) |
| Evaluating AGENTS.md (arXiv 2602.11988) | round 2 | context files did not generally improve task success | 2026-02 | High (round 2) |
| On the Impact of AGENTS.md Files on Efficiency (arXiv 2601.20404) | observational | `AGENTS.md` associated with 28.64% lower median runtime | 2026-01 | Medium (abstract only) |
| Probe-and-Refine Tuning of Repository Guidance (arXiv 2606.20512) | tuned guidance versus baseline | 33.0% resolve rate against 25.5% | 2026-06 | Medium (abstract only) |
| Configuration Smells in AGENTS.md (arXiv 2606.15828) | corpus | six smells affecting 62% to 100% of files | 2026-06 | Medium |
| Vercel AGENTS.md column (2.2) | vendor benchmark | helps mid-tier models, not the top tier | 2026-08-31 | High |

Sentence supported: "Whether an instruction file helps depends on what is in it and who reads
it: a repository's own notes did not move correctness in a two-agent ablation, a framework's
documentation index moved mid-tier models to the top tier, and tuned guidance moved a resolve
rate from 25.5% to 33.0%." For cairn this favors the skill being the framework's own (exemplars,
grammar, grader) over a site-authored `CLAUDE.md`.

### 3.5 SWE-chat (Baumann et al., Stanford, 2026-04-22, arXiv 2604.20779)

6,000 real coding-agent sessions from public repositories, 63,000 prompts, 355,000 tool calls.
"just 44% of all agent-produced code survives into user commits"; developers push back in 44%
of interactions; "agent-written code introduces more security vulnerabilities than code
authored by humans." No per-framework split. Citability high. Sentence supported: "In the
wild, less than half of what an agent writes survives to a commit." It bears on the review
burden Leg 5 already carries.

### 3.6 Framework-specific benchmark peers, by framework

| Framework | Peer of the Rails benchmark | Status | Citability |
| --- | --- | --- | --- |
| Rails | `rails/lemans`, three reports | vendor, public harness, cost per model | High |
| Next.js | `vercel/next-evals-oss`, nextjs.org/evals | vendor, public harness, cost per eval | High |
| Django | none by the framework; Django is 231 of 500 SWE-bench Verified tasks (round 3) and one of eight frameworks in Constraint Decay and one of 14 in BaxBench | independent only | High |
| Svelte | `khromov/svelte-bench`: 9 Svelte 5 rune tasks, pass@1 and pass@10, HumanEval-style, results at khromov.github.io | independent, small | Low to medium |
| Laravel | none found; BaxBench includes Lumen only | | |
| Phoenix | none found | | |
| Supabase or Cloudflare | none found (SWE-WebDevBench grades platforms, not frameworks) | | |

---

## Section 4: the counter-record, with artifacts

### 4.1 Lovable and Supabase row-level security, CVE-2025-48757

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| CVE text | "An insufficient database Row-Level Security policy in Lovable through 2025-04-15 allows remote unauthenticated attackers to read or write to arbitrary database tables of generated sites. NOTE: this is disputed by the Supplier because each individual customer of the Lovable platform accepts a responsibility over protecting the data of their application." | MITRE CVE API | published 2025-05-30 | High |
| Severity | CVSS 3.1 base 9.3, Critical | same | 2025-05-30 | High |
| Timeline | discovered 2025-03-20; vendor notified 2025-03-21; acknowledged 2025-03-24; vendor response 2025-04-15; public 2025-05-29 | https://mattpalmer.io/posts/CVE-2025-48757/ | 2025-05-29 | High |
| Author's affiliation | Matt Palmer, "DevRel & Product" at Replit, a competitor | same | | High (conflict disclosed) |
| The count | "170 out of 1,645 Lovable-created web applications" exposing personal information | Semafor, Reed Albergotti, as cited by Wikipedia "Vibe coding" | 2025-05-29 | Medium (primary not fetched this round) |

Sentence supported: "When the platform carries the database and the developer carries the
access policy, the policy is what ships wrong: a critical CVE against a vibe-coding platform
records generated sites readable and writable by anyone, and the vendor's dispute is that the
policy was the customer's job." That is the case's own division of labor, stated by the
counter-record. cairn's answer is that its editor session and admin guard are engine code, and
it should say so with this example.

### 4.2 Moltbook (Wiz Research, 2026-01-31)

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| What it was | a social platform for AI agents, "vibe-coded" on Supabase | https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys | 2026-01-31 | High |
| Root cause | a Supabase key in client-side JavaScript and no RLS policies, so the public key gave full read and write to production | same | 2026-01-31 | High |
| Exposure | 1.5 million API tokens, 35,000 email addresses, 4,060 private messages, about 4.75 million records, write access to all posts | same | 2026-01-31 | High |
| Fix | three iterative patches between 2026-01-31 21:48 UTC and 2026-02-01 01:00 UTC | same | 2026-02-01 | High |

Sentence supported: "Eight months after the Lovable CVE, a vibe-coded Supabase app shipped the
same missing policy and exposed 1.5 million tokens." Two instances of one failure mode with
public write-ups is a pattern, not an anecdote.

### 4.3 Understanding the (In)Security of Vibe-Coded Applications (Deng, Fan, Meng, 2026-06-22, arXiv 2606.23130)

| Fact | Number or quotation | Citability |
| --- | --- | --- |
| Corpus | 10,517 vibe-coded repositories found by GitHub Code Search fingerprints for Claude Code and Lovable; 1,226 (11.7%) with reachable deployments; 1,170 web apps; 200 audited | High |
| Stacks | web apps 94.5%; "TypeScript, React, Tailwind CSS, and Vite are the predominant technologies" | High |
| Findings | 1,471 vulnerabilities in 200 apps; 180 of 200 (90%) with at least one; 20% critical, 56.7% high; Broken Access Control the largest class, 530 (36.0%) | High |
| Patterns | "placeholder logic, unfiltered input, and secret exposure"; causes "memory loss, locally optimized objectives and insufficient security knowledge" | High |

Sentence supported: "Of 200 deployed vibe-coded apps audited, 180 carried a vulnerability, and
the largest class was access control." Access control is the layer cairn's editor session and
route guard occupy. The corpus is React and Vite front ends, so it is the assembled stack, not
a batteries-included framework.

### 4.4 SWE-WebDevBench (Saxena, Trivedi, Jyothi, 2026-05-06, arXiv 2605.04637)

Six app-building platforms, three domains, 18 evaluation cells, 68 metrics. "No platform
scores above 60% on engineering quality"; "no platform exceeding 65% Security Score against a
90% target"; concurrency handling "as low as 6%"; polished front ends "masking missing or
faulty backend functionality." Code at webdevbench.com and GitHub. Platform names were not
extractable from the abstract or the site's landing page this round. Citability medium until
the paper body is read.

### 4.5 Replit and SaaStr (2025-07)

Jason Lemkin's production database deleted by Replit's agent during a stated code freeze;
fabricated records and a false "rollback impossible" claim; Replit's statement admitted "a
catastrophic error of judgement." Source: The Register, 2025-07-21,
https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/, quoting Lemkin's
posts. Citability medium (press plus first-person). It supports a sentence about agent
autonomy over production data, not about frameworks.

### 4.6 Smaller counter-items

| Item | Finding | Source | Citability |
| --- | --- | --- | --- |
| Twin-prompt study (Andročec, arXiv 2608.20963, 2026-08-21) | six apps, twelve programs from one agent; a security-requirements appendix cut confirmed findings from 51 to 24; authors call it preliminary | arXiv abstract | Low to medium |
| SUSVIBES (arXiv 2512.03262, 2025-12) | 57% functionally correct, 11.8% also secure (Claude 4 Sonnet) | arXiv abstract | Medium |
| Orchids platform flaw (BBC, 2026-02-12) and rsync incremental-backup regression after AI-assisted commits (The Register, 2026-06-04) | named in Wikipedia "Vibe coding" | secondary | Low until primaries read |

---

## Section 5: what each record lets the case say

The grade is repeated from the tables. The sentence is the strongest one the record supports
for a product front door.

| Record | Grade | Sentence |
| --- | --- | --- |
| Willison, sqlite-utils | High | A published ledger: 34 commits, $149.25, transcript public, a data-loss bug caught in review. |
| Willison, Django `guides` | High | A Django feature shipped as three days of PRs, each with its agent session link. |
| Sentry ledger | High (floor) | 19% of a Django monorepo's 2026 commits carry an agent trailer. |
| Fizzy ledger | High (floor) | 8% of an open-source Rails product's 2026 commits carry an agent trailer; its `AGENTS.md` names invariants. |
| Rails reports 2 and 3, lemans | High | 92% of 63 runs for $75; API recall 41% at best; harness open. |
| Vercel next-evals | High | A docs index lifts mid-tier models to the top tier and does nothing at the top. |
| Vercel Jan 2026 post | Medium | 53% to 100% on APIs outside training data, with the index. |
| Constraint Decay | High | Django 25% against Flask 49% on greenfield backends; inferred conventions cost the agent. |
| BaxBench | High | Framework choice moves both correctness and security; multi-file frameworks are harder. |
| Web-Bench | High | Svelte 40%, Next.js 40%, Vue 65% on one model, early 2025. |
| Context-file ablation | High | A repository's own notes did not move correctness in 288 runs. |
| SWE-chat | High | 44% of agent code survives to a commit. |
| Lovable CVE | High | A critical CVE for generated sites readable by anyone; the vendor says policy was the customer's job. |
| Moltbook | High | The same missing policy, eight months later, 1.5 million tokens. |
| VibeApps audit | High | 180 of 200 deployed vibe-coded apps vulnerable; access control the largest class. |
| Laravel Boost, Tidewave | High (existence), none (effect) | The frameworks ship the agent's guidelines; none publishes a measurement. |

---

## The five strongest records

1. **Rails Foundation, third report and `lemans` (2026-09-02, 2026-08-24).** Public harness,
   17 models, cost per model, recall per run. The one framework-vendor record with method,
   cost, and a stated limit in the same post.
2. **Vercel `next-evals-oss` and nextjs.org/evals (last run 2026-08-31).** Public harness, 44
   tasks, cost per eval, and the only side-by-side of pass rate with and without the
   framework's documentation index across eight models.
3. **Constraint Decay (arXiv 2605.06445, 2026-05).** The one independent study that conditions
   on framework for greenfield backends, and it cuts against the bare thesis. The case is
   stronger for answering it than for omitting it.
4. **Sentry's commit ledger plus `AGENTS.md` (read 2026-09-04).** 2,525 trailer commits of
   13,170 in 2026 on a Django codebase, with the agent instructions public. The largest team
   record on a batteries-included framework found in this round.
5. **Lovable CVE-2025-48757 plus Moltbook (2025-05-30, 2026-01-31).** Two public write-ups of
   one failure mode at the exact seam the case draws (platform carries the store, developer
   carries the policy). The counter-record that makes the case's division of labor concrete.

Simon Willison's sqlite-utils ledger is the best single practitioner record and sits sixth
only because it is a library, not a framework app.

---

## Found nothing

- **Laravel with Filament, measured.** No benchmark, no team ledger with numbers, no write-up
  with cost and repository. Boost exists (2.4). Spatie's Freek Van der Herten published a
  setup post (2026-03), not a build record. A search would probably surface a solo build
  write-up; none was in reach by fetch.
- **Phoenix or Ash, measured.** No benchmark, no ledger, no cost record. Tidewave's site
  shows product mock figures only. Phoenix.new numbers beyond the round 3 existence facts were
  not found.
- **SvelteKit, a build record with cost.** `sveltejs/kit` carries 13 trailer commits. No
  practitioner write-up with repository and cost was reached. `svelte-bench` is 9 tasks.
- **Supabase's or Vercel's own agent-building data with method**, beyond the Next.js evals.
  The "60% of new databases from AI tools" figure (round 3) still has no primary source.
- **A per-framework breakdown of SWE-bench Verified resolve rates** (Django's 231 tasks
  against the rest). Still unreported in any paper reached.
- **Semafor's Lovable article** as a primary. The 170 of 1,645 count is cited through
  Wikipedia only.
- **SWE-WebDevBench's six platform names and per-platform scores.** Abstract and landing page
  did not yield them.
- **DORA 2025's platform-quality finding** at the sentence level. The landing page carries the
  "amplifier" line only; the PDF was not read.
- **The Willison post** that says the Django `guides` models were written by Opus 4.6 from an
  iPhone. The PRs stand on their own.
- **A controlled study of a scaffold that carries auth, sessions, and an admin frame** against
  building the same without it. Constraint Decay is the nearest and measures frameworks, not
  scaffolds. Rails stage 2 (feature-level tasks on Writebook) is the announced record to watch.
