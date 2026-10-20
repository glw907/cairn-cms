# The docs register standard and the docs-register sweep

**Date:** 2026-07-18
**Status:** Design approved in brainstorm (Geoff); this spec is the record.
**Origin:** Geoff's 2026-07-18 ruling after the cairn.pub launch: the docs must read like
documentation, not marketing. The evidence specimens and register history live in the
`cairn-pub-front-page-voice` memory; this spec turns them into a positive standard and a
verification pass.

## What this pass produces

1. A banked, agent-facing register standard at `docs/internal/docs-register.md`, referenced
   from the repo `CLAUDE.md` authoring section. It governs all future docs prose, and the
   sweep's graders take it as input.
2. `docs/README.md` fixed in the main loop first, as the third calibration exemplar (it holds
   every known-kill specimen).
3. A find-then-verify workflow sweep over the published docs, with triaged fixes applied and
   the doc gates green.

## The standard

### Universal contract (all arms)

The docs explain a system to someone trying to use it, and have no stake in whether the
reader adopts it. Nothing anywhere in the docs is a pitch, BUT the reader should come away
impressed by the quality of the thought and the professionalism of the prose (Geoff,
2026-07-18). The writing does the persuading by being excellent, never by selling. The
Google Developer Documentation Style Guide remains the Vale-enforced floor. On top of it:

- No marketing claims and no benefit-forward framing. Every factual claim is literally true.
- No coined metaphor in a definitional or structural position ("writing room", "the four
  arms").
- No prose about the docs' own writing ("Eight words the docs use precisely").
- No setup-colon triad cadence ("When something breaks: X diagnoses..., Y explains..., Z
  maps...").
- No em-dash rhythm. The sentence-final elaborative tail is the tell regardless of glyph;
  restructure into a second sentence rather than swapping punctuation.
- Jargon is checked against each page's actual reader. Developer pages say "admin" freely;
  editor-facing guides speak the editor's vocabulary.
- Product terms stay: concept, adapter, render, seam, island, holding branch, manifest,
  role/capability. They name real system objects and are the docs' precise vocabulary. The
  vocabulary list in the docs README survives under a plain heading.

### Per-arm registers (the Diátaxis frame)

- **Reference:** dry contract prose, third person. States behavior, parameters, and failure
  modes. No narrative.
- **Guides:** imperative second-person task prose. Steps first; why only where it prevents a
  mistake.
- **Tutorial:** teacher voice, second person, walking alongside the reader.
- **Explanation:** the why-cairn register. Discursive, concrete, unhurried; first person
  where the author's experience is the evidence; trade-offs stated honestly, including the
  reasons not to use cairn.

### The front door (`docs/README.md` and the root `README.md`)

A fifth register case, ruled by Geoff in this brainstorm:

- **Primary persona: the seasoned developer serving an organization.** The majority of front
  page readers are developers, and jargon-stripped prose would cost the tool their respect.
  The full cairn story is complex and nuanced, and lands completely only with this reader;
  the front page writes to them and does not flatten the story.
- **Legibility floor:** an intelligent, technically savvy editor can still get the gist.
  Technical terms appear where they carry information (SvelteKit, git-backed, markdown, npm
  dependency), with context or a short apposition doing the glossing rather than avoidance.
- **The editor's arrival path is a requirement, not a side effect.** An editor who lands on
  the front page must find the editor help page ([Welcome,
  editors](../../guides/editor-welcome.md)) without hunting, and must walk away with a
  general understanding of what cairn is even where the technical specifics pass them by.
  The existing "If you write for a site built on cairn" routing line stays prominent and
  early.
- **The content anchor** (Geoff, 2026-07-18, near verbatim): cairn is both a polished,
  editor-first, git-backed, Cloudflare-hosted CMS and a modern SvelteKit toolkit that a
  developer can extend to support their organization. It takes the position that content
  editors are often the very same people who drive an organization forward, and that by
  extending the CMS interface, a developer or development team can build a streamlined and
  productive tool for their organization. Part of that offer is concrete: cairn gives the
  developer a UI toolkit to extend, so admin additions come together quickly and share one
  coherent user experience with the rest of the admin. That unique combination of technical
  architecture, out-of-the-box features, and editor-first approach is the substance the page
  explains.
- **Concrete extension examples belong on the front page** (Geoff, 2026-07-18). The
  extensibility claim lands through examples of the kinds of things a developer could build
  on cairn's seams. Do NOT name or cite the ASC site itself; use the types of functionality
  a site like it carries (member signups, reservations, rosters, event and program
  management, and other member-facing tools), rounded out with other representative
  small-organization needs. Examples state what could be built, never a pitch.
- **Stack reasoning is welcome.** Explaining WHY cairn uses SvelteKit, DaisyUI, and
  Cloudflare is in-register for the front page (Geoff, 2026-07-18); reasoned choices are
  part of the story the seasoned developer evaluates. The front page carries the short form;
  the full argument stays in why-cairn's "Why the stack?".
- **The register never sells.** The page states the combination plainly and lets the reader
  decide, per the standing "nobody is trying to sell cairn" ruling. The ratified identity
  line ("both a finished CMS and an extensible toolkit") aligns with the charter opener's
  phrasing.

### Calibration specimens

The standard doc carries both poles so graders learn the line, not just the rules:

- **Killed:** "writing room" (docs opener, killed on challenge; ratification is fallible),
  "the four arms", "Eight words the docs use precisely", the when-something-breaks
  setup-colon triad, and "The whole organization works in one place" (marketing plus
  objectively false; teams are distributed).
- **Ratified-good:** the why-cairn opener ("Before cairn, every content change on the small
  sites I run ended up as my git commit"), Geoff-polished.
- **Third exemplar:** the fixed `docs/README.md` produced by this pass.

## Known fixes in `docs/README.md` (main loop, before the workflow)

- The charter opener keeps its paragraph; the "whole organization works in one place,
  content and custom functions sharing one admin and one sign-in" sentence is rewritten to
  be true and unpuffed. Under the front-door register it need not shed "admin"; the rewrite
  goes through Geoff's read gate.
- "The four arms" becomes a plain heading.
- The "Eight words the docs use precisely" line is cut; the vocabulary list survives.
- The closing triad is restructured into plain prose.

## The sweep

**Scope:** the 62 published docs pages (`reference/`, `guides/`, `explanation/`,
`tutorial/`, plus the docs README) plus the root `README.md`. Out of scope: `ROADMAP.md`,
`CHANGELOG.md`, `SECURITY.md`, everything under `docs/internal/` and `docs/superpowers/`.

**Shape** (workflow; Geoff's standing authorization, runaway guard armed at launch):

1. **Grade:** one grader per page (Sonnet, high effort), fed the page, its arm's register,
   and the calibration specimens. Returns findings with quoted evidence, the violated rule,
   and a proposed rewrite each.
2. **Verify:** each finding gets a refute-biased adversarial verify (Opus, for model
   diversity) against the ratified standard. Over-firing on ratified good prose is a defect;
   the verifier's default is refuted.
3. **Recall spot-check:** an Opus pass over ~8 pages sampled across all four arms, compared
   against the Sonnet graders' findings on the same pages. If it surfaces misses, graders
   upshift to Opus and rerun.
4. **Triage and apply:** the main loop triages survivors, approves or amends rewrites, and
   dispatches the mechanical application per page to `cairn-implementer`.

## Gates and close

- Docs-only pass: skip engine tests; run `check:docs`, `check:reference`,
  `check:reference:signatures`, `check:package`, and Vale over the changed arms.
- Geoff's read gate, one sitting: the `docs/README.md` and root `README.md` diffs in full,
  plus a before/after digest of the highest-impact rewrites elsewhere.
- Changelog entry under `## Unreleased` (docs-only; no consumer action).
- Post-mortem on the plan file; STATUS points at docs-on-site/Topo next.

## Follow-ups filed, not done here

- Point the user-scoped `cairn-register-editor` agent at the banked standard doc instead of
  its inlined contract (one-line follow-up; user-scoped agents don't change mid-pass).
- The sweep's output feeds the docs-on-site/Topo initiative, which renders these same pages
  on cairn.pub.
