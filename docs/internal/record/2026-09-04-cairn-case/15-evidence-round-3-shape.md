# The cairn case: evidence, round 3, the shape

Research date: 2026-09-04 (API reads carry 2026-09-05 UTC timestamps). This round collects the
public success record of the SHAPE the case argues for, independent of cairn. The owner
redirected the round mid-pass: the shape is broader than a CMS. It is a framework or platform
that carries the hard, security-bearing, or convention-heavy parts, exposes a documented
conventional surface, and lets a developer, increasingly with a coding agent, build only the
domain on top. Section A is that record and is the largest section. Sections 1, 3, 4, and 5
keep the original brief's items in shorter form. Section 2 (git-based CMS products) is cut
short on the owner's instruction.

Standards are round 2's. Every item records the claim it bears on, the source, the date, the
numbers, the caveats, and a citability grade. Numbers read from the GitHub API, the npm
downloads API, Packagist, and the Hugging Face datasets server are primary counts and are
dated to the read. Two method notes. GitHub's contributors endpoint lists at most 500
accounts, so per-repository contributor totals were not usable and are omitted. GitHub commit
search for the trailer `Co-Authored-By: Claude` counts only commits that carry that trailer;
it undercounts agent work done without the trailer and counts nothing from other agents, so
it is a floor, never a share.

Citability scale. High: a primary vendor page for a capability fact, a repository or registry
count, a named case with stated numbers, or a paper with a stated method and sample. Medium:
a first-person account by the maintainer with numbers, or a large survey with a disclosed
convenience sample. Low: vendor marketing, secondary aggregates, or an undisclosed method.

---

## Section A: the framework-plus-agent shape

### The claim under test

A platform that carries auth, sessions, security invariants, the admin frame, the publish
path, and the conventions leaves the developer a narrow, well-conventioned surface. That
surface is the shape coding agents handle best. The record should show two things: named
platforms of this shape with adoption, and documented agent work on them with commit or
benchmark evidence rather than testimonials.

### Verdict

**Can claim.** The shape has a public record on at least six platforms, and three of them
carry measured or commit-level agent evidence: the Rails Foundation's own benchmark (504
runs, 2026-08), Cloudflare's OAuth library with prompts in its commit history (2025-03 to
2025-06), and repository commit trailers on Supabase, Ghostty, Crush, and Cloudflare's Agents
SDK (read 2026-09-05). The strongest single sentence is a measurement: on the Rails
Foundation benchmark, runs that reached for framework APIs solved the task at 92% against 87%
for hand-rolled solutions, and API recall is what separated the models.

**Cannot claim.** That Charm's maintainers said publicly that they build Bubble Tea or Crush
with Claude. No primary source says so. Crush's repository shows 20 Claude-trailer commits
and 26 commits from a declared agent account out of 4,103, and Bubble Tea shows zero. The
Charm record supports a different sentence: a conventioned framework was proven in production
by an AI coding agent built on it, and the framework ships upgrade guides "for humans and
LLMs."

**Cannot claim.** A controlled result that conventions cause agent success. The Rails
benchmark is the closest, and it is a within-benchmark comparison with ceiling effects (six
of 21 tasks solved by every run of every model). The Ash and Phoenix accounts are maintainer
reports with no numbers.

### A1. Charm: Bubble Tea, Lip Gloss, Bubbles, and Crush

What the framework carries: the terminal event loop, rendering, input decoding, styling, and
the component set; the Elm-shaped `Model`, `Update`, `View` contract is the surface a
developer writes to. What the developer writes: the model and the update logic. Agent use
documented: partially (see below).

| Fact | Number | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Bubble Tea stars | 44,804 | GitHub API, `charmbracelet/bubbletea` (created 2020-01-10) | read 2026-09-05 | High |
| Lip Gloss stars | 11,791 | GitHub API (created 2021-03-01) | read 2026-09-05 | High |
| Bubbles stars | 8,884 | GitHub API (created 2020-01-18) | read 2026-09-05 | High |
| Applications on the ecosystem | "25,000+ open-source applications" | Charm blog, "v2", Christian Rocha | 2026-02-23 | Medium (vendor count, method not stated) |
| v2 production proof | "The v2 branches have been powering Crush, our AI coding agent, in production from the very beginning." | Charm blog, "v2" | 2026-02-23 | High (vendor statement of fact about its own product) |
| v2 release cadence | v2.0.0-rc.1 2025-11-04; rc.2 2025-11-17; v2.0.0 2026-02-24; v2.0.9 2026-08-19 (nine patch releases in six months) | GitHub releases API | read 2026-09-05 | High |
| Bubble Tea releases total | 80 | GitHub releases API | read 2026-09-05 | High |
| Upgrade guides for agents | guides "for humans and LLMs" | Charm blog, "v2" | 2026-02-23 | High |
| Crush stars | 27,914 (created 2025-05-21) | GitHub API | read 2026-09-05 | High |
| Crush commits | 4,103 | GitHub API | read 2026-09-05 | High |
| Crush releases | 185; v0.91.0 2026-08-22, v0.91.1 08-25, v0.91.2 08-26, v0.92.0 08-31, nightly 09-05 | GitHub releases API | read 2026-09-05 | High |
| Crush origin | Kujtim Hoxha "reached for Go and the core of the Charm stack, Bubble Tea, Bubbles, Lip Gloss, and Glamour" | Charm blog, "Crush, Welcome Home", Christian Rocha, https://charm.land/blog/crush-comes-home/ | 2025-07-30 | High |
| Crush's stated view of LLMs | "LLMs have most definitely crossed the threshold from impressive demos to genuinely useful tools." | same post | 2025-07-30 | High (quotation) |
| Agent conventions file in Crush | `AGENTS.md` describing architecture, module layout, hooks with "Claude Code compat" | https://github.com/charmbracelet/crush/blob/main/AGENTS.md | read 2026-09-05 | High |
| Claude-trailer commits in Crush | 20 of 4,103 | GitHub commit search | read 2026-09-05 | High (floor) |
| Declared agent account merged into Crush | 26 commits by `joestump-agent` (profile: "I am @joestump's coding agent. I write code, mostly Go"; account created 2026-07-04; owner's bio: "Principal Agent Shepherd at @google") | GitHub commit search and users API | read 2026-09-05 | High |
| Claude-trailer commits in Bubble Tea | 0 of 1,882 | GitHub commit search | read 2026-09-05 | High (floor) |
| Claude-trailer commits in Lip Gloss | 1 of 679 | GitHub commit search | read 2026-09-05 | High (floor) |
| Crush license | FSL-1.1-MIT | repository README | read 2026-09-05 | High |

Conventions and agent success, what is documented. Charm's own statements connect Crush to
the libraries as the production proof of v2, and connect the upgrade guides to LLM readers.
No Charm source claims the Elm architecture makes agents succeed. Third-party Claude Code
skills for Bubble Tea exist (several on skill marketplaces, read 2026-09-05), which shows
demand for a conventions layer and nothing about outcomes; citability low. The inference the
case may state as an inference: a framework whose contract is three functions and a message
type gives an agent a small, checkable surface. Evidence for that inference in this round is
the Rails benchmark's API-recall result (A3), not anything from Charm.

Counter-record. Crush was born from a public ownership dispute over OpenCode in July 2025
(secondary coverage 2025-07-30 and 2025-07-31; Crush issue #1097 asks to "dispel some of the
confusion"; low to medium). The agent commit share in Crush is small (46 of 4,103 by the two
measures above), which argues against "built by agents" and for "built by a small team with
agents in the loop." Bubble Tea's v2 was its first breaking release in six years (Charm
blog, 2026-02-23), so the "stable surface" claim holds for six years and then broke once.

Strongest citation for the front door: Charm blog, "v2", 2026-02-23. Sentence it supports:
"Charm shipped the second major version of Bubble Tea after running it in production inside
its own AI coding agent, and published the upgrade guides for humans and LLMs."

### A2. Cloudflare: workers-oauth-provider, the Agents SDK, Workers prompting, VibeSDK

What the platform carries: the Workers runtime, Durable Objects, the OAuth 2.1 provider
library, the Agents SDK's state, scheduling, WebSockets, and durable execution. What the
developer writes: the handler, the agent harness, and the tools. Agent use documented: yes,
with prompts in a commit history.

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Library announced | "an OAuth 2.1 Provider library for Cloudflare Workers" | Cloudflare blog, remote MCP servers post | 2025-03-25 | High |
| Repository | created 2025-03-11; 1,870 stars; 274 commits | GitHub API, `cloudflare/workers-oauth-provider` | read 2026-09-05 | High |
| The README's statement | "This library (including the schema documentation) was largely written with the help of Claude, the AI model by Anthropic. Claude's output was thoroughly reviewed by Cloudflare engineers with careful attention paid to security and compliance with standards." and "Check out the commit history to see how Claude was prompted and what code it produced." | README section "Written using Claude", present at README revisions dated 2025-06-03 and 2025-09-15 | 2025-06-03 | High |
| The author's framing | "two months ago (January 2025), I (@kentonv) would have agreed. I was an AI skeptic." and "this is not 'vibe coded'. Every line was thoroughly reviewed and cross-referenced with relevant RFCs, by security experts" | same README revision | 2025-06-03 | High |
| Time claim | days rather than weeks or months (Varda's Hacker News comment as quoted by Simon Willison) | https://simonwillison.net/2025/Jun/2/kenton-varda/ | 2025-06-02 | Medium (first-person, no log) |
| Claude-trailer commits | 5 of 274 (the early prompt-carrying commits predate the trailer convention) | GitHub commit search | read 2026-09-05 | High (floor) |
| Security advisory | CVE-2025-4144 exists against the package | GitLab advisory database | read 2026-09-05 | Medium (exists; details not read) |
| The section's later removal | the "Written using Claude" section is absent from the README revision dated 2026-07-29 | GitHub contents API at three README revisions | read 2026-09-05 | High |
| Agents SDK repository | created 2025-01-29; 5,521 stars; 1,530 commits; 22 Claude-trailer commits | GitHub API and commit search | read 2026-09-05 | High |
| What the SDK carries | "local SQL storage", "durable identity", WebSockets, "scheduled work", "recoverable execution"; "no infrastructure to manage, no sessions to reconstruct, no state to externalize" | https://developers.cloudflare.com/agents/ | read 2026-09-05 | High (vendor capability page) |
| Workers prompting page | a system prompt so users "create Workers applications from simple prompts in your favorite agent or editor, including Cursor, Windsurf, VS Code, Claude Code, Codex, and OpenCode" | https://developers.cloudflare.com/workers/get-started/prompting/ | updated 2026-07-28 | High |
| VibeSDK | an open-source "vibe coding" platform on Workers, announced Birthday Week | Cloudflare blog and `cloudflare/vibesdk` | 2025-09-23 | High (existence) |

Counter-record. The library carried a CVE within months of release. The README section that
documented the Claude authorship was gone by the 2026-07-29 revision, so a reader who opens
the repository today does not see it; cite the dated revision. The author's time saving is a
recollection, not a log.

Strongest citation for the front door: the README at its 2025-06-03 revision. Sentence it
supports: "Cloudflare's OAuth 2.1 library for Workers was largely written with Claude, with
every line reviewed against the RFCs by security engineers, and the prompts are in the commit
history."

### A3. Rails: the tradition and the first measured record

What the framework carries: routing, ORM, migrations, auth generator, background jobs
(Solid Queue), cache, WebSockets (Solid Cable), encryption, and the testing harness. What the
developer writes: models, controllers, views, and tests for the domain. Agent use documented:
yes, benchmarked by the framework's own foundation.

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| The framework's own thesis | "Rails gives coding agents the same thing it has always given developers: clear conventions, expressive code, and a complete framework for turning ideas into production software." and "Less code means more context." | https://rubyonrails.org/ai | read 2026-09-05 | High (vendor page; the claim, not the proof) |
| The benchmark project | Rails Foundation announces "Agents on Rails"; stage 1 is "small, self-contained tasks that isolate one specific capability" | https://rubyonrails.org/2026/8/12/llm-benchmarking-project | 2026-08-12 | High |
| The first report | "We ran 8 models against 21 atomic Rails tasks, 3 runs each"; 504 runs; $491; target app Writebook (37signals) | https://rubyonrails.org/2026/8/13/agents-on-rails-the-first-benchmark-report, Svyatoslav Kryukov and Artur Petrov | 2026-08-13 | High |
| Top accuracy | Claude Opus 5: 92% (58 of 63 runs) | same | 2026-08-13 | High |
| API recall | the share of runs that used existing Rails APIs rather than hand-rolled code; "Recall runs from 8% (DeepSeek) to 35%" | same | 2026-08-13 | High |
| The convention result | runs that used framework APIs solved at 92% against 87% for hand-rolled solutions; "Knowing Rails is what separates the models." | same | 2026-08-13 | High (within-benchmark comparison) |
| Ceiling effect | "Six of 21 tasks are solved by every run of every model" | same | 2026-08-13 | High (stated limitation) |
| Evaluation code | `rails/ai-evals` | GitHub | read 2026-09-05 | High |
| DHH's practice | "barely writes any code by hand"; "agent-first"; Rails "is one of the most token-efficient ways of building web apps and is well-suited for agent workflows" | Pragmatic Engineer, "DHH's new way of writing code" | 2026-04-08 | Medium (interview) |
| One documented solo build | Rails 8.1.1, PostgreSQL, Hotwire; 713 commits in 55 days (2025-12-15 to 2026-02-08); about 38,600 lines; "Claude authored approximately 95%+"; 25 to 45 hours of human effort; a rebuild of an existing product, not greenfield | Celso Pinto, world.hey.com | 2026-02-08 | Medium (first-person with commit count; no independent check) |
| Claude-trailer commits in rails/rails | 36 of 99,578 | GitHub commit search | read 2026-09-05 | High (floor) |

Counter-record. The benchmark is run by the framework's own foundation, on tasks it chose,
with a ceiling on a third of them; it measures atomic tasks, not a feature built end to end.
The 92% against 87% gap is five points on a benchmark with a stated ceiling effect (six of 21
tasks solved by every run); the page does not call the gap noise, and an earlier version of this
row attributed a "run-to-run noise" quotation that is not on the page (corrected 2026-09-05). The solo-build account is one person's report. The
framework's core repository shows a small agent-trailer floor (36 commits), which says
nothing about how contributors work locally.

Strongest citation for the front door: the Rails Foundation report, 2026-08-13. Sentence it
supports: "On the Rails Foundation's own agent benchmark, what separated the models was
whether they knew the framework: runs that used Rails APIs solved 92% of tasks against 87%
for hand-rolled code."

### A4. Django: the admin tradition and the benchmark share

What the framework carries: ORM, migrations, auth, sessions, CSRF, and the automatic admin.
What the developer writes: models, views, templates, and admin registrations. Agent use
documented: Django is the largest corpus in the standard agent benchmark.

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| The admin's contract | "One of the most powerful parts of Django is the automatic admin interface. It reads metadata from your models to provide a quick, model-centric interface where trusted users can manage content on your site." | Django docs, `ref/contrib/admin/` | read 2026-09-05 | High |
| The admin's stated limit | "The admin's recommended use is limited to an organization's internal management tool. It's not intended for building your entire front end around." | same | read 2026-09-05 | High |
| The admin's origin | an internal newsroom CMS at the Lawrence Journal-World from about 2004, built with the paper's editors and journalists, released with Django in 2005 | Jacob Kaplan-Moss, "So you want a new admin?" (page fetched 200 but text not extractable here) | uncited: checkable against https://jacobian.org/writing/so-you-want-a-new-admin/ | Medium |
| Share of SWE-bench Verified | 231 of 500 instances are `django/django` (next: sympy 75, sphinx 44, matplotlib 34) | counted from the Hugging Face dataset `princeton-nlp/SWE-bench_Verified`, test split | read 2026-09-05 | High |
| Resolve rates on Verified | 62.2% (CodeStory), 60.2% (LearnByInteract), 53.0% (OpenHands), aggregated over all 500 | Wang, Pradel, Liu, "Are 'Solved Issues' in SWE-bench Really Solved Correctly?", ICSE 2026, arXiv 2503.15223 | 2025-09-09 | High |
| Per-repository rates | not reported in that paper; an older Lite figure is SWE-agent with GPT-4 at 26.32% on 114 Django instances | RepoGraph and SWE-agent papers via search | 2024 | Medium |
| Claude-trailer commits in django/django | 6 of 34,914 | GitHub commit search | read 2026-09-05 | High (floor) |
| Django stars | 89,939 | GitHub API | read 2026-09-05 | High |

What the Django share proves and does not. It proves that the field's standard measure of
agent capability is, by count, mostly a measure of agents working inside a
convention-heavy, batteries-included framework. It does not prove that the framework is why
they succeed, because no paper in this round reports a per-repository rate on Verified.

Counter-record. The same paper finds that a share of "solved" instances are not correctly
solved under stricter tests; the exact figure is in the paper and should be read before
citing the rates. The "SWE-Bench Illusion" preprint (arXiv 2506.12286, 2025) argues models
partly memorize Django issues, which would inflate Django-heavy scores; citability medium.

Strongest citation for the front door: the dataset count. Sentence it supports: "231 of the
500 tasks in SWE-bench Verified are Django issues, so the field's standard agent benchmark is
mostly a test of working inside a batteries-included framework."

### A5. Phoenix and Ash: generators that ship the agent's instructions

What the framework carries: Phoenix 1.8 generators for auth (magic link by default),
scopes, LiveView, PubSub, and a daisyUI theme; Ash's declarative resources. What the
developer writes: the domain. Agent use documented: the framework now writes the agent's
guidance file.

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| AGENTS.md in every new app | "New applications generated with `phx.new` have an `AGENTS.md` containing guidelines extracted from the Phoenix.new agent." | Phoenix blog, 1.8.0 release, Chris McCord | 2025-08-05 | High |
| Auth default | `phx.gen.auth` now defaults to magic-link authentication with a `require_sudo_mode` plug | same | 2025-08-05 | High |
| Scopes | generators add "scoped data access (queries and PubSub!), automatic filtering by user or organization, and proper foreign key fields in migrations, all out of the box" | same | 2025-08-05 | High |
| Phoenix.new | an agent given a full Fly Machine with root shell, headless Chrome, `gh`, `psql`, `mix`; $20/month | Fly blog, Chris McCord, 2025-06-20; Simon Willison, 2025-06-23 | 2025-06 | High (existence and capability) |
| usage_rules | libraries ship a `usage-rules.md`; a task syncs them into `AGENTS.md` or `CLAUDE.md`; repo created 2025-05-23; 222 stars | https://github.com/ash-project/usage_rules | read 2026-09-05 | High |
| The maintainer's before and after | "We went from LLM agents being practically useless for Ash development to being able to generate idiomatic, production-ready code." | Zach Daniel, "LLMs & Elixir: Windfall or Deathblow?" | 2025-06-01 | Medium (maintainer report, no numbers) |
| Effect size claimed | "All reports show effectively a night and day difference" | Zach Daniel, "Usage Rules" | 2025-07-18 | Low (unquantified) |
| Phoenix and Ash stars | 23,140 and 2,484 | GitHub API | read 2026-09-05 | High |
| Claude-trailer commits | Phoenix 2 of 8,913; Ash 6 of 6,830 | GitHub commit search | read 2026-09-05 | High (floor) |

Counter-record. Neither maintainer publishes a measurement. Ash's own argument is that a
small ecosystem is disadvantaged with LLMs until it ships explicit rules, which cuts both ways
for a small engine like cairn: conventions help only once they are written down where the
agent reads them.

Strongest citation for the front door: Phoenix 1.8.0 release post, 2025-08-05. Sentence it
supports: "Phoenix now generates the agent's instruction file alongside the app, and its auth
generator defaults to magic links."

### A6. Supabase: a platform that carries the backend, with agent tooling and commit evidence

What the platform carries: Postgres, auth, storage, edge functions, and row-level security.
What the developer writes: schema, policies, and the application. Agent use documented: yes,
by the vendor and in its own repository's commit trailers.

| Fact | Number or quotation | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| MCP server | "perform tasks like launching databases, managing tables, fetching config, and querying data on your behalf"; over 20 tools; branching recommended to limit risk | Supabase blog, "Supabase MCP Server" | 2025-04-04 | High |
| Scale | 4 million developers; over 100,000 customers; Lovable and Bolt named as AI builders on the platform; $100M Series E at $5B | PR Newswire release | 2025-10-03 | High (vendor numbers in a release) |
| Databases per day and AI share | "2,500 new ones created daily"; "more than 60% of new databases launched by AI tools" | Craft Ventures and Sacra, secondary | 2026 | Low (secondary; not found on a Supabase page) |
| Claude-trailer commits in supabase/supabase | 357 of 38,328; 343 of them since 2026-01-01 | GitHub commit search | read 2026-09-05 | High (floor) |
| Stars | 108,856; `supabase/mcp` 2,890 | GitHub API | read 2026-09-05 | High |

Counter-record. Supabase's agent story is mostly about agents building ON the platform, and
the vendor states the security caveat itself (a personal access token gives the agent the
project). The 60% figure has no primary source in this round.

Strongest citation for the front door: the commit search. Sentence it supports: "The
Supabase monorepo carries 357 commits with a Claude co-author trailer, 343 of them in 2026."

### A7. Open-source projects that build with agents, with commit evidence

| Project | Agent evidence | Policy or statement | Source and date | Citability |
| --- | --- | --- | --- | --- |
| Ghostty (60,720 stars) | 59 Claude-trailer commits of 17,718 | PR #8289 "AI tooling must be disclosed for contributions", merged 2025-08-19; `AI_POLICY.md`: "Ghostty is written with plenty of AI assistance, and many maintainers embrace" it, alongside "All AI usage in any form must be disclosed" and "The human-in-the-loop must fully understand all code" | GitHub, read 2026-09-05 | High |
| Ghostty, the maintainer's method | an `AGENTS.md` in `src/inspector`: "Each line in that file is based on a bad agent behavior, and it almost completely resolved them all."; the macOS command palette "is only very lightly modified from what Gemini produced" | Mitchell Hashimoto, "My AI Adoption Journey", 2026-02-05 | Medium (first-person) |
| Ghostty, adoption signal | about half of pull requests carried an AI disclosure within weeks of the rule | secondary (RedMonk and others), 2026-02 | Low |
| Crush | 20 Claude-trailer commits plus 26 from a declared agent account, of 4,103 | `AGENTS.md` present | read 2026-09-05 | High |
| Cloudflare Agents SDK | 22 of 1,530 | none stated | read 2026-09-05 | High |
| Cloudflare workers-oauth-provider | prompts in commit history; README statement (A2) | README revision 2025-06-03 | High |
| Supabase | 357 of 38,328 (A6) | none stated | read 2026-09-05 | High |

Field-level measurements of merged agent work.

| Finding | Number | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Claude Code PRs merged | 567 PRs across 157 projects; 83.8% merged; 54.9% of merged with no further modification; most used for "refactoring, documentation, and testing" | Watanabe, Li, Kashiwa, Reid, Iida, Hassan, arXiv 2509.14745 | 2025-09-18, final 2026-02-09 | High |
| Copilot coding agent volume | "1+ million pull requests that were created between May 2025 and September 2025" | GitHub Octoverse 2025 | 2025-10-28 | High (vendor count) |
| Platform baseline | nearly 1 billion commits in 2025 (+25.1%); 43.2 million PRs merged per month (+23%) | same | 2025-10-28 | High |
| Agent edits corpus | 1.3M code edits co-authored by Claude Code, Codex, and Cursor Agent to mid-August 2025 | AgentPack, arXiv 2509.21891 | 2025-09 | High |
| Rule compliance | agents "almost never proactively retrieve the contribution rules" and "never refuse to contribute in AI-banned repositories under any condition we tested" (106 issues, 49 repositories) | Yang, He, Zhou, arXiv 2607.26819 | 2026-07-29 | High |
| Delegation ceiling | developers use AI in "roughly 60% of their work" and can "fully delegate" only 0 to 20% of tasks | Anthropic, 2026 Agentic Coding Trends Report (cites its Societal Impacts team) | 2026 | Low to medium (vendor report; method summarized, not stated) |

Counter-record for the whole section. The METR randomized trial found experienced developers
19% slower with AI tools on their own repositories (2025; cited in round 2, reused here).
Ghostty and other projects moved from disclosure to closing drive-by AI PRs (2026-01),
because the volume of low-quality agent PRs became a maintainer cost. The compliance paper
shows agents ignore project rules unless prompted. The commit-trailer floors are small
everywhere except Supabase, so "built with agents" is true of a working style and not of the
commit ledger for most of these projects.

### Section A, the three strongest citations

1. Rails Foundation benchmark report, 2026-08-13 (high): framework-API use separated the
   models, 92% against 87%.
2. Cloudflare workers-oauth-provider README, revision 2025-06-03 (high): a security library
   largely written with Claude, reviewed line by line against the RFCs, prompts in history.
3. Watanabe et al., arXiv 2509.14745 (high): 83.8% of 567 Claude Code PRs merged, 54.9%
   unmodified, concentrated in refactoring, documentation, and tests.

---

## Section 1: docs-as-code and git-backed content at scale (shortened)

Verdict. **Can claim** that the largest technical documentation sets on the web are markdown
in public git repositories with pull-request editing, at the scale of thousands to tens of
thousands of files and a million commits. **Cannot claim** a non-technical editor layer on
top of them: every organisation below edits through GitHub's own web editor and pull
requests, and MDN's own launch thread records the concern about non-technical contributors.
GOV.UK is the counter-example: its public content is published through database-backed
Rails applications, and docs-as-code there covers developer documentation only.

| Organisation | Repository | Scale (read 2026-09-05 unless dated) | Editor layer | Citability |
| --- | --- | --- | --- | --- |
| Microsoft Learn | `MicrosoftDocs` org, 763 repositories; `azure-docs` | azure-docs: 17,056 markdown files; 1,416,731 commits; 21,767 forks; PowerShell-Docs since 2015-10 | contributor guide: an "Edit" pencil on a page opens the GitHub file; "We use PRs for all changes, even for contributors who have write access"; in-browser editing "works best for minor and infrequent changes"; some repos state "we do not accept pull requests" (MicrosoftDocs/learn) | High |
| Cloudflare | `cloudflare/cloudflare-docs` | 2022-05-27: "we have 1,600 documentation pages", "accepted almost 4,000 PRs"; 2025-01-08: over 4,000 pages, "8,060 files changed" in the Astro migration, "dozens of pull requests opened and merged each day"; 25,357 commits; 16,599 forks | GitHub PRs; automated AST rewrites at migration | High |
| GitHub | `github/docs` | 7,552 markdown files; 61,676 commits; 68,561 forks; 20,783 stars | staff edit a private `docs-internal`; "The two repositories sync frequently" | High |
| Kubernetes | `kubernetes/website` | 7,712 markdown files; 64,236 commits; 15 localizations; Hugo on Netlify | SIG Docs review of PRs | High |
| MDN | `mdn/content` | moved from a MySQL wiki to a git repository (Yari), beta 2020-11-02 to 2020-12-14; 14,176 markdown files; 29,931 commits since 2020-09; README: "approximately 45,000 contributors" since 2005 and "over 45,000 documents" | PRs replace the WYSIWYG editor; the launch post's stated gains are programmatic mass changes and multi-page PRs; a commenter raised non-technical contributor concerns | High |
| GOV.UK (counter) | `alphagov/whitehall` | Whitehall "is used by publishers to create and manage content" and "is a Ruby on Rails app" (README); `tech-docs-gem` is a Middleman template for technical docs | a database-backed publishing app for content editors; docs-as-code for developer docs only | High |

Counter-record. Contributor totals could not be read (endpoint cap). The docs-as-code
adoption surveys are thin: Tom Johnson's 2019 survey of engineers who write docs found 80%
prefer treating docs like software, with a small self-selected sample (low). The Write the
Docs salary survey does not ask about tooling.

Strongest citation for the front door: Cloudflare blog, 2025-01-08. Sentence it supports:
"Cloudflare's developer documentation is over 4,000 pages of markdown in a public repository,
with dozens of pull requests merged a day."

---

## Section 2: git-based CMS products (cut short on the owner's instruction)

Verdict. **Can claim** the category exists at modest scale and that its leading tool stalled
and was handed off. **Cannot claim** a published post-mortem of a git CMS failing at scale;
the record is stalls and migrations between tools.

| Tool | Stars | npm downloads, last month (2026-07-31 to 2026-08-29) | Note | Citability |
| --- | --- | --- | --- | --- |
| Decap (Netlify CMS) | 19,349 | `decap-cms` 15,354; `netlify-cms` 8,084 | discussion #6503 opened 2022-07-03; reply 2022-07-22: "No plan, no one is reviewing. It's time for a fork."; Netlify transfer to PM announced 2023-02; maintainer 2023-02-24: "The project is not dead anymore"; 3.0 in 2023-08 | High |
| TinaCMS | 13,775 | 409,549 | Forestry.io shut 2023-04-22 with Tina as the migration path | High (counts), Medium (Forestry date, secondary) |
| Keystatic | 2,348 | `@keystatic/core` 489,641 | Thinkmill, first launch 2023-04; editors "actually create a branch, make commits, open a PR" (2023-06-23) | High |
| Sveltia | 2,794 | `@sveltia/cms` 54,297 | competitor timeline alleges unpatched Decap issues in 2025 to 2026 | Low (competitor) |
| Payload | 44,575 | `payload` 2,687,141 | not git-based; database-backed, installed in the app | High |
| Directus | 37,744 | vendor: "500K+ projects" | standalone over a SQL database | Medium |
| Grav, Statamic, Kirby | 15,656; 4,883; 1,528 | n/a (PHP) | W3Techs: Statamic and Kirby each 0.0% of sites (2026-09-05) | High |
| CloudCannon (SaaS) | n/a | n/a | PaperCut: 110 editors, 4,000 pages, six systems consolidated; "Even the most unconfident editors in my team are pretty confident using it now." | Medium (vendor case study) |

Strongest citation: the Decap discussion #6503, 2022-07. Sentence it supports: "The
category's leading tool went a year without a maintainer before Netlify handed it to an
agency."

---

## Section 3: the Jamstack record (shortened)

Verdict. **Can claim** the surveys' sizes and their disclosed bias, Netlify's developer
counts, and the Web Almanac's measured shares. **Must state** the decline of the brand and
the return to server rendering with dates.

| Fact | Number | Source | Date | Citability |
| --- | --- | --- | --- | --- |
| Survey 2020 | more than 3,000 respondents | Netlify blog | 2020-05-27 | Medium |
| Survey 2021 | 7,487 responses, 2021-06-23 to 2021-08-10 | jamstack.org methodology (Laurie Voss) | 2021-10-06 | Medium |
| Survey 2022 | 6,544 responses, 2022-06-27 to 2022-08-15; 29 questions; 3,312 respondents from "Emails sent to Netlify contacts"; stated bias: "Our sources of respondents were mostly already familiar with Netlify" | jamstack.org methodology PDF (Laurie Voss) | 2022-11-01 | Medium (disclosed convenience sample) |
| 2022 CMS use | WordPress 37%, headless WordPress 22%, Contentful 19%, Strapi 18%, Sanity 16%; serverless use 70% | jamstack.org/survey/2022 | 2022 | Medium |
| Netlify developers | 1 million in 2020; 5 million by end of 2024; 10 million on 2025-12-24 | Netlify blog, "Celebrating 10 million developers" | 2025-12 | Medium (vendor count) |
| Measured share | prerendered sites 0.5% of all sites, hybrid 5%; hybrid 12.7% of the top 10k; "these are rough estimates" | Web Almanac 2024, Jamstack chapter, Mike Neumegen | 2024-11-11 | High |
| CMS share | CMS-driven sites over 54% of observed sites; WordPress about 64% of CMS sites | Web Almanac 2025, CMS chapter | 2026-01-15 | High |
| Brand decline | Netlify closed the Jamstack Discord with about a week's notice; no 2023 conference; "the term seems to be dead but the tools and technologies it encompassed are still very much alive." | Brian Rinaldi, "Is Jamstack Officially Finished?" | 2023-07-26 | Medium |
| Rendering patterns | SPA 90%, SSR 59%, SSG 46% among respondents | State of JS 2024 | 2024-12 | Medium (self-selected survey) |

Strongest citation for the front door: Web Almanac 2024. Sentence it supports: "Fully
prerendered sites are about half a percent of the web, and hybrid sites about five percent,
by HTTP Archive's 2024 measurement."

---

## Section 4: small organisations with non-technical editors (shortened)

Verdict. **Cannot claim** an independent case study of a club, nonprofit, or small business
running git-backed content with non-technical editors. What exists is vendor cases and a
government platform's integration.

| Item | What it reports | Source | Citability |
| --- | --- | --- | --- |
| Te Tautiaki Hoiho, the Yellow-eyed Penguin Trust (New Zealand conservation nonprofit) | replaced a WordPress site; editors "previously had to wait on agency turnaround for basic content changes" and are now self-sufficient; first byte 42 ms | CloudCannon case study, read 2026-09-05 | Low to medium (vendor) |
| cloud.gov Pages (US federal) | "Pages recently integrated support for Decap CMS"; editors must be Pages users with GitHub write permission | docs.cloud.gov, read 2026-09-05 | High (capability), no numbers |
| 18F | a Federalist proof of concept using Netlify CMS | GitHub `18F/federalist-netlify-cms` | High (existence) |
| A personal blog migration | Netlify CMS to Tina; six-month blocker on an early Next.js router; "boring technology" lesson | Tentacle Labs, 2024-07-02 | Low (personal) |

The gap from round 2 stands: no editor-satisfaction survey for markdown against rich text,
and no independent small-organisation case.

---

## Section 5: the admin inside the application (shortened)

Verdict. **Can claim** the precedent: two of the most-used web frameworks ship or host an
admin inside the application's own codebase with a stated rationale, and the current
generation (Payload, Filament) grew fastest by doing the same. **Must state** the limit the
Django docs state themselves.

| Precedent | Rationale in its own words | Adoption | Source and date | Citability |
| --- | --- | --- | --- | --- |
| Django admin (2005) | "a quick, model-centric interface where trusted users can manage content on your site"; "recommended use is limited to an organization's internal management tool" | Django 89,939 stars | Django docs, read 2026-09-05 | High |
| Rails: Administrate (thoughtbot) | off-the-shelf dashboards "too generalized to be useful to site admins"; "Let developers override defaults in a conventional way - with common Rails controllers and views"; "all of these features are implemented in the same way that they would be in a non-admin application" | 6,031 stars; ActiveAdmin 9,708 | thoughtbot blog, "Announcing Administrate", 2015-11-03 | High |
| Payload | "Next.js native, built to run inside your `/app` folder"; "Don't sign up for yet another SaaS - Payload is open source"; MIT | 44,575 stars; 2,687,141 npm downloads last month; acquired by Figma 2025-06-17 | README and Figma blog | High |
| Filament (Laravel) | an admin panel installed into the application | 36,663,453 total installs; 3,377,964 last month | Packagist API, read 2026-09-05 | High |
| Directus (contrast) | "wraps any SQL database with a REST and GraphQL API layer and a visual Studio"; a standalone service | 37,744 stars; "500K+ projects" | README, read 2026-09-05 | High (contrast), Medium (project count) |

Strongest citation for the front door: thoughtbot, 2015-11-03. Sentence it supports: "The
Rails admin engine most used in agencies was built because generic dashboards were 'too
generalized to be useful to site admins', and its rule is that admin screens are written the
way any other screen is."

---

## Open questions and gaps this round leaves

- Charm: a maintainer statement on building with Claude was not found. If the case wants that
  sentence, the source is a talk or interview not in the public web record read here.
- Django: a per-repository resolve rate on SWE-bench Verified would turn the 231-of-500 count
  into a measured result; the leaderboard's per-instance logs would yield it.
- Supabase: the "2,500 databases a day, 60% by AI tools" figure needs a Supabase page before
  it is cited.
- Small organisations: still no independent case study; the gap should stay stated.
