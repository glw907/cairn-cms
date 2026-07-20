# Principle pages and LLM ingestion

**Status: APPROVED 2026-07-20 (Geoff). Written 2026-07-19 at the close of the cairn.pub
design arc (cairn-pub Passes 2 through 4). Ready to execute in a fresh session.**

**Decisions locked at approval (Geoff, 2026-07-20):**
- The extended-admin figure is a **staged demo admin**, not the real ASC capture. Build a
  small demo admin wearing a fictional organization's identity (custom screens beside the
  content screens, one nav, one sign-in), and capture that. This keeps the never-name-ASC
  ruling intact with no redaction of a real capture. The staged demo's build is a plan task
  (see the figure section); it exercises the same extending-developer seams the page
  describes, so the figure is honest.
- Sequencing: **this pass first, Topo second** (token-efficiency call, reasoning in STATUS).

Two dimensions, one pass. First: a purpose-built explanation page for each of the five core
design principles, landed as first-class citizens of the docs. Second: cairn's docs made
fully ingestable by an LLM, following current published practice.

## The standalone test (Geoff's ruling, binding)

Each principle page must be a page the explanation arm would keep if the front page did not
exist. No page may justify itself by reference to the front-page ledger, and none is an
add-on: each earns its slot in the explanation README on its own terms. The front page
merely happens to link them (the existing micro-ctas retarget at the end of the pass).

## Dimension 1: the five principle pages

The principles integrate into the docs as first-class content that flows with and
complements what exists (Geoff, 2026-07-19). They do NOT all have to sit in the same
relative position, a principle page may absorb content from other pages or supplant a page
outright, and adding them can trigger reorganizing the documentation where that produces
the better tree. The unit of design is the docs as a whole, not five insertions.

**The disposition survey (the pass's first deliverable):** for each principle, map the
existing coverage across the arms, then commit a disposition: a new page (and where it
lands), a merge that absorbs or supplants an existing page (named, with every inbound link
retargeted), or a placement outside the expected arm where the reader's path argues for
it. The survey also proposes any broader reorganization the additions justify. It is a
committed recommendation with reasoning per principle, not an option menu; slugs and
titles fall out of it rather than being fixed here.

**Content charter, per page:** the claim; the mechanics that make it true (linking the
reference pages for exact APIs); the reasoning and the trade-offs, including what cairn
gives up by choosing this way; and the honest limits. Where a specialized page survives
beside a principle page, depth is linked into, never forked. `why-cairn` stays intact as
the narrative opener unless the survey makes a stronger case Geoff accepts.

**Supplanting and reorganization rules:** a supplanted or renamed page's content is
absorbed, its index entries move in the same change (`check:arm-indexes` and `check:docs`
prove closure), and every in-tree inbound link retargets. cairn.pub has no redirect layer
for docs URLs today, so any URL a reorganization retires must either gain a redirect
mechanism in the site's docs route (small, worth building if the survey retires more than
a page or two) or be accepted as a break while the docs are pre-1.0; the survey names
which, per retired URL.

**Authoring:** the pages are register-bearing user-facing prose, so the main loop drafts
them (never an implementer), and each page clears the full machinery before it lands: Vale
(Google package plus the Cairn slop styles), the adversarial register edit, the Opus
fact-check against the engine source, and the linking audit. The docs-register standard
(`docs/internal/docs-register.md`) governs; documentation must read like documentation.

**Integration (mechanical, implementer):** each page indexed in the explanation README
(the `check:arm-indexes` gate proves it), cross-linked from `why-cairn` and from the
sibling pages where a reader would actually jump, and present in the docs nav tree
cairn.pub renders.

**The extended-admin figure (Geoff, 2026-07-20: STAGED DEMO):** the one-sign-in page (and
possibly the extension-idiom page) carries a snapshot of a staged demo admin, showing what
an extended admin looks like for an organization that builds one: custom screens beside the
content screens, one nav, one sign-in. Execution:

- **Build the demo admin (plan task):** a small admin under a fictional organization's
  identity, adding one or two custom screens (a sign-up list, a schedule) beside the
  content screens through the real extending-developer seams (`CairnAdminShell`, `adminNav`,
  `locals.editor`). Building it on the actual seams keeps the figure honest and doubles as a
  live exercise of the surface the page describes. The showcase or a throwaway consumer is
  the likely host; pick at execution.
- **Capture:** the docs' standard figure widths, light and dark if the shell supports both.
- **Pipeline:** confirm the docs tree carries images through the npm tarball and the
  cairn.pub docs renderer (the arms are markdown; verify image support end to end before
  drafting the page around the figure, and fall back to hosting the figure as cairn.pub
  site media if the tarball path is not supported).

## Dimension 2: LLM ingestion

Grounded in current published practice (llmstxt.org spec; the Mintlify examples survey;
the 2026 best-practice guides), verified live at execution time:

- **`/llms.txt` on cairn.pub:** the spec's index form: an H1, a factual blockquote summary
  in the register the site already speaks, sections mirroring the real navigation (the
  four arms plus Help), each entry linking the markdown endpoint, and a last-reviewed
  date. Generated at build time from the same docs corpus the site's loader already
  holds, so it cannot drift from the rendered nav.
- **`/llms-full.txt`:** the full docs corpus concatenated as one markdown file, generated
  at build. Acceptance: measured under 200K tokens (measure and record the actual count;
  the corpus is expected to sit far under).
- **Per-page markdown endpoints:** every docs and help page serves its raw markdown at a
  `.md`-suffixed URL beside its HTML route, from the same corpus. HTML pages advertise
  the alternate (a `link` alternate or equivalent) so agents can discover it.
- **Crawler policy:** the docs are public open-source documentation; robots stays
  permissive for AI crawlers. No auth walls on any docs path (already true).
- **Human-facing surfacing (ruled 2026-07-19): not on the front page.** The front page
  states what cairn is; machine ingestion is a property of the documentation. Two quiet
  placements instead, both carrying real links to the text docs: one factual line on the
  /docs landing under the doors linking `/llms.txt` and `/llms-full.txt` and naming the
  per-page markdown source (each docs page advertises its own), and an `llms.txt` link in
  the site footer beside Feed and GitHub, the RSS-discovery convention. A fuller
  human-facing telling, if ever wanted, is a blog post, not front-page copy.
- **Out of scope, noted for harvest:** generalizing llms.txt generation into the engine or
  Waymark so consumer sites get it for their own content. File in ROADMAP if the pass
  proves the mechanism cleanly.

## Sequencing and release

1. T0: the disposition survey (main loop): per-principle dispositions, the reorganization
   proposal, the retired-URL list with its redirect-or-break call. Rides in the pass
   record; execution follows it.
2. T1a through T1e: draft the five pages (main loop), each through the full register
   machinery; land per the survey's dispositions with each arm index updated in the same
   change, absorbed pages retired in the same change.
3. T2 (implementer, cairn-cms): cross-links, nav, any redirect mechanism the survey called
   for, `check:docs` and `check:arm-indexes` green, full repo gate.
4. T3 (implementer, cairn-pub): the three ingestion surfaces (`/llms.txt`,
   `/llms-full.txt`, per-page markdown endpoints) generated from the docs corpus, with
   tests asserting presence, shape, and the token ceiling.
5. T4 (implementer, cairn-pub): retarget the five front-page micro-ctas per the survey's
   final page map.
6. Verification: live fetch of every new endpoint, register spot-read of llms.txt's
   summary block, gates in both repos.
7. **Release:** the docs ship in the npm tarball and cairn.pub renders the docs from the
   installed package, so the reorganized docs reach the live site only through a publish.
   The pass therefore ends with a release cut (the `cairn-release` skill; the
   consumer-needs-it trigger is genuine). T3 and T4 land after the cairn-pub dependency
   bump.
8. Records: STATUS in both repos, the pass post-mortem beside this plan.

## Acceptance for the whole pass

- Five explanation pages live on cairn.pub, each passing the standalone test at review.
- The front page's micro-ctas point at them.
- `curl https://cairn.pub/llms.txt`, `/llms-full.txt`, and any `/docs/**.md` return valid
  markdown; the full file's token count is recorded and under the ceiling.
- Both repos' full gates green; the register machinery ran per page; no docs gate skipped.
