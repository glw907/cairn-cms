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
