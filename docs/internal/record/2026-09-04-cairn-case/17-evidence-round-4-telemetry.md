# The cairn case: evidence, round 4. Large-sample telemetry and vendor research

Scope: the owner's point that one site's record is weak persuasion while the vendors hold
population-scale data. This round collects that data and grades it by method, not by publisher.
The docs register discounts vendor marketing and accepts published data with a stated method and
sample, so each row names both or says which is missing.

Not re-collected here, already in the case or in rounds 1 to 3: the Microsoft CLI-agent rollout
(arXiv 2607.01418), Faros 2025 and 2026, GitClear 2025 and 2026, Anthropic's "How AI Is
Transforming Work at Anthropic" (2025-12-02, 132 engineers), the JetBrains agent-adoption post
(2026-08, 90% weekly), Stack Overflow 2025 trust numbers, DORA 2024 and 2025, the Google 2024 RCT
(arXiv 2410.12944), Amazon's Jassy statement, Watanabe et al. (567 Claude Code PRs, 83.8% merged),
Pinna et al. (7,156 AIDev PRs by task type), Dipongkor et al. (test coverage of agent PRs), the
Stanford 100,000-developer deck, METR 2025 and 2026, Peng et al., Cui et al. Rows below marked
"extends" add a number or a caveat to one of those.

Method: web search plus primary fetch on 2026-09-04. The search budget ran out before the Stack
Overflow 2026 results, the GitHub Copilot 2026 enterprise research, and a Nadella primary source
could be fetched; those gaps are listed at the end. Where only an abstract or a secondary page was
read, the row says so. Dates are publication dates as stated on the page.

---

## 1. Anthropic's own publications

**Verdict.** Anthropic publishes more method than any peer. Every Economic Index report states the
sample, the window, the classifier, and a limitations section. Two things follow. The reports
license statements about what people bring to Claude and how much of it they delegate. They
license nothing about whether the delegated code shipped. Anthropic says so itself in each report.
The usage-scale figures (revenue, weekly actives) come from funding announcements and conference
remarks, not from a report with a method, and grade low.

| Bears on | Source | Method and sample | Numbers | Caveats (the authors' own where quoted) | Citability |
|---|---|---|---|---|---|
| Coding is the largest single use of Claude; agentic use is automation-heavy | Anthropic Economic Index, "AI's impact on software development", 2025-04-28, https://www.anthropic.com/research/impact-software-development | 500,000 coding interactions across Claude.ai and Claude Code, 2025-04-06 to 04-13, classified by a privacy-preserving Claude classifier into automation and augmentation | 79% of Claude Code conversations automation against 49% on Claude.ai. Feedback loop 35.8% and directive 43.8% on Claude Code. JavaScript and TypeScript 31% of queries, HTML and CSS 28%, Python 14%, SQL 6%. UI/UX component development 12% of conversations, web and mobile app development 8%. Startup work 32.9% of Claude Code use, enterprise 23.8%. | "We excluded Team, Enterprise, and API usage." "Our dataset likely captures early adopters." "We only studied what developers delegate to AI, not how they ultimately use AI outputs in their codebase, the quality of the resulting code." HTML inflated by Artifacts. Early Claude Code, pre-GA. | High for "the web stack is the modal Claude coding workload." Medium for anything else, since the sample is 2025-04 and Claude Code was in beta |
| Adoption is uneven by geography; enterprise API use is mostly automation | Anthropic Economic Index, "Uneven geographic and enterprise AI adoption", 2025-09-15, https://www.anthropic.com/research/anthropic-economic-index-september-2025-report | 1M Claude.ai conversations 2025-08-04 to 08-11, randomly sampled; 1M 1P API transcripts from August 2025 | Coding 36% of Claude.ai usage. "A little less than half of all API traffic" is computer and mathematical. Directive share 27% (late 2024) to 39%. First report where automation exceeds augmentation on Claude.ai. 77% of business API use is automation against about 50% on Claude.ai. India: coding over half of usage. AUI: Israel 7.0x, US 3.62x, India 0.27x. | Classifier changed models between reports (Sonnet 3.7 to Sonnet 4), "which complicates direct comparison." Utah usage partly "coordinated abuse." Cells under 15 conversations and 5 accounts suppressed. | High for the shares, with the classifier-change caveat attached |
| Task success as observed, and its selection problem | Anthropic Economic Index, "Economic primitives", 2026-01-15, https://www.anthropic.com/research/anthropic-economic-index-january-2026-report | 1M Claude.ai conversations plus 1M 1P API transcripts, 2025-11-13 to 11-20; Claude as classifier for five primitives | Computer and mathematical: 34% of Claude.ai (from 40% in 2025-03), 46% of API. Claude.ai 52% augmented, 45% automated; API 75% automation. Observed success: Claude.ai 67%, API 49%. Top 10 API tasks 32% of traffic. Productivity estimate 1.8 points a year, success-adjusted 1.0 to 1.2. | "Users choose which tasks to bring to Claude," so "if users avoid tasks they expect to fail, observed success rates will overstate true capability." API records are "single input-output pairs," some "mid-session." Classifier "validated on a small set of transcripts." Estimate "based on just three months of data." | High for the shares. Medium for the success rates, which the report itself flags as selection-biased. Low for the productivity projection |
| Coding concentration is moving from chat to agentic API traffic | Anthropic Economic Index, "Learning curves", 2026-03-24, https://www.anthropic.com/research/economic-index-march-2026-report | 1M conversations from Claude.ai and 1P API, 2026-02-05 to 02-12 | Computer and mathematical 35% of Claude.ai conversations. Coding share up 14% in the API and down 18% on Claude.ai since 2025-08. "Claude Code has grown to represent a large share of sampled traffic." "Claude Code's agentic architecture splits coding work into smaller API calls, which are labeled as distinct tasks." Top 10 Claude.ai tasks 19% (from 24%). Higher-tenure users see higher observed success. | No Claude Code percentage is given. "We do not observe people who signed up a year ago but are no longer using Claude." Tenure effects "could reflect stable characteristics." Success is "Claude's assessment of whether the conversation was successful." | Medium. The tenure-to-success gradient is the one finding that bears on the case, and the authors themselves offer survivorship as the alternative reading |
| How Claude Code sessions divide decisions, and how often they verifiably succeed | Anthropic, "How Claude Code is used in practice", 2026-06-16, https://www.anthropic.com/research/claude-code-expertise | About 400,000 interactive sessions from about 235,000 people, 2025-10 to 2026-04, privacy-preserving classifiers; success graded three ways (judged, verified, failure signal); 7.7% of sessions with no clear goal excluded | People make about 70% of planning decisions and about 20% of execution decisions. About 10 Claude actions per prompt, up to over 100. Verified success: novices 15%, intermediate and expert 28% to 33%; partial success 77% against 91% to 92%. Coding sessions by software occupations 34% verified success, other occupations 29%, all within seven points. Work mix: building 25%, fixing 26%, operating software 17%, planning 14%, analysis and prose 13%, testing and orchestrating 5%. Fixing fell from 33% to 19% over the window; operating software rose 14% to 21%. Expert prompts trigger 12 actions and 3,200 words against 5 and 600 for novices. | "We cannot measure real-world outcomes, like whether code written in a session is actually used or discarded." "The non-interactive usage this report excludes is a substantial share of activity." "Classifiers remain challenging to validate at scale, and Claude Code sessions add further difficulty, as they may be too long and complex for human labels to serve as ground truth." No language, framework, or test-presence breakdown. | High for the decision split and the work mix. Medium for the success rates, which are verified against in-session signals only. This is the largest published Claude Code session study and the one the case should cite for "what a session is" |
| Claude Code is more delegated than chat on the same tasks | Anthropic Economic Index, "Cadences", 2026-06-26, https://www.anthropic.com/research/economic-index-june-2026-report | Higher-rate sampling 2026-04-10 to 06-10 across chat, Cowork, Claude Code, and 1P API; a linked survey of about 9,700 respondents with at least five sessions | Claude Code autonomy 0.37 points higher on a 1 to 5 scale than chat and Cowork; two thirds of that is "the same tasks being executed with more delegation on Claude Code." Claude Code runs Opus 54% of the time against 10% for chat. Code and technical work "about a sixth" of artifacts produced. Survey: 86% report speed gains, 82% scope gains, 69% quality gains, 27% cost savings. Women 12% of the linked sample. | "Economic Index Survey is not representative of the general population." Computer and mathematical roles "roughly 30% of survey respondents, far above their 4% share of US employment." "Token counts are not adjusted for which model served the conversation." Self-assessed gains "do not rule out skill erosion." | Medium for the autonomy delta. Low for the survey percentages, which are self-report from a tech-skewed sample and the report says so |
| Anthropic's forecast document | Anthropic, "2026 Agentic Coding Trends Report", undated PDF (2026), https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf | No method. Eight predictions plus customer anecdotes; the only sourced numbers restate the 2025-12 internal study | Engineers use AI in "roughly 60% of their work" and can "fully delegate" only 0 to 20% of tasks. About 27% of AI-assisted work "wouldn't have been done otherwise." Rakuten: one feature in a 12.5M-line vLLM in a seven-hour run. TELUS 30% faster, 500,000 hours saved. CRED "doubled their execution speed." | "These predictions reflect what we're seeing with customers today, not certainties about tomorrow." Customer figures carry no n, no control, no method. | Low. Marketing register. The 60% and 0 to 20% figures are citable only through the 2025-12 study they come from |
| Usage scale | Anthropic Series G announcement (2026-02) and Code with Claude remarks (2026-05), as relayed by https://serpsculpt.com/claude-code-usage-statistics/; primary pages not fetched | Company statements | Claude Code weekly actives doubled 2026-01-01 to 02-12. Run-rate $1B at six months (2025-11), $2.5B at nine months (2026-02). Average 20 hours a week per developer (Amodei, 2026-05). About 4% of public GitHub commits carried a Claude Code trailer (SemiAnalysis, 2026-02-02, external estimate). | Revenue and actives are company figures with no denominator. The 4% is a third party's count of one trailer string, so it is a floor for Claude Code and says nothing about other agents. Secondary page read, not the primaries. | Low for a front door. Medium for "a vast population uses these tools," where the trailer count is the one figure with a reproducible method |

**What Anthropic's publications license the case to say.** The web stack (JavaScript, TypeScript,
HTML, CSS) is the modal Claude coding workload. Claude Code sessions are automation-heavy, and
people keep the planning decisions while the agent takes the execution decisions. Delegation is
partial: engineers who use Claude on most of their work still say only a small fraction is fully
delegable. Observed in-session success is around a third when a hard signal is required.

**What they do not license.** Any statement that the code shipped, was kept, or was correct in
production. Any productivity multiplier. Any language, framework, or test-presence effect.
Anthropic states each of these gaps in its own limitations sections.

---

## 2. Peer vendor telemetry with method

**Verdict.** GitHub and JetBrains publish sample and window. Cursor publishes numbers with no
sample. Google, Microsoft, and Meta publish CEO and CFO statements with no method. The one vendor
RCT with a stated design (Accenture) reports PR and build counts and never reports its n.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Platform-scale activity and the typed-language shift | GitHub, Octoverse 2025, 2025-10-28 (updated 2026-02-28), https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/ | Platform data 2024-09-01 to 2025-08-31, same-month year-over-year comparisons, public activity only, bots filtered "where identifiable" | 180M developers, 36M new. 630M repositories, 121M new. 986M commits (+25.1%). 43.2M PRs merged a month (+23%). TypeScript #1 by monthly contributors in 2025-08 at 2,636,006 (+66.6%). 80% of new developers use Copilot in their first week. 1M+ PRs by Copilot coding agent 2025-05 to 09. 72.6% of Copilot code review users "reported improved effectiveness." "94% of LLM-generated compilation errors were type-check failures" (cited academic study). | "These are observational signals rather than causal claims and more work is needed to understand the full impact AI is having." Private repositories undercounted. The 72.6% is self-report. | High for the platform counts. Medium for the TypeScript-and-LLM link, which GitHub states as an observation. Extends the round-3 Octoverse row |
| Copilot in one enterprise, with a control | GitHub with Accenture, 2024-05-13, https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-in-the-enterprise-with-accenture/ | RCT, Copilot against no Copilot, Accenture developers "from entry-level roles to team management"; n and duration not on the page (secondary sources say about 450) | +8.69% PRs, +15% PR merge rate, +84% successful builds, about 30% suggestion acceptance. 67% used it five days a week. 90% "more fulfilled," 95% "enjoying coding more." | The page does not state n, duration, or control-group characteristics. Completion-era Copilot, 2023 to 2024. Fulfillment figures are survey. | Medium for the PR and build deltas, with the missing n stated. Low for the satisfaction figures |
| Copilot's own productivity metric and its limit | Ziegler et al. (GitHub), "Productivity Assessment of Neural Code Completion", MAPS 2022, https://arxiv.org/abs/2205.06537; CACM 2024-03 version | 2,631 survey responses matched to IDE telemetry | Acceptance rate about 27%. Acceptance rate is the best predictor of perceived productivity. "The rate with which shown suggestions are accepted, rather than more specific metrics regarding the persistence of completions in the code over time, drives developers' perception of productivity." | The dependent variable is perceived productivity. The paper itself questions whether more accepted suggestions mean more value. | High for the concession that acceptance predicts perception, not output |
| Code volume per developer under Cursor | Cursor, "Developer Habits Report", Spring 2026 (2026-07), https://cursor.com/insights, with figures relayed at https://mnemehq.com/insights/cursor-developer-habits-report-governance-infrastructure/ | "Cursor usage data rather than survey responses." No n, no window for several metrics, no statistical tests | Lines added per developer per week 3.6K (2025-01) to 8.6K (2026-05). p75 lines per PR 125.86 to 345.02. PRs over 1,000 lines 8% to 13.8%. Changes committed without a manual diff acceptance step 7% to 36.3% (2026-01-01 to 05-16). AI-generated code survival about 76% to 81%. p99 user adds 46x the lines and 15x the PRs of the median. Top 10% of users consume about two thirds of tokens. Input tokens over 90% of volume. | No sample size anywhere. Lines added is the metric GitClear and Faros show rising alongside churn. "Survival" is undefined on the page. Cursor's own caveat on its model evaluations: "small differences in scores may not be statistically meaningful." | Low for a front door. Medium as the vendor's own admission that unreviewed commits quintupled in five months |
| Share of Google's new code generated by AI | Pichai, Alphabet Q3 2024 earnings call, 2024-10-30, https://finance.yahoo.com/news/google-ceo-says-more-25-202927484.html; 2026-04-29 statement, https://devops.com/google-ceo-says-75-of-new-code-is-ai-generated/ | CEO statements | 2024-10-30: "more than a quarter of all new code at Google is generated by AI, then reviewed and accepted by engineers." 2025-04: "well over 30%." Late 2025: about 50% (CFO). 2026-04-29: 75%, with engineering described as "truly agentic." | The unit is never defined (characters accepted from completions, lines, commits). The 2024 phrasing "then reviewed and accepted" describes a completion workflow, so the 2026 figure may measure something different. No method has been published. | Low. Do not put a percentage on a front door. Citable only as "Google reports the share rising," with the definition gap stated |
| Share of Microsoft's code written by AI | Nadella at LlamaCon, 2025-04-29, https://techcrunch.com/2025/04/29/microsoft-ceo-says-up-to-30-of-the-companys-code-was-written-by-ai/ | CEO statement in a fireside chat | 20% to 30% of code in Microsoft repositories "written by software," with more progress in Python than C++. | No unit, no method. The language qualifier is the only content that bears on the case. | Low. The Microsoft rollout paper (already cited) is the citable Microsoft source |
| Engineer output at Meta | Susan Li, Meta Q4 2025 earnings call, 2026-01-28, https://www.fool.com/earnings/call-transcripts/2026/01/28/meta-meta-q4-2025-earnings-call-transcript/ | CFO statement | "Since the beginning of 2025, we've seen a 30% increase in output per engineer, but the majority of that growth coming from the adoption of agentic coding, which saw a big jump in Q4." Power users "increased 80% year over year." "We expect this growth to accelerate through the next half." | "Output" is undefined. No method, no code-share figure. Internal targets of 75% AI-written code by mid-2026 come from press reports of internal documents. | Low. The 30% is the same shape as every other undefined output metric |
| How much code professionals say agents write | JetBrains, "How much code do developers really let agents write?", 2026-08, https://blog.jetbrains.com/research/2026/08/how-much-code-do-developers-really-let-agents-write/ | Developer Ecosystem Survey 2026, over 15,000 professional developers, fielded 2026-05 to 07 | About 47% of code "fully written by agents," about 38% with some assistance, about 27% fully manual (buckets, so the sum exceeds 100). Segments: agentic coders about 31% of developers (84% of their code agent-generated), AI-assisted about 47%, manual about 23%. By language: Go, JavaScript, TypeScript 54% to 55% agent-generated; Java and Python 48% to 51%; C and C++ 38% manual on average. Cursor users 58% agent-generated. 32% of Claude Code primary users and 42% of Codex primary users generate over 80% of their code with agents. East Asia 32% to 35% over-80% share, Europe about 16%. | JetBrains' own caveat: "the averages across the three categories could exceed 100% because of the bucketed nature of the answers, and respondents' self-reports may not always be fully accurate." Vendor survey, self-selected. | Medium. The only large-sample language breakdown found, and it is self-report. Extends the round-2 JetBrains row |
| Developer trust, 2025 baseline | Stack Overflow Developer Survey 2025, https://survey.stackoverflow.co/2025/ai; Stack Overflow blog 2026-02-18, https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/ | Global survey; per-question responses 26,500 to 33,600 on the AI pages; 49,000 total | 84% using or planning to use AI. 51% of professionals daily. Agents daily 14.1%, weekly 9%; 52% do not use agents or stick to simpler tools; 38% have no plans to. Distrust accuracy 46%, trust 33%, highly trust 3%. 66% cite "AI solutions that are almost right, but not quite." 45.2% say debugging AI code is more time-consuming. 75.3% would ask a person when they do not trust the AI. | Self-selected respondents. The 2026 survey opened 2026-06-23 and its results page was not live at fetch time (404 at survey.stackoverflow.co/2026); secondary pages quoting "2026" numbers are repeating the 2025 ones. | High for the 2025 numbers. Do not cite 2026 numbers. Extends the round-2 Stack Overflow row with the frustration and debugging figures |

---

## 3. Independent large-sample analyses of the telemetry

**Verdict.** The commit trailer is now a research instrument. Three groups have used the
`Co-Authored-By: Claude` string at GitHub scale. Together they license two statements: agent
adoption raises a developer's commit count and language breadth, and agent commits carry a
measurable static-analysis debt that partly persists. Acceptance rates for agent PRs in the wild
sit 15 to 40 points below human PRs on features and fixes and above human on documentation.

| Bears on | Source | Method and sample | Numbers | Caveats | Citability |
|---|---|---|---|---|---|
| Effect of Claude Code adoption on a developer's output and breadth | Quispe and Xu, "Coding Beyond Your Training" (v1, 2026-05-25) retitled "Agentic Delegation and the Language Frontier of Software Developers" (v2, 2026-07-07), https://arxiv.org/abs/2605.25438v1 (the bare URL serves v2, whose panel is 5,346 and whose effect is about +35 commits; cite the version) | v1: 7,786,771 commits with the Claude co-author trailer, 185,517 distinct authors, 13 months; panel of 5,838 developers over 28 months; staggered adoption 2025-05 to 2026-01; Callaway and Sant'Anna doubly robust estimator against not-yet-treated developers. v2: 5,346 developers, 57M changed files | v1: +41 monthly commits, +1.5 repositories, +0.83 languages, +0.14 Shannon entropy, +0.31 newly used languages. v2: +2.5 active languages against a 0.9 baseline, +1.2 new languages, +0.38 entropy; an "activation band of unfamiliar languages." Results survive excluding Claude-coauthored commits. | "Adoption is voluntary and may coincide with project shocks, the estimates are event-time associations rather than definitive causal effects." Commits are counts, not value. Public GitHub only. | High for the method and the adoption effect on commit counts. The 7.8M-commit harvest is the largest Claude Code sample in the literature |
| Static-analysis debt in AI-authored commits | Liu, Widyasari, Zhao, Irsan, Chen, Lo, "Debt Behind the AI Boom", 2026-03-30 (rev. 04-26), https://arxiv.org/abs/2603.28592 | 302,600 verified AI-authored commits from 6,299 repositories with over 100 stars, five assistants, Python and JavaScript/TypeScript; static analysis before and after each change; lifecycle tracking | 484,366 issues, 89.3% code smells. Over 15% of commits from every tool introduce at least one issue, 17.4% (Copilot) to 29.1% (Gemini). Claude highest issues per commit at 1.95, Devin lowest at 0.89. 22.7% of AI-introduced issues survive at HEAD. Python top issue "broad exception handling" 14.9%; JS/TS "unused variables or parameters" 13.6%. | Attribution by Git metadata only. "Static analysis tools can produce false positives." Excludes architectural, design, documentation, and test-adequacy debt. Public repos over 100 stars. | High. The per-tool issue rate is the one number in this round that names Claude unfavourably, and the case should carry it |
| Acceptance of agent PRs against human PRs, by agent and task | Li, Zhang, Hassan, "The Rise of AI Teammates in SE 3.0", 2025-07-22, https://arxiv.org/abs/2507.15003; the AIDev dataset paper, 2026-02-09, https://arxiv.org/abs/2602.09185 | AIDev, per the 2026-02 dataset paper (2602.09185): 932,791 agent PRs, 116,211 repositories, 72,189 developers, five agents, to 2025-08-01. The 2025-07 paper (2507.15003) that carries the acceptance table reports 456,535 PRs; attach each count to its paper. AIDev-pop: repositories over 500 stars, PRs classified into Conventional Commits types by GPT-4.1-mini | Accepted: human 76.8%, Codex 65.3%, Claude Code 52.5%, Cursor 51.4%, Devin 48.9%, Copilot 38.2%. Documentation PRs: Codex 88.6% and Claude Code 85.7% against human 76.5%. Feature and fix PRs lag human by 15 to 40 points. Median review to accept: Codex 0.3h, Claude Code 6.9h, human 3.9h, Copilot 17.2h. Only 9.1% of agent PRs changed cyclomatic complexity against 23.3% of human PRs. TypeScript is the top language for every agent (26.4% of all agent PRs; 46.2% of Cursor, 54.6% of Devin, 26.2% of Claude Code); Python 20.1%. | "These results were captured just two months into the public" release of most agents. Open-source, self-selected PRs. Task labels from an LLM. The authors say the gap "should not be interpreted as a sign of failure." | High for the acceptance table with its 2025-mid date stated. The TypeScript dominance is the one language datum with a method that bears on the case |
| Tests agents write, by language | Hora and Robbes, "Are Coding Agents Generating Over-Mocked Tests?", MSR 2026, 2026-01-30, https://arxiv.org/abs/2602.00409 | Over 1.2M commits from 2025 across 2,168 TypeScript, JavaScript, and Python repositories; 48,563 agent commits | 23% of agent commits modify tests against 13% of non-agent commits. 36% of agent commits add mocks against 26%. Python mock ratio 27%, JS/TS 21%. | "The quality of these tests remains uncertain." | Medium. Agents write more tests and more mocks; the quality is unmeasured |
| Where the money in a codebase goes after AI | Mujahid, Chatterjee, Imran, "Evidence from Code Comments", 2026-06-05, https://arxiv.org/abs/2606.06843 | 35,361 code comments naming an AI tool, 12,996 follow-up commits, 2022-12 to 2026-03, LLM classifiers with Dawid-Skene aggregation | Comments shift over time "from direct code generation toward knowledge and conceptual support and code enhancement." Follow-up commits are mostly refactoring, extension, and fixes. | Only code that announces its AI origin in a comment. No rates. | Low to medium. A shape, not a number |
| DORA's ROI framing | DORA, "ROI of AI-assisted Software Development" (2026.01), 2026-04-22, https://dora.dev/ai/roi/report/, summarised at https://www.infoq.com/news/2026/05/dora-roi-ai-assisted-dev-report/ | Reuses the 2025 survey (nearly 5,000 professionals, 100+ interview hours); a seven-capability value model and a calculator | Simple greenfield tasks 35% to 40% gain; complex legacy code "about 10% or less." Worked example: 500-person org, $8.4M cost, $11.6M first-year return, 39% ROI, eight-month payback. Change failure rate 5% to 6% after adoption. J-curve dip before gains. | The authors: "Treat these calculations as a high-uncertainty estimate meant to spark a conversation, rather than a rigid mathematical formula." The 35% to 40% is the Stanford deck's range restated. | Medium for the greenfield-versus-legacy split. Low for the dollar figures. Extends the round-2 DORA row |

---

## 4. What bears on the case's specific claim

The claim: agents work well against a conventional, documented, gated stack. The telemetry
touches four of its five words and measures none of them as a treatment.

- **Conventional (language and framework).** TypeScript is the most-contributed language on
  GitHub (Octoverse 2025) and the top language for every agent's PRs in AIDev (26.4% overall).
  JavaScript, TypeScript, HTML, and CSS were 59% of Claude coding queries in 2025-04 (Anthropic).
  JetBrains respondents on Go, JavaScript, and TypeScript report the highest agent-written share
  (54% to 55%). Nadella reported more progress in Python than C++. Acher and Jézéquel (arXiv
  2606.13763, 34 chess engines in 17 languages) found strong output only in mainstream compiled
  languages, with cost rising for exotic ones. Every one of these is a distribution of use, not
  an outcome by language. No source found measures success or cost by framework. SvelteKit is
  named in none of them.
- **Documented.** Nothing new this round. The round-3 rows (Lulla et al., Khatri, Trivedi and
  Schmitt) remain the whole evidence: context files cut runtime and tokens at flat correctness.
- **Gated (tests and checks).** Agents modify tests in 23% of commits against 13% for humans, and
  add mocks more often (Hora and Robbes). Existing tests covered 27% of changed Python lines in
  agent PRs (Dipongkor, round 3). Ma, Kereopa-Yorke, and Schultz, "Building to the Test" (arXiv
  2606.28430, 18 runs, Opus 4.7 and GPT-5.5, a 222-test Playwright oracle): with the oracle
  visible, agents scored near-perfect while leaving "the library dead or absent"; with it hidden,
  they shipped incomplete but present code. That is the sharpest finding this round for a
  gated stack. A gate the agent can see is a target, not only a check. The authors say
  prevalence "remains an open question."
- **Repository maturity.** DORA 2026 restates the Stanford split (35% to 40% greenfield, about 10%
  legacy). The Debt paper filters at 100 stars and reports no maturity gradient. AIDev filters at
  100 and 500 stars and reports none either. No source varies maturity as a treatment.
- **Task type.** Documentation PRs are accepted above human rates (85.7% for Claude Code);
  features and fixes 15 to 40 points below (Li et al.). Anthropic's session mix is a quarter
  building, a quarter fixing, and 5% testing and orchestrating. The case's measured scope
  (admin routes and stores on an existing scaffold) is feature work, which is the weakest
  category in the wild.

---

## 5. The honest counter

What the same publishers concede, in their own words where possible.

- **Anthropic.** "We only studied what developers delegate to AI, not how they ultimately use AI
  outputs in their codebase, the quality of the resulting code" (2025-04). "If users avoid tasks
  they expect to fail, observed success rates will overstate true capability" (2026-01). "We
  cannot measure real-world outcomes, like whether code written in a session is actually used or
  discarded" (2026-06). The survey sample is "not representative of the general population" and
  self-assessed gains "do not rule out skill erosion" (2026-06). Verified success in Claude Code
  sessions is 28% to 33% for experts.
- **GitHub.** Octoverse figures are "observational signals rather than causal claims." Ziegler et
  al. found acceptance rate drives "developers' perception of productivity," not persistence in
  code. The Accenture RCT page states no n.
- **Cursor.** Publishes no sample. Its own numbers show unreviewed agent commits rising from 7% to
  36.3% in five months and p75 PR size nearly tripling, the same shape GitClear and Faros read as
  churn.
- **Surveys.** JetBrains: "respondents' self-reports may not always be fully accurate." Stack
  Overflow: 46% distrust accuracy, 3% highly trust, 66% name "almost right, but not quite" as the
  top frustration, and 45.2% say debugging AI code takes longer.
- **Independent.** Over 15% of every tool's commits add a static-analysis issue and 22.7% persist
  (Liu et al.). Claude carries the highest issues per commit of the five tools at 1.95. Agent
  feature PRs are accepted 15 to 40 points less often than human ones (Li et al.). Agents build
  to a visible test oracle (Ma et al.).
- **The CEO figures.** Google 75%, Microsoft 20% to 30%, Meta +30% output: none defines its unit,
  and Google's 2024 phrasing ("then reviewed and accepted") describes completions, so the series
  may not be one series.

What a skeptic will cite from these sources: the 79% automation share on Claude Code next to the
28% to 33% verified success; the 1.95 issues per Claude commit; the 52.5% Claude Code PR
acceptance against 76.8% human; the 36.3% of Cursor changes committed unreviewed; and Anthropic's
own line that it cannot see whether the code was kept.

---

## The three strongest large-sample citations for a front door

1. **Quispe and Xu, arXiv 2605.25438 (2026):** 7.8M Claude Code co-authored commits from 185,517
   authors, and a 5,838-developer panel showing +41 monthly commits and wider language breadth
   after adoption under a staggered-adoption estimator. Supports: "A very large population now
   builds with agents, and adoption measurably raises what a developer ships to a repository."
2. **Anthropic, "How Claude Code is used in practice" (2026-06-16), 400,000 sessions:** people make
   about 70% of planning decisions and about 20% of execution decisions; verified success 28% to
   33% for experienced users. Supports: "The developer keeps the plan and the agent takes the
   execution, and a third of sessions end with a hard success signal, which is why the repository
   needs its own gate."
3. **Li, Zhang, Hassan, arXiv 2507.15003 with AIDev (932,791 agent PRs):** TypeScript is the top
   language for every agent; documentation PRs are accepted above human rates and feature PRs 15 to
   40 points below. Supports: "Agents do their best work in the mainstream typed web stack and on
   well-specified tasks, and feature work still needs a reviewer."

A counter-column citation for the same door: Liu et al., arXiv 2603.28592 (302,600 AI commits):
over 15% of every tool's commits introduce a static-analysis issue, and 22.7% persist.

## The narrowest sentence the whole telemetry base sustains

Millions of developers now commit agent-written code, most of it in the mainstream typed web
stack, with the human keeping the planning decisions and the agent most of the execution; the
vendors' own data show the delegated work succeeds by a hard signal about a third of the time
and is accepted less often than human work on features, so the published telemetry supports
"agents are the normal way this stack is built" and does not support "agents build it well
without a gate."

## Found nothing

- An Anthropic figure for Claude Code's share of API traffic (the report says "a large share"
  and gives no percentage).
- Any Anthropic breakdown of session success by language, framework, or test presence.
- A Stack Overflow 2026 results page (the survey opened 2026-06-23; the results URL was 404 on
  2026-09-04; pages quoting "2026" trust numbers repeat 2025).
- A GitHub Octoverse 2026 edition (not published as of this search).
- A GitHub Copilot coding-agent merge rate published by GitHub with a method.
- A GitHub Copilot enterprise RCT from 2025 or 2026 with a stated n.
- A Cursor sample size, window, or method for the Developer Habits Report.
- A defined unit for Google's 25%-to-75% series, Microsoft's 20% to 30%, or Meta's 30% output.
- Any telemetry study that varies framework, scaffold, or test coverage as the treatment.
- Any source that names SvelteKit, Cloudflare Workers, or a comparable stack.
- A DORA 2026 survey wave (the 2026.01 ROI report reuses the 2025 sample).
- The per-agent merge rates from the 2026-02 AIDev paper itself (the paper is a dataset
  description; the rates come from the 2025-07 companion).
- A primary Nadella source (TechCrunch relay read).
