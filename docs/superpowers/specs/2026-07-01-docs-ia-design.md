# Docs information architecture: design

The Stage 1 deliverable of the docs rewrite
(`2026-07-01-docs-rewrite-design.md`). Synthesized from the eleven-agent research bundle (six
comparable docs sets, repo-health standards, the graded corpus, an adversarial completeness
critic) plus two supplemental surveys (diagram/tone practice; auth-library security docs).
This is the taste gate: Stage 2 writes nothing until Geoff approves this document.

## What the research settled

The four-arm Diátaxis shape survives contact with every comparable at every scale (Astro at
350+ pages and Hono at 81 both reduce to tutorial / guides / reference / thin explanation), so
the rewrite keeps cairn's existing skeleton and re-derives the flesh. The one-page-per-export-
subpath reference convention is isomorphic to Astro's `reference/modules/` and SvelteKit's
per-import-surface reference; it stays, gate-enforced as today. Cairn has no integration
matrix (one framework, one platform, fixed concepts), which is where the comparables' page
counts explode; cairn's docs stay small because the product is opinionated, and that is a
feature to state, not compensate for.

## Rulings on the open structural questions

1. **Dual audience (the critic's central gap).** The guides arm splits into two named nav
   groups, **For developers** and **For editors** — a grouping, not a fifth arm. The editor
   guides are the canonical long-form source; the in-app editor help remains the editor's
   primary surface and links into them (single source of truth in the docs, contextual entry
   points in the product). The docs index routes the two audiences in its first paragraph.
2. **The upgrade guide.** `docs/guides/upgrade-cairn.md` as a per-version mirror is retired
   (four comparables counsel against it; the corpus grader flagged its unbounded growth). It
   is replaced by a thin **Upgrade cairn** process guide: bump the range, read the
   `Consumers must:` lines between your versions in `CHANGELOG.md`, run `cairn-doctor`.
   History lives in the changelog only. Per-major migration pages (the Astro/SvelteKit
   pattern) are reserved for the 1.0 boundary.
3. **No separate quickstart yet.** The comparables are scaffolder-first, and cairn's
   scaffolder is not fully shipped; a quickstart without one is just a shorter tutorial
   (Decap's fused-then-split churn is the cautionary tale). The tutorial carries a short
   "fastest path" pointer that becomes the quickstart link when `create-cairn-site` ships.
4. **Explanation arm: consolidated, and its size defended.** `structured-fields.md` folds
   into `content-model.md`; `media-storage.md` is rescoped to pure "why" (its reference-grade
   detail moves to `reference/media.md`); `data-tiers.md` drops its internal-design-log
   flavor. A new `why-cairn.md` absorbs the public-worthy content of
   `docs/internal/what-cairn-is-and-is-not.md` (which several published pages already link
   into, a defect) and carries the positioning honestly: who cairn is for and not for. Net:
   nine pages — larger than the comparables' two-to-seven, justified explicitly: cairn owns
   domains none of them own (auth, render safety, reference integrity, a content model), and
   the auth-library survey showed the explanation-tier security hub is cairn's
   differentiator, not fat.
5. **Security docs adopt the surveyed shape.** `security-model.md` stays the hub with one
   ownership rule: the hub owns each boundary's guarantee, residual, and why; the mechanics
   pages (`render-safety.md`, `reference-integrity.md`) own the exhaustive what. The hub
   gains a "cairn handles / your site handles" boundary table and closes with a short
   procedural disclosure pointer. The render-safety duplication (security-model.md ~116-145
   vs render-safety.md 23-44) dies in this restructure.
6. **Troubleshooting: one page, developer group.** Symptom → log event → fix, built on the
   doctor and `log-events.md` (the SvelteKit FAQ lesson; also the home for friction-log
   one-offs so they stop demanding pages).
7. **Glossary: a vocabulary section on the docs index**, not a page. Six-to-eight core terms
   (concept, adapter, seam, owner/editor, holding branch, island).
8. **The showcase gets a README** stating its double job (the Wayfinder template and the
   tutorial's companion) — a repo file, not a docs page. The stray
   `docs/cairn-dx-feedback-2026-06-09-*.md` moves to `docs/internal/history/`.
9. **Repo health: evidence says omit.** No CONTRIBUTING.md, CODE_OF_CONDUCT.md, or issue/PR
   templates now; each has a recorded trigger (soliciting PRs; a moderated community space;
   triage volume) filed in ROADMAP rather than cargo-culted in. SECURITY.md keeps its
   substance with one timed fix at go-public (enable private vulnerability reporting, delete
   the interim email path). LICENSE untouched. The README is the npm front door too: keep it
   funneling to the docs rather than inlining them, fix the stale `ecnordic.ski` reference,
   verify `package.json` description/keywords/homepage when docs.cairn.org exists.
10. **Topo constraints ledger** (recorded here, owned by the Topo pass): sidebar nav renders
    this IA's tree; search is table stakes; Mermaid must render with explicit dark-mode
    theming and every diagram paired with adjacent prose (the accessibility mitigation);
    docs-build link/anchor checking joins CI at hosting time; `llms.txt` (full + small) ships
    with the hosted site, on-charter.

## Voice: the operational meaning of friendly

Second person throughout; callouts framed as the reader's actual next question (Cloudflare's
device) rather than generic Note/Warning; one celebratory line at each genuine tutorial payoff
(first save, first publish, first deploy); if emoji, a functional three-mark vocabulary at
most. Warmth concentrates at on-ramps and payoffs; reference stays precise and warm-neutral.
All within the Google standard's own "conversational and friendly" latitude.

## Diagrams

Mermaid stays the default — zero of six comparables use it, but all their alternatives
(hand-drawn SVG, screenshots) are maintenance cairn cannot afford, and text-in-markdown is
cairn's own philosophy. Mitigations bind: dark-mode theme directive, adjacent-prose pairing.
Cairn already has four Mermaid diagrams (architecture ×2, reference-integrity, plus the
delete-gate flow); the inventory adds: a trust-boundary diagram on `security-model.md`, the
save → holding branch → publish → deploy flow (tutorial and/or `publish-and-discard.md`), the
bytes-in-R2 / reference-in-git split on `media-storage.md`. Screenshots are budgeted for
exactly one guide, `set-up-the-github-app.md` (the Keystatic lesson: the GitHub App
authorization screens are the shared friction point worth their rot risk).

## The target tree

Repo root: `README.md` (rewrite-source), `CHANGELOG.md` + `ROADMAP.md` (conventions survive),
`SECURITY.md` (rewrite at go-public), `LICENSE` (survives). `examples/showcase/README.md`
(new, short).

`docs/README.md` — the front door: audience routing, the reading path, the vocabulary section.

`docs/tutorial/build-your-first-cairn-site.md` — full rewrite from the existing structure
(the ten-milestone build-order shape survives as the skeleton): fixes the two confirmed
blockers (retired `mintToken`; the admin mount taught without the shell layout pair), the
bindings idiom, scaffolder status, payoff moments.

`docs/guides/` — **For developers:** `define-an-adapter-and-schema` (RW: defineConcept
snippet defects), `configure-rendering` (S), `configure-auth-and-d1` (RW: public verify path,
kill the internal-doc links), `set-up-the-github-app` (S + screenshots),
`deploy-to-cloudflare` (RW: five-file mount), `cloudflare-readiness` (S),
`wire-the-delivery-surface` (S), `add-an-island` (S), `add-a-custom-admin-screen` (S),
`link-content-with-references` (RW: snippet defects), `structured-fields` (RW: snippets;
explanation content moves out), `enable-tidy` (S), `read-cairn-logs` (S),
`rotate-the-github-app-key` (RW: de-personalize the secrets paths), `upgrade-cairn` (replaced
per ruling 2), **new:** `migrate-existing-content`, `add-authors` (the
declare-your-own-concept + `fields.reference` pattern), `troubleshooting`.
**For editors:** `write-in-the-editor`, `add-an-image`, `manage-the-media-library`,
`manage-your-tag-vocabulary`, `publish-and-discard` — all survive (graded strong), swept for
register consistency.

`docs/reference/` — all sixteen pages survive (the pruning pass did the heavy lifting);
`components.md` restructures the MarkdownEditor wiring-props wall into a table; `sveltekit.md`
gets internal reorganization (clear per-factory sections), not a page split — one page per
subpath remains the gated convention; `log-events.md` prose trimmed.

`docs/explanation/` — `README` (S), `architecture` (S), **`why-cairn` (new)**,
`content-model` (S, absorbs structured-fields), `security-model` (RW per ruling 5),
`render-safety` (S, mechanics owner), `reference-integrity` (S), `media-storage` (RW,
rescoped), `data-tiers` (RW, trimmed), `editor-copyedit` (S).

**Kills:** `upgrade-cairn.md`'s version mirror (content already in CHANGELOG); the stray
dx-feedback file from `docs/` root; the render-safety duplication inside `security-model.md`;
the guides' links into `docs/internal/`.

## Stage 2 writing order

1. The snippet extract-and-typecheck gate (born gated).
2. Front doors: `README.md`, `docs/README.md`, `why-cairn.md` (the positioning spine the rest
   links to).
3. The tutorial.
4. The rewrite-source developer guides, then the three new guides.
5. The explanation consolidation (security ownership rule, merges, rescopes).
6. Reference restructures and the editor-guides register sweep.
7. Repo-health finishes: showcase README, stray-file move, ROADMAP triggers for the omitted
   community files.

## Residual risks, stated

No genuinely solo-maintained, cairn-scale docs-IA comparable exists (the critic's asymmetry
finding); the mitigations are the leanness rulings above and the page-count ceiling the
comparables imply. The scaffolder-first on-ramp arrives in a later pass; ruling 3 keeps the
seam explicit so the quickstart lands without restructuring.

## Amendment (Geoff, 2026-07-02): the three-intro structure

The docs open with a GENERAL introduction both audiences can read (this becomes
`docs/README.md`'s opening job: plain language, no stack jargon in the first paragraph), which
routes to two audience follow-ups: the developer intro (served by `why-cairn.md` plus the
Start-here path, no new page) and an **editor intro — one new page**,
`docs/guides/editor-welcome.md`, heading the For-editors group: what this tool is in an
editor's terms (your site's writing room; saving holds, publishing ships, nothing you do can
break the site), signing in, and where each editor guide is. Warmest register in the tree.
Page inventory +1; the guides index's For-editors group leads with it.
