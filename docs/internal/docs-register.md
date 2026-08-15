# The docs register

The agent-facing register standard for cairn's published documentation and the front door
(the root `README.md`). It was ratified by Geoff on 2026-07-18 (spec:
`docs/superpowers/specs/2026-07-18-docs-register-standard-design.md`); the specimen history
lives in the `cairn-pub-front-page-voice` memory. Pass D (2026-08-14) rewrote this document's
organization around the four audience tracks the rebuild ships
([`2026-08-14-pass-d-target-manifest.md`](./record/2026-08-14-pass-d-target-manifest.md) names the
target page set; a page count belongs there, not here, since a number in this document rots).
The keystone and the universal contract carried over unchanged.

The Google Developer Documentation Style Guide is the Vale-enforced floor for every published
track except `docs/editors/`, which grades under Vale's Microsoft package instead (Geoff,
2026-08-14: the editor reader is the one audience the Microsoft voice, plainer and more
literal than Google's, actually fits). This standard sits on top of whichever floor a track
carries, and governs register, the thing Vale cannot grade. Read it before writing or
reviewing any published docs prose, and before grading a page at a review gate.

**A floor is not a ceiling (Geoff, 2026-08-15).** Google and Microsoft set the standard, and
cairn may deviate from either, or improve on it, where real-world evidence says the result is
better documentation. **Truly excellent documentation matters more than perfectly compliant
documentation**, and the two are not the same goal: a style guide encodes what worked broadly
for its authors' products, not what works best for this one. Compliance is the default because
it is usually right and always cheap; it is not the objective.

Two guardrails keep that from becoming license. A deviation is **evidenced**, not preferred:
name what the standard says, what is being done instead, and the real-world evidence, a
measured result, a documented failure here, or demonstrated practice in a corpus known to be
excellent. And a deviation is **recorded** where the next writer will meet it, in this document
if it governs a register or a track, and in the page's own contract if it is local. An
undocumented departure is drift, and reads as a mistake to every later reader. Where a Vale
rule is simply wrong about a specific line, that is a different case with its own procedure
below (see "When a Vale finding is wrong").

## The keystone

The docs explain a system to someone trying to use it, and have no stake in whether the
reader adopts it. Nothing anywhere in the docs is a pitch. At the same time, the reader
should come away impressed by the quality of the thought and the professionalism of the
prose. The writing does the persuading by being excellent, never by selling. Flat,
featureless prose that merely avoids marketing is not the target; it is the other way to
fail.

## Universal contract (every page)

- No marketing claims and no benefit-forward framing. Every factual claim is literally true.
  ("The whole organization works in one place" died on both counts: marketing register, and
  false, since teams are distributed.)
- No coined metaphor in a definitional or structural position. A metaphor may pass inside
  explanatory prose where it clarifies; it may not define what something is or name the
  docs' own anatomy.
- No prose about the docs' own writing. The docs never admire themselves ("Eight words the
  docs use precisely").
- No setup-colon triad cadence ("When something breaks: X diagnoses..., Y explains..., Z
  maps..."). Fold the items into plain sentences.
- No em-dash rhythm. The sentence-final elaborative tail is the tell regardless of which
  punctuation carries it; restructure into a second sentence rather than swapping the glyph
  for a comma or colon.
- **No published page cites Diátaxis**, its terminology, or its arm names (standing ruling,
  Geoff, 2026-08-14). A reader does not need to know the taxonomy a page was planned under;
  this document may name the forms (task guide, reference, and so on) for its own internal
  organization, since it is read by writers and reviewers, not shipped to a reader.
- Jargon is checked against the page's actual reader. Developer pages say "admin", "route",
  and "frontmatter" freely; editor-facing guides speak the editor's vocabulary.
- Product terms are the precise vocabulary, not jargon to remove: concept, adapter, render,
  seam, island, holding branch, manifest, role/capability. They name real system objects.
- **A vendor's specifics get a link, never a copy** (Geoff, 2026-08-05). Dashboard navigation,
  plan-availability tiers, expression-language signatures, field references, console
  walkthroughs, and pricing all sit behind a link to the vendor's own page. Whatever cairn
  copies, cairn owns keeping in sync, and it goes stale silently: vendors rename dashboard
  sections and move features between tiers without telling anyone, so a restated detail is
  wrong on a schedule cairn does not control, and a reader trusts it precisely because it looks
  specific. Write out in full only what is cairn's own reasoning, which does not drift: why the
  engine cannot do a thing itself, what an architectural choice costs, which of two mechanisms
  is true source and which a reconstruction. Quote a vendor verbatim only for a short
  load-bearing distinction, with the link. Keep at most one illustrative snippet, framed as
  illustrative, with the authoritative reference beside it. When two of a vendor's own pages
  disagree, linking one disposes of the conflict that restating them would force you to
  reconcile.

## When a Vale finding is wrong

Vale is a floor, not an authority. Its style packages are regexes and heuristics tuned against
generic prose; they do not know a document identifier from a measurement, or a literal rendered
string from a quoted opinion. When an error-tier finding is checked against the actual text and
turns out wrong, it stays wrong no matter how insistently the gate reports it, and the finding
gets a scoped and commented suppression or markup that says what the token actually is. **It
never gets a content change that alters a citation, a literal string, or a quoted message.**
Rewriting the words to satisfy a linter is the same defect as rewriting them to satisfy a
reviewer who misread the sentence: the words were right, and now they are not.

Two worked examples, one resolved by markup and one by suppression, so the choice between them
is demonstrated rather than described:

- **A literal rendered string, fixed by markup.** `admin-grammar-tokens.md`'s wordmark row
  documented that a keming defect made the wordmark render as "Caim," and the surrounding
  double quotes read to `Google.Quotes` as ordinary prose, which wants the trailing period moved
  inside the closing quote. Moving it would have said the wordmark rendered a trailing period,
  which it did not: the quoted material was not an aside being quoted, it was the literal output
  a reader could see on screen. The fix is not the punctuation move; it is naming the string as
  a literal, with inline code spans (`` `Cairn` `` and `` `Caim` ``) instead of double quotes.
  Vale skips code spans, the rule stops firing because there is no quoted prose left for it to
  read, and the markup now says the true thing: these are rendered characters, not a remark.
- **A document identifier, fixed by suppression.** `auth-channel-security-model.md` cites "NIST
  SP 800-63B," the actual name of a real standards document (the Digital Identity Guidelines
  volume on Authentication and Lifecycle Management), and `Google.Units` read the trailing
  `63B` as a number glued to a unit, wanting a nonbreaking space inserted between them. There is
  no markup fix here: a standards citation is not code, and splitting the identifier to satisfy
  the rule would rename the document to something that does not exist. This takes Vale's inline
  suppression, scoped to the one rule and the smallest span that covers the citation, with a
  comment stating why:

  ```
  <!-- vale Google.Units = NO -->
  <!-- SP 800-63B is a document identifier, not a measurement. -->
  ...the line...
  <!-- vale Google.Units = YES -->
  ```

A suppression names one rule (`Google.Units`, never a bare `vale = NO`) and carries a comment
explaining why the finding does not apply; a blanket disable hides every future finding on that
span, real or not, and is never the fix. Confirm a suppression actually takes effect by running
the gate with and without it, the same falsifiability standard every gate in this repo is held
to, rather than trusting the syntax on sight.

## The page anatomies

Each track builds its pages from a small set of reproducible shapes. A page states which
anatomy it follows by following it, not by naming it; the shapes below exist so a writer or
reviewer can check a page against a checklist rather than a feeling.

- **Task guide** (most admin and extend pages): a one-line contract, preconditions stated
  with links to whatever produces them, runnable steps, a "you know it worked when" check,
  and failure paths that point at the track's recovery surface (`admin/setup-recovery.md`,
  `admin/troubleshooting.md`, or `extend/debug-your-site.md`) rather than restating recovery
  prose inline.
- **Tutorial milestone** (the extend track's deep path): stated objectives, the state the
  prior milestone produced, steps, a checklist before advancing, and a disclosure block (the
  Astro "Show me the steps" device) for a reader who wants to try first and check the answer
  after.
- **Reference entry** (`docs/reference/`): the existing gated template (signature, parameters,
  defaults, failure modes), now opening with a short narrative lede, a sentence or two of
  what the shape is and why it exists, before the table. The lede is additive to the gates,
  not a replacement for them.
- **Condition entry** (`admin/is-it-working.md`): a condition id matching the doctor's
  registry, what the check reads, what a failure means in plain terms, the remedy, and the
  anchor slug the id resolves to, which must survive a page edit since `check:readiness`
  gates it against the built condition registry.
- **Symptom row** (`admin/troubleshooting.md`, `extend/debug-your-site.md`): what the reader
  sees, the log event that correlates (linking `reference/log-events.md`), what it means, and
  the fix, with a row that needs code changed saying so and pointing at the extend track's
  debugging page instead of a false promise of a purely operational fix.

## The four tracks

Every published page belongs to exactly one track, every track serves exactly one profile
(the full profiles: [`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)),
and a page review grades the page against its profile. The five elements below are what a
reviewer needs without opening the profile document: which reader the track claims, the
vocabulary contract, how the reader arrives, the success criterion, and the question that
kills a page serving the wrong reader.

### The editor track (`docs/editors/`)

**Profile:** a non-technical author who writes on a cairn site through `/admin`. **Style
floor:** Microsoft, not Google (the one track that differs). **Register:** outcome-first
task prose in plain second person; the fear behind a task ("did I just break the site?")
answered before the mechanics. No outbound links to any other track: `cairn.pub/help`
renders this track alone, so a reader following a link never leaves the surface they
understand.

**Vocabulary contract.** Free: your site, the editor, draft, save, publish, entry, page,
post, image, tag, sign-in link. Defined on use: markdown (as "the plain-text formatting the
editor previews for you"), fields (the boxes above the text), the media library. Banned:
repo, commit, branch, merge, deploy, build, frontmatter, markdown syntax names (say "a
heading," not "an H2"), any Cloudflare or GitHub noun.

**Arrival state.** Through the admin's Help link, usually mid-task and sometimes
mid-frustration; on whatever device the admin is open on; never through GitHub, npm, or the
repo.

**Success criterion.** The task is done without opening another tab and without asking a
developer, and the reader can say afterward what state their entry is in.

**Counterpart question:** could a person who has never used a terminal complete this page's
task with only the admin open, and does any sentence assume otherwise?

### The admin track (`docs/admin/`)

**Profile:** a technical non-developer who sets up and runs the default site. **Style
floor:** Google. **Register:** outcome-first headers; money, prerequisites, and the
free-until boundary stated before the step that incurs them; the task guide anatomy
throughout.

**Vocabulary contract.** Free: command, terminal, account, dashboard, domain, email, sign
in, your repository (glossed once as "where your content lives on GitHub"). Defined on use:
DNS and nameservers, zone, deploy, Workers (as "where your site runs"), D1/R2 only if a step
shows them. Banned: adapter, seam, schema, frontmatter, island, runes, TypeScript, any
engine-internal name. Every command shown is copyable as printed and traces to a recorded
run.

**Arrival state.** Through the root README or word of mouth, deciding to create a site, or
inheriting a running site someone else created; `create-cairn-site` is the setup spine, and
the docs narrate and recover it, never replace it with hand-authoring.

**Success criterion.** The default site is live and healthy with zero code authored, and
every failure the reader can hit ends in a named next step classified wait, act, or ask a
developer.

**Counterpart question:** is any step's success dependent on knowledge the page did not
state, and is any cost or prerequisite revealed after the step that incurs it?

### The extend track (`docs/extend/`)

**Profile:** a Svelte-fluent web developer building an organization's site on cairn's
seams. **Style floor:** Google. **Register:** contract-first task, tutorial, and concept
prose; this reader is fluent in their own stack and resents padding or hand-holding on it.

**Vocabulary contract.** Free: the full developer vocabulary, plus cairn's product terms
(concept, adapter, render, seam, island, holding branch, manifest, role) defined once in the
track and used precisely after. Nothing is banned; imprecision is. A vendor's specifics get
a link, cairn's own reasoning gets prose.

**Arrival state.** Through npm, GitHub, or the root README, often evaluating cairn against
alternatives, or taking over a scaffolded site and wanting to know what the tool wrote and
why. This reader skims first and judges quickly.

**Success criterion.** They extend the site without reading engine source, every documented
snippet typechecks against the built package, and an upgrade is a read of the changelog, not
an archaeology session.

**Counterpart question:** does the page state the contract and its stability tier rather
than narrating implementation, and would a competent SvelteKit developer find any sentence
here that their own stack's docs already own?

### The contributor zone (`CONTRIBUTING.md` and `docs/internal/`)

**Profile:** an experienced library-flavored engineer working on cairn itself. **Style
floor:** none; this zone is unpublished, and Vale does not lint it. **Register:**
engineer-to-engineer, invariants stated flatly, history linked rather than restated.

**Vocabulary contract.** Unrestricted, including internal names (the chassis, the bake, gate
names, the charter), provided the zone's index defines or links each on first use.

**Arrival state.** Through `CONTRIBUTING.md`, holding a patch impulse or an issue, usually
already having read some source. Nothing this reader needs ships in the tarball.

**Success criterion.** A first PR clears the gates without a maintainer explaining an
unwritten rule, and the contributor can answer "is my idea cairn's job?" from the boundary
docs alone.

**Counterpart question:** does the zone separate the living standard from the record, and is
every invariant the contributor could violate either a gate or a written rule the index
surfaces?

## The reference (`docs/reference/`), a shared instrument

Dry contract prose, third person: signature, parameters, defaults, failure modes, now with a
short narrative lede (the reference-entry anatomy, above). No arrival state or vocabulary
contract of its own; it is the extend track's and the admin track's shared lookup surface (the
index's "also for site admins" grouping names `doctor`, `log-events`, and
`supported-toolchain`), and the one place the engine contributor's zone points a reader
outward to rather than restating. Reference stays rigid and gated: the four existing gates
(`check:reference`, `check:reference:signatures`, `check:snippets`, `check:readiness`) are the
structural answer to reference drift, the category's loudest documented complaint.

## The front door (`docs/README.md`, `docs/why-cairn.md`, and the root `README.md`)

The fifth register case, alongside the four tracks. These three pages are where every
audience lands, and they carry the whole cairn story.

- **Five routes, not four, in the first screenful.** The evaluator route comes first
  ("deciding whether cairn fits" → `docs/why-cairn.md`), then editor, admin, extender,
  contributor, in that order. One copyable `create-cairn-site` command sits above the routes.
  No Diátaxis citation anywhere (the universal-contract ruling above; the root README's own
  positioning sections move below the command and routes for the same reason a pitch never
  leads).
- **Primary persona: the seasoned developer serving an organization.** Most readers are
  developers, and jargon-stripped prose would cost the tool their respect. The full story is
  complex and nuanced, and lands completely only with this reader; write to them and do not
  flatten the story.
- **Legibility floor:** an intelligent, technically savvy editor can still get the gist.
  Technical terms appear where they carry information (SvelteKit, git-backed, markdown, npm
  dependency), with context or a short apposition doing the glossing rather than avoidance.
- **The editor's arrival path is a requirement.** An editor who lands here must find
  `docs/editors/welcome.md` without hunting, and must walk away with a general understanding
  of what cairn is even where the specifics pass them by. The "If you write for a site built
  on cairn" routing line stays prominent and early.
- **The content anchor** (Geoff, 2026-07-18, near verbatim): cairn is both a polished,
  editor-first, git-backed, Cloudflare-hosted CMS and a modern SvelteKit toolkit that a
  developer can extend to support their organization. It takes the position that content
  editors are often the very same people who drive an organization forward, and that by
  extending the CMS interface, a developer or development team can build a streamlined and
  productive tool for their organization. Part of that offer is concrete: cairn gives the
  developer a UI toolkit to extend, so admin additions come together quickly and share one
  coherent user experience. That combination of technical architecture, out-of-the-box
  features, and editor-first approach is the substance the page explains.
- **Concrete extension examples belong here.** The extensibility claim lands through
  examples of the kinds of things a developer could build on cairn's seams: member signups,
  reservations, rosters, event and program management, and other member-facing tools for a
  small organization. Name types of functionality, never a specific consumer site. Examples
  state what could be built; they never pitch.
- **Stack reasoning is welcome.** Explaining why cairn uses SvelteKit, DaisyUI, and
  Cloudflare is in-register here, in short form; the full argument, including the honest
  trade-offs, stays in `docs/why-cairn.md`.

## Calibration specimens

Both poles, so a reviewer learns the line and not just the rules.

**Killed** (each passed the mechanical gates; the gates catch slop, not flat taste):

- "writing room" as the docs opener's definition of cairn. A coined metaphor in a
  definitional position. Killed on challenge; its earlier ratification did not save it, and
  ratification never defends prose against a live read.
- "The four arms" as the heading for the docs' own structure. Metaphor dressing the docs'
  anatomy.
- "Eight words the docs use precisely" as the vocabulary intro. The docs admiring their own
  writing.
- "When something breaks: cairn-doctor diagnoses..., the logs explain..., troubleshooting
  maps..." The setup-colon triad cadence.
- "The whole organization works in one place, content and custom functions sharing one admin
  and one sign-in." Marketing register and factually false.

**Ratified-good:** the why-cairn opener, Geoff-polished: "Before cairn, every content change
on the small sites I run ended up as my git commit. An editor would email me the new
schedule or a corrected paragraph, I'd make the edit, and the deploy would carry it live."
Concrete, unhurried, first person carrying evidence. The post-sweep `docs/README.md` is the
third exemplar, in the front-door register.

## For reviewers grading against this standard

- Grade a page against its own track's profile first: which reader, which vocabulary
  contract, which arrival state, which success criterion, and whether the counterpart
  question would fail it. A page graded against the wrong profile can look fine while
  failing its real reader.
- Cite the rule a finding violates and quote the offending text; propose a rewrite in the
  page's track register.
- Over-firing is a defect equal to missing. Prose that is plain, true, and in-register is
  done; do not churn it, and do not rewrite for rewriting's sake. A finding whose rewrite
  merely paraphrases is not a finding.
- The keystone cuts both ways: flag marketing register, and also flag prose so flat or
  perfunctory that it fails the quality-of-thought bar.
