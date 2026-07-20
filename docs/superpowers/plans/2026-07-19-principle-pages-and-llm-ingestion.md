# Principle pages and LLM ingestion

**Status: PLANNED, awaiting Geoff's approval. Written 2026-07-19 at the close of the
cairn.pub design arc (cairn-pub Passes 2 through 4).**

Two dimensions, one pass. First: a purpose-built explanation page for each of the five core
design principles, landed as first-class citizens of the docs. Second: cairn's docs made
fully ingestable by an LLM, following current published practice.

## The standalone test (Geoff's ruling, binding)

Each principle page must be a page the explanation arm would keep if the front page did not
exist. No page may justify itself by reference to the front-page ledger, and none is an
add-on: each earns its slot in the explanation README on its own terms. The front page
merely happens to link them (the existing micro-ctas retarget at the end of the pass).

## Dimension 1: the five principle pages

New pages in `docs/explanation/`, one per principle. Proposed slugs and titles (approve or
amend at plan review):

| Slug | Title (the ratified claim) |
| ---- | -------------------------- |
| `writing-tool.md` | It's a writing tool, not a dashboard |
| `content-in-git.md` | The content lives in the organization's own repository |
| `nothing-to-run.md` | There is nothing to run or protect |
| `extension-idiom.md` | Developers extend it in its own idiom |
| `one-sign-in.md` | One sign-in covers everything the site does |

**Content charter, per page:** the claim; the mechanics that make it true (linking the
reference pages for exact APIs); the reasoning and the trade-offs, including what cairn
gives up by choosing this way; and the honest limits. Depth that already exists in the
specialized pages (security-model, data-tiers, media-storage, architecture,
editor-copyedit) is linked into, never forked; the principle page owns the principle's
narrative and curates the rest. `why-cairn` stays intact as the personal narrative opener
and gains a short pointer to the cluster; the principle pages are the structured
expansions, not its replacement.

**Authoring:** the pages are register-bearing user-facing prose, so the main loop drafts
them (never an implementer), and each page clears the full machinery before it lands: Vale
(Google package plus the Cairn slop styles), the adversarial register edit, the Opus
fact-check against the engine source, and the linking audit. The docs-register standard
(`docs/internal/docs-register.md`) governs; documentation must read like documentation.

**Integration (mechanical, implementer):** each page indexed in the explanation README
(the `check:arm-indexes` gate proves it), cross-linked from `why-cairn` and from the
sibling pages where a reader would actually jump, and present in the docs nav tree
cairn.pub renders.

**The extended-admin figure (Geoff, 2026-07-19):** the one-sign-in page (and possibly the
extension-idiom page) carries a real snapshot of the current ASC admin, showing what an
extended admin looks like for an organization that builds one: custom screens beside the
content screens, one nav, one sign-in. Three things to settle at execution:

- **Naming (GEOFF'S CALL at plan approval):** the standing docs-register ruling is that ASC
  is never named publicly, and the admin's own chrome shows the club's name. Options: use
  the snapshot as-is (reversing that ruling for this figure), redact or re-brand the
  identifying chrome in the capture, or stage an equivalent demo admin. The plan does not
  pick; the figure ships only under whichever rule Geoff sets.
- **Capture:** the ASC dev or staging admin sits behind Cloudflare Access (service token in
  the local secrets store; the admin-smoke session-row process). Capture at the docs'
  standard figure widths, light and dark if the shell supports both.
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
- **Out of scope, noted for harvest:** generalizing llms.txt generation into the engine or
  Waymark so consumer sites get it for their own content. File in ROADMAP if the pass
  proves the mechanism cleanly.

## Sequencing and release

1. T1a through T1e: draft the five pages (main loop), each through the full register
   machinery; land in `docs/explanation/` with the arm index updated per page.
2. T2 (implementer, cairn-cms): cross-links, nav, `check:docs` and `check:arm-indexes`
   green, full repo gate.
3. T3 (implementer, cairn-pub): the three ingestion surfaces (`/llms.txt`,
   `/llms-full.txt`, per-page markdown endpoints) generated from the docs corpus, with
   tests asserting presence, shape, and the token ceiling.
4. T4 (implementer, cairn-pub): retarget the five front-page micro-ctas to the new pages.
5. Verification: live fetch of every new endpoint, register spot-read of llms.txt's
   summary block, gates in both repos.
6. **Release:** the docs ship in the npm tarball and cairn.pub renders the docs from the
   installed package, so the five pages reach the live site only through a publish. The
   pass therefore ends with a release cut (the `cairn-release` skill; the consumer-needs-it
   trigger is genuine). T3 and T4 land after the cairn-pub dependency bump.
7. Records: STATUS in both repos, the pass post-mortem beside this plan.

## Acceptance for the whole pass

- Five explanation pages live on cairn.pub, each passing the standalone test at review.
- The front page's micro-ctas point at them.
- `curl https://cairn.pub/llms.txt`, `/llms-full.txt`, and any `/docs/**.md` return valid
  markdown; the full file's token count is recorded and under the ceiling.
- Both repos' full gates green; the register machinery ran per page; no docs gate skipped.
