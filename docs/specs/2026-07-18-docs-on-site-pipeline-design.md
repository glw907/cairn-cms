# Docs and help on-site with TOCs: the shared pipeline (design)

Ratified 2026-07-18 in the pass-opening brainstorm (Geoff frontloaded the full decision
slate; the two forks below carry his explicit picks). Source material: the pre-brainstorm
brief at `docs/internal/2026-07-18-docs-on-site-topo-brief.md`, whose facts this spec
builds on. This pass runs autonomously through release and next-pass prep on Geoff's
standing authorization from the same conversation.

## Scope (fork 1, Geoff's pick)

This pass ships the shared markdown pipeline on cairn.pub: /docs and /help render the
published docs tree on-site with TOCs, in the site's existing chrome. It is NOT Topo's
anatomy build. The pass closes with the ruled inspiration review (VitePress, Fumadocs,
Mintlify as polish reference) plus Topo mockup candidates, delivered as next-pass prep
for Geoff's async review. Full Topo (sidebar-from-tree, Pagefind, the docs.cairn.pub
split) is the next pass, opening on his mockup picks.

Two sites stays the ruling: everything this pass builds lands portable (engine surface
plus site code shaped for extraction), so the later docs.cairn.pub/Topo move is a
migration, not a rebuild.

## Content sourcing (fork 2, Geoff's pick: in-package)

The docs tree ships inside the npm package. `package.json` `files` gains the four
published arms plus the docs index (`docs/reference`, `docs/guides`, `docs/explanation`,
`docs/tutorial`, `docs/README.md`); internal and superpowers trees stay out of the
tarball. The docs remain single-sourced in this repo; the tarball copy is a built
artifact like `dist/`. cairn-pub reads the tree from `node_modules/@glw907/cairn-cms/docs`
at build time and commits no snapshots. Pinning to the release tag falls out of the
installed version; builds stay deterministic and offline.

## Engine surface (the leanness rulings)

- **Heading collection on the existing renderer.** `RendererOptions` and the
  `renderMarkdown` result grow a heading list: each rendered page can return
  `headings: { id, text, depth }[]` alongside the HTML, captured after `rehypeSlug`
  stamps ids. No new subsystem, no hast exposure; one option on the surface that already
  exists. Documented in reference (`check:reference` holds), covered by unit tests
  including the duplicate-heading case.
- **Slug compatibility is verified, not assumed.** `rehype-slug` already uses
  github-slugger, which is GitHub's algorithm. A test locks the contract: representative
  headings from the corpus (backticks, punctuation, casing) plus the known duplicate
  ("How it went" twice in the tutorial) must produce GitHub's slugs. The 225 existing
  anchors ride on this.
- **`editor.supportContact` default.** The unshipped ROADMAP candidate ships: the admin's
  support contact defaults to `https://cairn.pub/help`, overridable per site as today.
  One config default; the help content already assumes it.
- **Nothing else enters the engine.** Tree walking, routing, sidebar derivation, link
  rewriting, and mermaid stay site-side. Concepts stay flat.

## Site mechanics (cairn-pub)

- **Routes.** A `/docs/[...path]` route serves the four arms; `/help` keeps its
  hand-adapted landing and gains the editor guides rendered through the same pipeline
  under `/help/…`. Pages are prerendered at build (the Worker never reads the filesystem);
  the content enters through a build-time loader over the installed package's docs tree.
- **Page furniture.** Each page gets a TOC rail from the renderer's heading list, a
  breadcrumb to its arm index, and prev/next derived from the arm index's link order,
  which is also the sidebar/grouping source of truth (the guides developer/editor
  grouping lives in the guides index's prose order, per the ruling).
- **Links.** In-tree doc links rewrite to site routes with anchors preserved. Out-of-tree
  links (examples/, internal/, repo-root files) rewrite to GitHub blob URLs pinned at the
  installed version's tag. `cairn:`/`media:` pseudo-URI mentions are never auto-linked or
  health-checked.
- **Code and diagrams.** Highlighting is already engine-side (`rehypeCairnHighlight`,
  build-only Shiki). Mermaid renders client-side, lazy-loaded only on pages whose content
  carries a mermaid fence (8 pages today). Stability tiers render as the prose and tables
  they already are; no badge parser this pass.
- **Register.** The committed /docs and /help pages carry killed register specimens; the
  rebuilt pages get a site-side register pass in the same stroke.
- **The bar.** The five-viewport matrix (320/390/768/1440/2560, composed at the extremes)
  applies; deploy rides the one-check rule (full-page render read in the main loop).

## Release and sequence

Engine work lands first and publishes as a minor (new public surface: the heading option,
the docs-in-tarball, the supportContact default) — the number verified free at the cut.
cairn-pub then bumps its range, builds against the published version, and deploys. This
ordering is required: the site imports surface that must exist on the registry first.

Pass close: inspiration review + Topo mockup candidates banked as the next-pass brief;
STATUS, ROADMAP (the shipped supportContact candidate comes off), CHANGELOG, reference
docs, and the template-effort memory updated; the deploy-token zone-scope wrinkle (the
cairn.pub zone Workers-route write, found during the 2026-07-18 redeploy) recorded as a
follow-up.

## Error handling and testing

- Engine: unit tests for heading collection (shape, nesting depths, duplicate ids) and
  the GitHub-slug contract; `check:reference`, `check:package`, full gate.
- Site: a build-time link check over the rendered tree (every in-tree href resolves to a
  generated route; every anchor matches a collected heading id), which doubles as the
  225-anchor compatibility proof; the viewport matrix on representative pages (one per
  arm, the longest reference page, a mermaid page).
- Failure posture: a doc page that fails to render fails the build (prerender), never a
  runtime 500.
