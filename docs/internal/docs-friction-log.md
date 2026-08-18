# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is one of the four
audience tracks ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), or `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`).

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

The log was cleared 2026-07-16, 2026-07-19 (the dev-backend pass), and 2026-07-29 (the
post-0.91.0 clearing): every open finding was verified against the code and then either
shipped, filed into `ROADMAP.md` with its trigger, or found already resolved and pruned.
The 2026-07-29 clearing shipped four gate tightenings the Pass 2 entries had proposed (the
safelist count assertion, `norms:check` riding the e2e workflow after the 0.91.0 cut proved
the staleness window bites, `check:version` reading the `## Unreleased` window, and the
upgrade-guide/CHANGELOG Unreleased-heading parity check), moved the field-label weight
question (cairn 500 vs the consumer ruling's 600) into ROADMAP as a future design ruling,
and pruned the rest as filed, closed in-pass, shipped (the rendered-allowlist `rule` field;
the own-tree error tier cleared by Pass 3), or resolved by the 24x24 ruling (the 43.78px
tag-filter chip clears the ratified floor; the gate's own header documents it as inert).
Git history holds the full record of all three clearings. The 2026-07-29 ASC Assets-trial
harvest (ten findings across two batches, staged in the consumer repo while a cairn worktree
held live workerd) was folded at the 0.91.1 hotfix pass under the same complete-or-move rule:
finding 1, the 0.91.0 shipped-sheet regression, shipped as the hotfix itself; the
status-flattening finding folded into ROADMAP's standing kit entry with the upstream issue
repointed from the closed kit#12533 to the open kit#12987; and the other eight were verified
and filed into `ROADMAP.md` (the reachable-vocabulary contract, the audit's missing path
filter, the `.ts`-module scan blind spot, the 12px role gap, the doctor's bare-403 zone
reads, the identity-guard/non-2xx hole, the mismatched rendered-summary totals, and the
CodeMirror decoration throw on a consumer edit desk). The same harvest disproved the ASC
edit-desk hydration defect the STATUS carry-forwards had held (corpus C had configured
cairn's internal route shape, which 404s on ASC's single-mount admin; the real desks proved
hydration-clean across 24 runs). The 2026-07-30 Assets-trial BUILD harvest (six findings from
the pass that rebuilt `/admin/club/assets` and `/admin/club/asset-requests` under the
design-capture trial's control conditions, a different staging file from the 2026-07-29
harvest above) was folded at the design-ratchet pass under the same rule. Findings 1 and 6 (the
packaged admin sheet ships no user-agent reset, so a bare `textarea` rendered the browser's
monospace default and daisyUI's `.list` kept the UA's 40px bullet gutter) shipped as the pass's
`base` cascade layer (Task 1). Finding 2 (`form-anatomy.md`'s own worked example prescribed
`gap-x-6 gap-y-4`, which never compiled) shipped as a standing compile gate over the skill's own
reference exemplars, plus a labeled safelist addition (Task 2). Finding 3 (the stacked field
register that already worked inside the package was never exported) shipped as
`register: 'inline' | 'stacked'` on `FieldLabel`/`TextField`/`SelectField`, `'stacked'` now the
default (Task 3, a deliberate breaking change, ratified by Geoff 2026-07-30). Finding 4
(`one-filled-action` and the grader prompt disagreed about what one surface is) was ruled and
shipped: the partition narrows to `nav`/`aside` plus the topmost open dialog layer, and the dark
theme's `.btn-active` selected state gains a visible lightness step (Task 4). Finding 5 (daisyUI
pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
`grid-template-columns` alone does nothing) is the one finding this pass deliberately did not
repair; it files as a live entry in `ROADMAP.md`'s Next tier with the harvest's own measurement,
since site-side overrides exist and the engine-side repair needs its own design. The pass also
lands the grammar-ladder doctrine the harvest's pattern argued for, in
`docs/explanation/enforced-design.md`: every composition claim gets either a component or a
check, prose alone being the demonstrated failure mode. New findings start fresh below this
line.

CLOSED 2026-08-14 by Pass D. The setup-walk entry (five blind vantages, four classes of gap:
prerequisites arriving late, the tutorial's toolchain drift, troubleshooting scoped only to live
sites, the front door burying the first command) is what the docs rebuild's admin track,
front-door task, and Task 13 production gate were built to answer. The baseline record stays at
[`2026-08-unagented-setup-baseline.md`](./record/2026-08-unagented-setup-baseline.md) as the
evidence trail; the shipped disposition is `docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md`'s
post-mortem and `docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md`'s
dispositions. One item from the smaller list is code, not docs, and was already tracked
separately before this closure: `.dev.vars` missing from the scaffold's `.gitignore` is the
missing-`.gitignore` defect `docs/STATUS.md` holds as owed before release one.

CLOSED 2026-08-17 by the capture pass. The three findings the live `create-cairn-site` run
produced (a first run cannot succeed with the App installed on "Only select repositories"; resume
is not idempotent across repository creation; every scaffold ships the placeholder from-address
`cms@showcase.test`) are all tool defects rather than docs bugs, so they moved whole to
`ROADMAP.md`'s Now tier as one entry, owed before release one publishes the tool. A fourth
joined them there at the pass's register gate: the scaffold hand-over still tells a reader the
GitHub and Cloudflare steps arrive in a later release, in a run that then performs both. The committed
fixtures under `packages/create-cairn-site/test/fixtures/transcripts/` are the evidence, and the
pass post-mortem in `docs/superpowers/plans/2026-08-16-capture-pass.md` carries the run's own
account. New findings start fresh below this line.

CLOSED 2026-08-18 by this pass's triage (Task A8b). Of the six live-reproduction seam findings: the
mounting-injectability finding folded as a paragraph into
`docs/internal/extending-developer-lens.md`'s Baseline (item 4), the persona brief it belongs in;
the pathname-parsed chrome finding and the focus/global-key seizure finding filed to `ROADMAP.md`'s
Next tier; the missing prop-drift gate and the plural refusal-banner label filed to its Now tier;
and the instance-export-only state finding filed to its Later tier, its `spellcheckOverride`
double-duty half recorded there as already decided (accepted, drift tracked in a reproduction's own
caption) rather than filed as an open question. Every filed entry carries its own file:line
evidence and needs no cross-reference back here.

CLOSED 2026-08-18 by this pass's triage (Task A8b), except the cost-preamble finding, held live
below pending a browser glance only Geoff can take. Of the eleven backfill findings: the
commit-attribution mismatch, the free-tier bundle-size gap, the same-name resource collision, and
the unexplained `guard.rejected` build refusal filed to `ROADMAP.md`'s Now tier; the missing
`cairn-doctor` Builds check, the bootstrap token-contract duplication, and the revert-refusal copy
plus missing `history_stale` detector filed to its Next tier; the externally-registered-domain gap
filed to its Later tier; the tool-prose-doesn't-know-the-run's-state finding folded into the
existing ROADMAP entry that already names that root (the scaffold hand-over defect); and the
Windows finding is DONE, already ruled and disclosed 2026-08-18, with the Go successor tool's
Platforms section carrying it forward. New findings start fresh below this line.

- **The cost preamble ships the inference its own research refused to ship.** `admin`.
  `packages/create-cairn-site/src/money.mjs:41` states "All in, a small site on its own domain runs about
  $6 a month" with no hedge. The T4b cost research left the Advanced Certificate Manager line item open
  and wrote, of that exact number, "I will not put an inference in owner-facing money copy", pricing the
  downside at $10/month if the question resolved against us. The copy shipped anyway and the question
  appears in no live tracking doc, including STATUS's hand steps, where comparable one-glance checks do
  live. Two cheap dispositions close it: take the glance, or hedge the line until someone does.

**Three carry-forwards were audited and judged not worth filing**, recorded here so they are not
re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package is plain JS
by design and its own suite is the real gate, and no pass has reported a defect slipping through), the
`paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and its test name
both already state the risk and the reason), and the root `CLAUDE.md` context-headroom note (housekeeping,
outside this log's charter). STATUS should shed all three at the next update rather than carry them
further.
