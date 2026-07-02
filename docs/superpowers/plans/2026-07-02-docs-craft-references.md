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
