# The docs register

The agent-facing register standard for cairn's published documentation: the 62 pages under
`docs/{reference,guides,explanation,tutorial}` plus `docs/README.md`, and the root
`README.md`. Read it before writing or reviewing any published docs prose. It was ratified
by Geoff on 2026-07-18 (spec:
`docs/superpowers/specs/2026-07-18-docs-register-standard-design.md`); the specimen history
lives in the `cairn-pub-front-page-voice` memory. The Google Developer Documentation Style
Guide remains the Vale-enforced floor; this standard sits on top of it and governs register,
the thing Vale cannot grade.

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
- Jargon is checked against the page's actual reader. Developer pages say "admin", "route",
  and "frontmatter" freely; editor-facing guides speak the editor's vocabulary.
- Product terms are the precise vocabulary, not jargon to remove: concept, adapter, render,
  seam, island, holding branch, manifest, role/capability. They name real system objects.

## The four arm registers

- **Reference** (`docs/reference/`): dry contract prose, third person. States behavior,
  parameters, defaults, and failure modes. No narrative, no persuasion, no scene-setting.
- **Guides** (`docs/guides/`): imperative second-person task prose. Steps first; explanation
  only where it prevents a mistake. Developer guides and editor guides differ in vocabulary
  (see the jargon rule), not in shape.
- **Tutorial** (`docs/tutorial/`): teacher voice, second person, walking alongside the
  reader. States what just happened and what comes next; enthusiasm only as plain statements
  of what now works.
- **Explanation** (`docs/explanation/`): the why-cairn register. Discursive, concrete,
  unhurried. First person where the author's experience is the evidence. Arguments made
  honestly, trade-offs stated, including the reasons not to use cairn.

## The front door (`docs/README.md` and the root `README.md`)

The fifth register case. These two pages are where every audience lands, and they carry the
whole cairn story.

- **Primary persona: the seasoned developer serving an organization.** Most readers are
  developers, and jargon-stripped prose would cost the tool their respect. The full story is
  complex and nuanced, and lands completely only with this reader; write to them and do not
  flatten the story.
- **Legibility floor:** an intelligent, technically savvy editor can still get the gist.
  Technical terms appear where they carry information (SvelteKit, git-backed, markdown, npm
  dependency), with context or a short apposition doing the glossing rather than avoidance.
- **The editor's arrival path is a requirement.** An editor who lands here must find
  [Welcome, editors](../guides/editor-welcome.md) without hunting, and must walk away with a
  general understanding of what cairn is even where the specifics pass them by. The "If you
  write for a site built on cairn" routing line stays prominent and early.
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
  Cloudflare is in-register here, in short form; the full argument stays in
  [Why cairn](../explanation/why-cairn.md).

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

- Cite the rule a finding violates and quote the offending text; propose a rewrite in the
  page's arm register.
- Over-firing is a defect equal to missing. Prose that is plain, true, and in-register is
  done; do not churn it, and do not rewrite for rewriting's sake. A finding whose rewrite
  merely paraphrases is not a finding.
- The keystone cuts both ways: flag marketing register, and also flag prose so flat or
  perfunctory that it fails the quality-of-thought bar.
