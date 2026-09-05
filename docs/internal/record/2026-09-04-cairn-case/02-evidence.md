# Front-door concept figure: evidence file

Research date: 2026-09-04. Every number below carries the date it was read, because install
counts, ratings, and survey headlines move. Sources fetched directly are marked; anything not
verified by fetch is flagged in its caveat column.

The register bar applied throughout: peer-reviewed studies, large-sample industry reports,
vendor documentation for capability facts, named case studies with numbers. Vendor marketing
is not accepted for efficacy claims.

---

## Claim 1: agentic coding and scaffolded environments

**Verdict, line 1 (what can be cited).** Cite that AI coding assistance raises measured output
on well-specified tasks, with two real RCTs carrying numbers: 55.8% faster on a greenfield task
(n=95) and 26.08% more tasks completed across three field experiments (n=4,867). Cite DORA's
finding that AI amplifies existing organisational quality rather than substituting for it, and
cite that models resolve issues at higher rates in widely represented languages.

**Verdict, line 2 (what cannot be cited).** Do not claim that documentation, scaffolding, or
shipped agent skills measurably raise agent success. The one study that tests exactly that
(repository context files) found no general improvement and a 20% cost increase, and METR's RCT
found experienced developers 19% slower with AI in mature, high-quality repositories. No study
tests "starter site plus documented seams" as an isolated variable, and no study prices custom
code against architecture choice for small teams.

### Evidence for

| Source | Sample and method | Finding | Caveats | Citable |
|---|---|---|---|---|
| Peng, Kalliamvakou, Cihon, Demirer (Microsoft Research / GitHub), "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot", 2023, https://arxiv.org/abs/2302.06590 | RCT, 95 professional developers recruited via Upwork, one well-specified HTTP-server task in JavaScript, Copilot versus no Copilot | Treatment group finished 55.8% faster, about 1h11m against 2h41m. Less experienced developers gained most. | One narrow greenfield task in a widely used stack, not a mature codebase. The study did not manipulate scaffolding as a variable. | High for the number, with the "single greenfield task" label attached |
| Cui, Demirer, Jaffe, Musolff, Peng, Salz, "The Effects of Generative AI on High-Skilled Work: Evidence from Three Field Experiments with Software Developers", Management Science, https://doi.org/10.1287/mnsc.2025.00535 (SSRN preprint https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4945566) | Three company RCTs (Microsoft, Accenture, an anonymous Fortune 100 firm), pooled n=4,867 developers, real production work | 26.08% increase in completed tasks (SE 10.3%) with AI access. Less experienced developers adopted more and gained more. | Measures code completion, not agentic coding. Does not isolate environment quality. | High |
| DORA, 2024 Accelerate State of DevOps Report and 2025 State of AI-assisted Software Development Report, https://dora.dev/dora-report-2025/ | 2024: roughly 39,000 professionals. 2025: nearly 5,000 technology professionals, with a cluster analysis producing seven team profiles. | 2024: a 25-point rise in AI adoption associated with a 1.5% fall in delivery throughput and a 7.2% fall in delivery stability. 2025: AI amplifies existing strengths and dysfunctions. 90% of organisations have adopted at least one internal platform, and platform quality correlates with realising AI's value. DORA's AI Capabilities Model names quality internal platforms, healthy data ecosystems, AI-accessible internal data, and strong version control practices among its factors. | This is organisational and platform quality, not repository-level scaffolding. Extending it down to "documented seams in a library" is an extrapolation the report does not make. The 2024 numbers were corroborated across several secondary summaries but not confirmed against DORA's own PDF text. | Medium to high, with the extrapolation stated openly |
| SWE-bench Multilingual analyses and "The SWE-Bench Illusion", https://arxiv.org/abs/2506.12286 | Cross-language and cross-repository benchmark analysis | Models resolve issues at meaningfully higher rates in Python and Java than in less represented languages, attributed to their share of pre-training corpora. File-path identification accuracy drops by up to 47 points on unfamiliar repositories against popular ones. | The named mechanism is memorisation of popular repositories, not "conventional code is easier". A skeptic can turn this citation around. | Medium, and awkward to use on a front door |
| "Agent READMEs: An Empirical Study of Context Files for Agentic Coding", https://arxiv.org/abs/2511.12884 | 2,303 agent context files across 1,925 repositories, descriptive content analysis | Context files evolve like configuration code. Coverage: test procedures 75.9%, implementation details 70.8%, architecture 68.1%, security 14.8%, performance 14.5%. | Descriptive only. Measures no task outcome, so it cannot support efficacy. | Medium for "the practice exists at scale", not citable for efficacy |

### Counter-evidence

| Source | Sample and method | Finding | Why it bites | Citable |
|---|---|---|---|---|
| METR, "Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity", July 2025, https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ and https://arxiv.org/abs/2507.09089 | RCT, 16 experienced open-source developers, 246 real issues averaging about two hours, in large mature repositories they had worked in for years. Cursor Pro with Claude 3.5 and 3.7 Sonnet. | Developers were 19% slower with AI while believing they were 20% faster. Experts had predicted 38 to 39% faster. | This is the citation a skeptic reaches for first. METR names as moderators the repositories' many implicit requirements (documentation, test coverage, linting), the developers' deep tenure, only about 50 hours of Cursor experience, and a hypothesis that AI capability is lower where quality standards are very high. | High. Cite it directly rather than let a reader find it |
| "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?", https://arxiv.org/abs/2602.11988 | SWE-bench-style tasks with LLM-generated context files added, plus a novel issue set from repositories carrying developer-written context files, across several LLMs and agents | Providing context files does not generally improve task success rates, and increases inference cost by over 20% on average. Agents do follow embedded instructions. The authors' recommendation is that context files earn their place for non-standard conventions, not general orientation. | This tests almost exactly the "documented seams and shipped agent skills" mechanism, and returns a null. | Medium to high. Only the abstract was read cleanly, so treat the methodology as unread |
| "Configuration Smells in AGENTS.md Files", https://arxiv.org/abs/2606.15828 | 100 popular open-source repositories, heuristic detectors for six smells | 91 of 100 repositories showed at least one smell. Lint Leakage (restating linter-enforced rules) was most common, 62 instances. | Supports the softer point that agent-facing documentation is commonly written badly. Measures no outcome. | Medium as description, not efficacy |
| Stack Overflow Developer Survey 2025, https://survey.stackoverflow.co/2025/ai and https://stackoverflow.blog/2025/10/23/what-leaders-need-to-know-from-the-2025-stack-overflow-developer-survey/ | Stack Overflow's annual global developer survey. The precise respondent count was not re-verified from the primary page. | Trust in AI output accuracy fell to 29%, from 43% in 2024 and 40% in 2023. 46% actively distrust accuracy against 33% who trust it. 45% name "AI solutions that are almost right, but not quite" as their top frustration, and 66% report spending more time fixing almost-right AI code. | Sets the sentiment backdrop against any confident productivity framing. | High for the numbers, low for relevance to the specific comparison |

### The honest gap

No study directly compares agent effectiveness in a scaffolded, documented starter environment
against a bespoke one as an isolated variable. The claim's economic half, that agent-assisted
coding lowers custom-code cost enough to change which architectures a small team can afford,
has no direct empirical study. The productivity multipliers above are the nearest proxy, and no
cited paper draws the architecture inference from them.

A defensible synthesis, if the caption needs one: AI assistance raises output on well-specified
work in widely used stacks, and the environment moderates how much value an organisation
realises. The refinement METR forces is that explicit, written context is what helps, and tacit
convention is what hurts.

---

## Claim 2: the integrated platform

**Verdict, line 1 (what can be cited).** Every capability fact is citable from primary vendor
documentation: Workers hosts a full-stack SvelteKit app, D1 supplies serverless SQL, R2 supplies
object storage without egress fees, Email Sending sends from a Worker binding, Workers Builds
deploys on push from a connected repository, Universal SSL issues free certificates, and DDoS
protection is unmetered on all plans. Both Cloudflare and GitHub publish agent tooling, and the
specific artefacts (Agents SDK, sixteen remote MCP servers, `llms.txt`, a Claude Code setup page,
the GitHub MCP server, the `gh` CLI, the Copilot coding agent) are documented at named URLs.

**Verdict, line 2 (what cannot be cited).** There is no rigorous, independent, small-team-specific
study showing that a single-platform stack reduces operational burden against a multi-vendor one.
The efficacy half is a plausible hypothesis, not an evidenced finding. Two caveats must ride with
the capability facts: Email Sending is in public beta and requires the Workers paid plan, and the
free-plan WAF is a reduced subset rather than the full product.

### Capability facts (citable, vendor documentation)

| Capability | Documented statement | URL | Caveat |
|---|---|---|---|
| SvelteKit on Workers | SvelteKit apps deploy to Cloudflare Workers with Workers Assets, and with bindings the app integrates with the developer platform. The adapter emits `main: .svelte-kit/cloudflare/_worker.js` plus assets, deployed by one command. | https://developers.cloudflare.com/workers/frameworks/framework-guides/svelte/ | None noted |
| D1 | A managed, serverless database with SQLite's SQL semantics, built-in disaster recovery, and Worker and HTTP API access. Multiple databases at no extra cost. | https://developers.cloudflare.com/d1/ | Per-plan storage and row limits live on a separate limits page, not fetched |
| R2 | Stores large amounts of unstructured data without egress bandwidth fees. | https://developers.cloudflare.com/r2/ | Zero egress is framed against typical cloud storage. Storage and operation costs still apply |
| Email Sending | `env.EMAIL.send()` binding and a REST API send transactional email, up to 50 recipients, attachments to 5 MiB across 32 files. | https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/ and https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/ | **Public beta since 2026-04-16, not GA, and documented as requiring the Workers paid plan.** This materially qualifies the claim and must be stated |
| Workers Builds | Connect a Worker to a GitHub or GitLab repository for automated builds and deployments on push. | https://developers.cloudflare.com/workers/ci-cd/builds/ | Works for GitLab too, so it is not a GitHub-only path |
| Universal SSL | Cloudflare issues and renews free, unshared, publicly trusted SSL certificates for all domains added and activated on Cloudflare. | https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/ | Whether "unshared" holds at the free tier specifically was not confirmed. Verify before quoting that word |
| WAF | The WAF is available on all plans. The free tier carries custom rules, one rate-limiting rule, IP access rules, and the Free Managed Ruleset only. | https://developers.cloudflare.com/waf/ | Attack score, advanced rate limiting, account-level WAF, and managed IP lists are paid. Free WAF is a subset |
| DDoS protection | Standard, unmetered DDoS protection at layers 3 to 7, available on all plans, with automatic detection and mitigation. | https://developers.cloudflare.com/ddos-protection/ | None found on that page |
| Agents SDK | The `agents` npm package gives an agent durable identity, local SQL storage, real-time connections, scheduled work, and recoverable execution, across chat, voice, email, Slack, and webhook channels, with MCP tool integration. | https://developers.cloudflare.com/agents/ | None noted |
| Remote MCP servers | Sixteen hosted MCP servers, including Docs, Workers Bindings, Workers Builds, and Observability. | https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/ | None noted |
| `llms.txt` | `developers.cloudflare.com/llms.txt` indexes all products, each product carries its own file, and an `agent-setup/llms-full.txt` exists for coding-agent setup. | https://developers.cloudflare.com/llms.txt and https://developers.cloudflare.com/agent-setup/llms-full.txt | None noted |
| Claude Code setup docs | A dedicated page for Claude Code with Cloudflare, including a skills plugin and MCP server registration. | https://developers.cloudflare.com/agent-setup/claude-code/ | None noted |
| GitHub MCP server | GitHub's official remote MCP server supplies structured repository context: repository search, issues, pull requests, code context, and Actions run insight, hosted at `https://api.githubcopilot.com/mcp/`. | https://github.com/github/github-mcp-server | Remote use requires GitHub authentication |
| `gh` CLI | A terminal interface covering repositories, issues, pull requests, Actions, releases, secrets, and projects. | https://cli.github.com/manual/ | None noted |
| Copilot coding agent | An asynchronous background agent that takes a task from an issue or comment, creates a branch, writes code, opens a pull request, and iterates on review feedback. | https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent | Requires a Copilot entitlement. Restricted to `copilot/*` branches and single-repository scope |
| GitHub Apps | GitHub Apps act on GitHub, opening issues, commenting on pull requests, and managing projects. | https://docs.github.com/en/apps/overview | **The distinct bot-identity and programmatic-commit wording was not verified on the page fetched.** Fetch the "Authenticating as a GitHub App" page before quoting language about a bot committer |
| GitHub REST and GraphQL APIs | Not fetched this session. | https://docs.github.com/en/rest and https://docs.github.com/en/graphql | **Unverified this pass.** Fetch before citing |

### Efficacy evidence (weak, and honest about it)

| Source | Sample and method | Finding | Caveats | Citable |
|---|---|---|---|---|
| DX, the "DevTool sprawl" statistic circulated from getdx.com | Primary methodology not located | Developers reported losing 6 to 15 hours a week, affecting 75% of developers | The original instrument and sample size could not be confirmed by fetch. The figure is recycled widely in marketing content. | Low. Do not cite without the primary document |
| Zylo 2025 SaaS Management Index and BetterCloud 2025 State of SaaSOps | Zylo works from platform telemetry over 40M-plus licences and about $40B in spend, not a disclosed company sample. BetterCloud surveyed about 600 IT professionals. | Zylo: small companies average about 152 applications against about 660 for large enterprises, though an 87-application figure also circulates for small companies. BetterCloud: the average company runs about 106 SaaS applications in 2025. | These count applications, not vendors, and say nothing about a small team's operational burden or about this stack. The secondary summaries disagree with each other. | Low for the claim, medium as background that sprawl exists |
| Springer, "Critical analysis of vendor lock-in and its impact on cloud computing migration", Journal of Cloud Computing | Peer-reviewed, citing a survey of 114 participants | 35.1% named loss of control and over-dependence on a single provider as a core barrier to cloud adoption | About cloud adoption generally, modest n, not small-team specific | Medium, as backdrop for the lock-in drawback |

### Counter-evidence

| Source | Finding | Why it bites | Citable |
|---|---|---|---|
| Cloudflare's own postmortem of the 2025-11-18 outage, Cloudflare blog | An outage from 11:20 to 17:06 UTC, about five hours 46 minutes, caused by a database permissions change that corrupted a Bot Management feature file and panicked the proxy. CDN, Turnstile, Workers KV, Access, Email Security, and the dashboard failed together. | This is the single-point-of-failure argument in one dated, vendor-authored document. Consolidating hosting, DNS, auth, database, and email on one account concentrates blast radius. | High as a counter-example. Disclose it rather than let a reader supply it |
| Vendor lock-in literature (above) | Loss of negotiating leverage and expensive migration once entangled | The standard rebuttal to consolidation | Medium |
| No study located | No work isolates vendor count as a variable against operational burden, cognitive load, or incident rate for small teams. DX Core 4 and SPACE describe measurement, not this comparison. | The efficacy half stands unevidenced | Absence recorded |

---

## Claim 3: git-managed content

**Verdict, line 1 (what can be cited).** The mechanism is documented across the category, not
peculiar to cairn: Decap commits an editor's draft to a per-entry branch named
`cms/collectionName/entrySlug` and opens a pull request, and TinaCMS documents an app identity
(`tina-cloud-app`) committing on the editor's behalf. Every scale and concurrency cost is
citable from GitHub's own limits documentation with exact numbers. The security argument for
having no content database is citable from Patchstack's disclosure data: 7,966 new WordPress
ecosystem vulnerabilities in 2024, 96% of them in plugins.

**Verdict, line 2 (what cannot be cited).** Nothing establishes that git-managed content is the
better choice, and the category is small: WordPress alone holds 58.9% of sites with a known CMS,
and git-based CMS tools do not appear as a tracked W3Techs category at all. "Git has no
relational query and no full-text search" has no citable source and should be asserted as an
architectural fact, not attributed. There is no named case study of a git CMS failing at scale,
and no survey data on how non-technical editors feel about markdown against rich text.

### Evidence for

| Source | Method | Finding | Caveats | Citable |
|---|---|---|---|---|
| Decap CMS editorial workflow docs, https://decapcms.org/docs/editorial-workflows/ | Vendor documentation | Saving a draft commits to a new branch named `cms/collectionName/entrySlug` and opens a pull request. Review pushes further commits. Ready merges the pull request and deletes the branch. | The docs do not name the committer identity for the GitHub backend. | High for the per-entry-branch pattern |
| TinaCMS git co-authoring docs, https://tina.io/docs/tinacloud/git-co-authoring | Vendor documentation | Two identity modes. "Act as You" performs git actions under the user's GitHub identity. Co-authoring has `tina-cloud-app` make the commit with the user as a co-author trailer. The plain default is authored by `tina-cloud-app`, which the docs say makes attribution hard. | Documents the attribution problem the app-commits pattern creates, so it cuts both ways. | High for "an app commits on the editor's behalf" as a category pattern |
| Pages CMS docs, https://pagescms.org/docs/ | Vendor documentation | "It edits files in your repository directly. There is no separate CMS database for content." | Commit identity and branch behaviour unspecified. | High for the no-database framing |
| Keystatic GitHub mode docs, https://keystatic.com/docs/github-mode | Vendor documentation | OAuth login at `/keystatic`, a branch-prefix feature scoping which branches Keystatic touches, repository write access required. | Branch and pull-request mechanics were not captured in full. | Medium |
| Patchstack, "State of WordPress Security in 2025", https://patchstack.com/whitepaper/state-of-wordpress-security-in-2025/, data updated 2025-03-14 | Vulnerability disclosure data for calendar 2024 | 7,966 new vulnerabilities in the WordPress ecosystem, up 34% on 2023. 96% in plugins, 4% in themes, 7 in core with none posing a widespread threat. 33% were unpatched at public disclosure. Sucuri data relayed in the same report: over 500,000 sites infected in 2024, including 422,466 SEO spam and 175,520 malicious redirect cases. Named exploited cases include LiteSpeed Cache, WordPress Automatic (SQL injection), and Bricks Builder (remote code execution exploited within hours). | Patchstack sells a competing security product, so present these as disclosure counts, not as an endorsement. The Sucuri figures are relayed, not fetched from Sucuri. A separate 2025 full-year figure of 11,334 vulnerabilities, 91% in plugins, came from a search snippet and was **not verified by fetch**. | High for the 2024 numbers |
| npm registry API download counts, week of 2026-08-23 to 2026-08-29, read 2026-09-04 | Registry API, exact | Decap CMS 3,059 weekly downloads. TinaCMS 70,261. `@keystatic/core` 134,619. GitHub stars, read 2026-09-04: Decap 19.3k, Tina 13.8k, Keystatic 2.3k. | Raw numbers, no trend narrative. | High as raw figures, weak as an adoption argument |

### Capability facts on the cost side (GitHub documentation, all fetched)

| Limit | Figure | URL |
|---|---|---|
| Repository size, soft targets | Ideally under 1 GB, under 5 GB strongly recommended | https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github |
| File size warning and block | Warning above 50 MiB, blocked above 100 MiB, 25 MiB via browser upload | same |
| GitHub App REST rate limit | 5,000 requests an hour per installation, 15,000 on Enterprise Cloud, scaling by 50 an hour per repository beyond 20 and per user beyond 20, ceiling 12,500 an hour | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api |
| Secondary rate limits | 100 concurrent requests, 900 points a minute per endpoint, 90 seconds CPU per 60 seconds wall time, 80 content-generating requests a minute and 500 an hour | same |
| Contents API file size | Full support to 1 MB, raw or object media types only from 1 to 100 MB with an empty `content` field, unsupported above 100 MB | https://docs.github.com/en/rest/repos/contents |
| Git LFS per-file limits | 2 GB Free and Pro, 4 GB Team, 5 GB Enterprise Cloud | https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage |

### Counter-evidence

| Source | Finding | Why it bites | Citable |
|---|---|---|---|
| Decap CMS issues #1691 and #277, https://github.com/decaporg/decap-cms/issues/1691 and https://github.com/decaporg/decap-cms/issues/277 | Merge conflicts cannot be resolved from the CMS interface, and the editor is not notified when the base branch moves under a changeset. Concurrent editing has no presence indication, so users "have to verbalize" who is editing what. | These are the project's own open, tracked issues, so the concurrency cost is admitted by the category rather than alleged by a critic. | High |
| W3Techs CMS overview, https://w3techs.com/technologies/overview/content_management, data dated 2026-09-05, read 2026-09-04 | WordPress holds 58.9% of sites with a known CMS and 40.7% of all websites. Shopify 7.7%, Wix 6.1%, Squarespace 3.6%, Joomla 1.7%. Git-based CMS tools are not a tracked category. | The honest scale context. This model is a niche. | High |
| Community estimate, no primary source | A Decap project scales to roughly 10,000 entries before GitHub API rate limits bite, because search loads all collection entries. | Consistent with the rate-limit arithmetic above, but **not from a primary document**. Do not cite as a documented number. | Low |
| Flat-file versus database thresholds circulating in vendor-adjacent blogs | Claims like "flat file wins under 500 pages, a database wins above 1,000 items or with content that references other content" | No methodology, vendor-adjacent. **Do not cite the numbers.** | Low |
| No source found | No named case study of a git-based CMS failing at scale. No survey of non-technical editor satisfaction with markdown against rich text. | Both are real gaps a skeptic can walk into. | Absence recorded |

### The honest gap

The Jamstack Community Survey sample sizes are confirmed (6,544 responses in 2022 over
2022-06-27 to 2022-08-15; 7,487 in 2021; more than 3,000 in 2020), but no split between
git-based and API-based CMS usage was retrieved from them. Do not assert a git-CMS category
share; no such published number was found.

---

## Claim 4: no page builder is a feature as well as a cost

**Verdict, line 1 (what can be cited).** Two hard, directly fetched facts carry this. Classic
Editor, the plugin that restores the pre-block editor, sits fourth among all WordPress plugins
by active installs (8 million plus, 4.9 out of 5 across 1,246 reviews, tested to WordPress
7.0.4, read 2026-09-04), nearly eight years after the block editor shipped in WordPress 5.0.
And WordPress's own developer documentation shows that block content embeds builder-specific
markup, JSON attributes inside HTML comments, directly in `post_content`.

**Verdict, line 2 (what cannot be cited).** Do not cite the Gutenberg plugin's 2.1-star rating
as the block editor's rating without the caveat that the plugin is the beta channel, or a
skeptic dismantles it in one line. Do not imply builders are a fringe choice: Elementor alone
runs about 31% of WordPress sites and 12.8% of all websites W3Techs tracks. And there is no
survey with a stated sample size on page-builder lock-in or migration regret. The migration
cost is documented by community experience, not by an official disclosure.

### Evidence for

| Source | Method | Finding | Date read | Caveats | Citable |
|---|---|---|---|---|---|
| Classic Editor plugin page, https://wordpress.org/plugins/classic-editor/ | Fetched directly | 8 million plus active installations. Rating 4.9 out of 5 across 1,246 reviews (1,185 five-star, 28 four-star, 14 three-star, 3 two-star, 16 one-star). Last updated about three months before the read. Tested up to WordPress 7.0.4. | 2026-09-04 | The page's support sentence still reads "fully supported and maintained until 2024, or as long as is necessary", stale text that survived the 2021 extension. Cite the staleness openly or leave the sentence out. | High for install, rating, and review counts |
| WordPress popular plugins listing, https://wordpress.org/plugins/browse/popular/ | Fetched directly | Ranked by active installs: Elementor Website Builder, Yoast SEO, and Contact Form 7 at 10M plus; **Classic Editor fourth at 8M plus**; LiteSpeed Cache and WooCommerce at 7M plus. | 2026-09-04 | WordPress.org install counts are coarse buckets, so quote the bucket, never a precise number. | High |
| WordPress block-editor documentation, https://developer.wordpress.org/block-editor/getting-started/fundamentals/markup-representation-block/ | Fetched directly | Block content is stored in `post_content` as HTML comment delimiters carrying JSON attributes, for example `<!-- wp:image {"sizeSlug":"large"} --> ... <!-- /wp:image -->`. | 2026-09-04 | This is the cleanest anchor for "layout markup lives inside the content", and it comes from WordPress's own docs rather than a critic. It also proves the point applies to core, not only to third-party builders. | High |
| WordPress 5.0 release, December 6, 2018 | Secondary sources (Kinsta, Gutenberg Times) via search | WordPress 5.0 shipped the block editor as the default post and page editor, replacing TinyMCE. | 2026-09-04 | **Not fetched from wordpress.org.** Before publishing, fetch https://wordpress.org/news/2018/12/bebo/ or the version-5-0 documentation page. | Medium until the primary URL is fetched |
| Elementor deactivation behaviour | A third-party guide (InstaWP) plus live wordpress.org support-forum threads ("Critical error after deactivating Elementor plugin") | Deactivating Elementor leaves built pages as unrendered raw output or a critical error. There is no official conversion path to blocks. Elementor stores layout in its own structure rather than as portable markup in `post_content`, and conversion tools carry only simple text, headings, and images; widgets, custom CSS, and dynamic content need rebuilding by hand. | 2026-09-04 | No canonical WordPress.org page states this as a formal warning. Present it as widely reported and forum-documented, never as an official disclosure. The same source notes some builders degrade more gracefully than others, which weakens a maximalist framing. | Medium |

### Counter-evidence

| Source | Finding | Date read | Why it bites | Citable |
|---|---|---|---|---|
| W3Techs Elementor page, https://w3techs.com/technologies/details/cm-elementor, page dated 2026-09-05 | Elementor runs 12.8% of all websites tracked, 18.6% of websites with a known CMS, and roughly 31% of WordPress sites. | 2026-09-04 | Tens of millions of site owners choose builder coupling knowingly. The claim survives as "a real cost many owners pay", never as "nobody wants builders". | High |
| WordPress 2023 Annual Survey, https://wordpress.org/news/2024/02/2023-annual-survey-results-and-next-steps/, corroborated by WP Tavern | n=3,922, up 17% on 2022. Site Editor satisfaction: 45.1% agree or strongly agree it meets their site-building needs, 26.3% neutral, 28.6% disagree or strongly disagree. Block editor usage about 60%, up from 54% in 2022 and 37% in 2020. | 2026-09-04 | Adoption is rising and satisfaction is net positive. The block editor is not a rejected product. | High for the numbers, medium for relevance, since it measures editor satisfaction rather than migration cost |
| Gutenberg plugin page, https://wordpress.org/plugins/gutenberg/ | 300,000 plus active installs. Rating 2.1 out of 5 across 3,883 reviews, of which 2,491 are one-star. Last updated about three days before the read. | 2026-09-04 | Tempting but dangerous. The plugin's own description says each WordPress release includes stable features from it and that the plugin is a beta channel, so its rating reflects self-selected pre-release testers, not the shipped editor. | Low as a standalone citation. Only usable with the beta caveat spelled out, and better left out of a caption |
| Block theme adoption | Search-summary figures: over 1,000 block themes in the directory as a 2024 milestone, later claims of 1,180 plus themes and 2.7M active installs, and a 2026 "State of WordPress Themes" discussion of a gap between block-theme development and adoption. | 2026-09-04 | **Not fetched.** Do not quote these numbers. | Low |
| No source found | No survey with a stated sample size asks about page-builder lock-in or migration regret. | 2026-09-04 | The migration-cost argument rests on documentation of mechanism plus community reports, not on measured cost. | Absence recorded |

---

## In-repo facts verified

Verified on `main` at `/var/home/glw907/Projects/cairn-cms`, package version 0.96.0, on
2026-09-04.

### The shipped `skills` directory

`skills/` is listed in the package `files` array in
`/var/home/glw907/Projects/cairn-cms/package.json`, so it ships inside the npm tarball alongside
`dist`, `migrations`, and the four public doc arms. A test enforces that it reaches the tarball
(`/var/home/glw907/Projects/cairn-cms/src/tests/unit/check-package-files.test.ts`).

It contains exactly one skill, `cairn-admin-screens`, at
`/var/home/glw907/Projects/cairn-cms/skills/cairn-admin-screens/`: a 114-line `SKILL.md` plus six
reference files loaded on demand, 1,255 lines in total.

- `SKILL.md` teaches an agent to build or review a screen inside a cairn site's `/admin` to the
  register cairn's own admin holds. It maps the 28 `cairn-audit` rules across two modes (12
  static, all error tier; 16 rendered, 7 error and 9 advisory) and carries the rules no tool can
  check.
- `references/exemplar-list.md` and `references/exemplar-detail.md` are annotated exemplars for
  list and detail screens.
- `references/form-anatomy.md` covers form rows and labels.
- `references/extension-grammar.md` covers deriving a component the toolkit does not ship.
- `references/grader-prompt.md` is the done-gate coherence read.
- `references/craft.md` is the motion, weight, and spacing catalogue.

What an agent gets: the skill installs into a consuming repository at
`.claude/skills/cairn-admin-screens/`, defined as `SKILL_INSTALL_DIR` in
`/var/home/glw907/Projects/cairn-cms/src/lib/doctor/check-skill.ts:15`. `cairn-doctor --fix`
copies the packaged tree over the consumer's copy, and the check hashes both trees to report
fresh, missing, or stale, so a consumer's copy cannot drift silently. The check never fails a
build; it is a development aid, not a deploy blocker.

**The honest scope note for the front door:** the engine ships one skill, not a library of them,
and it covers admin-screen construction only. "Ships agent skills" is true in the plural only in
the sense of the six reference files inside that one skill.

### `create-cairn-site` scaffold output

Package at `/var/home/glw907/Projects/cairn-cms/packages/create-cairn-site/`, invoked as
`npm create cairn-site`. It asks for the site's name, description, brand colour, and target
directory, then writes a ready-to-run SvelteKit site from the Waymark starter theme. Node 24 or
later. macOS and Linux only; Windows is refused.

The scaffolded site, baked from `/var/home/glw907/Projects/cairn-cms/templates/waymark/`, is a
complete SvelteKit application:

- Public routes under `src/routes/(site)`: home, a catch-all markdown page route, a paginated
  archive, a token-gated preview route, a styleguide, plus `feed.xml`, `feed.json`,
  `sitemap.xml`, `robots.txt`, `healthz`, and a `/media` handler.
- `/admin` mounted at `src/routes/admin`, with a catch-all engine route and a worked custom
  screen (`admin/signups`) showing the extension seam in use.
- A theme layer at `src/theme` (`cairn.config.ts`, `site.config.yaml`, `site.css`, `theme.css`,
  components, islands) and a chassis at `src/chassis` (`render.ts`, `prose.css`, `tokens.css`,
  `composition.css`, feed, archive, and date helpers).
- Starting content at `src/content` (posts, pages, fragments).
- `wrangler.jsonc`, two migration sets (`migrations` for auth, `migrations-app` for the site's
  own data), `vite.config.ts`, `svelte.config.js`, and `.dev.vars.example`.

The tool then offers three optional chapters: GitHub (creates a per-site GitHub App through
GitHub's manifest flow and publishes the repository), Cloudflare (deploys a Worker, creates
`<site>-auth` and `<site>-app` D1 databases and a media R2 bucket on the free plan, then moves the
App private key into the Worker as a secret and deletes the local copy), and domain (creates or
adopts a Cloudflare zone and connects the domain).

**The caveat the front door must respect:** `create-cairn-site` is not published.
`npm view create-cairn-site version` returns 404 as of 2026-09-04, `ROADMAP.md:74` still carries
"`create-cairn-site` ships" as an open item, and `templates/waymark/README.md` opens with a
"generated, pre-release" notice tied to that publish. Four first-run defects are on the roadmap.
The figure can describe the scaffold, but a caption stating that a developer starts from
`npm create cairn-site` today would be false.

---

## The three strongest citations for the caption

1. **Classic Editor's rank and install count.** wordpress.org/plugins/browse/popular/ and
   wordpress.org/plugins/classic-editor/, both read 2026-09-04: Classic Editor is the fourth
   most-installed WordPress plugin at 8 million plus active installations, rated 4.9 out of 5
   across 1,246 reviews, nearly eight years after the block editor shipped in WordPress 5.0.
   **Supports this sentence:** "The editing model an organisation picks is one its editors live
   with; the plugin that restores WordPress's pre-block editor is still among the most installed
   plugins in the ecosystem."

2. **WordPress's own block markup documentation.**
   developer.wordpress.org/block-editor/getting-started/fundamentals/markup-representation-block/,
   read 2026-09-04: block content is stored as HTML comment delimiters carrying JSON attributes
   inside the post content. **Supports this sentence:** "A builder stores layout inside the
   content, so changing builder or theme is a migration of every page; markdown with frontmatter
   carries no builder."

3. **GitHub's documented limits, as the honest cost of git-managed content.**
   docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api and
   docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github:
   5,000 API requests an hour per App installation, a repository target under 1 GB, files blocked
   above 100 MiB. **Supports this sentence:** "Content in git is bounded by the repository's own
   limits, which is why media lives in object storage and why very large corpora are not the
   shape this fits."

A fourth, if the caption's agent sentence needs a number rather than a claim: the pooled field
experiments in Management Science, n=4,867 developers across three firms, measuring a 26.08%
increase in completed tasks with AI access. Use it for "AI assistance raises measured output",
never for "documentation makes agents better", which the evidence does not support.

---

## Open questions

1. **The agent sentence in the caption is the weakest link.** The brief's core argument says
   agent-assisted development "works against known ground" because the pieces are documented and
   widely used. The one study testing repository context files found no general success-rate
   improvement and a 20% cost increase, and METR found experienced developers 19% slower in
   mature repositories. A caption that claims documentation makes agents more effective is not
   supported. A caption that claims AI assistance raises output on well-specified work in widely
   used stacks is supported. Which sentence does the figure need?

2. **Does the figure name the Cloudflare outage?** The 2025-11-18 postmortem is the strongest
   thing a skeptic cites against one-platform. The brief already carries "one platform account is
   one vendor" as a drawback. Should that drawback carry the incident, or does naming a dated
   outage on a front door read as defensive?

3. **Email Sending is in public beta and needs the Workers paid plan.** The brief's Panel B lists
   Email Sending among what one Cloudflare account supplies, and the scaffold's Cloudflare chapter
   promises a free deploy. Those two facts collide. How does the figure state it?

4. **`create-cairn-site` is unpublished.** The counterweight sub-label leans on the scaffold
   existing. Does the figure ship before the tool, and if so, how is the sub-label worded?

5. **One skill, not skills.** Decide whether the counterweight says "ships an agent skill for
   building admin screens", which is exactly true, or keeps the plural.

6. **Five citations were not verified by fetch and should be before publication:** the WordPress
   5.0 release post URL, GitHub's REST and GraphQL API pages, GitHub's "authenticating as a GitHub
   App" page for the bot-committer wording, whether Universal SSL's "unshared" wording holds at
   the free tier, and Patchstack's 2025 full-year vulnerability figure.

7. **Two numbers are contested across sources and should not be quoted:** the SaaS-sprawl
   small-company application count (152 in one summary, 87 in another) and the DX "6 to 15 hours a
   week" tool-sprawl statistic, whose primary instrument was never located.
