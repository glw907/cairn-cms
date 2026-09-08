# Agent-run docs: page-type registries, outcome signals, and lifecycle rules

Research record, 2026-09-08. Question: what are other Claude-run (or agent-run) documentation
programs doing about maintaining a page-type registry dynamically on measured outcomes, adding,
merging, retiring or revising page types and templates based on results?

Every claim below carries a fetched URL. Nothing here is asserted from model memory. Where a
source was fetched and did **not** contain something, that negative is recorded as a finding,
because the negatives are the substance of this survey.

## 1. Programs surveyed

| Program | Agent-drafted docs? | Outcome signals collected | Page-type registry? | Lifecycle rule for types? | Source |
| --- | --- | --- | --- | --- | --- |
| **Cloudflare Developer Docs** | Yes, agent-facing repo contract. `AGENTS.md` is "the canonical agent reference, distilled from the full style guide" | Not described in the agent guide; CI validates frontmatter via Zod schemas over 19 content collections | **Yes, the strongest found.** 18 enumerated `pcx_content_type` values: `changelog`, `concept`, `configuration`, `design-guide`, `example`, `faq`, `get-started`, `how-to`, `integration-guide`, `learning-unit`, `navigation`, `overview`, `reference`, `reference-architecture`, `reference-architecture-diagram`, `troubleshooting`, `tutorial`, `video`. Machine-enforced | **No published rule.** The style guide's content-types index gives selection guidance ("Choosing the right one keeps pages predictable for readers and agents") and no owner, no add/merge/retire process | [AGENTS.md](https://github.com/cloudflare/cloudflare-docs/blob/production/AGENTS.md), [content types](https://developers.cloudflare.com/style-guide/documentation-content-strategy/content-types/) |
| **PostHog** | **Yes, the closest analogue to cairn.** An Inkeep-backed content-writer agent "automatically opens a docs PR on posthog.com" when a monorepo PR merges; product engineers own review for technical accuracy | Page-level helpful/unhelpful votes; weekly review of "Our most unhelpful docs"; session replays of docs journeys; page comments; support and GitHub issues; popularity for staleness. Plus a **feedback form on the agent itself** after merge, "so we can continue improving the agent" | Not found. Style guidance is structural (important info first, short paragraphs, `<details>`), not a typed registry | No | [content-writer agent](https://posthog.com/handbook/docs-and-wizard/content-writer-agent), [what nobody tells devs about docs](https://posthog.com/newsletter/what-nobody-tells-devs-about-docs) |
| **Mintlify (assistant + agent suggestions)** | Product feature: turns assistant conversations into "focused recommendations such as clarifying a concept, adding an example, or restructuring a section" | Every assistant question marked answered/unanswered; conversations clustered by topic; per-response user ratings; unanswered questions surfaced as documentation gaps | Publishes a content-types guide as advice, not an enforced registry | No | [agent suggestions](https://www.mintlify.com/blog/agent-suggestions-assistant), [analytics](https://www.mintlify.com/docs/optimize/analytics) |
| **kapa.ai** | Ships an "Analyze Coverage Gaps" agent skill for working the gaps with an AI agent | **Uncertain answers only**, deliberately excluding successful and off-topic conversations. Recurring uncertain topics are clustered into a finding plus an AI recommendation | No | No, but it publishes the nearest thing to a *triage* discipline: work clusters "making a deliberate judgment on each one", since some gaps are intentional, noise, or out of scope | [Coverage Gaps](https://docs.kapa.ai/analytics/coverage-gaps) |
| **GitBook Agent** | Yes: "proactively opens PRs to fix outdated content"; findings become change requests a human reviews | Three named detectors: content gaps (support questions the docs do not answer), outdated content (an external source supersedes the page, e.g. an SDK signature change), incorrect content. Sources: support ticketing, public forums, marketing sites | No | No. Lifecycle is per-page (finding, review, change request, or archive-to-suppress), never per-type | [Automatic docs improvements](https://gitbook.com/docs/gitbook-agent/automatic-docs-improvements) |
| **Fern (docs agent)** | Yes | Codebase drift, support tickets from Intercom/Help Scout/Zendesk/Crisp (up to ~5,000/month), Notion/Linear internal docs, changelogs | No | No | [ferndesk review of GitBook/Fern agents](https://ferndesk.com/blog/gitbook-review) (secondary; treat as vendor-adjacent) |
| **Kubernetes SIG Docs** | No published agent program found | Not published as a docs-quality metric program | **Yes:** four page content types (Concept, Task, Tutorial, Reference), each with a fixed section skeleton enforced by Hugo shortcodes and comment markers | **No.** The fetched page is "purely descriptive of the existing four types"; it contains no process for adding, changing, retiring, or reviewing a type | [Page content types](https://kubernetes.io/docs/contribute/style/page-content-types/) |
| **GitLab Docs** | No published agent program found | Documented audits are traffic-driven, not type-driven: an OKR audited the highest-traffic Plan pages ranked by Total Time on Page (pageviews x avg time on page) | **Retired theirs.** Current metadata is `stage`, `group`, `info`, `title` plus optional fields, with **no `type` field at all**. Historically `type` carried `index`/`concepts`/`howto`/`tutorial`/`reference`; it was deprecated, and a metadata-removal issue stripped `article_type`, `level`, `author`, `date`, `last_updated` on the stated ground "We decided not to use the Additional page metadata any more" | The retirement itself is the only lifecycle event, and no data-based rule is published for it | [Metadata](https://docs.gitlab.com/development/documentation/metadata/), [Remove metadata from docs #247288](https://gitlab.com/gitlab-org/gitlab/-/work_items/247288), [FY21-Q1 audit OKR](https://gitlab.com/gitlab-org/gitlab/-/issues/205689) |
| **GitHub Docs** | No published agent program found | Not in the fetched page | **Yes:** Concepts, Reference, How-to, Troubleshooting, Release notes, Get started, Quickstart, Tutorial, plus explicit support for combining types in one article | **No** governance, cadence, or add/retire process in the fetched content model page | [Style guide and content model](https://docs.github.com/en/contributing/style-guide-and-content-model) |
| **Red Hat modular docs** | No | No | **Yes:** three module types (concept, procedure, reference) plus assemblies, with per-type `.adoc` templates in-repo | No published data-driven add/retire rule found | [Modular docs reference guide](https://redhat-documentation.github.io/modular-docs/) |
| **Diátaxis (and adopters: Canonical, Python)** | n/a | n/a | Four types, and the framework explicitly **forbids** extending the set: the two axes "don't just cover the entire territory, they define it. This is why there are necessarily four quarters to it, and there could not be three, or five" | The lifecycle Diátaxis publishes is for *pages*, not types: look at what is in front of you, pick one improvement, do it, repeat | [Foundations](https://diataxis.fr/foundations/), [How to use Diátaxis](https://diataxis.fr/how-to-use-diataxis/), [The compass](https://diataxis.fr/compass/) |
| **Anthropic (own docs + internal practice)** | Partially. Published internal uses are agent-*authored artifacts*, not a docs-registry program: Security Engineering has Claude "ingest multiple documentation sources to create markdown runbooks and troubleshooting guides"; knowledge is consolidated "via MCP and CLAUDE.md files" | Docs pages carry a "Was this helpful?" widget. **No published statement of what is done with that feedback was found**; searches surfaced only support-portal and SDK-discussion channels | No published page-type registry found for the Claude docs | None published | [How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code), [Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices) |
| **Supabase / Sentry / Astro** | Agent-facing, but pointed the other way: they publish `AGENTS.md`/Skills so agents *consume* the docs correctly (Sentry keeps agent docs "under 60 lines"; Supabase keeps SKILL.md ~100 lines and tells agents to verify against live docs, `.md` suffix on any docs URL) | Not published | No | No | [Supabase agent skills](https://supabase.com/blog/supabase-agent-skills), [Supabase Agent Skills docs](https://supabase.com/docs/guides/ai-tools/ai-skills) |
| **Academic / industry signal work** | n/a | Aghajani et al., *Software Documentation Issues Unveiled* (ICSE 2019): 878 artifacts mined from mailing lists, Stack Overflow, issues and PRs into a taxonomy of ~162 documentation problem types. It is a taxonomy of *defects*, not of page types, and carries no lifecycle rule | No | No | [ACM](https://dl.acm.org/doi/10.1109/ICSE.2019.00122), [summary](https://neverworkintheory.org/2021/10/06/software-documentation-issues-unveiled.html) |
| **Docs-metrics practitioner literature** | n/a | Recurring signal set: task completion rate, search exit rate, support ticket deflection, time on task, satisfaction. Two useful claims: metrics are **goal-specific**, "a metric that matters for a tutorial (task completion rate) is useless applied to a reference page"; and metrics only matter when a team has a standing process to act on them | No | No | [GitBook docs analytics guide](https://docs.gitbook.com/guides/best-practices/documentation-analytics), [hackmamba](https://hackmamba.io/technical-documentation/documentation-metrics/) |

## 2. Assessment: established practice vs. novel

**Established, with multiple independent implementations.**

1. *Agents drafting docs against a repo contract file.* Cloudflare ships an `AGENTS.md` as the
   canonical agent reference; PostHog ships an agent that opens docs PRs on code merge. This is
   normal now.
2. *A closed, machine-enforced page-type vocabulary.* Cloudflare (18 types, Zod-validated),
   Kubernetes (4, shortcode-enforced), GitHub (8), Red Hat (3 modules + assemblies). Every one is
   a registry in cairn's sense.
3. *Unanswered-question mining as the primary content signal.* kapa (uncertain answers only),
   Mintlify (answered/unanswered flag plus clustering), GitBook (support questions the docs do
   not answer), Fern (ticket mining). The convergence here is the single strongest field finding:
   four vendors independently landed on the same signal, and kapa's refinement, count only the
   *uncertain* answers and discard the rest, is the sharpest version.
4. *Page-level helpful/unhelpful votes reviewed on a cadence.* PostHog's weekly "most unhelpful
   docs" review is the clearest published instance.
5. *Human review gate on every agent-proposed change.* Universal. PostHog, GitBook, and kapa all
   route agent output through a person, and kapa states the discipline explicitly, judge each
   cluster, some gaps are intentional or out of scope.

**Not established anywhere found.**

6. *A lifecycle for the page-type registry itself.* This is the gap. Every registry surveyed is
   published as a **static list with selection guidance**. Not one of Cloudflare, Kubernetes,
   GitHub, or Red Hat publishes who owns the list, when a type is added, when two types merge, or
   what evidence retires one. Kubernetes' own page-content-types page is descriptive only.
7. *Data-driven add/retire of a type.* No published rule was found anywhere, in any program, in
   any vendor, in the academic literature. The one real-world type retirement located, GitLab
   dropping `type` and the related `article_type`/`level` metadata, was justified in one sentence
   of intent ("We decided not to use the Additional page metadata any more") with no data cited.
8. *Per-type outcome measurement.* The practitioner literature argues metrics must be
   goal-specific per type, but no program was found that actually reports outcomes broken down by
   page type, let alone feeds that breakdown back into the type list.

**One counter-current worth weighing.** The two most mature moves in the field point in opposite
directions from each other: Cloudflare *grew* its registry to 18 types explicitly for agent
predictability, while GitLab *deleted* its type metadata entirely. Diátaxis argues from first
principles that the set is closed at four and cannot be extended at all. So "how many types should
exist" is genuinely unsettled, which means a program that has an evidence-based way to answer it
is holding something the field does not have.

## 3. What cairn's proposed lifecycle copies, and what has no precedent

Cairn's proposal, as given: an outcome record per page type; triggers at (a) rewrite close,
(b) a brief that cannot name a type, (c) failure rate above the median; and a rulings ledger.

**Copied from the field, and well-supported:**

- *The registry itself.* Cloudflare, Kubernetes, GitHub, and Red Hat all keep one, and
  Cloudflare's stated reason is exactly cairn's, page predictability "for readers and agents".
- *Human adjudication of each candidate change rather than auto-application.* kapa's
  "deliberate judgment on each one" and GitBook's finding/change-request/archive flow are the same
  shape as a rulings ledger's accept/reject/defer.
- *A recurring review cadence over the outcome data.* PostHog's weekly unhelpful-docs review.
- *Suppressing re-litigation.* GitBook's "archive findings to prevent re-opening" is the closest
  published analogue to cairn's ledger recording what evidence would reopen a settled ruling. It
  is per-finding, not per-type, but the mechanism is the same idea and it is the only instance
  found.

**No precedent found, in any of the sources above:**

- *An outcome record attached to a page type rather than a page.* Nobody measures per type.
- *"The brief cannot name a type" as a trigger.* This is a genuinely novel signal, and it may be
  the best idea in the proposal, because it is the only one in the whole survey that is
  **generated by the authoring act itself** rather than by downstream reader telemetry. It is
  cheap in a way reader telemetry is not, it fires before the bad page exists, and it is the exact
  signal Diátaxis's compass is trying to elicit ("a course-correction tool" applied at the moment
  of writing) without Diátaxis ever proposing that the compass's failures be logged.
- *A published failure-rate-above-median retirement trigger.* No comparable rule exists in the
  field. Two cautions on it, both from the sources: a median threshold retires roughly half the
  registry by construction unless it is paired with an absolute floor and a minimum sample, and
  the practitioner consensus is that a metric meaningful for one type is meaningless for another,
  so cross-type failure-rate comparison is the exact comparison the literature warns against.
  Comparing a type against **its own** prior record is better supported than comparing types
  against each other.
- *Rewrite close as a trigger.* Novel in the published record, though it is the same instinct as
  PostHog's post-merge agent-feedback form: capture the assessment at the moment the work ends,
  while the evidence is still in hand.

Net: cairn is copying the registry, the human gate, and the cadence, all well-attested. The
type-level outcome record, the cannot-name-a-type trigger, and the failure-rate retirement rule
have no published precedent. That is not a reason against them. It does mean nothing in the field
will validate them, so they need to be self-evidently cheap to run, and the median trigger needs a
floor.

## 4. The three signals cairn could collect cheaply that the field treats as most predictive

Ranked by field support per unit of cost.

1. **Unanswered or low-confidence assistant questions against the docs, counted only when the
   answer was uncertain.** Four vendors converged on this independently, and kapa's refinement,
   analyze *only* uncertain answers and cluster recurring ones, is the field's most precise
   published version. Mintlify's rationale for why it beats the alternatives is the sharpest claim
   located: these questions "capture intent in a way analytics and support tickets often cannot".
   Cairn already has the raw material for the cheap variant with no assistant at all: every
   question a person or an agent had to ask about the docs during a pass, logged as a line.
   Sources: [kapa Coverage Gaps](https://docs.kapa.ai/analytics/coverage-gaps),
   [Mintlify](https://www.mintlify.com/blog/agent-suggestions-assistant),
   [GitBook](https://gitbook.com/docs/gitbook-agent/automatic-docs-improvements).

2. **Page-level helpful/unhelpful votes, reviewed on a fixed cadence, with the review producing a
   worklist.** The cheapest instrumentation in the survey and the one with a named working
   process behind it, PostHog's weekly "Our most unhelpful docs". The literature's warning applies
   and is cheap to honor: the vote must be read against the page's type, not pooled across types.
   Sources: [PostHog](https://posthog.com/newsletter/what-nobody-tells-devs-about-docs),
   [GitBook analytics guide](https://docs.gitbook.com/guides/best-practices/documentation-analytics).

3. **Agent-miss feedback captured at review time: what the reviewer had to change in an
   agent-drafted page, and why.** PostHog is the only program found that instruments its own
   agent's misses ("a feedback form is posted... so we can continue improving the agent"), and it
   is the signal most directly aligned with cairn's actual question, since it is the one that
   attributes a failure to the *template and type* the agent was handed rather than to the
   subject matter. For a repo where docs are drafted by agents against typed templates, this is
   the highest-information signal available, and it costs one structured line per docs review.
   Source: [PostHog content-writer agent](https://posthog.com/handbook/docs-and-wizard/content-writer-agent).

Deliberately not recommended, despite appearing in the metrics literature: time-on-page and exit
rate. They appear in vendor and practitioner listicles, but no primary program in this survey was
found using them to drive a structural decision, GitLab's traffic-ranked audit used them only to
*prioritize* which page to review, and their interpretation is ambiguous by type (long dwell is
success on a tutorial and failure on a reference page).

## 5. Sources

- Cloudflare docs `AGENTS.md`: https://github.com/cloudflare/cloudflare-docs/blob/production/AGENTS.md
- Cloudflare style guide, content types: https://developers.cloudflare.com/style-guide/documentation-content-strategy/content-types/
- PostHog, content writer agent: https://posthog.com/handbook/docs-and-wizard/content-writer-agent
- PostHog, what nobody tells devs about docs: https://posthog.com/newsletter/what-nobody-tells-devs-about-docs
- Mintlify, closing the loop between user questions and documentation: https://www.mintlify.com/blog/agent-suggestions-assistant
- Mintlify analytics: https://www.mintlify.com/docs/optimize/analytics
- kapa.ai Coverage Gaps: https://docs.kapa.ai/analytics/coverage-gaps
- GitBook Agent, automatic docs improvements: https://gitbook.com/docs/gitbook-agent/automatic-docs-improvements
- Kubernetes page content types: https://kubernetes.io/docs/contribute/style/page-content-types/
- GitLab docs metadata: https://docs.gitlab.com/development/documentation/metadata/
- GitLab "Remove metadata from docs" (#247288): https://gitlab.com/gitlab-org/gitlab/-/work_items/247288
- GitLab FY21-Q1 docs audit OKR (#205689): https://gitlab.com/gitlab-org/gitlab/-/issues/205689
- GitHub docs style guide and content model: https://docs.github.com/en/contributing/style-guide-and-content-model
- Red Hat modular documentation reference guide: https://redhat-documentation.github.io/modular-docs/
- Diátaxis foundations: https://diataxis.fr/foundations/
- Diátaxis as a guide to work: https://diataxis.fr/how-to-use-diataxis/
- Diátaxis compass: https://diataxis.fr/compass/
- How Anthropic teams use Claude Code: https://claude.com/blog/how-anthropic-teams-use-claude-code
- Anthropic, Claude Code best practices: https://www.anthropic.com/engineering/claude-code-best-practices
- Supabase agent skills: https://supabase.com/blog/supabase-agent-skills
- Aghajani et al., Software Documentation Issues Unveiled (ICSE 2019): https://dl.acm.org/doi/10.1109/ICSE.2019.00122
- GitBook documentation analytics guide: https://docs.gitbook.com/guides/best-practices/documentation-analytics

## 6. Confidence notes

- Cloudflare, PostHog, kapa, GitBook, Kubernetes, GitHub, GitLab and Diátaxis claims come from
  primary fetched pages.
- The Fern claim is from a vendor-comparison page, not Fern's own docs. Treat as weak.
- The Anthropic docs-feedback claim is a negative: the "Was this helpful?" widget exists, and
  repeated searching found no published statement of what is done with the responses. Absence of
  evidence here, not evidence of absence.
- GitLab's historical `type` values (`index`, `concepts`, `howto`, `tutorial`, `reference`) come
  from search-surfaced archived style-guide text; the *current* absence of the field is confirmed
  directly from the live metadata page, and the removal of `article_type`/`level` is confirmed
  directly from issue #247288.
