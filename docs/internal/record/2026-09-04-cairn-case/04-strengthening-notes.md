# Strengthening notes for the cairn case, round 2 fold (Geoff, 2026-09-04)

Fold these with evidence-round-2.md into the case document before the round-2 review.

1. The size ratio stays, and it is reframed as developer comfort in two halves: (a) the
   increment, what one more capability costs, section by section from the ASC enumeration
   (the 90-line sign-ups screen plus a 9-line migration at the small end; the members and
   events sections at the large end), each set against the engine it leans on; (b) what the
   developer never writes: the carried modules by name and line count (auth and sessions,
   CSRF and the guard, the editor and preview, the publish path, the admin design system
   and toolkit, the gates and tests). The sentence the pair supports: a developer adding a
   capability is spared the hardest kind of work and pays a measured, conventional
   increment. The whole-layer ratio remains beneath as the size record, with the "small
   fraction" correction intact.

2. Infrastructure interaction is low-impact, stated from the tree: the scaffold writes the
   Worker configuration (`wrangler.jsonc` with the D1, R2, and email bindings), the
   migrations, and the doctor's checks; the GitHub App install and the Cloudflare
   connection are guided steps in `create-cairn-site` (pre-release; cite its chapters);
   Workers Builds deploys from a push to `main` (optional; wrangler otherwise). The
   developer's contact with infrastructure is a short documented list, tagged [verifiable]
   against `docs/extend/what-the-scaffold-wrote.md` and the showcase config.

3. Security and hosting: state the facts behind "enterprise-class" without the phrase. The
   site runs on Cloudflare's global edge with TLS, DDoS protection, and the WAF that its
   largest customers use, as platform defaults, with the free-plan WAF subset and the Email
   Sending paid-plan beta caveats carried [verifiable: Cloudflare docs URLs from
   evidence.md]. GitHub holds the content with its access controls, App-scoped
   permissions, and audit history [verifiable: GitHub docs]. Where the second evidence pass
   supplies independent data on the edge's scale or incident record, cite it, including
   the 2025-11-18 outage as the honest counter.

4. The ASC consolidation case stays the lead of the extensibility subsection; the increment
   and the never-written list sit under it; the ratio under that.

5. The downside stated with equal weight: a cairn site is fully tied to these decisions.
   Content lives in GitHub, the site runs on Cloudflare, the app is SvelteKit, the admin is
   DaisyUI on Tailwind; a change of any one is a migration, and the platform's pricing,
   limits, and incidents are the site's. Give the counterweights only where they are facts:
   the content is plain markdown files in a repository the organisation owns (portable by
   clone); the app is standard SvelteKit with an adapter (deployable elsewhere with work the
   document should not minimise); the engine is MIT and on npm. Do not soften the tie; the
   register wants the reader to see it and decide.

## Round 3 review charge (Geoff, 2026-09-04)

Four personas replace the generic stances: a skeptical computer science professor (logic and
the evidence base, studies applied within scope); a working SvelteKit web designer (does the
case match the job as done; what they would build instead; the seams' cost; the toolkit and
theme boundary); a world-weary IT admin (operations: who gets paged, what breaks on upgrade,
the vendor tie at three in the morning, what happens when the developer leaves); a nonprofit
board member who must approve the budget (cost lines with numbers, what the organisation owns
if the developer leaves or the vendor changes terms, bespoke versus a mature product with
support, all in words a non-developer can approve against).

Every persona also returns a vocabulary map: the terms that stopped them (the board member on
jargon; the admin and the developer where one word means different things to them: deploy,
admin, app, platform, repository, worker), each with the plain equivalent that would have
worked. The map drives the front-door derivation, which must read for all four.

Fifth persona: a small-business owner who just wants a working website. They read for whether
the site will exist, look right, and stay up without them; who they call when it breaks; what
it costs per month and at the start; whether they can change a page themselves; and whether
any of the case's argument matters to them at all. Their verdict is the shortest of the five,
and their vocabulary map is the strictest: any term they would not say to a friend is flagged.

## Exit criterion (Geoff, 2026-09-04)

The revise-and-review loop repeats until a graded round returns B+ or better overall. From
round 4 on, each round adds a sixth reviewer: an AI-writing expert reading for tells (flat
cadence, machine vocabulary, punctuation habits, the structural tells the writing-voice
style names), run through the repo's `cairn-register-editor` and `prose-voice-reviewer`
agents in addition to the five personas.

## Round 6 addition (Geoff, 2026-09-04): the shape, not only the product

A "cairn-like" approach would also work, and the case says so. The argument is for a shape:
content as markdown in the organisation's own git repository; an admin frame that lives
inside the organisation's own app; the organisation's own screens mounted through seams; one
hosting platform supplying hosting, data, media, mail, and deploy. cairn is one implementation
of that shape. A developer can build the same shape from SvelteKit plus Keystatic or Decap
plus a hand-written admin, or on another stack, and the case names that as a valid choice and
lists, without grading words, what cairn ships that such a build writes or installs itself
(the list already in Leg 1). This is the honest answer to the designer persona's objection,
and it keeps cairn inside its charter: the claim is the shape plus the pieces, never the
product's superiority.

## Closing sequence (Geoff, 2026-09-05)

After round 6 grades v8's content: revision 9 restructures the document into core prose plus
footnotes (or per-section endnotes) so a reader gets the argument and a checker gets every tag,
citation, and reproduction command without either interrupting the other. Then the FINAL
adversarial review, on four axes with a letter grade each: prose quality, structure, AI tells,
and how the document addresses each audience (the evaluator profile plus the five personas),
run as the register editor, the voice reviewer, and a Fable audience reader in parallel. Only
after that does the document freeze and the derivation begin (first-person front-door prose,
the revised why-cairn.md, the concept figure).

Cadence is a measured criterion in revision 9 and the final review (Geoff, 2026-09-05): sentence
length variance per section with the tags stripped (the voice reviewer's coefficient of variation,
target at or above the 0.62 the derivable set held before the revision-5 splits flattened it),
runs of same-length clauses named by line, no paragraph without a short sentence, and the
ratified why-cairn.md opener as the ear. Splitting long sentences is not a fix by itself; it
removes the long tail and leaves a monotone.
