# The cairn case: evidence, round 3. Cost and speed of agent-assisted coding

Scope: what rounds 1 and 2 did not collect. Not re-collected here: Peng 2023 (55.8%), Cui et al.
(26.08%), METR 2025 and the 2026 design update, METR's self-report survey, SWE-bench Goes Live,
SWE-Bench Pro, Rahman et al., Coherence Collapse, the security studies, Watanabe et al., the
Anthropic "Claude Code in practice" post, Agarwal et al., Sawada et al., Vilas Boas et al., the
JetBrains survey, Evaluating AGENTS.md (Gloaguen et al.), Configuration Smells, Gao and Chen, DORA,
Borg et al., Shen and Tamkin, Stack Overflow 2025. Every item below is new to the case unless
marked "extends".

Method: web search plus primary fetch on 2026-09-04. Where only an abstract was read, the row says
so. Dates are arXiv submission dates unless stated. "Citability" grades the source for a public
front door, not for an internal record.

---

## 1. Cost per task or per feature, in tokens or dollars

**Verdict.** Per-task cost from agentic runs is published, but almost entirely on benchmark
tasks, not on shipped features. The measured range for a benchmark issue is roughly $0.02 to $3 at
list price. The measured range for an organisation is $13 per developer per active day, published
by the vendor. Nobody has published a cost per shipped feature with a method. The case's own
in-tree token ledger (Leg 5: 1.4 to 2.3 times pass ceilings, 2.1M to 3.5M tokens a pass) is, as
far as this search found, a rarer artefact than the case treats it as.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Token cost per benchmark task, and its variance | Bai, Huang, Wang, Sun, Mihalcea, Brynjolfsson, Pentland, Pei, "How Do AI Agents Spend Your Money? Analyzing and Predicting Token Consumption in Agentic Coding Tasks", Microsoft Research listing, 2026-04-24, https://arxiv.org/abs/2604.22750 | Trajectories from eight frontier models (Kimi-K2, Claude Sonnet 4.5, GPT-5 among them) on SWE-bench Verified, multiple runs per task | Agentic coding consumes over 1,000 times the tokens of single-turn code reasoning. Input tokens dominate at more than 150:1. Runs on the same task differ by up to 30 times in total tokens. Accuracy peaks at intermediate cost and falls at the highest cost levels. Models predict their own token use with correlations of at most 0.39. Kimi-K2 and Sonnet 4.5 consume over 1.5M more tokens than GPT-5 across the run. | Benchmark, not production. Abstract and project page read; the per-model dollar table was not extracted. | High. The 30x same-task variance is the number that explains the case's own ceiling overruns |
| Dollars per task versus pass rate, real professional workflows | Scale AI, "SWE Atlas: Benchmarking Coding Agents Beyond Issue Resolution", 2026-05-08, https://arxiv.org/abs/2605.08366 (Appendix G at https://arxiv.org/html/2605.08366) | 284 tasks (124 codebase Q&A, 90 test writing, 70 refactoring); 642 trials per model on the Q&A plus test-writing set; cost from per-message token logs at published list rates | Pareto frontier: Gemini 3 Flash about $0.35 a task at about 15% pass; GPT-5.3 Codex about $1.15 at about 35%; GPT-5.4 about $1.90 at about 40%. Opus 4.6 and 4.7 cost more than GPT-5.4 at lower pass rates. "Cost per task increases as the pass rate increases." | Vendor of evaluation services. Tasks are hours-scale professional workflows, not small features. Numbers read from the appendix summary. | Medium to high |
| Dollars per instance and per resolved issue, first-generation agents | Yang et al., "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", 2024, https://arxiv.org/abs/2405.15793, with the SWE-bench+ cost analysis, https://arxiv.org/pdf/2410.06992 | SWE-bench Lite and full runs with GPT-4 | SWE-agent plus GPT-4: about $0.24 an instance, about $32.50 per issue actually fixed. RAG plus GPT-4: $0.05 an instance, $10 per fix. | 2024 models and prices. The effectiveness-aware figure (cost divided by successes) is the one to quote; per-instance cost flatters a low pass rate. | Medium. Useful only as the origin of the cost-per-resolved-issue framing |
| Cost of one tiny greenfield deliverable across eight agents | Digital Applied, "Eight Headless Coding Agents, One Task: Tokens and Cost", published 2026-08-22, runs 2026-08-23, https://www.digitalapplied.com/blog/headless-agent-cost-per-task-benchmark | One Python CSV deduplicator with a unittest suite from an empty directory; 18 runs, two rounds; tokens from CLI logs; list prices | Seven of eight agents passed on both runs. Opus 5 cost $0.28 to $0.30 (72K to 110K tokens). GPT-5.6 $0.14 to $0.17. DeepSeek V4 Flash $0.017 (about 193K tokens). Cache reads were 46% to 95% of input. Cache writes were 71% to 76% of Opus 5's list-price cost. | An agency blog, n=2 per agent, one toy task, effort not equalised. Claude Code's cost field overstated a third-party model by about 27x. | Low as a study, medium as a worked example of the token shape of a small task |
| Organisation-level spend per developer | Anthropic, Claude Code docs, "Manage costs effectively", read 2026-09-04, https://code.claude.com/docs/en/costs | Vendor's enterprise telemetry, population undisclosed | "Across enterprise deployments, the average cost is around $13 per developer per active day and $150-250 per developer per month, with costs remaining below $30 per active day for 90% of users." Background use "typically under $0.04 per session". Agent teams use "approximately 7x more tokens than standard sessions" in plan mode. | The same page showed $6 a day before 2026-04-16 (TechBriefly, https://techbriefly.com/2026/04/29/anthropic-raises-claude-code-daily-cost-estimates-by-115/), so the figure moved 115% in one revision with no method attached. Vendor, no n, no distribution beyond the 90th percentile. | Medium for the number, low for anything built on it |
| Per-task price of a hosted agent, vendor-defined units | Cognition, "Devin's 2025 Performance Review", 2025-11-14, https://cognition.com/blog/devin-annual-performance-review-2025, with unit pricing collated at https://aipromptshub.co/calc/devin-cost-per-task | Vendor blog and pricing pages | 1 ACU is about 15 minutes of Devin work at $2 to $2.25. A typical bug fix runs 2 to 3 ACU ($4.50 to $6.75). A multi-file migration runs 30 or more ACU ($67.50 or more). PR merge rate 34% in 2024 to 67% in 2025. ETL migration 3 to 4 hours against 30 to 40 human hours at one bank. | All from customer case studies and the vendor's own telemetry. No method, no n, no control. | Low. Use only as the price list of one product |
| Budget overruns as a failure class | Khan, "Token Budgets: An Empirical Catalog of 63 LLM-Agent Budget-Overrun Incidents", 2026-06-02, https://arxiv.org/abs/2606.04056 | 63 confirmed production incidents across 21 orchestration frameworks, 2023 to 2026, each backed by a quoted GitHub issue; eight-cluster taxonomy, Cohen's kappa 0.837 | A retry loop spending cents per attempt "can accumulate to thousands of dollars before an operator notices." Aggregate loss is not totalled. | Single author. The Rust mitigation half of the paper is unrelated to the case. | Medium for "unbounded cost is a documented failure class" |
| Where the money went in a twelve-week solo agentic build | Davis, Amusuo, Singla, Cakar, Davis (Purdue), "Cheap Code, Costly Judgment: A Case Study on Governable Agentic Software Engineering", 2026-07-01, https://arxiv.org/abs/2607.01087 (numbers from https://arxiv.org/html/2607.01087) | First-person case study, one expert engineer, 12 weeks, 88 field notes, a document-accessibility remediation system | Budget about $60K: $50K salary, $2K API inference, $2K Claude subscriptions, $6K cloud. 9M to 18M tokens a week. Production code about 420 KLOC; support apparatus 1.16 MLOC (static analyses 238K, dynamic analyses 405K, agent documentation 247K, agent infrastructure 110K, tooling 162K), 2.75 times the production code. | One engineer, authors are the practitioners. The KLOC counts include generated tests and docs. | Medium. The strongest single "cost moved from typing to judgment" record found, and the closest analogue to cairn's 33 check scripts |
| Human-versus-agent cost crossover on an optimisation task | METR, "Expenditure Horizon: Measuring Optimization Ability, with an Application to NanoGPT", 2026-07-21, https://metr.org/blog/2026-07-21-expenditure-horizon/ | Human cost per 1% training-speed gain from contributor interviews and about 1,650 logged human hours at $150 an hour; agents run up to $10K each | Human cost about $2,500 per 1% improvement. Expenditure horizon after revalidation: GPT-5.5 $2,300, Opus 4.8 $3,300, GPT-5 and Opus 4.1 $0. 70% to 90% of agent cost went to experiments, not inference. Only 50% to 70% of agent contributions were mergeable. | Not a software-feature task. METR calls the human estimate "highly uncertain." | High for the method, low for relevance. It shows what a defensible cost comparison looks like |
| Real-money task value as a benchmark | Miserendino, Wang, Patwardhan, Heidecke (OpenAI), "SWE-Lancer", 2025-02-17, https://arxiv.org/abs/2502.12115 | 1,400 plus Upwork tasks worth $1M in real payouts, $50 to $32,000, end-to-end tested | "Frontier models are still unable to solve the majority of tasks." Dollar totals earned per model are in the paper, not the abstract read here. | 2025 models. Payout is task value, not agent cost. | Medium. Cite the framing, fetch the table before quoting a dollar figure |

**Where nothing was found.** No published cost per shipped feature from Cursor, Replit, Lovable,
or Bolt with a method. No enterprise case study that reports tokens or dollars per feature; the
OpenAI customer posts (Cisco "50% faster review") and the Cognition case studies report ratios
without denominators. No academic "cost of agents" study on production code changes; every
dollar-per-task figure sits on a benchmark.

---

## 2. Time to feature or time to first deploy for small agent-built applications

**Verdict.** The controlled numbers stop at the task level. Google measured 21% on one
ten-file feature. Microsoft measured 24% more PRs across four months. OpenAI reports the share of
users delegating eight-hour tasks. Nobody has measured time-to-first-deploy for an agent-built
application on a scaffold with a control. The hackathon and classroom studies report what was
built and how it was graded, never elapsed time to a deployed app.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Time on one realistic multi-file feature, enterprise RCT | Paradis, Grey, Madison, Nam, Macvean, Meimand, Zhang, Ferrari-Church, Chandra (Google), "How much does AI impact development speed? An enterprise-based randomized controlled trial", 2024-10-16, https://arxiv.org/abs/2410.12944 | RCT, 96 Google engineers, one enterprise-grade task adding a logging feature across about 10 files and about 474 lines, three in-house AI features | About 21% faster with AI (about 96 minutes against 114 by secondary summary). The authors state the confidence interval is large. Developers who code more hours a day gained more. | Summer-2024 internal tooling, completion-era not agents. Secondary sources report the effect lost p<0.05 under regression controls; the abstract confirms only the wide interval. | High for the number, with the wide interval stated |
| PR throughput after CLI-agent adoption at scale | Murphy-Hill, Butler, Savelieva (Microsoft), "Adoption and Impact of Command-Line AI Coding Agents: A Study of Microsoft's Early 2026 Rollout of Claude Code and GitHub Copilot CLI", 2026-07-01, https://arxiv.org/abs/2607.01418 | Tens of thousands of engineers; Bayesian structural time-series against a synthetic control of non-adopters, plus within-person fixed-effects Poisson; Azure DevOps PRs only; four months | +24.0% PRs per engineer per day (95% CI +14.5% to +33.7%). Dose-response: +15.0% at three tool-use days a week, +50.1% at five or more. Copilot CLI +24.9% against Claude Code +11.4% among single-tool users. No fade over four months. Placebo test at 2025-10-06: -1.1% (-10.6% to +8.6%). | Self-selection in adoption. "A merged PR is not the same as the value it delivers." No code quality, complexity, or review-time measures. | High. The largest field study of agent CLIs with an identification strategy |
| Task size users delegate to an agent | Johnston, Holtz, Richmond, Ong, Tambe, Chatterji (OpenAI, Columbia, Wharton, Duke), "The Shift to Agentic AI: Evidence from Codex", 2026, https://cdn.openai.com/pdf/5d1e1489-21c0-43e4-9d42-f87efdbf0082/the-shift-to-agentic-ai-evidence-from-codex.pdf | Usage telemetry; an LLM classifier estimates, per prompt, how long an experienced human would take without AI; 0.1% sample of opted-in individual accounts | Share of individual users sending at least one prompt estimated at over one human hour: 35.4% in December 2025 to 70.2% in May 2026. Over eight human hours: 2.1% to 25.6%. Codex is 99.8% of OpenAI employees' work output tokens. More than 10% of users run three or more concurrent agents weekly. | A request estimated at eight hours is not eight hours of work delivered. Two authors are paid OpenAI contractors. Validation is in an appendix not read. | Medium. It measures the size of the ask, not the speed of the answer |
| End-to-end app building from a spec, measured by a browser agent | Tran, Nashold, Krishnan, Bigeard, Gu, "Vibe Code Bench: Evaluating AI Models on End-to-End Web Application Development", 2026-03-04, https://arxiv.org/abs/2603.04601 | 100 web-app specifications (50 validation, 50 test), 964 browser workflows, 10,131 substeps, 16 frontier models, deployed apps judged by an autonomous browser agent | Best model 61.8% on the test split. Evaluator choice moves step-level agreement between 31.8% and 93.6%. | No wall-clock or dollar figures. Apps are built from scratch, not on a scaffold. | Medium. The only benchmark found that scores a whole deployed app |
| Month-long vibe-coding hackathon, all skill levels | Chen, Cao, Shao, Karri, Shafique, "Code for All: Educational Applications of the Vibe Coding Hackathon", 2026-04-24, https://arxiv.org/abs/2604.22747 (numbers from https://arxiv.org/html/2604.22747) | 229 participants in 184 teams from 8 countries; 40 valid graded projects; LLM-generated code only, no manual edits; three tracks | 21 of 40 projects (52.5%) entered the Launch track (deployed, production-ready). Mean grade 81.48 (SD 10.22), range 46.33 to 94.67. Launch projects scored highest (84.52). Cursor was the top agent (8 projects), Lovable 4. | Asynchronous month-long window, so no elapsed-time measure. Self-selected entrants; 40 of 184 teams submitted. | Medium for "novices deploy real apps with agents", nothing for speed |
| Nine-hour novice hackathon | Gama, Calegario, Jackson, Nolte, Morais, Garcia, "Can you feel the vibes?", 2025-12-02, https://arxiv.org/abs/2512.02750 | 31 undergraduates, 9 teams, one Brazilian university, observation plus exit survey plus interviews | Teams delivered "functional demonstrations within time constraints" in 9 hours. Findings: premature convergence in ideation, uneven code quality requiring rework, limited engagement with core engineering practices. | Qualitative. No control, no timing beyond the event length. | Low to medium |
| Preparation as the lever on a five-hour build | Zigler, "Mise en Place for Agentic Coding: Deliberate Preparation as Context Engineering Methodology", 2026-05-06, https://arxiv.org/abs/2605.05400 | Workshop paper, one hackathon entry (about 12 teams, five-hour window, January 2026) | About two hours of preparation preceded a parallel multi-agent build of a full-stack educational platform inside the window. | Single case, no baseline, no tokens, no completion measure. | Low. A shape, not a number |
| Small teams out-ship large ones under AI | DX, "Q2 2026 State of AI Impact in Engineering", 2026-07-22, https://getdx.com/news/dx-releases-q2-2026-state-of-ai-impact-in-engineering-report/ | 500 plus engineering organisations, telemetry plus survey, April to June 2026 with trend data from Q3 2025 | Heavy users save "over 6 hours a week"; 3.9 hours average across 400 plus companies. AI-assisted code share 52.7%. Throughput 1.42 to 1.94 PRs per engineer per week over four quarters (+37%). Small organisations about 2.2 PRs per engineer per week against 1.2 at 750 plus engineers. Change confidence down 6.1%; developer experience index 67 to 65. | Vendor of a measurement product. Hours saved is self-reported. | Medium for throughput, low for hours saved |
| Amazon's headline | Jassy (Amazon CEO), August 2024 post, relayed at https://developers.slashdot.org/story/24/08/25/0049230/ and https://finance.yahoo.com/news/amazon-ceo-andy-jassy-says-213018283.html | CEO statement; the AWS product blog (https://aws.amazon.com/blogs/devops/announcing-support-for-upgrades-to-java-21-in-amazon-q-developer/) carries no numbers | "4,500 developer-years" saved; Java 17 upgrades "from 50 developer days to a few hours"; 79% of generated reviews shipped without changes; $260M annualised. | No method has ever been published. A migration is the most repetitive task class there is. | Low. Do not put it on a front door |
| Google's headline | Pichai statements, 2024 to 2025, on the share of new code AI-generated and a claimed engineering velocity gain | Earnings-call statements | Not fetched this round. | No method. | Low. Not searched further |

**Where nothing was found.** No controlled measurement of time-to-first-deploy for an agent
building on a starter template or scaffold. No classroom study reporting minutes or hours to a
deployed app with n. No Replit, Lovable, or Bolt figure beyond product-review anecdotes ("recipe
app in ten minutes"). No Google or Amazon internal figure with a published method beyond the 2024
RCT.

---

## 3. Field studies of small teams or solo developers shipping real products

**Verdict.** Three single-developer records exist with numbers (Vilas Boas, already cited; Davis
et al. above; and the Stanford brownfield case below). The rest of the field evidence is
organisational telemetry from thousands of developers. The pattern across it is consistent: more
PRs, more code, more review time, more rework, and no measured change in delivered value.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Output, quality, and rework across many companies, and by greenfield versus brownfield | Denisov-Blanch (Stanford, softwareengineeringproductivity.stanford.edu), "Does AI Actually Boost Developer Productivity?", AI Engineer talk 2025 and AI Conference deck 2025-09, https://aiconference.com/wp-content/uploads/2025/09/Yegor-Denisov-Blanch-Will-AI-Replace-Software-Engineers_-.pptx.pdf; summaries at https://proxify.io/articles/stanford-study-of-100000-developers-on-engineering-productivity | Git history from about 100,000 developers at 600 plus companies; an ML model trained to replicate a 10 to 15 person expert panel's rating of each commit's functionality and quality | Greenfield: +30 to 35% on simple tasks, +10 to 15% on complex. Brownfield: +15 to 20% simple, +5 to 10% complex (the deck's own summary slide; other slides show +35 to 40% and +0 to 10% at the extremes). Popular languages +10 to 25%; unpopular languages -5% to +5%. One company case: PRs +13.6%, quality -9%, quality variance 3.6x, rework 2.6x (p<0.01), effective output +1%. | Not peer reviewed as of this search; the numbers live in talks and a deck. The "effective output" metric is proprietary. The company case is one company. | Medium. Widely cited, so cite the deck and say it is a deck |
| Project velocity after Cursor adoption, with a control | He, Miller, Agarwal, Kästner, Vasilescu (CMU), "Speed at the Cost of Quality: How Cursor AI Increases Short-Term Velocity and Long-Term Complexity in Open-Source Projects" (earlier title "Does AI-Assisted Coding Deliver?"), 2025-11-06, revised 2026-01-26, https://arxiv.org/abs/2511.04427 | Difference-in-differences on GitHub projects that adopted Cursor against matched controls; panel GMM for mechanisms | Velocity rise is "significant, large, but transient." Static-analysis warnings and code complexity rise "substantially and persistently" and drive a long-term slowdown. Point estimates not in the abstract read. | Open-source projects, not small commercial teams. | High for the shape. Extends Agarwal et al. from round 2 (same group) |
| One organisation, one year, in-house agent | Kumar et al., "Intuition to Evidence: Measuring AI's True Impact on Developer Productivity", 2025-09-24, https://arxiv.org/abs/2509.19708 | Longitudinal cohort, 300 engineers, one year, an in-house generation-plus-review platform (DeputyDev) | PR review cycle time -31.8%. Code volume to production +61% among top adopters, +28% overall. 30% to 40% of shipped code through the tool. Adoption 4% in month 1 to 83% peak, settling at 60%. | Authors built the tool. No control group. | Medium |
| Two-year commit panel, public sector | Stray, Brandtzæg, Wivestad, Barbala, Moe, "Developer Productivity With and Without GitHub Copilot: A Longitudinal Mixed-Methods Case Study", NAV IT, 2025-09-24, revised 2026-01-28, https://arxiv.org/abs/2509.20353 | 25 Copilot users and 14 non-users, 26,317 commits across 703 repositories over two years, 13 interviews | No statistically significant change in commit activity after adoption. Users were already more active than non-users before adoption. Perceived productivity rose anyway. | Small n, completion tooling, one organisation. | Medium. The cleanest published null on activity metrics |
| Enterprise telemetry, two years | Faros, "The AI Engineering Report 2026: The Acceleration Whiplash", 2026-04-12, https://www.faros.ai/blog/ai-acceleration-whiplash-takeaways; the 2025 predecessor "The AI Productivity Paradox", 2025-07-23, https://www.faros.ai/blog/ai-software-engineering | 2026: 22,000 developers, 4,000 plus teams, two years of platform telemetry. 2025: 10,000 plus developers, 1,255 teams, Spearman correlations across companies | 2026, high-adoption teams: epics per developer +66%, tasks +33.7%, PR merges +16.2%, bugs per developer +54%, incidents per PR +242.7%, median time in review +441.5%, code churn +861%, PRs merged without review +31.3%. 2025: tasks +21%, PRs +98%, review time +91%, PR size +154%, bugs +9%, and no company-level correlation with delivery. | Vendor of a measurement product, customers only, correlational, and Faros publishes no limitations section ("ask sales"). Percentages this large on churn suggest a small denominator. | Medium for direction, low for any single number |
| Copilot cohort with a control, 2024 | Uplevel Data Labs, "Gen AI for Coding", 2024, https://resources.uplevelteam.com/gen-ai-for-coding, relayed at https://devops.com/study-finds-no-devops-productivity-gains-from-generative-ai/ | About 800 developers, 351 with Copilot and 434 without, three-month windows in 2023 and 2024 | No meaningful change in PR cycle time or throughput. Bug rate +41% in the Copilot group. No burnout reduction. | Vendor, 2023-era Copilot, pre-post with a non-randomised control. | Medium |
| Anthropic's own engineers | Anthropic, "How AI Is Transforming Work at Anthropic", 2025-12-02, https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic | Survey of 132 engineers and researchers, 53 interviews, 200,000 internal Claude Code transcripts February to August 2025 | Self-reported productivity gain rose from +20% to +50% year on year. Claude share of work 28% to 59%. 27% of assisted work would not otherwise have been done. Most say 0% to 20% of their work is fully delegable. Consecutive tool calls without a human 9.8 to 21.2; human turns per transcript 6.2 to 4.1. | Self-report, non-anonymous, employer-run, and the page says so. | Low for the multiplier, medium for the delegation shares |
| Longitudinal developer experience under agents | Vella, Blincoe, "The Impact of AI Coding Assistants on Software Engineering: A Longitudinal Study", 2026-05-22, https://arxiv.org/abs/2605.23135 | Two questionnaires six months apart; 158 then 101 participants, matched cohort 95 | 82% report writing less code. 84% report improved productivity at both points. Those reporting a worse developer experience rose from 14% to 27%. Flow and cognitive load worsened; feedback loops improved. | Survey only. | Medium for the experience trend |
| Survey of practitioners on hidden costs | Afroz, Feng, Menezes, Kimura, Trinkenreich, Steinmacher, Sarma, "The Fast and Spurious: Developer Productivity with GenAI", 2025-10-28, revised 2026-04-05, https://arxiv.org/abs/2510.24265 | Survey, 415 practitioners, SPACE framework | Frequent users report faster completion and more output, offset by "increased code review burden" and "persistent cognitive load from output verification." Collaboration patterns unchanged. | Self-report. | Medium |
| Consulting-firm synthesis | Bain, "From Pilots to Payoff: Generative AI in Software Development", Technology Report 2025, 2025-09-23, https://www.bain.com/insights/from-pilots-to-payoff-generative-ai-in-software-development-technology-report-2025/ | Surveys of SaaS developer teams of 2,000 to 20,000 FTE, plus client work | Teams using AI assistants see 10% to 15% productivity gains. Firms that pair AI with end-to-end process change report 25% to 30%. Writing and testing code is 25% to 35% of idea-to-launch time. | Consultancy, survey, large firms only. | Medium for the 25% to 35% lifecycle share, which bounds any coding-speed claim |

**Where nothing was found.** No diary or field study of independent developers or two-to-five
person teams shipping a commercial product with agents and reporting tokens, hours, or dollars.
The two solo cases found (Vilas Boas, Davis) are both authored by the practitioner.

---

## 4. What makes a codebase agent-friendly

**Verdict.** The 2026 evidence has converged on a two-part finding. Context files and clean
code do not move correctness, and the bound is now measured. They do move cost: fewer tokens,
fewer file revisits, shorter runtime. Language popularity and typed languages change token
spend. Test coverage of what agents change is poor by default, which is the argument for the
repository's own test gate rather than the agent's.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Context files and correctness, second ablation | Khatri, "Do Context Files Help Coding Agents? A Two-Agent Ablation Study on Real Repositories", 2026-07-28, https://arxiv.org/abs/2607.27250 | Claude Code and Codex, 17 real tasks from 3 repositories, 288 evaluated runs, gold-test scoring, equivalence testing | Context strategy does not measurably move correctness on either agent, bounded to at most 10 to 15 percentage points. Failures were "implementation skill: feature design, pattern selection, exact wiring," not missing repository knowledge. The real context file "never converts a near-miss to a pass." Task difficulty is agent-specific (Spearman 0.75). | Single author, three repositories. No token or runtime figures. | Medium to high. Extends Gloaguen et al. with a bound |
| Context files and cost | Lulla, Mohsenimofidi, Galster, Zhang, Baltes, Treude, "On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents", 2026-01-28, revised 2026-03-30, https://arxiv.org/abs/2601.20404 | 124 real code changes across 10 repositories, Codex and Claude Code, with and without the file | Median runtime -28.64%. Output tokens -16.58%. Task completion comparable. | Five-page paper; per-repository variance not read. | High. The efficiency half of the context-file story, and the one the case should lead with |
| Clean code and cost | Trivedi, Schmitt (SonarSource), "Does Code Cleanliness Affect Coding Agents? A Controlled Minimal-Pair Study", 2026-05-19, https://arxiv.org/abs/2605.20049 | Six repository pairs matched on architecture and behaviour, differing on static-analysis violations and cognitive complexity; 33 tasks, 660 Claude Code trials, hidden interface tests | Task completion: no measurable change. Tokens: -7% to -8% on cleaner code. File revisitations: -34% on cleaner code. | Vendor of a static analyser. One agent. | Medium to high |
| Language choice and token spend | Wu, Anderson, Guha (Northeastern and Wellesley), "The Best Programming Language for Tokenmaxxing", 2026-07-24, https://arxiv.org/abs/2607.22807 | Five models, four languages (Python, Java, Rust, OCaml), difficulty-controlled problems, trajectories re-executed | "Stark variation in token consumption that is consistent across models" by language. Agents repeatedly produce non-compiling solutions in unfamiliar languages. | Numbers per language not in the abstract read. Not a web stack. | Medium. Supports "a popular, well-represented stack costs fewer tokens" |
| What existing tests catch of an agent's change | Dipongkor, Baral, Lam, Moran, "Test Coverage Analysis of Agentic Pull Requests", 2026-07-20, https://arxiv.org/abs/2607.18057 | 4,882 agent PRs from AIDev (532 Java, 4,350 Python), five agents | Agents modified tests in only 49.6% of PRs that changed code under test. Existing tests covered 61.5% of changed executable lines in Java and 27.0% in Python. 64.8% of Python PRs had no changed line executed by any existing test. Error-handling constructs missed 86.0% (Java) and 81.0% (Python). | Open-source AIDev repositories. | High. The number behind "the repo's gate, not the agent's tests, defines done" |
| Building on agent code | Patel, Hou, Purohit, Xu, Pan, He, Chen, "Is Agent Code Less Maintainable Than Human Code?", 2026-06-19, https://arxiv.org/abs/2606.21804 | CodeThread: follow-up tasks built on prior agent or human code; four agents, four benchmarks | Resolution on follow-up tasks drops by up to 13.1 percentage points when the prior code was agent-written. Conventional metrics did not explain the gap; input validation and error handling did. | Single follow-up step. Benchmark. | Medium |
| Long context does not substitute for locality | "The Limits of Long-Context Reasoning in Automated Bug Fixing", 2026-02, https://arxiv.org/abs/2602.16069 | Context inflated with relevant files under perfect retrieval | Qwen3-Coder-30B resolved 7% at 64K context; GPT-5-nano resolved none. | Small open models. | Low to medium. Supports the locality claim only as a shape |
| Trajectory length is a confound, not a cause | Mehtiyev, Assunção, "Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure", 2026-04-02, https://arxiv.org/abs/2604.02547 | 9,374 trajectories, 19 agents (8 frameworks, 14 models), 500 tasks | The reported correlation between long trajectories and failure "reverses direction once task difficulty is controlled." Successful agents gather context before editing and invest in validation. Over 20% of failures persist from architectural and domain gaps. | Benchmark. | Medium. A warning against citing token count as a failure predictor |
| Codified context in a large codebase | Vasilopoulos, "Codified Context: Infrastructure for AI Agents in a Complex Codebase", 2026-02-24, https://arxiv.org/abs/2602.20478 | 108,000-line C# codebase, a constitution file plus 19 domain agents plus 34 specification documents, 283 sessions, four observational cases | Descriptive. No success or cost delta. | Single author, no control. | Low. An existence proof of the "skills plus specs" shape the case describes |
| Acceptance by task type and agent | Pinna, Gong, Williams, Sarro (UCL), "Comparing AI Coding Agents: A Task-Stratified Analysis of Pull Request Acceptance", 2026-02-09, revised 2026-05-07, https://arxiv.org/abs/2602.08915 | 7,156 AIDev PRs, five agents, stratified chi-square | Documentation PRs accepted 82.1%, new features 66.1%. Claude Code: documentation 92.3%, features 72.6%. No agent leads on every task type. | Open-source, self-selected PRs. | Medium. Extends Watanabe et al. |

**Where nothing was found.** No study that varies test coverage or scaffold quality as the
treatment and measures agent success or cost. No study of repository size as a continuous
variable against agent cost. No evaluation of shipped skills (as opposed to context files) with
a control.

---

## 5. Counter-evidence on cost: rework, review burden, token blowups, the paradox

**Verdict.** The strongest counter-case is not METR. It is the convergence of four independent
telemetry sources (Stanford, Faros, GitClear, Uplevel) on the same shape: output up, rework up,
review time up, quality signals down, delivered value flat. The replication picture is that the
2023 RCT numbers have not been reproduced on real work; the field results are 0% to 25%.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Rework and quality at scale | Denisov-Blanch (Stanford), deck cited in section 3 | 100,000 developers, expert-panel model | One-company case: rework 2.6x (p<0.01), quality -9%, effective output +1% while PRs rose 13.6%. | One company for the rework figure; the cross-company gains are 0% to 40% by context. | Medium |
| Code structure trend under AI authorship | GitClear, "The Maintainability Gap: 2026 AI Code Quality Research", 2026, https://www.gitclear.com/the_ai_code_quality_maintainability_gap; predecessor "AI Copilot Code Quality: 2025 Data Suggests 4x Growth in Code Clones", https://www.gitclear.com/ai_assistant_code_quality_2025_research | 623M code changes 2023 to 2026, eight signals; the 2025 report covered 211M lines | Block duplication +81% (40.3 to 73.0 per million changed lines). Within-commit copy/paste +41%. Error-masking constructs +47%. Two-week churn +15%. Cross-file function calls -35%. Moved (refactored) code 21% in 2022 to 3.8% in 2026 (-70%). Heavy AI users out-produce non-users 4 to 10x but only 25% against their own pre-AI baseline. | Vendor of a code-analytics product. Attribution to AI is by period, not by commit. GitClear's own framing: "The headline is not 'AI writes bad code.'" | Medium. The 25%-against-own-baseline figure is the most useful and the least quoted |
| Review effort per agent PR | Khelifi, Ouni, Khemaja, "Behind Agentic Pull Requests", MSR 2026 Mining Challenge, https://2026.msrconf.org/details/msr-2026-mining-challenge/26/Behind-Agentic-Pull-Requests-An-Empirical-Study-on-Developer-Interventions-in-AI-Age | AIDev agent PRs against human PRs, thematic taxonomy | Human intervention in 52.17% of agent PRs against 83.59% of human PRs, but when it happens on an agent PR it brings "larger code churn and longer durations." Interventions: guidance 58.02%, decision 21.16%, direct code change 17.05%, operational 3.69%. | Sample size not in the abstract. | Medium |
| Review regimes and the attention tax | Minh et al., "Early-Stage Prediction of Review Effort in AI-Generated Pull Requests", MSR 2026, 2026-01-02, https://arxiv.org/abs/2601.00753 | 33,707 agent PRs across 2,807 repositories | Two regimes: 28.3% of agent PRs merge in under a minute; the rest enter iterative review where agents "frequently stall or abandon refinement" on subjective feedback. A static-cue model captures 69% of high-effort PRs at a 20% review budget (AUC 0.96). | Open-source AIDev. | Medium |
| Why agent PRs are rejected | Peralta et al. (Waseda and others), "Why Are Agentic Pull Requests Merged or Rejected?", MSR 2026, 2026-05-21, https://arxiv.org/abs/2605.22534 | 11,048 closed agent PRs, 9,799 human-reviewed, 717 manually inspected | Only 35.7% of rejections reflect a clear agent failure; 31.2% workflow constraints; 33.1% no observable rationale. 15.4% of merged PRs needed explicit reviewer feedback or commits. | Open-source. | Medium. Cuts both ways: rejection rates overstate agent failure, and merge rates hide reviewer work |
| Token blowups | Bai et al. (section 1) and Khan (section 1) | See above | Same-task runs vary 30x; 63 documented overrun incidents. | See above | High and medium |
| Review time in the whole lifecycle | Faros 2026 (section 3) | See above | Median time in review +441.5%; PRs merged without review +31.3%. | Vendor telemetry. | Medium |
| Field nulls on completion tooling | Stray et al. (section 3); Uplevel (section 3) | See above | No significant activity change; +41% bugs. | See above | Medium |
| The lifecycle bound | Bain (section 3) | See above | Coding is 25% to 35% of idea-to-launch time, so a 50% coding speedup caps at roughly 12% to 17% end to end. | Survey of large firms. | Medium |

**Replication note.** No direct replication of Peng et al. (2023) was found in 2025 or 2026. The
nearest are Google's 2024 RCT (21%, wide interval, one task), Cui et al. (26.08%, already cited),
METR (-19%, already cited), and the field nulls above. The direction of drift is from 55.8% on a
toy task in 2023 toward 0% to 25% on real work in 2025 and 2026, with the agent-era Microsoft
figure (+24% PRs) sitting at the top of that band and measuring count rather than time.

---

## The narrowest sentence the base sustains

Agent-assisted coding measurably raises how much code and how many pull requests a developer
produces, by roughly a tenth to a quarter on real work in the controlled and quasi-controlled
studies, at a per-task token cost that varies up to thirty-fold between runs of the same task, and
the same telemetry shows review time and rework rising with it, so the published evidence supports
"cheaper to produce" and does not yet support "cheaper to ship."

## The skeptic's sentence

Every dollar-per-task figure sits on a benchmark, every organisation-level gain is a PR count
that the same source says is not value, the four largest telemetry datasets agree that review
time and rework rose faster than output, and the one place this repository can point to a
real cost is its own token ledger, which ran 1.4 to 2.3 times its own ceilings.

## The three strongest citations for a front door

1. Murphy-Hill, Butler, Savelieva (Microsoft), arXiv 2607.01418, 2026: +24.0% PRs per engineer
   per day (95% CI +14.5% to +33.7%) after CLI-agent adoption, persisting four months, with a
   passing placebo test. Supports: "Agents raise measured output on real work, and the effect
   holds up under a control."
2. Lulla et al., arXiv 2601.20404, 2026, with Trivedi and Schmitt (SonarSource), arXiv
   2605.20049, 2026: a repository context file cut median agent runtime 28.64% and output tokens
   16.58% at the same completion rate; cleaner code cut tokens 7% to 8% and file revisits 34% at
   the same completion rate. Supports: "A documented, conventional codebase makes an agent
   cheaper, not smarter, and cheaper is the claim cairn makes."
3. Bai et al. (Microsoft Research, Stanford, MIT), arXiv 2604.22750, 2026: agentic runs on the
   same task vary up to 30x in tokens, and accuracy peaks at intermediate cost. Supports: "Cost is
   governed by the harness and the gate, which is why cairn ships both."

A fourth, for the counter-column on the same door: Faros 2026 (median time in review +441.5%,
churn +861% on high-adoption teams) or, for a peer-reviewed alternative, He et al. (CMU), arXiv
2511.04427, the Cursor difference-in-differences study, whose velocity gain is "large but
transient."

---

## Where searches found nothing (this round)

- A cost per shipped feature, in tokens or dollars, from any production setting with a method.
- A controlled time-to-first-deploy for an agent building on a scaffold or starter template.
- A classroom or hackathon study reporting elapsed time to a deployed application with n.
- Published Replit, Lovable, or Bolt figures beyond pricing pages and reviewer anecdotes.
- A Google or Amazon internal figure with a method beyond the 2024 Google RCT.
- A diary or field study of independent developers or two-to-five person teams with cost data.
- A direct replication of Peng et al. (2023).
- A study varying test coverage or scaffold quality as the treatment.
- A per-model dollar table from Bai et al. (the abstract and project page were read, not the
  full paper).
- SWE-Lancer's per-model dollar earnings (in the paper body, not read).
- Point estimates from He et al. (Cursor) and from the OpenAI Codex paper's appendix validation.
