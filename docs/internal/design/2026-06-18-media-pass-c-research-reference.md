# Media Pass C design reference (bulk operations, orphan collection, needs-alt at scale)

Date: 2026-06-18. The research-and-verdict ground for cairn media Pass C, stage 1 of the mockup-first
design pass. It is built from a verified four-cluster competitor study (WordPress orphan-cleanup
ecosystem; git-backed/flat-file peers; headless CMS + DAM; the interaction/a11y/alt gold standard),
run as a workflow whose load-bearing claims were adversarially verified, and it builds on the Phase 3c
study in `2026-06-17-media-library-design-reference.md`. It sets what to steal, what to avoid, and the
cairn-specific safety floor the mockups must honor before any UI is drawn.

## What Pass C is

Three jobs the 3c Library deferred, plus a possible fourth:

1. **Bulk operations** on the Library: multi-select, a bulk-action bar, and usage-gated bulk delete.
2. **Orphan collection**: the destructive half of `reconcileMedia`, which 3c left read-only. Two
   directions, deliberately different: orphaned bytes (R2 objects with no manifest row) and
   unreferenced assets (manifest rows referenced by nothing in the cross-branch usage index).
3. **Needs-alt at scale**: broaden the existing needs-alt triage into a library-wide fix surface.
4. **Dedupe/merge** (candidate): collapse exact duplicates and merge near-duplicates onto one asset.

cairn lands this on a substrate that already implements most of the category's hard safety pattern:
the single safe-delete is fail-closed on a fresh strict cross-branch usage read with a typed-slug
confirm and commit-row-then-delete-R2 ordering; Pass B shipped `planMediaRewrite`, a strict,
fail-closed rewrite planner with a report-only cross-branch delta; `reconcileMedia` already separates
the two orphan directions read-only. Pass C mostly extends proven primitives to many items and to
destruction, rather than inventing them.

## The headline findings (verified)

1. **"Deleted media that was actually in use" is the category's defining failure, and the market
   leader has not solved it.** WordPress's Media Cleaner (90,000+ installs, 90+ builder parsers) ships
   it as a disclaimed risk; its developer states 100% accuracy is "not possible"; users report a
   deleted site logo and "half their website broke down." The same failure recurs in Statamic's Clear
   Assets (verbatim-filename match, plus a confirmation-free `--force`) and in every warn-and-proceed
   tool. cairn must never relax its fresh-read fail-closed gate to a confident "unused," and must never
   ship a `--force` or confirmation-free bulk path.
2. **Every reference-aware system shares cairn's raw-HTML blind spot.** Sanity `references()`,
   Contentful `links_to_asset`, Storyblok's References tab, Payload, WordPress, Statamic, Webflow: all
   see only modeled/parseable references and are blind to an asset embedded as raw HTML, a hardcoded
   URL, or inside opaque rich text. This independently validates cairn's "found in N entries / no
   references found, never a bare unused" doctrine. The honest tools disclose the gap at the verdict;
   cairn must surface it in the UI at the point of action, not bury it in docs.
3. **Two architecturally sound patterns to adopt wholesale.** Remap-then-delete (Sanity, Media
   Deduper's Smart Delete): rewrite every reference to the survivor before removing the loser, so a
   destructive op can never orphan a reference. Reversibility-as-safety (Apple/Google/Notion/GitLab): a
   durable trash buys low-friction confirms, and typed-confirm is reserved for the irreversible. cairn
   already has remap-then-delete in `planMediaRewrite` and gets reversibility free from git.

## Two concrete code findings

- **The shipped "Unused" triage facet contradicts cairn's own doctrine.** `CairnMediaLibrary.svelte`
  computes a facet labeled "Unused" as `usageCount === 0`, but `usage.ts` is explicit that absence of a
  row means "no reference found," never proof of unused. Rename it (e.g. "No references found") and add
  the raw-HTML caveat to its description. Small fix, high signal, aligns the UI with the differentiation
  story.
- **The display usage index is non-strict, so it is selection-only, never destructive evidence.**
  `mediaLibraryLoad` builds the usage overlay degrade-and-skip (a failed branch read catches to `{}`),
  correct for display but the exact reason a bulk "select all no-reference-found" must not trust the
  displayed count: a degraded branch read silently inflates the no-reference set. **Every destructive
  bulk or orphan item must re-verify with its own strict read and fail closed, per item, never the
  loaded index. That single rule is the whole pass's safety floor.**

## cairn's differentiators (the moat)

- **Usage-gated bulk delete that fails closed per item.** No peer in any cluster has this. Sveltia has
  bulk delete with an open request (#624) for any in-use guard; Strapi and Cloudinary bulk-delete with
  zero gate; Sanity blocks but makes bulk miserable. Extending the proven single safe-delete gate per
  item is the headline Pass C differentiator.
- **A cross-branch usage union.** No pro CMS has a branch model, so none can avoid a false "unused" for
  an asset referenced only on an unmerged draft. `buildUsageIndex` already unions `main` plus every
  `cairn/*` branch, and the rewrite planner reports the cross-branch delta. A genuine moat, and the
  exact false positive that breaks the others.
- **Content-hash identity.** Exact dedup is free, a rename never breaks a reference (the resolver keys
  on the hash), and a complete remap-on-merge is possible. Bynder needs AI to approximate what cairn
  has by construction; Media Deduper independently validates byte-hash-as-identity.
- **git-as-trash.** Structural, reliable recovery where the cluster bolts on fragile trashes (Media
  Cleaner's restore failed to return the physical file in a documented case) and leans on "BACKUP
  FIRST." Every delete is one revertible commit; commit-row-then-delete-R2 means a revert restores the
  reference. This earns the low-friction confirm tier for reversible actions.
- **Honest verdict wording as a trust signal.** Disclosing the raw-HTML gap at the verdict is a
  competitive asset, not a weakness; every competitor that asserted a confident "unused" caused loss.
- **Remap-then-delete already in production** (`planMediaRewrite`): dedupe/merge and bulk reuse it
  rather than reinventing the cluster's safest destructive pattern.
- **Deterministic SSG opens an optional higher-assurance gate** (carried as future work): scanning
  cairn's own built HTML for content-addressed delivery URLs could shrink the raw-HTML blind spot for
  the riskiest deletes, more reliably than the Live-Site scans others bolt on. Optional, not default.

## What to steal

- Remap-then-delete before removal (already cairn's via `planMediaRewrite`).
- Reversibility as the safety mechanism; lean on git-as-trash, do not build a parallel trash.
- Sanity's property (you cannot orphan an entry by deleting an in-use asset), without its rigid block.
- Explicit selection scope: "the N in this view" vs "all matching the current filter," tied to the
  triage facets, with a sticky "N selected" action bar (Shopify's praised "Select all NNN matching";
  Google Photos' missing select-all is its top complaint and a cause of accidental over-deletion).
- The WAI-ARIA APG multi-select model: focus and selection decoupled, Space toggles, Shift+Arrow
  extends a range, Ctrl/Cmd+A selects all, roving tabindex, `aria-multiselectable`.
- Detection and destruction as separate surfaces (Apple's Duplicates album, Webflow's "Used in X").
- Deterministic, disclosed, reversible dedupe/merge (Apple Photos): a published keeper rule shown at
  merge time, metadata merged into the survivor, discards revertible.
- Bulk metadata editing as an inline spreadsheet grid (Shopify Bulk Editor), not N modal round-trips.
- Progress plus itemized partial-failure reporting for long ops (the 207-Multi-Status shape): continue
  past per-item failures, end with succeeded / skipped-with-reason / failed-with-reason.

## What to avoid

- Warn-and-proceed on a blind-spotted usage read (the central failure). Never a confident "unused,"
  never a `--force`/confirmation-free bulk path.
- Trusting a stale or display-mode usage read for a destructive op (cairn's own non-strict overlay).
- Bulk delete with the same or zero gate as single delete: that multiplies the blast radius.
- Naming a thing "unused" when you can only prove "no reference found" (the shipped facet does this).
- The reference-vs-bytes wording trap (Lightroom "Remove" vs "Delete from Disk"): keep the irreversible
  R2-byte purge visually and verbally distinct from a reversible git-tracked change.
- Auto-committing AI alt text (verified harmful: screen-reader users detect it in seconds and abandon
  tasks more than with human alt). If AI is ever added, draft-only with mandatory human accept.
- Over-blocking without explanation (Framer disables Delete at zero usage with no reason). If cairn
  blocks, it always says why, which the 409 refusal already does.
- Soft-delete/trash as a substitute for correctness. Recovery is the second line; the gate is the first.

## Per-surface findings

### Orphan collection (the biggest opportunity and the most dangerous surface)

Orphan-on-delete is a category-wide unsolved gap (Decap #5097/#4069/#6642, Publii #190, Ghost, Kirby);
no core git-backed CMS ships a reconcile tool. cairn is two-thirds there. Separate the two directions
with different verdict strength and friction (the code already names them):

- **Direction A: orphaned bytes (`orphanedObjects`)**, R2 keys with no manifest row. The safe-ish
  case: no manifest row means no `media:` token resolves to those bytes, so "no reference" is close to
  proof. The only residual risk is a raw-HTML `<img>` hardcoding the delivery URL. Treat as low-risk
  reconcile with a mandatory itemized dry-run preview.
- **Direction B: unreferenced assets**, manifest rows referenced by nothing in the cross-branch index.
  The less-safe case: it rides the same raw-HTML blind spot as safe-delete, so it must inherit the full
  strict fresh-read fail-closed gate, with the blind-spot caveat restated inline at the destructive
  confirm. Never collect on a single-branch, display-mode, or stale read.

Structure: detect-then-confirm with a mandatory dry-run that lists candidates with reasons, never an
auto-run or one-click "delete all orphans." Keep commit-row-then-delete-R2 so a mid-sweep failure
leaves recoverable git state. Reserve typed-confirm for the irreversible R2-byte purge; a reversible
git-tracked removal earns a plain confirm that names the count and says "every removal is one
revertible commit."

### Bulk operations

Net-new: the Library is single-select today. Build to spec. Selection model per the WAI-ARIA APG
(above), selection held as a Set of hashes. Scope made explicit and tied to the triage facets, with
the critical caveat that "select all no-reference-found" selects against the non-strict display index,
so it is a selection convenience only: each item still gets its own strict fresh-read gate at
execution. The selection scope is not the safety boundary; the per-item gate is.

Bulk delete is the single safe-delete gate applied per item, never weakened: each hash runs its own
strict `buildUsageIndex` read and fails closed; an item that cannot be verified is skipped (not
deleted) and reported. Long ops show real progress, continue past per-item failures, and end with an
itemized summary announced via the existing live-region pattern, with the `media.*` event trail as the
audit log. Watch the workerd 6-connection throttle and the per-page subrequest budget at ~25+ branches:
a 100-item bulk delete each doing its own strict cross-branch read needs bounded concurrency or a
shared-index-plus-per-item-recheck hybrid, an empirical check (see Gaps). Defer bulk replace (no clean
precedent; replace is inherently per-asset).

### Needs-alt at scale

Category-first: bulk alt editing is requested across the cluster (TinaCMS #4476) and shipped by no one.
Shape it as filter plus inline spreadsheet bulk-edit, not a wall of dialogs. Keep cairn's two alt edits
straight: the asset's default alt on the manifest row (a cheap one-commit metadata change,
`mediaUpdateAction`'s model, the value future placements inherit) versus propagating alt into existing
placements (`fillAltForHash` via `planMediaRewrite`, the heavier per-hash fail-closed path). The bulk
fixer primarily sets the manifest default; propagation stays an explicit per-asset choice, not a silent
batch side effect. Frame the scanner as surfacing fixable debt, not asserting completeness (it cannot
judge alt on a raw-HTML `<img>`). No AI in Pass C; if ever added, draft-only behind a human-accept gate.

### Dedupe/merge

cairn's content-addressed identity makes it strictly better than the cluster. Byte-identical uploads
are already one asset by construction, so exact-duplicate dedup is mostly a free no-op. The remaining
work is near-duplicates (a re-export, a recompress, a format swap) and accidental re-slugs of one hash.
Adopt the Apple Photos model plus remap-then-delete: choose the survivor by a published rule shown at
merge time, merge metadata into the survivor, rewrite every `media:` token from loser to survivor
across the corpus (with the cross-branch delta) in one commit before removing the loser, then
commit-row-then-delete-R2. Because references are uniform tokens, cairn remaps completely, with none of
Media Deduper's "page builders require manual cleanup" caveat. Merge inherits the fail-closed gate
automatically because it is built on `planMediaRewrite`. Ship the merge mechanism plus exact-dup
collapse; perceptual near-duplicate detection is DAM-scale overkill and is deferred.

## Open forks (with recommendations) for the brainstorm

1. **Bulk in-use confirm at scale** (the single-item typed-slug-per-asset does not scale). Recommend:
   a bulk delete acts only on items that pass the strict no-reference gate and skips in-use items with
   a reported reason, leaving forced in-use deletion to the deliberate single-item typed-slug path.
2. **Commit granularity for a bulk op.** Recommend: one commit per batch for the manifest changes,
   paired with the itemized skip/fail summary, R2 deletes following per the existing ordering.
3. **Dedupe/merge scope.** Recommend: ship the merge mechanism (on `planMediaRewrite`) plus exact-dup
   collapse; defer perceptual near-dup detection.
4. **AI auto-alt.** Recommend: manual bulk-alt grid only in Pass C; AI ruled out for now (draft-only
   with human accept as a possible later opt-in).
5. **Direction-B unreferenced-asset collection: include in Pass C or defer?** Recommend: include both
   directions, since Direction B reuses the already-built strict gate and the where-used overlay, so
   the marginal cost is UI and copy, and most of orphan collection's value is in Direction B.
6. **Optional built-HTML delivery-URL scan as a higher-assurance gate.** Recommend: skip in Pass C,
   log as future work; the honest-caveat-plus-fail-closed posture is already the correct trust story.

The decomposition decision (how much of bulk + orphan + needs-alt + dedupe is one pass versus split)
sits above these and is the first thing to settle with Geoff.

## Gaps (what the research could not establish)

- No quantitative false-positive rate for cairn's own deterministic-markdown model; the blind spot is
  assumed rare-but-real and should be checked against the two live sites.
- No data on whether 907.life or ecxc-ski currently have orphaned bytes or unreferenced assets, or at
  what scale. Running `reconcileMedia` against the real buckets (after a manifest regenerate) would
  size the need and validate where-used accuracy before building the destructive half.
- The workerd subrequest budget for a bulk strict re-read at scale is inferred, not measured; the
  concurrency strategy needs an empirical check.
- No peer ships a safe, reference-aware, fail-closed bulk/orphan tool, so there is no positive exemplar
  for the exact thing cairn is building, only failure modes to avoid and adjacent patterns to compose.
- Bulk in-use confirmation UX at scale and recovery-path UX for git-as-trash at bulk scale have no
  strong cited exemplar; the recommendations there are reasoned, not borrowed.
- Storyblok #114 was the one verdict marked mixed (a feature request describing the blind spot, not an
  official defect confirmation); the underlying principle is over-corroborated elsewhere, so cite it as
  a feature request, not a confirmed defect.

## Method note

Stage-1 research was a background workflow: four parallel cluster sweeps, an adversarial verification
pass on each cluster's load-bearing claims (the verdicts were nearly all "confirmed," with sources),
then a cross-cluster synthesis. The first run failed on a transient Anthropic API outage and was
re-run clean. The full per-competitor findings, the source URLs, and the verdicts live in the workflow
result; this reference is the distilled verdict ground for the mockups and the spec.
