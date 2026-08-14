# Pre-brainstorm brief: docs and help on-site with TOCs (the Topo start)

Prepared 2026-07-18 at the docs-register sweep's close, from four parallel source reads
(cairn-pub's own docs, the published docs tree's shape, the chassis contract, and the
engine's delivery surface). This is working material for the initiative's opening
brainstorm with Geoff, not a design. Verify the facts' baselines at pass start.

## What is already ruled (binding, from the recorded rulings)

- The initiative (cairn-pub STATUS, queued 2026-07-18, verbatim): "Docs and help material
  rendered on-site with TOCs — the Phase-2 rendering pipeline (one markdown pipeline
  serving /docs and /help), likely the moment to start the Topo theme so its elements
  (sidebar, TOC, prev/next) serve here. Brainstorm-first."
- Binding names: Waymark is the template, "the cairn theme" is the identity layer, Topo is
  the docs shell. Topo's design brief (2026-07-06): Starlight's ANATOMY (sidebar-from-tree,
  Pagefind, prev/next, TOC) wearing a WAYMARK IDENTITY; an "anatomy port," not
  glance-indistinguishable. Best-of-breed bar: an inspiration review of 1 or 2 more docs
  systems (VitePress, Fumadocs, Mintlify as polish reference) before build; mockup
  candidates go to Geoff first.
- Docs sourced at build are pinned to the RELEASE TAG (Geoff, 2026-07-04); the sourcing
  mechanism is undesigned.
- The five-viewport bar (320/390/768/1440/2560, composed at the extremes) applies to Topo.
- Two project sites stay separate by ruling: cairn.pub on Waymark, docs.cairn.pub on Topo,
  subdomain-joined with shared header cross-links (ROADMAP "A second template: Topo").
- The docs-register sweep shipped and released 2026-07-18 (v0.87.3), so the content Topo
  renders now conforms to the banked register standard.

## What exists today (load-bearing facts)

**cairn-pub side.** /docs and /help are committed Pages entries rendered by the stock
catch-all; /docs is a thin GitHub-link index, /help a full hand-adapted editor landing
with no TOC (Phase 1 shipped the landing only; guide sub-pages were explicitly deferred to
this Phase-2 pipeline). The nav's four doors are live. No dedicated /docs or /help route
code exists.

**The content's shape.** 61 published pages (18 reference, 30 guides, 10 explanation, 2
tutorial, plus the indexes). Discipline is high: exactly one H1 per page, H2/H3 structure
(H4 only in two big reference pages). 225 anchor-fragment links assume GitHub's slug
algorithm (backticks and punctuation stripped, lowercased), so the site's heading-id
generator must reproduce it or every existing anchor breaks; one duplicate-heading
collision exists as a test case (`build-your-first-cairn-site.md`'s two "How it went").
Link categories needing a routing decision: into `../../examples/`, into `../internal/`,
and to repo-root files (CHANGELOG, SECURITY, ROADMAP, README). `cairn:` and `media:`
pseudo-URIs appear as illustrative link syntax and must not be auto-linked or
health-checked as real. 389 code fences (ts/svelte/bash dominate; 8 mermaid diagrams need
a bundled renderer; zero raster images in the corpus). The guides index's
developer/editor grouping exists only in its prose, not the filesystem. Reference pages
carry stability tiers in two formats (inline line and table column).

**The chassis.** The showcase's `src/chassis/` is the canonical chassis with a
file-by-file README contract, `$chassis`/`$theme` aliases, and the boundary gate
(`check:chassis-boundary`, currently CI-dark). `composition.css` has no sidebar-tree or
TOC primitive today; Topo would add what documentation demands. The `chassis-template`
package export the tutorial names does not exist yet (the tutorial copies from the
showcase and says "update at release"). No Topo files exist anywhere.

**The engine's delivery surface.** `renderMarkdown` and `parseMarkdown` run on arbitrary
markdown strings, independent of concepts. Everything else is concept-keyed: the catch-all
loader resolves only indexed concept entries; concepts are flat directories (no recursive
glob, ids are filename stems), so a nested docs tree does not map onto a concept;
`sitemapView` offers only a bare `extraRoutes: string[]` escape hatch; `feedView` has
none; `unlistedRoutes` skips dynamic segments, so a docs catch-all gets no completeness
check. There is NO heading-extraction or TOC API anywhere in the package; `rehypeSlug`
stamps ids and `renderMarkdown` returns a final HTML string, so TOC capture today means a
custom rehype plugin through `RendererOptions.rehypePlugins` with a closure.

## The decision list for the brainstorm

**Scope and sequence.**
1. Is this pass Topo's true start (theme scaffold + anatomy) or a minimal shared
   markdown pipeline for /docs and /help first, with Topo's full anatomy later? STATUS
   says "likely," not decided. Related: does the inspiration review (the ruled
   best-of-breed bar) open this pass?
2. One site or two: the ruling says docs.cairn.pub on Topo as a separate site; does this
   pass build toward that directly, or land the pipeline on cairn.pub first and migrate?

**Content sourcing.**
3. The mechanism for "docs sourced at build pinned to the release tag": build-time fetch,
   submodule, or a sync script committing snapshots. Each has different staleness and
   deploy-trigger behavior on a repo whose deploys are currently manual.
4. Does /help source from the same pipeline (the editor guides rendered with TOCs), and
   does the hand-adapted /help landing stay hand-adapted?

**Engine surface (each is new public surface; the leanness premise check applies).**
5. TOC/heading extraction: engine helper (both Waymark content and Topo want it) or
   site-side rehype plugin? The premise check cuts both ways: two consumers argue for the
   engine; the seam could also be "renderMarkdown exposes the hast" rather than a TOC API.
6. A tree-walking route/sitemap helper for non-concept markdown trees, or squarely
   site/Topo-side code?
7. The slug algorithm: adopt GitHub's exactly (compatibility with 225 anchors) and where
   that lives (engine rehypeSlug config vs site).

**Site mechanics.**
8. Out-of-tree link policy: rewrite to GitHub URLs, strip, or redirect per category
   (examples/, internal/, repo-root files).
9. Mermaid, syntax-highlight language set (Shiki already in the family), stability-tier
   badges (parse both formats or render as prose), and the guides developer/editor
   grouping's source of truth.

**Adjacent items to settle or explicitly defer.**
10. cairn-pub's committed /docs and /help pages still carry killed register specimens
    ("the four arms", "writing room"); the sweep fixed the cairn-cms tree only. A
    site-side register pass rides this initiative naturally (the pages are being rebuilt
    anyway); confirm.
11. The /help engine deep-link (a default `editor.supportContact` pointing at
    cairn.pub/help) is an unshipped ROADMAP candidate the help content already assumes;
    in or out of this pass?
12. Confirm ROADMAP's "frozen-contract docs rewrite" precondition is satisfied by the
    register sweep (STATUS treats it as such), and verify the chassis-restructure
    precondition state at pass start.

## Suggested brainstorm order

Decisions 1 and 2 shape everything (they decide whether this is a cairn-pub site pass, a
cairn-cms engine-plus-theme pass, or both in sequence). Then 3, then the engine-surface
trio (5-7) as one premise-check conversation, then the mechanics batch (8-9), then the
adjacencies (10-12) as quick calls.
