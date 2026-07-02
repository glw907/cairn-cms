# Docs rewrite: design

Approved by Geoff 2026-07-01 (combined brainstorm with the code polish pass). Geoff's framing,
which governs: a from-scratch rewrite, grounded in research of what a tool like cairn actually
needs; the docs carry the same philosophy as the engine (lean, focused, practical); the pass
covers both the published documentation and all the usual docs a healthy open-source repo
carries. Executes after the polish pass (Stage 1 may run concurrently with it).

## Philosophy

The docs mirror the engine's charter. Every page earns its place; "no page" is a valid and
often correct answer; prefer one excellent page over three adequate ones. The published docs
follow the Google developer-documentation style (the existing Vale tooling stands); the
structure is re-derived from research, not inherited: Diátaxis is the incumbent hypothesis,
not an assumption. Everything is written portable for its future home on Topo
(docs.cairn.org): plain markdown, no GitHub-rendering assumptions, link discipline that
survives re-hosting.

## Stage 1: research and the docs IA (the design deliverable)

A research workflow surveys three fronts:

1. **Comparable published docs.** What healthy tools near cairn's shape actually ship: Astro
   and SvelteKit (the ecosystem standard-setters), Wrangler/Cloudflare (the platform idiom),
   and two or three small high-quality OSS tools closer to cairn's size (chosen at plan time).
   Extracted per comparable: the IA, the page inventory, the on-ramp shape (quickstart vs
   tutorial vs both), reference conventions, and what they deliberately omit.
2. **Repo-health standards.** README anatomy for a tool of this kind, CONTRIBUTING and
   SECURITY norms (SECURITY also unblocks the friction-logged private-vulnerability-reporting
   gap when the repo goes public), issue/PR templates, community files, and the leanness test:
   which of the "usual" files a small closely-held-going-public project genuinely needs versus
   ships as cargo cult.
3. **The existing corpus, graded.** Inventory every current page (the Diátaxis arms, README,
   the internal docs that should stay internal) and grade each as raw material: survives
   mostly intact, survives as source material for a rewrite, or dies. The known concrete
   defects (the tutorial's `mintToken` and admin-mount blockers, the reference prose drift,
   the lens-doc stale baseline) are graded inputs, not a fixed work-list.

The main loop synthesizes the **docs IA design doc**: the target tree for `docs/` and the repo
root, the page inventory with each page's job stated in one line, the survive/rewrite/kill
triage of the existing corpus, the deliberately-omitted list, and the writing order. **This doc
comes to Geoff for approval; it is the taste gate of the pass.** Stage 2 does not start
without it.

## Stage 2: the rewrite

1. **The snippet gate lands first**: an extract-and-typecheck gate that compiles the tutorial
   and reference code blocks against the built package, so everything written in this pass is
   born gated and a future surface change fails the doc that teaches the old shape.
2. **The rewrite executes against the approved IA**, in the IA's writing order. Known inputs
   the IA is expected to place (subject to its triage): the corrected tutorial or its
   replacement, a migration guide (existing markdown into cairn concepts), an add-authors
   guide (the declare-your-own-concept + `fields.reference` pattern, teaching the move that
   answers a whole class of "does cairn support X?" questions), the extending-developer-lens
   baseline refresh, and the repo-health layer (README as the front door, CONTRIBUTING,
   SECURITY, templates as research justifies).
3. **Continuity constraints**: `CHANGELOG.md` and the `Consumers must:` convention are
   untouched; `docs/guides/upgrade-cairn.md` survives (it is contract history, not prose to
   re-derive); the reference pages' tier markers and the four doc gates
   (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`) hold
   throughout, plus the new snippet gate.

## Acceptance

- The docs IA doc exists, is approved by Geoff, and the shipped tree matches it: every page in
  the inventory exists and does its stated job; every page marked kill is actually gone.
- The snippet gate is in CI and green; all existing doc gates green; Vale clean on the
  published arms (error tier).
- The repo-health files exist per the approved IA and read lean, not cargo-culted.
- Content is Topo-portable (verified by the IA's link and asset conventions, spot-checked).
- ROADMAP's docs-rewrite entry is removed; the friction log's docs on-ramp items are resolved
  or explicitly re-filed; post-mortem with both budget numbers.

## Execution notes

- Stage 1 runs as a research workflow (multi-source sweep, then main-loop synthesis) and may
  run while the polish pass's sweep executes; there is no file contention.
- Stage 2 runs as its own pass on a worktree after the polish pass merges, `cairn-pass`
  ritual, writing dispatched per the plan the IA produces; prose drafting follows the
  writing-voice standards (Google for the published arms), with `prose-voice-reviewer` in the
  review gate alongside the doc gates.
- The docs IA doc lives at `docs/superpowers/specs/` beside this design; the Stage 2 plan is
  authored only after the IA is approved.
