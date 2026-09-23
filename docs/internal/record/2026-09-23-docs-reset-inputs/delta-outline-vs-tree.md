# Delta: 2026-08-15 docs outline vs. the tree today (2026-09-22)

Baseline outlines: `2026-08-14-docs-track-outlines.md` (page structure, "no screenshots" ruling)
superseded by `2026-08-15-docs-outlines-with-visuals.md` (adds the visual layer; page structure
carried forward unchanged from 08-14 except where noted). Compared against the tree on `main`
and the two forward-looking documents (`2026-09-21-draft-docs-design.md` spec, and the
`draft-docs-plans` branch's pass B plan + pass C stub), which plan to redraft admin (pass B) and
extend (pass C).

---

## 1–3. Front door (`docs/README.md`, root `README.md`, `docs/why-cairn.md`)

| Outline page | Exists now | Contract match | Visual plan |
|---|---|---|---|
| `docs/README.md` | Yes, same name | Broadly matches: one-sentence what-is, copyable command, "Where to start" routing up top | Outline: visual-free by design (08-15 ruling). Matches — no images. |
| root `README.md` | Yes, same name | Matches: positioning trimmed, command + routing first | Visual-free. Matches. |
| `docs/why-cairn.md` | Yes, same name, moved out of the old explanation arm per the 08-14 ruling | Matches: keeps the founder narrative and honest trade-offs | Visual-free. Matches. |

No additions or deletions here. Out of scope for the draft-docs initiative (spec: "the front door...
stay as they are until the rebuild").

## 4. Admin track (`docs/admin/`)

**Outline pages (08-14, carried into 08-15 unchanged):** README, before-you-start,
create-your-site, own-your-domain, is-it-working, setup-recovery, invite-editors,
troubleshooting (8 pages). Killed from the pre-outline draft: `maintain-your-site`,
`read-your-logs` (merged into troubleshooting) — both absent now, confirmed.

| Outline page | Exists now | Notes |
|---|---|---|
| README.md | Yes | — |
| before-you-start.md | Yes | — |
| create-your-site.md | Yes | — |
| own-your-domain.md | Yes | — |
| is-it-working.md | Yes | — |
| setup-recovery.md | Yes | — |
| invite-editors.md | Yes | — |
| troubleshooting.md | Yes | — |

All 8 outline pages exist under their outlined names; none renamed or deleted. All 8 were added
in commit `55bf8184` ("Write the four documentation tracks clean-room (#35)", 2026-08-14).

**Page the outline does not list:**
- `docs/admin/what-to-run-and-when.md` — added `fc1c1bd7`, 2026-08-21 ("Add the admin
  target-stack page, gated by check:target-stack"). Job: a target-stack table naming what each
  moving piece (SvelteKit, cairn, Node, etc.) should be today, where it's set, how often it
  moves, and how to tell yours still matches; links `reference/supported-toolchain.md` for exact
  versions. This page postdates the 08-14/08-15 outlines entirely — it is not a contract miss,
  it is later-filed scope, gated by a `check:target-stack` gate the outline never anticipated.

**Contract match, per outline's one-liners:** all 8 pages' contracts (from the 08-14 outline's
numbered list) still describe the shipped page at a skim: "what am I getting into" (before-you-start),
"from nothing to signed in" (create-your-site), "move the site onto a domain you own"
(own-your-domain), "a check failed; here's what it means" (is-it-working), "a setup step
failed... get back on the path" (setup-recovery), "get your writers in" (invite-editors), "the
site does the wrong thing; find the fix" (troubleshooting). No drift detected at a skim.

**Visual plan (08-15) vs. shipped:**

| Page | Planned | Shipped |
|---|---|---|
| before-you-start.md | 1 authored diagram (five-asset ownership map) | 1 mermaid diagram present |
| create-your-site.md | 1 authored diagram (setup journey) + recorded transcript blocks | 1 mermaid diagram present; **0 transcript blocks** (grep for `$ cairn`/`$ npx` fenced output: none) |
| own-your-domain.md | 2 authored diagrams (one-domain-two-jobs; nameserver switch) | **1 of 2** — one mermaid diagram under "Connect your domain" (reads as the nameserver-switch shape); no diagram found under the "already has DNS records" section, so the one-domain-two-jobs diagram appears not to have shipped |
| is-it-working.md | 1 recorded doctor transcript, else no visual | 0 mermaid/transcript found — the one planned visual (a real `cairn doctor`/`cairn health` transcript) did not ship |
| setup-recovery.md | deliberate no-visual | matches (none) |
| invite-editors.md | 1 live UI reproduction (BLOCKED on the seam) | none — consistent with BLOCKED status (seam never built) |
| troubleshooting.md | deliberate no-visual | matches (none) |
| what-to-run-and-when.md | not in outline | none |

Net: admin's authored diagrams (2 of a planned ~5) landed; transcript blocks (the admin
track's other visual device, and the original 08-14 CI-gated ruling) landed nowhere. The 08-15
outline itself flags this as a **repeat** of the same defect: "the shipped track...carried zero
fenced transcript blocks; that is a second dropped visual layer this rebuild restores" — and it
is still true on `main` today.

**Forward-looking:** pass B (draft-docs, unmerged plan on `draft-docs-plans`) plans to rebuild 9
of these pages plus add 3 new ones (`install-cairn.md`, `check-your-credentials.md`,
`schedule-a-check.md`), specifically to weave the Go `cairn` CLI into the admin spine — a
structural change the 08-15 outline never anticipated (it predates the Go tool's admin-facing
role). Pass B's plan explicitly restores transcript capture as its own task (Task 5) and expects
to finally ship the "admin track's own" visual vocabulary the 08-15 outline called for twice.

## 5. Editors track (`docs/editors/`)

**Outline pages:** README, welcome, write-in-the-editor, publish-and-history,
when-something-goes-wrong, add-an-image, manage-the-media-library, manage-your-tag-vocabulary
(8 pages, listed as "7 pages + index" in the 08-14 header, an outline miscount noted at the
time).

| Outline page | Exists now |
|---|---|
| README.md | Yes |
| welcome.md | Yes |
| write-in-the-editor.md | Yes |
| publish-and-history.md | Yes |
| when-something-goes-wrong.md | Yes |
| add-an-image.md | Yes |
| manage-the-media-library.md | Yes |
| manage-your-tag-vocabulary.md | Yes |

Exact 1:1 match — no additions, no deletions, no renames. Killed-from-draft pages
(`links-images-and-includes`) confirmed absent.

**Contract match:** all 8 one-liners from the outline still describe the shipped pages at a
skim (welcome = "what this editor is and how to get in"; write-in-the-editor = "everything about
writing and formatting a draft"; etc.) — no drift found.

**Visual plan (08-15) vs. shipped:** the entire editors visual layer (live UI reproductions
rendered through cairn-pub's `/help` pipeline) is marked BLOCKED throughout the 08-15 outline,
pending a seam that "this plan consumes... and does not design." Grep across `docs/editors/`
found zero image references and zero reproduction markers anywhere — consistent with **nothing
shipped**, exactly as predicted (the no-stub rule kept these pages untouched rather than landing
placeholders). The one non-blocked exception in the outline, the save-publish-loop diagram on
`publish-and-history.md` (the editors track's sole deliberate abstract diagram, marked READY),
also did **not** ship — `publish-and-history.md` carries no mermaid block.

This arm is explicitly out of scope for the current draft-docs initiative ("The editors arm...
stay as they are until the rebuild" — spec, "Out of scope"), so this delta is expected to persist
until a live-reproduction seam and a dedicated pass exist.

## 6. Extend track (`docs/extend/`)

**Outline pages (08-14):** 1 deep path + 10 building blocks + 4 admin-surface guides + 1
design-your-site + 4 publishing-flow guides + 4 operate-across-versions guides + 6 concepts = 30
pages + index = 31 total. Named: `build-a-site-by-hand`, `add-cairn-to-a-sveltekit-app`,
`what-the-scaffold-wrote`, `define-an-adapter-and-schema`, `declare-your-own-concept`,
`configure-rendering`, `wire-the-delivery-surface`, `link-content-with-references`,
`reuse-content-across-entries`, `add-an-island`, `migrate-existing-content`,
`add-a-custom-admin-screen`, `organize-your-admin-nav`, `restrict-admin-access`,
`add-a-second-audience`, `design-your-site`, `enable-tidy`, `announce-on-publish`,
`share-a-draft-preview`, `choose-an-ai-posture`, `debug-your-site`,
`rotate-the-github-app-key`, `upgrade-cairn`, `migration-notes`, `architecture`,
`content-model`, `security-model`, `auth-channel-security-model`, `render-safety`,
`data-tiers`.

All 30 named pages exist under their outlined names today — none renamed or deleted.

**Pages that exist now and the outline does not list:**

| Page | Added | Job (first paragraph) |
|---|---|---|
| `docs/extend/sign-in-through-your-organization.md` | `57750668`, 2026-09-08 | Replaces the magic link with an org identity gate (Google Workspace / Entra ID) in front of `/admin`, teaching cairn's roster to trust that gate |
| `docs/extend/animate-a-custom-screen.md` | `48fba6fe`, 2026-09-15 | Contract: any motion on a custom admin screen follows the same token vocabulary the shipped admin uses, checked by `npx cairn-audit` the same way |

Both are later-filed extend guides (identity-seam and admin-motion-language initiatives, both
after 2026-08-15), not contract misses — the outline predates both features.

**Contract match:** spot-checked the concepts and building-block pages against their one-line
outline contracts; no drift found at a skim (e.g. `architecture.md` still opens with the
system/write-path framing the outline describes, `data-tiers.md` still frames git/D1/R2 as
three tiers by selection rule).

**Visual plan (08-15) vs. shipped**, page by page (all extend diagrams are authored/mermaid and
marked READY in the outline, no seam dependency):

| Page | Planned | Shipped |
|---|---|---|
| architecture.md | 2 diagrams (system block, write-path sequence) | 2 mermaid blocks present — matches |
| security-model.md | 2 diagrams (trust-boundary, guard-order) | 1 mermaid block present — **1 of 2 shipped** |
| content-model.md | 1 small diagram (fieldset fan-out) | **0 shipped** — planned diagram missing |
| data-tiers.md | 2 diagrams (three-tier map, media-storage flow) | 1 mermaid block present — **1 of 2 shipped** |
| link-content-with-references.md | 1 diagram (delete-guard decision) | 1 mermaid block present — matches |
| render-safety.md | 1 diagram (pipeline order) | 1 mermaid block present — matches |
| wire-the-delivery-surface.md | 1 small diagram (content-index-to-five-surfaces) | **0 shipped** — planned diagram missing |
| build-a-site-by-hand.md | 1 diagram (milestone map) | 1 mermaid block present — matches |
| what-the-scaffold-wrote.md | 1 fenced directory tree (not a diagram) | not checked for mermaid (correctly, since plan calls for plain text, not mermaid) |
| organize-your-admin-nav.md | 1 live reproduction (BLOCKED) | 0 — consistent with BLOCKED |
| add-a-custom-admin-screen.md | 1 live reproduction (BLOCKED) | 0 — consistent with BLOCKED |
| rotate-the-github-app-key.md | 1 small authored timeline | 1 mermaid block present — matches |
| auth-channel-security-model.md | deliberate no-visual | matches (none checked, expected none) |

Net for extend: of the ranked "build first" authored diagrams (outline's numbered list:
architecture ×2, security-model ×2, data-tiers ×2, link-content-with-references,
render-safety, build-a-site-by-hand, content-model, wire-the-delivery-surface,
rotate-the-github-app-key = 11 diagrams), **8 of 11 shipped**; content-model's,
wire-the-delivery-surface's, and one of security-model's and data-tiers' pair did not.

**Forward-looking:** the pass C stub (unmerged, `draft-docs-plans` branch) plans to redraft all
30 extend pages fresh (excluding the two per-version records `migration-notes.md` and
`upgrade-cairn.md`, and `README.md` drafted last) by the same drafter-brief-gate method as pass
B, after pass B closes. It is a stub with several "Filled at pass B's close" sections (anatomy
per page, ceiling, exemplar) — not yet actionable.

## 7. Reference (`docs/reference/`)

Outline calls for "23 pages + index" (one page per export subpath, 4 CLI pages, plus
non-export contracts: `admin-routes`, `log-events`, `admin-grammar-tokens`,
`supported-toolchain`). The tree today carries ~30 markdown pages plus a `schema/` directory (7
JSON Schema files). The growth is accounted for by later, gated work, not outline drift:

- `cli-cairn-exit-codes.md`, `cli-cairn-json-output.md`, `cli-cairn-doctor.md` — new CLI
  contract pages added by draft-docs pass A (2026-09-21 spec), serving a **new
  scripter-or-agent profile** the outline never had (see §8, the overturn).
- `docs/reference/schema/*.schema.json` — moved here from `tool/schema/` per the same pass A
  ruling ("Schemas ship with the docs"), so cairn.pub can serve them from the npm tarball.
- `admin-toolkit.md`, `cairn-audit.md`, `cli-cairn-manifest.md`, `cli-cairn-media-seed.md`,
  `ambient.md`, `auth-crypto.md`, `auth-store.md`, `reproductions.md`, `site-facts.md`,
  `guidance.md`, `render.md`, `delivery-data.md` and others are export-subpath pages the
  `check:reference` gate keeps 1:1 with the shipped package surface, which necessarily grows as
  the engine's exported surface grows — this is the outline's own designed behavior ("Reference
  stays rigid and gated... canonical answers live in the tree"), not a deviation from it.

The reference arm is explicitly **out of scope** for visuals (08-15 ruling: "The reference keeps
its gated exception status and gains no visual layer") and out of scope for the current
draft-docs redraft passes except its 3 new CLI pages (pass A, already landed) — confirmed no
visual content added to any reference page.

## 8. Outline rulings later records overturned

Two related overturns found (same underlying ruling, recorded twice):

1. **The one-profile-per-track ruling, overturned.** `docs/internal/docs-register.md:377`:
   > "This overturns the 2026-08-14 ruling, above and in
   > [`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md), that every
   > track serves exactly one profile and the reference arm has none (Geoff, 2026-09-21)."

   A dated note was appended to `2026-08-14-audience-profiles.md:202` confirming the same
   overturn: "Draft docs pass A overturns this document's ruling that every track serves exactly
   one [profile]." The reference arm now carries a second profile, the **scripter-or-agent**
   profile, for exactly the three new CLI contract pages (§7 above). This is a 2026-09-21 ruling,
   post-dating both the 08-14 and 08-15 outlines.

2. **The "no screenshots anywhere" ruling, overturned by the 08-15 outline itself** (this is the
   08-15 document's own stated reason for existing, not a later record overturning it): the
   08-14 outline's "No screenshots anywhere" cross-cutting device is explicitly retired by
   08-15's opening paragraph, replaced by the per-track visual vocabulary (live UI reproductions
   for editors, transcripts + diagrams for admin, mermaid diagrams for extend, nothing for
   reference/front-door). As shown in §4–6 above, most of this replacement vocabulary still has
   not shipped a year later — the admin transcript layer and the editors reproduction layer are
   both still fully unbuilt, and several individual extend diagrams remain unshipped.

No other "overturn"/"supersede" hits in `docs-register.md` or `docs/internal/record/` bear on
the docs-outline-vs-tree structure question (the remaining ~80 hits are unrelated audit,
component, and plan-review overturns from other initiatives).

---

## Summary of net deltas

- **Front door:** exact match, no visuals planned, none shipped needed — clean.
- **Admin (8 outline pages):** all present; +1 unplanned page (`what-to-run-and-when.md`,
  2026-08-21). Diagrams: 2 of ~5 planned shipped. Transcripts: 0 of planned shipped (repeat of
  the original 08-14 defect, flagged again by 08-15, still open). Pass B (unmerged) plans a full
  rebuild plus 3 new tool-onboarding pages.
- **Editors (8 outline pages):** exact match, no additions/deletions. Entire visual layer
  BLOCKED on an unbuilt seam; nothing shipped, as the outline predicted. Out of scope for
  current work.
- **Extend (30 outline pages):** all present; +2 unplanned pages
  (`sign-in-through-your-organization.md` 2026-09-08, `animate-a-custom-screen.md` 2026-09-15).
  Diagrams: 8 of 11 ranked "build first" diagrams shipped; `content-model.md` and
  `wire-the-delivery-surface.md` diagrams and one each of `security-model.md`'s and
  `data-tiers.md`'s pairs are missing. Pass C (stub, unmerged) plans a full redraft after pass B.
- **Reference:** grew from the outline's ~23 pages via gated, expected growth plus 3 new
  scripter/agent-profile CLI pages from pass A (already merged) — not outline drift.
- **Overturned ruling:** the 2026-08-14 "every track serves exactly one profile, reference has
  none" ruling is overturned (2026-09-21) for the reference arm's 3 new CLI pages. The 08-14
  "no screenshots anywhere" ruling is superseded by the 08-15 outline itself, and its
  replacement (transcripts, live reproductions) remains largely unbuilt across admin and
  editors.
