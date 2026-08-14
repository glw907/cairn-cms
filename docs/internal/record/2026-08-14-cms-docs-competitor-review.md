# CMS documentation: the competitor review (2026-08-14)

Input for the Pass D outline work. Ten web-research agents each examined one documentation
corpus (or one cross-cutting theme) with a brief demanding cited evidence for every claim:
Decap, Sveltia, TinaCMS, Keystatic, Payload, Statamic, Ghost, WordPress, Astro, plus a
cross-cutting exemplars-and-failure-modes sweep (Stripe, Vite, Cloudflare, Diátaxis case
studies). The set spans cairn's whole identity: the git-CMS competitors, the
embedded-in-your-app model, the scaffolder-led framework, and the user-facing publishing
platforms. Every claim below traces to a cited source in the agents' reports; the sharpest
citations are repeated here so this document stands alone.

## The two openings the category leaves cairn

**1. Nobody documents the editor.** Across every direct competitor, the non-technical
author is never the addressed reader. Decap has no "how to write a post" page anywhere in
its nav. Sveltia's own getting-started is explicitly developer-scoped and the person who
will type into the CMS daily is never addressed. Tina's one editor-sounding page
(`using-tina-editor`) is written in developer vocabulary ("a static build... accessed at
the `/admin/index.html` route"). Keystatic's "User interface" page is developer
instructions *about* editors, in TSX. Payload has no end-user page at all. Statamic ships
exactly one page (the Content Manager's Guide) and it deliberately declines to explain the
control panel, punting mechanics to "your developer." The only products that document the
writer are the platforms: Ghost's Help Center (outcome-first, plain language, its own
surface) and WordPress's block-editor article (screenshots, videos, a dated per-article
changelog). cairn already carries six editor guides; a first-class editor track is a real
category differentiator, not table stakes.

**2. Setup and auth is where every competitor's docs break, and it is exactly what the
tool absorbs.** Decap's most-flagged trouble spot is auth: it kept recommending the
deprecated Netlify Identity path across three linked issues in 2025
(decap-cms#7604 → #7420, decap-website#128). Sveltia's maintainer conceded in a discussion
thread that "the documentation is not clear" on the conflated hosting/auth/repo choice
(sveltia-cms#218), and its GitHub-auth path asks the reader to deploy an OAuth proxy
themselves. Keystatic's GitHub-mode page stubs the production half as "Deploying Keystatic:
Coming soon 🚧" and drops four unexplained secrets into `.env` — while its paid Cloud page
markets itself as "no need to deal with environment variables and a custom GitHub app," a
tacit admission of where the docs fail. Tina's quickstart was not reproducible: three
separately documented setup paths hit the same unresolved build error (tinacms#4530).
`create-cairn-site` performs this entire class of work, and the admin track quotes its real
transcripts. The recovery page (the resume table) documents the one surface no competitor
documents at all: what to do when a setup step fails.

## What users say

The agents searched issues, forums, HN, and Reddit for reader sentiment specifically about
the docs. The pattern is consistent enough to treat as design input.

**What readers like, with the evidence:**

- **A terse CLI-first quickstart that ends in a running admin.** Payload's
  `create-payload-app` docs drew "excellent, developer-friendly... makes it easy to get
  started" (dev.to review); Keystatic's `npm create @keystatic@latest` page is its docs'
  strongest asset. Astro's install page pairs the CLI fast path with a manual track that
  unfolds every step the CLI collapsed, then cross-links each generated piece instead of
  re-teaching it.
- **Tutorial mechanics that respect the reader's state.** Astro's Build-a-Blog tutorial:
  per-lesson objectives, a "Try it yourself" transfer exercise, a "Show me the steps"
  disclosure that hides the answer until asked, a checklist before advancing, and deploy
  pulled early (Unit 1) so the reader holds a live URL as proof of progress.
- **Honesty about scope and state.** Statamic's quickstart announces "this is not a
  '5 minute quick install guide'" and readers respond to the voice ("genuinely fun
  documentation"). Sveltia's docs-in-progress banner sets expectations rather than
  projecting false confidence. Keystatic's maintainers saying "we're aware there is
  something critically missing... documentation" built trust amid admitted gaps.
- **Rigid, predictable reference templates.** Decap's widgets page (UI / data type /
  options / example / screenshot, per widget, with inline deprecation and beta flags) is
  the one part of its docs that stayed good. Payload's reference pages open narratively
  (what the concept is, why it exists) before the prop table, so one page serves both the
  first-time reader and the property-hunter.
- **Outcome-first task framing for non-developers.** Ghost's Help Center headers ("Intro
  to the editor," "Adding a custom domain") and WordPress's block-editor article with
  versioned screenshots and a dated change list at the bottom of the page.

**What annoys readers, with the evidence:**

- **Docs confusing enough to lose the user.** On Tina's HN thread, one reader "found their
  docs to be pretty confusing" and abandoned it for another tool; a well-known dev educator
  struggled badly enough on stream that a maintainer had to join the chat to walk her
  through (news.ycombinator.com/item?id=37988585).
- **Quickstarts that fail or skip prerequisites.** Tina's three documented setup paths all
  producing the same unresolved error is the extreme case; Ghost's install docs are
  "excellent, but assume your local environment is already perfectly configured"
  (third-party self-host guides; Node pinning, Cloudflare caching the `/ghost` path).
- **Reference drift.** Statamic's docs tracker is a steady drip of "X isn't documented" /
  "docs are outdated" issues years into the project, including an upgrade guide that missed
  breaking changes (statamic/docs#1826). Payload shipped stale config docs (#10321) and
  removed docs users still needed (#13814). Ghost's webhook table drifted from the product
  until a user report (maintainer-confirmed). Decap recommended a deprecated auth backend
  for a year.
- **Choices conflated in prose instead of separated as decisions.** Sveltia's
  auth/hosting/repo conflation produced real user confusion the maintainer had to firefight
  (#218).
- **Answers living outside the docs.** Payload's own blog admits GitHub Issues absorb the
  SEO while the real answers sit in Discussions that "barely surface themselves."
- **Structural problems left open.** Decap's "Reorganize the docs with a strong focus on
  the user" issue has been open since 2018 (decap-website#5).
- **Cloud-path bias.** PostHog's self-host disclaimer is the canonical case of docs written
  cloud-first with self-host as a footnote; Tina's parallel cloud/self-host trees generate
  recurring "what does self-hosting actually replace" confusion.

## What the exemplars actually do (mechanisms, not vibes)

- **Stripe:** Diátaxis kept strict so a reader always knows which surface they are on;
  reference generated against the real API contract so drift is structural, not editorial;
  version-diff annotations shown in place.
- **Astro:** the tutorial devices above; a recipe-vs-guide boundary stated in the
  contributor guide (a recipe is one task, no theory); community recipes quarantined as
  external links only, never hosted, so the maintained core stays small; an internal link
  checker in CI.
- **Vite:** docs PRs gated on matching the actual TypeScript definitions; typechecked
  snippets. (cairn's `check:reference:signatures` and `check:snippets` are already this.)
- **WordPress (the part that survives):** per-article dated change lists tied to concrete
  UI changes, screenshot versions named; one published style guide referenced everywhere.
- **Eleventy (small-scale calibration):** minimize implicit convention so the docs surface
  stays small by construction, not by pruning after the fact.
- **Diátaxis in practice:** teams that succeed use it as a compass, not a taxonomy
  (Cloudflare, Canonical). The Hillel Wayne critique lands where cairn lives: Diátaxis
  partitions by document type, not audience, and a corpus can be Diátaxis-clean while an
  editor still wades through extender material. The two axes need explicit crossing, which
  is precisely the four-track structure.

## The rules this review sets for the outlines

1. **Route four audiences by name in the first screenful.** The no-front-door pattern has
   documented abandonment behind it (Tina), and the fix has been left open for eight years
   at Decap.
2. **The editor track is a product surface, not a courtesy.** Model it on Ghost's Help
   Center register and WordPress's block-editor article, plus Statamic's one good move
   (naming the non-technical reader's anxieties: ownership, what needs a developer, what
   it costs), which cairn's front door and admin track should absorb.
3. **The admin track's spine is the tool's transcript.** Every quoted line traces to a
   recorded run. The recovery/resume page is the category's missing surface; ship it.
4. **No stub ever ships.** A page exists complete or does not exist. "Coming soon 🚧" at
   the hardest step is the single worst pattern found (Keystatic's deploy stub).
5. **Present a fork as a decision, not prose.** Two doors (button vs CLI), platform
   branches (macOS/GNU), paid-vs-free boundaries: state the choice, the price, and the
   default explicitly (the Sveltia conflation is the counterexample).
6. **Keep the reference rigid and gated.** cairn's existing gates are the structural
   answer to the category's loudest annoyance (drift); the per-item template discipline
   (Decap widgets, Payload fields) is the shape to keep.
7. **Canonical answers live in the docs tree.** Not in Discussions, not in a wiki, not in
   an issue thread (Payload's admitted findability failure).
8. **Depth stays honest at small scale.** Every competitor complaint about staleness is a
   symptom of corpus size outrunning maintenance. cairn's leanness is a documented
   advantage; the outlines must justify every page against it.

## Source reports

The ten agents' full reports (with every citation) are preserved in the Pass D planning
session transcript, 2026-08-14. This synthesis carries every load-bearing citation; consult
the transcript only for the long tail.
