# Docs craft references (external exemplars, binding on every page dispatch)

Assembled 2026-07-02, per Geoff: the rewrite imitates best-in-class documentation, never the
prior cairn corpus (tossed; the `opus-docs-anti-exemplar` branch holds the what-not-to-do).
Covers structure AND content. Two studies banked below; the editor-craft study (iA
Writer/Obsidian/Bear/Ghost/Kirby) and the field-sentiment study (what users actually praise
and curse, split structure-vs-content, with the AI-smell checklist) append when they land.

---

## Study 1: the CMS intro genre — invariants and cairn's skeleton

Surveyed: Kirby (landing), Keystatic (README + landing), Decap (README), Ghost (README),
Statamic (README), Payload (README).

**Invariants (every good one):** logo/wordmark first, never prose-first. A one-sentence
tagline immediately after, category + differentiator in ≤20 words. A copy-pasteable
getting-started command early, never buried past the pitch. Who-is-this-for is a clause, not
a section (5 of 6). Badges are decoration and skippable pre-1.0. Nobody leads with a feature
wall before naming the category.

**Variants:** README screenshots are 50/50 (landing pages always show product UI early;
READMEs split). Bullets correlate with READMEs that skip screenshots. Length 200–900 words,
tracking how much hosted-service selling rides along; pure libraries sit at the short end.
Screenshot content is either the editor/admin UI alone, or a paired source-vs-rendered shot —
the paired form used precisely by tools whose pitch is "content stays in your codebase."

**Cairn's skeleton (Keystatic-pattern, the lean end):** wordmark (plain text until a real
logo exists — never fake one) → ≤20-word tagline → `<!-- SCREENSHOT -->` comment for the
editor-plus-preview shot (an honest comment beats a gray box) → install command → 4–6
single-line benefit bullets → who-for as one trailing sentence → docs links → stop.
150–250 words of prose. The current `README.md` on the `docs-rewrite-1` branch implements
this skeleton.

---

## Study 2: developer-docs craft (SvelteKit ecosystem: svelte.dev, Superforms, Drizzle, Tailwind)

**How the best pages open.** Concept pages: name the mechanism, then immediately defuse the
wrong mental model the reader arrives with — Svelte's `$state`: "Unlike other frameworks you
may have encountered, there is no API for interacting with state — `count` is just a number."
Task pages open with the artifact that holds the feature ("A `+page.server.js` file can
export actions…"), not the goal. Nobody opens with "In this section we will learn…".

**The explain move.** Prose for why, code-immediate for how; 2–4 sentences of prose per code
block, 5–8 only for genuinely load-bearing concepts. The strongest move: name the constraint
the reader already feels, then relieve it (Superforms: "HTML forms can only handle string
values… so there is no standardized way to represent a nested data structure. Fortunately…").
Tailwind's variant for hard ideas: name the misreading by frequency, then hand over a
reusable corrected phrase ("Don't think of `sm:` as 'on small screens'; think of it as 'at
the small breakpoint'").

**Sentence craft.** 12–20 words load-bearing; 5–9-word declaratives for emphasis backed by
countable facts ("Drizzle has exactly 0 dependencies"). Second person for instruction,
imperative for action; "we" only for stance-taking, never hedging. Caveats stated flat as
fact in the same declarative voice — never "you may want to be careful," never a hedge word
on an absolute limitation.

**Never:** scaffolding openers; hedged limitations; >8 prose sentences without a code anchor;
apologizing for complexity; marketing adjectives carrying claims a fact could carry.

**Three pinned exemplar passages:**

> "Unlike other frameworks you may have encountered, there is no API for interacting with
> state — `count` is just a number, rather than an object or a function, and you can update
> it like you would update any other variable." (Svelte, `$state`)

*Defuses a specific predictable wrong guess without naming a competitor. Cairn's readers
arrive with Contentful/form-builder/GitHub-CMS priors; every concept page should do this.*

> "HTML forms can only handle string values, and the `<form>` element cannot nest other
> forms, so there is no standardized way to represent a nested data structure or more complex
> values like dates. Fortunately, Superforms has a solution for this!" (Superforms)

*Constraint-then-relief: the reader feels the gap before the API fills it. Cairn's
"why fixed concepts" and "why raw markdown" pages want exactly this shape.*

> "Where this approach surprises people most often is that to style something for mobile,
> you need to use the unprefixed version of a utility, not the `sm:` prefixed version. Don't
> think of `sm:` as meaning 'on small screens', think of it as 'at the small breakpoint'."
> (Tailwind)

*Names the misreading by frequency, then hands over a quotable corrected phrase. Cairn's
`id`-vs-`slug` split (id = stem, slug = date-stripped) wants this exact treatment.*

**The ten rules for cairn's developer pages:**

1. Open concept pages in two sentences: mechanism, then defuse the arriving wrong model.
2. Open task pages with the file or seam that holds the feature, not the goal.
3. Every caveat is a flat declarative sentence; hedge words never soften an absolute.
4. 2–4 prose sentences per code block; 5–8 only for load-bearing concepts; never more
   without a code anchor.
5. Frame hard ideas as a constraint the reader feels, then relieve it.
6. Name a common misreading by frequency and hand over a corrected phrase, not just a rule.
7. "We" only for stance-taking (why cairn refused something); instruction stays
   second-person imperative.
8. Claims are countable facts, not adjectives ("one branch per entry," never "robust
   workflow").
9. Warmth and direct address live in the tutorial arm; reference and explanation stay
   declarative and unhedged.
10. Every limitation gets its own sentence or callout, never folded mid-paragraph.

---

# Study 3: admiration-verified intros (the delta beyond competence)

## Extension: Admiration-Verified Intros

### 1. Evidence — which intros people actually hold up

**Tier A (quote-level admiration, verified):**

**re-frame (Day8/re-frame README)** — the most README-specific admiration found anywhere:
- "The README is a great resource, regardless of whether or not you intend to use the framework" (HN, Om Next thread 2015)
- "The readme.md is wonderful" (HN 2015); "re-frame readme is epic" (HN 2016); "a badass readme" (HN 2015); "very amusing and wickedly hilarious in some parts... refreshing compared to other bland/formal READMEs" (HN 2019)
- Top answer in [Ask HN: What's the best documentation you've ever read?](https://news.ycombinator.com/item?id=17399340): "Worth reading even if you're not using cljs"
- awesome-readme annotation: "a giant, well-written essay about the tech, how to use it, **the philosophy behind it**, and how it fits into the greater ecosystem"

Verbatim opening (~first 100 words): logo, then heading **"Derived Values, Flowing"**, then an epigraph: *"This, milord, is my family's axe. We have owned it for almost nine hundred years... And because it has changed gently over time, it is still a pretty good axe, y'know. Pretty good. — Terry Pratchett, The Fifth Elephant, reflecting on identity, flow and derived values (aka The Ship of Theseus)"* — then: *"re-frame is a ClojureScript framework for building user interfaces. It has a data-oriented, functional design. Its primary focus is on high programmer productivity and scaling up to larger Single-Page applications. Developed in late 2014... it is mature and stable. It is used by both small startups and companies with over 500 developers..."*

**ripgrep (BurntSushi README)** — admired for a distinctive reason: its opening paragraph is so precise it gets **quoted verbatim as the settled answer in arguments**:
- "The very first paragraph in ripgrep's README makes that behaviour very clear" (HN 2025)
- "It sounds like you looked everywhere except for ripgrep's README. It explains upsides and downsides. Has benchmarks... a link to a FAQ addressing whether ripgrep can replace grep" (HN 2022)
- "ripgrep's README will tell you: 1. It's faster... 2. ...also faster than grep itself on single files... 3. It has Unicode support" (HN 2016)
- "I was equally impressed with the quality of its documentation" (HN 2020, My FOSS Story thread)

Verbatim opening: *"ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern. By default, ripgrep will respect gitignore rules and automatically skip hidden files/directories and binary files. (To disable all automatic filtering by default, use `rg -uuu`.) ripgrep has first class support on Windows, macOS and Linux, with binary downloads available for every release. ripgrep is similar to other popular search tools like The Silver Searcher, ack and grep."* Then badges, docs quick-links, a real search screenshot, then "Quick examples comparing tools" (benchmarks).

**Laravel** — named alongside Stripe in the best-docs HN thread ("Best docs: Stripe.com Laravel.com"). Verbatim opening after logo/badges: *"Laravel is a web application framework with expressive, elegant syntax. **We believe development must be an enjoyable and creative experience to be truly fulfilling.** Laravel takes the pain out of development by easing common tasks used in many web projects, such as: [7 linked bullets]. Laravel is accessible, powerful, and provides tools required for large, robust applications."*

**Stripe docs** — verified "gold standard" via [Mintlify's teardown](https://www.mintlify.com/blog/stripe-docs) and [apidog](https://apidog.com/blog/stripe-docs/), plus the HN thread. But the praise targets interactivity (your test keys injected into samples, one-click language switch, runnable-immediately) and culture ("documentation as a product... a feature isn't shipped until its documentation is written"). Lesson for an intro: **minimize distance from reading to a working first action** — less about prose structure.

**Tier B (curation/single-quote evidence):** HTTPie (awesome-readme; tagline-in-masthead "human-friendly HTTP client for the API era" + terminal GIF as the intro's centerpiece); Sniffnet ("It literally lists how to install it on every single platform... great readme", HN 2023); Earl Grey ("Gives me a good sip of the entirety... **Yet succinct enough to scroll in one swipe**", HN 2015); imessage-exporter ("The image on the readme... is **an example of an actual export** — better than talking about what the product does", HN 2023); maim ("Great readme **explaining why to use this over scrot** and others", HN 2014); TG geometry ("clearly explained the benefits and **anticipated all of my questions**", HN 2023). Also the Clojure-tradition comment ([Art of README thread](https://news.ycombinator.com/item?id=32333350)): "They always wrote **what problem this library is trying to solve, what other solutions exist and how this solution compares**."

**Candidates that did NOT verify:** Bun README, Astro, Zola, Hono, Tailwind landing — no comment-level admiration found for their intros specifically. htmx's copy is folk-famous but I found no direct intro-praise quotes; treat as unverified. Counter-signal worth heeding (from [How to write a great README](https://news.ycombinator.com/item?id=36773022)): "the author of their readme is more interested in **marketing** their product than explaining how to get started... I consider that a pretty big red flag."

### 2. The delta — what admired first-hundred-words do that competent ones don't

My earlier structural survey (logo → tagline → visual → install → bullets) describes the competent genre. The admired examples add five moves the genre skeleton doesn't capture:

1. **Full behavioral specification, not a category label.** ripgrep's first paragraph states what the tool does, its defaults, AND the escape hatch (`rg -uuu`) in ~80 words. It's quotable as the complete answer to "what is this" — which is literally how HN uses it. Competent taglines name a category ("A CMS for static site generators"); admired openings specify behavior.
2. **Named positioning against alternatives, immediately.** ripgrep names Silver Searcher/ack/grep in sentence 3. The most-praised trait across small-project quotes is "why to use this over X" and "what other solutions exist and how this compares." Competent intros describe themselves in a vacuum.
3. **A conviction sentence.** Laravel's "We believe development must be an enjoyable and creative experience"; re-frame's entire philosophical register (praised explicitly as "the philosophy behind it"). One sentence of worldview signals taste and earns trust; competent intros have zero beliefs.
4. **The first visual is evidence, not decoration.** imessage-exporter's praised image is an actual export; ripgrep shows a real search plus a benchmark table; HTTPie shows the command running. Competent READMEs open with a banner/logo that proves nothing.
5. **One-scroll density with permitted voice.** "A good sip of the entirety... succinct enough to scroll in one swipe"; "perfect balance between quickly informative and enjoyably cute." Voice (re-frame's Pratchett axe) rides on top of precision — never substitutes for it, and never tips into marketing (the verified red flag).

### 3. Refined cairn skeleton

**Keeps** (survived the delta): wordmark first; install command early; 4-6 single-line bullets max; who-for as a clause not a section; aggressive deferral to `docs/`; short total (now ~200-300 words — the admired examples justify a slightly denser opening paragraph than my earlier 150-word floor).

**Changes** (forced by the admired examples):

1. **Replace "one-sentence tagline" with a ripgrep-grade opening paragraph** (~70-90 words) that fully specifies behavior and is quotable as the complete answer: editors sign in by an emailed link (no GitHub account, no password), edit raw markdown with live preview, saves land on a per-entry branch, and a deliberate Publish commits to `main` via a GitHub App with the editor as commit author; the site redeploys. Include the seam ("your site brings its own `render`") the way ripgrep includes `-uuu` — the default AND the override.
2. **Add one positioning sentence naming the alternative space**: unlike a hosted headless CMS there is no service, no database, and no vendor account; unlike other git-based CMSes it installs as a SvelteKit library into your own app. (The Decap/Keystatic adjacency is real; name the contrast, not the competitors, unless comfortable naming them.)
3. **Add one conviction sentence** (the Laravel move), carrying the two personas: writers deserve a real editor; developers keep owning their site.
4. **Reframe image placeholder 1 as evidence, not portrait**: not "editor screenshot" but the causal chain — the editor mid-edit on the left, and the resulting GitHub commit on the right (`cairn-cms[bot]` committer, the editor's name as author). That single paired image proves both selling points at once (editor experience + developer ownership) the way imessage-exporter's export image proved its product. Placeholder 2 (optional): the publish/diff step, only if it adds information. Until assets exist: HTML comments describing the exact shot, never gray boxes.
5. **No superlatives, no "blazing", no marketing register** — the verified failure mode. Voice is allowed one moment (a dry aside or an epigraph-grade line), precision everywhere else.

**Revised ordered skeleton:** wordmark → behavioral-spec paragraph (with positioning + conviction sentences folded in as sentences 3-4) → `<!-- SCREENSHOT: editor + resulting commit, paired -->` → install command → 4-6 feature bullets (each a behavior, not an adjective) → pre-beta status line (honest, one sentence) → docs links → stop.

**Candidate taglines** (the opening line before the spec paragraph; admired register = concrete, behavioral, positioned):

1. **"Your writers get a magic link. Your repo gets the commit."** — the two personas in ten words, each half a verifiable behavior; the whole pitch compresses into it.
2. **"An embedded CMS for SvelteKit on Cloudflare: editors write markdown in the browser, and every publish is a git commit to your repo, authored in their name."** — the ripgrep register; longer, but quotable as the complete answer, and "authored in their name" carries both ownership and editor-respect.
3. **"No hosted service, no database, no accounts to manage. cairn is a SvelteKit library: your writers get a real markdown editor behind an emailed link, and publishing is a GitHub commit."** — positioning-first (the anti-hosted contrast leads), for a README that wants to disqualify the wrong readers in line one.

Recommendation: 1 as the tagline with 2's content as the spec paragraph's opening sentence — the pair reproduces the Laravel/ripgrep two-beat (memorable line, then full specification).

Sources: [Ask HN best docs](https://news.ycombinator.com/item?id=17399340) · [awesome-readme](https://github.com/matiassingers/awesome-readme) · [ripgrep README](https://github.com/BurntSushi/ripgrep/blob/master/README.md) · [re-frame README](https://github.com/day8/re-frame) · [Laravel README](https://github.com/laravel/laravel) · [HTTPie README](https://github.com/httpie/cli) · [Mintlify on Stripe docs](https://www.mintlify.com/blog/stripe-docs) · [apidog on Stripe docs](https://apidog.com/blog/stripe-docs/) · [How to write a great README (HN)](https://news.ycombinator.com/item?id=36773022) · [Art of README (HN)](https://news.ycombinator.com/item?id=32333350) · HN Algolia comment search (individual comment quotes, 2014-2026)

---

# Study 4: field sentiment — praise, frustration, and the AI-smell checklist (structure/content split)

All three research agents have reported. Synthesizing now into the structured report with the [structure]/[content] tagging from the addendum.

---

# Documentation praise/frustration field research — calibration report for cairn docs rewrite

**Method note:** Quotes are verbatim from fetched sources. HN quotes pulled via Algolia API (original comment text); CMS quotes from WordPress.org reviews/forums, Capterra, Trustpilot, TrustRadius, Threads, and blog reviews. Reddit was unreachable in this environment (domain-level block); HN + review sites substitute with comparably candid first-person voice. Attribution by platform only.

---

## 1. Praise evidence — what people say when docs work

| Quote | Source | Property credited |
|---|---|---|
| "An example that would look like `get("<YOUR API KEY>")` in every other document you've ever seen would actually contain YOUR API key in the Stripe.com docs. Simply brilliant." | HN, re: Stripe | [content] examples runnable as-is, zero substitution needed |
| "The personalized code samples & easy library switching features of Stripe docs are a dream." | HN, re: Stripe | [content] personalized samples; [structure] per-language switching |
| "TailwindCSS's docs are some of the best I've used. It's arguably the best way to learn not just Tailwind, but CSS itself." | HN, re: Tailwind | [content] teaches the underlying domain, not just the tool |
| "the Tailwind docs are miles easier to search than grepping the codebase" | HN, re: Tailwind | [structure] search/findability beats source-diving |
| "Instead I always go to tailwind docs, and quickly learn the utility class that just does the thing I want." | HN, re: Tailwind | [structure] fast task-oriented lookup |
| "I would go to the tailwind doc pages and see the underlying css of any class." | HN, re: Tailwind | [content] transparency about the mechanism |
| "Their reference docs are great, but their tutorial really shines... Each step provides a working example next to the documentation, allowing you to figure it out before clicking the 'Show me' button for help." | HN, re: Svelte | [structure] interactive tutorial with try-first design |
| "there's not much to it and you can read the entire docs in a few hours." | HN, re: Svelte | [structure] bounded, finishable corpus |
| "It not only explains, it educates." | HN, re: Django | [content] concept-teaching over API-listing |
| "I rarely have to go to blogs or Stack Overflow because that answer usually exists right in the docs." | HN, re: Django | [content] completeness/self-sufficiency |
| "The layering. From beginner tutorial through to high level overviews of the subsystems, through to detailed usage for the subsystems, through to API level docs" | HN, "best documentation you've ever read", re: Django | [structure] layered IA by reader skill level |
| "I like that FastAPI has documentation meant to be read from beginning to end. It walks you through not only the how but the why" | HN, re: FastAPI | [structure] linear narrative path; [content] design rationale |
| "astro's documentation is much more accessible; there were a handful of cases where there was something I wanted to do and astro had an example of exactly that." | HN, re: Astro | [content] worked examples matching the reader's actual task |
| "you have created an awesome orm with awful documentation" | HN, re: Drizzle | (negative — Drizzle yielded no genuine praise; the brief's assumption didn't verify) |

---

## 2. Frustration evidence — developer complaints

| Quote | Source | Category |
|---|---|---|
| "There's nothing more frustrating than minutely explicit demonstration code that doesn't reflect reality - and it's very common!" | HN, Best/Worst API docs thread | stale examples [content] |
| "Wrong documentation is significantly worse than no documentation." | HN | stale/wrong [content] |
| "[Unix man pages] are almost without fail written as an exhaustive reference for someone who already knows how to use the tool." | HN | assumed context [content] |
| "I'm lost here. No parallels from Svelte 3 or 4, just dropping us into 'runes'... the way it is presented in what are termed 'reference docs' looks NOISY IMO." | GitHub, sveltejs/svelte discussion #13721 | assumed context [content] + noisy presentation [structure] |
| "`listWidget(str name): Returns a Widget` is useless to me. 90% of api docs i see are like this, its evident they've been auto-generated and no effort had been made." | HN | API-dump, no narrative [structure] |
| "There will be three different versions explaining how to set some option with cli, sdk, and console versions...but they never explain what that option actually does." | AWS re:Post | coverage without explanation [content] |
| "If I'm looking for API docs I don't want to parse through your contrived how-to combined with a shallow tutorial...just give me the damn API docs." | HN | the inverse failure — doc types not separated [structure] |
| "There is a huge discoverability problem in just finding out what tools exist." | HN, re: AWS | discoverability [structure] |
| "The thing I find most useful - and that is hardest to write - is a complete and realistic example of an entire flow." | HN | missing end-to-end workflow [structure] |

**Key structural insight from the pair of quotes above:** reference-only docs and tutorial-only docs both generate anger. The praised systems (Django, FastAPI) win by keeping the layers separate and complete — which is Diátaxis, the structure cairn already uses. The rewrite's risk is content within the structure, not the structure.

---

## 3. CMS-specific — non-technical users

| Quote | Source | Category |
|---|---|---|
| "I can't figure these blocks out and I have put serious time into reading instructions carefully, followed many tutorials, read through wordpress guides thoroughly." | WordPress.org review (blogger) | lost — effort didn't convert |
| "It would also be helpful if you were given a 'list of things you need' when you first get started." | Capterra, WordPress | wished-for: prerequisites checklist |
| "The available videos and knowledge base articles were too cumbersome and not specific enough to be of much use." | Trustpilot, Squarespace | confused — generic help, not task-specific |
| "The in-person customer support is superb AFTER you wade thru their bot and all the endless pre-written 'help' articles" | Trustpilot, Squarespace | lost — article volume as an obstacle |
| "spent more time watching youtube tutorials on how to set it up than actually getting work done" | Trustpilot, Notion | lost — docs abandoned for third-party video |
| "Consistently requires screenshots / asking claude for new users to accomplish simple tasks." | Trustpilot, Notion | lost — docs abandoned for AI |
| "I really wish there was a better way to introduce basic features to new team members without it feeling overwhelming." | Trustpilot, Notion | wished-for: non-overwhelming onboarding |
| "The instructions they post on their help page are mostly incorrect as well." / "help articles are often outdated" | Trustpilot, Webflow (2 reviews) | staleness hits civilians too |
| "There is extensive documentation, a little confusingly divided between developer and general guidance." | Blog review, Ghost | lost — the two-audience split itself confuses when unlabeled |
| "The signal of the curse of knowledge is that little word 'just', which often crops up in answers to questions. 'Just insert this line in the theme.'" | Blog review, Ghost | condescended/confused — the word "just" as the tell |
| "I hate to take up someone's time with these primitive questions but they are a huge obstacle in moving forward." | WPBeginner comment | shame — the emotional cost of a docs gap |

**Asymmetry finding:** the "condescended by too-basic docs" complaint barely exists in the wild. Civilians overwhelmingly report the *confused* side. The closest analogue to resentment is **time waste** ("endless pre-written help articles"). Implication for cairn's editor docs: err toward plain and short; nobody complains a help page was too easy, they complain it was long, generic, wrong, or said "just."

---

## 4. Synthesis

### 4a. Top 5 properties that earn love

1. **[content] Examples that are the reader's actual task, runnable without substitution.** ("astro had an example of exactly that"; Stripe's your-real-API-key samples; "AI thinks docs are for reading. Developers use docs for copy-pasting until something works.")
2. **[structure] Layered IA — tutorial → overview → guide → reference, each layer complete and separate.** ("The layering. From beginner tutorial through to... API level docs" — Django; the paired HN complaints show mixing layers angers both audiences.)
3. **[content] Docs that teach the domain and the why, not just the surface.** ("It not only explains, it educates" — Django; "the best way to learn not just Tailwind, but CSS itself"; FastAPI "not only the how but the why".)
4. **[structure] Task-shaped findability — lookup lands on the answer faster than any alternative.** ("miles easier to search than grepping the codebase"; "quickly learn the utility class that just does the thing I want".)
5. **[structure+content] A bounded, self-sufficient corpus.** ("you can read the entire docs in a few hours" — Svelte; "I rarely have to go to blogs or Stack Overflow" — Django. Structure gives the finishable shape; content earns the trust that the answer is in there.)

### 4b. Top 5 frustrations to design against

1. **[content] Stale or wrong examples.** "Wrong documentation is significantly worse than no documentation." Hits both audiences (Webflow civilians: "help articles are often outdated"). For cairn: examples must be exercised by CI or generated from tested code where possible.
2. **[content] Assumed context / curse of knowledge.** Man-pages complaint; Svelte 5 "just dropping us into 'runes'"; Ghost's "that little word 'just'". Ban "just/simply/obviously" in editor-facing prose; state prerequisites explicitly.
3. **[structure] Features documented individually, no end-to-end flow.** "A complete and realistic example of an entire flow" is the named most-useful-and-hardest artifact. cairn needs at least one full-journey guide per audience (dev: install→adapter→deploy; editor: login→edit→publish).
4. **[structure] Getting-started buried, or the audience split unlabeled.** AWS discoverability; Ghost's "confusingly divided between developer and general guidance" — directly cairn's two-audience risk. Label every page's audience; make each audience's entry point one click from the docs root.
5. **[content] Coverage without explanation, and volume without specificity.** "they never explain what that option actually does"; civilians: "too cumbersome and not specific enough." Every option documented = necessary; every option *explained* (what it does, when you'd want it) = the actual bar. More pages is a cost, not a virtue.

### 4c. AI-smell checklist — observable tells cairn's rewrite must not trip

**Structural tells (page/section shape):**
- [ ] Identical section skeleton on every page regardless of what the page needs ("the same opening paragraph, bullet list and scattering of emoji, and immediately hit back")
- [ ] Rule-of-three everywhere — "lots of sets of three bullet points"
- [ ] Bullet lists where prose should carry an argument; uniform paragraph/section lengths
- [ ] Reflexive "In summary" / recap sections that add nothing
- [ ] Every claim balanced with a counter-claim ("Too balanced, too fair... AI keeps the peace like it's being graded")
- [ ] Unnecessary Title Casing of Concepts; self-referential meta-commentary ("this document describes...")

**Content tells (prose and substance):**
- [ ] Hedging noun phrases: "various factors," "a range of considerations," "it's important to note"
- [ ] The contrast frame: "it's not X, it's Y"; stock flourishes: "here's the kicker," "and the best part?"
- [ ] Model-isms: "excellent question!", em-dash overuse
- [ ] Uniform confidence — no caveats, no "this doesn't work when," no stated limitations ("Without this grounding in reality, docs generated by LLMs are hollow"; "Nothing risks being wrong. Humans leave dents.")
- [ ] Invented or unverified commands/flags ("a specific command that doesn't exist")
- [ ] Polish without actionability — "Your docs are beautifully written. I still have no idea how to create an order." Every page must answer: what does the reader copy-paste or click next?
- [ ] Semantic averaging — generic word choice, "sanding down your words until they're a smooth average"; no opinions, no committed defaults ("the millennial gray of prose")

**The positive inversion:** the anti-AI-smell signal readers reward is *committed judgment* — a named default, an honest limitation, a "don't do this," an opinion about the right way. That is also property #3 (teach the why) and cairn's existing register ("out of scope" as a valid answer) — the docs should sound like the charter already does.

---

**Report complete.** All quotes verbatim from fetched sources; attribution by platform. Gaps acknowledged: Reddit unreachable (HN + review sites substitute), Drizzle praise did not verify (found the opposite), and the "condescended" category is thin because it is genuinely rare in the wild, not under-searched — a finding in itself for the editor-docs register.

---

# Study 5: editor-docs craft (iA Writer, Obsidian, Bear, Kirby-as-counter-example)

# Editor-class documentation craft study: iA Writer, Obsidian, Bear, Kirby

**Coverage note:** Ghost's slice never returned; this synthesizes four sources — iA Writer (ia.net/writer/support), Obsidian (help.obsidian.md), Bear (bear.app), and Kirby (getkirby.com, which functions as the cautionary counter-example). Ghost's non-developer docs remain unexamined; if the study needs a fifth voice, that fetch is a cheap follow-up. All quotes below are verbatim from live pages fetched 2026-07-01.

## 1. Opening moves for the nervous non-technical reader

The reassurance budget varies by page type, and the best sources all agree on the split:

- **Getting-started/concept pages spend 1–3 sentences on reassurance, then act.** Obsidian's "Create your first note" opens with three sentences of *structural* reassurance before the first keystroke: "Notes in Obsidian are stored as plain text files. This means your data is durable and not locked into a proprietary format. By writing your notes in plain text, they'll outlive any app—even Obsidian itself." First instruction is sentence 4 ("Press `Ctrl+N`…"). Bear's getting-started gives three sentences of framing, then "Open Bear, click the **New Note button**, and start typing."
- **Task pages spend zero-to-one sentence, fused with the verb.** iA Writer's content-blocks page: "On Mac, effortlessly insert images, text files, code, or CSV tables into your documents with Content Blocks." The instruction verb is in the opening sentence. Obsidian's embed page gives one context sentence whose payoff is implicit reassurance ("stay up to date when the source file changes" = you can't get stale copies), then the instruction in sentence 2.
- **Fear is named at most once, in one sentence, immediately defused.** iA Writer is the only source that addresses fear directly: "If you are not familiar with Markdown, it might look a little scary at first. Once you get the basics, you will quickly love it as it allows you to format your text without taking your hands off the keyboard." One acknowledgment, one payoff, no dwelling.
- **The counter-example:** Kirby's editor-facing pages open with zero reassurance and immediate mechanism inventory: "Kirby comes with different text editing fields… From Markdown and Kirbytext to the visual Blocks and Layout field…" — five unexplained nouns in sentence 1.

## 2. How markdown is explained to someone who has never heard the word

Three convergent moves in the good sources, one anti-pattern in Kirby:

- **Define by what it lets you do, anchored to "plain text."** Bear: "Markdown is a simple way to add style, lists, links, and other formatting to plain text." No "syntax," "markup," or "language" in the definition.
- **Teach one symbol producing one visible effect, immediately.** Obsidian: "Obsidian supports Markdown syntax to make text bold, italic, and add links and headings. … The hash symbol (`#`) turns a line of text into a heading." That single sentence is the entire theory lesson.
- **Analogy to what the reader already knows.** iA Writer (via the Gruber quote): "asterisks around a word actually look like emphasis. Markdown lists look like, well, lists. Even blockquotes look like quoted passages of text, assuming you've ever used email."
- **Anti-pattern (Kirby glossary, the only markdown definition its editor pages link to):** "A markup language that uses plain text formatting syntax and can be converted to HTML and other formats. Created by John Gruber in 2004." — defines a beginner term using three terms the beginner also lacks, plus trivia instead of utility.

## 3. Tone devices

- **Reassurance delivered as fact, not comfort.** Obsidian never says "don't worry"; it states durability facts whose emotional payload is *you won't lose your work, you aren't trapped*. This is the strongest device found: warmth without a single warm word.
- **Short declaratives, one idea per sentence.** Obsidian: "Embedded files display their content inline in a note and stay up to date when the source file changes." Bear: "The first line of every note is its title, the rest is up to you." iA Writer: "iA Writer is a simple app. That's by design." Kirby, by contrast, runs 34-word three-idea openers.
- **Reader mistakes and fears: near-total silence, by design.** Across all Bear, Obsidian, and most iA Writer pages, no "it's okay if," no "mistakes happen," no undo-anxiety framing. The single fear-naming instance (iA Writer's "scary at first") is about the syntax, never about the reader's competence.
- **Steps are single physical actions.** Obsidian: "1. Press `Ctrl+N` (or `Cmd+N` on macOS)… 2. Type 'Obsidian' as the name of your note and press `Enter`." Platform differences fold inline in parentheses, never as a "Note: Mac users…" block.
- **Rhetorical question as task-page section opener (Bear).** "Want to add photos, PDFs, or other attachments? Click the **BIU button** again…" — reads the reader's goal aloud before naming the button.

## 4. What they never do

- **No stack vocabulary.** "Parser," "renderer," "HTML," "markup language," "repository," "compile" are absent from every good source's editor-facing sentence. Obsidian describes git-adjacent durability with zero git words.
- **No feature-first framing.** No page opens "X has a feature called Y that…"; feature names arrive *after* the reader knows what the thing does for them (iA Writer names "Content Blocks" only at the end of a sentence that already said "insert images… into your documents").
- **No hedging.** No "you might want to," "in most cases," "generally." Instructions are flat imperatives: Click, Open, Press, Type.
- **No apology, no self-deprecation, no support-ticket register** ("please note," "kindly," "as mentioned above") — confirmed absent across all fetched pages.
- **No theory before action.** Nobody explains how markdown works before the reader has made one thing bold.

## On the "just/simply/obviously" ban (per the coordinator's addition)

Evidence is split, and it splits along quality lines in cairn's favor. **Obsidian — the strictest and structurally best source — already fully complies:** its researcher explicitly confirmed "no 'simply,' 'just,' 'don't worry,' 'it's easy'" anywhere; all its reassurance is factual. **iA Writer and Bear violate it:** iA Writer leans on "simply drag and drop" and "effortlessly insert" as its primary warmth carriers; Bear has one "Simply type" across all fetched pages (sparing, but present). "Obviously" appears in none of the four sources. Practical implication: the ban is compatible with best-in-class practice, but it removes iA Writer's main warmth device, so cairn must carry warmth the Obsidian way — through consequence-facts and short sentences — not through minimizer adverbs. Imitate iA Writer's structure and fear-naming, not its adverbs.

## 5. Three pinned exemplar passages

**A. Obsidian, "Create your first note"** (help.obsidian.md/Getting+started/Create+your+first+note):
> "Notes in Obsidian are stored as plain text files. This means your data is durable and not locked into a proprietary format. By writing your notes in plain text, they'll outlive any app—even Obsidian itself."

Why: sells the tool's core mechanic purely as reader self-interest, zero technical words — the exact template for explaining cairn's markdown-in-git without saying "git."

**B. iA Writer, "Markdown Guide"** (ia.net/writer/support/basics/markdown-guide):
> "Our apps use Markdown formatting. This lets you apply basic formatting by adding a few punctuation characters. If you are not familiar with Markdown, it might look a little scary at first. Once you get the basics, you will quickly love it as it allows you to format your text without taking your hands off the keyboard."

Why: the one legitimate fear-naming move — acknowledge "scary" once, promise the payoff in the same breath, move on. (This passage happens to be ban-compliant: no just/simply.)

**C. Obsidian, "Create your first note"** (same URL as A):
> "Obsidian supports Markdown syntax to make text bold, italic, and add links and headings. Copy and paste the following text at the top of the Obsidian note: `# Sharpen your thinking.` The hash symbol (`#`) turns a line of text into a heading."

Why: the whole "what is markdown" lesson in 45 words — name it once in service of concrete outcomes, then one symbol, one visible effect, no theory.

## Craft rules for cairn's editor-class pages

1. **Reassure with facts, not comfort words.** State the consequence that removes the fear ("your words are saved as plain text and can never be trapped in this tool"), never "don't worry" or minimizer adverbs. This is how warmth survives the just/simply ban.
2. **Budget reassurance by page type:** getting-started and concept pages get up to three sentences before the first action; task pages get at most one, fused with the instruction verb; reference pages get zero.
3. **Define markdown as "a way to add formatting to plain text," teach it by one symbol producing one visible effect,** and never utter "syntax," "markup language," or "HTML" on an editor page.
4. **Name a fear at most once per page, in one sentence, with the payoff in the same or next sentence** ("it might look a little scary at first — once you get the basics…"). Never dwell, never revisit.
5. **Outcome before feature name.** Open with what the editor accomplishes ("add a photo to your post"); the feature's name, if it needs one, arrives after its job is clear. Never open "cairn has a feature called…".
6. **One idea per sentence, one physical action per step.** Fold variations (keyboard vs. mouse, Mac vs. Windows) into inline parentheses, never a caveat block.
7. **Flat imperatives, no hedging.** "Click Publish." — never "you might want to," "in most cases," or a qualifier stack.
8. **Anchor every new concept to something the reader already knows** (email quoting, a document title, a filing cabinet), the Gruber move — an analogy beats a definition.
9. **A rhetorical question may open a task section** ("Want to add a photo?") to read the goal aloud — Bear's device; use sparingly.
10. **The Kirby test before publishing any page:** if a sentence contains a word the site's least-technical editor couldn't define (branch, commit, frontmatter, deploy, field type), the sentence is rewritten or the word is doing the developer docs' job on the wrong page.
