# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

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
harvest (six findings, staged in the consumer repo while a cairn worktree held live workerd)
was folded at the 0.91.1 hotfix pass under the same complete-or-move rule: finding 1, the
0.91.0 shipped-sheet regression, shipped as the hotfix itself, and the other five were
verified against the code and filed into `ROADMAP.md` (the reachable-vocabulary contract, the
audit's missing path filter, the `.ts`-module scan blind spot, the 12px role gap, and the
doctor's bare-403 zone reads). New findings start fresh below this line.
