# The cairn case: evidence, round 2

Research date: 2026-09-04. This round answers the round-1 review (verdict RETHINK) and the
product owner's reframing of the agent claim. Every source is one a skeptical developer would
accept, or it is labelled low and kept only to show where the weak sources are. Each item
records the claim it bears on, source, date, method and sample, the finding with numbers, the
caveats, and citability. "Not found" entries record where a search returned nothing usable.

Citability scale. High: peer-reviewed, preregistered, or controlled; a primary vendor page for a
capability fact; a named case study with stated numbers. Medium: a preprint with a stated method
and sample, or a large survey with a stated n and a disclosed convenience sample. Low: vendor
marketing, secondary blog aggregates, or an undisclosed method. Low items are kept only so the
case document does not reach for them.

---

## Priority 1: agent-assisted development, reframed

### The reframed claim

The product owner's claim is not "agents make developers productive." It is narrower. cairn
carries, by design, the parts of a site that agentic coding handles worst: authentication and
sessions, CSRF and the security invariants, the markdown editor and preview, the publish path to
GitHub, the design system and its accessibility rules, the gates and tests. What an organisation
writes on top is the shape agents handle best: a CRUD screen, a workflow, a data model, against
documented seams and a shipped skill.

That claim has two halves, and the evidence supports them unevenly. The half about where agents
fail (security, cross-file coordination, unfamiliar codebases) is well evidenced and the case can
cite it directly. The half about where agents succeed (well-scoped, single-area features with
tests present) is evidenced by the same studies read in the other direction, plus one large
observational dataset. The bridge, "and therefore cairn's partition lowers the cost," is a
design inference the case must state as an inference and then back with the in-tree measurements
in section 1E, never with the studies.

### Verdict

**Can claim.** Agents resolve local, small, single-file changes at rates far above multi-file
ones, and fail outright past a locality threshold (SWE-bench-Live: 48% for single-file patches
under five lines, under 10% for three-plus files or over 100 lines, 0% at seven-plus files).
Agents produce secure-and-correct code at low rates on security-sensitive tasks (SecureVibeBench
best case 23.8%), introduce security findings at roughly 2.7 times the human rate (CodeRabbit
2.74x, n=470 PRs; Veracode 45% of tasks across 100+ models), and the dominant agent-introduced
flaws are authorization and logic errors that pattern scanners miss (DryRun: 87% of 30 PRs).
Frontier agents drop from roughly 44% to under 18% when moved from public to proprietary
codebases (SWE-Bench Pro). Documentation alone moves agent success by one to three points;
concrete implementation patterns to copy move it four to seven (Rahman et al.). Developer-written
context files help on niche repositories (+4% average) and LLM-generated ones do not; both cost
20 to 23% more. Agent-generated PRs to real open-source projects are merged 83.8% of the time
(n=567), with refactoring, documentation, and testing the tasks maintainers accept most.

**Cannot claim.** No study measures "a scaffolded framework that owns the hard parts" as a
variable. No study prices an admin screen built on cairn against one built elsewhere. The
productivity headline numbers remain contested in both directions (RCT 55.8% faster on a
greenfield task; RCT 26% more tasks across three firms; METR 19% slower on mature repositories,
with METR's own 2026 follow-up too selection-biased to report). The case must not say agents are
faster. It may say what they are good and bad at, and what cairn therefore hands them.

### 1A. Where agents fail: locality, unfamiliar code, security

| Claim borne | Source | Date | Method and sample | Finding | Caveats | Citability |
|---|---|---|---|---|---|---|
| Success falls with patch scope | "SWE-bench Goes Live!", https://arxiv.org/abs/2505.23419 | 2025, v2 | 1,319 tasks across 93 repositories, issues from 2024-01 to 2025-04; GPT-4o, GPT-4.1, Claude 3.7 Sonnet, DeepSeek V3; OpenHands, SWE-Agent, Agentless | "a single-file patch that changes fewer than five lines is solved almost one time in two (48%)." "Once the patch edits three or more files, or spans more than one hundred lines, the success rate falls below ten per-cent." "Patches that touch seven or more files are never solved." | Models are early-2025. Later models score higher overall, and the gradient is what the case cites, not the absolute rates. | High for the gradient; label the model generation |
| Unfamiliar or proprietary code is much harder | SWE-Bench Pro, https://arxiv.org/abs/2509.16941 | 2025-09, v2 2025-11 | 1,865 problems; public set from 11 repositories, held-out set of 12, commercial set of 18 proprietary repositories | Public set: Claude Sonnet 4.5 43.6%, Sonnet 4 42.7%, GPT-5 41.8%. Commercial set: Claude Opus 4.1 17.8%, GPT-5 15.7%, Gemini 2.5 Pro 10.1%. "the best models score less than 20% in the commercial set, highlighting the difficulty of navigating enterprise codebases." | The commercial set is startup code, with tasks that may take a professional hours to days. Difficulty and unfamiliarity are confounded. | High for the gap |
| Real class-level code is far harder than benchmarks; documentation helps little, patterns help more | Rahman, Khatoonabadi, Shihab, "Beyond Synthetic Benchmarks", https://arxiv.org/abs/2510.26130 | 2025-10 | Benchmark from real open-source repositories, classes split into seen and unseen partitions | "LLMs achieve 84 to 89% correctness on synthetic benchmarks, they attain only 25 to 34% on real-world class tasks." "minimal distinction between familiar and novel codebases." Documentation: "marginal improvements (1 to 3%)." Retrieval of concrete implementation patterns: "gains (4 to 7%)." | Class-level generation, not agentic repair. This is the single most useful study for cairn's shape: an exemplar to copy beats a page to read. | High |
| Capable models reach the right code and still fail | Kim et al. (AWS AI Labs), "Coherence Collapse", https://arxiv.org/abs/2603.24631 | 2026-03, v2 2026-05 | 16,758 trajectories, three agent architectures, seven models, SWE-bench Verified and PolyBench Verified | Agents resolve 65 to 70% of SWE-bench Verified. "60–69% of failures on SWE-Agent and OpenHands reach and edit the correct functions yet still produce incorrect patches." The dominant residual is the agent overwriting or thrashing correct code. | Benchmark, not production. Supports "an edit-commit checkpoint and a test gate recover work" more than any claim about task type. | High |
| Secure-and-correct is rare on security-sensitive tasks | SecureVibeBench, https://arxiv.org/abs/2509.22097 | 2025-09, v5 2026-06 | 105 C/C++ secure-coding tasks from 41 OSS-Fuzz projects; 5 agents, 5 LLMs | "even the best-performing one, produces merely 23.8% correct and secure solutions." | C/C++ memory-safety scenarios, not web auth. Cite the shape, not the language. | High |
| AI code carries more security findings than human code | CodeRabbit, "State of AI vs Human Code Generation", https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report | 2025-12-17 | 470 open-source PRs: 320 AI-co-authored, 150 human-only; CodeRabbit's issue taxonomy | 10.83 issues per AI PR versus 6.45 per human PR (1.7x). Security issues 2.74x, "primarily involving improper password handling and insecure object references." Logic errors 75% more common. | Vendor of a review tool. Authorship inferred from co-author trailers. | Medium |
| Security flaws in a large share of generated code, unchanged by model size | Veracode, 2025 GenAI Code Security Report, https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/ | 2025-07, updated 2025-10 | 80 curated tasks, over 100 LLMs, Java, JavaScript, Python, C# | "AI-generated code introduced risky security flaws in 45% of tests." "Larger, newer AI models didn't improve security." Java worst at 72% (press release). | Security vendor. Tasks are designed to offer a secure and an insecure path. | Medium |
| Agents introduce authorization and logic flaws that scanners miss | DryRun Security, via Help Net Security, https://www.helpnetsecurity.com/2026/03/13/claude-code-openai-codex-google-gemini-ai-coding-agent-security/ | 2026-03 | Three agents (Claude Code on Sonnet 4.6, Codex on GPT-5.2, Gemini 2.5 Pro) each built two apps from scratch; 38 scans of 30 PRs | 143 issues; 87% of PRs carried a vulnerability. Classes: broken access control, OAuth flaws (missing state parameter in every social login), missing WebSocket auth, JWT secret handling. "pattern-based scanners missed the class of bugs agents produce most." | Vendor of a security tool; n=30 PRs; secondary report, primary not fetched. | Low to medium. Use only as illustration beside the peer-reviewed items |
| Agent PRs carry security smells at scale; secrets are mostly human | Sakib, Banik, Jadliwala, "Trust but Verify?", https://arxiv.org/html/2607.12428 | 2026-07 | 16,112 file changes across 4,022 PRs from five agents (AIDev dataset); LLM judge validated against 376 human-annotated changes | "38.9% of agent-generated PRs contain at least one security smell." Supply-chain integrity 82.3% of smells. "human collaborators are responsible for introducing 67.6% of genuine leaked secrets." Reviews miss 81.1% of credentials. | Preprint. LLM-as-judge. | Medium |
| Agents ignore explicit constraints and misreport completion | "How Coding Agents Fail Their Users", https://arxiv.org/html/2605.29442 | 2026-05, v2 2026-08 | 20,574 sessions, 1,639 repositories (SpecStory 14,789; SWE-chat 5,785); 16,118 validated misalignment episodes | Constraint violation 38.33% of episodes; misread intent 26.95%; inaccurate self-reporting 22.58%; faulty implementation 17.82%. "91.49% of visible resolutions still require explicit user correction." | Preprint. Episodes are detected through developer pushback, so silent failures are undercounted. | Medium |
| Agents build to the test, so the gate defines the deliverable | Ma, Kereopa-Yorke, Schultz, "Building to the Test", https://arxiv.org/abs/2606.28430 | 2026-06 | Two Copilot CLI agents (claude-opus-4.7, gpt-5.5) re-implementing a data table library under a hidden 222-test oracle, 18 runs, three oracle conditions | With the oracle in the loop the score reaches near-perfect while the library "left dead or absent." Without it, the library is present but unfinished. | Small n. One task. Cuts both ways: gates raise measured success and can hollow out the artefact. | Medium |

### 1B. Where agents succeed: local, conventional, tested, well-specified

| Claim borne | Source | Date | Method and sample | Finding | Caveats | Citability |
|---|---|---|---|---|---|---|
| Agent PRs are merged at high rates on real projects, especially refactors, docs, tests | Watanabe et al., "On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub", https://arxiv.org/abs/2509.14745 | 2025-09, v3 2026-02 | 567 Claude Code PRs across 157 open-source projects | "83.8% of these agent-assisted PRs are eventually accepted and merged by project maintainers, with 54.9% of the merged PRs are integrated without further modification." Developers favour agent assistance for "refactoring, documentation, and testing." Modifications concentrate on "bug fixes, documentation, and adherence to project-specific standards." | Self-selected: developers chose which PRs to open. Project-specific standards are the named friction, which is what a shipped skill targets. | High |
| Well-specified greenfield task, large speedup | Peng et al., https://arxiv.org/abs/2302.06590 | 2023 | RCT, n=95, one HTTP server task | 55.8% faster. | One task, one stack, 2023 tooling. | High for the number |
| Real production work, three firms | Cui et al., Management Science, https://doi.org/10.1287/mnsc.2025.00535 | 2025 | Three RCTs, pooled n=4,867 | 26.08% more completed tasks (SE 10.3%). | Completion tooling, not agents. | High |
| Large-scale session data: success does not depend on being a software engineer, does depend on domain expertise | Anthropic, "How Claude Code is used in practice", https://www.anthropic.com/research/claude-code-expertise | 2026 | ~400,000 sessions from ~235,000 people, 2025-10 to 2026-04; classifier-judged, with a "verified success" tier requiring a commit, passing tests, or explicit affirmation | Verified success in code sessions: software occupations 34%, other occupations 29%; "Every one of the ten largest occupations ... lands within seven points of software engineers." Novice sessions 15% verified success versus 28 to 33% for intermediate and expert. Sessions spent fixing broken code fell from 33% to 19% over seven months. | Vendor-published on its own product. Cannot see whether code is kept. Classifier-labelled. | Medium; the vendor caveat must ride with it |
| Agents first in a project give a front-loaded velocity gain; quality debt persists | Agarwal, He, Vasilescu, "AI IDEs or Autonomous Agents?", https://arxiv.org/abs/2601.13597 | 2026-01 | Staggered difference-in-differences on AIDev repositories with matched controls | Velocity gains large only when the agent is the first AI tool; static-analysis warnings up ~18% and cognitive complexity up ~39% across settings. | Preprint. Sample size not in abstract. | Medium |
| Agent-written code needs less maintenance than human code afterwards | Sawada et al., EASE 2026, https://arxiv.org/abs/2605.06464 | 2026-05 | Over 1,000 files, ~3,200 changes, 100 popular repositories (AIDev) | AI-generated files receive less frequent maintenance; the commonest follow-up is feature extension, not bug fixing; humans do most of that maintenance. | Newer code has had less time to need maintenance. | Medium to high (peer-reviewed venue) |
| A solo developer with agents delivered a four-person project in a regulated brownfield enterprise | Vilas Boas et al., "One Developer Is All You Need", https://arxiv.org/abs/2605.18461 | 2026-05 | Single case study, spec-driven workflow, four AI agents, one staff engineer | Delivered "in half the planned time"; "90% acceptance of AI-generated code on first review"; "above-85% reduction in direct staffing cost." "specification quality and institutional knowledge, not model capability" were the binding constraints. | One case, authors are the practitioners, duration not in abstract. | Medium; cite as one case only |
| Adoption is now near-universal among professionals | JetBrains Developer Ecosystem Survey 2026, https://blog.jetbrains.com/research/2026/08/ai-coding-agent-adoption-2026/ | 2026-08 | 15,000+ professional developers, fielded 2026-05 to 2026-07 | 90% use AI coding agents at least weekly; 68% daily. Claude Code 39% globally. | Vendor survey, self-selected. Adoption is not efficacy. | Medium for adoption only |

### 1C. Context files and documentation, the direct test of "documented seams and a shipped skill"

| Claim borne | Source | Date | Method and sample | Finding | Caveats | Citability |
|---|---|---|---|---|---|---|
| Developer-written context files help on unusual repositories; generated ones do not; both cost more | "Evaluating AGENTS.md", https://arxiv.org/html/2602.11988v1 | 2026-02 | SWE-bench Lite (300 tasks, 11 popular Python repositories, no context files) and AGENTbench (138 instances, 12 niche Python repositories with developer-written files); Claude Code on Sonnet 4.5, Codex on GPT-5.2 and 5.1-mini, Qwen Code | LLM-generated context files reduce resolution by 0.5% and 2% on the two sets. Developer-provided files improve three of four agents on AGENTbench, "an increase of 4% on average." Steps rise by 2.45 and 3.92, "a cost increase of 20% and 23%." Recommendation: include "only minimal requirements (e.g., specific tooling to use with this repository)." | Round 1 summarised this as a null; the primary is more specific. The signal is that a file earns its place by carrying what the code does not already say. | High |
| Agents read agent-facing files, not human docs | Gao and Chen (Peking University), https://blog.pebblous.ai/report/agent-facing-documentation-behaviour-2026-08/en/ | 2026-08-20 | 557 sessions (94,813 events, 3,033 documentation interactions) and 33,097 agent PRs from 116,211 repositories | 60.5% of document openings were agent-facing instruction files; 1.3% were API references. Running tests after consulting documentation had an adjusted odds ratio of 0.39. | Preprint hosted on a company blog; 87% of the corpus is one agent family; the authors flag instrument limits. | Medium |
| Context files at scale mostly restate what linters enforce | "Configuration Smells in AGENTS.md Files", https://arxiv.org/abs/2606.15828 | 2026-06 | 100 popular repositories | 91 of 100 show at least one smell; "Lint Leakage" most common (62). | Descriptive. | Medium |
| DORA: AI amplifies the system it lands in; version control and small batches are named capabilities | DORA 2025 and the AI Capabilities Model, https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report and https://dora.dev/ai/capabilities-model/report/ | 2025-09 | Nearly 5,000 technology professionals | "90% of survey respondents report using AI at work." Positive relationship between AI adoption and throughput in 2025 (reversed from 2024), "AI adoption does continue to have a negative relationship with software delivery stability." The seven capabilities: clear AI stance, healthy data ecosystems, AI-accessible internal data, strong version control practices, working in small batches, user-centric focus, quality internal platforms. | Organisational survey. Extending "quality internal platform" to "a library with documented seams" is the case's inference, not DORA's. | Medium to high; state the inference openly |

### 1D. The strongest counter-evidence, stated in full

| Claim it attacks | Source | Date | Method and sample | Finding | Best answer or concession | Citability |
|---|---|---|---|---|---|---|
| Any speed claim | METR, early-2025 RCT, https://arxiv.org/abs/2507.09089 | 2025-07 | 16 developers, 246 issues, mature repositories | 19% slower (CI +2% to +39%), while believing 20% faster. | Concede the number. Note METR's own moderators: deep tenure, implicit standards, high quality bars. The reframed claim does not rest on speed. | High |
| The 2026 "it has flipped" narrative | METR, "We are Changing our Developer Productivity Experiment Design", https://metr.org/blog/2026-02-24-uplift-update/ | 2026-02-24 | 57 developers, 143 repositories, 800+ tasks from 2025-08 | Original developers: "-18% ... between -38% and +9%"; new developers: "-4% ... between -15% and +9%." "30% to 50% of developers told us that they were choosing not to submit some tasks because they did not want to do them without AI." METR: "we believe it is likely that developers are more sped up ... now." | Do not cite any 2026 uplift number. There is none METR stands behind. A skeptic will cite this page if the case cites a self-report. | High |
| Self-reported gains | METR self-report survey, https://metr.org/blog/2026-05-11-ai-usage-survey/ | 2026-05 | 349 technical workers, convenience sample | Median self-reported speed change 3x; value change 1.4 to 2x; METR: "we are confident that ... the participants are overstating." | Never cite a self-reported multiplier. | High as a warning |
| Long-run quality of AI-assisted code | Borg et al., "Echoes of AI", https://arxiv.org/abs/2507.00788 | 2025-07, v 2026-02 | Two-phase controlled experiment, RCT in phase 2, 151 participants, 95% professionals, Java web app | Phase 1: 30.7% median time reduction. Phase 2 (others evolving the code): "no significant differences ... with respect to completion time or code quality." | The neutral result is a fair answer to "AI code is unmaintainable." It does not support a speed claim for the evolved code. | High |
| Skill formation | Shen and Tamkin (Anthropic), https://www.anthropic.com/research/AI-assistance-coding-skills and https://arxiv.org/abs/2601.20245 | 2026-01-28 | RCT, 52 mostly junior engineers learning Trio | "the AI group averaged 50% on the quiz, compared to 67% in the hand-coding group" (d=0.738, p=0.01). Time difference about two minutes, not significant. Delegation patterns scored under 40%; conceptual-inquiry patterns 65%+. | Concede. A club with one developer should read this before delegating the parts they must later maintain. | High |
| Review burden and technical debt | Agarwal et al. above (+18% warnings, +39% complexity); CodeRabbit above (1.7x issues) | 2025 to 2026 | As above | As above | Concede that review is the new cost. cairn's answer is structural: the gates run in the chain, and the skill carries a grader prompt. State it as mechanism. | Medium |
| Trust | Stack Overflow 2025, https://survey.stackoverflow.co/2025/ | 2025 | Over 49,000 responses, 177 countries | Highly trust 3.1%; somewhat trust 29.6%; somewhat distrust 26.1%; highly distrust 19.6%. Agents daily 14.1%, weekly 9%; "No, and I don't plan to" 37.9%. | Sentiment backdrop. The 2026 survey is in the field; do not cite 2026 numbers. | High for the numbers |

### 1E. In-tree quantification: "already easy to extend", as measurements

All counts by `wc -l` and `find` on 2026-09-04. Line counts include comments and blank lines.

**The showcase's worked custom screen.** `examples/showcase/src/routes/admin/signups/` is two
files, 90 lines: `+page.server.ts` (45) and `+page.svelte` (45). It imports from three engine
subpaths: `@glw907/cairn-cms/sveltekit` (`requireOwner`), `@glw907/cairn-cms/admin-toolkit`, and
`@glw907/cairn-cms/components`. Its table is nine lines of SQL,
`examples/showcase/migrations-app/0000_signups.sql`. The whole `/admin` mount in the showcase is
six files: the two signups files, a `+layout.server.ts`, a `+layout.svelte`, and the catch-all
`[...path]` pair that hands everything else to the engine. The Waymark template ships the same
screen at the same size (`templates/waymark/src/routes/admin/signups/`, 45 + 45 lines) plus an
11-line `admin-link.ts`, 162 lines for the entire admin mount including the worked example.

**What the skill hands an agent.** `skills/cairn-admin-screens/` is 1,255 lines in eight files.
`SKILL.md` (114 lines) carries six sections: Tier map (the 28 `cairn-audit` rules across static
and rendered modes, 12 static all error tier, 16 rendered with 7 error and 9 advisory), Screen
anatomy, Component contracts, Register rules, The done-gate, and References. The references,
loaded on demand: `exemplar-list.md` (212 lines: header with one filled action, toolbar with
search and facets and count line, the row register, the standing chip, expand-in-place panel,
pagination), `exemplar-detail.md` (206: identity header, the card shell recipe, section with
heading and one light verb, the dialog with one filled action, an inline label beside a
checkbox), `form-anatomy.md` (151: three label levels, row and group spacing, the
composition-width rule, the submission row), `extension-grammar.md` (149: when a component the
toolkit does not ship is needed, the ladder, a worked destination-picker derivation, the
graduation loop), `grader-prompt.md` (153: inputs, reading discipline, checklist, per-device
verdicts, overall verdict, tells, output shape), and `craft.md` (252: tokenize, the numeric rule,
before/after only when demonstrable, the audit rule). The Rahman et al. finding above is the
reason this matters: concrete patterns to copy moved success 4 to 7 points where documentation
moved it 1 to 3, and two of the skill's six references are annotated exemplars.

**The production case: aksailingclub-org.** Read-only survey of
`/var/home/glw907/Projects/aksailingclub-org` at commit `836d324` (2026-08-30). The site runs
`@glw907/cairn-cms ^0.96.0` (`package.json:48`). First commit 2026-07-06 ("scaffold the ASC site
on the cairn chassis"); 838 commits, 688 in July and 150 in August 2026.

What the site built on top of the engine, in files and lines (`.ts` and `.svelte`, tests
excluded):

| Area | Path | Files | Lines |
|---|---|---|---|
| Club admin screens (routes) | `src/routes/admin/club/` | 56 | 12,415 |
| Club admin library | `src/admin-club/` | 35 | 8,930 |
| Member portal routes, join, classes, events, Stripe webhook | `src/routes/(site)/my-account`, `join`, `classes`, `events`, `api/stripe` | 38 | 7,208 |
| Member portal library | `src/member-portal/` | 29 | 4,997 |
| Member login | `src/member-auth/` | 7 | 914 |
| Member signup | `src/member-signup/` | 5 | 610 |
| Jobs | `src/jobs/` | 6 | 814 |
| Theme | `src/theme/` | 52 | 8,689 |
| Chassis (copied from the showcase) | `src/chassis/` | 7 | 279 |
| All source, tests excluded | `src/` | 261 | 46,948 |
| Tests | `src/tests/`, `e2e/` | 184 | 33,499 |

The club admin has eleven areas under `src/routes/admin/club/`: announce, asset-requests,
assets, classes (with new, waitlist, and detail), committees, documents (with member, signature,
and certificate views), email (with compose and detail), events, members, money, settings. The
member portal under `src/routes/(site)/my-account/` has ten: classes, committees, confirm,
directory, finish-joining, household, profile, renew, sign, storage. D1 migrations: 172 files
across `migrations/`, `migrations/asc-auth`, and `migrations/asc-club`.

Engine reuse, counted as import statements: 201 across eleven subpaths. `sveltekit` 57,
the root 44, `admin-toolkit` 27, `delivery` 22, `components` 18, `cloudflare` 11, `media` 9,
`delivery/head` 6, `auth-crypto` 4, `render` 2, `delivery/data` 1.

One correction to the round-1 review. ASC's member login is not `createAuthChannel`. It is a
site-owned module, `src/member-auth/lib/auth.ts`, whose header says it "Mirrors
@glw907/cairn-cms's own auth discipline throughout" and that "The cryptographic primitives
underneath are now the engine's own, from `@glw907/cairn-cms/auth-crypto`," with the cookie
names, the 15-minute token TTL, and the `member_sessions`/`member_tokens` store staying
site-owned. It predates the `auth-channel` subpath, which the extend doc now recommends. The case
can say the site built its member login in 914 lines on the engine's crypto, and that the engine
later shipped the seam that would make it smaller. It cannot say ASC uses `createAuthChannel`.

How it was built, from the repo's own records. `docs/plans/` holds 31 plans dated 2026-07-07 to
2026-08-25. `docs/` holds 10 harvest-findings documents (engine feedback banked per pass) and
four consultation or prep briefs (`2026-07-13-cairn-editor-roles-consumer-brief.md`,
`2026-07-18-cairn-sidebar-seams-consumer-brief.md`, `2026-08-25-email-announce-prep-brief.md`,
`2026-08-26-csrf-referrer-prep-brief.md`). `docs/HISTORY.md` records eight pass entries since
2026-08-07; earlier passes live in `docs/status-archive.md`. Recorded spend, in agent tokens, for
the passes that recorded it: events-redesign, ceiling 1.5M raised to 2.2M, spend about 2.1M;
events-admin, ceiling 2M, spend about 3.5M; assets-register, ceiling 1.5M, about 1.35M through
six tasks plus about 2.1M in the close; email-announce, 11 tasks, run overnight (spend line not
extracted). The `cairn-0.95-adoption` plan set a 3M ceiling. HISTORY records human interaction
points per pass in single digits (for example email-announce: "one proceed-to-completion
reconfirmation, one 'what's the next pass' question, two continue nudges; zero mid-execution
questions"). No wall-clock hours are recorded anywhere in the repo. The overruns are recorded
against their causes: "Tokens ran far over because the build was right on its contract and wrong
on its mechanics: five reviewers and two cold reads found what the plan's text-asserting tests
could not."

What the record also shows, and the case must carry. The pre-cutover blocker in `docs/STATUS.md`
is a CSRF defect: the site's blanket `Referrer-Policy: no-referrer` nulls `Origin` on plain form
POSTs, and cairn's CSRF guard rejects them, so member sign-in fails in real browsers on dev,
across 40 forms, "invisible to every prior test." This is the reframed claim's own thesis
observed in the wild: the engine held the security invariant, the site's code tripped it, and
the gate that caught it was a real-browser e2e, not a unit test. It is also the honest cost: the
seam between engine invariant and site code is where the bugs live. The same STATUS records a
measured Email Sending quota of 200 sends per day on the account.

### The narrowest claim the evidence sustains, and the skeptic's reply

**The claim.** Coding agents succeed most on small, local, well-specified changes in code that
carries concrete patterns to copy and tests that define done, and fail most on cross-file
coordination, unfamiliar codebases, and security-sensitive logic, so a framework that owns the
security invariants, the editor, the publish path, and the gates, and hands the developer a
documented seam with a worked example, is handing agents the work they are measured to do best.

**The skeptic's sentence.** No study has measured that framework, the same studies show agents
merged 83.8% of the time only when a human chose what to ask for and modified 45% of what came
back, and the one production case this repository can point to recorded token spend at
1.4 to 1.75 times its own ceilings, a 47,000-line site, and a security defect at exactly the seam
the claim calls safe.

### Strongest citation for the front door

"SWE-bench Goes Live!" (arXiv 2505.23419), 1,319 tasks across 93 repositories: single-file
patches under five lines are solved 48% of the time, patches touching three or more files or over
100 lines fall below 10%, and patches touching seven or more files are never solved. **Supports
this sentence:** "Agents do their best work on small, local changes; cairn's seams are built so
that a site's own screen is one."

---

## Priority 2: git-managed markdown content

### Verdict

**Can claim.** The mechanism is a documented category pattern (Decap, Tina, Pages CMS,
Keystatic). Every scale and concurrency ceiling is a GitHub-documented number. The category's
own tracked issues admit the concurrency and merge-conflict costs. The WordPress maintenance
burden now has two sample-stated sources beyond the vulnerability count: Patchstack's 2025
full-year figures (11,334 vulnerabilities, 46% unpatched at disclosure, median five hours to
first exploitation) and Melapress's 2025 survey (n=264, 64% experienced a breach).

**Cannot claim.** There is still no survey of non-technical editors' satisfaction with markdown
versus rich text, no churn data for git-based CMSs with a stated n, and no independent
measurement of WordPress maintenance hours. The strongest evidence of git-CMS editor churn is a
competitor's self-report. The "59% of plugins abandoned" figure has no primary source and must
not be used.

### Evidence

| Claim borne | Source | Date | Method and sample | Finding | Caveats | Citability |
|---|---|---|---|---|---|---|
| The leading git CMS stalled after its 2023 handover | Netlify, "Netlify CMS to Become Decap CMS", https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/; Decap, https://decapcms.org/blog/2023/02/introducing-decap/ | 2023-02 | Vendor announcements | Netlify transferred the project to PM (a Slovenian agency) in February 2023. | Establishes the handover only. | High for the fact |
| Users migrated away, and why | Sveltia CMS, "Successor to Netlify CMS", https://sveltiacms.app/en/docs/successor-to-netlify-cms | Read 2026-09-04 | Competitor's own page | "Netlify CMS progress was stalled for more than six months" by 2022-11; "it took six months to ship the first release (v3.0) under the new name"; "Over one-third of Sveltia CMS users migrated" from Netlify or Decap; 325+ Netlify/Decap issues addressed. | A competitor's self-report with no n. Use only for the timeline, never for the share. | Low for numbers, medium for dates |
| Concurrency and conflict costs are the category's own open issues | Decap issues #1691 and #277 (round 1) | Open | Tracker | Merge conflicts cannot be resolved in the CMS; no presence indication. | Unchanged from round 1. | High |
| Tina is alive and priced for teams | TinaCMS, https://tina.io/blog/Pricing-Updates-its-now-cheaper-to-use-Tinas-best-feature- | 2024 to 2025 | Vendor | SSW acquired TinaCMS in 2024-05; Business plan cut from $599 to $299 a month; a $49 Team Plus tier gates editorial workflow. | Shows the category's commercial shape: editorial workflow is a paid feature elsewhere. | Medium |
| WordPress ecosystem vulnerability volume, 2025 | Patchstack, "State of WordPress Security in 2026", https://patchstack.com/whitepaper/state-of-wordpress-security-in-2026/ | 2026 | Disclosure database, calendar 2025 | 11,334 new vulnerabilities (up 42% on 7,966); 91% plugins, 9% themes, 6 in core, all low risk; 1,966 (17%) high severity; 46% unpatched at disclosure; among heavily exploited flaws, 20% exploited within six hours, 45% within 24 hours, weighted median five hours. | Security vendor. Counts disclosures, not incidents on small sites. | Medium to high for the counts |
| Breach experience among WordPress professionals | Melapress WordPress Security Survey 2025, https://melapress.com/wordpress-security-survey-2025/ | Fielded 2025-05-14 to 2025-07-29 | n=264 developers, owners, admins, agencies; convenience sample at WCEU, social, email | 64% experienced at least one breach; 96% encountered a security incident under a broad definition; 30% of those with hacked accounts had no account security controls. | Small, self-selected, security vendor. | Low to medium |
| Plugin removals for unpatched issues | Cited in secondary aggregates from Patchstack | 2024 to 2025 | Not fetched from a primary | "1,614 plugins and themes removed in 2024"; "over 150 in December 2025." | **Not verified against a primary page.** | Low until fetched |
| Plugin abandonment share | fuadalazad.com, https://fuadalazad.com/wordpress-plugin-crisis/ | 2025 | Blog; "according to WordPress.org and WPExperts" with no dataset | "34,000+ plugins (59.3%) haven't been updated in two years or more." | No method, no date, no query. **Do not cite.** | Low |
| WordPress maintenance hours and costs | Agency pricing pages (Wired Impact, Codeable, FatLab) | 2025 to 2026 | Marketing pages | "3 to 5 hours per month" DIY; care plans $30 to $500+ a month; nonprofit plans $200 to $500. | Vendor pricing, no sample. **Do not cite as measurement.** Cite as "agencies price it" only. | Low |
| Scale ceilings | GitHub limits (round 1) | 2026 | Vendor docs | 5,000 API requests an hour per installation; repository under 1 GB recommended; files blocked above 100 MiB. | Unchanged. | High |

Not found: any survey with a stated n on editors' experience of markdown versus WYSIWYG; any
churn or retention data for Decap, Tina, or Keystatic beyond npm downloads; any independent
measurement of WordPress maintenance hours for small organisations; any peer-reviewed study of
plugin abandonment.

### Counter-arguments and best answers

1. **A content database gives structured content, relations, localisation, workflow, permissions,
   and search.** All true, and the round-1 review already listed what cairn lacks (enforced
   validation at the store, real-time referential integrity, transactions, per-row permissions,
   reads without a network hop). Best answer: state them as the price, then state what the
   fixed-concept design gives back in the same voice: no content server to run, no content
   migration on engine upgrade, history and attribution from git, and a body a human can read
   without the tool. No source ranks these; the case must not pretend one does.
2. **Non-technical editors struggle with git-backed tools.** No survey exists either way. Best
   answer: cairn's editors never see git (the App commits on their behalf), and the category's
   documented failures (Decap #1691, #277) are about concurrent editing, which cairn handles by
   refusing the second write (`commit.failed`, `reason: conflict`). Concede that a busy multi-editor
   document is not this shape.
3. **The leading git CMS stalled, so the category is fragile.** Concede the Decap timeline. Best
   answer: cairn's content is plain files in the organisation's repository, so the CMS stalling
   leaves the content readable and the site building; that is the design's answer to exactly this
   risk. Say it as mechanism.
4. **WordPress's burden is a vendor's number.** Concede that Patchstack and Melapress sell
   security. Best answer: cite the disclosure counts and the exploitation timings as counts, and
   pair them with the register-safe structural fact that a cairn site has no plugin surface to
   patch, then stop.
5. **Erasure.** Personal data in git history is hard to remove. Concede fully; no source needed.
   Best answer: content files carry site content, member data lives in D1 with `DELETE`, and the
   case should say where personal data belongs.

### Strongest citation for the front door

Patchstack, State of WordPress Security in 2026: 11,334 new vulnerabilities in 2025, 91% in
plugins, 46% unpatched at public disclosure, median five hours to first exploitation among
heavily exploited flaws. **Supports this sentence:** "A cairn site has no plugin surface: the
content is files, the code is the site's own, and the engine updates through npm."

---

## Priority 3: the single platform and its counter

### Verdict

**Can claim.** Every capability fact is a primary vendor page with a number. The concentration
risk is documented by Cloudflare's own postmortems, with dates and durations, and by its status
API, which shows 16 incidents in the most recent window alone. Cloudflare has published a
resilience plan with a Q1 2026 target.

**Cannot claim.** No study measures multi-vendor operational cost for small teams; every source
found is vendor marketing ("replace 4 to 6 vendors with one"). The case must state the
consolidation as a count of accounts and bills, never as a measured saving. Email Sending is
still marked "Beta" on Cloudflare's own product page (updated 2026-06-09), and the pricing page
requires Workers Paid for arbitrary recipients.

### Cloudflare incident record, primary sources

| Date | Source | Duration | Cause | Affected |
|---|---|---|---|---|
| 2025-06-12 | Cloudflare blog, tag "outage" | Up to 2 h 28 min | Not extracted | Workers KV, Access, WARP, dashboard |
| 2025-07-14 | Same | 62 min | Service topology change | 1.1.1.1 resolver |
| 2025-09-12 | Same | About 1 h | Not extracted | Dashboard and APIs; cached serving unaffected |
| 2025-11-18 | https://blog.cloudflare.com/18-november-2025-outage/ | 11:20 to 17:06 UTC (5 h 46 min to full restoration; Cloudflare's own resilience post says "approximately two hours and ten minutes" for the global outage) | Database permissions change doubled a Bot Management feature file, exceeding a limit | Core CDN and security, Turnstile, Workers KV (elevated 5xx), dashboard, Access, Email Security partial |
| 2025-12-05 | Cloudflare blog; https://blog.cloudflare.com/fail-small-resilience-plan/ | About 25 min from 08:47 UTC | Configuration change while mitigating an industry-wide vulnerability; a killswitch applied to a rule with an `execute` action | "28% of applications behind our network" |
| 2026-02-20 | https://blog.cloudflare.com/cloudflare-outage-february-20-2026/ | 17:48 to 23:03 UTC, 6 h 7 min | BYOIP pipeline change withdrew routes via BGP | 25% of ~4,306 BYOIP prefixes; not a Workers incident |
| 2026-08-26 to 2026-09-04 | https://www.cloudflarestatus.com/api/v2/incidents.json (earliest entry in the payload 2026-08-26) | Various | Various | 16 incidents in the window, including Durable Objects errors (2026-08-26, 1 h 22 min), Workers Builds degraded (2026-08-27, 1 h 39 min), Workers KV errors in Western Europe (2026-08-31, 4 h), an HTTP/3 issue on R2 custom domains (2026-08-31 to 2026-09-03), Durable Objects errors in Western North America (2026-09-02, 1 h 4 min), Workers Builds queue times (2026-09-03 to 09-04, 4 h 34 min) |

The "13 outages in 8 days" August 2026 claim comes from shattered.io, a secondary aggregator; the
status API's payload begins 2026-08-26, so the earlier August incidents were not verified
against a primary. Cite only the rows above.

Cloudflare's own response: "Code Orange: Fail Small" (2025-12-19) commits to Health Mediated
Deployments for all production configuration, failure-mode reviews between critical services,
and break-glass procedure fixes, "By the end of Q1, and largely before then."

### Capability facts a skeptic will cite, each to a primary URL

| Fact | Number | URL |
|---|---|---|
| Workers Free requests | 100,000 a day | https://developers.cloudflare.com/workers/platform/limits/ |
| Workers CPU time per invocation | Free 10 ms; Paid 30 s default, 5 min maximum | Same |
| Workers memory and bundle | 128 MB; 64 MiB compressed | Same |
| Subrequests | Free 50 per request; Paid 10,000 | Same |
| D1 database size | Free 500 MB; Paid 10 GB | https://developers.cloudflare.com/d1/platform/limits/ |
| D1 databases per account | Free 10; Paid 50,000 | Same |
| D1 concurrency | "Each individual D1 database is inherently single-threaded, and processes queries one at a time." Query timeout 30 s. | Same |
| R2 free tier | 10 GB-month, 1M Class A, 10M Class B | https://developers.cloudflare.com/r2/pricing/ |
| R2 prices | $0.015 per GB-month; $4.50 per million Class A; $0.36 per million Class B | Same |
| R2 egress | "Egressing directly from R2 ... does not incur data transfer (egress) charges and is free." | Same |
| Email Sending status | "Email Sending Beta for outbound transactional emails" (page updated 2026-06-09) | https://developers.cloudflare.com/email-service/ |
| Email Sending plan | "Sending to arbitrary recipients requires the Workers Paid plan"; 3,000 included a month; $0.35 per 1,000 beyond | https://developers.cloudflare.com/email-service/platform/pricing/ |
| Email Sending daily quota | "New accounts start with a conservative daily quota and scale up over time"; 50 recipients per email; 5 MiB message | https://developers.cloudflare.com/email-service/platform/limits/ (ASC measured 200 a day, `docs/STATUS.md`) |
| Email Sending scope | No list management, unsubscribe, bounce suppression, or campaign features appear on the limits or pricing pages | Same pages, by absence |
| WAF on Free | "Free Managed Ruleset only"; custom rules yes; rate limiting "Yes (one rule)" | https://developers.cloudflare.com/waf/ |
| Workers Paid | $5 a month per account (round 1, `docs/admin/before-you-start.md`) | Vendor pricing page not re-fetched this round |

### Counter-arguments and best answers

1. **One vendor is a single point of failure.** Concede with the table. Best answer: the same is
   true of any hosted CMS plus its host; the honest difference is that a multi-vendor shape fails
   in parts and a single-platform shape fails whole. Say that in one sentence and name the
   2025-11-18 duration.
2. **Consolidation savings are unmeasured.** Concede. State the count of accounts (one platform
   account, one repository host, one payments provider, one mail provider) and stop.
3. **Cloudflare's limits are real ceilings.** Concede with the table. D1 single-writer and 10 GB
   are the ones a skeptic reaches for; both sit far above an organisation's site and both are
   documented, so the case can name them.
4. **Email Sending is beta and paid.** Concede both, cite both pages. Do not list "announcements"
   as a platform capability; list "a transactional send primitive" and put list management on the
   developer's side of the boundary, which is where `announce-on-publish.md` already puts it.

### Strongest citation for the front door

Cloudflare's 2025-11-18 postmortem: 11:20 to 17:06 UTC, a Bot Management feature file doubled in
size after a database permissions change, and CDN, Turnstile, Workers KV, Access, and the
dashboard failed together. **Supports this sentence:** "One platform is one account and one bill;
it is also one outage."

---

## Priority 4: the page-builder point

### Verdict

**Can claim.** Builder markup lives inside the content (WordPress's own block-markup
documentation, round 1). Elementor to Gutenberg migration has no automated path and is rebuilt
page by page (agency and service pages, consistent across sources). Elementor runs about 31% of
WordPress sites (W3Techs, round 1). Block editor satisfaction is net positive in WordPress's own
2023 survey (45.1% agree, 28.6% disagree, n=3,922).

**Cannot claim.** No survey with a stated n measures builder lock-in or migration regret. No
WordPress annual survey later than 2023 was found; the 2024 results do not appear to have been
published, so the 2023 numbers are the latest official ones. The round-1 Classic Editor and
Gutenberg-plugin citations stay cut, per the review.

### Evidence

| Claim borne | Source | Date | Method and sample | Finding | Caveats | Citability |
|---|---|---|---|---|---|---|
| Builder migration is manual | developress.io, benryan.com.au, wordherd.io, anubizhost.com (agency and service pages) | 2025 to 2026 | Practitioner pages | "No reliable automated migration tools exist as of 2025"; "each page or template must be recreated"; services from $199. | No sample. Consistent across independent practitioners, which is the most the record offers. | Low to medium; cite as "practitioners report", never as data |
| Core block markup is portable HTML with comment delimiters | WordPress developer docs (round 1) | 2026 | Vendor docs | Blocks serialize as HTML with `<!-- wp:... -->` delimiters. | The review's point stands: core block content is arguably more portable than a cairn directive. Concede it. | High |
| Builders are a mainstream choice | W3Techs (round 1) | 2026-09 | Crawl | Elementor 12.8% of all sites, ~31% of WordPress sites. | Unchanged. | High |
| Block editor satisfaction | WordPress 2023 Annual Survey, https://wordpress.org/news/2024/02/2023-annual-survey-results-and-next-steps/ | 2024-02 | n=3,922 | Site Editor meets needs: 45.1% agree, 26.3% neutral, 28.6% disagree; block editor use about 60%. | Latest official survey found. Self-selected community sample. | High for the numbers |
| ACF blocks outpace native blocks among developers | ACF 2025 Annual Survey, https://www.advancedcustomfields.com/annual-survey/2025-results/ | 2025 | Vendor survey, n not extracted | Over half use ACF Blocks; native blocks 24.04%; custom React blocks 9.41%. | Vendor's own user base. | Low |

Not found: any migration-tool telemetry or agency dataset with a stated n on pages converted or
hours per page; a WordPress annual survey after 2023.

### Counter-arguments and best answers

1. **Editors like builders; adoption proves it.** Concede with the W3Techs and 2023 survey
   numbers. Best answer: the case's point is not that builders are disliked; it is that layout
   stored in content ties content to the builder, which WordPress's own markup docs show. Keep the
   mechanism, drop any satisfaction argument.
2. **Core block markup is portable.** Concede, as the review demanded. Narrow the claim to
   proprietary builder JSON, and admit cairn directives are inert text outside cairn.
3. **A club wants one bespoke page for the regatta.** Concede (review 6.4). A directive vocabulary
   the developer extends is the answer, and it needs the developer.

### Strongest citation for the front door

WordPress's block markup documentation (round 1): block content is stored in `post_content` as
HTML comment delimiters carrying JSON attributes. **Supports this sentence:** "A page builder
stores layout inside the content; markdown with frontmatter stores what the page says and leaves
how it looks to the site's code."

---

## Priority 5: cairn-specific verifications, quoted by path

**`docs/extend/add-a-second-audience.md`.** Two paths. Path A, "A staff-shaped audience who
should still use your magic-link sign-in, restricted to one corner of the admin," uses a role
with `capability: 'none'` and its own `home`; "they're still rows in your `AUTH_DB` editor table."
Path B, "A genuinely separate population, with its own identity and its own volume. Members,
athletes, customers," uses `createAuthChannel`, "a wholly separate login with its own D1 store,
its own session, and its own area outside `/admin` entirely. Price: you build and own that area
yourself; nothing here plugs into `CairnAdminShell`, since that shell renders a cairn editor
session and this audience isn't one." The channel is "backed by a D1 binding that is never
`AUTH_DB`," with the worked example binding `MEMBER_DB` and a separate `migrations-members`
directory. So: members get a separate login, a separate session cookie, a separate store, and a
member area the site builds outside `/admin`. The review's reading is exact.

**`docs/extend/announce-on-publish.md`.** "The engine sends nothing over the network on its own.
It ships the diffing logic that tells you which entries are newly public; what you do with that
list, and when your code runs it, is entirely yours to build." The seam is `diffNewlyPublished`,
"pure: no I/O, no clock read," and "The engine keeps no state across deploys," so persisting the
prior manifest "is your job." Renames and delete-then-recreate both read as new publishes. So the
engine ships a manifest diff and nothing that sends.

**`skills/cairn-admin-screens`.** One skill, eight files, 1,255 lines, sections listed in 1E.
Its frontmatter description: "Build or review a screen inside a cairn site's /admin, to the
register cairn's own admin holds itself to. Load before touching anything under /admin routes,
admin-toolkit components, or cairn-admin.css. Points at cairn-audit's mechanical checks and
cairn-audit norms rather than restating them." It installs to `.claude/skills/cairn-admin-screens/`
in the consuming repository through `cairn-doctor --fix` (round 1,
`src/lib/doctor/check-skill.ts:15`). "Ships agent skills" is plural only across the six
reference files inside this one skill.

---

## The ten findings that most change the case, ranked

1. **The locality gradient is the reframed claim's best evidence.** SWE-bench-Live: 48% on
   single-file patches under five lines, under 10% at three-plus files or 100-plus lines, never
   at seven-plus files. The case can say what agents are good at without saying they are fast.
2. **Exemplars beat documentation, measured.** Rahman et al.: documentation +1 to 3 points,
   concrete implementation patterns +4 to 7. Two of the skill's six references are annotated
   exemplars, and the showcase's worked screen is 90 lines. The case can now argue the skill's
   shape from evidence, not taste.
3. **Security is where agents fail, in three independent measurements.** SecureVibeBench 23.8%
   secure-and-correct at best; CodeRabbit 2.74x security issues (n=470); Veracode 45% across
   100+ models with no improvement from model size. This is the strongest support for "cairn
   owns auth, CSRF, and the invariants."
4. **The production case has real numbers and a real defect at the seam.** ASC: 46,948 source
   lines and 33,499 test lines built on the engine in eight weeks, 201 engine imports across
   eleven subpaths, 31 plans, 10 harvests, token overruns of 1.4 to 1.75x recorded against
   ceilings, and a CSRF blocker where the site's `Referrer-Policy` tripped the engine's guard.
   The case gains a measured example and must carry the defect.
5. **ASC's member login is site-owned, not `createAuthChannel`.** 914 lines on the engine's
   `auth-crypto`, built before the seam shipped. The case can cite it as "built on the engine's
   crypto," never as the seam in use.
6. **Context files are specific, not null.** Developer-written files +4% on niche repositories;
   LLM-generated files negative; both cost 20 to 23% more. The recommendation is minimal,
   non-obvious content. That supports a short skill that points at gates rather than restating
   them, which is what `SKILL.md` says it does.
7. **METR's 2026 follow-up gives no uplift number.** Selection bias of 30 to 50% task withholding;
   point estimates still negative with wide intervals. Any "it has flipped" sentence is
   unsupported and a skeptic will quote METR back.
8. **Email Sending is still Beta, paid, and quota-limited.** Product page says "Beta" as of
   2026-06-09; Workers Paid required; 3,000 a month included; daily quota starts "conservative"
   (ASC measured 200 a day). "Announcements" cannot be listed as a platform capability.
9. **Cloudflare's incident record is dense and primary.** Six postmortems in fourteen months, the
   longest 6 h 7 min (BYOIP) and 5 h 46 min (2025-11-18), plus 16 status incidents in the ten days
   to 2026-09-04. The single-vendor drawback needs the table, not a sentence.
10. **The WordPress burden argument now has a full-year 2025 figure and an exploitation timing.**
    11,334 vulnerabilities, 46% unpatched at disclosure, median five hours to first exploitation.
    The "59% abandoned plugins" number has no primary source and is dropped.

## Where searches found nothing

- A controlled study of agent success conditioned on framework scaffolding, test coverage, or
  documentation quality as an isolated variable. Nearest: Rahman et al. (documentation versus
  retrieval) and the AGENTS.md evaluation (context files by repository type).
- A study pricing custom-code development on a scaffolded stack against configuring a product.
- A survey with a stated n on non-technical editors' experience of markdown versus rich text.
- Churn or retention data for git-based CMSs.
- An independent measurement of WordPress maintenance hours for small organisations.
- A peer-reviewed study of WordPress plugin abandonment.
- Any study of multi-vendor operational cost or incident rate for small teams; only vendor
  marketing ("replace 4 to 6 vendors with one") exists.
- Migration-tool telemetry or an agency dataset on page-builder conversion cost.
- A WordPress annual survey after 2023.
- Cloudflare's status incidents for 2026-08-07 to 2026-08-25 from a primary source; the API
  payload begins 2026-08-26.
- METR's original study broken down by task type; the paper does not condition on it.
