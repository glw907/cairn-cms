# Docs Rewrite Stage 2 Implementation Plan

> **For agentic workers:** Orchestrated from the main loop. The main loop drafts the
> voice-setting front doors itself; structured pages go to `cairn-implementer` dispatches with
> per-page briefs; the page fan-outs are workflow candidates at execution time (Geoff's
> standing opt-in covers suggesting them). Tasks specify outcomes, constraints, and acceptance
> criteria.

**Goal:** Execute the approved docs IA
(`docs/superpowers/specs/2026-07-01-docs-ia-design.md`) against the frozen contract: the
snippet gate first, then the rewrite in the IA's writing order, until the shipped tree matches
the IA's page inventory exactly.

**Sequencing:** Executes after the code polish pass merges (the docs snippets imitate the
polished idiom). Worktree off `main` (suggested branch: `docs-rewrite-1`).

## Global constraints

- **Standards:** Google developer style on all published pages and repo-root docs (Vale
  enforces; extend `.vale.ini` to cover `README.md` in Task 1). The friendly register per the
  IA: second person; callouts framed as the reader's next question, not generic Note/Warning;
  one celebratory line at each genuine tutorial payoff; functional emoji vocabulary of at most
  three marks, or none. Warmth concentrates at on-ramps and payoffs; reference stays precise.
- **Diagrams:** Mermaid only; every diagram carries the dark-mode init directive and adjacent
  prose that survives a failed render. The IA's diagram inventory is the complete set; no
  drive-by diagrams. Screenshots only in `set-up-the-github-app.md`.
- **Topo portability:** relative links within `docs/`, no GitHub-only rendering assumptions,
  assets referenced by relative path.
- **Authorship split (token economy + voice):** the main loop drafts `README.md`,
  `docs/README.md`, `explanation/why-cairn.md`, and the tutorial's framing prose (the
  voice-setting surfaces); implementer dispatches draft the structured pages against per-page
  briefs and the front doors as register exemplars. Every dispatch cites the IA and the two
  register paragraphs above verbatim.
- **Gates, throughout:** `check:docs`, `check:reference`, `check:reference:signatures`,
  `check:prose` where it applies, Vale error-tier clean, and the new snippet gate from Task 1.
  A page is not done until its inbound links are re-pointed (`grep -rn` the tree per the
  drift-hunting convention).
- No engine code changes except the snippet-gate script and `.vale.ini`; a docs defect that
  needs an engine fix files to STATUS carry-forwards instead.
- Conventional commits; one commit per task or coherent page group; docs-only commits skip
  `code-simplifier`.
- **Outline gate for the open-shape documents (Geoff, 2026-07-02).** Before any prose, the
  ~twelve documents whose structure is genuinely open get heading-plus-one-liner outlines:
  the two front doors and `why-cairn` (Task 2), the tutorial's milestone-level outline with
  payoff and diagram placements (Task 3), the seven new/replaced pages (Task 4's three new
  guides and the thin upgrade guide; Task 7's `docs-maintenance` and showcase README), and
  the two explanation restructures (Task 5's `security-model` and `media-storage`). All
  outlines are reviewed in ONE batched adversarial pass (a single Opus reviewer against the
  IA inventory, the comparables' leanness lessons, and the register rules — including
  cross-page duplication, the failure mode that produced the render-safety overlap), the
  main loop rules on findings, and only then does prose begin. Survivor pages and
  defect-list rewrites skip the gate; their shapes are already settled.

---

### Task 1: The snippet gate, born catching real defects

**Dispatch:** `cairn-implementer`.

**Outcome:** `npm run check:snippets` extracts fenced TypeScript/Svelte code blocks from
`docs/tutorial`, `docs/guides`, and `docs/reference` and typechecks them against the built
package. Mechanism is the implementer's (extraction script + a generated typecheck project is
the expected shape), with these requirements: an explicit per-block opt-out annotation for
deliberate fragments (documented in the script header and used sparingly — a page full of
opt-outs defeats the gate); the gate wired into CI alongside the other doc gates; and a
demonstration in the report that it catches both defect classes the audit found (a
retired-dep snippet and a wrong-signature snippet — reproduce each transiently, watch it fail,
revert). Getting the gate green requires fixing the tutorial's two mechanical blockers in this
task (the `createCairnAdmin` deps shape; the five-file admin mount snippet) — the tutorial's
full rewrite is Task 3; this task fixes only what the gate catches.

**Acceptance:** gate red on the two demonstrations, green on the corpus after the mechanical
fixes; CI updated; `.vale.ini` extended to `README.md`; full doc-gate suite green.

- [ ] Gate mechanism test-first, demonstrations, mechanical tutorial fixes, CI wiring, commit

### Task 2: Front doors (main loop)

**Files:** `README.md`, `docs/README.md`, `docs/explanation/why-cairn.md` (new).

**Outcome:** The three voice-setting pages, drafted in the main loop. README: the npm and
GitHub front door — positioning paragraphs survive in substance (the corpus graded them the
strongest asset), stale `ecnordic.ski` fixed, funnels to the docs rather than inlining them,
no ToC. `docs/README.md`: audience routing in the first paragraph (developer vs editor), the
reading path, the vocabulary section (six-to-eight terms). `why-cairn.md`: the positioning
page — who cairn is for and not for, absorbing the public-worthy content of
`docs/internal/what-cairn-is-and-is-not.md` (which stays, internal-facing, but published
pages stop linking into it).

**Content brief for the opening and the why (Geoff, 2026-07-02):** the README and
`why-cairn.md` open with a good, clear statement of what cairn is and who it is for — the
two-persona statement (the developer who owns everything; the editor who gets a humane
tool), before any feature list. The positioning coordinates from the competitive read are
material: cairn sits where Kirby's two-persona honesty, Eleventy's leanness creed, and iA
Writer's editorial respect intersect, on the one stack it refuses to abstract away.
`why-cairn.md`'s technical why must ARGUE the stack, not just state it: **why Cloudflare**
(Workers + D1 + R2 + Email Sending are a complete small-site substrate from one vendor at
small-site prices, and refusing the multi-cloud portability layer is precisely what keeps the
engine small — every abstraction cairn does not carry is a seam that cannot break); **why
SvelteKit** (server-rendered pages with progressive enhancement match a CMS whose admin is
form actions that work before JavaScript loads; the islands model matches
mostly-static-content sites; the component model is the one the extending developer already
lives in); and, at lesser weight, **why DaisyUI** for the admin skeleton (the developer
extends the admin in the most copyable idiom in the ecosystem instead of learning a bespoke
design system — the admin's look is cairn's, but its extension language is everyone's).
Honesty rule for all three: the arguments are real trade-offs stated plainly, including who
should NOT choose cairn because of them (no Cloudflare account, a React team, a taste for
open-ended collections); the who-it-is-not-for half is what makes the who-it-is-for half
credible.

**Wayfinder is part of the pitch, not an accessory (Geoff, 2026-07-02).** The what/who
opening carries the dual-mode positioning: cairn is both a near-end-point for basic
content-managed sites (Wayfinder plus the scaffolder gets a clean, professional site running
quickly, and for many sites that is legitimately the finish line) and a foundational starting
point for sites that will grow past a basic CMS (the thin seams, the token-layer
extensibility, the build-alongside model). Quality scaffolding is named as a critical part of
the experience, not a demo: "started quickly and cleanly" and "extend and grow easily" are
the same promise at two moments in a site's life. Hierarchy (Geoff, 2026-07-02): the
dual-mode positioning is cairn in a nutshell — the charter itself viewed from the user's side
("does its one job well" is the near-end-point claim; "serves everything beyond it with a
thin seam" is the foundation claim) — and Wayfinder follows the philosophy rather than
carrying it. The page argues cairn's dual nature first and presents Wayfinder as its visible
instantiation. This is also the Wayfinder design review's neutral-yet-compelling balance
restated as product positioning — the docs claim it, the review verifies it, and the two
must not drift apart.

**Acceptance:** all three pass the gates; no published page links into `docs/internal/`
after this task (grep-proven); `prose-voice-reviewer` findings on these three folded in
before the task commits (these pages are the register exemplars every dispatch cites, so
they get their voice review early, not at pass end); the content brief above is satisfied
on its own terms — the what/who opening leads, and each stack choice is argued with its
trade-off named.

- [ ] Draft, voice-review, fix inbound links, commit

### Task 3: The tutorial

**Dispatch:** `cairn-implementer`, with the main loop supplying the framing prose and
reviewing closely.

**Outcome:** `build-your-first-cairn-site.md` rewritten on its surviving ten-milestone
skeleton: every snippet current against the frozen surface (the gate now proves this), the
bindings idiom (`CairnPlatformBindings`), correct scaffolder status with the IA's
"fastest path" seam for the future quickstart link, payoff moments at first save, first
publish, and first deploy, and the save → holding branch → publish flow diagram placed at
the milestone where the model becomes real.

**Acceptance:** snippet gate green over the page; the register matches the front doors;
milestone structure intact; `docs/README.md`'s reading path points at it correctly.

- [ ] Brief, draft, main-loop voice pass, gates, commit

### Task 4: Developer guides — rewrites, replacements, and the three new pages

**Dispatch:** implementer dispatches (workflow candidate: the pages are independent).

**Outcome:** (a) The rewrite-source set fixed per the corpus grades' per-page defect lists:
`define-an-adapter-and-schema` (the `githubApp(...)` and `defineConcept(...)` snippet
defects), `link-content-with-references` and `structured-fields` (defineConcept snippets;
structured-fields' explanation content moves to Task 5's merge),
`configure-auth-and-d1` (a public verify path replaces the two links into
`docs/internal/admin-smoke-test.md`), `deploy-to-cloudflare` (the five-file mount),
`rotate-the-github-app-key` (de-personalized secrets paths). (b) `upgrade-cairn.md` replaced
by the thin process guide per IA ruling 2 (the version-mirror content deleted; CHANGELOG is
the history). (c) New: `migrate-existing-content`, `add-authors` (the
declare-your-own-concept + `fields.reference` pattern, framed as the answer to the "does
cairn support X?" class), `troubleshooting` (symptom → log event → fix, on the doctor and
`log-events.md`). (d) The guides index gains the For-developers / For-editors grouping (IA
ruling 1).

**Acceptance:** every page's defect list closed; the killed version-mirror actually gone;
new pages in the index; snippet gate and doc gates green; register consistent with the
exemplars.

- [ ] Dispatch per page group, review diffs, gates, commit

### Task 5: Explanation consolidation

**Dispatch:** implementer dispatches with tight briefs; the security restructure reviewed by
the main loop against the auth-library research.

**Outcome:** The IA's arm reshape: `security-model.md` restructured per the ownership rule
(hub owns guarantee/residual/why per boundary; the duplicated render-safety section shrinks
to guarantee + residual + link), gaining the "cairn handles / your site handles" table, the
trust-boundary Mermaid diagram, and the closing disclosure pointer; `structured-fields.md`
merges into `content-model.md`; `media-storage.md` rescoped to why (reference-grade detail
moves to `reference/media.md`), gaining the bytes/reference split diagram; `data-tiers.md`
trimmed of the design-log flavor; `why-cairn.md` already landed in Task 2; the explanation
index updated; `docs/internal/extending-developer-lens.md`'s stale baseline section
refreshed (internal, but carried by the IA).

**Acceptance:** nine pages exactly, per the IA inventory; the render-safety duplication gone
(grep-proven); diagrams carry the dark-mode directive and adjacent prose; gates green.

- [ ] Dispatch, main-loop review of the security restructure, gates, commit

### Task 6: Reference restructures and the editor-guides register sweep

**Dispatch:** implementer dispatches.

**Outcome:** `components.md`'s MarkdownEditor wiring-props wall becomes a table;
`sveltekit.md` reorganized internally (clear per-factory sections; still one page);
`log-events.md` prose trimmed. The five editor guides swept for register consistency against
the front-door exemplars (they graded strong; this is a polish, not a rewrite). The
For-editors group lands in the guides index if Task 4 did not already place it.

**Acceptance:** `check:reference` + signatures green (restructures must not break the
name/tier/signature anchors); the wiring-props table carries every prop the current page
lists; editor guides read in one voice.

- [ ] Dispatch, gates, commit

### Task 7: Repo health, kills, the staleness sweep, and pass consolidation

**Outcome:** `examples/showcase/README.md` (new, short: the Wayfinder template and the
tutorial's companion); the stray `docs/cairn-dx-feedback-2026-06-09-*.md` moves to
`docs/internal/history/`; **a repo-wide stale-docs sweep** (Geoff, 2026-07-02): every file
under `docs/internal/` (and any doc outside the published arms) is graded current, superseded,
or history — superseded design docs move to `docs/internal/history/` per the established
archive convention; internal docs whose public-worthy content the rewrite absorbed (starting
with `what-cairn-is-and-is-not.md` → `why-cairn.md`) gain a one-line pointer header naming
their successor; every internal doc that published pages used to link into is either public
now or unreferenced; the friction log is pruned of items this pass resolves. Exempt by
convention: `docs/superpowers/` plans and specs, post-mortems, and everything already under
`history/` — those are write-once records, not staleness. The sweep is graded work
(implementer inventories and proposes, main loop rules on each disposition), not a bulk
delete; ROADMAP updates — the docs-rewrite Next entry marked done and
removed, the community-file triggers filed (CONTRIBUTING + templates when PRs are solicited;
CODE_OF_CONDUCT when a community space exists; the SECURITY.md go-public toggle+trim as a
timed item on the go-public pass); CHANGELOG entry under `## Unreleased` (docs overhaul,
no `Consumers must:`); the friction log's resolved docs items closed. Then the `cairn-pass`
end ritual for a docs pass: full doc-gate suite plus the snippet gate, a
`prose-voice-reviewer` fan-out over the pass's pages, post-mortem with both budget numbers,
STATUS roll, merge decision.

**Also in this task — the standing hygiene model (Geoff, 2026-07-02: "once these docs are
built, they need to stay up-to-date"):** ship `docs/internal/docs-maintenance.md`, the short
doc that makes docs freshness a system rather than an intention, with three layers stated
plainly: (1) the machine layer — the full gate inventory and what each catches
(`check:reference` + tiers + reverse stale-name, `check:reference:signatures`,
`check:snippets`, `check:docs`, `check:surface`, Vale), which after this pass covers names,
signatures, code blocks, links, and tiers; (2) the pass layer — the existing
docs-is-a-pass-dimension convention (a change is not done until its docs match; grep for the
old name; prune ROADMAP and the friction log as you go), restated as the one human rule the
gates cannot replace; (3) the drift layer — semantic prose drift is the one thing neither
gates nor pass discipline catches (a claim that was true when written and quietly stopped
being true), so pass end creates a **monthly docs-freshness routine** (schedule skill, cloud
agent, Sonnet): sample three published pages per run, adversarially fact-check every claim
against the current code, report only confirmed drift with file:line evidence, and
self-report "no drift" in one line otherwise. The Topo-era additions (docs-build link gate in
CI, llms.txt regeneration) stay in the IA's constraints ledger and join this doc when Topo
lands.

**Acceptance:** the shipped tree matches the IA inventory exactly — every inventory page
exists and does its stated job, every kill is gone (this is the pass's definition of done);
all gates green; ROADMAP and friction log consistent; `docs-maintenance.md` shipped and the
freshness routine created and recorded there by id.

- [ ] Repo-health files, kills, ROADMAP/CHANGELOG, ritual, merge decision

---

## Self-review notes

- Task 1 fixes two tutorial snippets that Task 3 then rewrites; this is deliberate (the gate
  cannot land red, and Task 3's rewrite is voice-and-structure work on a mechanically-correct
  base), stated here so the overlap reads as sequencing, not duplication.
- SECURITY.md's rewrite is intentionally NOT in this pass: the IA times it to the go-public
  flip (the toggle cannot be enabled while private); Task 7 files the trigger.
- The quickstart is intentionally absent (IA ruling 3); Task 3's "fastest path" seam is its
  future mount point.

## Recalibration (Geoff, 2026-07-02, binding on every task)

The existing docs corpus is Opus-authored and its prose is not trusted at any grade. The
Stage 1 "survives" grades remain valid for STRUCTURE and factual currency only; **no
existing sentence survives on the grade's authority**. Every page the pass touches gets
rewrite-grade prose regardless of its triage class, and the Task 4/6 "register sweep" of
survivor pages is a prose rewrite, not a touch-up. Calibration sample: the old README's
save-paragraph, previously judged the repo's best prose, is the passage Geoff quoted as
unsalvageable — mechanism-first, jargon-dense, reader-less. The corrected bar: an
introduction introduces (genre first — see any real CMS), prose leads with the reader's
stakes, and mechanism follows meaning.

## Supersession (Geoff, 2026-07-02, final word on the corpus): toss the docs, start fresh

The existing docs are not source material — not for prose, not for content. Every page in the
IA inventory is written from zero: facts come from the code and are verified by the gates
(snippets compile, names/signatures/tiers gate-checked), structure comes from the IA and the
reviewed outlines, craft comes from the best-in-class exemplar studies (the SvelteKit-ecosystem
developer-docs study and the CMS/writing-tool editor-docs study) plus the CMS-intro genre
study. The survive/rewrite-source vocabulary is retired; the only classes are the IA inventory
and the kills. The old corpus stays reachable as a standing example of what not to do on the
never-merged branch `opus-docs-anti-exemplar` (pointed at the last pre-rewrite main), and page
briefs may cite it only as contrast. The Task 1 snippet gate keeps its full value (the
mechanism outlives the corpus it first ran on); its fixes to old-page snippets are accepted
waste, discarded as each page is replaced.

## Register rules from the sentiment study (2026-07-02, binding)

- **"Just", "simply", "obviously" are banned in editor-class prose** (the Ghost curse-of-
  knowledge tell); prerequisites are stated, never assumed. The civilians' asymmetry: nobody
  complains a help page was too easy — err plain and short.
- **Every page ends in an action** the reader copies or clicks ("polish without actionability"
  is the named AI-smell); every option documented is also *explained* (what it does, when
  you'd want it).
- **Committed judgment is the register**: named defaults, honest limitations, "don't do this"
  — the positive inversion of the AI-smell checklist, and the voice cairn's charter already
  speaks. The full checklist (structural + content tells) lives in
  `2026-07-02-docs-craft-references.md` Study 4 and binds every dispatch and review.
- **One end-to-end journey per audience**: the tutorial is the developer's; the editor's
  (sign in → edit → publish) lives in editor-welcome and must stay complete.

- **Geoff's own voice is a register factor (Geoff, 2026-07-02):** plain, direct, dry,
  judgment-forward, unceremonious; parenthetical asides allowed; no performance. Cairn is a
  solo project and the honest pronoun is **"I"** wherever a person speaks (the ripgrep and
  re-frame precedent), never a fictitious "we". Length may breathe when the extra sentences
  are doing real work.

- **"To a developer, something that sounds like a commercial pitch is probably an anti-pitch"
  (Geoff, 2026-07-02, the register law).** The intro must state the core problems cairn solves
  (named, concrete) and who it obviously ISN'T for (in the intro itself, flatly, not delegated
  to a link). Disqualifying the wrong reader early is a feature of the intro, not a cost.

- **The punctuation tell is per VOICE, not per document (Geoff, 2026-07-02).** Third-person
  documentation prose following Google conventions uses Google's punctuation, em dashes
  included. Prose that speaks as "I" claims a human author and must read as one: periods,
  commas, parentheses, human rhythm; no em-dash interpolation pairs, colon payoffs, or
  semicolon splices. Density matters everywhere (three interpolation pairs on a page is a
  fingerprint in any register); the hard line is the first person, because our audience is
  developers and that is where their authenticity detector runs hottest. The same per-voice
  logic covers the structural tells: the not-X-but-Y contrast frame is banned outright (a
  caught instance: "Those aren't gaps to be fixed; they're the trade...").

- **The positive register model (Geoff, 2026-07-02): a good writer on a developer-focused
  blog.** Not marketing copy at any temperature. Concretely: no aphorisms or slogan-shaped
  parallels ("code in your app and files in your repo"), no dramatic nouns ("hostage"), no
  bolded-lead feature bullets (feature-card formatting), no punchline triples. Explanation to
  peers, in ordinary sentence shapes, with the writer's judgment visible.

- **Identical sentence skeletons in sequence are a rhythm tell (Geoff, 2026-07-02).** "X
  because [three benefits]. Y because [three benefits]. Z because [three benefits]." is a drum
  machine no human writes. When explaining several choices, the judgments must differ in
  length, confidence, and construction (one gets a short verdict and a long defense, one gets
  a subordinate clause, one barely counts as a choice). Announcement sentences ("The stack
  picks have reasons you can check.") are the same defect: a meta-line doing setup instead of
  saying the first real thing.

- **Imitation-first drafting, and the cadence catalogue (Geoff, 2026-07-02).** Drafting
  rule-filters its own cadence poorly; the reliable process is holding a specific exemplar in
  ear while writing (Willison's "sqlite-utils is my combined Python library and CLI tool...",
  antirez's narration), then checking against the named cadence patterns: the
  fragment-plus-balanced-pair opener, the staccato-then-elaboration metronome, balanced
  two-beat closures ("code in your app, and files in your repo"), echo pairs ("small enough
  to..., and small enough that..."), every paragraph ending on its strongest line, uniform
  information density. Counter-moves: plain long spec sentences that just inform, uneven
  lengths, flat endings, asymmetric constructions, stopping before the "strong" close. Every
  prose review checks the named patterns explicitly.

- **The local exemplar shelf (Geoff, 2026-07-02).** Full texts of choice developer-blog posts
  matching the register live at `~/.claude/docs/register-exemplars/cairn/` (machine-local,
  outside the repo since the repo goes public). Imitation-first drafting reads one before
  writing; prose reviews may quote them. Transient: toss the shelf once the voice is settled
  across the docs.

- **Restated and filler content is a named AI failure (Geoff, 2026-07-02).** The signatures:
  trailing evaluative tails that editorialize what the sentence already said ("which is how
  leaving a CMS should work"), summary-tie sentences that add no fact ("The docs index ties
  them together"), echo phrases recycled across pages ("why they are the way they are"), and
  re-explaining a thing the reader was just told. The test per sentence: does it add a fact
  or a judgment not already present? If not, cut it. Applies doubly when folding a human's
  edits — the human's cuts are load-bearing; do not pad around them.

- **Soft returns (Geoff, 2026-07-02):** docs prose uses one line per paragraph, no hard wraps,
  so human editing never fights rewrapping. List items are single lines too. Applies to every
  page this pass writes.

- **Isn't-for amendment (Geoff, 2026-07-02):** the README's disqualification can stay implicit
  when the constraints are woven through the prose (the fixed stack, "limits your choice of
  tools"); the flat argued version lives in why-cairn. The register law's intro-disqualification
  requirement is satisfied that way for the README specifically.

- **Openings are the highest-risk surface (Geoff, 2026-07-02, after two failed why-cairn
  openings).** Asked to write an "opening," the drafting default produces crafted-symmetric-
  punchy rhetoric, and regenerating it swaps furniture while keeping the shape (echo pairs,
  setup colons, parallel personas, punchline cappers). When an opening fails the register
  twice, do not generate a third: delete it. One flat orientation line, then the first real
  section. Explanation pages need no essay intro; the human polish adds voice where it wants.

## The drafting protocol (Geoff, 2026-07-02: "how do we keep initial drafts from missing?")

The root cause of missed drafts: generation-then-filtering. Rules filter words; the register
lives in shape. The protocol, binding on every voice-bearing page:

1. Fragments first: collect Geoff's raw material (chat quotes, his polished corpus, his
   edits) before drafting; where a topic has none, ask for a two-minute rough dump BEFORE
   drafting, never after failing.
2. Exemplar in ear, mechanically: reread 200 words of a shelf post immediately before
   writing.
3. Body first; openings are one flat line unless Geoff's words provide one.
4. One page, one verdict, then the next; each polished page joins the local exemplar shelf
   (Geoff's polished README and why-cairn outrank the external posts as exemplars).
5. The adversarial review pair (register + claims) runs before Geoff reads, not after.
6. A surface that fails the register twice gets deleted, not regenerated.

Structured genres (reference, guides, tutorial) carry lower register risk; their drafts miss
on details the gates catch, and they proceed at normal dispatch cadence.

- **Sections open with actual sentences (Geoff, 2026-07-02).** No verbless fragment openers
  ("A fixed set of content concepts you declare..."); the first line under any header is a
  complete sentence with a subject, usually naming cairn or the reader.

- **Virtue-claim intensifiers are a tell (Geoff, 2026-07-02).** "A real answer," "the honest
  truth," "a fair question," "to be clear," "frankly": each claims a virtue (candor, fairness,
  rigor) instead of demonstrating it, the same move as AI's reflexive "honest." Delete the
  claim; the demonstration is the following sentences or it's nothing. ("Real" survives only
  as a literal: "the preview is the real site.")

- **Draft in conversation mode (Geoff, 2026-07-02, from "why is chat fine but docs sloppy?").**
  Composition mode summons the learned Good Writing template, which is the slop; reactive
  chat prose doesn't. Technique: draft a section as a chat answer to Geoff ("so here's the
  deal with markdown..."), then formalize only the surface, never the sentence bones. The
  audience is Geoff-the-specific-person, not "developers"-the-category.

- **Cairn isn't a product. It's code. There is NO product here. (Geoff, 2026-07-02/03, the
  frame rule.)** Marketing prose about cairn isn't off-register, it's FALSE: it asserts a
  product, a customer, and a sale, none of which exist. It fails the empirical gate before it
  reaches the style rules. The marketing
  attractor is summoned by conceiving of the subject as a product; the escape is the frame
  itself. Every page is a developer explaining code he wrote: what it does, why it's shaped
  that way, what it costs to use. Nobody markets a function. If a draft sentence would fit on
  a landing page, the frame has already slipped. And it's an open-source project: the reader
  is a peer who might use, read, or patch the code, never a customer. The register tradition
  is the maintainer README (ripgrep, sqlite-utils, re-frame), which never sells because there
  is nothing to sell.

- **The noir overcorrection (Geoff, 2026-07-02: "a robot that reads too many spy thrillers").**
  Over-applying the singleton-punch rule produces clipped dramatic declaratives at a density
  the measured corpus never shows. Geoff's baseline is unhurried: long, even-keeled compound
  sentences with parenthetical caveats, reporting even problems without alarm. A punch lands
  about once per section, not once per paragraph, and the verbs stay mild.

- **The audience is a philosophy major who can program: deeply intelligent, and hates
  shortform video (Geoff, 2026-07-02/03).** Don't fear a complex sentence: both failure modes
  (marketing and noir) were too staccato, and the reader despises soundbite compression.
  Subordinate clauses, developed distinctions, and periodic sentences are welcome where the
  thought carries them; arguments may build across a paragraph and trust the reader to hold a
  premise from three sentences back. And the intelligence must be in the IDEAS, not only the
  syntax: distinctions that clarify ("markdown separates two decisions WYSIWYG collapses into
  one"), reasons that actually explain, no simplification that costs truth. Geoff's own
  default is a 25-40 word compound sentence; simplicity is for facts, complexity for
  arguments. And the reader is fully SvelteKit literate: never gloss a framework concept
  (form actions, hydration, `locals`, adapters); speak in them, precisely.

- **The Russell pass is MANDATORY and aggressive (Geoff, 2026-07-03: "the aggressive logical
  review is important").** Every draft gets it before Geoff reads, and it ranks with the slop
  gate, not below it: non-sequiturs, equivocation (the same word doing positive work in one
  section and negative in another), universal claims that overstate, arguments with a missing
  middle step, and contradictions across the page (the git-exposure repair is the type
  specimen: two sections arguing incompatible critiques of the same tools). Challenge
  stupidity; nothing logically broken passes because it sounds good, including Geoff's own
  lines — flag those rather than silently keeping them. And the principle is constructive,
  not only critical (Geoff, 2026-07-03: "logical argument and structure is a foundation for
  all cairn writing"): pages are STRUCTURED as arguments, premises before conclusions,
  dependencies ordered (the stack chain — Cloudflare premise, JS/TS constraint, SvelteKit,
  DaisyUI — is the type specimen), and a counterfactual that proves a constraint real ("I'd
  write cairn in Python or Go if I could") beats an assertion that it is.

- **The three-gate stack applies to ALL writing (Geoff, 2026-07-03).** Register (the slop
  catalogue and Vale gate), logic (the aggressive Russell pass), and the EMPIRICAL check,
  which runs in both directions (Geoff, 2026-07-03: "statements need to conform to facts and
  be supported by them"): no statement may contradict a checkable fact, AND every substantive
  statement must trace to positive support — code, a measurement, a documented behavior, or
  Geoff's testimony. Merely unfalsified is not enough; an unsupported statement gets evidence
  or gets cut. And the check includes FRAME-level truth (Geoff, 2026-07-03: "cairn
  deliberately isn't [a hosted platform]" was patently false because free code never had a
  hosted business to decline): a sentence can be false by presupposition while every checkable
  detail in it is fine. The fact-check asks what each sentence presupposes, not only what it
  asserts. The README claims-audit is the model (it caught the auth-seam overstatement,
  the wrong component roster, and the misleading still-builds claim). A page is not
  review-ready until it has survived all three.

- **Invented concrete scenarios are a tell (Geoff, 2026-07-03: "an editor on hotel Wi-Fi
  still gets a working tool").** AI dramatizes technical facts by conjuring a specific little
  person in a specific little place. For a literate reader, the technical fact carries
  itself; a scenario earns its place only when it's real (the club's actual volunteers, an
  actual support case), never manufactured for vividness.

- **Tools don't lie (Geoff, 2026-07-03).** No anthropomorphized accusations: editors don't
  "lie," frameworks don't "fight you," platforms don't "betray." The drama stands in for the
  mechanism, and the mechanism is always the stronger sentence ("the editor renders one
  thing, the site renders another").

- **Aphoristic equations are silly (Geoff, 2026-07-03: "The stack is the product").** The
  "X is the Y" slogan shape asserts a profundity it doesn't earn; the sentence behind it is
  always a plain fact ("cairn is built directly on Cloudflare's primitives"), and the fact is
  the better sentence.

- **The editor audience, recalibrated (Geoff, 2026-07-03).** Imagine a philosophy or English
  major WITHOUT a strong technical background: comfortable in Word or Google Docs, unafraid
  of complex reasoning, and caring about logical rigor and grounded, mainstream evidence. The
  Kirby vocabulary test survives unchanged (no stack words; Word/Docs is the reference
  experience), but the reasoning ceiling lifts: editor pages may explain WHY the tool works
  as it does, in plain words, and may carry complex sentences where the thought does. Do not
  write down to this reader; warmth stays as consequence-facts, and reassurance is earned by
  explanation, not repetition. The standard is a professional academic introduction
  throughout (Geoff, 2026-07-03: "college-educated, not high school children") — concepts get
  their real names, origins, and design principles; folksy softeners ("a little goes a long
  way," "swear by," "gets tangled," "no password to forget") are down-writing residue and a
  tell. So is the consumer-help POSTURE itself (Geoff, 2026-07-03: "reads like software
  documentation trying to be easy on the general population"): micro-instructed actions
  ("type your email address," "clicking it"), hand-holding reassurance ("you never have
  to..."), and anonymous circumlocutions ("the person who runs your site"). The professional
  posture is declarative system-description that trusts the reader to act; imperatives are
  for genuine instructions, not babysitting. The nervous-manager framing is retired as the default (it
  survives only for genuinely fear-adjacent moments like first sign-in). And this reader is
  strongly turned off by marketing slop, exactly like Geoff — the anti-slop law is
  audience-universal, not a developer-register rule. The editor frame (Geoff, 2026-07-03,
  verbatim): "For them, cairn isn't a product. It's simply a tool that helps them get an
  important job done." Editor pages are about the READER'S JOB — the writing, the site, the
  organization's work — with cairn instrumental and receding. A page that centers the tool
  instead of the work has the frame backwards.

- **Length calibration (Geoff, 2026-07-03):** the editor front-door runs a bit longer than
  the developer front-door. The editor reader gets markdown introduced with examples and
  grounding, the insert-menu blocks explained, and tidy framed (a tool for humans writing
  prose; proposes, never drafts, never takes a voice) — orientation the developer README
  delegates to the docs tree instead.

## The legacy corpus is destroyed as a source (Geoff, 2026-07-03: "destroy all the old docs
and memory thereof; they're polluting the system")

The tidy-button error came from quoting a legacy page as fact. In force immediately: the
`opus-docs-anti-exemplar` branch is deleted; every not-yet-rewritten doc page carries a
LEGACY TEXT banner and is never cited, quoted, or fact-checked against by anyone (main loop
or agent); the Stage 1 corpus grades are void for all purposes; facts come from `src/` and
the four ratified pages only. Every rewrite task DELETES its target page first and writes
from zero — no editing legacy text. The banners die with the pages they mark.

- **Two leannesses, only one of them a virtue (Geoff, 2026-07-03: "I may have pushed too hard
  on making the docs lean").** Lean INVENTORY stands: few pages, no cargo-cult files, scope
  discipline. Lean PROSE is retired as a goal: a page runs as deep as its subject deserves,
  and the sentiment research always said completeness and self-sufficiency are what readers
  love. Compression targets redundancy and filler, never depth. The restatement rule guards
  against bloat; the reading-time floors guard against over-compression.

- **The writer-relevance test (Geoff, 2026-07-03, fired twice on editor-welcome).** Every fact
  on an editor page must matter to the writer at work. Ownership, storage formats, databases,
  portability, and vendor questions are organization and developer concerns; they live on
  those surfaces. What survives the test on editor pages: the work is safe, earlier wording
  is recoverable, nothing breaks, the tool respects the writing.
